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
    const colorInputRef = useRef<HTMLInputElement>(null);

    // State
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(5);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false); // Toggle for settings if needed, though design shows it inline

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

        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher',
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
            setIsConnected(false);
        });

        return () => {
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [searchParams]);

    // === Logic: Pointer Events (Touch & Mouse) ===
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.setPointerCapture(e.pointerId);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [{ x, y }] };

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.beginPath();
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
        if (e.buttons !== 1) return;
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
            currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [] };
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
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            redraw();
        });

        resizeObserver.observe(container);

        // Prevent default touch behaviors like scrolling
        const preventDefault = (e: TouchEvent) => e.preventDefault();
        canvas.addEventListener('touchstart', preventDefault, { passive: false });
        canvas.addEventListener('touchmove', preventDefault, { passive: false });

        return () => {
            resizeObserver.disconnect();
            canvas.removeEventListener('touchstart', preventDefault);
            canvas.removeEventListener('touchmove', preventDefault);
        };
    }, []);

    // Closes the modal when clicking anywhere
    const handleModalClick = () => {
        setShowOrientationModal(false);
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans select-none touch-none text-slate-900">

            {/* Header */}
            <header className="flex-none h-16 bg-slate-50 flex items-center justify-between px-6 z-20 relative border-b border-slate-200">
                {/* Logo */}
                <div className="flex items-center text-3xl font-extrabold tracking-tight">
                    <span className="text-[#1e293b]">RE</span>
                    <span className="text-[#06b6d4] mx-0.5">:</span>
                    <span className="text-[#1e293b]">KAI</span>
                </div>

                {/* Right Tools: Undo/Redo & Status */}
                <div className="flex items-center gap-4">
                    {/* Status Indicator (Subtle) */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                        {isConnected ? 'Online' : 'Connecting...'}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={performUndo}
                            className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                            aria-label="Undo"
                        >
                            <Undo size={24} strokeWidth={2} />
                        </button>
                        <button
                            onClick={performRedo}
                            className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                            aria-label="Redo"
                        >
                            <Redo size={24} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 relative flex bg-slate-50">

                {/* Toolbar Area (Top floating or Fixed) - As per design B, it looks like a toolbar strip */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
                    {/* Tools */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMode('draw')}
                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${mode === 'draw' ? 'bg-[#333] text-white shadow-lg scale-105' : 'bg-white text-slate-500 shadow-sm border border-slate-200'}`}
                        >
                            <Pencil size={24} />
                        </button>
                        <button
                            onClick={() => setMode('erase')}
                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${mode === 'erase' ? 'bg-[#333] text-white shadow-lg scale-105' : 'bg-white text-slate-500 shadow-sm border border-slate-200'}`}
                        >
                            <Eraser size={24} />
                        </button>
                        <button
                            onClick={() => {/* Settings logic placeholder */ }}
                            className="w-14 h-14 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-900 font-bold text-xl hover:bg-slate-50"
                        >
                            <Settings size={28} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Brush Settings Capsule */}
                    <div className="flex items-center h-14 bg-[#555] rounded-full px-2 pl-2 pr-6 shadow-md gap-4">
                        {/* Color Circle */}
                        <button
                            onClick={() => colorInputRef.current?.click()}
                            className="w-10 h-10 rounded-full border-2 border-white relative shadow-sm"
                            style={{ backgroundColor: color }}
                        >
                            <input
                                ref={colorInputRef}
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                        </button>

                        {/* Size Bar */}
                        <div className="w-32 h-2.5 bg-gray-400 rounded-full relative">
                            <div
                                className="absolute top-0 left-0 h-full bg-blue-400 rounded-full"
                                style={{ width: `${(size / 30) * 100}%` }}
                            />
                            <input
                                type="range"
                                min="1"
                                max="30"
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
                    className="absolute inset-0 m-4 mt-24 border-[3px] border-black bg-white shadow-sm overflow-hidden"
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

            {/* Orientation / Welcome Modal (Click to close) */}
            {showOrientationModal && (
                <div
                    onClick={handleModalClick}
                    className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-300 cursor-pointer"
                >
                    <div className="bg-white rounded-[2rem] p-12 max-w-lg w-full shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300 text-center relative overflow-hidden">

                        {/* Icon: Tablet Rotating */}
                        <div className="mb-8 relative w-48 h-32 flex items-center justify-center">
                            <div className="w-24 h-32 border-4 border-slate-800 rounded-2xl relative bg-white flex items-center justify-center animate-[spin_4s_ease-in-out_infinite]">
                                <div className="text-slate-300 text-4xl">A</div>
                            </div>
                            {/* Arrows */}
                            <svg className="absolute w-full h-full text-slate-400 pointer-events-none" viewBox="0 0 200 150">
                                <path d="M 40,75 A 60,60 0 0 1 160,75" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8" className="animate-pulse" />
                                <path d="M 160,75 A 60,60 0 0 1 40,75" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8" className="animate-pulse" />
                            </svg>
                        </div>

                        <h2 className="text-xl font-bold text-slate-700 leading-relaxed">
                            縦・横どちらでも利用することができます。<br />
                            お好きなスタイルでご利用ください。
                        </h2>

                        <p className="mt-8 text-slate-400 text-sm font-medium">
                            画面をタップして開始
                        </p>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {errorMsg && (
                <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
                        <h3 className="text-lg font-bold text-red-600 mb-2">エラー</h3>
                        <p className="text-slate-600 mb-6">{errorMsg}</p>
                        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-900 text-white rounded-lg">再読み込み</button>
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
