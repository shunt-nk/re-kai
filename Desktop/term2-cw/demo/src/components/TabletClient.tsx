'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';
import { Pencil, Eraser, Palette, RotateCcw, RotateCw } from 'lucide-react'; // SettingsをPaletteに変更

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
    const [size, setSize] = useState(8);
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

    // === ロジック: 描画イベント (座標ズレ修正版) ===
    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

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

    // === UI実装 ===
    return (
        <div className="fixed inset-0 z-50 bg-[#F5F5F5] flex flex-col font-sans select-none overflow-hidden touch-none w-screen h-screen">

            {/* --- ヘッダー: ロゴとUndo/Redo --- */}
            <header className="px-6 py-4 flex items-center justify-between flex-none">
                {/* ロゴ: スタイル適用 */}
                <div className="flex items-center select-none">
                    <span className="text-3xl font-extrabold text-[#0F172A] tracking-tighter">RE</span>
                    <span className="text-3xl font-extrabold text-[#06B6D4] mx-1">:</span>
                    <span className="text-3xl font-extrabold text-[#0F172A] tracking-tighter">KAI</span>
                </div>

                {/* 右側: Undo/Redo */}
                <div className="flex gap-3">
                    <button
                        onClick={performUndo}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
                    >
                        <RotateCcw size={24} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={performRedo}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
                    >
                        <RotateCw size={24} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            {/* --- ツールバー行 --- */}
            <div className="px-6 pb-4 flex items-center gap-4 flex-none relative z-20">

                {/* ツールボタン群 */}
                <div className="flex gap-3">
                    {/* 鉛筆 */}
                    <button
                        onClick={() => setMode('draw')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 ${mode === 'draw'
                                ? 'bg-[#4B4B4B] border-[#4B4B4B] text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Pencil size={24} strokeWidth={2.5} />
                    </button>

                    {/* 消しゴム */}
                    <button
                        onClick={() => setMode('erase')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 ${mode === 'erase'
                                ? 'bg-[#4B4B4B] border-[#4B4B4B] text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Eraser size={24} strokeWidth={2.5} />
                    </button>

                    {/* カラーパレットボタン (修正箇所) */}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 ${showColorPicker
                                ? 'bg-[#4B4B4B] border-[#4B4B4B] text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Palette size={24} strokeWidth={2.5} />
                    </button>
                </div>

                {/* スライダーバー (復活・修正箇所) */}
                <div className="flex items-center bg-[#E5E7EB] rounded-full p-1 pl-1 h-12 shadow-inner relative border border-gray-300 flex-1 max-w-xs">
                    {/* 左：現在の色プレビュー (クリックでパレット開閉も可) */}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-10 h-10 rounded-full border-4 border-white shadow-sm relative z-10 shrink-0 transition-transform hover:scale-105"
                        style={{ backgroundColor: color }}
                    />

                    {/* 右：スライダーのトラックとツマミ */}
                    <div className="flex-1 h-full flex items-center pr-3 relative ml-2">
                        {/* トラック背景 */}
                        <div className="w-full h-2 bg-[#4B4B4B] rounded-full absolute" />

                        {/* 実際のinput (透明) */}
                        <input
                            type="range"
                            min="1"
                            max="40"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="w-full h-full opacity-0 absolute inset-0 z-20 cursor-pointer"
                        />

                        {/* 白いツマミ (Visual Only) */}
                        <div
                            className="absolute w-6 h-6 bg-white rounded-full shadow-md pointer-events-none transition-transform border border-gray-200 top-1/2 -translate-y-1/2"
                            style={{
                                left: `calc(${((size - 1) / 39) * 100}% - 12px + 1.5rem)`, // 位置計算
                            }}
                        />
                    </div>
                </div>

                {/* カラーパレットポップオーバー */}
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

            {/* --- キャンバスエリア --- */}
            <div className="flex-1 w-full px-6 pb-6 overflow-hidden relative z-10">
                <div
                    ref={containerRef}
                    className="w-full h-full bg-white border-[3px] border-black relative touch-none shadow-sm"
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