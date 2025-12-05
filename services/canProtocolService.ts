import { 
    CanFrame, 
    DecodedFrame, 
    MXR_ID_DEFAULT, 
    MODULE_TYPE_FIXED, 
    MONITOR_ADDR, 
    REGISTERS,
    RegisterType,
    ALARM_BITS
} from '../types';

/**
 * Service class equivalent for MXR Protocol.
 * Handles bit-packing and unpacking for CAN frames.
 */
export class CanProtocolService {
    
    /**
     * Constructs the 29-bit Extended Frame ID
     */
    static buildFrameId(dstAddr: number, srcAddr: number = MONITOR_ADDR): number {
        // ID Format:
        // Bit 24-28: MXR_ID (0x15)
        // Bit 16-23: MODULE_TYPE (0x81)
        // Bit 8-15: DSTADDR
        // Bit 0-7: SRCADDR
        
        let id = 0;
        id |= (MXR_ID_DEFAULT & 0x1F) << 24;
        id |= (MODULE_TYPE_FIXED & 0xFF) << 16;
        id |= (dstAddr & 0xFF) << 8;
        id |= (srcAddr & 0xFF);
        
        return id >>> 0; // Ensure unsigned 32-bit integer
    }

    /**
     * Parses a 29-bit ID into its components
     */
    static parseFrameId(id: number) {
        return {
            mxrId: (id >> 24) & 0x1F,
            moduleType: (id >> 16) & 0xFF,
            dstAddr: (id >> 8) & 0xFF,
            srcAddr: id & 0xFF
        };
    }

    /**
     * Generates the 8-byte data payload for a command
     */
    static buildDataPayload(registerAddr: number, value: number, isFloat: boolean): Uint8Array {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);

        // Byte 0-1: Reserved (0x00 0x00)
        view.setUint8(0, 0x00);
        view.setUint8(1, 0x00);

        // Byte 2-3: Register Number (Big Endian)
        view.setUint16(2, registerAddr, false); 

        // Byte 4-7: Data (Big Endian)
        if (isFloat) {
            view.setFloat32(4, value, false);
        } else {
            view.setInt32(4, value, false); // Spec says Signed 32-bit Integer
        }

        return new Uint8Array(buffer);
    }

    /**
     * Decodes an 8-byte payload
     */
    static decodeFrame(id: number, dataBytes: Uint8Array): DecodedFrame {
        const view = new DataView(dataBytes.buffer);
        const idParts = this.parseFrameId(id);

        const returnCode = view.getUint8(0);
        const registerAddr = view.getUint16(2, false); // Big Endian
        
        let decodedValue: string | number = 0;
        let isError = false;
        let errorDescription = "";

        // Determine if this is a response frame based on Return Code (Byte 0)
        // Spec: 00 = Command (from host), F0/F1/F2 = Response (from module)
        const isResponse = [0xF0, 0xF1, 0xF2].includes(returnCode);

        if (isResponse) {
             if (returnCode === 0xF2) {
                 isError = true;
                 errorDescription = "F2: Failure, discard frame";
             } else if (returnCode === 0xF1) {
                 errorDescription = "F1: Forced to default value";
             }
        }

        const registerDef = REGISTERS[registerAddr];

        if (registerDef) {
            // Determine type based on register definition
            // Note: If we are READING a value (Command), the data bytes might be 0 or unconstrained.
            // If we are RECEIVING a value (Response), we parse bytes 4-7.
            
            const isFloat = registerDef.type === RegisterType.READ_ONLY_FLOAT || 
                            registerDef.type === RegisterType.WRITE_ONLY_FLOAT;

            if (isFloat) {
                const val = view.getFloat32(4, false);
                decodedValue = parseFloat(val.toFixed(2)); // Round for display
            } else {
                const val = view.getInt32(4, false);
                decodedValue = val;

                // Decode Enums/Bitmaps if defined
                if (registerDef.options && registerDef.options[val]) {
                    decodedValue = `${val} (${registerDef.options[val]})`;
                } else if (registerDef.address === 0x0100) {
                     // Decode Alarm Bitmap
                     const alarms = [];
                     for(let i=0; i<32; i++) {
                         if ((val >> i) & 1) {
                             alarms.push(ALARM_BITS[i]);
                         }
                     }
                     decodedValue = alarms.length > 0 ? alarms.join(", ") : "No Alarms";
                }
            }
        } else {
             // Unknown register, try to guess or just show hex
             decodedValue = `Unknown Reg: 0x${view.getUint32(4, false).toString(16).toUpperCase()}`;
        }

        return {
            ...idParts,
            register: registerAddr,
            rawPayloadHex: Array.from(dataBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
            decodedValue,
            isError,
            errorDescription
        };
    }

    /**
     * Helper to create a Hex String representation of a frame
     */
    static frameToDisplayString(frame: CanFrame): string {
        const idHex = frame.id.toString(16).toUpperCase().padStart(8, '0');
        const dataHex = Array.from(frame.data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        return `ID: 0x${idHex}  DATA: ${dataHex}`;
    }
}