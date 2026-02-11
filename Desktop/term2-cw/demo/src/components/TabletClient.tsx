'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';
import { Pencil, Eraser, Settings, RotateCcw, RotateCw } from 'lucide-react';

// === 型定義 ===
interface Stroke {
    type: string;
    mode: string;
    color?: string;
    size?: number;
    points: { x: number; y: number }[];
}

interface PusherChannel {
    trigger: (eventName: string, data: any) => void;
    bind: (eventName: string, callback: any) => void;
    unbind_all: () => void;
}

// === メインロジックコンポーネント ===
function TabletClientContent() {
    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<PusherChannel | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- State ---
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#3b82f6'); // 初期色: 青
    const [size, setSize] = useState(5);
    const [isConnected, setIsConnected] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // --- Logic State ---
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);

    // --- Colors Preset ---
    const colors = ['#1E293B', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

    // === ロジック: 再描画 ===
    const redraw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        historyRef.current.forEach(stroke => {
            ctx.beginPath();
            ctx.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = stroke.color || '#000000';
            ctx.lineWidth = stroke.size || 2;
            if (stroke.points.length > 0) {
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
                ctx.stroke();
            }
        });
        ctx.globalCompositeOperation = 'source-over';
    };

    // === ロジック: Undo / Redo ===
    const performUndo = () => {
        if (historyRef.current.length === 0) return;
        const stroke = historyRef.current.pop();
        if (stroke) redoStackRef.current.push(stroke);
        redraw();
        channelRef.current?.trigger('client-undo', {});
    };

    const performRedo = () => {
        if (redoStackRef.current.length === 0) return;
        const stroke = redoStackRef.current.pop();
        if (stroke) historyRef.current.push(stroke);
        redraw();
        channelRef.current?.trigger('client-redo', {});
    };

    // === ロジック: Pusher接続 & リサイズ ===
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        tokenRef.current = token;

        if (!token) return;

        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) {
            console.error("Missing Pusher Env Vars");
            return;
        }

        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher',
        });

        const channelName = `private-session-${token}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel as unknown as PusherChannel;

        channel.bind('pusher:subscription_succeeded', () => {
            console.log('Pusher Connected');
            setIsConnected(true);
            channel.trigger('client-tablet-ready', { device: 'tablet' });
            handleResize();
        });

        const handleResize = () => {
            if (canvasRef.current && containerRef.current) {
                // コンテナのサイズに合わせてキャンバスをリサイズ（Retina対応はあえてせず、座標ズレ防止優先）
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                redraw();
                channelRef.current?.trigger('client-resize', { width: clientWidth, height: clientHeight });
            }
        };

        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [searchParams]);

    // === ロジック: 描画イベント ===
    const getPoint = (e: React.PointerEvent) => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e);
        currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [{ x, y }] };

        ctx.beginPath();
        ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.moveTo(x, y);

        channelRef.current?.trigger('client-stroke-start', { mode, color, size, x: x / canvas.width, y: y / canvas.height });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.buttons !== 1) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e);
        currentStrokeRef.current.points.push({ x, y });
        ctx.lineTo(x, y);
        ctx.stroke();

        channelRef.current?.trigger('client-stroke-move', { x: x / canvas.width, y: y / canvas.height });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        historyRef.current.push({ ...currentStrokeRef.current });
        redoStackRef.current = [];
        channelRef.current?.trigger('client-stroke-end', {});
    };

    // === UI実装 (フルスクリーン化) ===
    return (
        // 重要: fixed inset-0 で画面全体を強制確保し、z-index最前面に配置
        <div className="fixed inset-0 z-50 bg-[#F5F5F5] flex flex-col font-sans select-none overflow-hidden touch-none w-screen h-screen">

            {/* --- ヘッダー (高さ固定・横幅いっぱい) --- */}
            <header className="h-16 flex-none px-6 flex items-center justify-between bg-transparent w-full">
                {/* ロゴ */}
                <div className="flex items-center select-none">
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">RE</span>
                    <span className="text-3xl font-bold text-[#06B6D4] mx-0.5">:</span>
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">KAI</span>
                </div>

                {/* Undo / Redo */}
                <div className="flex gap-4">
                    <button
                        onClick={performUndo}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
                    >
                        <RotateCcw size={24} />
                    </button>
                    <button
                        onClick={performRedo}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
                    >
                        <RotateCw size={24} />
                    </button>
                </div>
            </header>

            {/* --- ツールバー (横一列配置) --- */}
            <div className="flex-none px-6 pb-4 flex items-center gap-6 w-full">
                {/* ツール切り替え */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setMode('draw')}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm ${mode === 'draw' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Pencil size={24} />
                    </button>
                    <button
                        onClick={() => setMode('erase')}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm ${mode === 'erase' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Eraser size={24} />
                    </button>
                    <button className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white text-gray-600 border-2 border-gray-200 shadow-sm hover:bg-gray-50">
                        <Settings size={24} />
                    </button>
                </div>

                {/* スライダー (幅広に設定) */}
                <div className="flex items-center bg-[#D1D5DB] rounded-full p-1.5 gap-4 h-14 flex-1 max-w-lg shadow-inner relative border border-gray-300">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-11 h-11 rounded-full border-4 border-white shadow-sm relative z-10 hover:scale-105 transition-transform shrink-0"
                        style={{ backgroundColor: color }}
                    />

                    <div className="flex-1 relative h-full flex items-center pr-4">
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="w-full h-3 bg-[#555555] rounded-full appearance-none outline-none slider-thumb"
                            style={{
                                background: `linear-gradient(to right, #555555 0%, #555555 ${((size - 1) / 49) * 100}%, #9CA3AF ${((size - 1) / 49) * 100}%, #9CA3AF 100%)`
                            }}
                        />
                        <style jsx>{`
                            .slider-thumb::-webkit-slider-thumb {
                                -webkit-appearance: none;
                                appearance: none;
                                width: 28px;
                                height: 28px;
                                background: #ffffff;
                                border: 2px solid #d1d5db;
                                border-radius: 50%;
                                cursor: pointer;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            }
                        `}</style>
                    </div>

                    {showColorPicker && (
                        <div className="absolute top-16 left-0 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 grid grid-cols-3 gap-3 z-30 animate-in fade-in zoom-in-95 duration-200">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setShowColorPicker(false); }}
                                    className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-110"
                                    style={{ backgroundColor: c, borderColor: color === c ? '#333' : 'transparent' }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- キャンバスエリア (残りの領域全て) --- */}
            <div className="flex-1 w-full px-6 pb-6 overflow-hidden">
                <div
                    ref={containerRef}
                    className="w-full h-full bg-white border-[3px] border-black rounded-lg shadow-sm relative touch-none overflow-hidden"
                >
                    <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="block w-full h-full touch-none cursor-crosshair"
                        style={{ touchAction: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function TabletClient() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-[#F5F5F5] text-gray-400 font-bold">
                LOADING...
            </div>
        }>
            <TabletClientContent />
        </Suspense>
    );
}