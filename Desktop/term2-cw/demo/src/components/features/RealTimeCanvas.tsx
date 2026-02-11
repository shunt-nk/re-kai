// 'use client';

// import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
// import QRCode from 'qrcode';
// import Pusher from 'pusher-js';
// import { v4 as uuidv4 } from 'uuid';
// import { Tablet, X } from 'lucide-react'; // 余計なアイコン削除

// interface Stroke {
//     type: string;
//     mode: string;
//     color?: string;
//     size?: number;
//     points: { x: number; y: number }[];
// }

// interface RealTimeCanvasProps {
//     className?: string;
//     onConnectionChange?: (isConnected: boolean, token: string | null) => void;
//     onStart?: () => void;
//     width?: number | string;
//     height?: number | string;
// }

// export interface RealTimeCanvasHandle {
//     clearCanvas: () => void;
//     getToken: () => string | null;
//     getImageData: () => string | null;
// }

// interface DrawData {
//     x: number;
//     y: number;
//     mode: string;
//     color?: string;
//     size?: number;
//     width?: number;
//     height?: number;
// }

// const RealTimeCanvas = forwardRef<RealTimeCanvasHandle, RealTimeCanvasProps>(({
//     className,
//     onConnectionChange,
//     onStart,
//     width = '100%',
//     height = '100%'
// }, ref) => {
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const qrRef = useRef<HTMLDivElement>(null);

//     // 【修正】初期化時にUUIDを確定（タイミングズレ防止）
//     const [token] = useState<string>(() => uuidv4());

//     const [isConnected, setIsConnected] = useState(false);
//     const [qrUrl, setQrUrl] = useState<string>('');
//     const [showModal, setShowModal] = useState(false);

//     // Drawing State
//     const historyRef = useRef<Stroke[]>([]);
//     const redoStackRef = useRef<Stroke[]>([]);
//     const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
//     const drawingRef = useRef(false);
//     const pusherRef = useRef<Pusher | null>(null);

//     useImperativeHandle(ref, () => ({
//         clearCanvas: () => {
//             historyRef.current = [];
//             redoStackRef.current = [];
//             redraw();
//         },
//         getToken: () => token,
//         getImageData: () => {
//             if (canvasRef.current) {
//                 return canvasRef.current.toDataURL('image/png');
//             }
//             return null;
//         }
//     }));

//     const redraw = () => {
//         const canvas = canvasRef.current;
//         const ctx = canvas?.getContext('2d');
//         if (!canvas || !ctx) return;

//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         ctx.lineCap = 'round';
//         ctx.lineJoin = 'round';

//         historyRef.current.forEach(stroke => {
//             ctx.beginPath();
//             ctx.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
//             ctx.strokeStyle = stroke.color || '#000000';
//             ctx.lineWidth = stroke.size || 2;
//             if (stroke.points.length > 0) {
//                 ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
//                 for (let i = 1; i < stroke.points.length; i++) {
//                     ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
//                 }
//                 ctx.stroke();
//             }
//         });

//         ctx.globalCompositeOperation = 'source-over';
//     };

//     // 1. URL生成
//     useEffect(() => {
//         if (onConnectionChange) onConnectionChange(false, token);

//         if (typeof window !== 'undefined') {
//             // ここで確実にトークン付きURLをセット
//             const origin = window.location.origin;
//             const url = `${origin}/tablet?token=${token}`;
//             setQrUrl(url);
//         }
//     }, [token]);

//     // 2. モーダルが開いた時にQRコードを描画
//     useEffect(() => {
//         if (showModal && qrUrl && qrRef.current) {
//             qrRef.current.innerHTML = ''; // クリア

//             const qrCanvas = document.createElement('canvas');
//             QRCode.toCanvas(qrCanvas, qrUrl, { width: 200, margin: 2, color: { dark: '#334155', light: '#ffffff' } }, (err) => {
//                 if (!err && qrRef.current) {
//                     qrRef.current.appendChild(qrCanvas);
//                 }
//             });
//         }
//     }, [showModal, qrUrl]);

