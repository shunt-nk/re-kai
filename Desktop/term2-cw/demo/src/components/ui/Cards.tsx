import React from 'react';
import Link from 'next/link';

export const Badge = ({ children, color = 'bg-slate-100 text-slate-600' }: { children: React.ReactNode, color?: string }) => (
    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${color}`}>
        {children}
    </span>
);

export const UnitCard = ({ unit, onClick }: { unit: any, onClick?: () => void }) => {
    // Generate distinct colors based on ID for demo
    const colorClass = unit.subject === '数学' ? 'bg-[#58cc02] border-[#46a302]'
        : unit.subject === '物理' ? 'bg-[#ce82ff] border-[#a568cc]'
            : 'bg-[#ff4b4b] border-[#ea2b2b]';

    return (
        <Link href={`/unit/${unit.id}`} className="block group">
            <div className={`
                border-2 border-b-4 border-[#e5e5e5] rounded-2xl p-6 h-full 
                transition-all active:border-b-2 active:translate-y-[2px] 
                hover:bg-[#f7f7f7] cursor-pointer bg-white relative
            `}>
                <div className={`absolute top-6 right-6 px-3 py-1 rounded-lg text-white font-extrabold text-xs uppercase ${colorClass.split(' ')[0]}`}>
                    {unit.subject}
                </div>

                <h3 className="text-xl font-extrabold text-[#3c3c3c] mb-2 mt-2">
                    {unit.title}
                </h3>
                <p className="text-[#777777] font-bold text-sm mb-6">
                    12問
                </p>

                <div className={`w-full py-3 rounded-xl font-extrabold text-center uppercase tracking-wider text-sm border-b-4 ${colorClass} text-white`}>
                    スタート
                </div>
            </div>
        </Link>
    );
};
