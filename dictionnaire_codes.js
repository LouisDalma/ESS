// =============================================================================
// Dictionnaire des codes interactif : ESS (vagues 1 à 11) et CRONOS-2
//
// Usage dans une page Quarto (bloc OJS) :
//   import { dictionnaireCodes } from "./dictionnaire_codes.js"
//   dictionnaireCodes({ d3, invalidation })
//
// Les données sont produites par scripts/dictionnaire_codes.R :
//   data/dico/index.json   (toutes les variables, pour la recherche)
//   data/dico/<jeu>.json   (détail et tris à plat, chargés à la demande)
// =============================================================================

const SOURCES = {
  ess:    { nom: "ESS",      long: "European Social Survey", sous: "11 vagues · 2002-2023" },
  cronos: { nom: "CRONOS-2", long: "Panel CRONOS-2",         sous: "7 vagues · 2021-2022" }
};

const TYPES = {
  cat:  "catégorielle",
  ord:  "échelle ordonnée",
  num:  "numérique",
  many: "nombreuses modalités",
  tech: "technique"
};

const SUGGESTIONS = ["confiance", "police", "bonheur", "immigration", "vote",
                     "religion", "climat", "santé", "revenu", "vaccin"];

// Les questionnaires sont en anglais : quelques mots français courants sont
// traduits pour que la recherche les trouve aussi.
const SYNONYMES = {
  confiance: ["trust"], police: ["police"], justice: ["legal", "justice", "court"],
  tribunal: ["court", "legal"], parlement: ["parliament"], politique: ["politic"],
  politiques: ["politic"], politicien: ["politician"], partis: ["party", "parties"],
  parti: ["party", "parties"], vote: ["vote", "voted", "election"], voter: ["vote"],
  election: ["election", "vote"], elections: ["election", "vote"],
  bonheur: ["happy", "happiness"], heureux: ["happy"], satisfaction: ["satisf"],
  satisfait: ["satisf"], sante: ["health"], medecin: ["doctor", "medical", "gp"],
  soins: ["medical", "treatment", "care"], travail: ["work", "job"], emploi: ["job", "employ"],
  chomage: ["unemploy"], revenu: ["income"], revenus: ["income"], salaire: ["wage", "salary", "income"],
  age: ["age"], sexe: ["gender", "sex"], genre: ["gender"], femme: ["women", "woman", "female"],
  femmes: ["women", "woman", "female"], homme: ["men", "man", "male"], hommes: ["men", "male"],
  enfant: ["child"], enfants: ["child", "children"], famille: ["family"], religion: ["relig"],
  religieux: ["relig"], eglise: ["church", "religious services"], priere: ["pray"],
  immigration: ["immigr", "migrant", "come and live"], immigre: ["immigr", "migrant"],
  immigres: ["immigr", "migrant"], migrant: ["migrant", "immigr"], migrants: ["migrant", "immigr"],
  refugie: ["refugee"], refugies: ["refugee"], etranger: ["foreign"], etrangers: ["foreign"],
  climat: ["climate"], energie: ["energy"], environnement: ["environment", "nature"],
  ecole: ["school", "educat"], education: ["educat"], diplome: ["educat", "degree", "qualification"],
  etudes: ["educat", "study"], internet: ["internet"], television: ["tv", "television"],
  medias: ["media", "news"], informations: ["news"], europe: ["europe", "eu"],
  ue: ["european union", "eu"], democratie: ["democra"], discrimination: ["discrimin"],
  securite: ["safe", "secur"], insecurite: ["safe", "unsafe"], crime: ["crime", "burglary", "assault"],
  vaccin: ["vaccin"], vaccination: ["vaccin"], covid: ["covid", "coronavirus", "pandemic"],
  logement: ["dwelling", "accommodation", "housing"], argent: ["money"], riche: ["rich", "wealth"],
  pauvre: ["poor", "poverty"], pauvrete: ["poverty", "poor"], inegalites: ["inequal", "differences in"],
  impots: ["tax"], retraite: ["retire", "pension"], pension: ["pension"], mariage: ["marri"],
  conjoint: ["partner", "spouse"], parents: ["parent", "mother", "father"], mere: ["mother"],
  pere: ["father"], pays: ["country"], nationalite: ["citizen", "nationality"],
  citoyen: ["citizen"], langue: ["language"], naissance: ["born", "birth"],
  ville: ["town", "city", "urban"], campagne: ["rural", "village", "countryside"],
  voisins: ["neighbour"], aide: ["help"], benevolat: ["volunt"], syndicat: ["union"],
  manifestation: ["demonstrat"], petition: ["petition"], gauche: ["left"], droite: ["right"],
  valeurs: ["important to", "like you"], tradition: ["tradition"], regles: ["rules"],
  alcool: ["alcohol", "drink"], tabac: ["smok", "cigarette", "tobacco"], fumer: ["smok"],
  poids: ["weight"], taille: ["height"], sport: ["physical", "sport", "exercise"],
  depression: ["depress"], solitude: ["lonely", "alone"], seul: ["lonely", "alone"],
  amis: ["friend"], liberte: ["free", "freedom"], egalite: ["equal"], fierte: ["proud"],
  science: ["scien"], scientifiques: ["scien"], technocratie: ["expert", "technocra"],
  populisme: ["populis", "ordinary people", "elite"], memoire: ["memor", "past", "history"],
  avortement: ["abortion"], euthanasie: ["euthanasia", "end of life"], enquete: ["survey"],
  enquetes: ["survey"], ostracisme: ["ostracis", "excluded", "ignored"]
};

// --- Utilitaires -------------------------------------------------------------

const norm = s => (s || "").toString().toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");
const arr = x => x == null ? [] : (Array.isArray(x) ? x : [x]);
const nf1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nfs = new Intl.NumberFormat("fr-FR", { maximumSignificantDigits: 4 });
const pct = v => nf1.format(v) + " %";

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "style") n.style.cssText = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "text") n.textContent = v;
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false)
    n.append(e instanceof Node ? e : document.createTextNode(String(e)));
  return n;
}

// Remplace le contenu d'un nœud (les tableaux sont aplatis, les vides ignorés)
const vider = (noeud, ...enfants) => noeud.replaceChildren(
  ...enfants.flat(Infinity).filter(e => e != null && e !== false));

// Surligne les termes recherchés dans un texte, sans jamais injecter de HTML
function surligner(texte, termes) {
  const frag = document.createDocumentFragment();
  if (!termes.length) { frag.append(texte); return frag; }
  const t = norm(texte);
  const zones = [];
  for (const m of termes) {
    if (m.length < 2) continue;
    let i = t.indexOf(m);
    while (i !== -1) { zones.push([i, i + m.length]); i = t.indexOf(m, i + m.length); }
  }
  zones.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [a, b] of zones) {
    if (a < pos) continue;
    frag.append(texte.slice(pos, a), el("mark", {}, texte.slice(a, b)));
    pos = b;
  }
  frag.append(texte.slice(pos));
  return frag;
}

// Interpolation de la rampe séquentielle (cellules de la carte de chaleur)
function rampe(sombre) {
  const pas = sombre
    ? ["#20262e", "#1c3a63", "#1c5cab", "#3987e5", "#86b6ef", "#cde2fb"]
    : ["#f1f6fd", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];
  return t => {
    const x = Math.max(0, Math.min(1, t)) * (pas.length - 1);
    const i = Math.min(Math.floor(x), pas.length - 2), f = x - i;
    const a = pas[i], b = pas[i + 1];
    const c = k => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - f) + parseInt(b.slice(k, k + 2), 16) * f);
    return `rgb(${c(1)},${c(3)},${c(5)})`;
  };
}
const encreSur = rgb => {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? "#0b0b0b" : "#ffffff";
};

