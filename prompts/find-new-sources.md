# Prompt: Find New Sources for a Game List

Use this prompt with any AI agent (Claude, ChatGPT, Gemini, etc.) to find new editorial sources for a platform's best-games list.

Replace `{PLATFORM}` with the target console/platform before sending (e.g. `PlayStation 5`, `GameCube`, `Xbox 360`, `Nintendo Switch`).

---

## Prompt

I need you to find new editorial sources for the **best games of {PLATFORM}** list in this project.

### Project context

This is a game list aggregator. For each platform, we collect ranked editorial lists from different gaming outlets and store them as CSV files in `open_data/`. The critic JSON files live in `client/public/lists/critic/`.

The directory and file names follow the slug pattern `best-games-of-the-{platform}`. Examples:
- PlayStation 5 → `open_data/best_games_of_the_playstation_5/`
- GameCube → `open_data/best_games_of_the_gamecube/`

### Step 1 — Read existing sources

Open the `about.csv` inside the platform directory and the matching critic JSON file in `client/public/lists/critic/`. Extract all source domains and URLs already registered. These must be excluded from your search.

### Step 2 — Search for new sources

Search the web for real URLs. Do NOT guess or invent URL slugs — only use URLs that appear directly in search results.

Run at least 3 searches targeting different outlets. Adapt the query to the platform. Example for "GameCube":
- `"best GameCube games" all time ranked list site:eurogamer.net OR site:polygon.com OR site:gamespot.com`
- `"best GameCube games" all time ranked site:kotaku.com OR site:ign.com OR site:gamesradar.com`
- `"best GameCube games" all time ranked site:slantmagazine.com OR site:gamingbolt.com OR site:digitaltrends.com`

Exclude domains already found in Step 1. Collect only URLs that look like editorial all-time "best games" lists.

### Step 3 — Verify each URL

Open each candidate URL. Discard any that fail one or more of the following rules:

- [ ] Page loads (no 404, 403, or block)
- [ ] Contains a numbered/enumerated ranked list (not just genre categories)
- [ ] Is all-time — not restricted to a specific year (e.g. "best of 2024")
- [ ] Represents journalist or critic opinion (not user votes, not sales/download charts)
- [ ] Is not based on another aggregate list (e.g. not "sorted by Metacritic score")
- [ ] Does not change daily

If a page only partially loads, try fetching it once more before discarding.

### Step 4 — Create .md files

For each URL that passed all checks, create a file named `temp_{sitename}.md` (lowercase, no spaces) inside the platform's `open_data/` directory.

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

### Step 5 — Report

Print a summary table showing:
- All candidate URLs found
- Which checks each one passed or failed
- Which .md files were created
