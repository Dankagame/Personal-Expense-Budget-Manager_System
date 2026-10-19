# Retain — Personal Expense and Budget Manager

Retain is a web app for recording expenses and monthly budgets. The frontend is React, TypeScript, and Vite. The API is FastAPI with SQLAlchemy, Alembic, and PostgreSQL.

## What the app does

- Users can sign up, log in, view a monthly spending dashboard, record and filter expenses, sort them by date or amount, set monthly budgets, browse categories, and manage their profile and password.
- Admins log in at `/admin` to view spending analysis and platform insights and manage users, admin accounts, expense categories, and records.
- Amounts are displayed in FRW. Dashboard and budget totals use the expense date's month.

## Project layout

| Path | Purpose |
| --- | --- |
| `Backend/` | FastAPI app, database models, routes, and Alembic migrations |
| `Backend/routers/` | Authentication, profile, expense, budget, category, dashboard, and admin endpoints |
| `Backend/migrations/` | Database schema changes and default roles/categories |
| `Frontend/` | React app and Vite configuration |
| `Frontend/src/admin/` | Admin login and dashboard |
| `Frontend/src/dashboard/` | User dashboard and finance screens |

## Requirements

- Python 3.11 (the version currently used by the backend virtual environment)
- PostgreSQL, either local or a hosted instance such as Neon
- Node.js `^20.19.0` or `>=22.12.0` and npm (required by the installed Vite version)

Run the commands below from the project root unless a command first changes directory.

## 1. Configure the backend database

```bash
cd Backend
cp .env.example .env
```

Edit `Backend/.env`. Set a long, random `SECRET_KEY`. For a **local PostgreSQL database**, create an empty database first, then set the connection fields:

```dotenv
DB_USERNAME=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=retain
SECRET_KEY=replace-with-a-long-random-secret
```

For **Neon or another hosted PostgreSQL database**, add its connection string:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB_NAME?sslmode=require
```

`DATABASE_URL` takes precedence over the separate `DB_*` connection fields. When it is set, the `DB_*` fields can be omitted. Do not commit `.env` or share a database URL containing a password.

The app does not automatically create a PostgreSQL database or copy records between databases. Switching `DATABASE_URL` switches which data the app sees.

## 2. Install and initialize the backend

From `Backend/`:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
alembic upgrade head
```

On Windows, activate with `.venv\Scripts\activate`. If `python3.11` is not available as a command, use an installed Python 3.11 executable to create the virtual environment.

`alembic upgrade head` creates the tables, the `user` and `admin` roles, and the default expense categories. Run it once for each new database and after pulling new migrations. To see the applied revision, run `alembic current` from `Backend/`.

### Create the first admin

The recommended interactive option asks for a name, email, and password without putting the password in the command:

```bash
python create_admin.py
```

There is also a repeatable bootstrap script for the initial `admin123@gmail.com` account. Supply its password through the process environment:

```bash
RETAIN_ADMIN_PASSWORD='your-admin-password' python bootstrap_admin.py
```

The bootstrap script does not store the password in source code. If that admin already exists, it leaves the account and password unchanged. Run either admin creation command **after** the migrations. Normal users can create accounts through the sign-up page.

## 3. Start the backend

In a terminal, from `Backend/` with the virtual environment active:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Check the API at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health). Interactive API documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

The backend reads `Backend/.env` when its process starts. Restart it after changing database settings or `SECRET_KEY`.

### Deploy the backend to Vercel

Create a **separate FastAPI project** on Vercel with `Backend` as its project root. Vercel detects `Backend/main.py` and installs `Backend/requirements.txt` automatically. The backend's `.python-version` selects Python 3.12. The `.vercelignore` excludes local credentials and the virtual environment from CLI uploads.

1. Run `alembic upgrade head` locally against the PostgreSQL database that the deployment will use. Vercel Functions should serve requests, not run migrations on every start.
2. In Vercel project **Settings → Environment Variables**, set `DATABASE_URL` to the PostgreSQL connection string and `SECRET_KEY` to a long random value for **Production**. Set `CORS_ORIGINS` to the frontend's exact origin once the frontend is deployed; while demonstrating from a local frontend, include `http://127.0.0.1:5173` and `http://localhost:5173`.
3. From `Backend/`, run `vercel login` if needed, `vercel link` to select the backend project, then `vercel --prod` to deploy the current backend files. If using Git deployment instead, configure the project's Root Directory as `Backend` and push the backend changes.
4. Open `https://YOUR-BACKEND-DOMAIN/health` and `https://YOUR-BACKEND-DOMAIN/docs` to verify the API. Set `VITE_API_BASE_URL` in the frontend to the deployed backend origin, then rebuild/redeploy the frontend.

Keep `DATABASE_URL` and `SECRET_KEY` only in Vercel's environment variable settings. A new production `SECRET_KEY` gives the deployed API its own login sessions.

## 4. Install and start the frontend

Open a second terminal and run:

