'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';
import { Pencil, Eraser, Settings, RotateCcw, RotateCw, Check, Palette, X } from 'lucide-react';

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
    const colors = [
        '#000000', // Black
        '#ef4444', // Red
        '#3b82f6', // Blue
        '#22c55e', // Green
        '#eab308', // Yellow
        '#a855f7', // Purple
    ];

    // === Core Logic: Redraw Canvas ===
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

        // Restore context for preview or next stroke
        ctx.globalCompositeOperation = 'source-over';
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

    // === Pusher & Resize Setup ===
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        tokenRef.current = token;

        if (!token) return;

        // 1. Pusher Init
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) {
            console.error("Missing Pusher Env Vars");
            return;
        }

        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher', // Adjust if you use /api/pusher/auth
        });

        const channelName = `private-session-${token}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel as unknown as PusherChannel;

        // 2. Events
        channel.bind('pusher:subscription_succeeded', () => {
            console.log('Pusher Connected');
            setIsConnected(true);
            channel.trigger('client-tablet-ready', { device: 'tablet' });
            handleResize();
        });

        // 3. Resize Logic
        const handleResize = () => {
            if (canvasRef.current && containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                redraw();

                // Notify PC
                channelRef.current?.trigger('client-resize', {
                    width: clientWidth,
                    height: clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        // Delay initial resize to ensure layout is ready
        setTimeout(handleResize, 100);

        // 4. Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [searchParams]);

    // === Drawing Handlers ===
    const getPoint = (e: React.PointerEvent) => {
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e);

        currentStrokeRef.current = {
            type: 'stroke',
            mode,
            color,
            size,
            points: [{ x, y }]
        };

        ctx.beginPath();
        ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.moveTo(x, y);

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
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e);

        currentStrokeRef.current.points.push({ x, y });
        ctx.lineTo(x, y);
        ctx.stroke();

        channelRef.current?.trigger('client-stroke-move', {
            x: x / canvas.width,
            y: y / canvas.height
        });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        historyRef.current.push({ ...currentStrokeRef.current });
        redoStackRef.current = [];
        channelRef.current?.trigger('client-stroke-end', {});
    };

    // === UI Components ===

    return (
        <div className="fixed inset-0 bg-[#EBF4FF] flex flex-col font-sans select-none overflow-hidden touch-none">

            {/* --- Header --- */}
            <header className="h-16 px-4 flex items-center justify-between shrink-0 bg-white border-b-2 border-[#e5e7eb] shadow-sm z-20">
                {/* Logo */}
                <div className="flex items-center select-none">
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">RE</span>
                    <span className="text-2xl font-black text-cyan-500 mx-[2px]">:</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">KAI</span>
                </div>

                {/* Connection Indicator */}
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${isConnected ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    {isConnected ? 'ONLINE' : 'CONNECTING...'}
                </div>

                {/* Undo/Redo */}
                <div className="flex gap-2">
                    <ActionButton icon={<RotateCcw size={18} />} onClick={performUndo} label="Undo" />
                    <ActionButton icon={<RotateCw size={18} />} onClick={performRedo} label="Redo" />
                </div>
            </header>

            {/* --- Main Workspace --- */}
            <div className="flex-1 flex p-4 gap-4 overflow-hidden relative">

                {/* 1. Toolbar (Floating Left) */}
                <div className="flex flex-col gap-3 bg-white p-2 rounded-2xl border-2 border-[#e5e7eb] shadow-[0_4px_0_#e5e7eb] h-fit z-10">
                    <ToolButton
                        active={mode === 'draw'}
                        onClick={() => setMode('draw')}
                        icon={<Pencil size={20} />}
                    />
                    <ToolButton
                        active={mode === 'erase'}
                        onClick={() => setMode('erase')}
                        icon={<Eraser size={20} />}
                    />
                    <div className="w-full h-0.5 bg-gray-100 my-1" />
                    <ToolButton
                        active={false}
                        onClick={() => {/* Settings logic */ }}
                        icon={<Settings size={20} />}
                    />
                </div>

                {/* 2. Top Bar (Color & Size) - Floating Top Center */}
                <div className="absolute top-4 left-20 right-4 flex gap-4 z-10 pointer-events-none">
                    <div className="pointer-events-auto flex items-center bg-white rounded-2xl p-1.5 pl-3 gap-4 border-2 border-[#e5e7eb] shadow-[0_4px_0_#e5e7eb] w-full max-w-md">

                        {/* Color Picker Trigger */}
                        <div className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="w-9 h-9 rounded-full border-4 border-white ring-2 ring-gray-200 shadow-sm transition-transform active:scale-95 hover:scale-105"
                                style={{ backgroundColor: color }}
                            />

                            {/* Popover Color Palette */}
                            {showColorPicker && (
                                <div className="absolute top-full left-0 mt-3 p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-xl grid grid-cols-3 gap-2 animate-in fade-in zoom-in-95 duration-200 w-36">
                                    {colors.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => { setColor(c); setShowColorPicker(false); }}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent ring-1 ring-gray-100'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Custom Size Slider */}
                        <div className="flex-1 flex items-center h-full pr-2 relative group">
                            {/* Track */}
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative inner-shadow">
                                <div
                                    className="h-full bg-slate-800 rounded-full origin-left"
                                    style={{ width: `${(size / 30) * 100}%` }}
                                />
                            </div>

                            {/* Thumb (Visual only) */}
                            <div
                                className="absolute w-6 h-6 bg-white border-2 border-slate-800 rounded-full shadow-sm pointer-events-none transition-transform group-active:scale-110"
                                style={{
                                    left: `${(size / 30) * 100}%`,
                                    transform: 'translateX(-50%)'
                                }}
                            />

                            {/* Hidden Input for Logic */}
                            <input
                                type="range"
                                min="1" max="30"
                                value={size}
                                onChange={(e) => setSize(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Canvas Area */}
                <div ref={containerRef} className="flex-1 relative bg-white rounded-3xl border-[3px] border-slate-900 shadow-sm overflow-hidden touch-none">
                    <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="block touch-none cursor-crosshair"
                    />
                </div>
            </div>

            {/* --- Orientation Modal --- */}
            {showOrientationModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-300 text-center">
                        <h2 className="text-xl font-black text-slate-800 mb-2">画面の向きについて</h2>
                        <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
                            縦・横どちらでも利用可能です。<br />お好きなスタイルでどうぞ。
                        </p>

                        {/* Device Animation */}
                        <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                            <style jsx>{`
                                @keyframes rotate-device {
                                    0%, 20% { transform: rotate(0deg); }
                                    40%, 60% { transform: rotate(90deg); }
                                    80%, 100% { transform: rotate(0deg); }
                                }
                                .device-anim { animation: rotate-device 4s ease-in-out infinite; }
                            `}</style>
                            <div className="device-anim w-24 h-32 border-[5px] border-slate-800 rounded-2xl bg-white flex flex-col items-center py-2 shadow-lg">
                                <div className="w-1 h-1 bg-slate-300 rounded-full mb-1" />
                                <div className="w-16 h-20 bg-slate-100 rounded" />
                                <div className="w-2 h-2 border-2 border-slate-300 rounded-full mt-auto" />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowOrientationModal(false)}
                            className="w-full py-4 rounded-2xl bg-[#58cc02] hover:bg-[#46a302] text-white font-black text-lg shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                        >
                            <Check strokeWidth={4} size={20} />
                            はじめる
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Sub Components for Consistent Design ---

function ActionButton({ icon, onClick, label }: { icon: React.ReactNode, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="w-10 h-10 flex items-center justify-center bg-white border-2 border-[#e5e7eb] rounded-xl shadow-[0_4px_0_#e5e7eb] text-slate-500 active:shadow-none active:translate-y-[4px] transition-all hover:bg-slate-50"
        >
            {icon}
        </button>
    );
}

function ToolButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`w-11 h-11 flex items-center justify-center rounded-xl border-2 transition-all active:shadow-none active:translate-y-[4px] ${active
                    ? 'bg-slate-800 border-slate-800 text-white shadow-[0_4px_0_#1e293b]'
                    : 'bg-white border-[#e5e7eb] text-slate-400 shadow-[0_4px_0_#e5e7eb] hover:bg-slate-50'
                }`}
        >
            {icon}
        </button>
    );
}

export default function TabletClient() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-[#EBF4FF] text-slate-400 font-bold">LOADING...</div>}>
            <TabletClientContent />
        </Suspense>
    );
}