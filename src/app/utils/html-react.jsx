import {createElement, useMemo} from 'react';

const ATTRIBUTE_NAME_MAP = {
    class: 'className',
    for: 'htmlFor',
    tabindex: 'tabIndex',
    colspan: 'colSpan',
    rowspan: 'rowSpan',
    readonly: 'readOnly',
    contenteditable: 'contentEditable',
    srcset: 'srcSet',
    viewbox: 'viewBox'
};

const BOOLEAN_ATTRIBUTES = new Set([
    'allowFullScreen',
    'async',
    'autoFocus',
    'autoPlay',
    'checked',
    'controls',
    'defer',
    'disabled',
    'formNoValidate',
    'hidden',
    'loop',
    'multiple',
    'muted',
    'noModule',
    'noValidate',
    'open',
    'playsInline',
    'readOnly',
    'required',
    'reversed',
    'selected'
]);

function toReactAttributeName(name) {
    const normalizedName = name.toLowerCase();
    return ATTRIBUTE_NAME_MAP[normalizedName] || name;
}

function convertAttributes(element) {
    const props = {};
    for (const attribute of element.attributes) {
        const name = toReactAttributeName(attribute.name);
        props[name] = BOOLEAN_ATTRIBUTES.has(name) && attribute.value === ''
            ? true
            : attribute.value;
    }
    return props;
}

function convertNode(node, key) {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const props = {
        ...convertAttributes(node),
        key
    };
    const children = Array.from(node.childNodes).map((child, index) => convertNode(child, `${key}-${index}`));
    return createElement(node.tagName.toLowerCase(), props, children);
}

export function htmlToReactNodes(html) {
    if (!html) {
        return [];
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    return Array.from(template.content.childNodes)
        .map((node, index) => convertNode(node, String(index)))
        .filter(Boolean);
}

export function HtmlContent({html}) {
    const nodes = useMemo(() => htmlToReactNodes(html), [html]);
    return nodes;
}
