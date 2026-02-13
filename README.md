# TeraBox Gateway Frontend

A static frontend for the TeraBox Gateway API, hosted on GitHub Pages.

## Features

- User login and dashboard
- API testing interface
- Usage statistics
- Admin panel access

## Setup

1. Clone or download this repository
2. The frontend connects to the API using a configurable base URL
3. Host on GitHub Pages by pushing to a GitHub repository and enabling Pages in settings

## GitHub Secrets Setup

To keep sensitive values out of the repository, add the following secret in your GitHub repository settings:

### Repository Secrets (Settings → Secrets and variables → Actions)
- `API_BASE_URL`: Your TeraBox API base URL (e.g., `https://your-api-domain.com`)

The GitHub Actions workflow will automatically replace `__API_BASE__` placeholders with the secret value during deployment.

## API Connection

The frontend connects to the deployed TeraBox Gateway API server. Authentication is handled via JWT tokens stored in localStorage.

## Files

- `index.html` - Main status page
- `login.html` - Login page
- `dashboard.html` - User dashboard
- `style.css` - Stylesheet
- `dashboard.js` - JavaScript for API interactions