```bash
cd Frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) for user login/sign-up or [http://127.0.0.1:5173/admin](http://127.0.0.1:5173/admin) for admin login.

The frontend calls `http://127.0.0.1:8000` by default. To use another API address, create `Frontend/.env` with:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart Vite after editing that file. The backend allows browser requests from `http://127.0.0.1:5173` and `http://localhost:5173` by default. For another frontend origin, set `CORS_ORIGINS` in `Backend/.env` to a comma-separated list of allowed origins, then restart the API.

## Working with the app

1. Sign up at `/`, or sign in with an existing user account.
2. Create a monthly budget in **Budgets**.
3. Add expenses in **Expenses**, choosing a category and date. The dashboard's month selector displays spending for the selected month; budget totals also use the expense date's month.
4. Use **Settings** to update your profile or password.
5. Sign in at `/admin` with an admin account to manage categories, users, other admins, and view the admin overview.

The API uses bearer tokens. `POST /auth/login` accepts form fields `username` (the email) and `password`. Protected endpoints require `Authorization: Bearer <token>`; see `/docs` for request and response details.

## Redux and authentication state

Retain uses **Redux Toolkit for the applied expense search, filters, and sorting**. It uses **React Context for authentication**. This separation makes it easy to demonstrate both parts of the rubric:

1. `Frontend/src/store/expenseFiltersSlice.ts` defines the expense query state: search text, category, payment method, date range, sort field, and sort order. It defines `applyExpenseFilters` and `resetExpenseFilters` actions.
2. `Frontend/src/store/store.ts` creates the Redux store. `Frontend/src/main.tsx` wraps the app in the React Redux `Provider`.
3. `Frontend/src/dashboard/DashboardApp.tsx` reads that state with `useAppSelector` and dispatches actions with `useAppDispatch` when you apply or clear filters.
4. `Frontend/src/dashboard/financeApi.ts` turns the Redux state into URL query parameters for `GET /expenses`. The backend filters and sorts the PostgreSQL records and returns the result. Expense records themselves stay on the server.
5. `Frontend/src/auth/AuthContext.tsx` handles sign-up, sign-in, sign-out, session loading, and roles. `Frontend/src/auth/ProtectedRoute.tsx` guards the UI, while the backend checks bearer tokens and admin roles on protected endpoints.

For the demo, open Redux DevTools, apply a search or change **Sort by** to **Amount**, and show the `expenseFilters/applyExpenseFilters` action and updated `expenseFilters` state. Then show the Expenses table changing and the API request in the browser Network panel. Click **Clear** to show `expenseFilters/resetExpenseFilters`.

## Deployment and demo

The public deployment uses the [Retain API](https://retain-backend-beta.vercel.app/health) connected to PostgreSQL. Use these links for the main recorded walkthrough:

| Access | Link | Login |
| --- | --- | --- |
| User | [Retain user app](https://retain-frontend-omega.vercel.app/) | Sign up or use an existing user account. |
| Admin | [Retain admin app](https://retain-frontend-omega.vercel.app/admin) | Email: `admin123@gmail.com`; password: `Admin@12002`. |

The frontend home page and `/admin` route, API health endpoint, database-backed login path, and browser CORS access were verified on 21 October 2026.

For a deployment, set the backend's `DATABASE_URL`, `SECRET_KEY`, and `CORS_ORIGINS` in the hosting environment, run `alembic upgrade head` against that database, and set `VITE_API_BASE_URL` to the public API URL **when building** the frontend. Configure the static host to serve the frontend entry page for `/admin` as well as `/`. Keep passwords and database URLs out of Git.

A 5–10 minute demo can follow this order: sign up/sign in, create a budget, create/edit/open/delete an expense, search and filter by category/payment/date, sort by date/amount, review the user dashboard, show Redux and Auth Context in the IDE, then sign in as admin to show category management and the admin insights. Finish by refreshing the deployed app to demonstrate persistence.

## Checks and production build

From `Frontend/`:

```bash
npm run lint
npm run build
```

`npm run build` writes a static site to `Frontend/dist/`. `npm run preview` serves that build locally. The repository does not include a Docker Compose setup or a backend test suite, so PostgreSQL and the API must be started separately.

## Common problems

| Problem | Check |
| --- | --- |
| `ERR_CONNECTION_REFUSED` or the page cannot load data | Start both servers. Check `/health`, the ports, and `VITE_API_BASE_URL`. |
| `relation ... does not exist` | Run `alembic upgrade head` against the database selected by `Backend/.env`. |
| Database connection or SSL error | Check the database host, credentials, `DATABASE_URL`, and any required `sslmode=require` setting. |
| Login fails after switching databases | Accounts are stored in the selected database. Create an account there or migrate existing data separately. |
| Browser CORS error | Add the frontend origin to `CORS_ORIGINS`, then restart the backend. |
| Admin account is missing | Run `python create_admin.py` or the bootstrap command after migrations. |

## Security and data notes

- `Backend/.env` and the virtual environment are ignored by Git. Keep production database credentials and `SECRET_KEY` outside source control.
- Never use an example password or secret key for a real deployment.
- Changing a password invalidates earlier access tokens. Sign in again with the new password.
- Running migrations creates the schema and seed data; it does not import users, expenses, or budgets from another database.
