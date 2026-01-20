/**
 * Downsamples audio buffer to target sample rate
 */
export const downsample = (buffer: Float32Array, inputRate: number, outputRate: number): Float32Array => {
    if (outputRate === inputRate) {
        return buffer;
    }

    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < newLength) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        // Use average value between samples to prevent aliasing (simple linear interpolation used here effectively)
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0; // Simple averaging
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }

    return result;
};

/**
 * Converts Float32Array (range -1 to 1) to Int16Array (PCM)
 */
export const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
        // Clamp to [-1, 1]
        let s = Math.max(-1, Math.min(1, buffer[l]));
        // Scale to Int16 range
        buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buf;
};
