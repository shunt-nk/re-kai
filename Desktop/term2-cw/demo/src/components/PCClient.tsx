'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Pusher from 'pusher-js';
import { v4 as uuidv4 } from 'uuid';

// 型定義
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

export default function PCClient() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [token, setToken] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("待機中...");

    // 描画用の状態管理 (変更なし)
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const drawingRef = useRef(false);
    const pusherRef = useRef<Pusher | null>(null);

    // 再描画関数 (変更なし)
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
        ctx.lineWidth = 2;
    };

    // Pusherのクリーンアップ
    useEffect(() => {
        return () => {
            if (pusherRef.current) {
                pusherRef.current.disconnect();
            }
        };
    }, []);

    // トークンが生成されたらQRコードを表示
    useEffect(() => {
        if (token && qrRef.current) {
            qrRef.current.innerHTML = ''; // 前のQRを消す

            // Vercel上のURLを作成 (window.location.origin で今のドメインを取得)
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const url = `${origin}/tablet?token=${token}`;

            const qrCanvas = document.createElement('canvas');
            QRCode.toCanvas(qrCanvas, url, { width: 200 }, (err) => {
                if (!err && qrRef.current) {
                    qrRef.current.appendChild(qrCanvas);
                }
            });
        }
    }, [token]);

    const generateQR = () => {
        if (pusherRef.current) return; // 二重接続防止

        // 1. トークン(UUID)を生成
        const newToken = uuidv4();
        setToken(newToken);
        setStatus("接続待ち: QRを読み込んでください");

        // 2. Pusherの初期化
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: '/api/pusher', // 自作した認証API
        });
        pusherRef.current = pusher;

        // 3. チャンネル購読 (private-session-トークン)
        const channelName = `private-session-${newToken}`;
        const channel = pusher.subscribe(channelName);

        // === イベントハンドラ (WebSocketのonmessageから移植) ===

        // 接続成功時
        channel.bind('pusher:subscription_succeeded', () => {
            console.log('Pusher Channel Subscribed:', channelName);
        });

        // タブレットが接続してきた時
        channel.bind('client-tablet-ready', () => {
            setStatus("タブレットと接続されました！");
            // QRコードを隠すなどの処理をしても良い
            if (qrRef.current) qrRef.current.style.display = 'none';
        });

        // 描き始め
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

        // 描画中
        channel.bind('client-stroke-move', (d: DrawData) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx || !drawingRef.current) return;

            currentStrokeRef.current.points.push({ x: d.x, y: d.y });
            ctx.lineTo(d.x * canvas.width, d.y * canvas.height);
            ctx.stroke();
        });

        // 描き終わり
        channel.bind('client-stroke-end', () => {
            drawingRef.current = false;
            historyRef.current.push({ ...currentStrokeRef.current });
            redoStackRef.current = [];
        });

        // アンドゥ
        channel.bind('client-undo', () => {
            if (historyRef.current.length > 0) {
                const stroke = historyRef.current.pop();
                if (stroke) redoStackRef.current.push(stroke);
                redraw();
            }
        });

        // リドゥ
        channel.bind('client-redo', () => {
            if (redoStackRef.current.length > 0) {
                const stroke = redoStackRef.current.pop();
                if (stroke) historyRef.current.push(stroke);
                redraw();
            }
        });

        // リサイズ (タブレットの画面サイズに合わせる場合)
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
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <div style={{
                position: 'fixed',
                top: 10,
                left: 10,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>PC画面</h2>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>{status}</p>

                {!token && (
                    <button
                        onClick={generateQR}
                        style={{
                            padding: '10px 15px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            background: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px'
                        }}
                    >
                        QRを生成して接続
                    </button>
                )}

                <div ref={qrRef} style={{ marginTop: '10px' }}></div>
            </div>

            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    touchAction: 'none'
                }}
            />
        </div>
    );
}