import {interpolate} from './general.js';

export function parseColorFromString(str) {
    const RGBAFromHex = HexToRGBA(str);
    if (Boolean(RGBAFromHex)) return RGBAFromHex;
    const RGBAFromRGB = RGBStringToRGBA(str);
    if (Boolean(RGBAFromRGB)) return RGBAFromRGB;
    const RGBAFromRGBAString = RGBAStringToRGBA(str);
    if (Boolean(RGBAFromRGBAString)) return RGBAFromRGBAString;
    const RGBAFromCSSColorString = CSSColorStringToRGBA(str);
    if (Boolean(RGBAFromCSSColorString)) return RGBAFromCSSColorString;
    return null;
}

function isValidHex (val) {
    const matchRegex = /^([A-Fa-f0-9]{3}){1,2}$/;
    return matchRegex.test(stripHash(val));
}

function stripHash (hex) {
    if (hex.charAt(0) !== '#') return hex;
    return hex.substring(1);
}

function HexToRGBA (hex) {
    if (!isValidHex(hex)) return;
    const hexString = formatHexString(hex);
    return hexStringToRGBA(hexString);
}

function formatHexString (hex) {
    const vals = stripHash(hex).split('');
    if (vals.length === 6) return `0x${vals.join('')}`;
    const repeatedVals = [vals[0], vals[0], vals[1], vals[1], vals[2], vals[2]];
    return `0x${repeatedVals.join('')}`;
}

function hexStringToRGBA (hex) {
    return {
        r: ((hex >> 16) & 255) / 255,
        g: ((hex >> 8) & 255) / 255,
        b: (hex & 255) / 255,
        a: 1.0
    }
}

function normalize8Bit (int) {
    return int / 255;
}

function isValidRGBString (val) {
    const matchRegex = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/;
    return matchRegex.test(val);
}

function RGBStringToRGBA (val) {
    if (!isValidRGBString(val)) return;
    const matchRegex = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/;
    const [r, g, b] = matchRegex
        .exec(val)
        .slice(1, 4)
        .map(stringVal => parseInt(stringVal))
        .map(val => normalize8Bit(val));
    return { r, g, b, a: 1.0 };
}

function isValidRGBAString (val) {
    const matchRegex = /rgba\((\d{1,3}), (\d{1,3}), (\d{1,3}), (0\.[0-9]+|[0-1])\)/;
    return matchRegex.test(val);
}

function RGBAStringToRGBA (val) {
    if (!isValidRGBAString(val)) return;
    const matchRegex = /rgba\((\d{1,3}), (\d{1,3}), (\d{1,3}), (0\.[0-9]+|[0-1])\)/;
    const [r, g, b, a] = matchRegex
        .exec(val)
        .slice(1, 5)
        .map(stringVal => parseInt(stringVal))
        .map(val => normalize8Bit(val));
    return { r, g, b, a: a * 255 };
}

// todo: make so this removes the element when no longer needed
function CSSColorStringToRGBA (val) {
    const testDiv = document.createElement('div');
    testDiv.style.color = val;
    document.body.appendChild(testDiv);
    const rgbString = window.getComputedStyle(testDiv).color;
    document.body.removeChild(testDiv);
    return RGBStringToRGBA(rgbString);
}

export function luminanceFromRGBA (rgba, backgroundColor) {
    const { r, g, b } = interpolateRGBColors(backgroundColor, { r: rgba.r, g: rgba.g, b: rgba.b }, rgba.a);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function interpolateRGBColors (sourceColor, targetColor, amount) {
    return {
        r: interpolate(sourceColor.r, targetColor.r, amount),
        g: interpolate(sourceColor.g, targetColor.g, amount),
        b: interpolate(sourceColor.b, targetColor.b, amount)
    }
}