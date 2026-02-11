'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';
import { Pencil, Eraser, Settings, RotateCcw, RotateCw } from 'lucide-react';

// === Interfaces ===
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

function TabletClientContent() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<PusherChannel | null>(null);

    // State
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(2);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);

    // Drawing State
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);

    // === Helper: Redraw ===
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

        // Restore current settings
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
    };

    // === Undo / Redo ===
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

    // === Initialization (Pusher) ===
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        tokenRef.current = token;

        if (token) {
            const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
            const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

            if (!pusherKey || !pusherCluster) {
                console.error("Pusher Env Vars missing", { pusherKey, pusherCluster });
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
                console.log('Connected to Pusher!');
                setIsConnected(true);
                channel.trigger('client-tablet-ready', { device: 'tablet' });
                if (typeof window !== 'undefined') {
                    channel.trigger('client-resize', {
                        width: window.innerWidth,
                        height: window.innerHeight
                    });
                }
            });

            channel.bind('pusher:subscription_error', (status: any) => {
                console.error('Pusher Subscription Error', status);
            });

            const handleResize = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                    redraw();
                    channelRef.current?.trigger('client-resize', {
                        width: window.innerWidth,
                        height: window.innerHeight
                    });
                }
            };

            window.addEventListener('resize', handleResize);
            handleResize();

            // Prevent touch scrolling
            const canvas = canvasRef.current;
            const preventDefault = (e: Event) => e.preventDefault();
            if (canvas) {
                canvas.addEventListener('touchstart', preventDefault, { passive: false });
                canvas.addEventListener('touchmove', preventDefault, { passive: false });
            }

            return () => {
                window.removeEventListener('resize', handleResize);
                if (canvas) {
                    canvas.removeEventListener('touchstart', preventDefault);
                    canvas.removeEventListener('touchmove', preventDefault);
                }
                pusher.unsubscribe(channelName);
                pusher.disconnect();
            };
        }
    }, [searchParams]);

    // === Drawing Event Handlers ===
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        currentStrokeRef.current = {
            type: 'stroke',
            mode,
            color,
            size,
            points: [{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]
        };

        ctx.beginPath();
        ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

        channelRef.current?.trigger('client-stroke-start', {
            mode,
            color,
            size,
            x: e.nativeEvent.offsetX / canvas.width,
            y: e.nativeEvent.offsetY / canvas.height
        });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.buttons !== 1) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        currentStrokeRef.current.points.push({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();

        channelRef.current?.trigger('client-stroke-move', {
            x: e.nativeEvent.offsetX / canvas.width,
            y: e.nativeEvent.offsetY / canvas.height
        });
    };

    const handlePointerUp = () => {
        historyRef.current.push({ ...currentStrokeRef.current });
        redoStackRef.current = [];
        channelRef.current?.trigger('client-stroke-end', {});
    };

    // 色のプリセット定義
    const colors = ['#000000', '#FF3B30', '#34C759', '#007AFF', '#AF52DE', '#FF9500'];

    return (
        <div className="fixed inset-0 bg-[#EBF4FF] select-none font-sans">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-10 bg-white shadow-[0_4px_0_#e5e5e5] border-b-2 border-[#e5e5e5]">
                {/* Logo */}
                <div className="flex items-center">
                    <span className="text-2xl font-extrabold text-[#3c3c3c] tracking-tight font-sans">RE</span>
                    <span className="text-2xl font-extrabold text-[#1cb0f6] mx-[2px]">:</span>
                    <span className="text-2xl font-extrabold text-[#3c3c3c] tracking-tight font-sans">KAI</span>
                </div>

                {/* Undo/Redo Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={performUndo}
                        className="w-10 h-10 bg-white rounded-xl shadow-[0_4px_0_#e5e5e5] border-2 border-[#e5e5e5] flex items-center justify-center active:translate-y-[4px] active:shadow-none transition-all text-[#777777]"
                        aria-label="Undo"
                    >
                        <RotateCcw size={20} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={performRedo}
                        className="w-10 h-10 bg-white rounded-xl shadow-[0_4px_0_#e5e5e5] border-2 border-[#e5e5e5] flex items-center justify-center active:translate-y-[4px] active:shadow-none transition-all text-[#777777]"
                        aria-label="Redo"
                    >
                        <RotateCw size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Main Layout: Toolbar & Canvas */}
            <div className="absolute top-16 left-0 right-0 bottom-0 flex flex-col p-4 gap-4 bg-[#EBF4FF]">

                {/* Toolbar Area */}
                <div className="flex items-center gap-3 px-2">
                    {/* Tools */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-[0_4px_0_#e5e5e5] border-2 border-[#e5e5e5]">
                        <button
                            onClick={() => setMode('draw')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mode === 'draw'
                                ? 'bg-[#3c3c3c] text-white'
                                : 'text-[#777777] hover:bg-[#f0f0f0]'
                                }`}
                        >
                            <Pencil size={20} strokeWidth={2.5} fill={mode === 'draw' ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => setMode('erase')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mode === 'erase'
                                ? 'bg-[#3c3c3c] text-white'
                                : 'text-[#777777] hover:bg-[#f0f0f0]'
                                }`}
                        >
                            <Eraser size={20} strokeWidth={2.5} fill={mode === 'erase' ? "currentColor" : "none"} />
                        </button>
                    </div>

                    {/* Capsule Indicator (Color & Size) */}
                    <div className="flex-1 flex items-center bg-white rounded-2xl p-1 pl-3 gap-4 h-12 shadow-[0_4px_0_#e5e5e5] border-2 border-[#e5e5e5] max-w-md">
                        {/* Color Preview & Picker Trigger */}
                        <div className="relative group">
                            <button
                                className="w-8 h-8 rounded-full border-[3px] border-white ring-2 ring-[#e5e5e5] shadow-sm shrink-0 transition-transform group-hover:scale-105"
                                style={{ backgroundColor: color }}
                            />
                            {/* Simple Color Palette Popover */}
                            <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-xl shadow-lg border-2 border-[#e5e5e5] grid grid-cols-3 gap-2 hidden group-hover:grid z-20">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-[#e5e5e5] hover:scale-110 transition-all"
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Size Preview & Slider */}
                        <div className="flex-1 flex items-center h-full pr-3 relative group">
                            {/* Background Track & Thumb (Visual) */}
                            <div className="w-full h-2 bg-[#e5e5e5] rounded-full overflow-hidden relative">
                                <div
                                    className="h-full bg-[#3c3c3c] rounded-full"
                                    style={{ width: `${(size / 20) * 100}%` }}
                                />
                            </div>
                            <div
                                className="absolute w-5 h-5 bg-white rounded-full shadow-sm border-2 border-[#3c3c3c] top-1/2 -translate-y-1/2 pointer-events-none transition-all group-hover:scale-110"
                                style={{
                                    left: `${(size / 20) * 100}%`,
                                    transform: `translate(-50%, -50%)`
                                }}
                            />
                            {/* Actual Range Input (Hidden but Functional) */}
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={size}
                                onChange={(e) => setSize(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    <button className="w-12 h-12 bg-white rounded-2xl shadow-[0_4px_0_#e5e5e5] border-2 border-[#e5e5e5] flex items-center justify-center active:translate-y-[4px] active:shadow-none transition-all text-[#777777] ml-auto">
                        <Settings size={24} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Canvas Container */}
                <div className="flex-1 relative rounded-3xl border-[3px] border-[#3c3c3c] bg-white overflow-hidden shadow-sm">
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

            {/* Orientation Modal */}
            {showOrientationModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowOrientationModal(false)}>
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col items-center animate-in fade-in zoom-in duration-300 border-2 border-[#e5e5e5]" onClick={e => e.stopPropagation()}>

                        <div className="text-center mb-10">
                            <p className="text-[#3c3c3c] font-bold text-lg tracking-wider leading-relaxed">
                                縦・横どちらでも利用することができます。<br />
                                お好きなスタイルでご利用ください。
                            </p>
                        </div>

                        {/* Animation Container */}
                        <div className="relative w-full h-48 flex items-center justify-center mb-10">
                            <style jsx>{`
                                @keyframes rotate-device {
                                    0%, 20% { transform: rotate(0deg); }
                                    50%, 70% { transform: rotate(90deg); }
                                    100% { transform: rotate(0deg); }
                                }
                                .device-icon {
                                    animation: rotate-device 4s ease-in-out infinite;
                                }
                            `}</style>
                            {/* SVG Device Icon for better scaling and detail */}
                            <svg className="device-icon w-32 h-32 drop-shadow-xl" viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="5" y="5" width="90" height="130" rx="12" fill="white" stroke="#3c3c3c" strokeWidth="4" />
                                <circle cx="50" cy="125" r="4" stroke="#3c3c3c" strokeWidth="2" />
                                <rect x="35" y="12" width="30" height="3" rx="1.5" fill="#cecece" />
                                <rect x="12" y="25" width="76" height="90" rx="4" fill="#F5F5F5" stroke="#cecece" strokeWidth="1" />
                            </svg>
                        </div>

                        <button
                            onClick={() => setShowOrientationModal(false)}
                            className="w-full py-4 bg-[#58cc02] text-white font-extrabold rounded-2xl shadow-[0_4px_0_#58a700] hover:brightness-110 active:translate-y-[4px] active:shadow-none transition-all text-xl tracking-widest uppercase"
                        >
                            始める
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TabletClient() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#EBF4FF]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#1cb0f6]"></div>
            </div>
        }>
            <TabletClientContent />
        </Suspense>
    );
}