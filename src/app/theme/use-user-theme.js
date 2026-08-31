import {useCallback, useEffect, useMemo, useState} from 'react';
import {argbFromHex, Hct, hexFromArgb} from '@material/material-color-utilities';
import {clamp, normalizeHexColor} from './color-utils.js';
import {deleteCookie, getCookie, setCookie} from '../utils/cookies.js';
import {buildFullMaterialThemeCss} from './material-theme-generator.js';
import {
    COOKIE_MAX_AGE_SECONDS,
    DEFAULT_THEME_MODE,
    DEFAULT_THEME_SCHEME,
    DEFAULT_THEME_SOURCE_HEX,
    THEME_SCHEME_LABELS,
    THEME_SCHEME_NAMES,
    USER_THEME_COOKIE_KEY,
    USER_THEME_MODE_COOKIE_KEY,
    USER_THEME_SCHEME_COOKIE_KEY
} from './theme-config.js';

function normalizeThemeMode(value) {
    return value === 'dark' || value === 'light' ? value : DEFAULT_THEME_MODE;
}

function normalizeThemeScheme(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return THEME_SCHEME_NAMES.includes(normalized) ? normalized : DEFAULT_THEME_SCHEME;
}

function getSystemThemeQuery() {
    return window.matchMedia('(prefers-color-scheme: dark)');
}

export function useUserTheme() {
    const systemThemeQuery = useMemo(getSystemThemeQuery, []);
    const [systemThemeIsDark, setSystemThemeIsDark] = useState(systemThemeQuery.matches);
    const [userThemeMode, setUserThemeMode] = useState(() => normalizeThemeMode(getCookie(USER_THEME_MODE_COOKIE_KEY)));
    const [userThemeScheme, setUserThemeScheme] = useState(() => normalizeThemeScheme(getCookie(USER_THEME_SCHEME_COOKIE_KEY)));
    const [userThemeSourceHex, setUserThemeSourceHex] = useState(() => normalizeHexColor(getCookie(USER_THEME_COOKIE_KEY)));

    const isDarkThemeActive = userThemeMode === 'auto' ? systemThemeIsDark : userThemeMode === 'dark';
    const displaySourceHex = userThemeSourceHex || DEFAULT_THEME_SOURCE_HEX;

    useEffect(() => {
        const handleSystemThemeChange = (event) => {
            setSystemThemeIsDark(event.matches);
        };

        systemThemeQuery.addEventListener('change', handleSystemThemeChange);
        return () => systemThemeQuery.removeEventListener('change', handleSystemThemeChange);
    }, [systemThemeQuery]);

    useEffect(() => {
        const rootElement = document.documentElement;
        rootElement.classList.toggle('dark', isDarkThemeActive);
        rootElement.classList.toggle('light', !isDarkThemeActive);
    }, [isDarkThemeActive]);

    useEffect(() => {
        const styleId = 'user-theme-style';
        const previousStyle = document.getElementById(styleId);
        const styleElement = previousStyle || document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = buildFullMaterialThemeCss(
            displaySourceHex,
            isDarkThemeActive,
            userThemeScheme
        );
        if (!previousStyle) {
            document.head.appendChild(styleElement);
        }
    }, [displaySourceHex, isDarkThemeActive, userThemeScheme]);

    const setThemeMode = useCallback((mode, {persist = true} = {}) => {
        const normalizedMode = normalizeThemeMode(mode);
        setUserThemeMode(normalizedMode);
        if (persist) {
            setCookie(USER_THEME_MODE_COOKIE_KEY, normalizedMode, COOKIE_MAX_AGE_SECONDS);
        }
    }, []);

    const setThemeScheme = useCallback((schemeName, {persist = true} = {}) => {
        const normalizedScheme = normalizeThemeScheme(schemeName);
        setUserThemeScheme(normalizedScheme);
        if (persist) {
            setCookie(USER_THEME_SCHEME_COOKIE_KEY, normalizedScheme, COOKIE_MAX_AGE_SECONDS);
        }
    }, []);

    const setThemeSourceHex = useCallback((sourceHex, {persist = true} = {}) => {
        const normalizedHex = normalizeHexColor(sourceHex);
        if (!normalizedHex) {
            return false;
        }

        setUserThemeSourceHex(normalizedHex);
        if (persist) {
            setCookie(USER_THEME_COOKIE_KEY, normalizedHex, COOKIE_MAX_AGE_SECONDS);
        }
        return true;
    }, []);

    const resetUserTheme = useCallback(() => {
        deleteCookie(USER_THEME_COOKIE_KEY);
        setUserThemeSourceHex(null);
        setThemeScheme(DEFAULT_THEME_SCHEME);
        setThemeMode(DEFAULT_THEME_MODE);
    }, [setThemeMode, setThemeScheme]);

    const hctValues = useMemo(() => {
        const hct = Hct.fromInt(argbFromHex(displaySourceHex));
        return {
            hue: Math.round(hct.hue),
            chroma: Math.round(clamp(hct.chroma, 0, 150)),
            tone: Math.round(clamp(hct.tone, 0, 100))
        };
    }, [displaySourceHex]);

    const setHctValue = useCallback((name, rawValue) => {
        const nextValues = {
            ...hctValues,
            [name]: Number(rawValue)
        };
        const sourceArgb = Hct.from(
            clamp(nextValues.hue, 0, 360),
            clamp(nextValues.chroma, 0, 150),
            clamp(nextValues.tone, 0, 100)
        ).toInt();
        setThemeSourceHex(hexFromArgb(sourceArgb));
    }, [hctValues, setThemeSourceHex]);

    return {
        displaySourceHex,
        hctValues,
        isDarkThemeActive,
        resetUserTheme,
        setHctValue,
        setThemeMode,
        setThemeScheme,
        setThemeSourceHex,
        themeMode: userThemeMode,
        themeScheme: userThemeScheme
    };
}

export {THEME_SCHEME_LABELS};
