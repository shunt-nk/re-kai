// 'use client';

// import React, { useEffect, useRef, useState, Suspense } from 'react';
// import Pusher from 'pusher-js';
// import { useSearchParams } from 'next/navigation';
// import { Pencil, Eraser, Palette, RotateCcw, RotateCw } from 'lucide-react';

// // === 型定義 ===
// interface Stroke {
//     type: string;
//     mode: string;
//     color?: string;
//     size?: number;
//     points: { x: number; y: number }[];
// }

// interface PusherChannel {
//     trigger: (eventName: string, data: any) => void;
//     bind: (eventName: string, callback: any) => void;
//     unbind_all: () => void;
// }

// // === メインロジックコンポーネント ===
// function TabletClientContent() {
//     // --- Refs ---
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const channelRef = useRef<PusherChannel | null>(null);
//     const containerRef = useRef<HTMLDivElement>(null);
//     const colorInputRef = useRef<HTMLInputElement>(null); // カラーパレット用

//     // --- State ---
//     const [mode, setMode] = useState<'draw' | 'erase'>('draw');
//     const [color, setColor] = useState('#3b82f6'); // 初期色: 青
//     const [size, setSize] = useState(8);
//     const [isConnected, setIsConnected] = useState(false);

//     // --- Logic State ---
//     const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
//     const historyRef = useRef<Stroke[]>([]);
//     const redoStackRef = useRef<Stroke[]>([]);
//     const tokenRef = useRef<string | null>(null);

//     // === ロジック: 再描画 ===
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
//                 ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
//                 for (let i = 1; i < stroke.points.length; i++) {
//                     ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
//                 }
//                 ctx.stroke();
//             }
//         });
//         ctx.globalCompositeOperation = 'source-over';
//     };

//     // === ロジック: Undo / Redo ===
//     const performUndo = () => {
//         if (historyRef.current.length === 0) return;
//         const stroke = historyRef.current.pop();
//         if (stroke) redoStackRef.current.push(stroke);
//         redraw();
//         channelRef.current?.trigger('client-undo', {});
//     };

//     const performRedo = () => {
//         if (redoStackRef.current.length === 0) return;
//         const stroke = redoStackRef.current.pop();
//         if (stroke) historyRef.current.push(stroke);
//         redraw();
//         channelRef.current?.trigger('client-redo', {});
//     };

//     // === ロジック: Pusher接続 & リサイズ ===
//     const searchParams = useSearchParams();

//     // connection error state
//     const [connectionError, setConnectionError] = useState<string | null>(null);

//     useEffect(() => {
//         const token = searchParams.get('token');
//         tokenRef.current = token;

//         if (!token) return;

//         const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
//         const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

//         if (!pusherKey || !pusherCluster) {
//             console.error("Missing Pusher Env Vars");
//             setConnectionError("Pusher設定が見つかりません");
//             return;
//         }

//         // Enable logger
//         Pusher.logToConsole = true;

//         const pusher = new Pusher(pusherKey, {
//             cluster: pusherCluster,
//             authEndpoint: '/api/pusher',
//         });

//         const channelName = `private-session-${token}`;
//         console.log(`[Tablet] Subscribing to channel: ${channelName} (Token provided: ${token})`);

//         const channel = pusher.subscribe(channelName);
//         channelRef.current = channel as unknown as PusherChannel;

//         // Connection Debugging
//         pusher.connection.bind('state_change', (states: any) => {
//             console.log('[Tablet] Pusher State Change:', states);
//         });
//         pusher.connection.bind('connected', () => {
//             console.log('[Tablet] Pusher Connected. Socket ID:', pusher.connection.socket_id);
//         });
//         pusher.connection.bind('error', (err: any) => {
//             console.error('[Tablet] Pusher Connection Error:', err);
//         });

//         channel.bind('pusher:subscription_succeeded', () => {
//             console.log('[Tablet] Subscription Succeeded:', channelName);
//             setIsConnected(true);
//             setConnectionError(null);

//             // Send Ready Signal immediately
//             console.log("[Tablet] Sending client-tablet-ready...");
//             channel.trigger('client-tablet-ready', { device: 'tablet' });

