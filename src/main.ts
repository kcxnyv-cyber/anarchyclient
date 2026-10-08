import { CATEGORIES, MODULES, statusLabel } from "./data";
import type { Category, License, Status, View } from "./types";
import { qs, qsa, reduceMotion, reflow } from "./dom";
import {
  ParticleField,
  countUp,
  createNavIndicator,
  revealOnScroll,
  scramble,
  scrollProgress,
  spotlight,
  tilt,
} from "./fx";

const DAY = 86_400_000;
const NOW = Date.now();
const RING_LENGTH = 2 * Math.PI * 52;
const VIEWS: readonly View[] = ["home", "modules", "dashboard"];

const fmtShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const isView = (v: string): v is View => (VIEWS as readonly string[]).includes(v);

/* ------------------------------------------------------------------ */
/* Petits utilitaires                                                  */
/* ------------------------------------------------------------------ */
let toastTimer = 0;
function toast(message: string): void {
  const el = qs("#toast");
  el.textContent = message;
  el.classList.add("on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("on"), 2600);
}

function planLabel(days: number): string {
  if (days > 365) return "À vie";
  return days === 7 ? "Hebdomadaire · 7 jours" : "Mensuelle · 30 jours";
}

function makeLicense(days: number): License {
  return {
    key: "ANA-7K2Q-9XMD-4TLB-W8EA",
    planLabel: planLabel(days),
    totalDays: days,
    leftDays: days,
    lifetime: days > 365,
    boughtAt: Date.now(),
  };
}

function maskKey(key: string): string {
  const parts = key.split("-");
  return parts.map((p, i) => (i === 0 || i === parts.length - 1 ? p : "••••")).join("-");
}

/* ------------------------------------------------------------------ */
/* Fond animé                                                          */
/* ------------------------------------------------------------------ */
const field = new ParticleField(qs<HTMLCanvasElement>("#bg"));
field.start();
scrollProgress(qs("#prog"));
spotlight();

/* ------------------------------------------------------------------ */
/* Statistiques                                                        */
/* ------------------------------------------------------------------ */
const okCount = MODULES.filter((m) => m.status === "ok").length;
const badCount = MODULES.length - okCount;

function animateHeroFacts(): void {
  countUp(qs("#fTotal"), MODULES.length, 1300);
  countUp(qs("#fOk"), okCount, 1300);
  countUp(qs("#fVer"), 3, 900);
}

function animateModuleStats(): void {
  countUp(qs("#sOk"), okCount);
  countUp(qs("#sBad"), badCount);
  countUp(qs("#sAll"), MODULES.length);
  const rOk = qs("#rOk");
  const rBad = qs("#rBad");
  rOk.style.width = "0%";
  rBad.style.width = "0%";
  reflow(rOk);
  requestAnimationFrame(() => {
    rOk.style.width = `${(okCount / MODULES.length) * 100}%`;
    rBad.style.width = `${(badCount / MODULES.length) * 100}%`;
  });
}

/* ------------------------------------------------------------------ */
/* Aperçu du menu en jeu (accueil)                                     */
/* ------------------------------------------------------------------ */
type PanelDef = readonly [Category, readonly string[], readonly string[]];

const PANELS: readonly PanelDef[] = [
  ["Combat", ["AutoCrystal", "Aimbot", "AutoTotem", "AutoInvTotem", "AutoArmor", "Criticals"], ["AutoInvTotem"]],
  ["Render", ["HUD", "Fullbright", "PlayerESP", "Nametags", "Xray", "Freecam"], ["HUD", "Fullbright", "PlayerESP", "Nametags"]],
];

function buildGui(): void {
  const host = qs("#guis");
  host.innerHTML = PANELS.map(([cat, names, enabled]) => {
    const total = MODULES.filter((m) => m.cat === cat).length;
    const rows = names
      .map((name, i) => {
        const on = enabled.includes(name);
        return `<div class="gp-row${on ? " on" : ""}" style="--i:${i}"><span class="name">${name}</span><button class="sw" role="switch" aria-label="${name}" aria-checked="${on}"></button></div>`;
      })
      .join("");
    return `<div class="gp" data-total="${total}"><div class="gp-head"><span>${cat}</span><span class="cnt"></span></div>${rows}</div>`;
  }).join("");

  qsa(".gp", host).forEach((panel) => {
    const counter = qs(".cnt", panel);
    const refresh = (): void => {
      counter.textContent = `${qsa(".gp-row.on", panel).length}/${panel.dataset.total ?? "0"}`;
    };
    refresh();
    qsa<HTMLButtonElement>(".sw", panel).forEach((sw) => {
      sw.addEventListener("click", () => {
        const on = sw.getAttribute("aria-checked") !== "true";
        sw.setAttribute("aria-checked", String(on));
        sw.parentElement?.classList.toggle("on", on);
        sw.classList.remove("pop");
        reflow(sw);
        sw.classList.add("pop");
        refresh();
      });
    });
  });

  tilt(qs(".hero"), host);
}

function buildMarquee(): void {
  const items = MODULES.map(
    (m) => `<span class="mq"><i class="pd" style="color:var(--${m.status === "ok" ? "ok" : "bad"})"></i>${m.name}</span>`,
  ).join("");
  qs("#track").innerHTML = items + items;
}

/* ------------------------------------------------------------------ */
/* Liste des modules                                                   */
/* ------------------------------------------------------------------ */
const filters = {
  status: "all" as "all" | Status,
  cat: "Toutes" as "Toutes" | Category,
  query: "",
};

function renderList(): void {
  const rows = MODULES.filter(
    (m) =>
      (filters.status === "all" || m.status === filters.status) &&
      (filters.cat === "Toutes" || m.cat === filters.cat) &&
      (filters.query === "" || `${m.name} ${m.desc}`.toLowerCase().includes(filters.query)),
  );
  const head =
    '<div class="mrow th"><span>Module</span><span>Catégorie</span><span>Description</span><span>Vérifié le</span><span>Statut</span></div>';
  const body = rows.length
    ? rows
        .map(
          (m, i) =>
            `<div class="mrow" style="--i:${Math.min(i, 26)}"><span class="n">${m.name}</span><span class="c">${m.cat}</span><span class="d">${m.desc}</span><span class="t num">${fmtShort.format(m.checkedAt)}</span><span class="pill ${m.status}"><i class="pd"></i>${statusLabel(m.status)}</span></div>`,
        )
        .join("")
    : '<div class="empty">Aucun module ne correspond à ces filtres.</div>';
  qs("#mlist").innerHTML = head + body;
}

function mountChips(
  host: HTMLElement,
  items: ReadonlyArray<readonly [string, string]>,
  get: () => string,
  set: (value: string) => void,
): void {
  const draw = (): void => {
    host.innerHTML = items
      .map(([value, label]) => `<button class="chip" data-v="${value}" aria-pressed="${get() === value}">${label}</button>`)
      .join("");
    qsa<HTMLButtonElement>(".chip", host).forEach((chip) => {
      chip.addEventListener("click", () => {
        set(chip.dataset.v ?? "");
        draw();
        renderList();
      });
    });
  };
  draw();
}

function buildModulesView(): void {
  mountChips(
    qs("#statusChips"),
    [
      ["all", "Tous"],
      ["ok", "Undetected"],
      ["bad", "Detected"],
    ],
    () => filters.status,
    (v) => {
      filters.status = v === "ok" || v === "bad" ? v : "all";
    },
  );
  mountChips(
    qs("#catChips"),
    [["Toutes", "Toutes"], ...CATEGORIES.map((c) => [c, c] as const)],
    () => filters.cat,
    (v) => {
      filters.cat = (CATEGORIES as readonly string[]).includes(v) ? (v as Category) : "Toutes";
    },
  );
  qs<HTMLInputElement>("#q").addEventListener("input", (e) => {
    filters.query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    renderList();
  });
  renderList();
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
let license: License = {
  ...makeLicense(30),
  leftDays: 23,
  boughtAt: NOW - 7 * DAY,
};
let keyShown = false;

function paintKey(): void {
  qs("#key").textContent = keyShown ? license.key : maskKey(license.key);
  qs("#revealKey").textContent = keyShown ? "Masquer" : "Afficher";
}

function paintLicense(): void {
  const l = license;
  qs("#planName").textContent = l.planLabel;
  qs("#boughtOn").textContent = fmtLong.format(l.boughtAt);
  qs("#endsOn").textContent = l.lifetime ? "jamais" : fmtLong.format(l.boughtAt + l.totalDays * DAY);
  qs("#daysLbl").textContent = l.lifetime ? "licence à vie" : "jours restants";

  const days = qs("#daysLeft");
  if (l.lifetime) days.textContent = "∞";
  else countUp(days, l.leftDays, 1300);

  const fraction = l.lifetime ? 1 : l.leftDays / l.totalDays;
  const ring = qs<SVGCircleElement>("#ringVal");
  qs<SVGSVGElement>("#ring").classList.toggle("low", !l.lifetime && l.leftDays <= 3);
  ring.style.strokeDashoffset = String(RING_LENGTH);
  reflow(ring as unknown as HTMLElement);
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = String(RING_LENGTH * (1 - fraction));
  });

  countUp(qs("#dOk"), okCount, 1100);
  qs("#dBad").textContent = String(badCount);
  paintKey();
}

