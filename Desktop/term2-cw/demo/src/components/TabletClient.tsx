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
    const [color, setColor] = useState('#3b82f6'); // Default Blue
    const [size, setSize] = useState(5);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // --- Logic State ---
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);

    // --- Colors Preset ---
    const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

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

    // === UI実装 (Figmaデザイン再現) ===
    return (
        // 全画面コンテナ (背景: 薄いグレー #F5F5F5)
        <div className="fixed inset-0 bg-[#F5F5F5] flex flex-col font-sans select-none overflow-hidden touch-none">

            {/* --- ヘッダー --- */}
            <header className="h-16 px-6 flex items-center justify-between shrink-0 bg-transparent relative z-20">
                {/* ロゴ RE:KAI */}
                <div className="flex items-center select-none pt-2">
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">RE</span>
                    <span className="text-3xl font-bold text-[#06B6D4] mx-0.5">:</span>
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">KAI</span>
                </div>

                {/* 接続ステータス (隠し要素的だが表示) */}
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                </div>

                {/* Undo / Redo (白背景、角丸、シャドウ) */}
                <div className="flex gap-3">
                    <button onClick={performUndo} className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform">
                        <RotateCcw size={20} />
                    </button>
                    <button onClick={performRedo} className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform">
                        <RotateCw size={20} />
                    </button>
                </div>
            </header>

            {/* --- ツールバーエリア (左上の浮遊ツール) --- */}
            <div className="absolute top-20 left-6 z-20 flex gap-2">
                {/* ツール切り替え */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('draw')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${mode === 'draw' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        onClick={() => setMode('erase')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${mode === 'erase' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        <Eraser size={20} />
                    </button>
                    <button className="w-12 h-12 rounded-xl flex items-center justify-center bg-white text-gray-600 border border-gray-200">
                        <Settings size={20} />
                    </button>
                </div>

                {/* 色・太さスライダー (独自カプセルUI) */}
                <div className="flex items-center bg-[#555555] rounded-full p-1 pl-1 gap-3 h-12 w-64 shadow-md ml-2 relative">
                    {/* 色プレビュー (左端の丸) */}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-10 h-10 rounded-full border-2 border-white relative z-10"
                        style={{ backgroundColor: color }}
                    />

                    {/* 太さバー (右側のトラック) */}
                    <div className="flex-1 h-full flex items-center pr-4 relative">
                        {/* 背景の細い線 */}
                        <div className="w-full h-1 bg-gray-400 rounded-full" />
                        {/* 白いツマミ (位置は size に依存) */}
                        <div
                            className="absolute w-6 h-6 bg-white rounded-full shadow-sm cursor-pointer"
                            style={{ left: `${(size / 30) * 80}%` }} // 簡易的な位置計算
                        />
                        {/* 実際のinput (透明で上に重ねる) */}
                        <input
                            type="range" min="1" max="30" value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    {/* カラーパレット (ポップオーバー) */}
                    {showColorPicker && (
                        <div className="absolute top-14 left-0 bg-white p-3 rounded-xl shadow-xl border border-gray-100 grid grid-cols-3 gap-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setShowColorPicker(false); }}
                                    className="w-8 h-8 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- キャンバスエリア --- */}
            <div className="flex-1 p-6 pt-24 pb-6 flex overflow-hidden">
                <div ref={containerRef} className="w-full h-full bg-white border-2 border-black relative touch-none shadow-sm">
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

            {/* --- 初回モーダル (画像tablet_modal.pngの完全再現) --- */}
            {showOrientationModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300"
                    onClick={() => setShowOrientationModal(false)}
                >
                    <div
                        className="bg-white w-[500px] h-[400px] rounded-[30px] flex flex-col items-center justify-center p-10 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* テキスト */}
                        <div className="text-center space-y-4 mb-12">
                            <p className="text-[#1E1E1E] font-medium text-sm tracking-widest">
                                縦・横どちらでも利用することができます。
                            </p>
                            <p className="text-[#1E1E1E] font-medium text-sm tracking-widest">
                                お好きなスタイルでご利用ください。
                            </p>
                        </div>

                        {/* アイコン (SVGで手描き風矢印とタブレット枠を再現) */}
                        <div className="relative w-48 h-32 flex items-center justify-center">
                            {/* 回転アニメーション */}
                            <style jsx>{`
                                @keyframes rotate-device {
                                    0%, 30% { transform: rotate(0deg); }
                                    50%, 80% { transform: rotate(90deg); }
                                    100% { transform: rotate(0deg); }
                                }
                                .device-anim { animation: rotate-device 4s ease-in-out infinite; }
                            `}</style>

                            {/* 左の矢印 */}
                            <svg className="absolute left-0 top-0 w-12 h-12 text-[#666]" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M40 10 Q 10 10 10 40" />
                                <path d="M20 30 L 10 40 L 0 30" />
                            </svg>

                            {/* 中央のデバイス */}
                            <div className="device-anim w-32 h-20 border-[4px] border-[#D4D4D4] rounded-xl bg-white relative z-10" />

                            {/* 右の矢印 */}
                            <svg className="absolute right-0 bottom-0 w-12 h-12 text-[#666]" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M10 40 Q 40 40 40 10" />
                                <path d="M30 20 L 40 10 L 50 20" />
                            </svg>
                        </div>

                        {/* タップで閉じるための透明なレイヤー or 明示的なボタンはデザインにないがUXのためエリア全体クリックで閉じる */}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TabletClient() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#F5F5F5]">Loading...</div>}>
            <TabletClientContent />
        </Suspense>
    );
}