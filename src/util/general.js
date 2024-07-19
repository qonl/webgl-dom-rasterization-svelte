export const glSupported = () => {
    if (typeof window === 'undefined') return false; // Check if running in a browser environment

    // Check https://github.com/AnalyticalGraphicsInc/webglreport for more detailed compatibility tests
    const supported = Boolean(window.WebGLRenderingContext || window.WebGL2RenderingContext);
    if (!supported) {
        console.warn('WebGL is not supported on this device. Skipping 3D.'); // eslint-disable-line no-console
    }
    return supported;
};

export const BASE_UNIFORMS = {
    u_resolution: {
        value: {
            x: typeof window !== 'undefined' ? 400 * window.devicePixelRatio : 400,
            y: typeof window !== 'undefined' ? 400 * window.devicePixelRatio : 400
        }
    },
};

export const throttle = (delay, fn) => {
    let lastCall = 0;
    return (...args) => {
        const now = new Date().getTime();
        if (now - lastCall < delay) {
            return;
        }
        lastCall = now;
        return fn(...args);
    };
};

export const isPowerOf2 = value => (value & (value - 1)) === 0;

export const interpolate = (v0, v1, t) => v0 * (1 - t) + v1 * t;