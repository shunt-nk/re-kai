'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';
import { Undo, Redo, Eraser, Settings, Pencil, Loader2 } from 'lucide-react';

// === Types ===
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

function TabletPageContent() {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<PusherChannel | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(2);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Drawing Logic
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);

    const searchParams = useSearchParams();

    // === Helper: Redraw Canvas ===
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

        // Restore context for current drawing
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
    };

    // === Logic: Undo / Redo ===
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

    // === Logic: Initialize Pusher ===
    useEffect(() => {
        const token = searchParams.get('token');
        tokenRef.current = token;

        if (!token) {
            setErrorMsg("URLにトークンが含まれていません。QRコードを読み直してください。");
            return;
        }

        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) {
            setErrorMsg("Pusherの設定が見つかりません。");
            return;
        }

        // Initialize Pusher
        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher', // Adjust if your endpoint is different
        });

        const channelName = `private-session-${token}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel as unknown as PusherChannel;

        channel.bind('pusher:subscription_succeeded', () => {
            console.log('Connected to Pusher');
            setIsConnected(true);
            channel.trigger('client-tablet-ready', { device: 'tablet' });
        });

        channel.bind('pusher:subscription_error', (status: any) => {
            console.error('Pusher Subscription Error', status);
            setErrorMsg("接続に失敗しました。再読み込みしてください。");
        });

        return () => {
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [searchParams]);

    // === Logic: Pointer Events (Touch & Mouse) ===
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Capture pointer for smooth tracking outside canvas bounds if needed
        canvas.setPointerCapture(e.pointerId);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [{ x, y }] };

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            // Important: Set properties here explicitly for instant feedback
            ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(x, y);
        }

        channelRef.current?.trigger('client-stroke-start', {
            mode, color, size,
            x: x / canvas.width,
            y: y / canvas.height
        });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.buttons !== 1) return; // Only if primary button is pressed
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentStrokeRef.current.points.push({ x, y });

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        channelRef.current?.trigger('client-stroke-move', {
            x: x / canvas.width,
            y: y / canvas.height
        });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.releasePointerCapture(e.pointerId);

        if (currentStrokeRef.current.points.length > 0) {
            historyRef.current.push({ ...currentStrokeRef.current });
            currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [] }; // Reset properly
            redoStackRef.current = [];
            channelRef.current?.trigger('client-stroke-end', {});
        }
    };

    // === Logic: Resize Observer ===
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver(() => {
            // Match canvas size to container size 1:1
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            redraw();
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    // Color picker ref
    const colorInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans select-none touch-none">

            {/* Header */}
            <header className="flex-none h-16 bg-white shadow-sm flex items-center justify-between px-6 z-20 relative">
                {/* Logo */}
                <div className="flex items-center text-2xl font-bold tracking-tight">
                    <span className="text-slate-800">RE</span>
                    <span className="text-cyan-400 mx-[1px]">:</span>
                    <span className="text-slate-800">KAI</span>
                </div>

                {/* Right Tools: Undo/Redo */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={performUndo}
                        className="w-10 h-10 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                        aria-label="Undo"
                    >
                        <Undo size={20} />
                    </button>
                    <button
                        onClick={performRedo}
                        className="w-10 h-10 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                        aria-label="Redo"
                    >
                        <Redo size={20} />
                    </button>

                    {/* Connection Indicator */}
                    <div className={`ml-2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                        {isConnected ? 'Connected' : 'Connecting...'}
                    </div>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 relative flex">

                {/* Floating Toolbar (Left) */}
                <div className="mt-6 ml-6 flex flex-col gap-4 absolute top-0 left-0 z-10">
                    <button
                        onClick={() => setMode('draw')}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-md ${mode === 'draw' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-white text-slate-500'}`}
                    >
                        <Pencil size={24} />
                    </button>

                    <button
                        onClick={() => setMode('erase')}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-md ${mode === 'erase' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-white text-slate-500'}`}
                    >
                        <Eraser size={24} />
                    </button>

                    <button
                        onClick={() => colorInputRef.current?.click()}
                        className="w-14 h-14 bg-white rounded-2xl border-2 border-white shadow-md flex items-center justify-center text-slate-500 relative"
                    >
                        <Settings size={24} />
                        {/* Current Color Indicator Dot */}
                        <div className="absolute top-2 right-2 w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
                    </button>
                    <input
                        ref={colorInputRef}
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="hidden"
                    />
                </div>

                {/* Center Top Indicator (Size & Color) */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-slate-200/90 backdrop-blur-sm rounded-full p-1 pl-2 pr-4 shadow-inner flex items-center gap-3 h-12">
                        {/* Current Color Circle */}
                        <div
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                        />
                        {/* Size Slider / Bar */}
                        <div className="w-40 relative h-8 flex items-center">
                            {/* Track */}
                            <div className="w-full h-1.5 bg-slate-300 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-800 transition-all duration-75"
                                    style={{ width: `${(size / 20) * 100}%` }}
                                />
                            </div>
                            {/* Invisible Range Input */}
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={size}
                                onChange={e => setSize(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Canvas Container */}
                <div
                    ref={containerRef}
                    className="absolute inset-0 m-4 ml-24 mt-24 border-2 border-black bg-white rounded-xl shadow-sm overflow-hidden"
                >
                    <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="block w-full h-full touch-none"
                    />
                </div>
            </main>

            {/* Error Overlay */}
            {errorMsg && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">エラーが発生しました</h3>
                        <p className="text-slate-600 mb-6">{errorMsg}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            再読み込み
                        </button>
                    </div>
                </div>
            )}

            {/* Orientation Modal (Splash Screen) */}
            {showOrientationModal && (
                <div
                    className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300"
                >
                    <div className="bg-white rounded-3xl p-10 max-w-sm w-full shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
                            ようこそ
                        </h2>

                        {/* Rotating Device Graphic */}
                        <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                            {/* Tablet Frame */}
                            <div className="w-24 h-16 border-[3px] border-slate-800 rounded-xl bg-white relative z-10 flex items-center justify-center shadow-lg transform transition-transform animate-[spin_8s_linear_infinite]">
                                <div className="w-1 h-1 rounded-full bg-slate-300 absolute top-1/2 left-1 -translate-y-1/2" />
                                <div className="w-1 h-1 rounded-full bg-slate-300 absolute top-1/2 right-1 -translate-y-1/2" />
                            </div>

                            {/* Orbiting Arrows */}
                            <svg className="absolute inset-0 w-full h-full text-cyan-400 animate-[spin_4s_ease-in-out_infinite_reverse]" viewBox="0 0 100 100">
                                <path d="M50 10 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                                <path d="M50 90 A 40 40 0 0 1 10 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                            </svg>
                        </div>

                        <div className="text-slate-600 font-medium text-center leading-relaxed mb-10 text-sm">
                            <p>縦・横どちらでも利用することができます。</p>
                            <p>お好きなスタイルでご利用ください。</p>
                        </div>

                        <button
                            onClick={() => setShowOrientationModal(false)}
                            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 text-base"
                        >
                            理解しました
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Suspense Wrapper for useSearchParams
export default function TabletPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400">
                <Loader2 className="animate-spin" size={32} />
            </div>
        }>
            <TabletPageContent />
        </Suspense>
    );
}
