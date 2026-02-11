'use client';

import React, { useEffect, useRef, useState } from 'react';
import Toolbar from './ui/Toolbar'; // パスが合っているか確認してください
import Pusher from 'pusher-js';
import { useSearchParams } from 'next/navigation';

// 型定義
interface Stroke {
    type: string;
    mode: string;
    color?: string;
    size?: number;
    points: { x: number; y: number }[];
}

// Pusherのチャンネル型（簡易定義）
interface PusherChannel {
    trigger: (eventName: string, data: any) => void;
    bind: (eventName: string, callback: any) => void;
    unbind_all: () => void;
}

export default function TabletClient() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<PusherChannel | null>(null);

    // State
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(2);
    const [isConnected, setIsConnected] = useState(false);
    const [showOrientationModal, setShowOrientationModal] = useState(true);

    // 描画用の状態管理
    const currentStrokeRef = useRef<Stroke>({ type: 'stroke', mode: 'draw', points: [] });
    const historyRef = useRef<Stroke[]>([]);
    const redoStackRef = useRef<Stroke[]>([]);
    const tokenRef = useRef<string | null>(null);
    const [lastSentEvent, setLastSentEvent] = useState<string>('');

    // === ヘルパー関数: 再描画 ===
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

        // 現在の設定に戻す
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
    };

    // === Undo / Redo ===
    const performUndo = () => {
        if (historyRef.current.length === 0) return;
        const stroke = historyRef.current.pop();
        if (stroke) redoStackRef.current.push(stroke);
        redraw();

        // PCに通知
        channelRef.current?.trigger('client-undo', {});
    };

    const performRedo = () => {
        if (redoStackRef.current.length === 0) return;
        const stroke = redoStackRef.current.pop();
        if (stroke) historyRef.current.push(stroke);
        redraw();

        // PCに通知
        channelRef.current?.trigger('client-redo', {});
    };

    // === 初期化 (Pusher接続) ===
    const searchParams = useSearchParams(); // Hook call moved to top level

    useEffect(() => {
        // 1. URLからトークンを取得
        const token = searchParams.get('token');
        tokenRef.current = token;

        if (!token) {
            // トークンがない場合
        } else {
            // Only proceed with pusher if token exists

            // 2. Pusherのセットアップ
            const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
            const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

            if (!pusherKey || !pusherCluster) {
                console.error("Pusher Env Vars missing", { pusherKey, pusherCluster });
                return;
            }

            const pusher = new Pusher(pusherKey, {
                cluster: pusherCluster,
                authEndpoint: '/api/pusher', // 自作した認証API
            });

            // 3. チャンネルに参加 (private-session-トークン)
            const channelName = `private-session-${token}`;
            const channel = pusher.subscribe(channelName);

            // 型キャスト (TSエラー回避)
            channelRef.current = channel as unknown as PusherChannel;

            // 4. 接続成功時の処理
            channel.bind('pusher:subscription_succeeded', () => {
                console.log('Connected to Pusher!');
                setIsConnected(true);
                setLastSentEvent('Subscribed');

                // PCに「準備完了」を伝える
                channel.trigger('client-tablet-ready', { device: 'tablet' });

                // 画面サイズを送ってPC側のCanvasサイズを合わせる（任意）
                channel.trigger('client-resize', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            });

            channel.bind('pusher:subscription_error', (status: any) => {
                console.error('Pusher Subscription Error', status);
                setLastSentEvent(`Sub Error: ${JSON.stringify(status)}`);
            });

            // 5. リサイズ処理
            const handleResize = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                    redraw();

                    // PCにも通知
                    channelRef.current?.trigger('client-resize', {
                        width: window.innerWidth,
                        height: window.innerHeight
                    });
                }
            };

            window.addEventListener('resize', handleResize);
            handleResize(); // 初回実行

            // タッチスクロール防止
            const canvas = canvasRef.current;
            const preventDefault = (e: Event) => e.preventDefault();
            if (canvas) {
                canvas.addEventListener('touchstart', preventDefault, { passive: false });
                canvas.addEventListener('touchmove', preventDefault, { passive: false });
            }

            // クリーンアップ
            return () => {
                window.removeEventListener('resize', handleResize);
                if (canvas) {
                    canvas.removeEventListener('touchstart', preventDefault);
                    canvas.removeEventListener('touchmove', preventDefault);
                }
                pusher.unsubscribe(channelName);
                pusher.disconnect();
            };
        }
    }, [searchParams]); // Add searchParams to dependency array

    // === 描画イベントハンドラ ===

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // 自分の画面に描く
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
        ctx.lineCap = 'round'; // 角を丸くする
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

        // PCに送信 (正規化して送る: 0.0〜1.0)
        channelRef.current?.trigger('client-stroke-start', {
            mode,
            color,
            size,
            x: e.nativeEvent.offsetX / canvas.width,
            y: e.nativeEvent.offsetY / canvas.height
        });
        setLastSentEvent('Start');
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.buttons !== 1) return; // 押されてなければ無視
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // 自分の画面に描く
        currentStrokeRef.current.points.push({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();

        // PCに送信
        channelRef.current?.trigger('client-stroke-move', {
            x: e.nativeEvent.offsetX / canvas.width,
            y: e.nativeEvent.offsetY / canvas.height
        });
    };

    const handlePointerUp = () => {
        // 履歴に保存
        historyRef.current.push({ ...currentStrokeRef.current });
        redoStackRef.current = [];

        // PCに送信
        channelRef.current?.trigger('client-stroke-end', {});
        setLastSentEvent('End');
    };

    return (
        <div className="fixed inset-0 bg-white touch-none overflow-hidden">
            {/* Header / Logo Area */}
            <div className="absolute top-0 left-0 right-0 p-3 z-50 flex items-center justify-between pointer-events-none">
                <img src="/logo.png" alt="RE:KAI" className="h-5 object-contain pointer-events-auto" />

                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Connection Status Indicator */}
                    <div className={`flex items-center gap-2 text-[10px] font-bold transition-all duration-300 ${isConnected ? 'text-green-600 bg-green-50 border border-green-200' : 'text-slate-400 bg-slate-50 border border-slate-200'} rounded-full px-3 py-1 shadow-sm`}>
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                        {isConnected ? 'Connected' : (tokenRef.current ? 'Connecting...' : 'No Token')}
                    </div>

                    {/* Resend Signal Button (Only if not connected or to force sync) */}
                    <button
                        onClick={() => {
                            if (channelRef.current) {
                                channelRef.current.trigger('client-tablet-ready', { device: 'tablet', force: true });
                                setLastSentEvent('Resent Ready Signal');
                            }
                        }}
                        className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm active:scale-95 transition-transform hover:bg-blue-600"
                    >
                        再接続信号を送る
                    </button>
                </div>
            </div>

            <div className="absolute inset-x-4 bottom-4 top-20 border-2 border-slate-800 rounded-lg overflow-hidden bg-white shadow-sm">
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    // ポインターが外れた時もUp扱いにする
                    onPointerLeave={handlePointerUp}
                    className="block w-full h-full touch-none"
                />
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

            {/* Orientation Modal (変更なし) */}
            {showOrientationModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowOrientationModal(false)}>
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-8">
                            <p className="text-slate-600 leading-relaxed font-medium">
                                縦・横どちらでも利用することができます。<br />
                                お好きなスタイルでご利用ください。
                            </p>
                        </div>

                        <div className="relative h-40 flex items-center justify-center">
                            {/* SVGアイコン部分は長いので省略しますが、元のままでOKです */}
                            <div className="w-16 h-28 border-4 border-slate-300 rounded-xl relative">
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-200 rounded-full"></div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowOrientationModal(false)}
                            className="w-full mt-6 py-3 bg-[#58cc02] text-white font-bold rounded-xl shadow-lg hover:bg-[#46a302] transition-transform active:scale-95"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}