function hwidIdle(): void {
  const area = qs("#hwidArea");
  area.innerHTML = '<button class="btn small danger" id="hwidAsk">Réinitialiser l\'appareil</button>';
  qs("#hwidAsk").addEventListener("click", hwidConfirm);
}

function hwidConfirm(): void {
  const area = qs("#hwidArea");
  area.innerHTML =
    '<div class="confirm"><span style="color:var(--muted);font-size:14px">Ton reset du mois sera utilisé.</span><button class="btn small danger" id="hwidYes">Confirmer</button><button class="btn small" id="hwidNo">Annuler</button></div>';
  qs("#hwidYes").addEventListener("click", () => {
    area.innerHTML = '<span class="pill ok"><i class="pd"></i>Appareil réinitialisé</span>';
    toast("Reset effectué (exemple)");
  });
  qs("#hwidNo").addEventListener("click", hwidIdle);
}

function buildDashboard(): void {
  const keyBox = qs("#key");
  qs("#revealKey").addEventListener("click", () => {
    keyShown = !keyShown;
    if (keyShown) {
      scramble(keyBox, license.key, 650);
      qs("#revealKey").textContent = "Masquer";
    } else {
      paintKey();
    }
  });

  qs("#copyKey").addEventListener("click", () => {
    const fallback = (): void => {
      keyShown = true;
      paintKey();
      const range = document.createRange();
      range.selectNodeContents(keyBox);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      toast("Sélectionnée : copie-la avec Ctrl+C");
    };
    keyBox.classList.remove("flash");
    reflow(keyBox);
    keyBox.classList.add("flash");
    try {
      void navigator.clipboard.writeText(license.key).then(() => toast("Clé copiée"), fallback);
    } catch {
      fallback();
    }
  });

  qs("#extend").addEventListener("click", () => {
    show("home");
    window.setTimeout(goPricing, 80);
  });
  qsa<HTMLButtonElement>("[data-dl]").forEach((b) =>
    b.addEventListener("click", () => toast("Exemple : ajoute ici le lien de ton fichier .jar")),
  );
  hwidIdle();
}

