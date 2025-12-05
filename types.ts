export enum RegisterType {
    READ_ONLY_FLOAT = 'READ_ONLY_FLOAT',
    READ_ONLY_INT = 'READ_ONLY_INT',
    WRITE_ONLY_FLOAT = 'WRITE_ONLY_FLOAT',
    WRITE_ONLY_INT = 'WRITE_ONLY_INT',
}

export interface RegisterDefinition {
    address: number;
    name: string;
    type: RegisterType;
    unit?: string;
    description: string;
    options?: Record<number, string>; // For enums like status
}

export interface CanFrame {
    id: number;
    data: Uint8Array; // 8 bytes
}

export interface DecodedFrame {
    mxrId: number;
    moduleType: number;
    dstAddr: number;
    srcAddr: number;
    register: number;
    rawPayloadHex: string;
    decodedValue: string | number;
    isError: boolean;
    errorDescription?: string;
}

// Fixed Protocol Constants
export const MXR_ID_DEFAULT = 0x15;
export const MODULE_TYPE_FIXED = 0x81;
export const MONITOR_ADDR = 0xA0;
export const BROADCAST_ADDR = 0xFF;

// Register Map based on Spec
export const REGISTERS: Record<number, RegisterDefinition> = {
    0x0001: { address: 0x0001, name: "Output Voltage", type: RegisterType.READ_ONLY_FLOAT, unit: "V", description: "Current output voltage" },
    0x0002: { address: 0x0002, name: "Output Current", type: RegisterType.READ_ONLY_FLOAT, unit: "A", description: "Current output current" },
    0x0004: { address: 0x0004, name: "Input Voltage", type: RegisterType.READ_ONLY_FLOAT, unit: "V", description: "AC Input voltage" },
    0x0006: { address: 0x0006, name: "Inlet Temp", type: RegisterType.READ_ONLY_FLOAT, unit: "°C", description: "Air inlet temperature" },
    0x0100: { address: 0x0100, name: "Alarm Info", type: RegisterType.READ_ONLY_INT, description: "Bitmap of alarms (See Table 2.1)" },
    0x0101: { 
        address: 0x0101, 
        name: "Status", 
        type: RegisterType.READ_ONLY_INT, 
        description: "Operating status",
        options: {
            0x0000: "Power-on default",
            0x0001: "Initialization",
            0x0002: "Fault",
            0x0003: "Standby",
            0x0004: "Start Delay / Relay Action",
            0x0006: "Soft Start",
            0x0007: "Running"
        }
    },
    0x0110: { address: 0x0110, name: "ON/OFF Status", type: RegisterType.READ_ONLY_INT, description: "0=Start, 1=Stop" },
    0x0400: { 
        address: 0x0400, 
        name: "Control Command", 
        type: RegisterType.WRITE_ONLY_INT, 
        description: "Set Startup/Shutdown",
        options: {
            0: "Startup (0x00)",
            1: "Shutdown (0x01)"
        }
    },
    0x0410: { address: 0x0410, name: "Set Output Voltage", type: RegisterType.WRITE_ONLY_FLOAT, unit: "V", description: "Target voltage setting" },
    0x0411: { address: 0x0411, name: "Set Output Current", type: RegisterType.WRITE_ONLY_FLOAT, unit: "A", description: "Target current limit" },
    0x0301: { address: 0x0301, name: "Troubleshooting", type: RegisterType.WRITE_ONLY_INT, description: "Clear Faults: 1=Enable" },
};

export const ALARM_BITS: string[] = [
    "Input Overvoltage", "Input Undervoltage", "Output Overvoltage", "Output Undervoltage",
    "Input Ext Overvoltage", "Input Ext Undervoltage", "Output Ext Overvoltage", "Output Ext Undervoltage",
    "Inlet Temp Low", "Reserved", "Internal OverTemp 1", "Internal OverTemp 2",
    "Inlet OverTemp", "Ref Voltage 1 Abnormal", "Ref Voltage 2 Abnormal", "Fan Failure",
    "Input Fast Overvolt", "Output Fast Overvolt", "Overcurrent Protection", "Emergency Stop",
    "CAN Comm Failure", "CAN Bus Fault", "Reserved", "Reserved",
    "Overvolt Disconnect", "Reserved", "Output Short Circuit", "Reserved",
    "Reserved", "Reserved", "Module Lockup", "Reserved"
];