//             // Retry sending ready signal every 2 seconds until acknowledged
//             const intervalId = setInterval(() => {
//                 console.log("[Tablet] Retrying client-tablet-ready...");
//                 channel.trigger('client-tablet-ready', { device: 'tablet' });
//             }, 2000);

//             // Listen for Ack from PC
//             channel.bind('client-pc-ack', () => {
//                 console.log("[Tablet] Received PC Ack! Connection established.");
//                 clearInterval(intervalId);
//             });

//             // Clean up: We can't easily clean up this interval if unmounted inside this callback closure
//             // unless we use a ref to store intervalId.
//             // For now, reliance on page refresh or disconnect is acceptable for this critical handshake.

//             // Initial resize after connection
//             if (containerRef.current && canvasRef.current) {
//                 const { clientWidth, clientHeight } = containerRef.current;
//                 canvasRef.current.width = clientWidth;
//                 canvasRef.current.height = clientHeight;
//                 redraw();
//                 try {
//                     console.log("[Tablet] Sending initial client-resize");
//                     channel.trigger('client-resize', { width: clientWidth, height: clientHeight });
//                 } catch (e) {
//                     console.warn("[Tablet] Resize trigger failed during init", e);
//                 }
//             }
//         });

//         channel.bind('pusher:subscription_error', (status: any) => {
//             console.error('[Tablet] Pusher Subscription Error:', status);
//             setIsConnected(false);
//             setConnectionError("接続エラー: 認証に失敗しました (" + JSON.stringify(status) + ")");
//         });

//         const handleResize = () => {
//             if (canvasRef.current && containerRef.current) {
//                 const { clientWidth, clientHeight } = containerRef.current;
//                 canvasRef.current.width = clientWidth;
//                 canvasRef.current.height = clientHeight;
//                 redraw();
//                 // Only trigger if we are connected to avoid errors
//                 // We'll use the ref's current channel, and ideally check if it's subscribed, 
//                 // but checking connection state via local var or ref is safer.
//                 // Note: 'channel' variable is available here in closure, but 'isConnected' state might be stale.
//                 // However, Pusher throws if you trigger on unsubscribed channel.
//                 // We can't easily check 'subscribed' property on the generic interface.
//                 // We will wrap in a try-catch for safety during resize events.
//                 try {
//                     channelRef.current?.trigger('client-resize', { width: clientWidth, height: clientHeight });
//                 } catch (e) {
//                     // Ignore trigger errors during resize if not connected
//                 }
//             }
//         };

//         window.addEventListener('resize', handleResize);

//         // Initial local resize (without trigger, or with try-catch safe trigger)
//         // This handles visual sizing before connection
//         if (containerRef.current && canvasRef.current) {
//             const { clientWidth, clientHeight } = containerRef.current;
//             canvasRef.current.width = clientWidth;
//             canvasRef.current.height = clientHeight;
//             redraw();
//         }

//         return () => {
//             window.removeEventListener('resize', handleResize);
//             pusher.unsubscribe(channelName);
//             pusher.disconnect();
//         };
//     }, [searchParams]);

//     // === ロジック: 描画イベント (ズレ完全修正版) ===
//     const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
//         const canvas = canvasRef.current;
//         if (!canvas) return { x: 0, y: 0 };

//         const rect = canvas.getBoundingClientRect();
//         // キャンバスの表示サイズと内部解像度の比率を計算して補正
//         const scaleX = canvas.width / rect.width;
//         const scaleY = canvas.height / rect.height;

//         return {
//             x: (e.clientX - rect.left) * scaleX,
//             y: (e.clientY - rect.top) * scaleY
//         };
//     };

//     const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
//         e.preventDefault();
//         const canvas = canvasRef.current;
//         const ctx = canvas?.getContext('2d');
//         if (!canvas || !ctx) return;

//         const { x, y } = getPoint(e);
//         currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [{ x, y }] };

//         ctx.beginPath();
//         ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
//         ctx.strokeStyle = color;
//         ctx.lineWidth = size;
//         ctx.lineCap = 'round';
//         ctx.moveTo(x, y);

//         channelRef.current?.trigger('client-stroke-start', { mode, color, size, x: x / canvas.width, y: y / canvas.height });
//     };

//     const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
//         e.preventDefault();
//         if (e.buttons !== 1) return;
//         const canvas = canvasRef.current;
//         const ctx = canvas?.getContext('2d');
//         if (!canvas || !ctx) return;

