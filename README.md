# Open Video Game Data

Aggregates curated video game lists from journalists, critics, and the community into a single ranked dataset.

- Users can submit their own lists or transcribe ranked source lists.
- The site computes aggregate rankings across lists and categories.
- Membership tiers control list creation limits (admins are unrestricted).

Live: [openvideogamedata.github.io](https://openvideogamedata.github.io) — API: [openvideogamedata.onrender.com](https://openvideogamedata.onrender.com)

## Tech Stack

- **Frontend:** React + Vite (`client/`)
- **Backend:** ASP.NET Core Web API (.NET 8)
- **Database:** PostgreSQL
- **Auth:** Google Identity Services + JWT Bearer + Refresh Tokens
- **Payments:** Stripe (membership)
- **External API:** [IGDB](https://www.igdb.com/)

## Local Setup

1. Install .NET 8 SDK and Node.js 22+.
2. Configure backend environment variables:

   | Variable | Description |
   |---|---|
   | `PGSQL_CONNECTION` | PostgreSQL connection string |
   | `IGDB_CLIENTID` | IGDB client ID |
   | `IGDB_CLIENTSECRET` | IGDB client secret |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
   | `JWT_SECRET` | JWT signing secret |
   | `STRIPE_SECRET_KEY` | Stripe secret key |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
   | `CLIENT_BASE_URL` | Frontend base URL (for Stripe redirects) |

3. Run the backend:
   ```bash
   dotnet run
   ```

4. Create `client/.env.development`:
   ```
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_API_BASE_URL=https://localhost:5124
   ```

5. Run the frontend:
   ```bash
   cd client && npm install && npm run dev
   ```

Backend: `https://localhost:5124` — Frontend: `http://localhost:5173`

## Authentication Flow

1. Frontend opens Google sign-in popup and receives an ID token.
2. `POST /api/auth/google` validates the token and returns a JWT + refresh token.
3. Frontend stores both tokens in `localStorage`.
4. On expiry, `POST /api/auth/refresh` issues a new JWT + refresh token.
5. `POST /api/auth/logout` revokes the refresh token.

## Database Migrations

```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add YourMigrationName
dotnet ef database update
```

## Rules for Submitting Critic Lists

- Must represent a journalist or critic opinion, not a personal list.
- Must be enumerated and ranked.
- Must not be based on another aggregate list.
- Maximum of 15 games per list.

## Adding New Critic Sources to a List

This is the full workflow for researching, validating, and publishing new editorial sources for any game list.

### Step 1 — Find candidate URLs

Use the `/find-new-sources` Claude Code skill to automate the search:

```
/find-new-sources <platform>
```

For example: `/find-new-sources ps5`, `/find-new-sources gamecube`.

The skill will:
1. Read `open_data/<list>/about.csv` and the corresponding JSON in `client/public/lists/critic/` to detect already-registered sources.
2. Run web searches across editorial outlets, blocking registered domains.
3. Fetch each candidate URL to verify it meets all eligibility criteria.
4. Create a `temp_<sitename>.md` file inside `open_data/<list>/` for each source that passes.

#### Eligibility criteria

A source must pass **all** of the following:

| Criterion | Detail |
|---|---|
| Numbered/ranked list | Must use sequential position numbers (1, 2, 3…), not genre categories |
| Journalist/critic opinion | Must represent editorial judgment — not user votes, sales data, or download counts |
| Not an aggregate | Must not re-rank games by Metacritic, OpenCritic, or any other aggregate score |
| Does not change daily | Must be a stable editorial list, not a live leaderboard |
| All-time | Must not be restricted to a specific year (e.g. "Best of 2024") |
| Max 15 games | Only the top 15 positions are extracted if the source has more |

### Step 2 — Register sources in the backend

For each `temp_<sitename>.md` that was created, add the source list via the admin interface or directly in the database. Each entry needs:

- `SourceListUrl` — the full URL from the `.md` file
- The game positions (1–15) mapped to game IDs

Scores are computed automatically as `16 - position` (rank 1 = 15 pts, rank 15 = 1 pt).

### Step 3 — Sync the JSON files

After the new sources are registered in the database, regenerate the static JSON files consumed by the frontend:

```bash
cd ListSyncer && dotnet run
```

The syncer connects to the live API at `https://openvideogamedata.onrender.com`, fetches all lists, and writes updated JSON files to `client/public/lists/`. It prints a summary like:

```
[FINAL ] best-games-of-the-playstation-5  → ATUALIZADO (13 → 18 fontes)
[CRITIC] best-games-of-the-playstation-5  → ATUALIZADO (11 → 16 listas)
Concluído: 0 criado(s) | 2 atualizado(s) | 253 ignorado(s)
```

The syncer also runs automatically every Monday at 04:00 UTC via GitHub Actions.

### Step 4 — Commit the updated JSON

```bash
git add client/public/lists/
git commit -m "Sync: add new critic sources for <list>"
```

The `temp_*.md` files in `open_data/` are working notes and can be deleted after the sources are confirmed in the database.

## License

MIT
