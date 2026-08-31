export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function isValidHexColor(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeHexColor(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    if (!isValidHexColor(normalized)) {
        return null;
    }
    return normalized;
}
