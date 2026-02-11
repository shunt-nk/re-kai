'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';

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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<PusherChannel | null>(null);

    // State
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#000000'); // Initial color black
    const [size, setSize] = useState(2);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Drawing State
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

        // Current context settings
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
            // setErrorMsg("Token is missing."); // Optional
        }

        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (pusherKey && pusherCluster && token) {
            // Initialize Pusher
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
                // setErrorMsg("Connection Failed.");
            });

            return () => {
                pusher.unsubscribe(channelName);
                pusher.disconnect();
            };
        }
    }, [searchParams]);

    // === Logic: Pointer Events ===
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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
            ctx.moveTo(x, y);
        }

        channelRef.current?.trigger('client-stroke-start', {
            mode, color, size,
            x: x / canvas.width,
            y: y / canvas.height
        });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

    const handlePointerUp = () => {
        if (currentStrokeRef.current.points.length > 0) {
            historyRef.current.push({ ...currentStrokeRef.current });
            currentStrokeRef.current.points = [];
            redoStackRef.current = [];
            channelRef.current?.trigger('client-stroke-end', {});
        }
    };

    // Resize Observer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resizeCanvas = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
                redraw();
            }
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        setTimeout(resizeCanvas, 100);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Color/Preview Logic
    const colorInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="fixed inset-0 bg-gray-100 touch-none overflow-hidden font-sans select-none">

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-10 pointer-events-none">
                {/* Logo */}
                <div className="flex items-center text-2xl font-bold tracking-tight pointer-events-auto">
                    <span className="text-slate-900">RE</span>
                    <span className="text-cyan-400 mx-[1px]">:</span>
                    <span className="text-slate-900">KAI</span>
                </div>

                {/* Right Tools: Undo/Redo */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    <button onClick={performUndo} className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all">
                        {/* Undo SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                    </button>
                    <button onClick={performRedo} className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all">
                        {/* Redo SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg>
                    </button>
                    {/* Connection Status */}
                    <div className={`ml-2 w-3 h-3 rounded-full transition-colors ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`} />
                </div>
            </div>

            {/* Toolbar (Left) */}
            <div className="absolute top-24 left-6 flex flex-col gap-4 pointer-events-auto z-20">
                <button
                    onClick={() => setMode('draw')}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-all ${mode === 'draw' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-slate-700 border-slate-200 shadow-sm'}`}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>
                </button>

                <button
                    onClick={() => setMode('erase')}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-all ${mode === 'erase' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-slate-700 border-slate-200 shadow-sm'}`}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"></path><line x1="18" y1="13" x2="18.01" y2="13"></line></svg>
                </button>

                <button
                    onClick={() => colorInputRef.current?.click()}
                    className="w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 relative"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: color }}></div>
                </button>
                <input ref={colorInputRef} type="color" value={color} onChange={e => setColor(e.target.value)} className="hidden" />
            </div>

            {/* Center Indicator (Capsule) */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                <div className="h-10 bg-white rounded-full p-1 pl-1 pr-4 shadow-sm border border-slate-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-slate-100 flex-shrink-0" style={{ backgroundColor: color }}></div>
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-0 bg-slate-800" style={{ width: `${(size / 20) * 100}%` }}></div>
                    </div>
                    <input type="range" min="1" max="20" value={size} onChange={e => setSize(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="absolute inset-x-8 bottom-8 top-24 border-2 border-black bg-white rounded-lg shadow-sm overflow-hidden z-0">
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="block w-full h-full touch-none"
                    style={{ cursor: 'crosshair' }}
                />
            </div>

            {/* Error Overlay */}
            {errorMsg && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6">
                    <div className="bg-white p-6 rounded-xl max-w-sm text-center">
                        <p className="text-red-500 font-bold mb-4">{errorMsg}</p>
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 text-white rounded-lg">再読み込み</button>
                    </div>
                </div>
            )}

            {/* Orientation Modal */}
            {showOrientationModal && (
                <div
                    className="fixed inset-0 z-[100] bg-gray-500/90 flex items-center justify-center p-6 backdrop-blur-sm"
                    onClick={() => setShowOrientationModal(false)}
                >
                    <div className="bg-white rounded-[32px] p-12 max-w-sm w-full shadow-2xl flex flex-col items-center">
                        <p className="text-slate-800 font-medium text-center leading-7 tracking-wide mb-10 text-[15px]">
                            縦・横どちらでも利用することができます。<br />
                            お好きなスタイルでご利用ください。
                        </p>

                        {/* Rotating Graphic */}
                        <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                            {/* Tablet shape */}
                            <div className="w-28 h-20 border-4 border-slate-300 rounded-2xl relative flex items-center justify-center">
                                {/* Just a visual block */}
                            </div>
                            {/* Arrows overlay */}
                            <svg className="absolute inset-0 w-full h-full text-slate-500 animate-[spin_4s_linear_infinite]" viewBox="0 0 200 200">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                                    </marker>
                                </defs>
                                <path d="M60 40 A 70 70 0 0 0 40 100" stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrowhead)" fill="none" />
                                <path d="M140 160 A 70 70 0 0 0 160 100" stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrowhead)" fill="none" />
                            </svg>
                        </div>

                        <div className="px-6 py-2 bg-slate-100 rounded-full text-xs text-slate-400 font-medium">
                            タップして開始
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Suspense Wrapper
export default function TabletPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>}>
            <TabletPageContent />
        </Suspense>
    );
}
