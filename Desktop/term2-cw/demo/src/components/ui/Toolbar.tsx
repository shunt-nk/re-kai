import React from 'react';

interface ToolbarProps {
    mode: 'draw' | 'erase';
    setMode: (mode: 'draw' | 'erase') => void;
    color: string;
    setColor: (color: string) => void;
    size: number;
    setSize: (size: number) => void;
    onUndo: () => void;
    onRedo: () => void;
}

export default function Toolbar({
    mode,
    setMode,
    color,
    setColor,
    size,
    setSize,
    onUndo,
    onRedo
}: ToolbarProps) {
    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-white/95 backdrop-blur shadow-xl border border-slate-200 p-4 rounded-2xl z-50 overflow-x-auto max-w-full">
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                    onClick={() => setMode('draw')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'draw' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    ペン
                </button>
                <button
                    onClick={() => setMode('erase')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'erase' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    消しゴム
                </button>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-3">
                <div className="relative">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 border-white shadow-sm ring-1 ring-slate-200"
                    />
                </div>

                <div className="flex flex-col w-24 gap-1">
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={size}
                        onChange={(e) => setSize(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-[10px] text-slate-400 text-center font-bold">太さ: {size}px</span>
                </div>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex gap-2">
                <button
                    onClick={onUndo}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                    </svg>
                </button>
                <button
                    onClick={onRedo}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 7v6h-6" />
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
