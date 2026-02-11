'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCode from 'qrcode';
import Pusher from 'pusher-js';
import { v4 as uuidv4 } from 'uuid';
import { Copy, Check } from 'lucide-react'; // アイコン追加

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
    const qrRef = useRef<HTMLCanvasElement>(null); // divではなくcanvasを直接参照
    const [token, setToken] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectUrl, setConnectUrl] = useState('');
    const [copied, setCopied] = useState(false);

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

    // 1. トークン生成とURL作成
    useEffect(() => {
        const newToken = uuidv4();
        setToken(newToken);
        if (typeof window !== 'undefined') {
            const url = `${window.location.origin}/tablet?token=${newToken}`;
            setConnectUrl(url);
            console.log("Tablet URL:", url); // デバッグ用ログ
        }
        if (onConnectionChange) onConnectionChange(false, newToken);
    }, []);

    // 2. QRコード描画 (URLが確定したら実行)
    useEffect(() => {
        if (connectUrl && qrRef.current) {
            QRCode.toCanvas(qrRef.current, connectUrl, {
                width: 160,
                margin: 2,
                color: { dark: '#334155', light: '#ffffff' }
            }, (err) => {
                if (err) console.error("QR Generation Error:", err);
            });
        }
    }, [connectUrl]);

    // 3. Pusher接続 (トークンが確定したら実行)
    useEffect(() => {
        if (!token) return;

        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) return;

        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher',
        });
        pusherRef.current = pusher;

        const channelName = `private-session-${token}`;
        const channel = pusher.subscribe(channelName);

        // Bind Events
        channel.bind('client-tablet-ready', () => {
            console.log("Tablet Connected!");
            setIsConnected(true);
            if (onConnectionChange) onConnectionChange(true, token);
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

        channel.bind('client-resize', () => {
            redraw();
        });

        return () => {
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [token]);

    // Handle initial sizing
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
                redraw();
            }
        };
        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 100);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(connectUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`relative ${className} flex items-center justify-center bg-gray-50`} style={{ width, height, overflow: 'hidden' }}>

            {/* キャンバス */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block touch-none cursor-default z-10"
            />

            {/* 未接続時にQRコードを表示 (キャンバスの下に配置) */}
            {!isConnected && (
                <div className="absolute z-20 bg-white/90 p-6 rounded-3xl shadow-xl backdrop-blur-sm border border-gray-100 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="text-center space-y-1">
                        <h3 className="font-bold text-gray-800 text-lg">タブレットを接続</h3>
                        <p className="text-xs text-gray-500">QRコードを読み取ってください</p>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-inner">
                        <canvas ref={qrRef} className="rounded-lg" />
                    </div>

                    {/* コピーボタン */}
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? 'コピーしました' : 'URLをコピー'}
                    </button>
                </div>
            )}
        </div>
    );
});

RealTimeCanvas.displayName = 'RealTimeCanvas';

export default RealTimeCanvas;