/* ------------------------------------------------------------------ */
/* Offres                                                              */
/* ------------------------------------------------------------------ */
function goPricing(): void {
  qs("#pricing").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
}

function buildPricing(): void {
  qs("#goPricing").addEventListener("click", goPricing);
  qsa<HTMLButtonElement>("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rect = btn.getBoundingClientRect();
      field.burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
      license = makeLicense(Number(btn.dataset.buy));
      keyShown = false;
      show("dashboard");
      toast("Exemple : le paiement n'est pas encore branché");
    });
  });
}

/* ------------------------------------------------------------------ */
/* Navigation entre les vues                                           */
/* ------------------------------------------------------------------ */
const moveIndicator = createNavIndicator(qs(".nav"));
const armed = new Set<View>();

const REVEAL_TARGETS: Record<View, string> = {
  home: ".marquee, .feats > div, #pricing .head, .plan",
  modules: ".summary, .tools, #catChips, .list",
  dashboard: ".card",
};

function scrambleTitle(view: View): void {
  const title = qs(".page-head h1", qs(`#view-${view}`));
  const original = title.dataset.text ?? (title.dataset.text = title.textContent ?? "");
  scramble(title, original, 600);
}

function show(view: View, updateHash = true): void {
  VIEWS.forEach((v) => {
    qs(`#view-${v}`).hidden = v !== view;
  });
  const section = qs(`#view-${view}`);
  section.classList.remove("enter");
  reflow(section);
  section.classList.add("enter");

  let current: HTMLElement | null = null;
  qsa<HTMLButtonElement>(".nav button").forEach((b) => {
    const active = b.dataset.view === view;
    if (active) {
      b.setAttribute("aria-current", "page");
      current = b;
    } else {
      b.removeAttribute("aria-current");
    }
  });
  moveIndicator(current);
  window.scrollTo(0, 0);

  if (view === "modules") {
    animateModuleStats();
    renderList();
    scrambleTitle(view);
  } else if (view === "dashboard") {
    paintLicense();
    scrambleTitle(view);
  }

  if (!armed.has(view)) {
    armed.add(view);
    revealOnScroll(qsa(REVEAL_TARGETS[view], section));
  }

  if (updateHash) {
    try {
      history.replaceState(null, "", `#${view}`);
    } catch {
      /* l'aperçu peut refuser l'historique */
    }
  }
}

function buildNav(): void {
  qsa<HTMLButtonElement>("[data-view]").forEach((b) => {
    b.addEventListener("click", () => {
      const v = b.dataset.view ?? "home";
      show(isView(v) ? v : "home");
    });
  });
  window.addEventListener("hashchange", () => {
    const h = window.location.hash.slice(1);
    show(isView(h) ? h : "home", false);
  });
  window.addEventListener("resize", () => {
  moveIndicator(
    qs<HTMLElement>(".nav button[aria-current='page']")
  );
  });
}

/* ------------------------------------------------------------------ */
/* Démarrage                                                           */
/* ------------------------------------------------------------------ */
function boot(): void {
  buildGui();
  buildMarquee();
  buildModulesView();
  buildDashboard();
  buildPricing();
  buildNav();
  paintKey();
  animateHeroFacts();

  const initial = window.location.hash.slice(1);
  show(isView(initial) ? initial : "home", false);
  void document.fonts?.ready.then(() => moveIndicator(document.querySelector<HTMLElement>(".nav button[aria-current='page']")));
}

boot();
