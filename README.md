# Meridian

Meridian is the Azure Analytics Tracker dashboard for the isthatabbhi.tech portfolio. It shows live visitor, project click, resume download, and contact event stats from an Azure Function backed by Azure Table Storage.

## Stack

- React 19 and Vite
- Tailwind CSS
- Cloudflare Kumo UI components and charts (ECharts)
- Lenis smooth scrolling
- d3-geo dot grid globe

## Data source

The dashboard reads from a single stats endpoint:

```
GET https://portfolio-tracker-141.azurewebsites.net/api/stats
```

The endpoint returns totals, per country and device breakdowns, 15 minute buckets for the last 24 hours, daily buckets, and previous period totals for the KPI deltas. The tracker itself (the Function App and the client script) is not part of this repo.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The build output goes to `dist/`. Deploy the contents of `dist/` to the web app root.

## Deploy

The live site is the Azure App Service `meridian-141` (resource group `25MCAR0141`). Deploy with the Azure CLI:

```bash
cd dist
zip -qr ../meridian-dist.zip .
az webapp deployment source config-zip --name meridian-141 --resource-group 25MCAR0141 --src ../meridian-dist.zip
```

Zip from inside `dist/` so the files land at the web app root. Zipping the `dist` folder itself deploys a nested directory and the app returns 403.

## Notes

- All times shown in the dashboard are IST, 12 hour format.
- The KPI deltas compare the selected range with the previous equal length period.
- The globe highlights every country with traffic in the selected range.
