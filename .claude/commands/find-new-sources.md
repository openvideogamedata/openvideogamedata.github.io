Find new editorial sources for a game list that don't yet exist in the aggregator.

**Platform/Console:** $ARGUMENTS

Follow every step below in order.

---

## Step 1 — Locate the existing list in the project

Using the platform name provided in $ARGUMENTS, find the matching directory inside `open_data/` and the matching JSON file inside `client/public/lists/critic/`.

The directory and file names follow the pattern `best-games-of-the-<platform>` (slugified, lowercase, hyphens). For example:
- "PlayStation 5" → `open_data/best_games_of_the_playstation_5/` and `best-games-of-the-playstation-5.json`
- "GameCube" → `open_data/best_games_of_the_gamecube/` and `best-games-of-the-gamecube.json`

Use Glob to find the correct directory if unsure of the exact slug.

Read the `about.csv` inside that directory and the critic JSON file to extract all `SourceListUrl` values already registered. These are the domains/URLs to avoid in the next steps.

---

## Step 2 — Search for new sources

Use WebSearch to find real URLs. Do NOT guess or invent URL slugs — only use URLs returned directly by search results.

Run at least 3 searches combining different outlets. Adapt the query to the platform found in $ARGUMENTS. Examples for a hypothetical platform "GameCube":
- `"best GameCube games" all time ranked list site:eurogamer.net OR site:polygon.com OR site:gamespot.com`
- `"best GameCube games" all time ranked numbered site:kotaku.com OR site:ign.com OR site:gamesradar.com`
- `"best GameCube games" all time ranked site:slantmagazine.com OR site:gamingbolt.com OR site:digitaltrends.com`

Block all domains already found in Step 1 from the search results.

Collect only URLs that look like editorial all-time "best games" lists — not year-specific ("best of 2024"), not sales charts, not user-voted aggregates.

---

## Step 3 — Verify each URL

For each candidate URL from Step 2, use WebFetch to open the real page. Run fetches in parallel when possible. Discard any URL that fails any of the checks below:

- [ ] Page loads successfully (no 404, 403, or connection block)
- [ ] Contains a numbered/enumerated ranked list (not just genre categories or editorial sections)
- [ ] Is all-time (not restricted to a specific year like "best of 2024" or "best of 2025")
- [ ] Represents journalist or critic opinion (not user votes, not sales/download data)
- [ ] Is not based on another aggregate list (e.g. not "games sorted by Metacritic score")
- [ ] Does not change daily

If a page only partially loads, try one more fetch asking specifically for the complete ranked list before discarding.

---

## Step 4 — Create .md files

For each URL that passed ALL checks in Step 3, create a `.md` file inside the directory found in Step 1.

Name it `temp_<sitename>.md` (lowercase, no spaces, no special characters).

Use this exact format:

```
# [Site Name] — [Article Title]

**URL:** [full URL]

## Checklist de aptidão

- [x] Lista enumerada e rankeada
- [x] Representa opinião jornalística/crítica
- [x] Não é baseada em outra lista agregada
- [x] Não muda diariamente
- [x] Lista all-time (não específica de um ano)
- [x] Máximo de 15 jogos respeitado

## Lista

1. [Game Title]
2. [Game Title]
3. [Game Title]
```

Rules for the Lista section:
- Keep the original ranking order from the source
- Include only game titles — no descriptions, platforms, scores, or years
- If the source has more than 15 games, include only the top 15
- Do not write anything before or after the numbered list

---

## Step 5 — Report

Print a summary table:
- All candidate URLs found in Step 2
- Which checks each one passed or failed
- Which .md files were successfully created
