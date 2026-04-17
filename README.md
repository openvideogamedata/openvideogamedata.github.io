# Open Video Game Data

Open Video Game Data aggregates curated video game lists from journalists, critics, and the community into a single ranked dataset.

## Overview

- Goal: collect curated lists in one platform.
- Contribution: users can submit their own lists or transcribe reputable ranked source lists.
- Ranking: the site computes aggregate rankings for each final list or category.

## Tech Stack

- Frontend: React + Vite in `client/`
- Backend: ASP.NET Core Web API (.NET 8)
- Database: PostgreSQL
- Authentication: Google Identity Services + JWT Bearer
- External API: [IGDB](https://www.igdb.com/)
- Hosting: Render for the API, GitHub Pages or custom domain for the frontend

## Local Setup

1. Clone the repository.
   ```bash
   git clone https://github.com/YOUR_USERNAME/OpenVideoGameData.git
   cd OpenVideoGameData
   ```
2. Install .NET 8 SDK and Node.js 20+.
3. Configure backend environment variables in `Properties\launchSettings.json` or in your shell:
   - `PGSQL_CONNECTION`
   - `IGDB_CLIENTID`
   - `IGDB_CLIENTSECRET`
   - `GOOGLE_CLIENT_ID`
   - `JWT_SECRET`
4. Build and run the backend:
   ```bash
   dotnet build
   dotnet run
   ```
5. Install and run the frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```

Backend default local URL: `https://localhost:5124`

Frontend default local URL: `http://localhost:5173`

## Frontend Environment

Create `client/.env.development` with:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_BASE_URL=https://localhost:5124
```

## Authentication Flow

1. The React frontend opens the Google sign-in popup.
2. Google returns an ID token to the frontend.
3. The frontend sends the token to `POST /api/auth/google`.
4. The backend validates the Google token and issues its own JWT.
5. The frontend stores the JWT and sends it in `Authorization: Bearer <token>`.
6. The frontend can verify the current authenticated identity through `GET /api/auth/me`.

## Database Migrations

If you plan to modify the schema:

```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add YourMigrationName
dotnet ef database update
```

## Rules for Submitting Critic Lists

- Must represent a journalist or critic opinion, not a personal list.
- Must be enumerated and ranked.
- Must not be based on another aggregate list.
- Maximum of 15 games per list. If the source has fewer than 15, include the full list.

## Contributing

1. Fork the repository.
2. Create a branch for your change.
3. Commit and push.
4. Open a pull request with a clear summary.

## License

This project is licensed under the MIT License.
