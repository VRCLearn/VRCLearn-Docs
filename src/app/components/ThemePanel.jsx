import {useEffect, useRef, useState} from 'react';
import {clamp, normalizeHexColor} from '../theme/color-utils.js';
import {THEME_SCHEME_LABELS, THEME_SCHEME_NAMES} from '../theme/theme-config.js';

function ThemePanel({
    displaySourceHex,
    hctValues,
    onReset,
    onSetHctValue,
    onSetSourceHex,
    onSetThemeMode,
    onSetThemeScheme,
    open,
    themeMode,
    themeScheme,
    toggleButtonRef
}) {
    const panelRef = useRef(null);
    const hexInputRef = useRef(null);
    const hueInputRef = useRef(null);
    const chromaInputRef = useRef(null);
    const toneInputRef = useRef(null);
    const schemeRadiosRef = useRef(null);
    const schemeListRef = useRef(null);
    const [panelVisible, setPanelVisible] = useState(open);
    const [panelExpanded, setPanelExpanded] = useState(open);
    const [schemeListVisible, setSchemeListVisible] = useState(false);
    const [schemeListOpen, setSchemeListOpen] = useState(false);

    useEffect(() => {
        let animationFrameId;
        let timeoutId;

        if (open) {
            setPanelVisible(true);
            setPanelExpanded(false);
            animationFrameId = requestAnimationFrame(() => setPanelExpanded(true));
        } else {
            setPanelExpanded(false);
            timeoutId = window.setTimeout(() => setPanelVisible(false), 240);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [open]);

    useEffect(() => {
        const panel = panelRef.current;
        const toggleButton = toggleButtonRef.current;
        if (!panel || !toggleButton || !panelVisible) {
            return undefined;
        }

        const updatePanelAnchor = () => {
            const toggleRect = toggleButton.getBoundingClientRect();
            const right = clamp(window.innerWidth - toggleRect.right, 8, 24);
            const top = toggleRect.bottom + 8;
            panel.style.setProperty('--theme-panel-anchor-right', `${Math.round(right)}px`);
            panel.style.setProperty('--theme-panel-anchor-top', `${Math.round(top)}px`);
        };

        updatePanelAnchor();
        window.addEventListener('resize', updatePanelAnchor);
        return () => window.removeEventListener('resize', updatePanelAnchor);
    }, [panelVisible, toggleButtonRef]);

    useEffect(() => {
        const input = hexInputRef.current;
        if (!input) {
            return undefined;
        }

        input.value = displaySourceHex;
        const handleChange = () => {
            const normalizedHex = normalizeHexColor(input.value);
            if (normalizedHex) {
                onSetSourceHex(normalizedHex);
                return;
            }
            input.value = displaySourceHex;
        };

        input.addEventListener('change', handleChange);
        return () => input.removeEventListener('change', handleChange);
    }, [displaySourceHex, onSetSourceHex]);

    useEffect(() => {
        const sliderEntries = [
            ['hue', hueInputRef.current, hctValues.hue],
            ['chroma', chromaInputRef.current, hctValues.chroma],
            ['tone', toneInputRef.current, hctValues.tone]
        ];
        const cleanups = [];

        sliderEntries.forEach(([name, input, value]) => {
            if (!input) {
                return;
            }

            input.value = String(value);
            const handleInput = () => onSetHctValue(name, input.value);
            input.addEventListener('input', handleInput);
            cleanups.push(() => input.removeEventListener('input', handleInput));
        });

        return () => cleanups.forEach((cleanup) => cleanup());
    }, [hctValues, onSetHctValue]);

    useEffect(() => {
        const radios = schemeRadiosRef.current;
        if (radios) {
            radios.querySelectorAll('md-radio[name="theme-scheme"]').forEach((radio) => {
                radio.checked = radio.value === themeScheme;
            });
        }
    }, [themeMode, themeScheme]);

    useEffect(() => {
        const list = schemeListRef.current;
        if (!list) {
            return undefined;
        }

        let animationFrameId;
        let timeoutId;

        if (schemeListOpen && schemeListVisible) {
            list.style.maxHeight = '0px';
            animationFrameId = requestAnimationFrame(() => {
                list.classList.add('is-open');
                list.style.maxHeight = `${list.scrollHeight}px`;
            });
        } else if (!schemeListOpen && schemeListVisible) {
            list.classList.remove('is-open');
            list.style.maxHeight = `${list.scrollHeight}px`;
            void list.offsetHeight;
            animationFrameId = requestAnimationFrame(() => {
                list.style.maxHeight = '0px';
            });
            timeoutId = window.setTimeout(() => setSchemeListVisible(false), 300);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [schemeListOpen, schemeListVisible]);

    useEffect(() => {
        if (schemeListOpen) {
            setSchemeListVisible(true);
        }
    }, [schemeListOpen]);

    const handleSchemeToggle = () => {
        setSchemeListOpen((currentOpen) => !currentOpen);
    };

    const activeSchemeLabel = THEME_SCHEME_LABELS[themeScheme] || THEME_SCHEME_LABELS.vibrant;

    return (
        <section
            className={`theme-panel${panelExpanded ? ' is-open' : ''}`}
            id="theme-controls-panel"
            hidden={!panelVisible}
            ref={panelRef}
        >
            <div className="theme-panel__content">
                <div className="theme-panel__title-row">
                    <h2 className="theme-panel__title">Theme Controls</h2>
                    <md-text-button id="theme-reset-btn" onClick={onReset}>重置</md-text-button>
                </div>
                <div className="theme-card">
                    <label className="theme-card__label" htmlFor="theme-color-input">Hex Source Color</label>
                    <div className="theme-card__color-row">
                        <md-outlined-text-field
                            id="theme-color-text"
                            className="theme-card__hex-input"
                            label="Hex"
                            value={displaySourceHex}
                            ref={hexInputRef}
                        />
                        <input
                            type="color"
                            id="theme-color-input"
                            className="theme-card__picker"
                            value={displaySourceHex}
                            aria-label="选择主题色"
                            onChange={(event) => onSetSourceHex(event.target.value)}
                        />
                    </div>
                </div>
                <div className="theme-sliders">
                    <div className="theme-slider-group">
                        <label className="theme-slider" htmlFor="theme-hue-input">
                            <span>Hue</span>
                            <md-slider id="theme-hue-input" min="0" max="360" step="1" value={hctValues.hue} labeled ref={hueInputRef} />
                            <span className="theme-slider__track theme-slider__track--hue"></span>
                        </label>
                    </div>
                    <div className="theme-slider-group">
                        <label className="theme-slider" htmlFor="theme-chroma-input">
                            <span>Chroma</span>
                            <md-slider id="theme-chroma-input" min="0" max="150" step="1" value={hctValues.chroma} labeled ref={chromaInputRef} />
                            <span className="theme-slider__track theme-slider__track--chroma"></span>
                        </label>
                    </div>
                    <div className="theme-slider-group">
                        <label className="theme-slider" htmlFor="theme-tone-input">
                            <span>Tone</span>
                            <md-slider id="theme-tone-input" min="0" max="100" step="1" value={hctValues.tone} labeled ref={toneInputRef} />
                            <span className="theme-slider__track theme-slider__track--tone"></span>
                        </label>
                    </div>
                </div>
                <div className="theme-schemes" ref={schemeRadiosRef}>
                    <md-text-button
                        id="theme-scheme-toggle-btn"
                        aria-controls="theme-schemes-list"
                        aria-expanded={schemeListOpen}
                        onClick={handleSchemeToggle}
                    >
                        <span id="theme-scheme-toggle-label">配色方案：{activeSchemeLabel}</span>
                        <md-icon slot="icon">palette</md-icon>
                    </md-text-button>
                    <div
                        id="theme-schemes-list"
                        role="radiogroup"
                        aria-label="配色方案"
                        hidden={!schemeListVisible}
                        ref={schemeListRef}
                    >
                        {THEME_SCHEME_NAMES.map((schemeName) => (
                            <label className="theme-scheme-option" key={schemeName} onClick={() => {
                                onSetThemeScheme(schemeName);
                                setSchemeListOpen(false);
                            }}>
                                <md-radio
                                    name="theme-scheme"
                                    value={schemeName}
                                    checked={themeScheme === schemeName}
                                />
                                <span>{THEME_SCHEME_LABELS[schemeName]}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <md-outlined-segmented-button-set
                    className="theme-mode-toggle"
                    aria-label="主题模式"
                >
                    <md-outlined-segmented-button
                        data-theme-mode="light"
                        aria-label="浅色模式"
                        selected={themeMode === 'light'}
                        onClick={() => onSetThemeMode('light')}
                    >
                        <md-icon slot="icon">light_mode</md-icon>
                    </md-outlined-segmented-button>
                    <md-outlined-segmented-button
                        data-theme-mode="auto"
                        aria-label="自动模式"
                        selected={themeMode === 'auto'}
                        onClick={() => onSetThemeMode('auto')}
                    >
                        <md-icon slot="icon">brightness_auto</md-icon>
                    </md-outlined-segmented-button>
                    <md-outlined-segmented-button
                        data-theme-mode="dark"
                        aria-label="深色模式"
                        selected={themeMode === 'dark'}
                        onClick={() => onSetThemeMode('dark')}
                    >
                        <md-icon slot="icon">dark_mode</md-icon>
                    </md-outlined-segmented-button>
                </md-outlined-segmented-button-set>
            </div>
        </section>
    );
}

export default ThemePanel;
