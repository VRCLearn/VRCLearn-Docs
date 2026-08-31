export function setCookie(name, value, maxAgeSeconds) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function getCookie(name) {
    const namePrefix = `${name}=`;
    const cookieEntries = document.cookie ? document.cookie.split('; ') : [];
    for (const entry of cookieEntries) {
        if (entry.startsWith(namePrefix)) {
            return decodeURIComponent(entry.slice(namePrefix.length));
        }
    }
    return null;
}

export function deleteCookie(name) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
