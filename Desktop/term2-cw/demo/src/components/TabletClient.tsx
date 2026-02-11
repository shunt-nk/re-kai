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

// === メインコンポーネント ===
function TabletClientContent() {
    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<PusherChannel | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- State ---
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#06B6D4'); // Default Cyan/Blue-ish
    const [size, setSize] = useState(5);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);
    const [showSettings, setShowSettings] = useState(false); // Toggle for settings if needed, utilizing the layout.

    // --- Logic State ---
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);

    // --- Colors Preset ---
    const colors = ['#000000', '#FF0000', '#06B6D4', '#00FF00', '#FFFF00', '#800080'];

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
            // Initial resize logic
            if (containerRef.current && canvasRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                redraw();
            }
        });

        const handleResize = () => {
            // Using a timeout to prevent flickering or calculating before layout settles
            setTimeout(() => {
                if (canvasRef.current && containerRef.current) {
                    const { clientWidth, clientHeight } = containerRef.current;
                    // Only resize if dimensions actually changed to avoid clearing canvas unnecessarily
                    if (canvasRef.current.width !== clientWidth || canvasRef.current.height !== clientHeight) {
                        // Save current content? Redraw handles it.
                        canvasRef.current.width = clientWidth;
                        canvasRef.current.height = clientHeight;
                        redraw();
                        channelRef.current?.trigger('client-resize', { width: clientWidth, height: clientHeight });
                    }
                }
            }, 100);
        };

        window.addEventListener('resize', handleResize);

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

        // Ensure canvas has focus or capture pointer
        canvas.setPointerCapture(e.pointerId);

        const { x, y } = getPoint(e);
        currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [{ x, y }] };

        ctx.beginPath();
        ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.moveTo(x, y);

        // Send relative coordinates
        channelRef.current?.trigger('client-stroke-start', { mode, color, size, x: x / canvas.width, y: y / canvas.height });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.buttons !== 1) return; // Only process if primary button is down
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
        const canvas = canvasRef.current;
        if (canvas) canvas.releasePointerCapture(e.pointerId);

        historyRef.current.push({ ...currentStrokeRef.current });
        redoStackRef.current = [];
        channelRef.current?.trigger('client-stroke-end', {});
    };

    // === UI実装 (Figmaデザイン再現) ===
    return (
        <div className="fixed inset-0 bg-[#F9FAFB] flex flex-col font-sans select-none overflow-hidden touch-none w-screen h-screen">

            {/* --- ヘッダー (上部) --- */}
            <header className="h-16 px-6 py-2 flex items-center justify-between shrink-0 bg-transparent relative z-20">
                {/* ロゴ RE:KAI */}
                <div className="flex items-center select-none">
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">RE</span>
                    <span className="text-3xl font-bold text-[#06B6D4] mx-0.5">:</span>
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">KAI</span>
                </div>

                {/* Undo / Redo */}
                <div className="flex gap-3">
                    <button onClick={performUndo} className="w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50">
                        <RotateCcw size={20} />
                    </button>
                    <button onClick={performRedo} className="w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50">
                        <RotateCw size={20} />
                    </button>
                </div>
            </header>

            {/* --- ツールバー (ヘッダー直下) --- */}
            <div className="px-6 pb-2 flex items-center gap-4 z-20">
                {/* ツール切り替え */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('draw')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all shadow-sm ${mode === 'draw' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        onClick={() => setMode('erase')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all shadow-sm ${mode === 'erase' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        <Eraser size={20} />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-12 h-12 rounded-xl flex items-center justify-center bg-white text-gray-600 border border-gray-200 shadow-sm"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                {/* ブラシ設定UI (独自デザイン: カプセル型) */}
                <div className="flex items-center border border-gray-200 bg-white rounded-full p-1 pl-1 gap-4 h-12 w-80 shadow-sm relative">
                    {/* 現在の色 (左端) */}
                    <div className="relative group">
                        <button
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm relative z-10"
                            style={{ backgroundColor: color }}
                        />
                        {/* 簡易カラーピッカー (ホバー/タップで表示) */}
                        <div className="absolute top-12 left-0 bg-white p-2 rounded-xl shadow-xl border border-gray-100 flex gap-2 invisible group-focus-within:visible group-hover:visible z-30 opacity-0 group-hover:opacity-100 transition-all">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className="w-8 h-8 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* サイズスライダー (カスタムUI) */}
                    <div className="flex-1 h-full flex items-center pr-4 relative">
                        {/* トラック (濃いグレーの横長バー) */}
                        <div className="w-full h-1.5 bg-[#333333] rounded-full relative">
                            {/* ツマミ (白い円) - Inputの値に基づいて位置調整 */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow border border-gray-200 pointer-events-none"
                                style={{ left: `calc(${((size - 1) / 29) * 100}% - 10px)` }}
                            />
                        </div>

                        {/* 透明な Range Input */}
                        <input
                            type="range" min="1" max="30" value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* --- キャンバスエリア (残りエリア最大化) --- */}
            <div className="flex-1 w-full h-full p-4 pb-4 pt-2 overflow-hidden flex flex-col">
                <div ref={containerRef} className="flex-1 w-full bg-white border-2 border-black relative touch-none shadow-sm rounded-sm">
                    <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="block w-full h-full touch-none cursor-crosshair"
                    />
                </div>
            </div>

            {/* --- 初回モーダル (tablet_modal.png 再現) --- */}
            {showOrientationModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-none flex items-center justify-center animate-in fade-in duration-300"
                    onClick={() => setShowOrientationModal(false)}
                >
                    <div
                        className="bg-white w-[600px] h-[500px] rounded-[32px] flex flex-col items-center justify-center p-12 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()} // モーダル内部クリックで閉じないようにするならここだが、仕様では「画面全体またはカード内をタップすると消える」
                    >
                        {/* タップイベントを親に伝播させるために、あえてstopPropagationしない、または親のonClickで閉じるのでOK */}
                        <div className="absolute inset-0" onClick={() => setShowOrientationModal(false)} />

                        {/* コン텐츠 (z-indexでクリック可能エリアの上に表示) */}
                        <div className="relative z-10 flex flex-col items-center w-full h-full pointer-events-none">
                            {/* テキスト */}
                            <div className="text-center space-y-6 mb-16 mt-8">
                                <p className="text-[#333333] font-medium text-lg tracking-widest">
                                    縦・横どちらでも利用することができます。
                                </p>
                                <p className="text-[#333333] font-medium text-lg tracking-widest">
                                    お好きなスタイルでご利用ください。
                                </p>
                            </div>

                            {/* 図解 (SVG) */}
                            <div className="relative w-64 h-40 flex items-center justify-center">
                                {/* タブレット枠 */}
                                <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                                    <rect x="2" y="2" width="196" height="136" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="4" />
                                </svg>

                                {/* 左上の回転矢印 */}
                                <svg className="absolute -left-4 -top-6 w-16 h-16 text-[#666666]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                                    <path d="M 70 20 Q 20 20 20 80" />
                                    <path d="M 40 60 L 20 80 L 0 60" />
                                </svg>

                                {/* 右下の回転矢印 */}
                                <svg className="absolute -right-4 -bottom-6 w-16 h-16 text-[#666666]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                                    <path d="M 30 80 Q 80 80 80 20" />
                                    <path d="M 60 40 L 80 20 L 100 40" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TabletClient() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB] text-gray-500">Loading...</div>}>
            <TabletClientContent />
        </Suspense>
    );
}