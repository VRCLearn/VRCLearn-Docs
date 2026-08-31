import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {docsIndex} from '../src/generated/docs-data.js';
import siteConfig from '../site.config.json' with {type: 'json'};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');
const robotsPath = path.join(projectRoot, 'public', 'robots.txt');

function normalizeSiteUrl(rawSiteUrl) {
    const value = String(rawSiteUrl || '').trim();
    if (!value) {
        throw new Error('site.config.json 中的 homepageUrl 不能为空。');
    }

    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('site.config.json 中的 homepageUrl 必须使用 http:// 或 https:// 开头。');
    }

    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
}

function normalizeDocsSlug(rawSlug) {
    const value = String(rawSlug || '').trim().replace(/\\/g, '/');
    if (!value) {
        return '';
    }

    const normalizedPath = value.split('/').filter(Boolean).join('/');
    const pathWithoutMarkdownExtension = normalizedPath.replace(/\.md$/i, '');
    if (!pathWithoutMarkdownExtension || pathWithoutMarkdownExtension === '_home' || pathWithoutMarkdownExtension === 'index') {
        return '';
    }
    return pathWithoutMarkdownExtension.endsWith('/index')
        ? pathWithoutMarkdownExtension.slice(0, -('/index'.length))
        : pathWithoutMarkdownExtension;
}

function normalizeLang(rawLang) {
    return String(rawLang || '').trim().toLowerCase() || 'zh-cn';
}

function buildDocsPath(entry) {
    const docsType = entry.docsType === 'world' ? 'world' : 'avatar';
    const lang = normalizeLang(entry.lang);
    const slug = normalizeDocsSlug(entry.slug);
    return slug ? `/${docsType}/${lang}/${encodeURI(slug)}` : `/${docsType}/${lang}`;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function normalizeDate(rawDate) {
    if (!rawDate) {
        return null;
    }
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function getSourceLastmod(sourcePath) {
    try {
        const updatedAt = execFileSync('git', ['-C', projectRoot, 'log', '-1', '--format=%cI', '--', sourcePath], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        const date = normalizeDate(updatedAt);
        if (date) {
            return date;
        }
    } catch {
    }

    const absolutePath = path.join(projectRoot, sourcePath);
    return fs.existsSync(absolutePath) ? normalizeDate(fs.statSync(absolutePath).mtime) : null;
}

function getLatestDate(currentDate, nextDate) {
    if (!currentDate) {
        return nextDate || null;
    }
    if (!nextDate) {
        return currentDate;
    }
    return nextDate > currentDate ? nextDate : currentDate;
}

function collectSitemapEntries(siteUrl) {
    const entriesByPath = new Map([
        ['/', {loc: `${siteUrl}/`, lastmod: getSourceLastmod('src/app/docs/react.jsx')}]
    ]);
    const docsHomeScopes = new Map();

    for (const doc of docsIndex) {
        const docsType = doc.docsType === 'world' ? 'world' : 'avatar';
        const lang = normalizeLang(doc.lang);
        const lastmod = normalizeDate(doc.updatedAt);
        const scopeKey = `${docsType}:${lang}`;
        docsHomeScopes.set(scopeKey, getLatestDate(docsHomeScopes.get(scopeKey), lastmod));

        const pathname = buildDocsPath(doc);
        entriesByPath.set(pathname, {loc: `${siteUrl}${pathname}`, lastmod});
    }

    for (const [scopeKey, lastmod] of docsHomeScopes.entries()) {
        const [docsType, lang] = scopeKey.split(':');
        const pathname = `/${docsType}/${lang}`;
        if (!entriesByPath.has(pathname)) {
            entriesByPath.set(pathname, {loc: `${siteUrl}${pathname}`, lastmod});
        }
    }

    return Array.from(entriesByPath.values());
}

function buildSitemapXml(entries) {
    const urls = entries.map((entry) => {
        const lastmod = entry.lastmod ? `\n        <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
        return `    <url>\n        <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n    </url>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function main() {
    const siteUrl = normalizeSiteUrl(siteConfig.homepageUrl);

    fs.writeFileSync(sitemapPath, buildSitemapXml(collectSitemapEntries(siteUrl)), 'utf8');
    fs.writeFileSync(robotsPath, `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
    console.log(`[generate-sitemap] 已生成 ${path.relative(projectRoot, sitemapPath)}。`);
}

main();
