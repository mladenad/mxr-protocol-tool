import React from 'react';

interface ByteGridProps {
    data: Uint8Array;
    label?: string;
}

export const ByteGrid: React.FC<ByteGridProps> = ({ data, label }) => {
    return (
        <div className="flex flex-col gap-1">
            {label && <span className="text-xs text-industrial-500 font-mono uppercase tracking-wider">{label}</span>}
            <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 8 }).map((_, i) => {
                    const byteVal = data[i] !== undefined ? data[i] : 0;
                    return (
                        <div key={i} className="flex flex-col items-center">
                            <div className={`
                                w-full aspect-square flex items-center justify-center 
                                font-mono text-sm border rounded 
                                ${i < 2 ? 'border-industrial-600 bg-industrial-800 text-gray-500' : 
                                  i < 4 ? 'border-accent border-opacity-50 bg-accent bg-opacity-10 text-accent' : 
                                  'border-success border-opacity-50 bg-success bg-opacity-10 text-success'}
                            `}>
                                {byteVal.toString(16).toUpperCase().padStart(2, '0')}
                            </div>
                            <span className="text-[10px] text-gray-600 mt-1">{i}</span>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 px-1">
                <span>Rsrv</span>
                <span>Reg</span>
                <span>Data Value (Big Endian)</span>
            </div>
        </div>
    );
};