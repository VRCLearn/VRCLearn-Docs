import {useEffect, useRef} from 'react';
import {docsPagesByKey, docsTreeHtmlByScope} from '../../generated/docs-data.js';
import {getPreferredLang} from '../i18n/language.js';
import {
    DEFAULT_DOCS_AUDIENCE,
    DEFAULT_DOCS_TOPIC,
    DOCS_COLLECTIONS,
    normalizeDocsAudience,
    normalizeDocsSlug,
    normalizeDocsTopic
} from '../shell/routes.js';
import {HtmlContent} from '../utils/html-react.jsx';
import siteConfig from '../../../site.config.json';

const VRCLEARN_MAIN_SITE = siteConfig.sites.www;

function normalizeLang(lang) {
    return String(lang || 'zh-cn').trim().toLowerCase() || 'zh-cn';
}

function normalizeScope(audience, topic) {
    const normalizedAudience = normalizeDocsAudience(audience);
    const normalizedTopic = normalizeDocsTopic(topic, normalizedAudience);
    if (!normalizedAudience || !normalizedTopic) {
        return {audience: DEFAULT_DOCS_AUDIENCE, topic: DEFAULT_DOCS_TOPIC};
    }
    return {audience: normalizedAudience, topic: normalizedTopic};
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

export function getDocsTreeHtml(audience, topic, lang) {
    const scope = normalizeScope(audience, topic);
    const normalizedLang = normalizeLang(lang);
    return docsTreeHtmlByScope[`${scope.audience}:${scope.topic}:${normalizedLang}`] || getFallbackDocsTreeHtml();
}

export function getGeneratedDocPage(audience, topic, lang, slug) {
    const scope = normalizeScope(audience, topic);
    const key = `${scope.audience}:${scope.topic}:${normalizeLang(lang)}:${normalizeDocsSlug(slug)}`;
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

export function DocsSidebar({audience, topic, lang, currentSlug}) {
    const sidebarRef = useRef(null);
    const scope = normalizeScope(audience, topic);
    const normalizedLang = normalizeLang(lang);
    const treeHtml = getDocsTreeHtml(scope.audience, scope.topic, normalizedLang);

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
    }, [currentSlug, normalizedLang, scope.audience, scope.topic, treeHtml]);

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
            <p className="page-body">请先选择身份和主题，再进入对应的文档集。</p>
            <div className="card">
                <h2 className="card__title">进入文档</h2>
                <div className="card__actions">
                    {DOCS_COLLECTIONS.map((collection) => (
                        <md-filled-tonal-button
                            key={`${collection.audience}:${collection.topic}`}
                            type="link"
                            href={`/${preferredLang}/${collection.audience}/${collection.topic}`}
                            data-docs-home-by-cookie="1"
                            data-docs-audience={collection.audience}
                            data-docs-topic={collection.topic}
                            data-fallback-lang={preferredLang}
                        >
                            {collection.name}
                        </md-filled-tonal-button>
                    ))}
                </div>
            </div>
        </>
    );
}

export function DocsHome({audience, topic, lang}) {
    const page = getGeneratedDocPage(audience, topic, lang, '');

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

export function DocsDetail({audience, topic, lang, slug}) {
    const normalizedSlug = normalizeDocsSlug(slug);
    const page = normalizedSlug ? getGeneratedDocPage(audience, topic, lang, normalizedSlug) : null;

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
