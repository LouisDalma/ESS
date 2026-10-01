# ==============================================================================
# Carte de la confiance en Europe : ACM pour la page d'accueil
#
# Ce script calcule une analyse des correspondances multiples (ACM) sur la
# confiance dans sept institutions (ESS, 11e vague) et exporte UNIQUEMENT des
# résultats agrégés (coordonnées et pourcentages) dans un fichier JSON lu par
# la page d'accueil. Les microdonnées de l'ESS ne sont jamais publiées.
#
# Entrée  : le fichier ESS11 téléchargé depuis le portail de l'ESS (.sav)
# Sortie  : data/acm_confiance.json
#
# À relancer uniquement si l'on change de données ou de paramètres : la page
# d'accueil ne refait pas le calcul à chaque rendu du site.
# ==============================================================================

library(haven)
library(dplyr)
library(tidyr)
library(FactoMineR)
library(jsonlite)

# Chemin vers le fichier de l'ESS (à adapter ; ne pas le versionner sur GitHub)
chemin_ess <- "01_Data/ESS11e04_2.sav"
sortie     <- "data/acm_confiance.json"


# 1. Les variables -------------------------------------------------------------

# Sept questions « Quelle confiance avez-vous dans... », notées de 0 à 10.
institutions <- tibble::tribble(
  ~id,       ~label,                    ~court,
  "trstprl", "Le Parlement national",   "Parlement",
  "trstlgl", "La justice",              "Justice",
  "trstplc", "La police",               "Police",
  "trstplt", "Les responsables politiques", "Politiques",
  "trstprt", "Les partis politiques",   "Partis",
  "trstep",  "Le Parlement européen",   "Parlement européen",
  "trstun",  "Les Nations unies",       "ONU"
)
vars <- institutions$id

# Noms des pays en français (30 pays dans l'édition 4.2 de la 11e vague)
noms_pays <- c(
  AT = "Autriche", BE = "Belgique", BG = "Bulgarie", CH = "Suisse",
  CY = "Chypre", DE = "Allemagne", EE = "Estonie", ES = "Espagne",
  FI = "Finlande", FR = "France", GB = "Royaume-Uni", GR = "Grèce",
  HR = "Croatie", HU = "Hongrie", IE = "Irlande", IL = "Israël",
  IS = "Islande", IT = "Italie", LT = "Lituanie", LV = "Lettonie",
  ME = "Monténégro", NL = "Pays-Bas", NO = "Norvège", PL = "Pologne",
  PT = "Portugal", RS = "Serbie", SE = "Suède", SI = "Slovénie",
  SK = "Slovaquie", UA = "Ukraine"
)


# 2. Import et recodage --------------------------------------------------------

# read_sav() transforme par défaut les codes de non-réponse déclarés dans le
# fichier (77 refus, 88 ne sait pas, 99 pas de réponse) en valeurs manquantes.
ess <- read_sav(chemin_ess,
                col_select = c(idno, cntry, all_of(vars), pspwght, anweight)) |>
  mutate(cntry = as.character(zap_labels(cntry)))

stopifnot(all(unique(ess$cntry) %in% names(noms_pays)))

# Chaque échelle 0-10 est regroupée en trois modalités. Les non-réponses
# deviennent une quatrième modalité, "NR", exclue ensuite de l'analyse.
recoder <- function(x) {
  x <- zap_labels(x)
  factor(case_when(x <= 3  ~ "faible",
                   x <= 6  ~ "moyenne",
                   x <= 10 ~ "forte",
                   .default = "NR"),
         levels = c("faible", "moyenne", "forte", "NR"))
}

X <- ess |>
  mutate(across(all_of(vars), recoder),
         cntry = factor(cntry)) |>
  select(all_of(vars), cntry) |>
  as.data.frame()


# 3. L'ACM -----------------------------------------------------------------------

# ACM « spécifique » : les modalités NR sont gardées dans le tableau, mais
# exclues de la construction des axes (argument excl). On conserve ainsi tous
# les répondants, sans que les non-réponses structurent les axes.
tableau_disjonctif <- tab.disjonctif(X[vars])
modalites_exclues  <- grep("NR$", colnames(tableau_disjonctif))

# Pondération : anweight, recommandée par l'ESS pour les analyses portant sur
# plusieurs pays (elle combine redressement et taille de la population).
# Le pays est une variable supplémentaire : il ne participe pas au calcul des
# axes, il est projeté ensuite au barycentre de ses répondants.
acm <- MCA(X,
           quali.sup = which(names(X) == "cntry"),
           excl      = modalites_exclues,
           row.w     = ess$anweight,
           graph     = FALSE)

