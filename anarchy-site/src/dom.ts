/** Sélectionne un élément et échoue clairement s'il manque. */
export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Élément introuvable : ${selector}`);
  return el;
}

export function qsa<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function reduceMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Force un recalcul de mise en page pour relancer une animation CSS. */
export function reflow(el: HTMLElement): void {
  void el.offsetWidth;
}
