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

## License

MIT
