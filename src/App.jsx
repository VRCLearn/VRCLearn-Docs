import {useCallback, useEffect, useRef, useState} from 'react';
import {DocsDetail, DocsEntry, DocsHome, DocsSidebar, toggleDocsGroup} from './app/docs/react.jsx';
import ThemePanel from './app/components/ThemePanel.jsx';
import {applyDocumentLang, getPreferredLang, setPreferredLang} from './app/i18n/language.js';
import {buildPath, parseRoute} from './app/shell/routes.js';
import {useUserTheme} from './app/theme/use-user-theme.js';
import siteConfig from '../site.config.json';

const DOCS_REPOSITORY_URL = `https://github.com/${siteConfig.repository}`;
const CONTENT_LINK_SELECTORS = [
    'a[href]',
    'md-filled-button',
    'md-filled-tonal-button',
    'md-outlined-button',
    'md-text-button',
    'md-elevated-button'
].join(', ');

function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handleChange = (event) => setMatches(event.matches);
        setMatches(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [query]);

    return matches;
}

function isModifiedClick(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function findClosestElement(target, selector) {
    return target instanceof Element ? target.closest(selector) : null;
}

function findEventTarget(event, selector) {
    const directTarget = findClosestElement(event.target, selector);
    if (directTarget) {
        return directTarget;
    }

    for (const node of event.composedPath?.() || []) {
        if (node instanceof Element && node.matches(selector)) {
            return node;
        }
    }

    return null;
}

function scrollAppMainToHash(appMain, hash) {
    const targetId = decodeURIComponent(hash.slice(1));
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target || !appMain) {
        return false;
    }

    const mainRect = appMain.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    appMain.scrollTo({
        top: appMain.scrollTop + targetRect.top - mainRect.top,
        behavior: 'smooth'
    });
    return true;
}

