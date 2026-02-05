'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCode from 'qrcode';

interface Stroke {
    type: string;
    mode: string;
    color?: string;
    size?: number;
    points: { x: number; y: number }[];
}

interface RealTimeCanvasProps {
    className?: string;
    onConnectionChange?: (isConnected: boolean, token: string | null) => void;
    onStart?: () => void;
    width?: number | string;
    height?: number | string;
}

export interface RealTimeCanvasHandle {
    clearCanvas: () => void;
    getToken: () => string | null;
    getImageData: () => string | null;
}

const RealTimeCanvas = forwardRef<RealTimeCanvasHandle, RealTimeCanvasProps>(({
    className,
    onConnectionChange,
    onStart,
    width = '100%',
    height = '100%'
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Drawing State
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const drawingRef = useRef(false);
    const wsRef = useRef<WebSocket | null>(null);
    const isRegisteredRef = useRef(false);

    useImperativeHandle(ref, () => ({
        clearCanvas: () => {
            historyRef.current = [];
            redoStackRef.current = [];
            redraw();
            wsRef.current?.send(JSON.stringify({ type: 'clear_request', token }));
        },
        getToken: () => token,
        getImageData: () => {
            if (canvasRef.current) {
                return canvasRef.current.toDataURL('image/png');
            }
            return null;
        }
    }));

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
                ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
                }
                ctx.stroke();
            }
        });

        ctx.globalCompositeOperation = 'source-over';
    };

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.hostname}:3001`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WS Connected');
        };

        ws.onmessage = (e) => {
            const d = JSON.parse(e.data);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');

            if (d.type === 'token') {
                setToken(d.token);
                // Update ref to stop interval from re-registering
                isRegisteredRef.current = true;

                if (onConnectionChange) onConnectionChange(false, d.token);

                // Generate QR
                const host = d.ip ? `${d.ip}:3000` : window.location.host;
                const url = `http://${host}/tablet?token=` + d.token;

                if (qrRef.current) {
                    qrRef.current.innerHTML = '';
                    const qrCanvas = document.createElement('canvas');
                    QRCode.toCanvas(qrCanvas, url, { width: 160, margin: 1, color: { dark: '#334155', light: '#ffffff' } }, (err) => {
                        if (!err && qrRef.current) qrRef.current.appendChild(qrCanvas);
                    });
                }
            }

            if (d.type === 'register_tablet_success') {
                setIsConnected(true);
                if (onConnectionChange) onConnectionChange(true, null);
            }

            if (d.type === 'start_timer') {
                if (onStart) onStart();
            }

            if (d.type === 'token_invalid') {
                ws.send(JSON.stringify({ type: 'register_pc' }));
            }

            // Ensure canvas exists for drawing operations
            if (!canvas || !ctx) return;

            // --- Drawing Logic ---
            if (d.type === 'stroke_start') {
                drawingRef.current = true;
                currentStrokeRef.current = {
                    type: 'stroke',
                    mode: d.mode,
                    color: d.color,
                    size: d.size,
                    points: [{ x: d.x, y: d.y }]
                };

                ctx.beginPath();
                ctx.globalCompositeOperation = d.mode === 'erase' ? 'destination-out' : 'source-over';
                ctx.strokeStyle = d.color || '#000000';
                ctx.lineWidth = d.size || 2;
                ctx.moveTo(d.x * canvas.width, d.y * canvas.height);
            }

            if (d.type === 'stroke_move' && drawingRef.current) {
                currentStrokeRef.current.points.push({ x: d.x, y: d.y });
                ctx.lineTo(d.x * canvas.width, d.y * canvas.height);
                ctx.stroke();
            }

            if (d.type === 'stroke_end') {
                drawingRef.current = false;
                historyRef.current.push({ ...currentStrokeRef.current });
                redoStackRef.current = [];
            }

            if (d.type === 'undo') {
                if (historyRef.current.length > 0) {
                    const stroke = historyRef.current.pop();
                    if (stroke) redoStackRef.current.push(stroke);
                    redraw();
                }
            }

            if (d.type === 'redo') {
                if (redoStackRef.current.length > 0) {
                    const stroke = redoStackRef.current.pop();
                    if (stroke) historyRef.current.push(stroke);
                    redraw();
                }
            }

            if (d.type === 'resize') {
                redraw();
            }
        };

        // Initial Register
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && !isRegisteredRef.current) {
                // Double check if we already have a token to be safe
                // If token exists, we are fine, but re-registering causes no harm usually, 
                // but checking token prevents loops
                if (!token) {
                    ws.send(JSON.stringify({ type: 'register_pc' }));
                } else {
                    isRegisteredRef.current = true;
                }
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            ws.close();
        }
    }, []);

    // Handle initial sizing
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    canvasRef.current.width = parent.clientWidth;
                    canvasRef.current.height = parent.clientHeight;
                    redraw();
                }
            }
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);


    return (
        <div className={`relative ${className}`} style={{ width, height, overflow: 'hidden' }}>
            {/* Overlay removed, handled by parent Modal */}
            <canvas
                ref={canvasRef}
                className="w-full h-full block touch-none cursor-default"
            />
        </div>
    );
});

RealTimeCanvas.displayName = 'RealTimeCanvas';

export default RealTimeCanvas;
