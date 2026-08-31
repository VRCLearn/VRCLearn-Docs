import {getCookie, setCookie} from '../utils/cookies.js';

export const DEFAULT_LANG = 'zh-cn';
export const LANG_COOKIE_NAME = 'lang';
const LANG_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function normalizeLang(rawLang) {
    const value = String(rawLang || '').trim().toLowerCase();
    return value || DEFAULT_LANG;
}

export function isLangSegment(value) {
    const normalizedValue = String(value || '').trim().toLowerCase();
    return normalizedValue !== '' && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalizedValue);
}

export function getPreferredLang() {
    const value = getCookie(LANG_COOKIE_NAME);
    if (value && isLangSegment(value)) {
        return normalizeLang(value);
    }
    return DEFAULT_LANG;
}

export function setPreferredLang(lang) {
    const normalizedLang = normalizeLang(lang);
    setCookie(LANG_COOKIE_NAME, normalizedLang, LANG_COOKIE_MAX_AGE_SECONDS);
    return normalizedLang;
}

export function applyDocumentLang(lang) {
    document.documentElement.lang = normalizeLang(lang);
}
