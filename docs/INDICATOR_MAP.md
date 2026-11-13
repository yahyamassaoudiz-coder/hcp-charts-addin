# Relier les indicateurs à data.gov.ma (v1.2)

Les 29 KPI de `src/constants/indicators.js` sont des définitions éditoriales
(libellé, unité, catégorie). La source réelle de chaque KPI est décrite dans
`src/constants/indicatorMap.json`, que l'add-in lit au démarrage.

## 1. Générer le mappage

```bash
npm run map-indicators          # ~1–3 min, nécessite l'accès à data.gov.ma
npm run map-indicators -- --dry # rapport seulement
```

Le script :
1. interroge `package_search?q=haut+commissariat+au+plan` (paginé) et garde les jeux de l'organisation HCP ;
2. classe les jeux par mots-clés pour chaque KPI ;
3. télécharge la meilleure ressource CSV/XLSX (les `.xls` 97-2003 sont signalés) et inspecte les colonnes ;
4. écrit `indicatorMap.json`, `hcpCatalog.json` et `docs/MAPPING_REPORT.md`.

## 2. Vérifier / corriger

Ouvrez `docs/MAPPING_REPORT.md` : ✅ fiable, 🟡 à vérifier, 🟠 incomplet, ❌ introuvable.
Corrigez l'entrée dans `indicatorMap.json` puis ajoutez `"locked": true` — elle ne sera plus écrasée.

### Table « longue » (une ligne par année)
```json
"taux_chomage": {
  "resourceUrl": "https://data.gov.ma/…/chomage.csv", "format": "CSV",
  "layout": "long", "yearField": "Année", "regionField": "Région",
  "valueField": "Taux de chômage (%)", "filters": { "Milieu": "Ensemble" },
  "mapped": true, "locked": true
}
```

### Table « large » (une colonne par année)
```json
"croissance_pib": {
  "resourceUrl": "https://data.gov.ma/…/pib.xlsx", "format": "XLSX", "sheet": "PIB",
  "layout": "wide", "rowLabelField": "Agrégat", "rowMatch": "croissance",
  "regionField": null, "mapped": true, "locked": true
}
```
Si chaque ligne est une région : `"regionField": "<colonne des libellés>"` et pas de `rowMatch`.

| Champ | Rôle |
|---|---|
| `filters` | valeurs fixes de colonnes (ex. `Milieu`, `Sexe`) pour isoler une ligne par année |
| `sheet` / `headerRow` | feuille Excel et ligne d'en-tête si la détection automatique se trompe |
| `regionField: null` | indicateur national : le filtre de région sera refusé avec un message clair |

Sans région sélectionnée, l'add-in utilise la ligne « Ensemble / National / Maroc / Total ».
Les indicateurs non reliés sont grisés dans le panneau.