// --- Styles ----------------------------------------------------------------------

const CSS = `
.dc-root {
  --dc-ink: #1b1b1a; --dc-ink-2: #52514e; --dc-muted: #6f6d67;
  --dc-line: #e6e5df; --dc-line-2: #d4d3cb; --dc-card: #ffffff; --dc-wash: #f6f6f3;
  --dc-accent: #2a78d6; --dc-accent-soft: #e7f0fb; --dc-ref: #1b1b1a;
  --dc-nr: #b4b2aa; --dc-mark: #fff1b8; --dc-shadow: 0 1px 2px rgba(0,0,0,.05), 0 6px 24px rgba(0,0,0,.05);
  --dc-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  color: var(--dc-ink); font-size: .95rem; line-height: 1.45; margin: .5rem 0 2rem;
}
.quarto-dark .dc-root {
  --dc-ink: #f2f2ef; --dc-ink-2: #c3c2b7; --dc-muted: #a3a197;
  --dc-line: #2f2f2c; --dc-line-2: #45453f; --dc-card: #1a1a19; --dc-wash: #222220;
  --dc-accent: #3987e5; --dc-accent-soft: #1d2a3b; --dc-ref: #f2f2ef;
  --dc-nr: #6b6a63; --dc-mark: #5a4a12; --dc-shadow: none;
}
.dc-root *, .dc-root *::before, .dc-root *::after { box-sizing: border-box; }
.dc-root button { font: inherit; color: inherit; }
.dc-root :focus-visible { outline: 2px solid var(--dc-accent); outline-offset: 2px; }

.dc-head { display: flex; flex-wrap: wrap; gap: .75rem 1rem; align-items: stretch; margin-bottom: .75rem; }
.dc-search { flex: 1 1 18rem; min-width: 0; position: relative; }
.dc-loupe { position: absolute; z-index: 1; left: .95rem; top: 50%; transform: translateY(-50%); color: var(--dc-muted); pointer-events: none; display: flex; }
.dc-search input {
  width: 100%; height: 3.1rem; padding: 0 2.6rem 0 2.8rem; font: inherit; font-size: 1.05rem;
  border: 1px solid var(--dc-line-2); border-radius: .8rem; background: var(--dc-card); color: var(--dc-ink);
  box-shadow: var(--dc-shadow); transition: border-color .15s;
}
.dc-search input:focus { outline: none; border-color: var(--dc-accent); box-shadow: 0 0 0 3px var(--dc-accent-soft); }
.dc-search input::placeholder { color: var(--dc-muted); }
.dc-clear { position: absolute; right: .55rem; top: 50%; transform: translateY(-50%); border: 0; background: transparent; cursor: pointer; color: var(--dc-muted); width: 2rem; height: 2rem; border-radius: 50%; font-size: 1.2rem; line-height: 1; }
.dc-clear:hover { background: var(--dc-wash); color: var(--dc-ink); }

.dc-sources { display: flex; gap: .5rem; flex: 0 1 auto; }
.dc-src {
  display: flex; flex-direction: column; justify-content: center; min-width: 9.5rem; padding: .4rem .9rem;
  border: 1px solid var(--dc-line-2); border-radius: .8rem; background: var(--dc-card); cursor: pointer; text-align: left;
  transition: border-color .15s, background .15s;
}
.dc-src:hover { border-color: var(--dc-accent); }
.dc-src[aria-pressed="true"] { border-color: var(--dc-accent); background: var(--dc-accent-soft); box-shadow: inset 0 0 0 1px var(--dc-accent); }
.dc-src-nom { font-weight: 650; display: flex; justify-content: space-between; gap: .75rem; }
.dc-src-n { font-variant-numeric: tabular-nums; color: var(--dc-accent); font-weight: 650; }
.dc-src-sous { font-size: .75rem; color: var(--dc-muted); }

.dc-filters { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem .5rem; margin: .25rem 0 1rem; font-size: .84rem; color: var(--dc-ink-2); }
.dc-filters .dc-flabel { margin-right: .15rem; }
.dc-chip {
  border: 1px solid var(--dc-line-2); background: var(--dc-card); border-radius: 999px; padding: .15rem .65rem;
  cursor: pointer; font-size: .82rem; font-variant-numeric: tabular-nums; color: var(--dc-ink-2);
}
.dc-chip:hover { border-color: var(--dc-accent); color: var(--dc-ink); }
.dc-chip[aria-pressed="true"] { background: var(--dc-accent); border-color: var(--dc-accent); color: #fff; }
.dc-toggle { display: inline-flex; align-items: center; gap: .35rem; margin-left: auto; cursor: pointer; }

.dc-grid { display: grid; grid-template-columns: minmax(250px, 22rem) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
@media (max-width: 880px) { .dc-grid { grid-template-columns: minmax(0, 1fr); } }
.dc-grid > * { min-width: 0; }
@media (max-width: 480px) { .dc-sources { width: 100%; } .dc-src { flex: 1 1 0; min-width: 0; } }

.dc-listwrap { border: 1px solid var(--dc-line); border-radius: .9rem; background: var(--dc-card); overflow: hidden; }
.dc-count { padding: .6rem .9rem; font-size: .8rem; color: var(--dc-muted); border-bottom: 1px solid var(--dc-line); background: var(--dc-wash); }
.dc-list { max-height: min(75vh, 46rem); overflow-y: auto; overscroll-behavior: contain; }
@media (max-width: 880px) { .dc-list { max-height: 22rem; } }
.dc-item {
  display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--dc-line);
  background: transparent; padding: .65rem .9rem .7rem; cursor: pointer; position: relative;
}
.dc-item:hover { background: var(--dc-wash); }
.dc-item[aria-selected="true"] { background: var(--dc-accent-soft); }
.dc-item[aria-selected="true"]::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--dc-accent); }
.dc-item-top { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
.dc-item code, .dc-name { font-family: var(--dc-mono); font-weight: 600; color: var(--dc-ink); background: none; padding: 0; font-size: .9rem; }
.dc-badge { font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; color: var(--dc-muted); white-space: nowrap; }
.dc-item-lab { font-size: .85rem; color: var(--dc-ink-2); margin: .15rem 0 .4rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dc-root mark { background: var(--dc-mark); color: inherit; padding: 0 .08em; border-radius: 2px; }
.dc-more { width: 100%; border: 0; background: var(--dc-wash); padding: .7rem; cursor: pointer; color: var(--dc-accent); font-weight: 600; }
.dc-empty { padding: 1.5rem 1rem; color: var(--dc-muted); font-size: .9rem; }

.dc-dots { display: flex; gap: 3px; align-items: center; }
.dc-dot { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid var(--dc-line-2); }
.dc-dot.on { background: var(--dc-accent); border-color: var(--dc-accent); }
.dc-dots-lab { font-size: .7rem; color: var(--dc-muted); margin-left: .35rem; }

.dc-fiche { border: 1px solid var(--dc-line); border-radius: .9rem; background: var(--dc-card); box-shadow: var(--dc-shadow); padding: 1.25rem 1.4rem 1.4rem; min-height: 24rem; }
@media (min-width: 881px) { .dc-fiche { position: sticky; top: 4.5rem; } }
@media (max-width: 560px) { .dc-fiche { padding: 1rem; } }
.dc-fiche-top { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
.dc-name { font-size: 1.45rem; letter-spacing: -.01em; }
.dc-copy { border: 1px solid var(--dc-line-2); background: var(--dc-card); border-radius: .5rem; padding: .15rem .55rem; font-size: .78rem; cursor: pointer; color: var(--dc-ink-2); }
.dc-copy:hover { border-color: var(--dc-accent); color: var(--dc-ink); }
.dc-label { font-size: 1.08rem; font-weight: 600; margin: .35rem 0 .9rem; line-height: 1.35; }

.dc-waves { display: flex; flex-wrap: wrap; gap: .35rem; margin: 0 0 1rem; align-items: center; }
.dc-waves-lab { font-size: .78rem; color: var(--dc-muted); margin-right: .25rem; }
.dc-wave {
  min-width: 2.1rem; height: 2.1rem; padding: 0 .45rem; border-radius: .55rem; border: 1px solid var(--dc-line-2);
  background: var(--dc-card); cursor: pointer; font-size: .82rem; font-variant-numeric: tabular-nums; color: var(--dc-ink-2);
}
.dc-wave:hover:not(:disabled) { border-color: var(--dc-accent); color: var(--dc-ink); }
.dc-wave[aria-pressed="true"] { background: var(--dc-accent); border-color: var(--dc-accent); color: #fff; font-weight: 650; }
.dc-wave:disabled { opacity: .35; cursor: default; border-style: dashed; }

.dc-q { margin: 0 0 1rem; padding: .75rem 1rem; border-left: 3px solid var(--dc-accent); background: var(--dc-wash); border-radius: 0 .6rem .6rem 0; }
.dc-q-instr { font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; color: var(--dc-muted); margin-bottom: .3rem; }
.dc-q-texte { font-size: .95rem; }
.dc-q-note { font-size: .74rem; color: var(--dc-muted); margin-top: .35rem; }

.dc-tabs { display: flex; gap: .15rem; border-bottom: 1px solid var(--dc-line); margin: .25rem 0 1rem; overflow-x: auto; }
.dc-tab { border: 0; background: transparent; padding: .55rem .85rem; cursor: pointer; color: var(--dc-ink-2); border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; font-size: .9rem; }
.dc-tab:hover { color: var(--dc-ink); }
.dc-tab[aria-selected="true"] { color: var(--dc-ink); border-bottom-color: var(--dc-accent); font-weight: 600; }

.dc-ctrl { display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: center; margin-bottom: .9rem; font-size: .86rem; color: var(--dc-ink-2); }
.dc-ctrl select { font: inherit; padding: .3rem .6rem; border-radius: .5rem; border: 1px solid var(--dc-line-2); background: var(--dc-card); color: var(--dc-ink); max-width: 100%; }
.dc-legend { display: flex; flex-wrap: wrap; gap: .3rem 1.1rem; font-size: .8rem; color: var(--dc-ink-2); margin: 0 0 .6rem; }
.dc-sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: var(--dc-accent); vertical-align: -1px; margin-right: .35rem; }
.dc-sw-ref { display: inline-block; width: 2px; height: 14px; background: var(--dc-ref); vertical-align: -2px; margin-right: .45rem; }

.dc-bars { display: grid; grid-template-columns: minmax(0, 15rem) minmax(0, 1fr) 4rem; gap: 2px .75rem; align-items: center; }
@media (max-width: 560px) { .dc-bars { grid-template-columns: minmax(0, 8.5rem) minmax(0, 1fr) 3.6rem; } }
.dc-blab { font-size: .84rem; color: var(--dc-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: .28rem 0; }
.dc-blab .dc-code { font-family: var(--dc-mono); font-size: .76rem; color: var(--dc-muted); margin-right: .4rem; }
.dc-track { position: relative; height: 1.15rem; }
.dc-bar { position: absolute; left: 0; top: 0; bottom: 0; background: var(--dc-accent); border-radius: 0 4px 4px 0; transition: width .45s cubic-bezier(.2,.7,.2,1); }
.dc-ref { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--dc-ref); border-radius: 1px; transition: left .45s cubic-bezier(.2,.7,.2,1); }
.dc-bval { font-size: .84rem; text-align: right; font-variant-numeric: tabular-nums; }
.dc-brow { display: contents; }
.dc-brow:hover .dc-blab { color: var(--dc-ink); }

.dc-nr { margin-top: .9rem; font-size: .8rem; color: var(--dc-muted); display: flex; flex-wrap: wrap; gap: .25rem .9rem; }
.dc-nr strong { color: var(--dc-ink-2); font-weight: 600; }
.dc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: .6rem; margin-bottom: .75rem; }
.dc-stat { border: 1px solid var(--dc-line); border-radius: .7rem; padding: .6rem .8rem; }
.dc-stat-v { font-size: 1.35rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.dc-stat-l { font-size: .75rem; color: var(--dc-muted); }
.dc-mean { font-size: .82rem; color: var(--dc-ink-2); margin-top: .6rem; }

.dc-heatwrap { overflow-x: auto; border: 1px solid var(--dc-line); border-radius: .7rem; }
table.dc-heat { border-collapse: separate; border-spacing: 2px; font-size: .78rem; font-variant-numeric: tabular-nums; width: 100%; margin: 0; }
.dc-heat th, .dc-heat td { padding: 0; border: 0; }
.dc-heat thead th { font-weight: 600; color: var(--dc-ink-2); text-align: center; padding: .35rem .2rem; cursor: pointer; white-space: nowrap; position: sticky; top: 0; background: var(--dc-card); font-family: var(--dc-mono); font-size: .74rem; }
.dc-heat thead th:first-child { text-align: left; font-family: inherit; font-size: .78rem; cursor: default; }
.dc-heat thead th[aria-sort] { color: var(--dc-accent); }
.dc-heat thead th.dc-clair { font-family: inherit; white-space: normal; min-width: 4.5rem; line-height: 1.2; vertical-align: bottom; }
.dc-heat tbody th { text-align: left; font-weight: 500; padding: 0 .6rem 0 .4rem; white-space: nowrap; color: var(--dc-ink-2); cursor: pointer; position: sticky; left: 0; background: var(--dc-card); }
.dc-heat td { text-align: center; min-width: 1.85rem; height: 1.7rem; border-radius: 3px; padding: 0 .1rem; }
.dc-heat td.dc-moy { background: transparent !important; color: var(--dc-ink); font-weight: 600; }
.dc-heat tr.dc-ens th { font-weight: 700; color: var(--dc-ink); }
.dc-heat tr.dc-ens td { box-shadow: inset 0 -2px 0 var(--dc-ref); }
.dc-heat tr.dc-sel th { color: var(--dc-accent); font-weight: 700; }
.dc-heat tr.dc-sel th::before { content: "▸ "; }
.dc-heat tbody tr:hover th { color: var(--dc-ink); }
.dc-grad { display: flex; flex-wrap: wrap; align-items: center; gap: .3rem .5rem; white-space: nowrap; font-size: .76rem; color: var(--dc-muted); margin: .6rem 0 0; }
.dc-grad span.g { display: inline-block; width: 9rem; height: .6rem; border-radius: 3px; }
.dc-catleg { margin-top: .6rem; font-size: .78rem; color: var(--dc-ink-2); columns: 2 16rem; }
.dc-catleg div { break-inside: avoid; }
.dc-catleg code { font-family: var(--dc-mono); color: var(--dc-muted); background: none; padding: 0; margin-right: .3rem; }

.dc-range svg { display: block; width: 100%; height: auto; overflow: visible; }
.dc-range text { font-size: 12px; fill: var(--dc-ink-2); font-variant-numeric: tabular-nums; }
.dc-range .ax line, .dc-range .ax path { stroke: var(--dc-line-2); }
.dc-range .grid line { stroke: var(--dc-line); }

table.dc-codes { width: 100%; border-collapse: collapse; font-size: .85rem; margin: 0; }
.dc-codes th, .dc-codes td { border-bottom: 1px solid var(--dc-line); padding: .35rem .5rem; text-align: left; vertical-align: top; }
.dc-codes th { font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; color: var(--dc-muted); font-weight: 600; }
.dc-codes td:first-child { font-family: var(--dc-mono); white-space: nowrap; width: 5rem; }
.dc-tag { font-size: .7rem; border-radius: 999px; padding: .05rem .5rem; border: 1px solid var(--dc-line-2); color: var(--dc-muted); white-space: nowrap; }
.dc-tag.nr { border-style: dashed; }
.dc-codes-wrap { max-height: 28rem; overflow-y: auto; border-bottom: 1px solid var(--dc-line); }
.dc-codes thead th { position: sticky; top: 0; background: var(--dc-card); }
.dc-codes-filter { margin-bottom: .6rem; width: 100%; max-width: 20rem; font: inherit; padding: .35rem .6rem; border-radius: .5rem; border: 1px solid var(--dc-line-2); background: var(--dc-card); color: var(--dc-ink); }

.dc-pre { position: relative; }
.dc-pre pre { background: var(--dc-wash); border: 1px solid var(--dc-line); border-radius: .7rem; padding: .9rem 1rem; font-family: var(--dc-mono); font-size: .8rem; overflow-x: auto; margin: 0; color: var(--dc-ink); white-space: pre; }
.dc-pre .dc-copy { position: absolute; top: .5rem; right: .5rem; }
.dc-note { font-size: .78rem; color: var(--dc-muted); margin-top: .9rem; line-height: 1.45; }
.dc-msg { padding: 1rem 1.1rem; border-radius: .7rem; background: var(--dc-wash); color: var(--dc-ink-2); font-size: .9rem; }

.dc-welcome h3 { font-size: 1.15rem; margin: .2rem 0 .5rem; border: 0; }
.dc-welcome p { color: var(--dc-ink-2); margin: 0 0 .9rem; }
.dc-sugg { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1.2rem; }
.dc-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: .75rem; }
.dc-step { border: 1px solid var(--dc-line); border-radius: .7rem; padding: .75rem .85rem; font-size: .85rem; color: var(--dc-ink-2); }
.dc-step b { display: block; color: var(--dc-ink); margin-bottom: .2rem; }
.dc-tip { position: fixed; z-index: 1000; pointer-events: none; background: var(--dc-card); color: var(--dc-ink); border: 1px solid var(--dc-line-2); border-radius: .5rem; padding: .45rem .6rem; font-size: .8rem; box-shadow: 0 4px 16px rgba(0,0,0,.12); max-width: 18rem; opacity: 0; transition: opacity .1s; }
.dc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .dc-bar, .dc-ref { transition: none; } }
`;