//         const { x, y } = getPoint(e);
//         currentStrokeRef.current.points.push({ x, y });
//         ctx.lineTo(x, y);
//         ctx.stroke();

//         channelRef.current?.trigger('client-stroke-move', { x: x / canvas.width, y: y / canvas.height });
//     };

//     const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
//         e.preventDefault();
//         historyRef.current.push({ ...currentStrokeRef.current });
//         redoStackRef.current = [];
//         channelRef.current?.trigger('client-stroke-end', {});
//     };

//     // カラーパレットを開く
//     const openColorPicker = () => {
//         colorInputRef.current?.click();
//     };

//     // === UI実装 ===
//     return (
//         // flex-col と h-[100dvh] で画面サイズに完全に追従させる（突き抜け防止）
//         <div className="fixed inset-0 z-50 bg-[#F5F5F5] flex flex-col font-sans select-none overflow-hidden touch-none w-screen h-[100dvh]">

//             {/* エラー表示 (最前面) */}
//             {connectionError && (
//                 <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold text-center py-1 z-[60]">
//                     {connectionError}
//                 </div>
//             )}

//             {/* --- ヘッダー: ロゴとUndo/Redo --- */}
//             <header className="px-6 pt-4 pb-2 flex items-center justify-between flex-none">
//                 {/* ロゴ */}
//                 <div className="flex items-center select-none">
//                     <span className="text-3xl font-extrabold text-[#0F172A] tracking-tighter">RE</span>
//                     <span className="text-3xl font-extrabold text-[#06B6D4] mx-1">:</span>
//                     <span className="text-3xl font-extrabold text-[#0F172A] tracking-tighter">KAI</span>
//                 </div>

//                 {/* 右側: Undo/Redo */}
//                 <div className="flex gap-3">
//                     <button
//                         onClick={performUndo}
//                         className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
//                     >
//                         <RotateCcw size={24} strokeWidth={2.5} />
//                     </button>
//                     <button
//                         onClick={performRedo}
//                         className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50"
//                     >
//                         <RotateCw size={24} strokeWidth={2.5} />
//                     </button>
//                 </div>
//             </header>

//             {/* --- ツールバー行 --- */}
//             <div className="px-6 pb-4 flex items-center gap-4 flex-none relative z-20">

//                 {/* ツールボタン群 */}
//                 <div className="flex gap-3">
//                     {/* 鉛筆 */}
//                     <button
//                         onClick={() => setMode('draw')}
//                         className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 ${mode === 'draw'
//                             ? 'bg-[#4B4B4B] border-[#4B4B4B] text-white'
//                             : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
//                             }`}
//                     >
//                         <Pencil size={24} strokeWidth={2.5} />
//                     </button>

//                     {/* 消しゴム */}
//                     <button
//                         onClick={() => setMode('erase')}
//                         className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 ${mode === 'erase'
//                             ? 'bg-[#4B4B4B] border-[#4B4B4B] text-white'
//                             : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
//                             }`}
//                     >
//                         <Eraser size={24} strokeWidth={2.5} />
//                     </button>

//                     {/* カラーパレットボタン (ブラウザ標準ピッカー起動) */}
//                     <button
//                         onClick={openColorPicker}
//                         className="w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 relative"
//                     >
//                         <Palette size={24} strokeWidth={2.5} style={{ color: color }} />
//                         {/* 隠しカラーインプット */}
//                         <input
//                             ref={colorInputRef}
//                             type="color"
//                             value={color}
//                             onChange={(e) => setColor(e.target.value)}
//                             className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
//                         />
//                     </button>
//                 </div>

//                 {/* スライダーバー */}
//                 <div className="flex items-center bg-[#E5E7EB] rounded-full p-1 pl-1 h-12 shadow-inner relative border border-gray-300 flex-1 max-w-xs">
//                     {/* 左：現在の色プレビュー */}
//                     <button
//                         onClick={openColorPicker}
//                         className="w-10 h-10 rounded-full border-4 border-white shadow-sm relative z-10 shrink-0 transition-transform hover:scale-105"
//                         style={{ backgroundColor: color }}
//                     />

