import {getPreferredLang, isLangSegment, normalizeLang} from '../i18n/language.js';

export const DOCS_HOME_SLUG = '_home';
export const DEFAULT_DOCS_TYPE = 'avatar';
export const DOCS_TYPES = ['avatar', 'world'];

export function normalizeDocsType(rawDocsType) {
    const value = String(rawDocsType || '').trim().toLowerCase();
    return DOCS_TYPES.includes(value) ? value : null;
}

export function normalizeDocsSlug(rawSlug) {
    const value = String(rawSlug || '').trim().replace(/\\/g, '/');
    if (!value) {
        return '';
    }

    const normalizedPath = value.split('/').filter(Boolean).join('/');
    const pathWithoutMarkdownExtension = normalizedPath.replace(/\.md$/i, '');
    if (!pathWithoutMarkdownExtension || pathWithoutMarkdownExtension === DOCS_HOME_SLUG || pathWithoutMarkdownExtension === 'index') {
        return '';
    }

    if (pathWithoutMarkdownExtension.endsWith('/index')) {
        return pathWithoutMarkdownExtension.slice(0, -('/index'.length));
    }

    return pathWithoutMarkdownExtension;
}

export function parseRoute(pathname) {
    const routePath = String(pathname || '/');
    const segments = routePath.split('/').filter(Boolean);
    const preferredLang = getPreferredLang();

    if (segments.length === 0) {
        return {lang: preferredLang, type: 'docs-entry'};
    }

    const docsType = normalizeDocsType(segments[0]);
    if (!docsType) {
        return {
            lang: preferredLang,
            path: routePath.startsWith('/') ? routePath : `/${routePath}`,
            type: 'not-found'
        };
    }

    if (segments.length === 1) {
        const route = {docsType, lang: preferredLang, type: 'docs-home'};
        route.replacePath = buildPath(route);
        return route;
    }

    if (!isLangSegment(segments[1])) {
        return {
            lang: preferredLang,
            path: routePath.startsWith('/') ? routePath : `/${routePath}`,
            type: 'not-found'
        };
    }

    const lang = normalizeLang(segments[1]);
    if (segments.length === 2) {
        return {docsType, lang, type: 'docs-home'};
    }

    let decodedSlug;
    try {
        decodedSlug = decodeURIComponent(segments.slice(2).join('/'));
    } catch {
        return {docsType, lang, type: 'docs-home', replacePath: buildPath({docsType, lang, type: 'docs-home'})};
    }

    const slug = normalizeDocsSlug(decodedSlug);
    if (!slug) {
        return {docsType, lang, type: 'docs-home', replacePath: buildPath({docsType, lang, type: 'docs-home'})};
    }

    const route = {docsType, lang, slug, type: 'docs-detail'};
    if (slug !== decodedSlug) {
        route.replacePath = buildPath(route);
    }
    return route;
}

export function buildPath(route) {
    if (route.type === 'docs-entry') {
        return '/';
    }
    if (route.type === 'not-found') {
        return route.path || '/';
    }

    const docsType = normalizeDocsType(route.docsType) || DEFAULT_DOCS_TYPE;
    const lang = normalizeLang(route.lang);
    if (route.type === 'docs-home') {
        return `/${docsType}/${lang}`;
    }

    if (route.type === 'docs-detail') {
        const slug = normalizeDocsSlug(route.slug);
        return slug ? `/${docsType}/${lang}/${encodeURI(slug)}` : `/${docsType}/${lang}`;
    }

    return '/';
}
