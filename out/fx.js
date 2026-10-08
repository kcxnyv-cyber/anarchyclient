import { reduceMotion } from "./dom";
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
/* ------------------------------------------------------------------ */
/* Compteur animé                                                      */
/* ------------------------------------------------------------------ */
export function countUp(el, to, duration = 1100) {
    if (reduceMotion()) {
        el.textContent = String(to);
        return;
    }
    const start = performance.now();
    const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = String(Math.round(to * easeOutCubic(t)));
        if (t < 1)
            requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
/* ------------------------------------------------------------------ */
/* Texte qui se « décrypte »                                           */
/* ------------------------------------------------------------------ */
const GLYPHS = "█▓▒░#%&@$<>/\\|{}[]";
const KEEP = new Set([" ", "-", "•", "'", ".", ","]);
export function scramble(el, finalText, duration = 700) {
    if (reduceMotion()) {
        el.textContent = finalText;
        return;
    }
    const start = performance.now();
    const chars = Array.from(finalText);
    const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const fixed = Math.floor(t * chars.length);
        el.textContent = chars
            .map((c, i) => (i < fixed || KEEP.has(c) ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
            .join("");
        if (t < 1)
            requestAnimationFrame(tick);
        else
            el.textContent = finalText;
    };
    requestAnimationFrame(tick);
}
/* ------------------------------------------------------------------ */
/* Apparition au scroll                                                */
/* ------------------------------------------------------------------ */
/**
 * Les éléments déjà visibles restent tels quels. Les autres apparaissent quand ils entrent
 * à l'écran. Un délai de sécurité les révèle de toute façon, pour ne jamais rester cachés.
 */
export function revealOnScroll(targets) {
    if (reduceMotion() || !("IntersectionObserver" in window))
        return;
    const pending = new Set();
    const show = (el) => {
        el.classList.add("in");
        pending.delete(el);
        el.addEventListener("transitionend", () => el.classList.remove("rv", "in"), { once: true });
    };
    const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting)
                continue;
            io.unobserve(entry.target);
            show(entry.target);
        }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((el, i) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92)
            return;
        el.classList.add("rv");
        el.style.setProperty("--d", `${(i % 4) * 70}ms`);
        pending.add(el);
        io.observe(el);
    });
    window.setTimeout(() => {
        pending.forEach((el) => {
            io.unobserve(el);
            show(el);
        });
    }, 5000);
}
/* ------------------------------------------------------------------ */
/* Inclinaison 3D au passage de la souris                              */
/* ------------------------------------------------------------------ */
export function tilt(host, target, maxDeg = 7) {
    if (reduceMotion())
        return;
    host.addEventListener("pointermove", (e) => {
        const r = host.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        target.style.transform = `perspective(900px) rotateY(${(px * maxDeg).toFixed(2)}deg) rotateX(${(-py * maxDeg).toFixed(2)}deg)`;
    });
    host.addEventListener("pointerleave", () => {
        target.style.transform = "";
    });
}
/* ------------------------------------------------------------------ */
/* Halo qui suit le curseur sur les cartes                             */
/* ------------------------------------------------------------------ */
export function spotlight() {
    document.addEventListener("pointermove", (e) => {
        const target = e.target;
        const card = target?.closest(".plan, .card, .summary");
        if (!card)
            return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
}
/* ------------------------------------------------------------------ */
/* Barre de progression du scroll                                      */
/* ------------------------------------------------------------------ */
export function scrollProgress(bar) {
    let ticking = false;
    const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? window.scrollY / max : 0;
        bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio)).toFixed(4)})`;
        ticking = false;
    };
    window.addEventListener("scroll", () => {
        if (ticking)
            return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });
    update();
}
export class ParticleField {
    canvas;
    ctx;
    particles = [];
    sparks = [];
    width = 0;
    height = 0;
    color = { r: 41, g: 199, b: 242 };
    mouse = { x: -9999, y: -9999 };
    raf = 0;
    last = 0;
    constructor(canvas) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("Canvas 2D indisponible");
        this.ctx = ctx;
    }
    start() {
        this.readColor();
        this.resize();
        window.addEventListener("resize", () => this.resize());
        window.addEventListener("pointermove", (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window
            .matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", () => window.setTimeout(() => this.readColor(), 60));
        document.addEventListener("visibilitychange", () => {
            if (document.hidden)
                this.halt();
            else
                this.run();
        });
        if (reduceMotion())
            this.frame(0);
        else
            this.run();
    }
    /** Gerbe de carrés qui retombent, à partir d'un point de l'écran. */
    burst(x, y, count = 42) {
        if (reduceMotion())
            return;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                size: 3 + Math.floor(Math.random() * 4),
                life: 0,
                maxLife: 900 + Math.random() * 700,
            });
        }
        this.run();
    }
    run() {
        if (this.raf || reduceMotion())
            return;
        this.last = performance.now();
        this.raf = requestAnimationFrame((t) => this.frame(t));
    }
    halt() {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
    }
    readColor() {
        const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
        const m = /^#([0-9a-f]{6})$/i.exec(value);
        if (!m)
            return;
        const n = parseInt(m[1], 16);
        this.color = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const target = Math.max(28, Math.min(95, Math.round((this.width * this.height) / 20000)));
        this.particles = Array.from({ length: target }, () => this.spawn(true));
    }
    spawn(anywhere) {
        const sizes = [2, 2, 3, 3, 4, 6];
        return {
            x: Math.random() * this.width,
            y: anywhere ? Math.random() * this.height : this.height + 10,
            size: sizes[Math.floor(Math.random() * sizes.length)],
            vx: (Math.random() - 0.5) * 0.12,
            vy: -(0.05 + Math.random() * 0.28),
            alpha: 0.1 + Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2,
        };
    }
    frame(now) {
        const dt = Math.min(48, now - this.last || 16);
        this.last = now;
        const { ctx, color } = this;
        ctx.clearRect(0, 0, this.width, this.height);
        for (const p of this.particles) {
            const dx = p.x - this.mouse.x;
            const dy = p.y - this.mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 14400 && d2 > 1) {
                const d = Math.sqrt(d2);
                const push = (120 - d) / 120;
                p.x += (dx / d) * push * 2.2;
                p.y += (dy / d) * push * 2.2;
            }
            p.x += p.vx * dt * 0.06 * 16;
            p.y += p.vy * dt * 0.06 * 16;
            p.phase += dt * 0.002;
            if (p.y < -10)
                Object.assign(p, this.spawn(false));
            if (p.x < -10)
                p.x = this.width + 10;
            if (p.x > this.width + 10)
                p.x = -10;
            const twinkle = 0.65 + 0.35 * Math.sin(p.phase);
            ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${(p.alpha * twinkle).toFixed(3)})`;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        this.sparks = this.sparks.filter((s) => s.life < s.maxLife);
        for (const s of this.sparks) {
            s.life += dt;
            s.vy += 0.22;
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.985;
            const a = 1 - s.life / s.maxLife;
            ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${a.toFixed(3)})`;
            ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
        }
        this.raf = reduceMotion() ? 0 : requestAnimationFrame((t) => this.frame(t));
    }
}
/* ------------------------------------------------------------------ */
/* Indicateur glissant sous le menu                                    */
/* ------------------------------------------------------------------ */
export function createNavIndicator(nav) {
    const ind = document.createElement("span");
    ind.className = "ind";
    nav.appendChild(ind);
    return (current) => {
        if (!current)
            return;
        ind.style.setProperty("--x", `${current.offsetLeft}px`);
        ind.style.setProperty("--w", `${current.offsetWidth}px`);
    };
}