//                     {/* 右：スライダー */}
//                     <div className="flex-1 h-full flex items-center pr-3 relative ml-2">
//                         {/* 実際のinput (透明度なしで表示し、カスタムCSSでスタイル) */}
//                         <input
//                             type="range"
//                             min="1"
//                             max="40"
//                             value={size}
//                             onChange={(e) => setSize(Number(e.target.value))}
//                             className="w-full h-2 bg-[#4B4B4B] rounded-full appearance-none outline-none slider-thumb cursor-pointer"
//                         />
//                         <style jsx>{`
//                             /* スライダーのツマミを大きくして操作しやすくする */
//                             .slider-thumb::-webkit-slider-thumb {
//                                 -webkit-appearance: none;
//                                 appearance: none;
//                                 width: 28px; /* 大きくしました */
//                                 height: 28px; /* 大きくしました */
//                                 background: #ffffff;
//                                 border: 1px solid #d1d5db;
//                                 border-radius: 50%;
//                                 cursor: pointer;
//                                 box-shadow: 0 2px 4px rgba(0,0,0,0.15);
//                             }
//                             .slider-thumb::-moz-range-thumb {
//                                 width: 28px;
//                                 height: 28px;
//                                 background: #ffffff;
//                                 border: 1px solid #d1d5db;
//                                 border-radius: 50%;
//                                 cursor: pointer;
//                                 box-shadow: 0 2px 4px rgba(0,0,0,0.15);
//                             }
//                         `}</style>
//                     </div>
//                 </div>
//             </div>