// --- Composant principal ----------------------------------------------------------

export function dictionnaireCodes({ d3, base = "data/dico/", invalidation } = {}) {
  if (!document.getElementById("dc-style")) {
    document.head.append(el("style", { id: "dc-style" }, CSS));
  }

  const racine = el("div", { class: "dc-root" });
  const tip = el("div", { class: "dc-tip", role: "tooltip" });
  document.body.append(tip);
  invalidation?.then(() => tip.remove());

  const etat = {
    source: "ess", requete: "", vagues: new Set(), tech: false, limite: 80,
    sel: null, jeu: null, pays: "FR", onglet: "tap", triCol: null, triSens: -1
  };

  let INDEX = null;               // contenu de index.json
  let JEUX = {};                  // id -> description du fichier
  const cache = new Map();        // id -> Promise du fichier détaillé
  const charger = id => {
    if (!cache.has(id)) cache.set(id, fetch(`${base}${id}.json`).then(r => {
      if (!r.ok) throw new Error(`${id}.json introuvable`);
      return r.json();
    }));
    return cache.get(id);
  };

  // ---- Structure de la page ----
  const champ = el("input", {
    type: "search", placeholder: "Rechercher : confiance, police, ppltrst…",
    "aria-label": "Rechercher une variable", autocomplete: "off", spellcheck: "false"
  });
  const effacer = el("button", { class: "dc-clear", "aria-label": "Effacer la recherche", hidden: true }, "×");
  const loupe = el("span", { class: "dc-loupe", "aria-hidden": "true" });
  loupe.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
  const boutonsSrc = {};
  const zoneSrc = el("div", { class: "dc-sources", role: "group", "aria-label": "Choisir l'enquête" },
    Object.entries(SOURCES).map(([k, s]) => {
      const n = el("span", { class: "dc-src-n" }, "…");
      const b = el("button", { class: "dc-src", "aria-pressed": String(k === etat.source),
        onclick: () => { if (etat.source !== k) { etat.source = k; etat.vagues.clear(); etat.limite = 80; majTout(); } } },
        el("span", { class: "dc-src-nom" }, s.nom, n), el("span", { class: "dc-src-sous" }, s.sous));
      boutonsSrc[k] = { b, n };
      return b;
    }));
  const filtres = el("div", { class: "dc-filters" });
  const compte = el("div", { class: "dc-count", "aria-live": "polite" });
  const liste = el("div", { class: "dc-list", role: "listbox", "aria-label": "Variables trouvées" });
  const fiche = el("div", { class: "dc-fiche", "aria-live": "polite" });

  racine.append(
    el("div", { class: "dc-head" },
      el("div", { class: "dc-search" }, loupe, champ, effacer), zoneSrc),
    filtres,
    el("div", { class: "dc-grid" },
      el("div", { class: "dc-listwrap" }, compte, liste), fiche)
  );

  let minuteur;
  champ.addEventListener("input", () => {
    clearTimeout(minuteur);
    effacer.hidden = !champ.value;
    minuteur = setTimeout(() => { etat.requete = champ.value; etat.limite = 80; majTout(); }, 120);
  });
  champ.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); liste.querySelector(".dc-item")?.focus(); }
    if (e.key === "Enter") { const p = liste.querySelector(".dc-item"); if (p) p.click(); }
  });
  effacer.addEventListener("click", () => { champ.value = ""; effacer.hidden = true; etat.requete = ""; majTout(); champ.focus(); });
  liste.addEventListener("keydown", e => {
    const items = [...liste.querySelectorAll(".dc-item")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? items[i - 1] : champ).focus(); }
  });

  // ---- Recherche ----
  function termes(requete) {
    return norm(requete).split(/[^a-z0-9_]+/).filter(t => t.length > 0)
      .map(t => [t, ...(SYNONYMES[t] || []).map(norm)]);
  }
  function rechercher() {
    const groupes = termes(etat.requete);
    const res = { ess: [], cronos: [] };
    for (const v of INDEX.vars) {
      if (!etat.tech && v.t === "tech") continue;
      let score = 0;
      if (groupes.length) {
        let ok = true;
        for (const g of groupes) {
          let meilleur = 0;
          for (const t of g) {
            if (v._n === t) meilleur = Math.max(meilleur, 100);
            else if (v._n.startsWith(t)) meilleur = Math.max(meilleur, 50);
            else if (v._l.includes(" " + t)) meilleur = Math.max(meilleur, 20);
            else if (v._q.includes(" " + t)) meilleur = Math.max(meilleur, 8);
          }
          if (!meilleur) { ok = false; break; }
          score += meilleur;
        }
        if (!ok) continue;
      }
      res[v.s].push({ v, score: score + v._d.length * 0.3 });
    }
    for (const k in res) res[k].sort((a, b) => b.score - a.score || a.v.n.localeCompare(b.v.n));
    return res;
  }

  // ---- Mise à jour générale ----
  function majTout() {
    const res = rechercher();
    for (const k in boutonsSrc) {
      boutonsSrc[k].b.setAttribute("aria-pressed", String(k === etat.source));
      boutonsSrc[k].n.textContent = nf0.format(res[k].length);
    }
    majFiltres();
    let r = res[etat.source];
    if (etat.vagues.size) r = r.filter(x => x.v._d.some(d => etat.vagues.has(d)));
    majListe(r);
    if (!etat.sel) majAccueil();
  }

  function majFiltres() {
    const jeux = INDEX.jeux.filter(j => j.source === etat.source);
    vider(filtres, 
      el("span", { class: "dc-flabel" }, "Vagues :"),
      el("button", { class: "dc-chip", "aria-pressed": String(etat.vagues.size === 0),
        onclick: () => { etat.vagues.clear(); majTout(); } }, "Toutes"),
      jeux.map(j => el("button", {
        class: "dc-chip", "aria-pressed": String(etat.vagues.has(j.id)), title: `${j.titre} · ${j.annee}`,
        onclick: () => { etat.vagues.has(j.id) ? etat.vagues.delete(j.id) : etat.vagues.add(j.id); majTout(); }
      }, etiquetteVague(j))),
      el("label", { class: "dc-toggle" },
        el("input", { type: "checkbox", checked: etat.tech,
          onchange: e => { etat.tech = e.target.checked; majTout(); } }),
        "Variables techniques")
    );
  }

  const etiquetteVague = j => j.source === "ess" ? j.vague
    : (j.vague === "0" ? "Accueil" : j.vague + ((j.vague === "3" || j.vague === "6") ? " FR" : ""));

  function points(v) {
    const jeux = INDEX.jeux.filter(j => j.source === v.s);
    const present = new Set(v._d);
    const n = jeux.filter(j => present.has(j.id)).length;
    return el("div", { class: "dc-dots", "aria-label": `Présente dans ${n} vague${n > 1 ? "s" : ""} sur ${jeux.length}` },
      jeux.map(j => el("span", { class: "dc-dot" + (present.has(j.id) ? " on" : ""), title: j.titre })),
      el("span", { class: "dc-dots-lab" }, `${n}/${jeux.length}`));
  }

  function majListe(r) {
    const mots = termes(etat.requete).flat();
    const nomSrc = SOURCES[etat.source].nom;
    compte.textContent = r.length
      ? `${nf0.format(r.length)} variable${r.length > 1 ? "s" : ""} · ${nomSrc}`
      : `Aucune variable · ${nomSrc}`;
    if (!r.length) {
      const autre = etat.source === "ess" ? "cronos" : "ess";
      vider(liste, el("div", { class: "dc-empty" },
        "Aucun résultat. Essayez un mot en anglais (les questionnaires sont en anglais), ",
        "le nom d'une variable, ou regardez du côté de ",
        el("button", { class: "dc-chip", onclick: () => { etat.source = autre; etat.vagues.clear(); majTout(); } },
          SOURCES[autre].nom), "."));
      return;
    }
    const items = r.slice(0, etat.limite).map(({ v }) => {
      const choisi = etat.sel && etat.sel.s === v.s && etat.sel.n === v.n;
      return el("button", {
        class: "dc-item", role: "option", "aria-selected": String(!!choisi),
        onclick: () => choisir(v)
      },
        el("div", { class: "dc-item-top" }, el("code", {}, surligner(v.n, mots)),
          el("span", { class: "dc-badge" }, TYPES[v.t] || "")),
        el("div", { class: "dc-item-lab" }, surligner(v.l || "(sans libellé)", mots)),
        points(v));
    });
    vider(liste, ...items);
    if (r.length > etat.limite) liste.append(el("button", { class: "dc-more",
      onclick: () => { etat.limite += 200; majTout(); } },
      `Afficher plus (${nf0.format(r.length - etat.limite)} restantes)`));
  }

  // ---- Accueil (aucune variable choisie) ----
  function majAccueil() {
    vider(fiche, el("div", { class: "dc-welcome" },
      el("h3", {}, "Trouver une question, voir ses réponses"),
      el("p", {}, "Tapez un thème ou le nom d'une variable. La recherche porte sur toutes les vagues de l'ESS et de CRONOS-2 ; choisissez l'enquête avec les deux boutons placés à côté de la barre de recherche."),
      el("div", { class: "dc-sugg" }, SUGGESTIONS.map(s => el("button", { class: "dc-chip",
        onclick: () => { champ.value = s; effacer.hidden = false; etat.requete = s; majTout(); } }, s))),
      el("div", { class: "dc-steps" },
        el("div", { class: "dc-step" }, el("b", {}, "1. Chercher"), "En français ou en anglais : les mots courants sont traduits automatiquement."),
        el("div", { class: "dc-step" }, el("b", {}, "2. Lire la question"), "Formulation exacte, consigne à l'enquêteur, codes et non-réponses."),
        el("div", { class: "dc-step" }, el("b", {}, "3. Voir les réponses"), "Tri à plat pondéré pour chaque pays, et comparaison entre pays.")
      )));
  }

  // ---- Choix d'une variable ----
  function choisir(v, jeuVoulu, garderOnglet) {
    etat.sel = v;
    const d = v._d;
    etat.jeu = jeuVoulu && d.includes(jeuVoulu) ? jeuVoulu : d[d.length - 1];
    if (!garderOnglet) etat.triCol = null;
    liste.querySelectorAll(".dc-item").forEach(b =>
      b.setAttribute("aria-selected", String(b.querySelector("code").textContent === v.n)));
    majFiche();
    majAncre();
    if (window.matchMedia("(max-width: 880px)").matches && !jeuVoulu)
      fiche.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function majAncre() {
    if (!etat.sel) return;
    const h = `#v=${etat.sel.s}:${etat.sel.n}&j=${etat.jeu}&p=${etat.pays}`;
    history.replaceState(null, "", h);
  }

  async function majFiche() {
    const v = etat.sel, idJeu = etat.jeu;
    vider(fiche, el("div", { class: "dc-msg" }, "Chargement…"));
    let jeu;
    try { jeu = await charger(idJeu); }
    catch (e) { vider(fiche, el("div", { class: "dc-msg" }, "Impossible de charger les données : " + e.message)); return; }
    if (etat.sel !== v || etat.jeu !== idJeu) return;
    const f = jeu.vars[v.n];
    if (!f) { vider(fiche, el("div", { class: "dc-msg" }, "Variable absente de ce fichier.")); return; }
    const type = f.t === "cat" && f.ord ? "ord" : f.t;

    const copier = el("button", { class: "dc-copy", onclick: e => copierTexte(v.n, e.currentTarget) }, "Copier le nom");
    const vagues = el("div", { class: "dc-waves", role: "group", "aria-label": "Vague" },
      el("span", { class: "dc-waves-lab" }, "Vague"),
      INDEX.jeux.filter(j => j.source === v.s).map(j => el("button", {
        class: "dc-wave", "aria-pressed": String(j.id === idJeu), disabled: !v._d.includes(j.id),
        title: `${j.titre} · ${j.annee}` + (v._d.includes(j.id) ? "" : " · question absente"),
        onclick: () => { etat.jeu = j.id; majFiche(); majAncre(); }
      }, etiquetteVague(j))));

    const q = f.q
      ? el("div", { class: "dc-q" },
          f.i ? el("div", { class: "dc-q-instr" }, f.i) : null,
          el("div", { class: "dc-q-texte" }, f.q),
          el("div", { class: "dc-q-note" }, arr(jeu.pays).length === 1
            ? "Question posée uniquement en France (vague nationale) : formulation du codebook."
            : "Formulation du questionnaire source, en anglais. La version française figure dans le questionnaire national."))
      : el("div", { class: "dc-q" }, el("div", { class: "dc-q-texte" },
          "Pas de texte de question dans le codebook : variable calculée, administrative ou issue d'une autre source."));

    const onglets = [
      ["tap", "Tri à plat", ["cat", "ord", "num"].includes(type)],
      ["cmp", "Comparer les pays", ["cat", "ord", "num"].includes(type) && arr(jeu.pays).length > 1],
      ["codes", "Codes", true],
      ["r", "Code R", ["cat", "ord", "num"].includes(type)]
    ].filter(o => o[2]);
    if (!onglets.some(o => o[0] === etat.onglet)) etat.onglet = onglets[0][0];
    const corps = el("div", { role: "tabpanel" });
    const barre = el("div", { class: "dc-tabs", role: "tablist" }, onglets.map(([k, lab]) => el("button", {
      class: "dc-tab", role: "tab", "aria-selected": String(k === etat.onglet),
      onclick: e => { etat.onglet = k; const cible = e.currentTarget; barre.querySelectorAll(".dc-tab").forEach(b => b.setAttribute("aria-selected", String(b === cible))); rendreOnglet(); }
    }, lab)));

    etat.rendre = () => rendreOnglet();
    function rendreOnglet() {
      vider(corps, );
      if (etat.onglet === "tap") corps.append(type === "num" ? vueNum(jeu, f) : vueBarres(jeu, f, type));
      if (etat.onglet === "cmp") corps.append(type === "num" ? vueIntervalles(jeu, f) : vueChaleur(jeu, f, type));
      if (etat.onglet === "codes") corps.append(vueCodes(f));
      if (etat.onglet === "r") corps.append(vueR(jeu, f, v.n, type));
    }

    const message = f.t === "tech"
      ? el("div", { class: "dc-msg" }, "Variable technique (identifiant, pondération, date, durée…) : pas de tri à plat.")
      : f.t === "many"
        ? el("div", { class: "dc-msg" }, `Cette variable compte ${arr(f.cats).length} modalités : un tri à plat ne serait pas lisible. La liste complète des codes est dans l'onglet « Codes ».`)
        : null;

    vider(fiche, 
      el("div", { class: "dc-fiche-top" }, el("code", { class: "dc-name" }, v.n), copier,
        el("span", { class: "dc-badge" }, TYPES[type] || "")),
      el("div", { class: "dc-label" }, f.lab || "(sans libellé)"),
      vagues, q, message, barre, corps);
    rendreOnglet();
  }

  // ---- Sélecteur de pays ----
  function selecteurPays(jeu, tap, avecEnsemble = true) {
    const pays = arr(jeu.pays).filter(p => tap[p]);
    if (!tap[etat.pays] && etat.pays !== "ALL") etat.pays = pays.includes("FR") ? "FR" : (avecEnsemble ? "ALL" : pays[0]);
    const nom = p => INDEX.pays[p] || p;
    const s = el("select", { "aria-label": "Pays",
      onchange: e => { etat.pays = e.target.value; majAncre(); majFiche(); } },
      avecEnsemble && arr(jeu.pays).length > 1 ? el("option", { value: "ALL", selected: etat.pays === "ALL" }, "Ensemble des pays") : null,
      pays.slice().sort((a, b) => nom(a).localeCompare(nom(b), "fr"))
        .map(p => el("option", { value: p, selected: etat.pays === p }, nom(p))));
    return el("label", {}, "Pays ", s);
  }
  const nomPays = p => p === "ALL" ? "Ensemble des pays" : (INDEX.pays[p] || p);
  // Pays réellement affiché : un fichier d'un seul pays n'a pas d'« ensemble »
  const paysEffectif = (jeu, tap) => arr(jeu.pays).length === 1 ? arr(jeu.pays)[0]
    : (tap[etat.pays] ? etat.pays : "ALL");

  // ---- Vue 1 : tri à plat d'une variable catégorielle ----
  function vueBarres(jeu, f, type) {
    const tap = f.tap || {};
    const sortie = el("div");
    const ctrl = el("div", { class: "dc-ctrl" }, selecteurPays(jeu, tap));
    sortie.append(ctrl);
    const p = paysEffectif(jeu, tap);
    const d = tap[p], ens = p !== "ALL" && arr(jeu.pays).length > 1 ? tap.ALL : null;
    if (!d) { sortie.append(el("div", { class: "dc-msg" }, "Aucune réponse valide.")); return sortie; }
    const cats = arr(f.cats), fr = arr(d.f), fe = ens ? arr(ens.f) : [];
    const max = Math.max(...fr, ...fe, 1);
    sortie.append(el("div", { class: "dc-legend" },
      el("span", {}, el("span", { class: "dc-sw" }), `${nomPays(p)} · ${nf0.format(d.nv)} réponses valides`),
      ens ? el("span", {}, el("span", { class: "dc-sw-ref" }), "Ensemble des pays") : null));
    const grille = el("div", { class: "dc-bars", role: "table", "aria-label": `Tri à plat, ${nomPays(p)}` });
    cats.forEach(([code, lib], i) => {
      const val = fr[i] ?? 0, ref = fe[i];
      const ligne = el("div", { class: "dc-brow", role: "row" },
        el("div", { class: "dc-blab", role: "rowheader", title: `${code} · ${lib}` },
          el("span", { class: "dc-code" }, code), lib === String(code) ? "" : lib),
        el("div", { class: "dc-track", role: "cell" },
          el("div", { class: "dc-bar", style: `width:0%` }),
          ref != null ? el("div", { class: "dc-ref", style: `left:${(ref / max) * 100}%` }) : null),
        el("div", { class: "dc-bval", role: "cell" }, pct(val)));
      ligne.addEventListener("mousemove", ev => montrer(ev,
        `<b>${echapper(String(code))} · ${echapper(lib)}</b><br>${echapper(nomPays(p))} : ${pct(val)}` +
        (ref != null ? `<br>Ensemble des pays : ${pct(ref)}` : "")));
      ligne.addEventListener("mouseleave", cacher);
      grille.append(ligne);
      requestAnimationFrame(() => { ligne.querySelector(".dc-bar").style.width = `${(val / max) * 100}%`; });
    });
    sortie.append(grille);
    if (type === "ord" && cats.length >= 7) {
      const m = moyenne(cats, fr), me = ens ? moyenne(cats, fe) : null;
      if (m != null) sortie.append(el("div", { class: "dc-mean" },
        `Moyenne sur l'échelle : `, el("strong", {}, nf1.format(m)),
        me != null ? ` (ensemble des pays : ${nf1.format(me)})` : ""));
    }
    sortie.append(blocNR(f, d), notePoids(jeu));
    return sortie;
  }

  function moyenne(cats, fr) {
    let s = 0, t = 0;
    cats.forEach(([c], i) => { const x = Number(c); if (!isNaN(x)) { s += x * (fr[i] || 0); t += fr[i] || 0; } });
    return t ? s / t : null;
  }

  function blocNR(f, d) {
    const miss = arr(f.miss), m = arr(d.m);
    const items = [];
    miss.forEach(([code, lib], i) => { if (m[i] > 0) items.push([`${lib} (${code})`, m[i]]); });
    const vide = m[miss.length];
    if (vide > 0) items.push(["Valeur vide (question non posée)", vide]);
    if (!items.length) return el("div", { class: "dc-nr" }, el("strong", {}, "Non-réponses :"), " aucune.");
    return el("div", { class: "dc-nr" }, el("strong", {}, "Non-réponses, en % de l'ensemble des répondants :"),
      items.map(([l, x]) => el("span", {}, `${l} ${pct(x)}`)));
  }

  function notePoids(jeu) {
    return el("div", { class: "dc-note" },
      `Pourcentages pondérés, calculés parmi les réponses valides. Pondération : ${jeu.poids}. `,
      `Source : ${jeu.fichier}.`);
  }

  // ---- Vue 2 : comparaison entre pays (carte de chaleur) ----
  function vueChaleur(jeu, f, type) {
    const tap = f.tap || {}, cats = arr(f.cats);
    const sortie = el("div");
    const pays = arr(jeu.pays).filter(p => tap[p]);
    const avecMoy = type === "ord" && cats.length >= 5 && cats.every(([c]) => !isNaN(Number(c)));
    const sombre = racine.closest(".quarto-dark") != null || document.body.classList.contains("quarto-dark");
    const couleur = rampe(sombre);
    const maxv = Math.max(...pays.flatMap(p => arr(tap[p].f)), 1);
    if (etat.triCol == null) etat.triCol = avecMoy ? "moy" : 0;
    const cle = p => etat.triCol === "moy" ? moyenne(cats, arr(tap[p].f)) : arr(tap[p].f)[etat.triCol];
    const ordre = pays.slice().sort((a, b) => etat.triSens * ((cle(a) ?? -1) - (cle(b) ?? -1)) || (INDEX.pays[a] || a).localeCompare(INDEX.pays[b] || b, "fr"));

    sortie.append(el("div", { class: "dc-ctrl" },
      el("span", {}, "Cliquez sur une colonne pour trier les pays, sur un pays pour voir son tri à plat.")));

    const enClair = type !== "ord" && cats.length <= 6 && cats.some(([c, lib]) => lib !== String(c));
    const court = lib => lib.length > 16 ? lib.slice(0, 15) + "…" : lib;
    const entete = el("tr", {}, el("th", { scope: "col" }, "Pays"),
      cats.map(([c, lib], i) => el("th", { scope: "col", title: `${c} · ${lib}`, class: enClair ? "dc-clair" : null,
        "aria-sort": etat.triCol === i ? (etat.triSens < 0 ? "descending" : "ascending") : null,
        onclick: () => { trier(i); } }, enClair ? court(lib) : String(c))),
      avecMoy ? el("th", { scope: "col", title: "Moyenne sur l'échelle", "aria-sort": etat.triCol === "moy" ? (etat.triSens < 0 ? "descending" : "ascending") : null, onclick: () => trier("moy") }, "Moy.") : null);
    function trier(c) {
      if (etat.triCol === c) etat.triSens *= -1; else { etat.triCol = c; etat.triSens = -1; }
      etat.rendre();
    }
    const ligne = (p, classe) => {
      const fr = arr(tap[p].f);
      const tr = el("tr", { class: classe + (p === etat.pays ? " dc-sel" : "") },
        el("th", { scope: "row", onclick: () => { if (p !== "ALL") { etat.pays = p; etat.onglet = "tap"; majAncre(); majFiche(); } } }, nomPays(p)),
        fr.map((x, i) => {
          const bg = couleur(x / maxv);
          const td = el("td", { style: `background:${bg};color:${encreSur(bg)}` }, nf0.format(x));
          td.addEventListener("mousemove", ev => montrer(ev,
            `<b>${echapper(nomPays(p))}</b><br>${echapper(String(cats[i][0]))} · ${echapper(cats[i][1])}<br>${pct(x)} des réponses valides`));
          td.addEventListener("mouseleave", cacher);
          return td;
        }),
        avecMoy ? el("td", { class: "dc-moy" }, nf1.format(moyenne(cats, fr))) : null);
      return tr;
    };
    const corpsTab = el("div");
    corpsTab.append(el("div", { class: "dc-heatwrap" }, el("table", { class: "dc-heat" },
      el("caption", { class: "dc-sr" }, `Répartition des réponses (%) par pays, ${f.lab}`),
      el("thead", {}, entete),
      el("tbody", {}, tap.ALL ? ligne("ALL", "dc-ens") : null, ordre.map(p => ligne(p, ""))))));
    corpsTab.append(el("div", { class: "dc-grad" }, "0 %",
      el("span", { class: "g", style: `background:linear-gradient(90deg,${[0, .2, .4, .6, .8, 1].map(t => couleur(t)).join(",")})` }),
      `${nf0.format(maxv)} %`, el("span", {}, " · % des réponses valides, par pays (la ligne « Ensemble » est soulignée)")));
    const parlants = enClair ? [] : cats.filter(([c, lib]) => lib !== String(c));
    if (parlants.length) corpsTab.append(el("div", { class: "dc-catleg" },
      parlants.map(([c, lib]) => el("div", {}, el("code", {}, c), lib))));
    corpsTab.append(notePoids(jeu));
    sortie.append(corpsTab);
    return sortie;
  }

  // ---- Vue 3 : variable numérique, un pays ----
  function vueNum(jeu, f) {
    const tap = f.tap || {};
    const sortie = el("div", {}, el("div", { class: "dc-ctrl" }, selecteurPays(jeu, tap)));
    const p = paysEffectif(jeu, tap);
    const d = tap[p];
    if (!d) { sortie.append(el("div", { class: "dc-msg" }, "Aucune réponse valide.")); return sortie; }
    const [n, moy, p10, p25, p50, p75, p90, mn, mx] = d.s;
    const tuile = (v, l) => el("div", { class: "dc-stat" }, el("div", { class: "dc-stat-v" }, v), el("div", { class: "dc-stat-l" }, l));
    sortie.append(el("div", { class: "dc-stats" },
      tuile(nfs.format(moy), "Moyenne"), tuile(nfs.format(p50), "Médiane"),
      tuile(`${nfs.format(p25)} – ${nfs.format(p75)}`, "1er – 3e quartile"),
      tuile(`${nfs.format(mn)} – ${nfs.format(mx)}`, "Minimum – maximum"),
      tuile(nf0.format(n), "Réponses valides"), tuile(pct(d.nr), "Non-réponses")));
    sortie.append(el("div", { class: "dc-note" },
      `${nomPays(p)} : la moitié des répondants se situe entre ${nfs.format(p25)} et ${nfs.format(p75)} ; 80 % entre ${nfs.format(p10)} et ${nfs.format(p90)}.`));
    sortie.append(notePoids(jeu));
    return sortie;
  }

  // ---- Vue 4 : variable numérique, comparaison entre pays ----
  function vueIntervalles(jeu, f) {
    const tap = f.tap || {};
    const sortie = el("div", { class: "dc-range" });
    const pays = arr(jeu.pays).filter(p => tap[p]);
    const lignes = [...(tap.ALL ? ["ALL"] : []), ...pays.slice().sort((a, b) => tap[b].s[4] - tap[a].s[4])];
    const W = Math.max(300, Math.min(760, (fiche.clientWidth || 640) - 50));
    const gauche = W < 420 ? 96 : 130, droite = 16, h = 22, haut = 28;
    const H = haut + lignes.length * h + 10;
    const xmin = d3.min(lignes, p => tap[p].s[2]), xmax = d3.max(lignes, p => tap[p].s[6]);
    const x = d3.scaleLinear().domain([xmin, xmax]).nice().range([gauche, W - droite]);
    const svg = d3.create("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", `Médiane et dispersion par pays, ${f.lab}`);
    svg.append("g").attr("class", "grid").selectAll("line").data(x.ticks(6)).join("line")
      .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", haut - 4).attr("y2", H - 6);
    svg.append("g").attr("class", "ax").attr("transform", `translate(0,${haut - 6})`)
      .call(d3.axisTop(x).ticks(6).tickSize(0).tickFormat(d => nfs.format(d))).call(g => g.select(".domain").remove());
    const g = svg.append("g").selectAll("g").data(lignes).join("g")
      .attr("transform", (p, i) => `translate(0,${haut + i * h + h / 2})`);
    g.append("text").attr("x", gauche - 10).attr("dy", "0.35em").attr("text-anchor", "end")
      .style("font-weight", p => p === "ALL" || p === etat.pays ? 700 : 400)
      .text(p => nomPays(p));
    g.append("line").attr("x1", p => x(tap[p].s[2])).attr("x2", p => x(tap[p].s[6]))
      .attr("stroke", "var(--dc-line-2)").attr("stroke-width", 2).attr("stroke-linecap", "round");
    g.append("rect").attr("x", p => x(tap[p].s[3])).attr("y", -5).attr("height", 10)
      .attr("width", p => Math.max(2, x(tap[p].s[5]) - x(tap[p].s[3]))).attr("rx", 4)
      .attr("fill", p => p === "ALL" ? "var(--dc-ref)" : "var(--dc-accent)").attr("opacity", .35);
    g.append("circle").attr("cx", p => x(tap[p].s[4])).attr("r", 5)
      .attr("fill", p => p === "ALL" ? "var(--dc-ref)" : "var(--dc-accent)")
      .attr("stroke", "var(--dc-card)").attr("stroke-width", 2);
    g.append("rect").attr("x", 0).attr("width", W).attr("y", -h / 2).attr("height", h).attr("fill", "transparent")
      .on("mousemove", (ev, p) => { const s = tap[p].s; montrer(ev,
        `<b>${echapper(nomPays(p))}</b><br>Médiane : ${nfs.format(s[4])} · moyenne : ${nfs.format(s[1])}<br>Quartiles : ${nfs.format(s[3])} – ${nfs.format(s[5])}<br>${nf0.format(s[0])} réponses valides`); })
      .on("mouseleave", cacher);
    sortie.append(el("div", { class: "dc-legend" },
      el("span", {}, "● médiane"), el("span", {}, "▬ moitié centrale des répondants (quartiles)"),
      el("span", {}, "— 80 % des répondants (1er au 9e décile)")), svg.node(), notePoids(jeu));
    return sortie;
  }

  // ---- Vue 5 : liste des codes ----
  function vueCodes(f) {
    const cats = arr(f.cats).map(([c, l]) => [c, l, false]);
    const miss = arr(f.miss).map(([c, l]) => [c, l, true]);
    const toutes = [...cats, ...miss];
    if (!toutes.length) return el("div", { class: "dc-msg" }, "Pas de liste de codes : la variable est numérique, ses valeurs sont directement des nombres.");
    const corps = el("tbody");
    const remplir = filtre => vider(corps, ...toutes
      .filter(([c, l]) => !filtre || norm(`${c} ${l}`).includes(norm(filtre)))
      .map(([c, l, nr]) => el("tr", {}, el("td", {}, String(c)), el("td", {}, l),
        el("td", {}, el("span", { class: "dc-tag" + (nr ? " nr" : "") }, nr ? "non-réponse" : "valide")))));
    remplir("");
    return el("div", {},
      toutes.length > 15 ? el("input", { class: "dc-codes-filter", type: "search", placeholder: "Filtrer les codes…",
        "aria-label": "Filtrer les codes", oninput: e => remplir(e.target.value) }) : null,
      el("div", { class: "dc-codes-wrap" }, el("table", { class: "dc-codes" },
        el("thead", {}, el("tr", {}, el("th", {}, "Code"), el("th", {}, "Libellé"), el("th", {}, "Statut"))), corps)),
      el("div", { class: "dc-note" }, "Les codes de non-réponse doivent être exclus avant tout calcul : laissés dans les données, ils faussent les moyennes et les pourcentages sans aucun message d'erreur."));
  }

  // ---- Vue 6 : le code R pour refaire le calcul ----
  function vueR(jeu, f, nom, type) {
    const objet = jeu.source === "ess" ? `ess${jeu.vague}` : `cronos2_v${jeu.vague}`;
    const pEff = paysEffectif(jeu, f.tap || {});
    const poids = jeu.source === "ess" ? (pEff === "ALL" ? "anweight" : "pspwght")
      : (jeu.poids.startsWith("aucun") ? null : "c2weight");
    const codesNR = arr(f.miss).map(([c]) => c);
    const filtrePays = pEff !== "ALL" && arr(jeu.pays).length > 1 ? `cntry == "${pEff}", ` : "";
    const filtreNR = codesNR.length ? `,\n         !${nom} %in% c(${codesNR.join(", ")})` : "";
    const lignes = [
      `library(haven)`, `library(dplyr)`, ``,
      `${objet} <- read_sav("${jeu.fichier}.sav")`, ``,
      type === "num"
        ? `${objet} |>\n  filter(${filtrePays}!is.na(${nom})${filtreNR}) |>\n  summarise(n = n(),\n            moyenne = ${poids ? `weighted.mean(${nom}, ${poids})` : `mean(${nom})`})`
        : `${objet} |>\n  filter(${filtrePays}!is.na(${nom})${filtreNR}) |>\n  count(${nom} = as_factor(${nom})${poids ? `, wt = ${poids}` : ""}) |>\n  mutate(pct = round(100 * n / sum(n), 1))`
    ];
    const code = lignes.join("\n");
    return el("div", {},
      el("p", { class: "dc-note", style: "margin-top:0" },
        `Ce code refait le calcul affiché dans l'onglet « Tri à plat » pour ${pEff === "ALL" ? "l'ensemble des pays" : nomPays(pEff)}. `,
        "Changez de pays dans l'onglet « Tri à plat » pour adapter le filtre."),
      el("div", { class: "dc-pre" }, el("pre", {}, code),
        el("button", { class: "dc-copy", onclick: e => copierTexte(code, e.currentTarget) }, "Copier")),
      el("div", { class: "dc-note" }, "Le fichier .sav se télécharge sur le portail de l'ESS (voir la page « Comprendre les données »). ",
        poids ? `La pondération ${poids} est appliquée avec l'argument wt.` : "Ce fichier ne contient pas de pondération."));
  }

  // ---- Infobulle et copie ----
  function echapper(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function montrer(ev, html) {
    tip.innerHTML = html; tip.style.opacity = 1;
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function cacher() { tip.style.opacity = 0; }
  async function copierTexte(texte, bouton) {
    try { await navigator.clipboard.writeText(texte); const a = bouton.textContent; bouton.textContent = "Copié ✓"; setTimeout(() => bouton.textContent = a, 1400); }
    catch { bouton.textContent = "Copie impossible"; }
  }

  // Le mode sombre de Quarto change la classe du <body> : on redessine l'onglet
  // affiché pour recalculer les couleurs de la carte de chaleur.
  const observateur = new MutationObserver(() => etat.rendre?.());
  observateur.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  invalidation?.then(() => observateur.disconnect());

  // ---- Démarrage ----
  fiche.append(el("div", { class: "dc-msg" }, "Chargement du dictionnaire…"));
  fetch(`${base}index.json`).then(r => r.json()).then(idx => {
    INDEX = idx;
    INDEX.jeux = arr(INDEX.jeux).map(j => ({ ...j, vague: String(j.vague), annee: String(j.annee) }));
    JEUX = Object.fromEntries(INDEX.jeux.map(j => [j.id, j]));
    for (const v of INDEX.vars) {
      // Textes normalisés, précédés d'une espace : on cherche les débuts de mots
      // (« vote » trouve « voted » mais pas « devote »)
      const mots = t => " " + norm(t).replace(/[^a-z0-9]+/g, " ");
      v._d = arr(v.d); v._n = norm(v.n); v._l = mots(v.l); v._q = mots(v.q);
    }
    // Lien direct : #v=ess:ppltrst&j=ess11&p=FR
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get("p")) etat.pays = h.get("p");
    const cible = h.get("v");
    if (cible) {
      const [s, n] = cible.split(":");
      const v = INDEX.vars.find(x => x.s === s && x.n === n);
      if (v) { etat.source = s; champ.value = n; effacer.hidden = false; etat.requete = n; majTout(); choisir(v, h.get("j")); return; }
    }
    majTout();
  }).catch(e => vider(fiche, el("div", { class: "dc-msg" },
    "Impossible de charger le dictionnaire (" + e.message + "). Prévisualisez le site avec « quarto preview » : les données ne se chargent pas si l'on ouvre le fichier HTML directement.")));

  return racine;
}
