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

    return (
        <div className="fixed inset-0 bg-[#EBF4FF] select-none font-sans">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-10">
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
            <div className="absolute top-16 left-0 right-0 bottom-0 flex flex-col p-4 pt-0 gap-4">

                {/* Toolbar Area */}
                <div className="flex items-center gap-4 px-2">
                    {/* Tools */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMode('draw')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] ${mode === 'draw'
                                    ? 'bg-[#3c3c3c] text-white border-[#2c2c2c]'
                                    : 'bg-white text-[#777777] border-[#e5e5e5] shadow-[0_4px_0_#e5e5e5] active:shadow-none'
                                }`}
                        >
                            <Pencil size={20} strokeWidth={2.5} fill={mode === 'draw' ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => setMode('erase')}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] ${mode === 'erase'
                                    ? 'bg-[#3c3c3c] text-white border-[#2c2c2c]'
                                    : 'bg-white text-[#777777] border-[#e5e5e5] shadow-[0_4px_0_#e5e5e5] active:shadow-none'
                                }`}
                        >
                            <Eraser size={20} strokeWidth={2.5} fill={mode === 'erase' ? "currentColor" : "none"} />
                        </button>
                    </div>

                    {/* Capsule Indicator (Color & Size) */}
                    <div className="flex items-center bg-white rounded-2xl p-1 pl-3 gap-3 h-12 w-56 shadow-[0_4px_0_#e5e5e5] border-2 border-[#e5e5e5]">
                        {/* Color Preview */}
                        <div
                            className="w-6 h-6 rounded-full border-2 border-[#e5e5e5] shadow-sm shrink-0"
                            style={{ backgroundColor: color }}
                        />
                        {/* Size Preview */}
                        <div className="flex-1 flex items-center h-full pr-3 relative">
                            {/* Background Track */}
                            <div className="w-full h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                            </div>

                            {/* Knob */}
                            <div
                                className="absolute w-5 h-5 bg-[#3c3c3c] rounded-full shadow-sm left-0 border-2 border-white"
                                style={{
                                    left: `${Math.min(100, (size / 20) * 100)}%`,
                                    transform: 'translateX(-50%)'
                                }}
                            />
                        </div>
                    </div>

                    <button className="w-10 h-10 bg-white rounded-xl shadow-[0_4px_0_#e5e5e5] border-2 border-[#e5e5e5] flex items-center justify-center active:translate-y-[4px] active:shadow-none transition-all text-[#777777] ml-auto">
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
                        className="block w-full h-full touch-none"
                    />
                </div>
            </div>

            {/* Orientation Modal */}
            {showOrientationModal && (
                <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowOrientationModal(false)}>
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col items-center animate-in fade-in zoom-in duration-300 border-2 border-[#e5e5e5]" onClick={e => e.stopPropagation()}>

                        <div className="text-center mb-10">
                            <p className="text-[#3c3c3c] font-bold text-base tracking-wider leading-relaxed">
                                縦・横どちらでも利用することができます。<br />
                                お好きなスタイルでご利用ください。
                            </p>
                        </div>

                        {/* Animation Container */}
                        <div className="relative w-full h-40 flex items-center justify-center mb-8">
                            <style jsx>{`
                                @keyframes rotate-device {
                                    0% { transform: rotate(0deg); }
                                    25% { transform: rotate(0deg); }
                                    50% { transform: rotate(90deg); }
                                    75% { transform: rotate(90deg); }
                                    100% { transform: rotate(0deg); }
                                }
                                .device-icon {
                                    animation: rotate-device 4s ease-in-out infinite;
                                }
                            `}</style>
                            <div className="device-icon w-20 h-28 border-[4px] border-[#3c3c3c] rounded-2xl bg-white relative shadow-lg flex flex-col items-center justify-between py-3 box-border">
                                <div className="w-1 h-1 bg-[#cecece] rounded-full"></div>
                                <div className="w-14 h-16 bg-[#F5F5F5] rounded-md"></div>
                                <div className="w-2 h-2 rounded-full border-2 border-[#cecece]"></div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowOrientationModal(false)}
                            className="w-full py-4 bg-[#58cc02] text-white font-extrabold rounded-2xl shadow-[0_4px_0_#58a700] hover:brightness-110 active:translate-y-[4px] active:shadow-none transition-all text-lg tracking-widest uppercase"
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
            <div className="flex items-center justify-center min-h-screen bg-[#EBF4FF] text-[#3c3c3c] font-bold">
                Loading...
            </div>
        }>
            <TabletClientContent />
        </Suspense>
    );
}