'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';
import { Pencil, Eraser, Settings, RotateCcw, RotateCw, Check } from 'lucide-react';

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
    const [showOrientationModal, setShowOrientationModal] = useState(true);
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
        // コンテキストを現在の設定に戻す
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
                // コンテナのサイズに合わせてキャンバスをリサイズ
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                redraw();
                channelRef.current?.trigger('client-resize', { width: clientWidth, height: clientHeight });
            }
        };

        window.addEventListener('resize', handleResize);
        // レイアウト確定のために少し遅延
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

    // === UI実装 (画像再現) ===
    return (
        // 全画面コンテナ: スクロール禁止、背景色 #F9FAFB
        <div className="fixed inset-0 bg-[#F9FAFB] flex flex-col font-sans select-none overflow-hidden touch-none">

            {/* --- 1. ヘッダー (tablet.png 上部) --- */}
            <header className="h-16 px-6 flex items-center justify-between shrink-0 bg-transparent relative z-20">
                {/* ロゴ RE:KAI */}
                <div className="flex items-center select-none pt-2">
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">RE</span>
                    <span className="text-3xl font-bold text-[#06B6D4] mx-0.5">:</span>
                    <span className="text-3xl font-bold text-[#1E293B] tracking-tight">KAI</span>
                </div>

                {/* Undo / Redo (白背景、角丸、シャドウ) */}
                <div className="flex gap-3">
                    <button
                        onClick={performUndo}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
                        aria-label="Undo"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button
                        onClick={performRedo}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
                        aria-label="Redo"
                    >
                        <RotateCw size={20} />
                    </button>
                </div>
            </header>

            {/* --- 2. ツールバーエリア (tablet.png ヘッダー下) --- */}
            <div className="px-6 pb-2 flex items-center gap-4 z-20">

                {/* ツール切り替え */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('draw')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all shadow-sm ${mode === 'draw' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        onClick={() => setMode('erase')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all shadow-sm ${mode === 'erase' ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Eraser size={20} />
                    </button>
                    <button className="w-12 h-12 rounded-xl flex items-center justify-center bg-white text-gray-600 border border-gray-200 shadow-sm hover:bg-gray-50">
                        <Settings size={20} />
                    </button>
                </div>

                {/* 色・太さスライダー (tablet.png 独自カプセルUI) */}
                <div className="flex items-center bg-[#E5E7EB] rounded-full p-1 pl-1 gap-3 h-12 w-72 shadow-inner relative border border-gray-300">
                    {/* 色プレビュー (左端の丸) - 押すとカラーパレット */}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-10 h-10 rounded-full border-[3px] border-white shadow-sm relative z-10 hover:scale-105 transition-transform"
                        style={{ backgroundColor: color }}
                    />

                    {/* 太さバー (トラック) */}
                    <div className="flex-1 h-full flex items-center pr-4 relative">
                        {/* 背景の濃いグレーバー */}
                        <div className="w-full h-3 bg-[#555555] rounded-full" />

                        {/* 白いツマミ (位置は size に依存) */}
                        <div
                            className="absolute w-7 h-7 bg-white rounded-full shadow-md cursor-pointer border border-gray-200 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ left: `${(size / 30) * 85}%` }}
                        />

                        {/* 実際のinput (透明で上に重ねる) */}
                        <input
                            type="range" min="1" max="30" value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                    </div>

                    {/* カラーパレット (ポップオーバー) */}
                    {showColorPicker && (
                        <div className="absolute top-14 left-0 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 grid grid-cols-3 gap-3 z-30 animate-in fade-in zoom-in-95 duration-200">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setShowColorPicker(false); }}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent ring-1 ring-gray-200'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 接続インジケーター (デバッグ用) */}
                <div className={`ml-auto text-[10px] font-bold px-3 py-1 rounded-full transition-colors ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {isConnected ? 'ONLINE' : 'CONNECTING...'}
                </div>
            </div>

            {/* --- 3. キャンバスエリア (tablet.png メイン) --- */}
            <div className="flex-1 p-4 pb-6 flex overflow-hidden">
                <div
                    ref={containerRef}
                    className="w-full h-full bg-white border-2 border-black relative touch-none shadow-sm rounded-sm"
                >
                    <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        // touch-action: none でスクロールを確実に防ぐ
                        className="block w-full h-full touch-none cursor-crosshair"
                        style={{ touchAction: 'none' }}
                    />
                </div>
            </div>

            {/* --- 4. 初回モーダル (tablet_modal.png 完全再現) --- */}
            {showOrientationModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300"
                    onClick={() => setShowOrientationModal(false)}
                >
                    <div
                        className="bg-white w-[500px] h-[420px] rounded-[32px] flex flex-col items-center justify-center p-12 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* テキスト */}
                        <div className="text-center space-y-6 mb-10">
                            <p className="text-[#333333] font-medium text-sm tracking-[0.1em]">
                                縦・横どちらでも利用することができます。
                            </p>
                            <p className="text-[#333333] font-medium text-sm tracking-[0.1em]">
                                お好きなスタイルでご利用ください。
                            </p>
                        </div>

                        {/* アイコン (SVGで手描き風矢印とタブレット枠を再現) */}
                        <div className="relative w-48 h-32 flex items-center justify-center">
                            {/* CSSアニメーション定義 */}
                            <style jsx>{`
                                @keyframes rotate-device {
                                    0%, 30% { transform: rotate(0deg); }
                                    50%, 80% { transform: rotate(90deg); }
                                    100% { transform: rotate(0deg); }
                                }
                                .device-anim { animation: rotate-device 4s ease-in-out infinite; }
                            `}</style>

                            {/* 左の矢印 (SVG Path) */}
                            <svg className="absolute -left-4 top-0 w-12 h-12 text-[#555]" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M40 10 Q 10 10 10 40" />
                                <path d="M20 30 L 10 40 L 0 30" />
                            </svg>

                            {/* 中央のデバイス */}
                            <div className="device-anim w-36 h-24 border-[5px] border-[#D1D5DB] rounded-2xl bg-white relative z-10 box-border" />

                            {/* 右の矢印 (SVG Path) */}
                            <svg className="absolute -right-4 bottom-0 w-12 h-12 text-[#555]" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M10 40 Q 40 40 40 10" />
                                <path d="M30 20 L 40 10 L 50 20" />
                            </svg>
                        </div>

                        {/* UX用: 見えないがエリア全体クリックで閉じるための誘導 */}
                        <div className="absolute inset-0 cursor-pointer" onClick={() => setShowOrientationModal(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}

// === エクスポート用ラッパー (Suspense対応) ===
export default function TabletClient() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-[#F9FAFB] text-gray-400 font-bold">
                LOADING...
            </div>
        }>
            <TabletClientContent />
        </Suspense>
    );
}