//     // 3. Pusher接続
//     useEffect(() => {
//         if (!token) return;

//         const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
//         const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

//         if (!pusherKey || !pusherCluster) {
//             console.error("[PC] Pusher Env Vars missing");
//             return;
//         }

//         const pusher = new Pusher(pusherKey, {
//             cluster: pusherCluster,
//             authEndpoint: '/api/pusher',
//         });
//         pusherRef.current = pusher;

//         const channelName = `private-session-${token}`;
//         const channel = pusher.subscribe(channelName);

//         channel.bind('client-tablet-ready', (data: any) => {
//             console.log("[PC] Tablet Connected!", data);
//             setIsConnected(true);
//             setShowModal(false);
//             if (onConnectionChange) onConnectionChange(true, token);
//             channel.trigger('client-pc-ack', { status: 'ok' });
//         });

//         channel.bind('client-stroke-start', (d: DrawData) => {
//             const canvas = canvasRef.current;
//             const ctx = canvas?.getContext('2d');
//             if (!canvas || !ctx) return;

//             drawingRef.current = true;
//             currentStrokeRef.current = {
//                 type: 'stroke',
//                 mode: d.mode,
//                 color: d.color,
//                 size: d.size,
//                 points: [{ x: d.x, y: d.y }]
//             };

//             ctx.beginPath();
//             ctx.globalCompositeOperation = d.mode === 'erase' ? 'destination-out' : 'source-over';
//             ctx.strokeStyle = d.color || '#000000';
//             ctx.lineWidth = d.size || 2;
//             ctx.moveTo(d.x * canvas.width, d.y * canvas.height);
//         });

//         channel.bind('client-stroke-move', (d: DrawData) => {
//             const canvas = canvasRef.current;
//             const ctx = canvas?.getContext('2d');
//             if (!canvas || !ctx || !drawingRef.current) return;

//             currentStrokeRef.current.points.push({ x: d.x, y: d.y });
//             ctx.lineTo(d.x * canvas.width, d.y * canvas.height);
//             ctx.stroke();
//         });

//         channel.bind('client-stroke-end', () => {
//             drawingRef.current = false;
//             historyRef.current.push({ ...currentStrokeRef.current });
//             redoStackRef.current = [];
//         });

//         channel.bind('client-undo', () => {
//             if (historyRef.current.length > 0) {
//                 const stroke = historyRef.current.pop();
//                 if (stroke) redoStackRef.current.push(stroke);
//                 redraw();
//             }
//         });

//         channel.bind('client-redo', () => {
//             if (redoStackRef.current.length > 0) {
//                 const stroke = redoStackRef.current.pop();
//                 if (stroke) historyRef.current.push(stroke);
//                 redraw();
//             }
//         });

//         channel.bind('client-resize', () => {
//             redraw();
//         });

//         return () => {
//             pusher.unsubscribe(channelName);
//             pusher.disconnect();
//         };
//     }, [token]);

//     // Handle initial sizing
//     useEffect(() => {
//         const resizeCanvas = () => {
//             if (canvasRef.current && canvasRef.current.parentElement) {
//                 canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
//                 canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
//                 redraw();
//             }
//         };
//         window.addEventListener('resize', resizeCanvas);
//         setTimeout(resizeCanvas, 100);
//         return () => window.removeEventListener('resize', resizeCanvas);
//     }, []);

//     return (
//         <div className={`relative ${className}`} style={{ width, height, overflow: 'hidden' }}>
//             <canvas
//                 ref={canvasRef}
//                 className="w-full h-full block touch-none cursor-default"
//             />

