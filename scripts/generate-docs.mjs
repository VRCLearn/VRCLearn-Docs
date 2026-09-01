import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import {fileURLToPath} from 'node:url';
import siteConfig from '../site.config.json' with {type: 'json'};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsSourceRoot = path.join(projectRoot, 'content');
const outputRoot = path.join(projectRoot, 'public', 'docs-content');
const generatedDataPath = path.join(projectRoot, 'src', 'generated', 'docs-data.js');
const VRCLEARN_MAIN_SITE = siteConfig.sites.www;

const DOCS_COLLECTIONS = siteConfig.docs.collections;
const MAX_DOC_TITLE_LENGTH = 200;
const DOCS_HOME_SLUG = '_home';

function escapeHtml(str) {
    if (!str) {
        return str;
    }

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;'
    };

    return String(str).replace(/[&<>"'`/]/g, (s) => escapeMap[s]);
}

function normalizeLang(rawLang) {
    const value = String(rawLang || '').trim().toLowerCase();
    return value || 'zh-cn';
}

function normalizeDocsSlug(rawSlug) {
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

function normalizeDocsAudience(rawAudience) {
    const value = String(rawAudience || '').trim().toLowerCase();
    return DOCS_COLLECTIONS.some((collection) => collection.audience === value) ? value : null;
}

function normalizeDocsTopic(rawTopic, audience) {
    const normalizedAudience = normalizeDocsAudience(audience);
    const value = String(rawTopic || '').trim().toLowerCase();
    return DOCS_COLLECTIONS.some((collection) => (
        collection.audience === normalizedAudience && collection.topic === value
    )) ? value : null;
}

function buildDocsPath({audience, topic, lang, slug}) {
    const normalizedAudience = normalizeDocsAudience(audience);
    const normalizedTopic = normalizeDocsTopic(topic, normalizedAudience);
    const normalizedLang = normalizeLang(lang);
    const normalizedSlug = normalizeDocsSlug(slug);
    if (!normalizedAudience || !normalizedTopic) {
        return '/';
    }
    const docsHomePath = `/${normalizedLang}/${normalizedAudience}/${normalizedTopic}`;
    if (!normalizedSlug) {
        return docsHomePath;
    }

    return `${docsHomePath}/${encodeURI(normalizedSlug)}`;
}

function ensureCleanOutput() {
    fs.rmSync(outputRoot, {recursive: true, force: true});
    fs.mkdirSync(outputRoot, {recursive: true});
}

function ensureGeneratedDataDir() {
    fs.mkdirSync(path.dirname(generatedDataPath), {recursive: true});
}

function extractFirstMarkdownH1(markdownText) {
    const lines = markdownText.split(/\r?\n/);
    let inFence = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            inFence = !inFence;
            continue;
        }
        if (inFence) {
            continue;
        }

        const matched = line.match(/^\s*#\s+(.+?)\s*$/);
        if (!matched) {
            continue;
        }

        const raw = matched[1].trim().replace(/\s+#+\s*$/, '').trim();
        if (!raw) {
            continue;
        }

        return raw.slice(0, MAX_DOC_TITLE_LENGTH);
    }

    return null;
}

function extractPrimaryHeading(markdownText) {
    const source = String(markdownText || '');
    const lines = source.split(/\r?\n/);
    let inFence = false;
    let cursor = 0;

    for (const line of lines) {
        const lineLength = line.length;
        const lineBreakLength = source.slice(cursor + lineLength, cursor + lineLength + 2) === '\r\n' ? 2 : 1;
        const trimmed = line.trim();

        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            inFence = !inFence;
            cursor += lineLength + lineBreakLength;
            continue;
        }

        if (!inFence) {
            const matched = line.match(/^\s*#\s+(.+?)\s*$/);
            if (matched) {
                const title = matched[1].trim().replace(/\s+#+\s*$/, '').trim() || null;
                const before = source.slice(0, cursor);
                const afterStart = Math.min(source.length, cursor + lineLength + lineBreakLength);
                const after = source.slice(afterStart).replace(/^\r?\n/, '');
                return {
                    title,
                    body: `${before}${after}`
                };
            }
        }

        cursor += lineLength + lineBreakLength;
    }

    return {
        title: null,
        body: source
    };
}

function extractMarkdownH2Sequence(markdownText) {
    const lines = markdownText.split(/\r?\n/);
    const sequence = [];
    let inFence = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            inFence = !inFence;
            continue;
        }
        if (inFence) {
            continue;
        }

        const matched = line.match(/^\s*##\s+(.+?)\s*$/);
        if (!matched) {
            continue;
        }

        const raw = matched[1].trim().replace(/\s+#+\s*$/, '').trim();
        if (!raw) {
            continue;
        }
        // 支持两种写法：
        // 1) ## 仅显示名（旧兼容，按标题匹配）
        // 2) ## [显示名](路径)（推荐，按路径匹配排序）
        const linkMatched = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatched) {
            sequence.push({
                label: linkMatched[1].trim(),
                target: linkMatched[2].trim()
            });
            continue;
        }

        sequence.push({
            label: raw,
            target: null
        });
    }

    return sequence;
}

function normalizeOrderTargetPath(input) {
    let value = String(input || '').trim();
    if (!value) {
        return null;
    }

    value = value.replace(/\\/g, '/');
    if (value.startsWith('/')) {
        value = value.slice(1);
    }
    if (value.startsWith('./')) {
        value = value.slice(2);
    }
    if (value.endsWith('.md')) {
        value = value.slice(0, -3);
    }
    if (value.endsWith('/index')) {
        value = value.slice(0, -('/index'.length));
    }

    // 仅保留相对 slug，不接受 ../ 等上级跳转段
    if (!value || value.split('/').some((part) => part === '' || part === '.' || part === '..')) {
        return null;
    }

    return value;
}

function normalizeSourceDocsPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');
}

function hasNonMarkdownExtension(pathname) {
    const normalizedPathname = String(pathname || '').split('?')[0].split('#')[0];
    const fileName = normalizedPathname.split('/').filter(Boolean).pop() || '';
    const extensionMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    if (!extensionMatch) {
        return false;
    }

    return extensionMatch[1].toLowerCase() !== 'md';
}

function buildDocsRoutePath(pathname, fallbackAudience, fallbackTopic, fallbackLang) {
    const normalizedPath = String(pathname || '').replace(/\\/g, '/');

    const docsContentMatch = normalizedPath.match(/^\/docs-content\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(.*))?$/i);
    if (docsContentMatch) {
        const audience = normalizeDocsAudience(docsContentMatch[1] || fallbackAudience);
        const topic = normalizeDocsTopic(docsContentMatch[2] || fallbackTopic, audience);
        const lang = normalizeLang(docsContentMatch[3] || fallbackLang);
        const markdownPart = docsContentMatch[4] || 'index.md';
        if (hasNonMarkdownExtension(markdownPart)) {
            return null;
        }
        return buildDocsPath({audience, topic, lang, slug: markdownPart.replace(/\.md$/i, '')});
    }

    const sourceDocsMatch = normalizedPath.match(/^\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(.*))?$/i);
    if (sourceDocsMatch) {
        const audience = normalizeDocsAudience(sourceDocsMatch[1] || fallbackAudience);
        const topic = normalizeDocsTopic(sourceDocsMatch[2] || fallbackTopic, audience);
        const lang = normalizeLang(sourceDocsMatch[3] || fallbackLang);
        const pathPart = sourceDocsMatch[4] || '';
        if (audience && topic) {
            if (hasNonMarkdownExtension(pathPart)) {
                return null;
            }
            return buildDocsPath({audience, topic, lang, slug: pathPart.replace(/\.md$/i, '')});
        }
    }

    const publicDocsMatch = normalizedPath.match(/^\/([^/]+)\/([^/]+)\/([^/]+)(?:\/(.*))?$/i);
    if (publicDocsMatch) {
        const lang = normalizeLang(publicDocsMatch[1] || fallbackLang);
        const audience = normalizeDocsAudience(publicDocsMatch[2] || fallbackAudience);
        const topic = normalizeDocsTopic(publicDocsMatch[3] || fallbackTopic, audience);
        const pathPart = publicDocsMatch[4] || '';
        if (!audience || !topic || hasNonMarkdownExtension(pathPart)) {
            return null;
        }
        return buildDocsPath({audience, topic, lang, slug: pathPart.replace(/\.md$/i, '')});
    }

    return null;
}

