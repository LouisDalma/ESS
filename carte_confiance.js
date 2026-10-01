// =============================================================================
// Carte de la confiance en Europe : composant interactif de la page d'accueil
//
// Lit les résultats agrégés produits par acm_accueil.R (data/acm_confiance.json)
// et dessine, avec d3, une carte factorielle interactive :
//   - vue « Les pays » : chaque pays au barycentre de ses répondants ;
//   - vue « Les institutions » : les 21 modalités de l'ACM (7 institutions x 3
//     niveaux de confiance), reliées par institution.
// Un panneau latéral montre le profil de confiance du pays survolé ou épinglé.
//
// Utilisation dans une cellule {ojs} :
//   import { carteConfiance } from "./carte_confiance.js"
//   carteConfiance(await FileAttachment("data/acm_confiance.json").json(),
//                  { d3, invalidation })
// =============================================================================

const NIVEAUX = [
  { id: "faible",  label: "Faible",  detail: "0 à 3",  couleur: "var(--cc-faible)" },
  { id: "moyenne", label: "Moyenne", detail: "4 à 6",  couleur: "var(--cc-moyenne)" },
  { id: "forte",   label: "Forte",   detail: "7 à 10", couleur: "var(--cc-forte)" }
];

const PAYS_PAR_DEFAUT = "FR";
const LIEN_METHODE = "traitement_avance_r.qmd";

// L'état survit aux redessins (changement de largeur de la fenêtre)
const etat = { vue: "pays", epingle: PAYS_PAR_DEFAUT };

const fmtEntier = (n) => n.toLocaleString("fr-FR");
const fmtPct = (v) => `${Math.round(v)} %`;
const fmtCoord = (v) => (Math.abs(v) < 0.005 ? 0 : v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// -----------------------------------------------------------------------------
// Styles (injectés une seule fois dans la page)
// -----------------------------------------------------------------------------
const CSS = `
.cc-root {
  --cc-ink: #1b1b1a;
  --cc-ink-2: #52514e;
  --cc-muted: #7d7b75;
  --cc-grid: #e6e5df;
  --cc-axis: #cfcec6;
  --cc-card: #ffffff;
  --cc-card-border: rgba(11, 11, 11, 0.09);
  --cc-wash: #f6f6f3;
  --cc-pays: #3a3935;
  --cc-faible: #e34948;
  --cc-moyenne: #a8a69d;
  --cc-forte: #2a78d6;
  --cc-focus: #2a78d6;
  font-family: inherit;
  color: var(--cc-ink);
  margin: 1.5rem 0 2.5rem;
}
.quarto-dark .cc-root {
  --cc-ink: #f4f4f2;
  --cc-ink-2: #c3c2b7;
  --cc-muted: #9a9890;
  --cc-grid: #2c2c2a;
  --cc-axis: #45453f;
  --cc-card: #1a1a19;
  --cc-card-border: rgba(255, 255, 255, 0.10);
  --cc-wash: #222220;
  --cc-pays: #e9e8e3;
  --cc-faible: #e66767;
  --cc-moyenne: #8f8d85;
  --cc-forte: #3987e5;
  --cc-focus: #3987e5;
}
.cc-kicker {
  font-size: .78rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  color: var(--cc-muted); margin: 0 0 .35rem;
}
.cc-title { font-size: 1.55rem; font-weight: 700; line-height: 1.2; margin: 0 0 .5rem; }
.cc-lede { color: var(--cc-ink-2); max-width: 46rem; margin: 0 0 1.1rem; line-height: 1.55; }
.cc-controls {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: .75rem 1.5rem; margin-bottom: .75rem;
}
.cc-seg {
  display: inline-flex; padding: 3px; border-radius: 999px; background: var(--cc-wash);
  border: 1px solid var(--cc-card-border);
}
.cc-seg button {
  font: inherit; font-size: .88rem; border: 0; background: transparent; color: var(--cc-ink-2);
  padding: .38rem .95rem; border-radius: 999px; cursor: pointer; transition: background .2s, color .2s;
}
.cc-seg button[aria-pressed="true"] {
  background: var(--cc-card); color: var(--cc-ink); font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 0 0 1px var(--cc-card-border);
}
.cc-seg button:focus-visible { outline: 2px solid var(--cc-focus); outline-offset: 2px; }
.cc-legend { display: flex; flex-wrap: wrap; gap: .35rem 1rem; font-size: .82rem; color: var(--cc-ink-2); }
.cc-legend span { display: inline-flex; align-items: center; gap: .4rem; white-space: nowrap; }
.cc-sw { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.cc-body > * { grid-column: auto; }
.cc-body { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.25rem; align-items: start; }
@media (min-width: 900px) {
  .cc-body { grid-template-columns: minmax(0, 2.1fr) minmax(250px, 1fr); }
}
.cc-fig { position: relative; min-width: 0; }
.cc-fig svg { display: block; width: 100%; height: auto; overflow: visible; touch-action: manipulation; }
.cc-fig text { font-family: inherit; }
.cc-fig .cc-pt { cursor: pointer; }
.cc-fig .cc-pt:focus { outline: none; }
.cc-fig .cc-pt:focus-visible .cc-ring { stroke: var(--cc-focus); stroke-width: 2.5; }
.cc-tip {
  position: absolute; pointer-events: none; z-index: 5;
  background: var(--cc-card); color: var(--cc-ink);
  border: 1px solid var(--cc-card-border); border-radius: 10px;
  box-shadow: 0 6px 22px rgba(0,0,0,.12);
  padding: .5rem .7rem; font-size: .82rem; line-height: 1.4; max-width: 240px;
  opacity: 0; transform: translateY(4px); transition: opacity .15s, transform .15s;
}
.cc-tip.is-on { opacity: 1; transform: none; }
.cc-tip > b:first-child { font-size: .92rem; }
.cc-tip .cc-tip-sub { color: var(--cc-ink-2); }
.cc-hint { font-size: .78rem; color: var(--cc-muted); margin: .35rem 0 0; }
.cc-panel {
  background: var(--cc-card); border: 1px solid var(--cc-card-border); border-radius: 14px;
  padding: 1rem 1.1rem 1.1rem; min-width: 0;
}
.cc-panel-kicker { font-size: .74rem; color: var(--cc-muted); text-transform: uppercase; letter-spacing: .07em; margin: 0; }
.cc-panel-title { color: var(--cc-ink); font-size: 1.3rem; font-weight: 700; margin: .1rem 0 .15rem; display: flex; align-items: center; gap: .5rem; }
.cc-pin { font-size: .7rem; font-weight: 600; color: var(--cc-ink-2); border: 1px solid var(--cc-card-border); border-radius: 999px; padding: .05rem .5rem; }
.cc-panel-meta { font-size: .82rem; color: var(--cc-ink-2); margin: 0 0 .8rem; }
.cc-panel-q { font-size: .8rem; color: var(--cc-muted); margin: 0 0 .5rem; }
.cc-rows { display: grid; gap: .55rem; }
.cc-row { display: grid; grid-template-columns: 7.2rem minmax(0,1fr) 2.6rem; align-items: center; gap: .6rem; font-size: .82rem; }
.cc-row-label { color: var(--cc-ink-2); line-height: 1.15; }
.cc-row-val { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.cc-bar { position: relative; display: flex; gap: 2px; height: 12px; }
.cc-seg-bar { height: 100%; transition: flex-basis .45s cubic-bezier(.4,0,.2,1); min-width: 0; }
.cc-seg-bar:first-child { border-radius: 4px 0 0 4px; }
.cc-seg-bar:last-child { border-radius: 0 4px 4px 0; }
.cc-tick {
  position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px;
  background: var(--cc-ink); border-radius: 1px; transition: left .45s cubic-bezier(.4,0,.2,1);
}
.cc-panel-legend { display: flex; flex-wrap: wrap; gap: .3rem .8rem; font-size: .75rem; color: var(--cc-ink-2); margin-top: .9rem; }
.cc-panel-legend span { display: inline-flex; align-items: center; gap: .35rem; }
.cc-sq { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.cc-tickkey { width: 2px; height: 12px; background: var(--cc-ink); display: inline-block; border-radius: 1px; }
.cc-foot { margin-top: 1rem; font-size: .8rem; color: var(--cc-muted); }
.cc-foot details { margin-top: .6rem; }
.cc-foot summary { cursor: pointer; color: var(--cc-ink-2); font-weight: 600; }
.cc-foot details > div { color: var(--cc-ink-2); font-size: .88rem; line-height: 1.55; max-width: 48rem; padding: .5rem 0 0; }
.cc-table-wrap { overflow-x: auto; margin-top: .5rem; }
.cc-table { border-collapse: collapse; font-size: .8rem; font-variant-numeric: tabular-nums; }
.cc-table th, .cc-table td { padding: .3rem .6rem; border-bottom: 1px solid var(--cc-grid); text-align: right; white-space: nowrap; }
.cc-table th:first-child, .cc-table td:first-child { text-align: left; }
.cc-table th { color: var(--cc-ink-2); font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .cc-root * { transition: none !important; }
}
`;

function injecterStyles() {
  if (document.getElementById("cc-styles")) return;
  const style = document.createElement("style");
  style.id = "cc-styles";
  style.textContent = CSS;
  document.head.appendChild(style);
}

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const e of enfants.flat()) if (e != null) n.append(e);
  return n;
}