//             {/* --- タブレット接続ボタン (未接続時のみ) --- */}
//             {!isConnected && (
//                 <button
//                     onClick={() => setShowModal(true)}
//                     className="absolute top-4 right-4 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full shadow-md hover:bg-gray-50 flex items-center gap-2 font-medium transition-all z-20"
//                 >
//                     <Tablet size={18} />
//                     タブレット接続
//                 </button>
//             )}

//             {/* --- QRコードモーダル (コピーボタン等は削除済み) --- */}
//             {showModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
//                     <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative flex flex-col items-center">
//                         {/* 閉じるボタン */}
//                         <button
//                             onClick={() => setShowModal(false)}
//                             className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500"
//                         >
//                             <X size={24} />
//                         </button>

//                         <h3 className="text-xl font-bold text-gray-800 mb-2">タブレットを接続</h3>
//                         <p className="text-sm text-gray-500 mb-6 text-center">
//                             以下のQRコードをタブレットのカメラで<br />読み取ってください
//                         </p>

//                         {/* QRコード表示エリア */}
//                         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
//                             <div ref={qrRef} />
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// });

// RealTimeCanvas.displayName = 'RealTimeCanvas';

// export default RealTimeCanvas;

'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCode from 'qrcode';
import Pusher from 'pusher-js';
import { v4 as uuidv4 } from 'uuid';
import { Tablet, X } from 'lucide-react';

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

// データ受信用の型定義を更新
interface DrawData {
    x: number;
    y: number;
    mode: string;
    color?: string;
    size?: number;
    // Batch用
    points?: { x: number, y: number }[];
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
    const [token] = useState<string>(() => uuidv4());
    const [isConnected, setIsConnected] = useState(false);
    const [qrUrl, setQrUrl] = useState<string>('');
    const [showModal, setShowModal] = useState(false);

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

    useEffect(() => {
        if (onConnectionChange) onConnectionChange(false, token);
        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            const url = `${origin}/tablet?token=${token}`;
            setQrUrl(url);
        }
    }, [token]);

    useEffect(() => {
        if (showModal && qrUrl && qrRef.current) {
            qrRef.current.innerHTML = '';
            const qrCanvas = document.createElement('canvas');
            QRCode.toCanvas(qrCanvas, qrUrl, { width: 200, margin: 2, color: { dark: '#334155', light: '#ffffff' } }, (err) => {
                if (!err && qrRef.current) {
                    qrRef.current.appendChild(qrCanvas);
                }
            });
        }
    }, [showModal, qrUrl]);

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

        channel.bind('client-tablet-ready', (data: any) => {
            setIsConnected(true);
            setShowModal(false);
            if (onConnectionChange) onConnectionChange(true, token);
            channel.trigger('client-pc-ack', { status: 'ok' });
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

        // 【通信最適化】まとめて送られてきた配列を処理するイベント
        channel.bind('client-stroke-batch', (d: DrawData) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx || !drawingRef.current || !d.points) return;

            // 配列分だけ線を引く
            d.points.forEach(point => {
                currentStrokeRef.current.points.push({ x: point.x, y: point.y });
                ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
            });
            ctx.stroke();
        });

        // 互換性のため古いイベントも一応残すが、基本は batch が呼ばれる
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

    return (
        <div className={`relative ${className}`} style={{ width, height, overflow: 'hidden' }}>
            <canvas ref={canvasRef} className="w-full h-full block touch-none cursor-default" />

            {!isConnected && (
                <button onClick={() => setShowModal(true)} className="absolute top-4 right-4 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full shadow-md hover:bg-gray-50 flex items-center gap-2 font-medium transition-all z-20">
                    <Tablet size={18} />
                    タブレット接続
                </button>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative flex flex-col items-center">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500">
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">タブレットを接続</h3>
                        <p className="text-sm text-gray-500 mb-6 text-center">QRコードを読み取ってください</p>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
                            <div ref={qrRef} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

RealTimeCanvas.displayName = 'RealTimeCanvas';

export default RealTimeCanvas;