import React, { useRef } from 'react';

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
    const colorInputRef = useRef<HTMLInputElement>(null);

    const triggerColorPicker = () => {
        colorInputRef.current?.click();
    };

    const btnClass = "flex items-center justify-center w-12 h-12 rounded-lg transition-all shadow-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95";
    const activeBtnClass = "flex items-center justify-center w-12 h-12 rounded-lg transition-all shadow-md border border-gray-700 bg-gray-700 text-white transform scale-105";

    return (
        <div className="absolute top-16 left-0 right-0 px-6 flex items-center justify-between gap-4 pointer-events-none">
            {/* Left Tools: Pen, Eraser, Settings */}
            <div className="flex items-center gap-3 pointer-events-auto">
                {/* Pen Tool */}
                <button
                    onClick={() => setMode('draw')}
                    className={mode === 'draw' ? activeBtnClass : btnClass}
                    aria-label="Pen"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                    </svg>
                </button>

                {/* Eraser Tool */}
                <button
                    onClick={() => setMode('erase')}
                    className={mode === 'erase' ? activeBtnClass : btnClass}
                    aria-label="Eraser"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"></path>
                        <line x1="18" y1="13" x2="18.01" y2="13"></line>
                    </svg>
                </button>

                {/* Settings / Color Picker */}
                <div className="relative">
                    <button
                        onClick={triggerColorPicker}
                        className={btnClass}
                        aria-label="Settings"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <input
                        ref={colorInputRef}
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-0 h-0 overflow-hidden"
                        style={{ visibility: 'hidden' }}
                    />
                </div>
            </div>

            {/* Middle: Capsule Slider */}
            <div className="flex-1 max-w-sm mx-4 pointer-events-auto h-12 bg-white rounded-full p-1 shadow-sm border border-slate-200 flex items-center relative">
                {/* Color Indicator (Left) */}
                <div
                    className="h-10 w-10 rounded-full border border-slate-100 flex-shrink-0 ml-0.5 shadow-inner"
                    style={{ backgroundColor: color }}
                ></div>

                {/* Size Bar (Right) */}
                <div className="flex-1 mx-3 h-2 bg-slate-100 rounded-full relative overflow-hidden">
                    <div
                        className="absolute top-0 left-0 bottom-0 bg-slate-800 rounded-full"
                        style={{ width: `${(size / 20) * 100}%` }}
                    />
                </div>

                {/* Invisible Range Input Overlay */}
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value, 10))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>

            {/* Right: Undo / Redo */}
            <div className="flex items-center gap-3 pointer-events-auto">
                <button
                    onClick={onUndo}
                    className={btnClass}
                    aria-label="Undo"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6"></path>
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                    </svg>
                </button>
                <button
                    onClick={onRedo}
                    className={btnClass}
                    aria-label="Redo"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 7v6h-6"></path>
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
}
