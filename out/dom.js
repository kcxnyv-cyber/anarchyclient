/** Sélectionne un élément et échoue clairement s'il manque. */
export function qs(selector, root = document) {
    const el = root.querySelector(selector);
    if (!el)
        throw new Error(`Élément introuvable : ${selector}`);
    return el;
}
export function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}
export function reduceMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/** Force un recalcul de mise en page pour relancer une animation CSS. */
export function reflow(el) {
    void el.offsetWidth;
}
