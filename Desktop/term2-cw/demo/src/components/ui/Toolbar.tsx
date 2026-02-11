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

    const btnClass = "flex items-center justify-center p-3 rounded-xl transition-all shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-95";
    const activeBtnClass = "flex items-center justify-center p-3 rounded-xl transition-all bg-[#3c3c3c] text-white shadow-md transform scale-105 border border-[#3c3c3c]";

    return (
        <div className="absolute top-16 left-0 right-0 px-4 flex items-center justify-between gap-2 pointer-events-none">
            {/* Left Tools: Pen, Eraser, Settings */}
            <div className="flex items-center gap-2 pointer-events-auto">
                {/* Pen Tool */}
                <button
                    onClick={() => setMode('draw')}
                    className={mode === 'draw' ? activeBtnClass : btnClass + " bg-white text-[#3c3c3c]"}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                        <path d="M2 2l7.586 7.586"></path>
                        <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                </button>

                {/* Eraser Tool */}
                <button
                    onClick={() => setMode('erase')}
                    className={mode === 'erase' ? activeBtnClass : btnClass + " bg-white text-[#3c3c3c]"}
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
                        className={btnClass + " bg-white text-[#3c3c3c]"}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        {/* Current Color Indicator dot */}
                        <div
                            className="absolute top-2 right-2 w-3 h-3 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: color }}
                        />
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

            {/* Middle: Size Slider */}
            <div className="flex-1 max-w-xs mx-4 pointer-events-auto bg-[#3c3c3c] rounded-full p-2 px-4 shadow-md flex items-center h-12">
                <div className="w-full relative h-6 flex items-center hover:bg-white/10 rounded-full transition-colors">
                    {/* Track Background */}
                    <div className="absolute inset-0 h-full rounded-full bg-[#5f5f5f]"></div>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={size}
                        onChange={(e) => setSize(parseInt(e.target.value, 10))}
                        className="w-full h-full appearance-none bg-transparent cursor-pointer z-10 relative
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:hover:scale-110
                        [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
                         focus:outline-none"
                        style={{
                            background: `linear-gradient(to right, #6da5ff 0%, #6da5ff ${(size / 20) * 100}%, transparent ${(size / 20) * 100}%, transparent 100%)`,
                            borderRadius: '9999px',
                            height: '100%'
                        }}

                    />
                </div>
            </div>

            {/* Right: Undo / Redo */}
            <div className="flex items-center gap-2 pointer-events-auto">
                <button
                    onClick={onUndo}
                    className={btnClass + " bg-white text-[#3c3c3c]"}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6"></path>
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                    </svg>
                </button>
                <button
                    onClick={onRedo}
                    className={btnClass + " bg-white text-[#3c3c3c]"}
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