# Taux d'inertie : bruts, et « modifiés » selon Benzécri. En ACM, les taux
# bruts sous-estiment fortement l'importance des premiers axes ; FactoMineR
# fournit directement les taux modifiés.
taux_bruts    <- acm$eig[, "percentage of variance"]
taux_modifies <- acm$eig[, "modified rates"]


# 4. Orientation des axes --------------------------------------------------------

# Le signe d'un axe est arbitraire. On l'oriente pour que la confiance forte
# soit à droite (axe 1) et les réponses modérées en bas (axe 2).
coord_mod  <- as.data.frame(acm$var$coord[, 1:2])
coord_pays <- as.data.frame(acm$quali.sup$coord[, 1:2])
names(coord_mod) <- names(coord_pays) <- c("x", "y")

sens_x <- if (mean(coord_mod[grepl("_forte$",   rownames(coord_mod)), "x"]) < 0) -1 else 1
sens_y <- if (mean(coord_mod[grepl("_moyenne$", rownames(coord_mod)), "y"]) > 0) -1 else 1
coord_mod  <- transform(coord_mod,  x = x * sens_x, y = y * sens_y)
coord_pays <- transform(coord_pays, x = x * sens_x, y = y * sens_y)


# 5. Profils de réponse -----------------------------------------------------------

# Part (pondérée) de chaque niveau de confiance, parmi les réponses valides.
# Par pays : pspwght. Pour l'ensemble des pays : anweight.
profil <- function(donnees, poids) {
  donnees |>
    mutate(poids = {{ poids }}) |>
    select(cntry, poids, all_of(vars)) |>
    pivot_longer(all_of(vars), names_to = "inst", values_to = "niveau") |>
    filter(niveau != "NR")
}

long <- ess |> mutate(across(all_of(vars), recoder))

profil_pays <- profil(long, pspwght) |>
  count(cntry, inst, niveau, wt = poids) |>
  group_by(cntry, inst) |>
  mutate(pct = round(100 * n / sum(n), 1)) |>
  ungroup() |>
  select(-n) |>
  pivot_wider(names_from = niveau, values_from = pct, values_fill = 0)

profil_europe <- profil(long, anweight) |>
  count(inst, niveau, wt = poids) |>
  group_by(inst) |>
  mutate(pct = round(100 * n / sum(n), 1)) |>
  ungroup() |>
  select(-n) |>
  pivot_wider(names_from = niveau, values_from = pct, values_fill = 0)

# Liste nommée : un profil par institution
en_liste <- function(p) {
  setNames(lapply(vars, function(v) {
    ligne <- p[p$inst == v, ]
    list(faible = ligne$faible, moyenne = ligne$moyenne, forte = ligne$forte)
  }), vars)
}


# 6. Export ------------------------------------------------------------------------

modalites <- coord_mod |>
  tibble::rownames_to_column("nom") |>
  separate_wider_delim(nom, "_", names = c("inst", "niveau")) |>
  left_join(profil_europe |>
              pivot_longer(c(faible, moyenne, forte),
                           names_to = "niveau", values_to = "pct_europe"),
            by = c("inst", "niveau")) |>
  mutate(across(c(x, y), \(v) round(v, 4)))

effectifs <- count(ess, cntry, name = "n")

pays <- coord_pays |>
  tibble::rownames_to_column("code") |>
  left_join(effectifs, by = c("code" = "cntry")) |>
  mutate(nom = unname(noms_pays[code]),
         across(c(x, y), \(v) round(v, 4)))

pays$profil <- lapply(pays$code, function(cd) en_liste(filter(profil_pays, cntry == cd)))

resultat <- list(
  meta = list(
    source      = "European Social Survey, 11e vague (2023), édition 4.2",
    n           = nrow(ess),
    n_pays      = nrow(pays),
    ponderation = "anweight (axes, profil européen), pspwght (profils nationaux)",
    inertie     = list(axe1 = round(taux_modifies[1], 1),
                       axe2 = round(taux_modifies[2], 1),
                       brut1 = round(taux_bruts[1], 1),
                       brut2 = round(taux_bruts[2], 1)),
    date_calcul = format(Sys.Date())
  ),
  institutions = institutions,
  modalites    = modalites,
  pays         = pays,
  europe       = en_liste(profil_europe)
)

dir.create(dirname(sortie), showWarnings = FALSE, recursive = TRUE)
write_json(resultat, sortie, auto_unbox = TRUE, pretty = TRUE, digits = NA)
message("Fichier écrit : ", sortie)
