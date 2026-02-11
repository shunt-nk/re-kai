'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import QRCode from 'qrcode';
import Pusher from 'pusher-js';
import { v4 as uuidv4 } from 'uuid';

// === Type Definitions ===
interface Stroke {
    type: string;
    mode: string;
    color?: string;
    size?: number;
    points: { x: number; y: number }[];
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

function PCClientContent() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [token, setToken] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("待機中...");

    // Drawing State
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const drawingRef = useRef(false);
    const pusherRef = useRef<Pusher | null>(null);

    // Redraw Function
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

        // Restore context
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 2;
    };

    // Cleanup Pusher on unmount
    useEffect(() => {
        return () => {
            if (pusherRef.current) {
                pusherRef.current.disconnect();
            }
        };
    }, []);

    // Generate QR when token changes
    useEffect(() => {
        if (token && qrRef.current) {
            qrRef.current.innerHTML = '';
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const url = `${origin}/tablet?token=${token}`;

            const qrCanvas = document.createElement('canvas');
            QRCode.toCanvas(qrCanvas, url, { width: 180, margin: 1 }, (err) => {
                if (!err && qrRef.current) {
                    qrRef.current.appendChild(qrCanvas);
                }
            });
        }
    }, [token]);

    const generateQR = () => {
        if (pusherRef.current) return;

        const newToken = uuidv4();
        setToken(newToken);
        setStatus("接続待ち: QRを読み込んでください");

        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: '/api/pusher',
        });
        pusherRef.current = pusher;

        const channelName = `private-session-${newToken}`;
        const channel = pusher.subscribe(channelName);

        // === Event Handlers ===
        channel.bind('pusher:subscription_succeeded', () => {
            console.log('Pusher Channel Subscribed:', channelName);
        });

        channel.bind('client-tablet-ready', () => {
            setStatus("タブレットと接続されました！");
            if (qrRef.current) qrRef.current.style.display = 'none';
        });

        channel.bind('client-stroke-start', (d: DrawData) => {
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
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx || !drawingRef.current) return;

            currentStrokeRef.current.points.push({ x: d.x, y: d.y });
            ctx.lineTo(d.x * canvas.width, d.y * canvas.height);
            ctx.stroke();
        });

        channel.bind('client-stroke-end', () => {
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

        channel.bind('client-resize', (d: DrawData) => {
            const canvas = canvasRef.current;
            if (canvas && d.width && d.height) {
                canvas.width = d.width;
                canvas.height = d.height;
                redraw();
            }
        });
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-slate-50">
            {/* Status Card / QR Overlay */}
            <div className={`fixed top-6 left-6 z-50 transition-all duration-300 ${!token ? 'w-auto' : 'w-auto'}`}>
                <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-100/50">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-slate-900 m-0">PC画面</h2>
                        <p className={`text-sm mt-1 font-medium ${status.includes("接続されました") ? "text-green-600" : "text-slate-500"}`}>
                            {status}
                        </p>
                    </div>

                    {!token && (
                        <button
                            onClick={generateQR}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95"
                        >
                            QRを生成して接続
                        </button>
                    )}

                    <div ref={qrRef} className="mt-2 flex justify-center empty:hidden" />
                </div>
            </div>

            {/* Main Canvas */}
            <canvas
                ref={canvasRef}
                width={typeof window !== 'undefined' ? window.innerWidth : 1920}
                height={typeof window !== 'undefined' ? window.innerHeight : 1080}
                className="block w-full h-full touch-none cursor-crosshair"
            />
        </div>
    );
}

export default function PCClient() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-400">
                Loading PC Client...
            </div>
        }>
            <PCClientContent />
        </Suspense>
    );
}