# Déploiement — HCP Charts via GitHub

Aucune commande locale n'est nécessaire : tout passe par GitHub Actions et GitHub Pages.

```
data.gov.ma ──(nuit, GitHub Actions)──▶ public/data/<id>.json ──▶ GitHub Pages ──▶ PowerPoint
             package_search / package_show            (copie validée)         (manifest.xml)
```

## Mise en place (une fois)
1. Poussez ce dépôt sur GitHub (branche `main`).
2. **Settings → Pages → Source : GitHub Actions.**
3. **Actions → Build & deploy → Run workflow.** Le premier passage découvre les jeux HCP, télécharge les données et publie le site.
4. Ouvrez `https://<compte>.github.io/<dépôt>/`, téléchargez le manifeste et chargez-le dans PowerPoint
   (Insertion → Compléments → Mes compléments → Charger mon complément).

## Ce que fait le workflow (`.github/workflows/pages.yml`)
| Étape | Détail |
|---|---|
| Tests | `npm test` — le déploiement s'arrête si un test échoue |
| Découverte | `npm run map-indicators` → `src/constants/indicatorMap.json` + `docs/MAPPING_REPORT.md` |
| Données | `npm run snapshots` → `public/data/<id>.json` (copie des lignes brutes) |
| Commit | le bot pousse les fichiers de données modifiés (`[skip ci]`) |
| Publication | `npm run build:pages` + manifeste de production → GitHub Pages |

Déclencheurs : chaque push sur `main`, chaque nuit à 02:17 UTC, et à la demande.

## Valider un indicateur (depuis le navigateur)
Seules les correspondances **sûres** (confiance « high ») sont publiées automatiquement. Les autres apparaissent
« à valider » sur la page d'accueil et dans le résumé de l'exécution Actions.

1. Ouvrez `src/constants/indicatorMap.json` sur GitHub → crayon ✏️.
2. Vérifiez l'entrée (jeu de données, `valueField`, `filters`, `rowMatch` — voir `docs/INDICATOR_MAP.md`).
3. Ajoutez `"locked": true`, puis *Commit changes* sur `main` → redéploiement automatique.

Une entrée verrouillée n'est plus jamais écrasée par la découverte automatique.

## Si data.gov.ma est injoignable
Le site est quand même déployé avec la **dernière copie** présente dans le dépôt, et le résumé Actions affiche un avertissement.
Si l'échec est systématique, data.gov.ma bloque probablement les serveurs GitHub (hébergés hors du Maroc). Solution :
un *self-hosted runner* sur une machine au Maroc (Settings → Actions → Runners), puis `runs-on: self-hosted` dans le workflow.

## Développement local (optionnel)
`npm ci && npm run certs && npm run dev` — mode « proxy » : appels CKAN en direct via `/api/ckan`.

## Limites
- Les données ont au plus ~24 h de retard sur data.gov.ma (le HCP publie surtout des séries annuelles/trimestrielles).
- Insertion après la diapositive active : PowerPointApi 1.5 ; sinon en fin de présentation.
- Diapositives 16:9 ; fichiers `.xls` 97-2003 non lus (choisir une ressource CSV/XLSX).
