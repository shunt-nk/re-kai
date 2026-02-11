'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCode from 'qrcode';
import Pusher from 'pusher-js';
import { v4 as uuidv4 } from 'uuid';

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

interface DrawData {
    x: number;
    y: number;
    mode: string;
    color?: string;
    size?: number;
    width?: number;
    height?: number;
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
    const pusherRef = useRef<Pusher | null>(null);

    useImperativeHandle(ref, () => ({
        clearCanvas: () => {
            historyRef.current = [];
            redoStackRef.current = [];
            redraw();
            // Optional: send clear event to tablet if supported
            // channelRef.current?.trigger('client-clear', {});
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
        // Generate a new token
        const newToken = uuidv4();
        setToken(newToken);

        // Notify parent about the token
        if (onConnectionChange) onConnectionChange(false, newToken);

        // Generate QR Code
        if (qrRef.current) {
            // Use window.location.origin for correct protocol/host (works in Vercel)
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const url = `${origin}/tablet?token=${newToken}`;

            qrRef.current.innerHTML = '';
            const qrCanvas = document.createElement('canvas');

            // Use a flag to prevent appending if unmounted/token changed
            let isCancelled = false;

            QRCode.toCanvas(qrCanvas, url, { width: 160, margin: 1, color: { dark: '#334155', light: '#ffffff' } }, (err) => {
                if (isCancelled) return;
                if (!err && qrRef.current) {
                    qrRef.current.innerHTML = ''; // Clear again just in case
                    qrRef.current.appendChild(qrCanvas);
                }
            });

            // Cleanup function for this specific block not easy inside useEffect generally, 
            // but we rely on the main cleanup or next run.
            // Actually, we can't easily cancel strict mode dupes here without ref tracking.
        }


        // Initialize Pusher
        // Initialize Pusher
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) {
            console.error("[PC] Pusher Env Vars missing", { pusherKey, pusherCluster });
            return;
        }

        // Enable logger
        Pusher.logToConsole = true;

        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher',
        });
        pusherRef.current = pusher;

        // Connection Debugging
        pusher.connection.bind('state_change', (states: any) => {
            console.log('[PC] Pusher State Change:', states);
        });
        pusher.connection.bind('connected', () => {
            console.log('[PC] Pusher Connected. Socket ID:', pusher.connection.socket_id);
        });
        pusher.connection.bind('error', (err: any) => {
            console.error('[PC] Pusher Connection Error:', err);
        });

        const channelName = `private-session-${newToken}`;
        console.log(`[PC] Subscribing to channel: ${channelName} (Token: ${newToken})`);

        const channel = pusher.subscribe(channelName);

        // Bind Events
        channel.bind('pusher:subscription_succeeded', () => {
            console.log('[PC] Subscription Succeeded:', channelName);
        });

        channel.bind('pusher:subscription_error', (status: any) => {
            console.error('[PC] Subscription Error:', status);
        });

        channel.bind('client-tablet-ready', (data: any) => {
            console.log("[PC] Received client-tablet-ready:", data);
            setLastEvent('Tablet Ready');
            setIsConnected(true);
            if (onConnectionChange) onConnectionChange(true, null);

            // Send Acknowledgement
            console.log("[PC] Sending client-pc-ack");
            const triggered = channel.trigger('client-pc-ack', { status: 'ok' });
            console.log("[PC] client-pc-ack triggered:", triggered);
        });

        channel.bind('client-stroke-start', (d: DrawData) => {
            setLastEvent('Stroke Start');
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

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
        });

        channel.bind('client-stroke-move', (d: DrawData) => {
            // setLastEvent('Move'); // Too noisy, maybe skip or throttle
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx || !drawingRef.current) return;

            currentStrokeRef.current.points.push({ x: d.x, y: d.y });
            ctx.lineTo(d.x * canvas.width, d.y * canvas.height);
            ctx.stroke();
        });

        channel.bind('client-stroke-end', () => {
            setLastEvent('Stroke End');
            drawingRef.current = false;
            historyRef.current.push({ ...currentStrokeRef.current });
            redoStackRef.current = [];
        });

        channel.bind('client-undo', () => {
            if (historyRef.current.length > 0) {
                const stroke = historyRef.current.pop();
                if (stroke) redoStackRef.current.push(stroke);
                redraw();
            }
        });

        channel.bind('client-redo', () => {
            if (redoStackRef.current.length > 0) {
                const stroke = redoStackRef.current.pop();
                if (stroke) historyRef.current.push(stroke);
                redraw();
            }
        });

        channel.bind('client-resize', () => {
            redraw();
        });

        return () => {
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, []);

    // Debug
    const [lastEvent, setLastEvent] = useState<string>('None');

    // Handle initial sizing
    useEffect(() => {
        const resizeCanvas = () => {
            // ... existing resize logic ...
            if (canvasRef.current && canvasRef.current.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
                redraw();
            }
        };
        window.addEventListener('resize', resizeCanvas);
        // Delay initial resize slightly to ensure parent is ready
        setTimeout(resizeCanvas, 100);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // ... existing return ...
    return (
        <div className={`relative ${className}`} style={{ width, height, overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                className="w-full h-full block touch-none cursor-default"
            />
            {/* Debug Overlay */}
            <div style={{ position: 'absolute', bottom: 5, left: 5, fontSize: '10px', color: '#888', background: 'rgba(255,255,255,0.7)', padding: '2px 5px', pointerEvents: 'none' }}>
                Last Event: {lastEvent} | ID: {token?.slice(0, 4)}
            </div>
        </div>
    );
});

RealTimeCanvas.displayName = 'RealTimeCanvas';

export default RealTimeCanvas;