//             {/* --- キャンバスエリア (flex-1 と min-h-0 で画面内に収める) --- */}
//             <div className="flex-1 w-full px-6 pb-6 min-h-0 overflow-hidden relative z-10">
//                 <div
//                     ref={containerRef}
//                     className="w-full h-full bg-white border-[3px] border-black relative touch-none shadow-sm overflow-hidden"
//                 >
//                     <canvas
//                         ref={canvasRef}
//                         onPointerDown={handlePointerDown}
//                         onPointerMove={handlePointerMove}
//                         onPointerUp={handlePointerUp}
//                         onPointerLeave={handlePointerUp}
//                         className="block w-full h-full touch-none cursor-crosshair"
//                         style={{ touchAction: 'none' }}
//                     />
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default function TabletClient() {
//     return (
//         <Suspense fallback={
//             <div className="fixed inset-0 flex items-center justify-center bg-[#F5F5F5] text-gray-400 font-bold">
//                 LOADING...
//             </div>
//         }>
//             <TabletClientContent />
//         </Suspense>
//     );
// }

'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';
import { Pencil, Eraser, Palette, RotateCcw, RotateCw } from 'lucide-react';

// === 型定義 ===
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

// === メインロジックコンポーネント ===
function TabletClientContent() {
    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<PusherChannel | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);

    // --- State ---
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#3b82f6');
    const [size, setSize] = useState(8);
    const [isConnected, setIsConnected] = useState(false);

    // --- Logic State ---
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);

    // 【通信最適化】送信待ちのポイントを溜めるバッファ
    const pendingPointsRef = useRef<{ x: number, y: number }[]>([]);

    // === ロジック: 再描画 ===
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
    };

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

    // === ロジック: Pusher接続 ===
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        tokenRef.current = token;
        if (!token) return;

        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) return;

        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster,
            authEndpoint: '/api/pusher',
        });

        const channelName = `private-session-${token}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel as unknown as PusherChannel;

        channel.bind('pusher:subscription_succeeded', () => {
            setIsConnected(true);
            channel.trigger('client-tablet-ready', { device: 'tablet' });
            handleResize();
        });

        // 【通信最適化】一定間隔(30ms)ごとに溜まったデータを送信するループ
        const intervalId = setInterval(() => {
            if (pendingPointsRef.current.length > 0 && channelRef.current) {
                // まとめて送信 (Batch Send)
                channelRef.current.trigger('client-stroke-batch', {
                    points: pendingPointsRef.current
                });
                // バッファを空にする
                pendingPointsRef.current = [];
            }
        }, 30); // 30msごとに送信 (秒間約33回)

        const handleResize = () => {
            if (canvasRef.current && containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                redraw();
                channelRef.current?.trigger('client-resize', { width: clientWidth, height: clientHeight });
            }
        };

        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);

        return () => {
            clearInterval(intervalId); // インターバル解除
            window.removeEventListener('resize', handleResize);
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [searchParams]);

    // === ロジック: 描画イベント ===
    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        // 座標補正
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e);
        currentStrokeRef.current = { type: 'stroke', mode, color, size, points: [{ x, y }] };

        // バッファをクリアして開始
        pendingPointsRef.current = [];

        ctx.beginPath();
        ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.moveTo(x, y);

        // 開始イベントは即時送信 (遅延させない)
        channelRef.current?.trigger('client-stroke-start', { mode, color, size, x: x / canvas.width, y: y / canvas.height });
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

        // 【通信最適化】送信はせず、バッファに追加するだけ
        // 座標は相対座標 (0.0~1.0) に変換して保存
        pendingPointsRef.current.push({ x: x / canvas.width, y: y / canvas.height });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();

        // 残っているバッファがあれば送信
        if (pendingPointsRef.current.length > 0 && channelRef.current) {
            channelRef.current.trigger('client-stroke-batch', { points: pendingPointsRef.current });
            pendingPointsRef.current = [];
        }

        historyRef.current.push({ ...currentStrokeRef.current });
        redoStackRef.current = [];
        // 終了イベントも即時送信
        channelRef.current?.trigger('client-stroke-end', {});
    };

    const openColorPicker = () => {
        colorInputRef.current?.click();
    };

    // === UI実装 (そのまま) ===
    return (
        <div className="fixed inset-0 z-50 bg-[#F5F5F5] flex flex-col font-sans select-none overflow-hidden touch-none w-screen h-[100dvh]">
            {/* ヘッダー */}
            <header className="px-6 pt-4 pb-2 flex items-center justify-between flex-none">
                <div className="flex items-center select-none">
                    <span className="text-3xl font-extrabold text-[#0F172A] tracking-tighter">RE</span>
                    <span className="text-3xl font-extrabold text-[#06B6D4] mx-1">:</span>
                    <span className="text-3xl font-extrabold text-[#0F172A] tracking-tighter">KAI</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={performUndo} className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50">
                        <RotateCcw size={24} strokeWidth={2.5} />
                    </button>
                    <button onClick={performRedo} className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-50">
                        <RotateCw size={24} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            {/* ツールバー */}
            <div className="px-6 pb-4 flex items-center gap-4 flex-none relative z-20">
                <div className="flex gap-3">
                    <button onClick={() => setMode('draw')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 ${mode === 'draw' ? 'bg-[#4B4B4B] border-[#4B4B4B] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <Pencil size={24} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setMode('erase')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 ${mode === 'erase' ? 'bg-[#4B4B4B] border-[#4B4B4B] text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        <Eraser size={24} strokeWidth={2.5} />
                    </button>
                    <button onClick={openColorPicker} className="w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm border-2 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 relative">
                        <Palette size={24} strokeWidth={2.5} style={{ color: color }} />
                        <input ref={colorInputRef} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                    </button>
                </div>
                <div className="flex items-center bg-[#E5E7EB] rounded-full p-1 pl-1 h-12 shadow-inner relative border border-gray-300 flex-1 max-w-xs">
                    <div className="flex-1 h-full flex items-center pr-3 relative ml-2">
                        <input type="range" min="1" max="40" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full h-2 bg-[#4B4B4B] rounded-full appearance-none outline-none slider-thumb cursor-pointer" />
                        <style jsx>{`
                            .slider-thumb::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 28px; height: 28px; background: #ffffff; border: 1px solid #d1d5db; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
                            .slider-thumb::-moz-range-thumb { width: 28px; height: 28px; background: #ffffff; border: 1px solid #d1d5db; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
                        `}</style>
                    </div>
                </div>
            </div>

            {/* キャンバス */}
            <div className="flex-1 w-full px-6 pb-6 min-h-0 overflow-hidden relative z-10">
                <div ref={containerRef} className="w-full h-full bg-white border-[3px] border-black relative touch-none shadow-sm overflow-hidden">
                    <canvas ref={canvasRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} className="block w-full h-full touch-none cursor-crosshair" style={{ touchAction: 'none' }} />
                </div>
            </div>
        </div>
    );
}

export default function TabletClient() {
    return (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-[#F5F5F5] text-gray-400 font-bold">LOADING...</div>}>
            <TabletClientContent />
        </Suspense>
    );
}