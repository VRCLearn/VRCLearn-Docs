import {
    argbFromHex,
    Hct,
    hexFromArgb,
    MaterialDynamicColors,
    SchemeContent,
    SchemeExpressive,
    SchemeFidelity,
    SchemeFruitSalad,
    SchemeMonochrome,
    SchemeNeutral,
    SchemeRainbow,
    SchemeTonalSpot,
    SchemeVibrant
} from '@material/material-color-utilities';
import {FULL_THEME_ROLE_NAMES} from './theme-config.js';

function kebabToCamelCase(value) {
    return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function getScheme(sourceHct, isDark, schemeName) {
    switch (schemeName) {
        case 'fidelity':
            return new SchemeFidelity(sourceHct, isDark, 0);
        case 'monochrome':
            return new SchemeMonochrome(sourceHct, isDark, 0);
        case 'neutral':
            return new SchemeNeutral(sourceHct, isDark, 0);
        case 'vibrant':
            return new SchemeVibrant(sourceHct, isDark, 0);
        case 'expressive':
            return new SchemeExpressive(sourceHct, isDark, 0);
        case 'content':
            return new SchemeContent(sourceHct, isDark, 0);
        case 'rainbow':
            return new SchemeRainbow(sourceHct, isDark, 0);
        case 'fruit-salad':
            return new SchemeFruitSalad(sourceHct, isDark, 0);
        case 'tonal-spot':
        default:
            return new SchemeTonalSpot(sourceHct, isDark, 0);
    }
}

export function buildFullMaterialThemeCss(sourceHex, isDark, schemeName) {
    const sourceArgb = argbFromHex(sourceHex);
    const sourceHct = Hct.fromInt(sourceArgb);
    const scheme = getScheme(sourceHct, isDark, schemeName);
    const colors = new MaterialDynamicColors();

    const declarations = FULL_THEME_ROLE_NAMES.map((roleName) => {
        const accessorName = kebabToCamelCase(roleName);
        const dynamicColor = colors[accessorName]?.();
        if (!dynamicColor) {
            return null;
        }
        const value = hexFromArgb(dynamicColor.getArgb(scheme));
        return `--md-sys-color-${roleName}: ${value};`;
    }).filter(Boolean);

    return `:root {\n    ${declarations.join('\n    ')}\n}`;
}
