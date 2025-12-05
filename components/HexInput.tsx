import React from 'react';

interface HexInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    label: string;
}

export const HexInput: React.FC<HexInputProps> = ({ value, onChange, placeholder, label }) => {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-industrial-500 font-mono uppercase">{label}</label>
            <input 
                type="text" 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="bg-industrial-800 border border-industrial-600 rounded p-2 font-mono text-sm focus:border-accent focus:outline-none transition-colors w-full"
                spellCheck={false}
            />
        </div>
    );
};