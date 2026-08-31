import {useEffect, useRef} from 'react';
import {docsPagesByKey, docsTreeHtmlByScope} from '../../generated/docs-data.js';
import {getPreferredLang} from '../i18n/language.js';
import {DEFAULT_DOCS_TYPE, normalizeDocsSlug, normalizeDocsType} from '../shell/routes.js';
import {HtmlContent} from '../utils/html-react.jsx';
import siteConfig from '../../../site.config.json';

const VRCLEARN_MAIN_SITE = siteConfig.sites.www;

function normalizeLang(lang) {
    return String(lang || 'zh-cn').trim().toLowerCase() || 'zh-cn';
}

function getFallbackDocsTreeHtml() {
    return `
        <md-list class="docs-tree__list">
            <md-list-item class="docs-tree__item docs-tree__main-link" type="link" href="${VRCLEARN_MAIN_SITE.homepageUrl}" data-main-site-link="1" aria-label="返回 ${VRCLEARN_MAIN_SITE.name} 主站">
                <md-icon slot="start" aria-hidden="true">arrow_back</md-icon>
                <span slot="headline">${VRCLEARN_MAIN_SITE.name}</span>
            </md-list-item>
            <div class="docs-tree__header">文档目录</div>
            <md-list-item class="docs-tree__empty">
                <span slot="headline">当前语言暂无文档目录。</span>
            </md-list-item>
        </md-list>
    `;
}

export function getDocsTreeHtml(docsType, lang) {
    const normalizedDocsType = normalizeDocsType(docsType) || DEFAULT_DOCS_TYPE;
    const normalizedLang = normalizeLang(lang);
    return docsTreeHtmlByScope[`${normalizedDocsType}:${normalizedLang}`] || getFallbackDocsTreeHtml();
}

export function getGeneratedDocPage(docsType, lang, slug) {
    const normalizedDocsType = normalizeDocsType(docsType) || DEFAULT_DOCS_TYPE;
    const key = `${normalizedDocsType}:${normalizeLang(lang)}:${normalizeDocsSlug(slug)}`;
    return docsPagesByKey[key] || null;
}

function setDocsGroupExpanded(group, expanded) {
    const children = group.querySelector(':scope > .docs-tree__children');
    const toggles = group.querySelectorAll(':scope > .docs-tree__group-row [data-doc-group-toggle="1"]');

    if (!children) {
        return;
    }

    children.hidden = !expanded;
    toggles.forEach((toggle) => {
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const icon = toggle.querySelector('md-icon');
        if (icon) {
            icon.textContent = expanded ? 'expand_less' : 'expand_more';
        }
    });
}

function expandDocsTreeAncestors(item) {
    let group = item.closest('.docs-tree__group--collapsible');
    while (group) {
        setDocsGroupExpanded(group, true);
        group = group.parentElement?.closest('.docs-tree__group--collapsible') || null;
    }
}

function resetDocsTreeExpansion(sidebar) {
    const groups = sidebar.querySelectorAll('.docs-tree__group--collapsible');
    groups.forEach((group) => {
        setDocsGroupExpanded(group, group.classList.contains('docs-tree__group--top'));
    });
}

export function toggleDocsGroup(toggle) {
    const group = toggle.closest('.docs-tree__group--collapsible');
    const controlsId = toggle.getAttribute('aria-controls');
    const children = controlsId
        ? document.getElementById(controlsId)
        : group?.querySelector(':scope > .docs-tree__children');

    if (!group || !children) {
        return;
    }

    setDocsGroupExpanded(group, toggle.getAttribute('aria-expanded') !== 'true');
}

export function DocsSidebar({docsType, lang, currentSlug}) {
    const sidebarRef = useRef(null);
    const normalizedDocsType = normalizeDocsType(docsType) || DEFAULT_DOCS_TYPE;
    const normalizedLang = normalizeLang(lang);
    const treeHtml = getDocsTreeHtml(normalizedDocsType, normalizedLang);

    useEffect(() => {
        const sidebar = sidebarRef.current;
        if (!sidebar) {
            return;
        }

        resetDocsTreeExpansion(sidebar);
        const items = sidebar.querySelectorAll('[data-doc-link="1"], [data-doc-home-link="1"]');
        items.forEach((item) => {
            const matched = currentSlug && item.dataset.slug === currentSlug;
            if (matched) {
                item.setAttribute('aria-current', 'page');
                expandDocsTreeAncestors(item);
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }, [currentSlug, normalizedDocsType, normalizedLang, treeHtml]);

    return (
        <div
            className="docs-tree"
            id="docs-nav-tree"
            ref={sidebarRef}
        >
            <HtmlContent html={treeHtml} />
        </div>
    );
}

export function DocsEntry() {
    const preferredLang = getPreferredLang();

    return (
        <>
            <h1 className="page-title">教程文档</h1>
            <p className="page-body">这里是教程文档入口。你可以直接从下方进入并选择需要的内容进行阅读。</p>
            <div className="card">
                <h2 className="card__title">进入文档</h2>
                <p>选择要阅读的文档类型，进入对应的文档首页。</p>
                <div className="card__actions">
                    <md-filled-tonal-button
                        type="link"
                        href={`/${DEFAULT_DOCS_TYPE}/${preferredLang}`}
                        data-docs-home-by-cookie="1"
                        data-docs-type={DEFAULT_DOCS_TYPE}
                        data-fallback-lang={preferredLang}
                    >
                        Avatar 文档
                    </md-filled-tonal-button>
                    <md-filled-tonal-button
                        type="link"
                        href={`/world/${preferredLang}`}
                        data-docs-home-by-cookie="1"
                        data-docs-type="world"
                        data-fallback-lang={preferredLang}
                    >
                        World 文档
                    </md-filled-tonal-button>
                </div>
            </div>
        </>
    );
}

export function DocsHome({docsType, lang}) {
    const page = getGeneratedDocPage(docsType, lang, '');

    return (
        <>
            <h1 className="page-title">{page?.title || '文档首页'}</h1>
            {page ? (
                <HtmlContent html={page.html} />
            ) : (
                <p className="page-body">未找到该语言的首页文档。</p>
            )}
        </>
    );
}

export function DocsDetail({docsType, lang, slug}) {
    const normalizedSlug = normalizeDocsSlug(slug);
    const page = normalizedSlug ? getGeneratedDocPage(docsType, lang, normalizedSlug) : null;

    if (!normalizedSlug) {
        return (
            <>
                <h1 className="page-title">文档未找到</h1>
                <p className="page-body">无效的文档路径。</p>
            </>
        );
    }

    if (!page) {
        return (
            <>
                <h1 className="page-title">文档未找到</h1>
                <p className="page-body">未找到该文档，请从左侧目录重新选择。</p>
            </>
        );
    }

    return (
        <>
            <h1 className="page-title">{page.title || normalizedSlug}</h1>
            <HtmlContent html={page.html} />
        </>
    );
}