// -----------------------------------------------------------------------------
// Placement des étiquettes sans chevauchement (glouton, 16 positions candidates)
// -----------------------------------------------------------------------------
function mesureur() {
  const ctx = document.createElement("canvas").getContext("2d");
  const famille = getComputedStyle(document.body).fontFamily || "sans-serif";
  return (texte, taille, gras) => {
    ctx.font = `${gras ? 700 : 400} ${taille}px ${famille}`;
    return ctx.measureText(texte).width;
  };
}

function chevauche(a, b, marge = 1) {
  return a.x0 < b.x1 + marge && a.x1 + marge > b.x0 && a.y0 < b.y1 + marge && a.y1 + marge > b.y0;
}

function placerEtiquettes(items, obstacles, cadre) {
  // items : { id, px, py, r, texte, largeur, hauteur, priorite }
  const places = [];
  const resultat = new Map();
  const tri = [...items].sort((a, b) => b.priorite - a.priorite);
  for (const it of tri) {
    const w = it.largeur, h = it.hauteur, g = it.r + 4;
    const candidats = [];
    for (const f of [1, 1.9, 3.3]) {
      const d = g * f;
      const lien = f > 2;
      candidats.push(
        { dx: d, dy: 0, ancre: "start", lien },
        { dx: -d, dy: 0, ancre: "end", lien },
        { dx: 0, dy: -d - h / 2, ancre: "middle", lien },
        { dx: 0, dy: d + h / 2, ancre: "middle", lien },
        { dx: d * 0.75, dy: -d * 0.75 - h / 3, ancre: "start", lien },
        { dx: -d * 0.75, dy: -d * 0.75 - h / 3, ancre: "end", lien },
        { dx: d * 0.75, dy: d * 0.75 + h / 3, ancre: "start", lien },
        { dx: -d * 0.75, dy: d * 0.75 + h / 3, ancre: "end", lien }
      );
    }
    let retenu = null;
    for (const c of candidats) {
      const cx = it.px + c.dx, cy = it.py + c.dy;
      const x0 = c.ancre === "start" ? cx : c.ancre === "end" ? cx - w : cx - w / 2;
      const boite = { x0, x1: x0 + w, y0: cy - h / 2, y1: cy + h / 2 };
      if (boite.x0 < cadre.x0 || boite.x1 > cadre.x1 || boite.y0 < cadre.y0 || boite.y1 > cadre.y1) continue;
      if (places.some((p) => chevauche(p, boite))) continue;
      if (obstacles.some((o) => o.id !== it.id && chevauche(o, boite, 0))) continue;
      retenu = { x: cx, y: cy, ancre: c.ancre, boite, lien: c.lien };
      break;
    }
    if (retenu) {
      places.push(retenu.boite);
      resultat.set(it.id, { ...retenu, visible: true });
    } else {
      resultat.set(it.id, { x: it.px, y: it.py, ancre: "start", visible: false, lien: false });
    }
  }
  return resultat;
}

