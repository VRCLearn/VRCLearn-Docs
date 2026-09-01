import siteConfig from '../../../site.config.json' with {type: 'json'};
import {getPreferredLang, isLangSegment, normalizeLang} from '../i18n/language.js';

export const DOCS_HOME_SLUG = '_home';
export const DOCS_COLLECTIONS = siteConfig.docs.collections;
export const DEFAULT_DOCS_AUDIENCE = siteConfig.docs.defaultAudience;
export const DEFAULT_DOCS_TOPIC = siteConfig.docs.defaultTopic;

export function normalizeDocsAudience(rawAudience) {
    const value = String(rawAudience || '').trim().toLowerCase();
    return DOCS_COLLECTIONS.some((collection) => collection.audience === value) ? value : null;
}

export function normalizeDocsTopic(rawTopic, audience) {
    const normalizedAudience = normalizeDocsAudience(audience);
    const value = String(rawTopic || '').trim().toLowerCase();
    return DOCS_COLLECTIONS.some((collection) => (
        collection.audience === normalizedAudience && collection.topic === value
    )) ? value : null;
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

function notFoundRoute(routePath, preferredLang) {
    return {
        lang: preferredLang,
        path: routePath.startsWith('/') ? routePath : `/${routePath}`,
        type: 'not-found'
    };
}

export function parseRoute(pathname) {
    const routePath = String(pathname || '/');
    const segments = routePath.split('/').filter(Boolean);
    const preferredLang = getPreferredLang();

    if (segments.length === 0) {
        return {lang: preferredLang, type: 'docs-entry'};
    }

    if (segments.length < 3 || !isLangSegment(segments[0])) {
        return notFoundRoute(routePath, preferredLang);
    }

    const lang = normalizeLang(segments[0]);
    const audience = normalizeDocsAudience(segments[1]);
    const topic = normalizeDocsTopic(segments[2], audience);
    if (!audience || !topic) {
        return notFoundRoute(routePath, lang);
    }

    if (segments.length === 3) {
        return {audience, topic, lang, type: 'docs-home'};
    }

    let decodedSlug;
    try {
        decodedSlug = decodeURIComponent(segments.slice(3).join('/'));
    } catch {
        return {
            audience,
            topic,
            lang,
            type: 'docs-home',
            replacePath: buildPath({audience, topic, lang, type: 'docs-home'})
        };
    }

    const slug = normalizeDocsSlug(decodedSlug);
    if (!slug) {
        return {
            audience,
            topic,
            lang,
            type: 'docs-home',
            replacePath: buildPath({audience, topic, lang, type: 'docs-home'})
        };
    }

    const route = {audience, topic, lang, slug, type: 'docs-detail'};
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

    let audience = normalizeDocsAudience(route.audience);
    let topic = normalizeDocsTopic(route.topic, audience);
    if (!audience || !topic) {
        audience = DEFAULT_DOCS_AUDIENCE;
        topic = DEFAULT_DOCS_TOPIC;
    }
    const lang = normalizeLang(route.lang);
    const docsHomePath = `/${lang}/${audience}/${topic}`;
    if (route.type === 'docs-home') {
        return docsHomePath;
    }

    if (route.type === 'docs-detail') {
        const slug = normalizeDocsSlug(route.slug);
        return slug ? `${docsHomePath}/${encodeURI(slug)}` : docsHomePath;
    }

    return '/';
}
