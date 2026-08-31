const FONT_FACES_TO_GATE = [
    '400 1em "Noto Sans"',
    '500 1em "Noto Sans"',
    '700 1em "Noto Sans"',
    '400 1em "Noto Sans SC"',
    '500 1em "Noto Sans SC"',
    '700 1em "Noto Sans SC"',
    '1em "Material Symbols Outlined"'
];

const LOADING_MIN_DISPLAY_MS = 1200;

export function gateFonts(rootElement) {
    const loadingStartedAt = performance.now();

    const finishFontsLoaded = () => {
        if (window.__fontsLoadedFallbackTimeoutId) {
            window.clearTimeout(window.__fontsLoadedFallbackTimeoutId);
            window.__fontsLoadedFallbackTimeoutId = null;
        }
        if (typeof window.__finishAppLoading === 'function') {
            window.__finishAppLoading();
            return;
        }
        rootElement.classList.remove('fonts-loading');
        rootElement.classList.add('fonts-loaded');
    };

    const handleFontsLoaded = () => {
        const elapsed = performance.now() - loadingStartedAt;
        const remainingDelay = Math.max(LOADING_MIN_DISPLAY_MS - elapsed, 0);

        window.setTimeout(finishFontsLoaded, remainingDelay);
    };

    const canLoadFonts = document.fonts && typeof document.fonts.load === 'function';
    if (canLoadFonts) {
        Promise.allSettled(FONT_FACES_TO_GATE.map((fontFace) => document.fonts.load(fontFace)))
            .finally(handleFontsLoaded);
        return;
    }

    handleFontsLoaded();
}
