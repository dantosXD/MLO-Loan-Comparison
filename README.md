# MLO Loan Comparison

A Vite + React TypeScript app to compare mortgage loan programs with buy‑down analysis and scenario management.

## Features

- Scenario management (save, load, export/import JSON, copy to clipboard)
- Program ordering with up/down controls
- Buy‑down support with effective rate and break‑even analysis
- Preferred recommendation selection and full column highlighting
- Per‑program loan amount overrides reflected across UI and exports
- Refinance helpers: previous PITI, monthly savings vs current
- Export options: copy table HTML, Excel-friendly export, draft Outlook email

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS

## Getting Started

Requirements:
- Node 18+

Install and run:

```bash
npm ci
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Scenario Management

- Save scenarios to localStorage with a custom name
- Export to JSON file or copy JSON to clipboard
- Import via pasted JSON or file upload
- Load/Delete scenarios from the dropdown

Scenarios are versioned and stored under `lct_scenarios_v1` in localStorage.

## Recommended Program Highlighting

- The selected recommendation is highlighted in the Program Configuration list
- In the comparison table, the entire column is tinted and labeled "Recommended"

## Monthly Savings vs Current (Refinance)

For refinance scenarios with `previousMonthlyPITI` provided, the table shows a
“Monthly Savings vs Current” row above PITI. Positive savings are shown in green.

## Deploying to CapRover

This repo includes a `Dockerfile`, `captain-definition`, `.dockerignore`, and `nginx.conf` for CapRover.

High‑level steps:
1. On your CapRover dashboard, create a new app (e.g., `loan-comparison`).
2. In App Config, ensure the container port is `80` (Nginx default) and enable HTTPS if desired.
3. Deploy using one of the methods below:
   - Deploy from GitHub (recommended): connect your repo and enable auto deploys.
   - Upload tarball from local machine.
   - Use the CapRover CLI (`caprover deploy`).

This project uses a multi‑stage Docker build:
- Node builds the Vite app to `/dist`.
- Nginx serves `/dist` and rewrites unknown routes to `index.html` for SPA behavior.

## Netlify (optional)

A `netlify.toml` is present. You can deploy by connecting this repo to Netlify:
- Build command: `npm run build`
- Publish directory: `dist`

## License

MIT
