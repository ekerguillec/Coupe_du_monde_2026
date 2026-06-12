# Graph Report - .  (2026-06-06)

## Corpus Check
- Large corpus: 9 files · ~842,243 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 64 nodes · 65 edges · 10 communities (6 shown, 4 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard & Top Scorers|Dashboard & Top Scorers]]
- [[_COMMUNITY_Server Dependencies|Server Dependencies]]
- [[_COMMUNITY_Frontend Data Display|Frontend Data Display]]
- [[_COMMUNITY_API Proxy & Auth|API Proxy & Auth]]
- [[_COMMUNITY_Cristiano Ronaldo Profile|Cristiano Ronaldo Profile]]
- [[_COMMUNITY_Neymar Profile|Neymar Profile]]
- [[_COMMUNITY_Express Server Core|Express Server Core]]
- [[_COMMUNITY_Top Scorer Data|Top Scorer Data]]
- [[_COMMUNITY_ISO Flag Corrections|ISO Flag Corrections]]
- [[_COMMUNITY_Country Translations|Country Translations]]

## God Nodes (most connected - your core abstractions)
1. `Dashboard CMD26 (index.html)` - 7 edges
2. `isoCorrections` - 5 edges
3. `Fetch Games and Teams (Promise.all)` - 5 edges
4. `Fetch Groups and Teams (Promise.all)` - 4 edges
5. `Carousel Buteurs Logic` - 4 edges
6. `API Proxy Route (/api/:endpoint)` - 4 edges
7. `Express App (server.js)` - 4 edges
8. `traductions` - 4 edges
9. `Cristiano Ronaldo` - 4 edges
10. `scripts` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Section Matchs du Jour` --references--> `Fetch Games and Teams (Promise.all)`  [INFERRED]
  index.html → script.js
- `Dashboard CMD26 (index.html)` --references--> `listeButeurs`  [EXTRACTED]
  index.html → buteur.js
- `isoCorrections` --semantically_similar_to--> `traductions`  [INFERRED] [semantically similar]
  isocorrection.js → traductions.js
- `Section Meilleurs Buteurs` --references--> `Carousel Buteurs Logic`  [INFERRED]
  index.html → script.js
- `Section Classement des Groupes` --references--> `Carousel Groupes Logic`  [INFERRED]
  index.html → script.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Localization/Display Pipeline: isoCorrections + traductions used together for flag URLs and team name translation** — cdm26_isocorrection_isocorrections, cdm26_traductions_traductions, cdm26_script_fetch_games_teams, cdm26_script_fetch_groups_teams [INFERRED 0.85]
- **Carousel UI Pattern: shared auto-play interval + prev/next button navigation pattern used for both Buteurs and Groupes** — cdm26_script_carousel_buteurs, cdm26_script_carousel_groupes, cdm26_script_afficherjoueur, cdm26_script_affichergroupe [INFERRED 0.85]
- **Proxy API Flow: authenticate → token storage → proxy route → worldcup26.ir external API** — cdm26_server_authenticate, cdm26_server_api_proxy, cdm26_concept_worldcup26_api [EXTRACTED 1.00]

## Communities (10 total, 4 thin omitted)

### Community 0 - "Dashboard & Top Scorers"
Cohesion: 0.22
Nodes (15): listeButeurs, Dashboard CMD26 (index.html), Section Meilleurs Buteurs, Section Classement des Groupes, Section Matchs du Jour, ISO Special Nations Rationale (Scotland/England as UK constituents), isoCorrections, afficherGroupes (+7 more)

### Community 1 - "Server Dependencies"
Cohesion: 0.13
Nodes (14): author, dependencies, dotenv, express, node-fetch, description, keywords, license (+6 more)

### Community 2 - "Frontend Data Display"
Cohesion: 0.20
Nodes (7): annee, d, divButeurs, intervalActuel, intervalGroupe, jours, mois

### Community 3 - "API Proxy & Auth"
Cohesion: 0.40
Nodes (5): WorldCup26 External API (worldcup26.ir), CDM26 Project (package.json), authenticate, CORS Middleware, Express App (server.js)

### Community 4 - "Cristiano Ronaldo Profile"
Cohesion: 0.40
Nodes (5): Cristiano Ronaldo, FIFA World Cup, Nike, Portugal National Football Team, Vector Art Portrait Style

### Community 5 - "Neymar Profile"
Cohesion: 0.50
Nodes (4): Brazil National Football Team, CDM26 Football Competition, Neymar Jr - Brazilian Footballer Portrait Art, Digital Portrait Artwork Style

## Knowledge Gaps
- **34 isolated node(s):** `listeButeurs`, `isoCorrections`, `name`, `version`, `description` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `API Proxy Route (/api/:endpoint)` connect `Dashboard & Top Scorers` to `API Proxy & Auth`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Fetch Games and Teams (Promise.all)` (e.g. with `Section Matchs du Jour` and `API Proxy Route (/api/:endpoint)`) actually correct?**
  _`Fetch Games and Teams (Promise.all)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `listeButeurs`, `isoCorrections`, `name` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._