// -----------------------------------------------------------------------------
// Le composant
// -----------------------------------------------------------------------------
export function carteConfiance(data, { d3, invalidation, lien = LIEN_METHODE } = {}) {
  injecterStyles();
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duree = reduit ? 0 : 850;

  const institutions = data.institutions;
  const instParId = new Map(institutions.map((d) => [d.id, d]));
  const pays = data.pays.map((d) => ({ ...d }));
  const paysParCode = new Map(pays.map((d) => [d.code, d]));
  const modalites = data.modalites.map((d) => ({ ...d, id: `${d.inst}_${d.niveau}` }));
  const nbPays = data.meta.n_pays;

  // Institutions triées par part de confiance forte dans l'ensemble des pays
  const ordreInst = [...institutions].sort((a, b) => data.europe[b.id].forte - data.europe[a.id].forte);

  // --- Structure statique ---------------------------------------------------------
  const boutonPays = el("button", { type: "button", "aria-pressed": "true" }, "Les pays");
  const boutonInst = el("button", { type: "button", "aria-pressed": "false" }, "Les institutions");
  const legende = el("div", { class: "cc-legend", "aria-label": "Niveaux de confiance" },
    NIVEAUX.map((n) => el("span", {},
      el("i", { class: "cc-sw", style: `background:${n.couleur}` }),
      `${n.label} (${n.detail})`)));
  legende.style.display = "none";

  const fig = el("div", { class: "cc-fig" });
  const tip = el("div", { class: "cc-tip", role: "status", "aria-live": "polite" });
  const indice = el("p", { class: "cc-hint" });
  const note = el("p", { class: "cc-hint" },
    `Axe horizontal : ${fmtPct(data.meta.inertie.axe1)} de l'information résumée ; axe vertical : ${fmtPct(data.meta.inertie.axe2)}.`);
  fig.append(tip);
  const panneau = el("div", { class: "cc-panel", "aria-live": "polite" });

  const root = el("div", { class: "cc-root" },
    el("p", { class: "cc-kicker" }, "L'ESS en un coup d'œil"),
    el("p", { class: "cc-title" }, "La carte de la confiance en Europe"),
    el("p", { class: "cc-lede" },
      `Chaque point est un pays. Sa position résume la confiance que ses habitants accordent à sept institutions, de la police aux Nations unies : plus un pays est à droite, plus cette confiance est élevée. Deux pays proches ont des profils de réponse proches.`),
    el("div", { class: "cc-controls" },
      el("div", { class: "cc-seg", role: "group", "aria-label": "Choisir la vue" }, boutonPays, boutonInst),
      legende),
    el("div", { class: "cc-body" }, el("div", {}, fig, indice, note), panneau),
    piedDePage()
  );

  boutonPays.addEventListener("click", () => changerVue("pays"));
  boutonInst.addEventListener("click", () => changerVue("institutions"));

  // --- Dessin (refait à chaque changement de largeur) ------------------------------
  let largeurCourante = 0;
  let api = null;
  const observateur = new ResizeObserver(() => {
    const w = Math.round(fig.clientWidth);
    if (w > 0 && Math.abs(w - largeurCourante) > 4) {
      largeurCourante = w;
      api = dessiner(w);
    }
  });
  observateur.observe(fig);
  if (invalidation) invalidation.then(() => observateur.disconnect());

  majPanneau(paysParCode.get(etat.epingle));

  function changerVue(vue) {
    if (vue === etat.vue) return;
    etat.vue = vue;
    boutonPays.setAttribute("aria-pressed", String(vue === "pays"));
    boutonInst.setAttribute("aria-pressed", String(vue === "institutions"));
    if (api) api.transition(vue);
  }

  function dessiner(W) {
    fig.querySelector("svg")?.remove();
    const mesurer = mesureur();
    const petit = W < 560;
    const H = Math.round(Math.max(340, Math.min(W * (petit ? 0.92 : 0.64), 620)));
    const m = { t: 34, r: 16, b: petit ? 50 : 34, l: 16 };
    const taillePays = petit ? 10.5 : 12.5;

    // Échelles à rapport d'aspect 1:1 (indispensable pour lire des distances)
    function echelles(vue) {
      const pts = vue === "pays" ? pays : modalites.concat(pays);
      const [x0, x1] = d3.extent(pts, (d) => d.x);
      const [y0, y1] = d3.extent(pts, (d) => d.y);
      const px = (x1 - x0) * (vue === "pays" ? 0.08 : 0.1);
      const py = (y1 - y0) * (vue === "pays" ? 0.3 : 0.1);
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const k = Math.min(iw / (x1 - x0 + 2 * px), ih / (y1 - y0 + 2 * py));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return {
        x: d3.scaleLinear().domain([cx - iw / 2 / k, cx + iw / 2 / k]).range([m.l, W - m.r]),
        y: d3.scaleLinear().domain([cy - ih / 2 / k, cy + ih / 2 / k]).range([H - m.b, m.t])
      };
    }

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", W).attr("height", H)
      .attr("role", "img")
      .attr("aria-label", `Carte factorielle de la confiance dans ${institutions.length} institutions, ${nbPays} pays`);

    // Fond : un léger dégradé qui traduit le sens de l'axe horizontal
    const idGrad = `cc-grad-${Math.random().toString(36).slice(2, 8)}`;
    const grad = svg.append("defs").append("linearGradient").attr("id", idGrad);
    grad.append("stop").attr("offset", "0%").attr("stop-color", "var(--cc-faible)").attr("stop-opacity", 0.09);
    grad.append("stop").attr("offset", "50%").attr("stop-color", "var(--cc-faible)").attr("stop-opacity", 0);
    grad.append("stop").attr("offset", "50%").attr("stop-color", "var(--cc-forte)").attr("stop-opacity", 0);
    grad.append("stop").attr("offset", "100%").attr("stop-color", "var(--cc-forte)").attr("stop-opacity", 0.09);
    svg.append("rect").attr("x", 0.5).attr("y", 0.5).attr("width", W - 1).attr("height", H - 1)
      .attr("rx", 14).attr("fill", `url(#${idGrad})`)
      .attr("stroke", "var(--cc-card-border)");

    const gAxes = svg.append("g");
    const gSens = svg.append("g").attr("font-size", 11.5).attr("fill", "var(--cc-muted)");
    const gZone = svg.append("g");
    const gInst = svg.append("g");
    const gOrigine = svg.append("g");
    const gPays = svg.append("g");
    const gEtiq = svg.append("g").attr("pointer-events", "none");
    const gInstEtiq = svg.append("g").attr("pointer-events", "none");
    const gSurvol = svg.append("g").attr("pointer-events", "none");

    // Axes : deux filets passant par l'origine (le répondant moyen)
    const axeX = gAxes.append("line").attr("stroke", "var(--cc-axis)").attr("stroke-width", 1);
    const axeY = gAxes.append("line").attr("stroke", "var(--cc-axis)").attr("stroke-width", 1);

    // Sens des axes, écrits le long des deux filets (repositionnés à chaque vue)
    const sensGauche = gSens.append("text").attr("font-weight", 600).attr("fill", "var(--cc-ink-2)").text("← Défiance");
    const sensDroite = gSens.append("text").attr("text-anchor", "end").attr("font-weight", 600).attr("fill", "var(--cc-ink-2)").text("Confiance →");
    const sensHaut = gSens.append("text").text("↑ Réponses tranchées");
    const sensBas = gSens.append("text").text("↓ Réponses modérées");
    const largeurSens = { g: mesurer("← Défiance", 11.5, true), d: mesurer("Confiance →", 11.5, true) };

    // Origine : le profil moyen de l'ensemble des répondants
    const origine = gOrigine.append("g");
    origine.append("circle").attr("r", 4.5).attr("fill", "none").attr("stroke", "var(--cc-ink-2)").attr("stroke-width", 1.5);
    const origineTexte = gEtiq.append("text").attr("font-size", 10.5).attr("fill", "var(--cc-muted)")
      .attr("dominant-baseline", "middle")
      .attr("paint-order", "stroke").attr("stroke", "var(--cc-card)").attr("stroke-width", 3).attr("stroke-linejoin", "round")
      .text("Ensemble des répondants");

    // Zone des pays (visible dans la vue « institutions »)
    const zone = gZone.append("g").style("cursor", "pointer").attr("opacity", 0)
      .on("click", () => changerVue("pays"));
    const zoneRect = zone.append("rect").attr("rx", 10).attr("fill", "var(--cc-wash)")
      .attr("stroke", "var(--cc-axis)").attr("fill-opacity", 0.55);
    const zoneTexte = zone.append("text").attr("font-size", 11).attr("fill", "var(--cc-ink-2)").attr("font-weight", 600).text(`Les ${nbPays} pays · zoomer`);

    // Institutions : une ligne par institution (faible → moyenne → forte) et trois points
    const parInst = d3.group(modalites, (d) => d.inst);
    const ligneInst = gInst.selectAll("path").data(institutions).join("path")
      .attr("fill", "none").attr("stroke", "var(--cc-axis)").attr("stroke-width", 1.6)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round");
    const pointsMod = gInst.selectAll("circle").data(modalites).join("circle")
      .attr("r", 5.5)
      .attr("fill", (d) => NIVEAUX.find((n) => n.id === d.niveau).couleur)
      .attr("stroke", "var(--cc-card)").attr("stroke-width", 2);
    gInst.attr("opacity", 0).attr("pointer-events", "none");

    // Pays : un groupe par pays (cercle + anneau de sélection), focusables au clavier
    const noeuds = gPays.selectAll("g").data(pays, (d) => d.code).join("g")
      .attr("class", "cc-pt")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.nom}, ${fmtEntier(d.n)} répondants`)
      .on("focus", (e, d) => survolerPays(d))
      .on("blur", () => finSurvol())
      .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); epingler(d); } });
    noeuds.append("circle").attr("class", "cc-ring").attr("r", (d) => (d.code === PAYS_PAR_DEFAUT ? 11 : 9.5))
      .attr("fill", "none").attr("stroke", "transparent").attr("stroke-width", 2);
    noeuds.append("circle").attr("class", "cc-dot")
      .attr("r", (d) => (d.code === PAYS_PAR_DEFAUT ? 7 : 5.5))
      .attr("fill", "var(--cc-pays)").attr("stroke", "var(--cc-card)").attr("stroke-width", 2);

    const liens = gEtiq.selectAll("line.cc-ll").data(pays.concat([{ code: "__o" }]), (d) => d.code).join("line")
      .attr("class", "cc-ll").attr("stroke", "var(--cc-axis)").attr("stroke-width", 1).attr("opacity", 0);
    const etiquettes = gEtiq.selectAll("text.cc-lp").data(pays, (d) => d.code).join("text").attr("class", "cc-lp")
      .attr("font-size", taillePays)
      .attr("font-weight", (d) => (d.code === PAYS_PAR_DEFAUT ? 700 : 500))
      .attr("fill", (d) => (d.code === PAYS_PAR_DEFAUT ? "var(--cc-ink)" : "var(--cc-ink-2)"))
      .attr("dominant-baseline", "middle")
      .attr("paint-order", "stroke").attr("stroke", "var(--cc-card)").attr("stroke-width", 3).attr("stroke-linejoin", "round")
      .text((d) => d.nom);

    const etiqInst = gInstEtiq.selectAll("text").data(institutions).join("text")
      .attr("font-size", 12).attr("font-weight", 600).attr("fill", "var(--cc-ink)")
      .attr("dominant-baseline", "middle")
      .attr("paint-order", "stroke").attr("stroke", "var(--cc-card)").attr("stroke-width", 3.5).attr("stroke-linejoin", "round")
      .text((d) => d.court).attr("opacity", 0);

    // Étiquettes de niveau, affichées au survol d'une institution
    const etiqNiveau = gSurvol.selectAll("text").data([0, 1, 2]).join("text")
      .attr("font-size", 11.5).attr("font-weight", 600).attr("fill", "var(--cc-ink)")
      .attr("paint-order", "stroke").attr("stroke", "var(--cc-card)").attr("stroke-width", 3.5).attr("stroke-linejoin", "round")
      .attr("opacity", 0);

    // Couche de survol : cible = point le plus proche (pas besoin de viser le point)
    const capteur = svg.append("rect").attr("width", W).attr("height", H).attr("fill", "transparent");
    svg.node().insertBefore(capteur.node(), gAxes.node());
    let delaunay = null, cibles = [], echellesCourantes = null;

    function positionner(vue, anime) {
      const { x, y } = echellesCourantes = echelles(vue);
      const t = anime ? svg.transition().duration(duree).ease(d3.easeCubicInOut) : null;
      const appliquer = (sel) => (t ? sel.transition(t) : sel);

      appliquer(axeX).attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0));
      appliquer(axeY).attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.t).attr("y2", H - m.b);
      appliquer(origine).attr("transform", `translate(${x(0)},${y(0)})`);
      // Sur petit écran, le sens de l'axe horizontal passe sous le graphique
      const ySens = petit ? H - m.b + 22 : y(0) - 9;
      appliquer(sensGauche).attr("x", m.l + 4).attr("y", ySens);
      appliquer(sensDroite).attr("x", W - m.r - 4).attr("y", ySens);
      appliquer(sensHaut).attr("x", x(0) + 8).attr("y", m.t - 12);
      appliquer(sensBas).attr("x", petit ? W / 2 : x(0) + 8).attr("y", petit ? H - m.b + 38 : H - m.b + 22)
        .attr("text-anchor", petit ? "middle" : "start");

      appliquer(noeuds).attr("transform", (d) => `translate(${x(d.x)},${y(d.y)})`)
        .attr("opacity", vue === "pays" ? 1 : 0.35);
      noeuds.select(".cc-dot").attr("r", (d) => (vue === "pays" ? (d.code === PAYS_PAR_DEFAUT ? 7 : 5.5) : 3));
      noeuds.attr("tabindex", vue === "pays" ? 0 : -1).style("pointer-events", vue === "pays" ? null : "none");

      const ligne = d3.line().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3.curveCatmullRom.alpha(0.5));
      appliquer(ligneInst).attr("d", (d) => ligne(["faible", "moyenne", "forte"].map((n) => parInst.get(d.id).find((p) => p.niveau === n))));
      appliquer(pointsMod).attr("cx", (d) => x(d.x)).attr("cy", (d) => y(d.y));
      appliquer(gInst).attr("opacity", vue === "institutions" ? 1 : 0);
      gInst.attr("pointer-events", vue === "institutions" ? null : "none");

      // Zone des pays
      const [px0, px1] = d3.extent(pays, (d) => x(d.x)), [py0, py1] = d3.extent(pays, (d) => y(d.y));
      zoneRect.attr("x", px0 - 12).attr("y", py0 - 12).attr("width", px1 - px0 + 24).attr("height", py1 - py0 + 24);
      zoneTexte.attr("x", px0 - 4).attr("y", py0 + 4);
      appliquer(zone).attr("opacity", vue === "institutions" ? 1 : 0);
      zone.attr("pointer-events", vue === "institutions" ? null : "none");

      // Étiquettes des pays (vue « pays ») ou des institutions (vue « institutions »)
      const cadre = { x0: m.l + 4, x1: W - m.r - 4, y0: m.t - 6, y1: H - m.b + 6 };
      const obstaclesFixes = [
        ...(petit ? [] : [
          { id: "__g", x0: m.l + 4, x1: m.l + 4 + largeurSens.g, y0: y(0) - 17, y1: y(0) - 2 },
          { id: "__d", x0: W - m.r - 4 - largeurSens.d, x1: W - m.r - 4, y0: y(0) - 17, y1: y(0) - 2 }]),
        { id: "__o", x0: x(0) - 6, x1: x(0) + 6, y0: y(0) - 6, y1: y(0) + 6 }
      ];
      const obstaclesPays = pays.map((d) => ({ id: d.code, x0: x(d.x) - 7, x1: x(d.x) + 7, y0: y(d.y) - 7, y1: y(d.y) + 7 }))
        .concat(obstaclesFixes);
      const hauteur = taillePays + 3;

      etiquettes.attr("opacity", 0);
      etiqInst.attr("opacity", 0);
      origineTexte.attr("opacity", 0);
      liens.attr("opacity", 0);
      if (vue === "pays") {
        const items = pays.map((d) => ({
          id: d.code, px: x(d.x), py: y(d.y), r: d.code === PAYS_PAR_DEFAUT ? 7 : 5.5,
          largeur: mesurer(d.nom, taillePays, d.code === PAYS_PAR_DEFAUT) + 2, hauteur,
          priorite: d.code === PAYS_PAR_DEFAUT ? 1e9 : Math.abs(d.x) * 10 + Math.abs(d.y)
        }));
        items.push({ id: "__o", px: x(0), py: y(0), r: 4.5, largeur: mesurer("Ensemble des répondants", 10.5, false) + 2,
          hauteur: 13, priorite: -1 });
        const pos = placerEtiquettes(items, obstaclesPays, cadre);
        // Filets de rappel pour les étiquettes éloignées de leur point
        const attache = (b, ancre, px, py) => {
          const ax = ancre === "start" ? b.x0 - 1 : ancre === "end" ? b.x1 + 1 : Math.max(b.x0, Math.min(px, b.x1));
          const ay = ancre === "middle" ? (py < b.y0 ? b.y0 : b.y1) : (b.y0 + b.y1) / 2;
          return [ax, ay];
        };
        liens.each(function (d) {
          const q = pos.get(d.code), it = items.find((i) => i.id === d.code);
          if (!q || !q.visible || !q.lien) { this.setAttribute("data-visible", 0); return; }
          const [ax, ay] = attache(q.boite, q.ancre, it.px, it.py);
          const ang = Math.atan2(ay - it.py, ax - it.px);
          this.setAttribute("x1", it.px + Math.cos(ang) * (it.r + 2));
          this.setAttribute("y1", it.py + Math.sin(ang) * (it.r + 2));
          this.setAttribute("x2", ax); this.setAttribute("y2", ay);
          this.setAttribute("data-visible", 1);
        });
        liens.transition().delay(anime ? duree * 0.8 : 0).duration(anime ? 250 : 0)
          .attr("opacity", function () { return this.getAttribute("data-visible") === "1" ? 1 : 0; });
        const po = pos.get("__o");
        origineTexte.attr("x", po.x).attr("y", po.y).attr("text-anchor", po.ancre)
          .attr("data-visible", po.visible ? 1 : 0)
          .transition().delay(anime ? duree * 0.8 : 0).duration(anime ? 250 : 0)
          .attr("opacity", po.visible ? 1 : 0);
        etiquettes
          .attr("x", (d) => pos.get(d.code).x).attr("y", (d) => pos.get(d.code).y)
          .attr("text-anchor", (d) => pos.get(d.code).ancre)
          .attr("data-visible", (d) => (pos.get(d.code).visible ? 1 : 0))
          .transition().delay(anime ? duree * 0.8 : 0).duration(anime ? 250 : 0)
          .attr("opacity", (d) => (pos.get(d.code).visible ? 1 : 0));
      } else {
        const fortes = institutions.map((d) => parInst.get(d.id).find((p) => p.niveau === "forte"));
        const items = fortes.map((p) => ({
          id: p.inst, px: x(p.x), py: y(p.y), r: 5.5,
          largeur: mesurer(instParId.get(p.inst).court, 12, true) + 2, hauteur: 15,
          priorite: p.x
        }));
        const lz = mesurer(`Les ${nbPays} pays · zoomer`, 11, true);
        const obstaclesMod = modalites.map((p) => ({ id: p.inst, x0: x(p.x) - 6, x1: x(p.x) + 6, y0: y(p.y) - 6, y1: y(p.y) + 6 }))
          .concat(obstaclesFixes, [{ id: "__z", x0: px0 - 6, x1: px0 - 2 + lz, y0: py0 - 10, y1: py0 + 8 }]);
        const pos = placerEtiquettes(items, obstaclesMod, cadre);
        etiqInst
          .attr("x", (d) => pos.get(d.id).x).attr("y", (d) => pos.get(d.id).y)
          .attr("text-anchor", (d) => pos.get(d.id).ancre)
          .attr("data-visible", (d) => (pos.get(d.id).visible ? 1 : 0))
          .transition().delay(anime ? duree * 0.8 : 0).duration(anime ? 250 : 0)
          .attr("opacity", (d) => (pos.get(d.id).visible ? 1 : 0));
      }

      // Cibles de survol
      cibles = vue === "pays"
        ? pays.map((d) => ({ type: "pays", d, px: x(d.x), py: y(d.y) }))
        : modalites.map((d) => ({ type: "mod", d, px: x(d.x), py: y(d.y) }));
      delaunay = d3.Delaunay.from(cibles, (c) => c.px, (c) => c.py);

      legende.style.display = vue === "institutions" ? "" : "none";
      indice.textContent = vue === "pays"
        ? "Survolez ou touchez un pays pour afficher son profil ; cliquez pour l'épingler. Le cercle vide au centre représente l'ensemble des répondants."
        : "Survolez une institution : ses trois niveaux de confiance s'affichent. Cliquez sur la zone grisée pour revenir aux pays.";
      marquerEpingle();
    }

    function marquerEpingle() {
      noeuds.select(".cc-ring").attr("stroke", (d) => (d.code === etat.epingle && etat.vue === "pays" ? "var(--cc-ink)" : "transparent"));
    }

    // --- Survol --------------------------------------------------------------------
    function montrerInfobulle(px, py, html) {
      tip.innerHTML = html;
      tip.classList.add("is-on");
      const echelle = fig.clientWidth / W;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let left = px * echelle + 14, top = py * echelle - th - 10;
      if (left + tw > fig.clientWidth) left = px * echelle - tw - 14;
      if (top < 0) top = py * echelle + 14;
      tip.style.left = `${Math.max(0, left)}px`;
      tip.style.top = `${top}px`;
    }

    function survolerPays(d) {
      const { x, y } = echellesCourantes;
      noeuds.select(".cc-ring").attr("stroke", (p) => (p.code === d.code ? "var(--cc-focus)" : (p.code === etat.epingle ? "var(--cc-ink)" : "transparent")));
      const sens = d.x > 0.05 ? "Confiance plus élevée que dans l'ensemble des pays"
        : d.x < -0.05 ? "Confiance moins élevée que dans l'ensemble des pays"
        : "Confiance proche de l'ensemble des pays";
      montrerInfobulle(x(d.x), y(d.y),
        `<b>${d.nom}</b><br><span class="cc-tip-sub">${fmtEntier(d.n)} répondants</span><br>${sens}`);
      majPanneau(d);
    }

    function survolerInstitution(mod) {
      const inst = instParId.get(mod.inst);
      const { x, y } = echellesCourantes;
      ligneInst.attr("stroke", (d) => (d.id === mod.inst ? "var(--cc-ink)" : "var(--cc-axis)"))
        .attr("stroke-opacity", (d) => (d.id === mod.inst ? 1 : 0.35))
        .attr("stroke-width", (d) => (d.id === mod.inst ? 2.2 : 1.6));
      pointsMod.attr("opacity", (d) => (d.inst === mod.inst ? 1 : 0.2));
      etiqInst.attr("opacity", 0);
      const trois = ["faible", "moyenne", "forte"].map((n) => parInst.get(mod.inst).find((p) => p.niveau === n));
      etiqNiveau.data(trois)
        .attr("x", (d) => x(d.x) + 10).attr("y", (d) => y(d.y) - 10)
        .attr("text-anchor", (d) => (x(d.x) > W - 140 ? "end" : "start"))
        .attr("dx", (d) => (x(d.x) > W - 140 ? -20 : 0))
        .text((d) => `${NIVEAUX.find((n) => n.id === d.niveau).label} : ${fmtPct(d.pct_europe)}`)
        .attr("opacity", 1);
      tip.innerHTML = `<b>Confiance dans ${inst.label.charAt(0).toLowerCase() + inst.label.slice(1)}</b><br>` +
        trois.map((p) => { const n = NIVEAUX.find((v) => v.id === p.niveau); return `<i class="cc-sw" style="background:${n.couleur}"></i> ${n.label} (${n.detail}) : <b>${fmtPct(p.pct_europe)}</b>`; }).join("<br>") +
        `<br><span class="cc-tip-sub">Ensemble des répondants des ${nbPays} pays</span>`;
      tip.classList.add("is-on");
      tip.style.left = "12px"; tip.style.top = "12px";
    }

    function finSurvol() {
      tip.classList.remove("is-on");
      marquerEpingle();
      ligneInst.attr("stroke", "var(--cc-axis)").attr("stroke-opacity", 1).attr("stroke-width", 1.6);
      pointsMod.attr("opacity", 1);
      etiqNiveau.attr("opacity", 0);
      if (etat.vue === "institutions") positionnerEtiquettesInst();
      majPanneau(paysParCode.get(etat.epingle));
    }

    function positionnerEtiquettesInst() {
      etiqInst.attr("opacity", function () { return this.getAttribute("data-visible") === "1" ? 1 : 0; });
    }

    function epingler(d) {
      etat.epingle = d.code;
      marquerEpingle();
      majPanneau(d);
    }

    let courant = null;
    function auPointeur(e) {
      const [mx, my] = d3.pointer(e, svg.node());
      const i = delaunay.find(mx, my);
      const c = cibles[i];
      const seuil = etat.vue === "pays" ? 34 : 26;
      if (!c || Math.hypot(c.px - mx, c.py - my) > seuil) {
        if (courant) { courant = null; finSurvol(); }
        return;
      }
      if (courant === c) return;
      courant = c;
      if (c.type === "pays") survolerPays(c.d); else survolerInstitution(c.d);
    }

    svg.on("pointermove", auPointeur)
      .on("pointerdown", auPointeur)
      .on("pointerleave", () => { courant = null; finSurvol(); })
      .on("click", (e) => {
        if (etat.vue !== "pays") return;
        if (courant && courant.type === "pays") epingler(courant.d);
      });

    fig.insertBefore(svg.node(), tip);

    // Premier affichage : apparition des pays de gauche à droite
    positionner(etat.vue, false);
    if (!reduit && etat.vue === "pays") {
      const { x } = echellesCourantes;
      noeuds.attr("opacity", 0).transition().delay((d) => 150 + (x(d.x) / W) * 700).duration(450).attr("opacity", 1);
      liens.interrupt().attr("opacity", 0).transition().delay(1100).duration(400)
        .attr("opacity", function () { return this.getAttribute("data-visible") === "1" ? 1 : 0; });
      origineTexte.interrupt().attr("opacity", 0).transition().delay(1100).duration(400)
        .attr("opacity", function () { return this.getAttribute("data-visible") === "1" ? 1 : 0; });
      etiquettes.interrupt().attr("opacity", 0).transition().delay(1100).duration(400)
        .attr("opacity", function () { return this.getAttribute("data-visible") === "1" ? 1 : 0; });
    }

    return {
      transition(vue) {
        tip.classList.remove("is-on");
        courant = null;
        positionner(vue, true);
      }
    };
  }

  // --- Panneau : profil de confiance d'un pays -------------------------------------
  function majPanneau(d) {
    const epingle = d.code === etat.epingle;
    const lignes = ordreInst.map((inst) => {
      const p = d.profil[inst.id], eu = data.europe[inst.id];
      const barre = el("div", { class: "cc-bar", title: `Faible ${fmtPct(p.faible)} · moyenne ${fmtPct(p.moyenne)} · forte ${fmtPct(p.forte)}` },
        NIVEAUX.map((n) => el("div", { class: "cc-seg-bar", style: `flex:0 0 calc(${p[n.id]}% - 2px);background:${n.couleur}` })),
        el("i", { class: "cc-tick", style: `left:${eu.faible + eu.moyenne}%`, title: `Ensemble des pays : ${fmtPct(eu.forte)} de confiance forte` }));
      return el("div", { class: "cc-row" },
        el("span", { class: "cc-row-label" }, inst.court),
        barre,
        el("span", { class: "cc-row-val", title: "Part de confiance forte (7 à 10)" }, fmtPct(p.forte)));
    });

    panneau.replaceChildren(
      el("p", { class: "cc-panel-kicker" }, "Profil de confiance"),
      el("p", { class: "cc-panel-title" }, d.nom, epingle ? el("span", { class: "cc-pin" }, "sélectionné") : null),
      el("p", { class: "cc-panel-meta" }, `${fmtEntier(d.n)} répondants · ESS, 2023`),
      el("p", { class: "cc-panel-q" }, "Part de confiance forte (7 à 10) dans…"),
      el("div", { class: "cc-rows" }, lignes),
      el("div", { class: "cc-panel-legend" },
        NIVEAUX.map((n) => el("span", {}, el("i", { class: "cc-sq", style: `background:${n.couleur}` }), n.label)),
        el("span", {}, el("i", { class: "cc-tickkey" }), "ensemble des pays"))
    );
  }

  // --- Pied : source, mode d'emploi, données -------------------------------------
  function piedDePage() {
    const m = data.meta;
    const lecture = el("details", {},
      el("summary", {}, "Comment lire cette carte ?"),
      el("div", {
        html: `
<p>Cette carte est le résultat d'une <strong>analyse des correspondances multiples</strong> (ACM), une méthode qui résume en deux dimensions les réponses à plusieurs questions à la fois. Ici, sept questions de l'ESS : « Quelle confiance accordez-vous personnellement à… » la police, la justice, le Parlement national, les responsables politiques, les partis, le Parlement européen et les Nations unies. Chaque réponse, notée de 0 (aucune confiance) à 10 (confiance totale), est regroupée en trois niveaux : faible (0 à 3), moyenne (4 à 6) et forte (7 à 10).</p>
<p>L'<strong>axe horizontal</strong> résume l'essentiel de l'information (${fmtPct(m.inertie.axe1)}) : il va de la défiance envers toutes les institutions, à gauche, à la confiance envers toutes, à droite. L'<strong>axe vertical</strong> (${fmtPct(m.inertie.axe2)}) oppose les réponses tranchées, en haut, aux réponses modérées, en bas. La vue « Les institutions » montre la forme en arc que dessinent ces deux axes.</p>
<p>Chaque pays est placé d'après le point moyen de ses répondants. Il ne participe pas au calcul des axes : c'est une <em>variable supplémentaire</em>. Le centre de la carte correspond à l'ensemble des répondants des ${m.n_pays} pays ; un pays situé à sa droite exprime, en moyenne, plus de confiance que cet ensemble.</p>
<p>Les calculs sont pondérés (pondération <code>anweight</code>, recommandée par l'ESS pour comparer plusieurs pays). Les non-réponses sont conservées mais écartées de la construction des axes (ACM dite « spécifique »). Les pourcentages d'information sont les taux d'inertie modifiés de Benzécri (taux bruts : ${fmtPct(m.inertie.brut1)} et ${fmtPct(m.inertie.brut2)}).</p>
<p><a href="${lien}">Apprendre à réaliser cette analyse avec R →</a></p>`
      }));

    const entetes = ["Pays", "Répondants", "Axe 1", "Axe 2", ...ordreInst.map((i) => `${i.court} (forte)`)];
    const tri = [...pays].sort((a, b) => b.x - a.x);
    const table = el("table", { class: "cc-table" },
      el("thead", {}, el("tr", {}, entetes.map((h) => el("th", { scope: "col" }, h)))),
      el("tbody", {}, tri.map((d) => el("tr", {},
        el("td", {}, d.nom), el("td", {}, fmtEntier(d.n)),
        el("td", {}, fmtCoord(d.x)), el("td", {}, fmtCoord(d.y)),
        ordreInst.map((i) => el("td", {}, fmtPct(d.profil[i.id].forte)))))),
      el("tfoot", {}, el("tr", {},
        el("td", {}, "Ensemble des pays"), el("td", {}, fmtEntier(m.n)), el("td", {}, "0,00"), el("td", {}, "0,00"),
        ordreInst.map((i) => el("td", {}, fmtPct(data.europe[i.id].forte))))));
    const donnees = el("details", {},
      el("summary", {}, "Voir les données de la carte"),
      el("div", { class: "cc-table-wrap" }, table));

    return el("div", { class: "cc-foot" },
      el("div", {}, `Source : ${m.source}. ${fmtEntier(m.n)} répondants dans ${m.n_pays} pays. Données pondérées.`),
      lecture, donnees);
  }

  return root;
}
