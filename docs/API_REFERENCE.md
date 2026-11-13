# Référence API — CKAN data.gov.ma

## Base URL
```
https://data.gov.ma/data/api/3/action
```

## Via le proxy CORS (recommandé)
```
/api/ckan?endpoint=ENDPOINT_NAME&param1=value1&param2=value2
```

---

## Endpoints

### 1. `package_search` — Découvrir les jeux de données HCP

```
GET /api/ckan?endpoint=package_search&q=haut+commissariat+au+plan&rows=100&start=0
```

**Paramètres :**

| Paramètre | Valeur | Description |
|---|---|---|
| `q` | `haut+commissariat+au+plan` | Recherche textuelle |
| `rows` | `100` | Résultats par page (défaut: 10) |
| `start` | `0` | Offset de pagination |
| `sort` | `metadata_modified desc` | Tri (plus récent d\'abord) |
| `fq` | `organization:haut-commissariat-au-plan` | Filtre exact par organisation |

**Réponse :**
```json
{
  "success": true,
  "result": {
    "count": 79,
    "results": [
      {
        "id": "uuid",
        "name": "slug",
        "title": "Titre du jeu de données",
        "resources": [{ "id": "...", "url": "...", "format": "CSV" }]
      }
    ]
  }
}
```

---

### 2. `package_show` — Détails d\'un jeu de données

```
GET /api/ckan?endpoint=package_show&id=DATASET_ID
```

---

### 3. `current_package_list_with_resources` — Catalogue complet

```
GET /api/ckan?endpoint=current_package_list_with_resources&limit=1000
```

Retourne **tous** les jeux de données du portail. Filtrer côté client :
```javascript
datasets.filter(d => d.organization?.title === "Haut-Commissariat au Plan")
```

---

### 4. `resource_search` — Recherche par format

```
GET /api/ckan?endpoint=resource_search&query=format:csv
```

---

### 5. `datastore_search` — Requête avec filtres JSON

```
GET /api/ckan?endpoint=datastore_search&resource_id=UUID&filters={"region":"Casablanca-Settat"}&limit=1000
```

**Paramètres :**

| Paramètre | Description |
|---|---|
| `resource_id` | UUID de la ressource |
| `filters` | JSON de filtres exacts |
| `fields` | Colonnes à retourner (séparées par des virgules) |
| `sort` | Tri (ex: `annee asc`) |
| `limit` | Nombre max de lignes |
| `offset` | Offset de pagination |

---

### 6. `datastore_search_sql` — Requête SQL

```
GET /api/ckan?endpoint=datastore_search_sql&sql=SELECT * FROM "RESOURCE_ID" WHERE annee >= 2015 ORDER BY annee ASC
```

**Capacités SQL :**
- `SELECT`, `WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT`
- `ILIKE` pour la recherche insensible à la casse
- Agrégations : `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`

**Lecture seule** — pas de `INSERT`, `UPDATE`, `DELETE`.

---

## Cascade de récupération (smartFetch)

```
1. datastore_search_sql  →  Le plus rapide, le plus granulaire
2. datastore_search      →  Si le SQL échoue
3. Téléchargement fichier →  Toujours disponible (CSV/JSON/XLSX)
```

---

## Codes d\'erreur

| Code HTTP | Signification |
|---|---|
| 200 | Succès |
| 400 | Paramètres invalides |
| 403 | Endpoint non autorisé |
| 404 | Ressource introuvable |
| 409 | Conflit (datastore non actif) |
| 500 | Erreur serveur CKAN |
