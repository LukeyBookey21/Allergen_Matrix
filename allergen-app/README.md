# Allergen Matrix

A full-stack allergen detection web app for restaurants. Input recipes with natural language ingredients, automatically detect UK legal allergens, and display a filterable menu to customers via QR code.

## Features

- **Ingredient Parser**: Strips quantities and filler words, matches against a comprehensive allergen keyword database
- **AI Fallback**: Uses Claude API to detect allergens for unrecognized ingredients
- **14 UK Legal Allergens**: Celery, Gluten, Crustaceans, Eggs, Fish, Lupin, Milk, Molluscs, Mustard, Peanuts, Sesame, Soybeans, Sulphites, Tree Nuts
- **Admin Dashboard**: Add, edit, delete dishes; toggle active/inactive; override allergens manually
- **Customer Menu**: Filter by allergens with "warn" or "hide" modes; mobile-friendly
- **QR Code**: Generate and download a QR code linking customers to your menu

## Tech Stack

- **Backend**: Flask + SQLite (SQLAlchemy)
- **Frontend**: React + Tailwind CSS (Vite)
- **AI**: Anthropic Claude API

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend Setup

```bash
cd allergen-app/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The backend runs on `http://localhost:5000`.

### Frontend Setup

```bash
cd allergen-app/frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` with API requests proxied to the backend.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Flask session secret | `change-me-in-production` |
| `ADMIN_EMAIL` | Admin login email | `admin@restaurant.com` |
| `ADMIN_PASSWORD` | Admin login password | `changeme123` |
| `ANTHROPIC_API_KEY` | Claude API key for AI fallback | (empty — keyword matching only) |
| `DATABASE_URL` | SQLite database path | `sqlite:///allergens.db` |
| `PORT` | Server port | `5000` |

### Default Admin Login

- Email: `admin@restaurant.com`
- Password: `changeme123`

## Deploy to Render

### Build Command

```bash
cd allergen-app/frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
```

### Start Command

```bash
cd allergen-app/backend && gunicorn app:create_app()
```

### Environment Variables on Render

Set the following in your Render dashboard:
- `SECRET_KEY` — a random secret string
- `ADMIN_EMAIL` — your admin email
- `ADMIN_PASSWORD` — your admin password
- `ANTHROPIC_API_KEY` — your Anthropic API key (optional)

## Usage

1. Log in at `/admin/login`
2. Add dishes with ingredients (one per line)
3. Click "Detect Allergens" to auto-detect, then manually adjust if needed
4. Save the dish
5. Generate a QR code from the dashboard and print it for your venue
6. Customers scan the QR code to view the filtered menu at `/menu`
