import React, { useState, useEffect } from 'react';
import { 
    CanFrame, 
    REGISTERS, 
    RegisterType, 
    MXR_ID_DEFAULT, 
    MODULE_TYPE_FIXED, 
    DecodedFrame,
    MONITOR_ADDR 
} from './types';
import { CanProtocolService } from './services/canProtocolService';
import { ByteGrid } from './components/ByteGrid';
import { HexInput } from './components/HexInput';

const App: React.FC = () => {
    // --- State for Command Generator ---
    const [targetAddr, setTargetAddr] = useState<number>(1);
    const [selectedRegAddr, setSelectedRegAddr] = useState<string>("0x0410");
    const [inputValue, setInputValue] = useState<string>("0");
    const [generatedFrame, setGeneratedFrame] = useState<CanFrame | null>(null);

    // --- State for Decoder ---
    const [rawHexInput, setRawHexInput] = useState<string>("");
    const [decodedResult, setDecodedResult] = useState<DecodedFrame | null>(null);

    // --- Effect: Auto-generate frame when inputs change ---
    useEffect(() => {
        const regAddrInt = parseInt(selectedRegAddr, 16);
        const register = REGISTERS[regAddrInt];
        
        if (!register) return;

        let numValue = 0;
        const isFloat = register.type === RegisterType.WRITE_ONLY_FLOAT || register.type === RegisterType.READ_ONLY_FLOAT;

        if (isFloat) {
            numValue = parseFloat(inputValue);
            if (isNaN(numValue)) numValue = 0.0;
        } else {
            numValue = parseInt(inputValue, 10);
            if (isNaN(numValue)) numValue = 0;
        }

        // If it's a "Read Only" register we are generating a command for, 
        // the spec usually implies reading data (Data = 0 or unconstrained).
        // However, if we are simulating sending a WRITE command, we use the input value.
        // For READ commands (like 0x0001 Output Voltage), the Data field in the REQUEST is usually 0 or ignored.
        // The spec example 2 shows reading uses data 00000000 except register number.
        // But the user might want to simulate a RESPONSE frame too.
        // Let's assume Generator is primarily for HOST -> MODULE commands.
        
        // If the selected register is READ_ONLY, we are effectively asking to READ it.
        // In the read request (Example 2), the data payload (bytes 4-7) is 0.
        // If it is WRITE_ONLY, we use the value.
        
        const isReadRequest = register.type === RegisterType.READ_ONLY_FLOAT || register.type === RegisterType.READ_ONLY_INT;
        const payloadValue = isReadRequest ? 0 : numValue;

        const id = CanProtocolService.buildFrameId(targetAddr);
        const data = CanProtocolService.buildDataPayload(regAddrInt, payloadValue, isFloat && !isReadRequest);

        setGeneratedFrame({ id, data });

    }, [targetAddr, selectedRegAddr, inputValue]);

    // --- Handler: Decode Raw Hex ---
    const handleDecode = () => {
        // Expected format: "1581A002 F0000001442F0000" or similar
        // Clean string
        const clean = rawHexInput.replace(/\s+/g, '').replace(/0x/g, '');
        
        if (clean.length < 8 + 16) {
            // Basic validation: needs ID (8 chars) + Data (16 chars) roughly
            // Let's try to parse liberally.
        }

        try {
            // Assume first 8 chars are ID, next 16 are Data
            const idHex = clean.substring(0, 8);
            const dataHex = clean.substring(8, 24);

            if (idHex.length !== 8 || dataHex.length !== 16) {
                throw new Error("Invalid Length. Format: ID(8 chars) DATA(16 chars)");
            }

            const id = parseInt(idHex, 16);
            const dataBytes = new Uint8Array(dataHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

            const decoded = CanProtocolService.decodeFrame(id, dataBytes);
            setDecodedResult(decoded);
        } catch (e) {
            setDecodedResult(null);
            alert("Decode Error: " + (e as Error).message);
        }
    };

    // Helper for register dropdown
    const registerOptions = Object.values(REGISTERS).map(reg => ({
        label: `[0x${reg.address.toString(16).padStart(4, '0').toUpperCase()}] ${reg.name}`,
        value: `0x${reg.address.toString(16).padStart(4, '0')}`,
        type: reg.type
    }));

    return (
        <div className="min-h-screen p-6 font-sans selection:bg-accent selection:text-white">
            <header className="mb-8 border-b border-industrial-700 pb-4">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    <span className="text-accent">MXR</span> Protocol Tool
                </h1>
                <p className="text-industrial-500 mt-2 text-sm">
                    MXR100080B-DCs Charging Module CAN Interface
                </p>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* --- Left Column: Command Generator --- */}
                <section className="bg-industrial-800 rounded-xl border border-industrial-700 p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-accent"></div>
                            Command Generator
                        </h2>
                        <span className="text-xs font-mono bg-industrial-900 px-2 py-1 rounded text-industrial-500">HOST → MODULE</span>
                    </div>

                    <div className="space-y-6">
                        {/* Target Address */}
                        <div>
                            <label className="block text-xs font-mono text-industrial-500 uppercase mb-2">Target Module Address (Hex)</label>
                            <div className="flex gap-4">
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="99" 
                                    value={targetAddr}
                                    onChange={(e) => setTargetAddr(parseInt(e.target.value) || 0)}
                                    className="bg-industrial-900 border border-industrial-600 rounded p-2 w-24 text-center font-mono focus:border-accent outline-none"
                                />
                                <div className="text-sm self-center text-gray-500">
                                    0x{targetAddr.toString(16).padStart(2,'0').toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Register Selection */}
                        <div>
                             <label className="block text-xs font-mono text-industrial-500 uppercase mb-2">Operation / Register</label>
                             <select 
                                value={selectedRegAddr}
                                onChange={(e) => {
                                    setSelectedRegAddr(e.target.value);
                                    setInputValue("0"); // Reset input on change
                                }}
                                className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 font-mono text-sm focus:border-accent outline-none appearance-none"
                             >
                                <optgroup label="Controls (Write)">
                                    {registerOptions.filter(r => (r.type as string).includes('WRITE')).map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Read Telemetry">
                                    {registerOptions.filter(r => (r.type as string).includes('READ')).map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </optgroup>
                             </select>
                        </div>

                        {/* Value Input (Conditional) */}
                        <div className={`transition-opacity ${(REGISTERS[parseInt(selectedRegAddr,16)]?.type as string).includes('READ') ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                             <label className="block text-xs font-mono text-industrial-500 uppercase mb-2">
                                 Set Value {REGISTERS[parseInt(selectedRegAddr,16)]?.unit ? `(${REGISTERS[parseInt(selectedRegAddr,16)]?.unit})` : ''}
                             </label>
                             {REGISTERS[parseInt(selectedRegAddr,16)]?.options ? (
                                 <select
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 text-sm focus:border-accent outline-none"
                                 >
                                     {Object.entries(REGISTERS[parseInt(selectedRegAddr,16)].options!).map(([key, val]) => (
                                         <option key={key} value={key}>{val}</option>
                                     ))}
                                 </select>
                             ) : (
                                <input 
                                    type="number"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="w-full bg-industrial-900 border border-industrial-600 rounded p-2 font-mono focus:border-accent outline-none"
                                />
                             )}
                             {(REGISTERS[parseInt(selectedRegAddr,16)]?.type as string).includes('READ') && (
                                 <p className="text-[10px] text-accent mt-1">* Read commands send 0 data payload</p>
                             )}
                        </div>

                        {/* Generated Frame Output */}
                        {generatedFrame && (
                            <div className="bg-industrial-900 rounded-lg p-4 border border-industrial-700 mt-8">
                                <div className="flex justify-between items-end mb-4">
                                    <span className="text-xs text-accent font-bold uppercase tracking-wider">Generated CAN Frame</span>
                                    <span className="text-xs font-mono text-gray-500">Length: 8 Bytes</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="p-2 bg-black bg-opacity-20 rounded">
                                        <div className="text-[10px] text-gray-500 uppercase">Frame ID (29-bit)</div>
                                        <div className="font-mono text-xl text-yellow-500">0x{generatedFrame.id.toString(16).toUpperCase().padStart(8,'0')}</div>
                                    </div>
                                    <div className="col-span-2 p-2 bg-black bg-opacity-20 rounded">
                                        <div className="text-[10px] text-gray-500 uppercase">Payload (Hex)</div>
                                        <div className="font-mono text-xl text-green-400">
                                            {Array.from(generatedFrame.data).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ')}
                                        </div>
                                    </div>
                                </div>

                                <ByteGrid data={generatedFrame.data} label="Payload Structure" />
                            </div>
                        )}
                    </div>
                </section>

                {/* --- Right Column: Frame Decoder --- */}
                <section className="bg-industrial-800 rounded-xl border border-industrial-700 p-6 shadow-xl">
                     <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success"></div>
                            Frame Decoder
                        </h2>
                        <span className="text-xs font-mono bg-industrial-900 px-2 py-1 rounded text-industrial-500">ANY → ANY</span>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs font-mono text-industrial-500 uppercase">Paste CAN Frame (ID + Data)</label>
                                <button 
                                    onClick={() => setRawHexInput("1581A002 F0000001442F0000")} // Example 2 Response
                                    className="text-[10px] text-accent hover:underline cursor-pointer"
                                >
                                    Load Example (Read 700V)
                                </button>
                            </div>
                            <textarea 
                                value={rawHexInput}
                                onChange={(e) => setRawHexInput(e.target.value)}
                                placeholder="e.g. 1581A002 F0000001442F0000"
                                className="w-full h-24 bg-industrial-900 border border-industrial-600 rounded p-3 font-mono text-sm focus:border-success outline-none resize-none"
                            />
                            <button 
                                onClick={handleDecode}
                                className="w-full bg-industrial-700 hover:bg-industrial-600 text-white font-semibold py-2 rounded transition-colors"
                            >
                                Decode Frame
                            </button>
                        </div>

                        {decodedResult && (
                             <div className="bg-industrial-900 rounded-lg p-4 border border-industrial-700 animate-fade-in">
                                 <div className="mb-4 pb-2 border-b border-industrial-700 flex justify-between items-center">
                                     <span className="text-xs text-success font-bold uppercase tracking-wider">Decoded Result</span>
                                     {decodedResult.isError && <span className="text-xs bg-red-900 text-red-200 px-2 rounded">Error Frame</span>}
                                 </div>

                                 <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                     <div>
                                         <span className="block text-xs text-gray-500">From (Source)</span>
                                         <span className="font-mono">0x{decodedResult.srcAddr.toString(16).toUpperCase()}</span>
                                     </div>
                                     <div>
                                         <span className="block text-xs text-gray-500">To (Dest)</span>
                                         <span className="font-mono">0x{decodedResult.dstAddr.toString(16).toUpperCase()}</span>
                                     </div>
                                     <div>
                                         <span className="block text-xs text-gray-500">Register</span>
                                         <span className="font-mono text-accent">
                                             0x{decodedResult.register.toString(16).padStart(4,'0').toUpperCase()}
                                         </span>
                                         <div className="text-xs text-gray-400">{REGISTERS[decodedResult.register]?.name || "Unknown"}</div>
                                     </div>
                                     <div>
                                         <span className="block text-xs text-gray-500">Value</span>
                                         <span className="font-mono text-lg text-white font-bold">
                                             {decodedResult.decodedValue} 
                                             <span className="text-xs text-gray-500 ml-1 font-normal">
                                                {REGISTERS[decodedResult.register]?.unit}
                                             </span>
                                         </span>
                                     </div>
                                 </div>

                                 {decodedResult.isError && (
                                     <div className="p-2 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-xs">
                                         {decodedResult.errorDescription}
                                     </div>
                                 )}
                             </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Reference Table */}
            <footer className="mt-12 text-industrial-500 text-xs">
                <div className="bg-industrial-800 p-4 rounded-lg border border-industrial-700">
                    <h3 className="font-bold mb-2 uppercase tracking-wide">Protocol Specs Quick Ref</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <span className="block text-gray-400">Baud Rate</span>
                            125 kbps
                        </div>
                        <div>
                            <span className="block text-gray-400">Byte Order</span>
                            Big Endian (Motorola)
                        </div>
                        <div>
                            <span className="block text-gray-400">MXR ID</span>
                            0x{MXR_ID_DEFAULT.toString(16).toUpperCase()} (Default)
                        </div>
                        <div>
                            <span className="block text-gray-400">Monitor Addr</span>
                            0x{MONITOR_ADDR.toString(16).toUpperCase()}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;