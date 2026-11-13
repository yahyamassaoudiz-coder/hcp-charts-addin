# HCP Charts — complément PowerPoint

Graphiques **natifs et modifiables** PowerPoint à partir des statistiques du Haut-Commissariat au Plan (data.gov.ma),
insérés après la diapositive active et adaptés au thème de la présentation.

- 29 indicateurs, 12 régions, filtres province / années
- 16 graphiques natifs + 12 graphiques avancés, suggestion selon le contexte (1 KPI / plusieurs, une année / série)
- Données réelles : découverte CKAN (`package_search`, `package_show`), copie validée chaque nuit

**Installer** : page GitHub Pages du dépôt → *Télécharger le manifeste* → PowerPoint → Insertion → Compléments → Charger mon complément.

**Déployer / valider des indicateurs** : [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · Format du mappage : [docs/INDICATOR_MAP.md](docs/INDICATOR_MAP.md)

```
src/services   ChartEngine · ThemeAdapter · DataService · DataNormalizer · OfficeService
src/charts     graphiques avancés (formes + mini-graphiques natifs)
scripts        map-indicators · build-snapshots · replace-prod-urls
.github        workflow Build & deploy (tests → données → Pages)
```
