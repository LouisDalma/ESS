# Introduction aux méthodes quantitatives avec l'ESS

Ce dépot rassemble une collection de ressources pédagogiques afin de s'initier aux méthodes quantitatives en sciences sociales sous R à partir des données de l'**European Social Survey** (ESS) et de son panel en ligne **CRONOS-2**.

- **Site en ligne** : /
- **Auteur** : Louis Dalmazzo (CDSP)
- **Version** : /

## Contenu

| Page | Fichier | Contenu |
|:-----------------|:--------------------------|:--------------------------|
| Accueil | `index.qmd` | Présentation du site, carte interactive de la confiance institutionnelle |
| Présentation des données | `ess_presentation.qmd` | L'ESS et CRONOS-2 : organisation, questionnaire, échantillonnage, passation |
| Télécharger les données | `acces_donnees.qmd` | Créer un compte et télécharger les fichiers sur le portail de l'ESS |
| Dictionnaire des codes | `dictionnaire.qmd` | Moteur de recherche interactif sur toutes les variables de l'ESS (vagues 1 à 11) et de CRONOS-2, avec tris à plat pondérés par pays |
| Présentation de R et RStudio | `r_presentation.qmd` | Installation et environnement de travail |
| Premiers pas sous RStudio | `premiers_pas_r.qmd` | Objets, vecteurs, fonctions, valeurs manquantes |
| L'import et le recodage des données | `import_recodages_r.qmd` | Données labellisées, sélection, recodages |
| La visualisation des données | `visualisation_donnees.qmd` | Graphiques avec `ggplot2` |
| Le traitement simple des données | `traitement_simple_r.qmd` | Pondération, plan de sondage, tris à plat, tris croisés, test du khi-deux |
| Le traitement avancé des données | `traitement_avance_r.qmd` | Analyses factorielles, classifications, régressions |
| Espaces dédiés | `espace_enseignant.qmd`, `espace_journaliste.qmd` | Ressources pour les enseignants et les journalistes |
| Guide des bonnes pratiques | `bonnes_pratiques_r.qmd` | Organisation du travail et reproductibilité |

## Structure du dépôt

```         
.
├── _quarto.yml                 # configuration du site (navigation, thème, bibliographie)
├── *.qmd                       # une page du site par fichier
├── references.bib              # bibliographie
├── chicago-shortened.csl       # style de citation
├── styles.css                  # mise en forme
├── images/                     # captures d'écran utilisées dans les pages
├── carte_confiance.js          # carte interactive de la page d'accueil
├── dictionnaire_codes.js       # interface du dictionnaire des codes
├── acm_accueil.R               # produit data/acm_confiance.json
├── scripts/
│   └── dictionnaire_codes.R    # produit les fichiers de data/dico/
├── data/                       # données agrégées utilisées par le site (versionnées)
│   ├── acm_confiance.json
│   └── dico/
└── 01_Data/                    # microdonnées ESS et CRONOS (NON versionnées, à télécharger)
```

## Données

**Les microdonnées ne sont pas incluses dans ce dépôt.** Il est donc essentiel de télécharger les bases de données nécessaires sur le site de l'ESS.

Pour reproduire le site, placer les fichiers suivants, au format SPSS (`.sav`), dans le dossier `01_Data/` :

| Fichier | Utilisé par | DOI |
|:---------------------|:-------------------------------|:-----------------|
| `ESS11e04_2.sav` (ESS vague 11, fichier intégré, édition 4.2) | pages *Apprendre R*, `acm_accueil.R` | [10.21338/ess11e04_2](https://doi.org/10.21338/ess11e04_2) |

Le dossier `data/` contient uniquement des **résultats agrégés** (pourcentages pondérés, coordonnées factorielles), sans aucune donnée individuelle. Il est versionné pour que le site puisse être construit sans les microdonnées. Pour régénérer ces fichiers :

- `acm_accueil.R` produit `data/acm_confiance.json` à partir de `ESS11e04_2.sav` ;
- `scripts/dictionnaire_codes.R` produit `data/dico/*.json`. Il nécessite les 11 vagues de l'ESS et les 7 fichiers de CRONOS-2, chacun accompagné de son codebook HTML, rangés dans `01_Data/Donnees ESS/vague 1/` … `vague 11/` et `01_Data/Donnees CRONOS/vague 0/` … `vague 6 fr/` (les noms de fichiers attendus sont indiqués en tête du script). Le calcul prend environ quinze minutes et doit être lancé dans une session R en UTF-8.

**Les éditions comptent.** L'ESS republie régulièrement des versions corrigées de ses fichiers. Les résultats du site ont été obtenus avec les éditions indiquées ci-dessus ; une autre édition peut donner des chiffres légèrement différents.

## Reproduire le site

**Prérequis** : [R](https://cran.r-project.org/) (≥ 4.3), [RStudio](https://posit.co/download/rstudio-desktop/) et [Quarto](https://quarto.org/) (≥ 1.4).

1.  Cloner le dépôt, puis ouvrir `Kits Pédagogiques ESS.Rproj` dans RStudio.

2.  Restaurer les versions exactes des packages utilisés :

    ``` r
    install.packages("renv")
    renv::restore()
    ```

3.  Télécharger les données et les placer dans `01_Data/` (voir ci-dessus).

4.  Construire le site :

    ``` bash
    quarto render
    ```

    ou, pour le prévisualiser avec rechargement automatique :

    ``` bash
    quarto preview
    ```

Le site est produit dans le dossier `_site/`. Les pages interactives (carte, dictionnaire des codes) chargent des fichiers JSON : elles ne fonctionnent pas en ouvrant directement le fichier HTML depuis l'explorateur, il faut passer par `quarto preview` ou un serveur web.

## Citer

**Ce site** : /

**Les données** : European Social Survey European Research Infrastructure (ESS ERIC) (2026). *ESS11 - integrated file, edition 4.2* \[Data set\]. Sikt - Norwegian Agency for Shared Services in Education and Research. <https://doi.org/10.21338/ess11e04_2>

## Licence

Les textes et le code de ce dépôt sont diffusés sous licence [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr). Les données de l'ESS restent soumises aux [conditions d'utilisation de l'ESS ERIC](https://www.europeansocialsurvey.org/).

## Contact

Louis Dalmazzo — CDSP, Sciences Po
