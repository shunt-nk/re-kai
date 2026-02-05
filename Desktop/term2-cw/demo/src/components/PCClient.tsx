'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface Stroke {
    type: string;
    mode: string;
    color?: string;
    size?: number;
    points: { x: number; y: number }[];
}

export default function PCClient() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [token, setToken] = useState<string | null>(null);

    // Refs for mutable drawing state
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const drawingRef = useRef(false);

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

    // Refactoring WS to ref to allow button click
    const wsRef = useRef<WebSocket | null>(null);
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.hostname}:3001`);
        wsRef.current = ws;

        ws.onmessage = (e) => {
            const d = JSON.parse(e.data);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;

            if (d.type === 'token') {
                setToken(d.token);
                if (qrRef.current) qrRef.current.innerHTML = '';

                const host = d.ip ? `${d.ip}:3000` : window.location.host;
                const url = `http://${host}/tablet?token=` + d.token;

                const qrCanvas = document.createElement('canvas');
                QRCode.toCanvas(qrCanvas, url, (err) => {
                    if (!err && qrRef.current) qrRef.current.appendChild(qrCanvas);
                });
            }

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
                canvas.width = d.width;
                canvas.height = d.height;
                redraw();
            }
        };

        return () => {
            ws.close();
        }
    }, []);

    const generateQR = () => {
        wsRef.current?.send(JSON.stringify({ type: 'register_pc' }));
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <div style={{
                position: 'fixed',
                top: 10,
                left: 10,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '10px',
                borderRadius: '8px'
            }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>PC画面</h2>
                <button
                    onClick={generateQR}
                    style={{
                        padding: '10px 15px',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    QRを生成
                </button>
                <div ref={qrRef} style={{ marginTop: '10px' }}></div>
            </div>
            <canvas
                ref={canvasRef}
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
