'use client';

import React, { useEffect, useRef, useState } from 'react';
import Toolbar from './ui/Toolbar';

interface Stroke {
    type: string;
    mode: string;
    color?: string;
    size?: number;
    points: { x: number; y: number }[];
}

export default function TabletClient() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // State
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(2);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);

    // Refs for mutable state used in event handlers
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);

    // Helpers
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
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
    };

    const performUndo = () => {
        if (historyRef.current.length === 0) return;
        const stroke = historyRef.current.pop();
        if (stroke) redoStackRef.current.push(stroke);
        redraw();
        wsRef.current?.send(JSON.stringify({ type: 'undo', token: tokenRef.current }));
    };

    const performRedo = () => {
        if (redoStackRef.current.length === 0) return;
        const stroke = redoStackRef.current.pop();
        if (stroke) historyRef.current.push(stroke);
        redraw();
        wsRef.current?.send(JSON.stringify({ type: 'redo', token: tokenRef.current }));
    };

    // WebSocket & Canvas Init
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        tokenRef.current = params.get('token');
        const token = tokenRef.current;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.hostname}:3001`);
        wsRef.current = ws;

        const resize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                redraw();
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'resize',
                        token,
                        width: window.innerWidth,
                        height: window.innerHeight
                    }));
                }
            }
        };

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'register_tablet', token }));
            resize();
        };

        ws.onmessage = (e) => {
            const d = JSON.parse(e.data);
            if (d.type === 'connection_success') {
                setIsConnected(true);
            }
        };

        window.addEventListener('resize', resize);

        // Prevent default touch actions
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
            canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        }

        return () => {
            window.removeEventListener('resize', resize);
            ws.close();
        };
    }, []);

    // Drawing Handlers
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
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

        wsRef.current?.send(JSON.stringify({
            type: 'stroke_start',
            token: tokenRef.current,
            mode,
            color,
            size,
            x: e.nativeEvent.offsetX / canvas.width,
            y: e.nativeEvent.offsetY / canvas.height
        }));
    };

    // ... (rest of input handlers)

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.buttons !== 1) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        currentStrokeRef.current.points.push({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();

        wsRef.current?.send(JSON.stringify({
            type: 'stroke_move',
            token: tokenRef.current,
            x: e.nativeEvent.offsetX / canvas.width,
            y: e.nativeEvent.offsetY / canvas.height
        }));
    };

    const handlePointerUp = () => {
        historyRef.current.push({ ...currentStrokeRef.current });
        redoStackRef.current = [];
        wsRef.current?.send(JSON.stringify({ type: 'stroke_end', token: tokenRef.current }));
    };

    return (
        <div className="fixed inset-0 bg-white touch-none overflow-hidden">
            {/* Simple Header for Tablet */}
            <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 shadow-sm">
                <span className="font-bold text-slate-800">描画入力</span>
                <div className={`flex items-center gap-2 text-xs font-bold transition-colors duration-300 ${isConnected ? 'text-[#58cc02]' : 'text-[#afafaf]'}`}>
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isConnected ? 'bg-[#58cc02]' : 'bg-[#e5e5e5]'}`} />
                    {isConnected ? '接続済み' : '接続待機中...'}
                </div>
            </div>



            <Toolbar
                mode={mode}
                setMode={setMode}
                color={color}
                setColor={setColor}
                size={size}
                setSize={setSize}
                onUndo={performUndo}
                onRedo={performRedo}
            />
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="block w-full h-full touch-none"
            />
            {/* Orientation Modal */}
            {showOrientationModal && (
                <div className="tablet-modal-overlay" onClick={() => setShowOrientationModal(false)}>
                    <div className="tablet-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="tablet-modal-text">
                            縦・横どちらでも利用することができます。<br />
                            お好きなスタイルでご利用ください。
                        </div>

                        <div className="rotation-graphic">
                            {/* Left Arrow */}
                            <div className="arrow-wrapper">
                                <svg width="60" height="120" viewBox="0 0 60 120">
                                    <path
                                        d="M 40 25 Q 10 60 40 95"
                                        className="arrow-path"
                                    />
                                    {/* Tip at 40,95. Pointing South-East.
                                        Rotation to match circle flow.
                                    */}
                                    <path d="M 19 87 L 40 95 L 42 75" className="arrow-path" />
                                </svg>
                            </div>

                            {/* Device Frame */}
                            <div className="device-frame" />

                            {/* Right Arrow */}
                            <div className="arrow-wrapper">
                                <svg width="60" height="120" viewBox="0 0 60 120">
                                    <path
                                        d="M 20 95 Q 50 60 20 25"
                                        className="arrow-path"
                                    />
                                    {/* Tip at 20,25. Pointing North-West.
                                        Rotation to match circle flow.
                                    */}
                                    <path d="M 40 32 L 20 25 L 18 45" className="arrow-path" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