function AppHeader({
    headerRef,
    isNavOpen,
    isThemePanelOpen,
    menuButtonRef,
    onToggleMenu,
    onToggleThemePanel,
    themePanelToggleRef
}) {
    return (
        <header className="app-header" ref={headerRef}>
            <md-icon-button
                id="menu-btn"
                aria-label={isNavOpen ? '关闭文档导航' : '打开文档导航'}
                aria-expanded={isNavOpen}
                aria-controls="app-nav"
                onClick={onToggleMenu}
                ref={menuButtonRef}
            >
                <md-icon aria-hidden="true">menu</md-icon>
            </md-icon-button>
            <span className="app-header__title" id="app-header-title">{siteConfig.siteName}</span>
            <md-icon-button
                id="github-btn"
                aria-label="访问 VRCLearn Docs GitHub 仓库"
                href={DOCS_REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
            >
                <md-icon aria-hidden="true">code</md-icon>
            </md-icon-button>
            <md-icon-button
                id="theme-panel-toggle-btn"
                aria-label="打开主题控制面板"
                aria-controls="theme-controls-panel"
                aria-expanded={isThemePanelOpen}
                onClick={onToggleThemePanel}
                ref={themePanelToggleRef}
            >
                <md-icon aria-hidden="true">palette</md-icon>
            </md-icon-button>
        </header>
    );
}

function RouteContent({route}) {
    if (route.type === 'not-found') {
        return (
            <>
                <h1 className="page-title">页面未找到</h1>
                <p className="page-body">此路径不存在，请从文档入口重新选择。</p>
                <div className="card__actions">
                    <md-filled-tonal-button type="link" href="/">返回文档入口</md-filled-tonal-button>
                </div>
            </>
        );
    }
    if (route.type === 'docs-home') {
        return <DocsHome docsType={route.docsType} lang={route.lang} />;
    }
    if (route.type === 'docs-detail') {
        return <DocsDetail docsType={route.docsType} lang={route.lang} slug={route.slug} />;
    }
    return <DocsEntry />;
}

export default function App() {
    const isMobile = useMediaQuery('(max-width: 1500px)');
    const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [desktopNavClosed, setDesktopNavClosed] = useState(false);
    const [themePanelOpen, setThemePanelOpen] = useState(false);
    const appMainRef = useRef(null);
    const appHeaderRef = useRef(null);
    const appNavRef = useRef(null);
    const menuButtonRef = useRef(null);
    const themePanelToggleRef = useRef(null);
    const theme = useUserTheme();
    const navOpen = isMobile ? mobileMenuOpen : !desktopNavClosed;

    const applyRouteLanguage = useCallback((nextRoute) => {
        const lang = setPreferredLang(nextRoute.lang);
        applyDocumentLang(lang);
        return {...nextRoute, lang};
    }, []);

    const navigateTo = useCallback(async (targetRoute, {replace = false} = {}) => {
        const normalizedRoute = applyRouteLanguage(parseRoute(buildPath(targetRoute)));
        const nextPath = normalizedRoute.replacePath || buildPath(normalizedRoute);

        if (replace) {
            window.history.replaceState(normalizedRoute, '', nextPath);
        } else {
            window.history.pushState(normalizedRoute, '', nextPath);
        }
        setRoute(normalizedRoute);
    }, [applyRouteLanguage]);

    const closeMobileMenu = useCallback((restoreFocus = true) => {
        if (!isMobile) {
            return;
        }
        setMobileMenuOpen(false);
        if (restoreFocus) {
            requestAnimationFrame(() => menuButtonRef.current?.focus());
        }
    }, [isMobile]);

    useEffect(() => {
        void navigateTo(parseRoute(window.location.pathname), {replace: true});
    }, [navigateTo]);

    useEffect(() => {
        const handlePopState = () => {
            const nextRoute = applyRouteLanguage(parseRoute(window.location.pathname));
            if (nextRoute.replacePath) {
                void navigateTo(nextRoute, {replace: true});
                return;
            }
            setRoute(nextRoute);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [applyRouteLanguage, navigateTo]);

    useEffect(() => {
        if (!isMobile) {
            setMobileMenuOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        const setInert = (element, shouldBeInert) => {
            if (!element) {
                return;
            }
            if (shouldBeInert) {
                element.setAttribute('inert', '');
            } else {
                element.removeAttribute('inert');
            }
        };

        setInert(appHeaderRef.current, isMobile && mobileMenuOpen);
        setInert(appMainRef.current, isMobile && mobileMenuOpen);
        setInert(appNavRef.current, !navOpen);
    }, [isMobile, mobileMenuOpen, navOpen]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isMobile && mobileMenuOpen) {
                closeMobileMenu(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [closeMobileMenu, isMobile, mobileMenuOpen]);

    useEffect(() => {
        if (!isMobile || !mobileMenuOpen) {
            return undefined;
        }
        const animationFrameId = requestAnimationFrame(() => {
            appNavRef.current?.querySelector('#docs-nav-tree md-list-item')?.focus();
        });
        return () => cancelAnimationFrame(animationFrameId);
    }, [isMobile, mobileMenuOpen]);

    const handleToggleMenu = () => {
        if (isMobile) {
            setMobileMenuOpen((open) => !open);
            return;
        }
        setDesktopNavClosed((closed) => !closed);
    };

    const handleNavClick = async (event) => {
        const groupToggle = findEventTarget(event, '[data-doc-group-toggle="1"]');
        if (groupToggle) {
            event.preventDefault();
            event.stopPropagation();
            toggleDocsGroup(groupToggle);
            return;
        }

        const anchor = findEventTarget(event, '[data-doc-link="1"], [data-doc-home-link="1"], [data-main-site-link="1"]');
        if (!anchor || isModifiedClick(event)) {
            return;
        }

        const rawHref = anchor.getAttribute('href') || anchor.href;
        if (!rawHref) {
            return;
        }

        const linkUrl = new URL(rawHref, window.location.href);
        if (linkUrl.origin !== window.location.origin) {
            return;
        }

        event.preventDefault();
        await navigateTo(parseRoute(linkUrl.pathname));
        if (isMobile) {
            closeMobileMenu(false);
        }
    };

    const handleContentClick = async (event) => {
        if (event.defaultPrevented || isModifiedClick(event)) {
            return;
        }

        const target = findEventTarget(event, CONTENT_LINK_SELECTORS);
        if (!target || target.hasAttribute('download')) {
            return;
        }

        const rawHref = target.getAttribute('href') || target.href;
        if (!rawHref) {
            return;
        }

        let linkUrl;
        try {
            linkUrl = new URL(rawHref, window.location.href);
        } catch {
            return;
        }

        if (linkUrl.origin !== window.location.origin || target.getAttribute('target') === '_blank') {
            return;
        }

        if (target.matches('[data-docs-home-by-cookie="1"]')) {
            event.preventDefault();
            const docsType = target.getAttribute('data-docs-type') || 'avatar';
            const fallbackLang = target.getAttribute('data-fallback-lang') || route.lang;
            await navigateTo({docsType, lang: getPreferredLang() || fallbackLang, type: 'docs-home'});
            return;
        }

        if (linkUrl.hash && linkUrl.pathname === window.location.pathname && scrollAppMainToHash(appMainRef.current, linkUrl.hash)) {
            event.preventDefault();
            window.history.pushState(route, '', `${linkUrl.pathname}${linkUrl.search}${linkUrl.hash}`);
            return;
        }

        event.preventDefault();
        await navigateTo(parseRoute(linkUrl.pathname));
        if (linkUrl.hash) {
            requestAnimationFrame(() => scrollAppMainToHash(appMainRef.current, linkUrl.hash));
        }
    };

    useEffect(() => {
        const nav = appNavRef.current;
        const main = appMainRef.current;
        nav?.addEventListener('click', handleNavClick, true);
        main?.addEventListener('click', handleContentClick, true);

        return () => {
            nav?.removeEventListener('click', handleNavClick, true);
            main?.removeEventListener('click', handleContentClick, true);
        };
    }, [handleContentClick, handleNavClick]);

    return (
        <>
            <AppHeader
                headerRef={appHeaderRef}
                isNavOpen={navOpen}
                isThemePanelOpen={themePanelOpen}
                menuButtonRef={menuButtonRef}
                onToggleMenu={handleToggleMenu}
                onToggleThemePanel={() => setThemePanelOpen((open) => !open)}
                themePanelToggleRef={themePanelToggleRef}
            />
            <div className="app-layout">
                <div
                    className={`nav-backdrop${isMobile && mobileMenuOpen ? ' mobile-open' : ''}`}
                    id="nav-backdrop"
                    aria-hidden={isMobile && mobileMenuOpen ? 'false' : 'true'}
                    onClick={() => {
                        if (isMobile) {
                            closeMobileMenu(false);
                        }
                    }}
                ></div>
                <aside
                    className={`app-nav${desktopNavClosed ? ' desktop-closed' : ''}${isMobile && mobileMenuOpen ? ' mobile-open' : ''}`}
                    id="app-nav"
                    aria-label="文档导航"
                    ref={appNavRef}
                >
                    <DocsSidebar
                        docsType={route.docsType}
                        lang={route.lang}
                        currentSlug={route.type === 'docs-detail' ? route.slug : null}
                    />
                </aside>
                <main className="app-main" ref={appMainRef}>
                    <div className="app-content" id="page-content">
                        <RouteContent route={route} />
                    </div>
                </main>
            </div>
            <ThemePanel
                displaySourceHex={theme.displaySourceHex}
                hctValues={theme.hctValues}
                onReset={theme.resetUserTheme}
                onSetHctValue={theme.setHctValue}
                onSetSourceHex={theme.setThemeSourceHex}
                onSetThemeMode={theme.setThemeMode}
                onSetThemeScheme={theme.setThemeScheme}
                open={themePanelOpen}
                themeMode={theme.themeMode}
                themeScheme={theme.themeScheme}
                toggleButtonRef={themePanelToggleRef}
            />
        </>
    );
}