function normalizeMarkdownDocHref(rawHref, env = {}) {
    const href = String(rawHref || '').trim();
    if (!href) {
        return href;
    }
    if (href.startsWith('#') || href.startsWith('//') || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href)) {
        return href;
    }

    const sourceDocsPath = normalizeSourceDocsPath(env.docsSourcePath);
    const fallbackAudience = normalizeDocsAudience(env.docsAudience);
    const fallbackTopic = normalizeDocsTopic(env.docsTopic, fallbackAudience);
    const fallbackLang = normalizeLang(env.docsLang);

    try {
        const resolvedUrl = href.startsWith('/')
            ? new URL(href, 'https://site.local/')
            : (sourceDocsPath
                ? new URL(href, new URL(sourceDocsPath, 'https://docs.local/'))
                : new URL(href, 'https://site.local/'));

        const docsRoutePath = buildDocsRoutePath(
            resolvedUrl.pathname,
            fallbackAudience,
            fallbackTopic,
            fallbackLang
        );
        if (docsRoutePath) {
            return `${docsRoutePath}${resolvedUrl.search}${resolvedUrl.hash}`;
        }

        if (resolvedUrl.origin === 'https://docs.local') {
            return `/docs-content${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
        }

        if (resolvedUrl.origin === 'https://site.local') {
            return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
        }
    } catch {
        return href;
    }

    return href;
}

function normalizeMarkdownImageSrc(rawSrc, env = {}) {
    const src = String(rawSrc || '').trim();
    if (!src) {
        return src;
    }
    if (src.startsWith('//') || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(src)) {
        return src;
    }

    const sourceDocsPath = normalizeSourceDocsPath(env.docsSourcePath);

    try {
        const resolvedUrl = src.startsWith('/')
            ? new URL(src, 'https://site.local/')
            : (sourceDocsPath
                ? new URL(src, new URL(sourceDocsPath, 'https://docs.local/'))
                : new URL(src, 'https://site.local/'));

        if (resolvedUrl.origin === 'https://docs.local') {
            return `/docs-content${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
        }

        if (resolvedUrl.origin !== 'https://site.local') {
            return src;
        }

        if (resolvedUrl.pathname.startsWith('/docs-content/')) {
            return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
        }

        const sourcePathMatch = resolvedUrl.pathname.match(/^\/([^/]+)\/([^/]+)\//);
        const sourceAudience = normalizeDocsAudience(sourcePathMatch?.[1]);
        if (sourceAudience && normalizeDocsTopic(sourcePathMatch?.[2], sourceAudience)) {
            return `/docs-content${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
        }

        return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
    } catch {
        return src;
    }
}

function cardContainerPlugin(md) {
    function cardBlock(state, startLine, endLine, silent) {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const max = state.eMarks[startLine];
        const marker = ':::';
        if (start + marker.length >= max) {
            return false;
        }

        const lineText = state.src.slice(start, max).trim();
        if (!lineText.startsWith(':::card')) {
            return false;
        }

        const suffix = lineText.slice(':::card'.length).trim();
        const variant = suffix === '' ? 'normal' : suffix;
        if (!['normal', 'emphasis', 'warning'].includes(variant)) {
            return false;
        }

        if (silent) {
            return true;
        }

        let nextLine = startLine + 1;
        let found = false;
        while (nextLine < endLine) {
            const nextStart = state.bMarks[nextLine] + state.tShift[nextLine];
            const nextMax = state.eMarks[nextLine];
            const nextText = state.src.slice(nextStart, nextMax).trim();
            if (nextText === marker) {
                found = true;
                break;
            }
            nextLine += 1;
        }

        if (!found) {
            return false;
        }

        const open = state.push('card_open', 'div', 1);
        open.block = true;
        open.map = [startLine, nextLine];
        open.meta = {variant};

        state.md.block.tokenize(state, startLine + 1, nextLine);

        const close = state.push('card_close', 'div', -1);
        close.block = true;

        state.line = nextLine + 1;
        return true;
    }

    md.block.ruler.before('fence', 'card', cardBlock, {
        alt: ['paragraph', 'reference', 'blockquote', 'list']
    });

    md.renderer.rules.card_open = (tokens, idx) => {
        const variant = tokens[idx].meta?.variant || 'normal';
        const variantClass = variant === 'normal' ? '' : ` card--${variant}`;
        return `<div class="card${variantClass}">`;
    };

    md.renderer.rules.card_close = () => '</div>';
}

function actionsContainerPlugin(md) {
    function actionsBlock(state, startLine, endLine, silent) {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const max = state.eMarks[startLine];
        const marker = ':::';
        if (start + marker.length >= max) {
            return false;
        }

        const lineText = state.src.slice(start, max).trim();
        if (lineText !== ':::actions') {
            return false;
        }

        if (silent) {
            return true;
        }

        let nextLine = startLine + 1;
        let found = false;
        while (nextLine < endLine) {
            const nextStart = state.bMarks[nextLine] + state.tShift[nextLine];
            const nextMax = state.eMarks[nextLine];
            const nextText = state.src.slice(nextStart, nextMax).trim();
            if (nextText === marker) {
                found = true;
                break;
            }
            nextLine += 1;
        }

        if (!found) {
            return false;
        }

        const lines = [];
        for (let line = startLine + 1; line < nextLine; line += 1) {
            const lineStart = state.bMarks[line] + state.tShift[line];
            const lineEnd = state.eMarks[line];
            lines.push(state.src.slice(lineStart, lineEnd));
        }

        const token = state.push('actions', '', 0);
        token.block = true;
        token.map = [startLine, nextLine];
        token.content = lines.join('\n');

        state.line = nextLine + 1;
        return true;
    }

    md.block.ruler.before('fence', 'actions', actionsBlock, {
        alt: ['paragraph', 'reference', 'blockquote', 'list']
    });

    md.renderer.rules.actions = (tokens, idx, options, env) => {
        const token = tokens[idx];
        const links = [];
        const lines = token.content.split('\n');
        const markdownLinkPattern = /^\s*(?:[-*+]\s*)?\[([^\]]+)\]\(([^)]+)\)\s*$/;

        for (const line of lines) {
            const match = line.match(markdownLinkPattern);
            if (!match) {
                continue;
            }

            const label = match[1].trim();
            const href = match[2].trim();
            const resolvedHref = normalizeMarkdownDocHref(href, env);
            if (!label || !resolvedHref || !md.validateLink(resolvedHref)) {
                continue;
            }

            links.push({label, href: resolvedHref});
        }

        if (links.length === 0) {
            return '';
        }

        const buttons = links.map((item) => {
            const safeLabel = escapeHtml(item.label);
            const safeHref = escapeHtml(item.href);
            return `<md-filled-tonal-button type="link" href="${safeHref}">${safeLabel}</md-filled-tonal-button>`;
        }).join('');

        return `<div class="card__actions">${buttons}</div>`;
    };
}

function addTokenClass(token, className) {
    const existingClass = token.attrGet('class');
    token.attrSet('class', existingClass ? `${existingClass} ${className}` : className);
}

function cardHeadingClassPlugin(md) {
    md.core.ruler.after('inline', 'card_heading_classes', (state) => {
        let cardDepth = 0;

        for (const token of state.tokens) {
            if (token.type === 'card_open') {
                cardDepth += 1;
                continue;
            }

            if (token.type === 'card_close') {
                cardDepth = Math.max(0, cardDepth - 1);
                continue;
            }

            if (cardDepth > 0 && token.type === 'heading_open' && ['h2', 'h3'].includes(token.tag)) {
                addTokenClass(token, 'card__title');
            }
        }
    });
}

const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    validateLink(url) {
        const value = String(url || '').trim();
        if (!value || /[\u0000-\u001F\u007F\s]/.test(value)) {
            return false;
        }
        if (value.startsWith('#')) {
            return true;
        }
        if (value.startsWith('//')) {
            return false;
        }

        try {
            const parsedUrl = new URL(value, 'https://site.local/');
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'mailto:') {
                return true;
            }
            return !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) && parsedUrl.origin === 'https://site.local';
        } catch {
            return false;
        }
    }
}).use(cardContainerPlugin).use(actionsContainerPlugin).use(cardHeadingClassPlugin);

const defaultLinkOpenRenderer = markdown.renderer.rules.link_open
    || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const hrefAttrIndex = tokens[idx].attrIndex('href');
    if (hrefAttrIndex >= 0) {
        const hrefValue = tokens[idx].attrs?.[hrefAttrIndex]?.[1] || '';
        tokens[idx].attrs[hrefAttrIndex][1] = normalizeMarkdownDocHref(hrefValue, env);
    }

    return defaultLinkOpenRenderer(tokens, idx, options, env, self);
};

const defaultImageRenderer = markdown.renderer.rules.image
    || ((tokens, idx, options, envContext, self) => self.renderToken(tokens, idx, options));

markdown.renderer.rules.image = (tokens, idx, options, envContext, self) => {
    const srcAttrIndex = tokens[idx].attrIndex('src');
    if (srcAttrIndex >= 0) {
        const srcValue = tokens[idx].attrs?.[srcAttrIndex]?.[1] || '';
        tokens[idx].attrs[srcAttrIndex][1] = normalizeMarkdownImageSrc(srcValue, envContext);
    }

    return defaultImageRenderer(tokens, idx, options, envContext, self);
};

function renderMarkdownPage(markdownText, entry) {
    const {title, body} = extractPrimaryHeading(markdownText);
    return {
        title: title || entry.title,
        html: markdown.render(body, {
            docsAudience: entry.audience,
            docsTopic: entry.topic,
            docsLang: entry.lang,
            docsSourcePath: `${entry.audience}/${entry.topic}/${entry.lang}/${entry.slug}.md`
        })
    };
}

function getDocsScopeKey(audience, topic, lang) {
    return `${audience}:${topic}:${lang}`;
}

function applyMarkdownH1Titles(indexEntries, sourceRepoRoot) {
    for (const entry of indexEntries) {
        const absoluteDocPath = path.join(sourceRepoRoot, entry.path);
        if (!fs.existsSync(absoluteDocPath)) {
            continue;
        }

        const markdownText = fs.readFileSync(absoluteDocPath, 'utf8');
        const h1Title = extractFirstMarkdownH1(markdownText);
        if (h1Title) {
            entry.title = h1Title;
        }
    }
}

function collectDirectoryIndexMeta(docsSources) {
    const meta = new Map();

    for (const {audience, topic, lang, langRoot} of docsSources) {
        if (!fs.existsSync(langRoot)) {
            continue;
        }

        const stack = [''];
        while (stack.length > 0) {
            const relDir = stack.pop();
            const absDir = relDir ? path.join(langRoot, relDir) : langRoot;
            if (!fs.existsSync(absDir)) {
                continue;
            }

            const children = fs.readdirSync(absDir, {withFileTypes: true});
            for (const child of children) {
                if (!child.isDirectory()) {
                    continue;
                }
                const childRel = relDir ? `${relDir}/${child.name}` : child.name;
                stack.push(childRel);
            }

            const indexPath = path.join(absDir, 'index.md');
            if (!fs.existsSync(indexPath)) {
                continue;
            }

            if (relDir.split('/').filter(Boolean).length > 1) {
                console.warn(`[generate-docs][warn] 已忽略非规范目录索引：${audience}/${topic}/${lang}/${relDir}/index.md。目录排序只支持语言根目录和一级分组目录。`);
                continue;
            }

            const markdownText = fs.readFileSync(indexPath, 'utf8');
            const title = extractFirstMarkdownH1(markdownText);
            const orderSequence = extractMarkdownH2Sequence(markdownText);
            meta.set(`${audience}:${topic}:${lang}:${relDir}`, {
                audience,
                topic,
                lang,
                dirPath: relDir,
                title,
                orderSequence
            });
        }
    }

    return meta;
}

function applyGroupTitlesFromDirectoryIndexMeta(indexEntries, directoryIndexMeta) {
    const scopeGroupTitles = new Map();

    for (const value of directoryIndexMeta.values()) {
        const scopeKey = getDocsScopeKey(value.audience, value.topic, value.lang);
        const groupPath = value.dirPath;
        if (!groupPath || !value?.title) {
            continue;
        }

        if (!scopeGroupTitles.has(scopeKey)) {
            scopeGroupTitles.set(scopeKey, {});
        }
        scopeGroupTitles.get(scopeKey)[groupPath] = value.title;
    }

    for (const entry of indexEntries) {
        const autoGroupTitles = scopeGroupTitles.get(getDocsScopeKey(entry.audience, entry.topic, entry.lang));
        if (!autoGroupTitles) {
            continue;
        }
        entry.groupTitles = {
            ...(entry.groupTitles || {}),
            ...autoGroupTitles
        };
    }
}

function applyOrderFromDirectoryIndexMeta(indexEntries, directoryIndexMeta) {
    const docsByScope = new Map();
    for (const entry of indexEntries) {
        const scopeKey = getDocsScopeKey(entry.audience, entry.topic, entry.lang);
        if (!docsByScope.has(scopeKey)) {
            docsByScope.set(scopeKey, []);
        }
        docsByScope.get(scopeKey).push(entry);
        entry.order = null;
        entry.groupOrders = {};
    }

    for (const [scopeKey, docs] of docsByScope.entries()) {
        const [audience, topic, lang] = scopeKey.split(':');
        const groupTitleMap = new Map();
        for (const value of directoryIndexMeta.values()) {
            if (value.audience !== audience || value.topic !== topic || value.lang !== lang) {
                continue;
            }
            const groupPath = value.dirPath;
            if (!groupPath || !value?.title) {
                continue;
            }
            groupTitleMap.set(groupPath, value.title);
        }

        for (const value of directoryIndexMeta.values()) {
            if (value.audience !== audience || value.topic !== topic || value.lang !== lang) {
                continue;
            }
            const dirPath = value.dirPath;
            const sequence = Array.isArray(value?.orderSequence) ? value.orderSequence : [];
            if (sequence.length === 0) {
                continue;
            }

            const directDocs = [];
            const directGroups = new Map();
            const scopeLabel = dirPath
                ? `${audience}/${topic}/${lang}/${dirPath}`
                : `${audience}/${topic}/${lang}/(root)`;
            for (const doc of docs) {
                const parts = doc.slug.split('/').filter(Boolean);
                const docDir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                if (docDir !== dirPath) {
                    continue;
                }
                directDocs.push(doc);
            }

            for (const doc of docs) {
                if (dirPath && !doc.slug.startsWith(`${dirPath}/`)) {
                    continue;
                }

                const rest = dirPath ? doc.slug.slice(dirPath.length + 1) : doc.slug;
                if (!rest || !rest.includes('/')) {
                    continue;
                }

                const childName = rest.split('/')[0];
                const childGroupPath = dirPath ? `${dirPath}/${childName}` : childName;
                if (!directGroups.has(childGroupPath)) {
                    const fallbackTitle = groupTitleMap.get(childGroupPath) || childName;
                    directGroups.set(childGroupPath, fallbackTitle);
                }
            }

            const matchDocByTitle = new Map();
            const duplicateDocTitles = new Set();
            const matchDocByPath = new Map();
            for (const doc of directDocs) {
                if (matchDocByTitle.has(doc.title)) {
                    duplicateDocTitles.add(doc.title);
                }
                matchDocByTitle.set(doc.title, doc);
                const docFileName = doc.slug.split('/').pop();
                matchDocByPath.set(docFileName, doc);
                matchDocByPath.set(doc.slug, doc);
            }
            const matchGroupByTitle = new Map();
            const duplicateGroupTitles = new Set();
            const matchGroupByPath = new Map();
            for (const [groupPath, title] of directGroups.entries()) {
                if (matchGroupByTitle.has(title)) {
                    duplicateGroupTitles.add(title);
                }
                matchGroupByTitle.set(title, groupPath);
                const groupName = groupPath.split('/').pop();
                matchGroupByPath.set(groupName, groupPath);
                matchGroupByPath.set(groupPath, groupPath);
            }

            for (const title of duplicateDocTitles) {
                console.warn(`[generate-docs][warn] ${scopeLabel} 同层文档标题重复：${title}。纯文本 H2 匹配可能不稳定，建议使用 [显示名](路径)。`);
            }
            for (const title of duplicateGroupTitles) {
                console.warn(`[generate-docs][warn] ${scopeLabel} 同层分组标题重复：${title}。纯文本 H2 匹配可能不稳定，建议使用 [显示名](路径)。`);
            }

            let rank = 1;
            const assignedDocSlugs = new Set();
            const assignedGroupPaths = new Set();
            for (const item of sequence) {
                const label = item?.label || '';
                const target = normalizeOrderTargetPath(item?.target);

                let matchedDoc = null;
                let matchedGroupPath = null;

                if (target) {
                    const scopedTarget = dirPath ? `${dirPath}/${target}` : target;
                    matchedDoc = matchDocByPath.get(target) || matchDocByPath.get(scopedTarget) || null;
                    matchedGroupPath = matchGroupByPath.get(target) || matchGroupByPath.get(scopedTarget) || null;
                    if (matchedDoc && matchedGroupPath) {
                        console.warn(`[generate-docs][warn] ${scopeLabel} H2 路径目标同时命中文档与分组：${target}（H2: ${label}）。当前将优先按文档处理。`);
                    }
                }

                if (!matchedDoc && !matchedGroupPath) {
                    matchedDoc = matchDocByTitle.get(label) || null;
                    matchedGroupPath = matchGroupByTitle.get(label) || null;
                }

                if (matchedDoc) {
                    if (assignedDocSlugs.has(matchedDoc.slug)) {
                        console.warn(`[generate-docs][warn] ${scopeLabel} 排序项重复命中文档：${matchedDoc.slug}（H2: ${label}）。`);
                        continue;
                    }
                    matchedDoc.order = rank;
                    assignedDocSlugs.add(matchedDoc.slug);
                    rank += 1;
                    continue;
                }

                if (matchedGroupPath) {
                    if (assignedGroupPaths.has(matchedGroupPath)) {
                        console.warn(`[generate-docs][warn] ${scopeLabel} 排序项重复命中分组：${matchedGroupPath}（H2: ${label}）。`);
                        continue;
                    }
                    for (const doc of docs) {
                        doc.groupOrders[matchedGroupPath] = rank;
                    }
                    assignedGroupPaths.add(matchedGroupPath);
                    rank += 1;
                    continue;
                }

                if (target) {
                    console.warn(`[generate-docs][warn] ${scopeLabel} H2 未匹配：${label} -> ${target}。`);
                } else {
                    console.warn(`[generate-docs][warn] ${scopeLabel} H2 未匹配：${label}。`);
                }
            }
        }
    }
}

function collectMarkdownEntries(docsSources) {
    const entries = [];

    for (const {audience, topic, lang, langRoot} of docsSources) {
        if (!fs.existsSync(langRoot)) {
            continue;
        }

        const stack = [langRoot];
        while (stack.length > 0) {
            const current = stack.pop();
            const children = fs.readdirSync(current, {withFileTypes: true});
            for (const child of children) {
                const abs = path.join(current, child.name);
                if (child.isDirectory()) {
                    stack.push(abs);
                    continue;
                }
                if (!child.isFile() || !child.name.endsWith('.md')) {
                    continue;
                }

                const rel = path.relative(langRoot, abs).replace(/\\/g, '/');
                const slug = rel.replace(/\.md$/i, '');
                const unsupportedReason = getUnsupportedMarkdownPathReason(slug);
                if (unsupportedReason) {
                    console.warn(`[generate-docs][warn] 已忽略非规范文档路径：${audience}/${topic}/${lang}/${rel}。${unsupportedReason}`);
                    continue;
                }

                entries.push({
                    audience,
                    topic,
                    lang,
                    slug,
                    title: slug.split('/').pop(),
                    path: path.relative(projectRoot, abs).replace(/\\/g, '/'),
                    updatedAt: null,
                    order: null,
                    groupTitles: {},
                    groupOrders: {}
                });
            }
        }
    }

    return entries;
}

function getUnsupportedMarkdownPathReason(slug) {
    const parts = String(slug || '').split('/').filter(Boolean);

    if (parts.length === 1 && parts[0] === 'index') {
        return null;
    }

    if (parts.length === 2 && parts[1] === 'index') {
        return null;
    }

    if (parts.length === 2 && parts[1] !== 'index') {
        return null;
    }

    if (parts.length === 1) {
        return '顶层只允许 index.md；普通文档应放在一级分组目录下。';
    }

    return '当前目录结构只支持 content/{audience}/{topic}/{lang}/index.md、content/{audience}/{topic}/{lang}/{group}/index.md 和 content/{audience}/{topic}/{lang}/{group}/{page}.md。';
}

function warnMissingGroupIndexes(indexEntries) {
    const groupsByScope = new Map();
    const groupIndexesByScope = new Map();

    for (const entry of indexEntries) {
        const parts = entry.slug.split('/').filter(Boolean);
        if (parts.length !== 2) {
            continue;
        }

        const [groupName, pageName] = parts;
        const scopeKey = getDocsScopeKey(entry.audience, entry.topic, entry.lang);
        if (!groupsByScope.has(scopeKey)) {
            groupsByScope.set(scopeKey, new Set());
        }
        groupsByScope.get(scopeKey).add(groupName);

        if (pageName === 'index') {
            if (!groupIndexesByScope.has(scopeKey)) {
                groupIndexesByScope.set(scopeKey, new Set());
            }
            groupIndexesByScope.get(scopeKey).add(groupName);
        }
    }

    for (const [scopeKey, groupNames] of groupsByScope.entries()) {
        const [audience, topic, lang] = scopeKey.split(':');
        const groupIndexes = groupIndexesByScope.get(scopeKey) || new Set();
        for (const groupName of groupNames) {
            if (!groupIndexes.has(groupName)) {
                console.warn(`[generate-docs][warn] ${audience}/${topic}/${lang}/${groupName}/ 缺少 index.md。分组标题和分组页应由该文件提供。`);
            }
        }
    }
}

function applyGitUpdatedAt(indexEntries, sourceRepoRoot) {
    for (const entry of indexEntries) {
        const absoluteDocPath = path.join(sourceRepoRoot, entry.path);
        const repoRelativeDocPath = path.relative(sourceRepoRoot, absoluteDocPath).replace(/\\/g, '/');
        if (!fs.existsSync(absoluteDocPath)) {
            continue;
        }

        try {
            const updatedAt = execFileSync('git', ['-C', sourceRepoRoot, 'log', '-1', '--format=%cI', '--', repoRelativeDocPath], {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            }).trim();

            entry.updatedAt = updatedAt || null;
        } catch (error) {
            console.warn(`[generate-docs][warn] 无法读取文档最后修改时间：${entry.path}。`);
        }
    }
}

function copyDocsLanguageAssets(docsSources) {
    for (const {audience, topic, lang, langRoot: sourceLangRoot} of docsSources) {
        if (!fs.existsSync(sourceLangRoot)) {
            continue;
        }
        const targetLangRoot = path.join(outputRoot, audience, topic, lang);
        fs.mkdirSync(targetLangRoot, {recursive: true});

        const stack = [sourceLangRoot];
        while (stack.length > 0) {
            const current = stack.pop();
            const children = fs.readdirSync(current, {withFileTypes: true});
            for (const child of children) {
                const abs = path.join(current, child.name);
                if (child.isDirectory()) {
                    stack.push(abs);
                    continue;
                }
                if (!child.isFile()) {
                    continue;
                }

                const rel = path.relative(sourceLangRoot, abs);
                const target = path.join(targetLangRoot, rel);
                fs.mkdirSync(path.dirname(target), {recursive: true});
                fs.copyFileSync(abs, target);
            }
        }
    }
}

function resolveDocsSources(sourceRepoRoot) {
    const docsSources = [];

    for (const collection of DOCS_COLLECTIONS) {
        const {audience, topic} = collection;
        const topicRoot = path.join(sourceRepoRoot, audience, topic);
        if (!fs.existsSync(topicRoot)) {
            continue;
        }

        const langEntries = fs.readdirSync(topicRoot, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .sort((a, b) => a.name.localeCompare(b.name, 'en'));
        for (const langEntry of langEntries) {
            docsSources.push({
                audience,
                topic,
                lang: normalizeLang(langEntry.name),
                langRoot: path.join(topicRoot, langEntry.name)
            });
        }
    }

    return docsSources;
}

function createTreeNode() {
    return {
        children: new Map(),
        doc: null,
        indexDoc: null,
        groupTitle: null,
        groupOrder: null
    };
}

function normalizeOrder(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }

    return null;
}

function getDocLeafOrder(doc) {
    return normalizeOrder(doc?.order);
}

function getGroupTitleFromDoc(doc, groupPath) {
    const groupTitles = doc?.groupTitles;
    if (!groupTitles || typeof groupTitles !== 'object') {
        return null;
    }

    const value = groupTitles[groupPath];
    if (typeof value === 'string' && value.trim() !== '') {
        return value.trim();
    }

    return null;
}

function getGroupOrderFromDoc(doc, groupPath) {
    const groupOrders = doc?.groupOrders;
    if (!groupOrders || typeof groupOrders !== 'object') {
        return null;
    }

    return normalizeOrder(groupOrders[groupPath]);
}

function buildDocsTree(docsOfLang) {
    const root = createTreeNode();

    for (const doc of docsOfLang) {
        const parts = doc.slug.split('/').filter(Boolean);
        const isGroupIndex = parts.length > 1 && parts[parts.length - 1] === 'index';
        const loopParts = isGroupIndex ? parts.slice(0, -1) : parts;
        let current = root;
        const groupParts = [];
        for (const part of loopParts) {
            groupParts.push(part);
            const groupPath = groupParts.join('/');
            if (!current.children.has(part)) {
                current.children.set(part, createTreeNode());
            }
            current = current.children.get(part);

            const customGroupTitle = getGroupTitleFromDoc(doc, groupPath);
            if (customGroupTitle && !current.groupTitle) {
                current.groupTitle = customGroupTitle;
            }

            const customGroupOrder = getGroupOrderFromDoc(doc, groupPath);
            if (customGroupOrder !== null && current.groupOrder === null) {
                current.groupOrder = customGroupOrder;
            }
        }

        if (isGroupIndex) {
            current.indexDoc = doc;
            if (!current.groupTitle && doc.title) {
                current.groupTitle = doc.title;
            }
        } else {
            current.doc = doc;
        }
    }

    return root;
}

function getDocsTreeNodeId(audience, topic, lang, slug, depth) {
    const normalizedSlug = normalizeDocsSlug(slug) || `group-${depth}`;
    const safePath = `${audience}-${topic}-${lang}-${normalizedSlug}`
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/^-+|-+$/g, '');
    return `docs-tree-${safePath || depth}`;
}

function renderDocListItem({href, slug, title, className = ''}) {
    const classes = ['docs-tree__item', className].filter(Boolean).join(' ');
    return `
        <md-list-item
            class="${classes}"
            type="link"
            href="${href}"
            data-doc-link="1"
            data-slug="${escapeHtml(slug)}"
        >
            <span slot="headline">${escapeHtml(title)}</span>
        </md-list-item>
    `;
}

function renderDocsTreeToggle({groupLabel, groupChildrenId, expanded = false}) {
    return `
        <md-icon-button
            class="docs-tree__group-toggle"
            data-doc-group-toggle="1"
            aria-label="展开或收起 ${escapeHtml(groupLabel)}"
            aria-expanded="${expanded ? 'true' : 'false'}"
            aria-controls="${escapeHtml(groupChildrenId)}"
        >
            <md-icon aria-hidden="true">${expanded ? 'expand_less' : 'expand_more'}</md-icon>
        </md-icon-button>
    `;
}

function renderTreeChildren(node, audience, topic, lang, depth) {
    const entries = Array.from(node.children.entries()).sort((a, b) => {
        const [aName, aNode] = a;
        const [bName, bNode] = b;

        const aOrder = aNode.doc ? getDocLeafOrder(aNode.doc) : (aNode.groupOrder ?? getDocLeafOrder(aNode.indexDoc));
        const bOrder = bNode.doc ? getDocLeafOrder(bNode.doc) : (bNode.groupOrder ?? getDocLeafOrder(bNode.indexDoc));
        const aHasOrder = aOrder !== null;
        const bHasOrder = bOrder !== null;

        if (aHasOrder && bHasOrder && aOrder !== bOrder) {
            return aOrder - bOrder;
        }

        if (aHasOrder !== bHasOrder) {
            return aHasOrder ? -1 : 1;
        }

        const aLabel = (aNode.groupTitle || aNode.indexDoc?.title || aNode.doc?.title || aName).trim();
        const bLabel = (bNode.groupTitle || bNode.indexDoc?.title || bNode.doc?.title || bName).trim();
        return aLabel.localeCompare(bLabel, 'zh-CN');
    });

    return entries.map(([name, child]) => {
        if (child.children.size > 0) {
            const groupLabel = child.groupTitle || name;
            const groupSlug = normalizeDocsSlug(child.indexDoc?.slug || '');
            const groupChildrenId = getDocsTreeNodeId(audience, topic, lang, groupSlug || name, depth);
            const isTopGroup = depth === 0;
            const groupToggleHtml = renderDocsTreeToggle({
                groupLabel,
                groupChildrenId,
                expanded: isTopGroup
            });
            const groupLabelHtml = child.indexDoc
                ? renderDocListItem({
                    href: buildDocsPath({audience, topic, lang, slug: groupSlug}),
                    slug: groupSlug,
                    title: groupLabel,
                    className: 'docs-tree__group-link'
                })
                : `
                    <md-list-item
                        class="docs-tree__item docs-tree__group-label"
                        type="button"
                        data-doc-group-toggle="1"
                        aria-expanded="${isTopGroup ? 'true' : 'false'}"
                        aria-controls="${escapeHtml(groupChildrenId)}"
                    >
                        <span slot="headline">${escapeHtml(groupLabel)}</span>
                    </md-list-item>
                `;
            const groupClasses = ['docs-tree__group', 'docs-tree__group--collapsible'];
            if (isTopGroup) {
                groupClasses.push('docs-tree__group--top');
            }

            return `
                <div class="${groupClasses.join(' ')}">
                    <div class="docs-tree__group-row">
                        ${groupLabelHtml}
                        ${groupToggleHtml}
                    </div>
                    <md-list class="docs-tree__children" id="${escapeHtml(groupChildrenId)}" ${isTopGroup ? '' : 'hidden'}>
                        ${renderTreeChildren(child, audience, topic, lang, depth + 1)}
                    </md-list>
                </div>
            `;
        }

        const doc = child.doc;
        if (!doc) {
            return '';
        }
        const docSlug = normalizeDocsSlug(doc.slug);

        return renderDocListItem({
            href: buildDocsPath({audience, topic, lang, slug: docSlug}),
            slug: docSlug,
            title: doc.title
        });
    }).join('');
}

function buildDocsTreeHtmlForScope(docsIndex, audience, topic, lang) {
    const treeHeaderHtml = `
        <md-list-item class="docs-tree__item docs-tree__main-link" type="link" href="${escapeHtml(VRCLEARN_MAIN_SITE.homepageUrl)}" data-main-site-link="1" aria-label="返回 ${escapeHtml(VRCLEARN_MAIN_SITE.name)} 主站">
            <md-icon slot="start" aria-hidden="true">arrow_back</md-icon>
            <span slot="headline">${escapeHtml(VRCLEARN_MAIN_SITE.name)}</span>
        </md-list-item>
        <div class="docs-tree__header">文档目录</div>
    `;
    const docsHomeHtml = `
        <md-list-item class="docs-tree__item docs-tree__home" type="link" href="${buildDocsPath({audience, topic, lang, slug: ''})}" data-doc-home-link="1">
            <md-icon slot="start" aria-hidden="true">article</md-icon>
            <span slot="headline">文档首页</span>
        </md-list-item>
    `;
    const listOpen = '<md-list class="docs-tree__list">';
    const listClose = '</md-list>';
    const emptyTreeHtml = `
        <md-list-item class="docs-tree__empty">
            <span slot="headline">当前语言暂无文档目录。</span>
        </md-list-item>
    `;

    const docsOfScope = docsIndex.filter((item) => item.audience === audience
        && item.topic === topic
        && normalizeLang(item.lang) === lang
        && normalizeDocsSlug(item.slug) !== '');
    if (docsOfScope.length === 0) {
        return `
            ${listOpen}
            ${treeHeaderHtml}
            ${emptyTreeHtml}
            ${listClose}
        `;
    }

    const tree = buildDocsTree(docsOfScope);
    return `
        ${listOpen}
        ${treeHeaderHtml}
        ${docsHomeHtml}
        ${renderTreeChildren(tree, audience, topic, lang, 0)}
        ${listClose}
    `;
}

function buildDocsPages(indexEntries, sourceRepoRoot) {
    const pagesByKey = {};

    for (const entry of indexEntries) {
        const absoluteDocPath = path.join(sourceRepoRoot, entry.path);
        if (!fs.existsSync(absoluteDocPath)) {
            continue;
        }

        const markdownText = fs.readFileSync(absoluteDocPath, 'utf8');
        const rendered = renderMarkdownPage(markdownText, entry);
        const normalizedSlug = normalizeDocsSlug(entry.slug);
        pagesByKey[`${entry.audience}:${entry.topic}:${normalizeLang(entry.lang)}:${normalizedSlug}`] = {
            audience: entry.audience,
            topic: entry.topic,
            lang: normalizeLang(entry.lang),
            slug: normalizedSlug,
            title: rendered.title || entry.title,
            path: entry.path,
            html: rendered.html
        };
    }

    return pagesByKey;
}

function writeIndex(indexEntries) {
    const indexPath = path.join(outputRoot, 'index.json');
    fs.writeFileSync(indexPath, `${JSON.stringify(indexEntries, null, 4)}\n`, 'utf8');
}

function writeGeneratedDocsData(indexEntries, sourceRepoRoot, docsSources) {
    ensureGeneratedDataDir();

    const docsTreeHtmlByScope = {};
    for (const {audience, topic, lang} of docsSources) {
        const scopeKey = getDocsScopeKey(audience, topic, lang);
        docsTreeHtmlByScope[scopeKey] = buildDocsTreeHtmlForScope(indexEntries, audience, topic, lang);
    }

    const docsPagesByKey = sourceRepoRoot ? buildDocsPages(indexEntries, sourceRepoRoot) : {};
    const fileContent = `// This file is generated by scripts/generate-docs.mjs. Do not edit manually.\nexport const docsIndex = ${JSON.stringify(indexEntries, null, 4)};\n\nexport const docsTreeHtmlByScope = ${JSON.stringify(docsTreeHtmlByScope, null, 4)};\n\nexport const docsPagesByKey = ${JSON.stringify(docsPagesByKey, null, 4)};\n`;
    fs.writeFileSync(generatedDataPath, fileContent, 'utf8');
}

function generateFromLocalRepo() {
    const docsSources = resolveDocsSources(docsSourceRoot);
    if (docsSources.length === 0) {
        throw new Error('文档目录不存在或不含语言目录。应至少提供 content/{audience}/{topic}/{lang}。');
    }
    ensureCleanOutput();
    copyDocsLanguageAssets(docsSources);

    const indexEntries = collectMarkdownEntries(docsSources);
    const directoryIndexMeta = collectDirectoryIndexMeta(docsSources);

    warnMissingGroupIndexes(indexEntries);
    applyGitUpdatedAt(indexEntries, projectRoot);
    applyMarkdownH1Titles(indexEntries, projectRoot);
    applyGroupTitlesFromDirectoryIndexMeta(indexEntries, directoryIndexMeta);
    applyOrderFromDirectoryIndexMeta(indexEntries, directoryIndexMeta);

    writeIndex(indexEntries);
    writeGeneratedDocsData(indexEntries, projectRoot, docsSources);
    console.log(`[generate-docs] 已生成 ${indexEntries.length} 篇文档。`);
}

generateFromLocalRepo();
