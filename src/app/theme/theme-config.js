export const USER_THEME_COOKIE_KEY = 'user_theme_source';
export const USER_THEME_MODE_COOKIE_KEY = 'user_theme_mode';
export const USER_THEME_SCHEME_COOKIE_KEY = 'user_theme_scheme';
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 20;
export const DEFAULT_THEME_SOURCE_HEX = '#6cb6ff';
export const DEFAULT_THEME_MODE = 'auto';
export const DEFAULT_THEME_SCHEME = 'vibrant';

export const THEME_SCHEME_LABELS = {
    'tonal-spot': '调性点缀',
    'fidelity': '高保真',
    'monochrome': '单色',
    'neutral': '中性',
    'vibrant': '活力',
    'expressive': '表现力',
    'content': '内容主题',
    'rainbow': '彩虹',
    'fruit-salad': '果缤纷'
};

export const THEME_SCHEME_NAMES = Object.keys(THEME_SCHEME_LABELS);

export const FULL_THEME_ROLE_NAMES = [
    'primary',
    'surface-tint',
    'on-primary',
    'primary-container',
    'on-primary-container',
    'secondary',
    'on-secondary',
    'secondary-container',
    'on-secondary-container',
    'tertiary',
    'on-tertiary',
    'tertiary-container',
    'on-tertiary-container',
    'error',
    'on-error',
    'error-container',
    'on-error-container',
    'background',
    'on-background',
    'surface',
    'on-surface',
    'surface-variant',
    'on-surface-variant',
    'outline',
    'outline-variant',
    'shadow',
    'scrim',
    'inverse-surface',
    'inverse-on-surface',
    'inverse-primary',
    'primary-fixed',
    'on-primary-fixed',
    'primary-fixed-dim',
    'on-primary-fixed-variant',
    'secondary-fixed',
    'on-secondary-fixed',
    'secondary-fixed-dim',
    'on-secondary-fixed-variant',
    'tertiary-fixed',
    'on-tertiary-fixed',
    'tertiary-fixed-dim',
    'on-tertiary-fixed-variant',
    'surface-dim',
    'surface-bright',
    'surface-container-lowest',
    'surface-container-low',
    'surface-container',
    'surface-container-high',
    'surface-container-highest'
];
