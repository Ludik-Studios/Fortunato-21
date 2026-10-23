# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Unity WebGL game

The Unity WebGL build in `public/game/build` is loaded in the main player area. Replace that folder's contents with the complete output of a new WebGL export to update the game.

The game is embedded in the main player area. The host must allow the site to embed the page in an iframe. Restart the dev server after changing `.env`.

## Google AdSense

Create an AdSense account and submit the deployed website for review. After Google approves the site, create a responsive display ad unit and set these variables in `.env` and in the production hosting environment:

```env
PUBLIC_ADSENSE_CLIENT_ID=ca-pub-your-publisher-id
PUBLIC_ADSENSE_SLOT_ID=your-ad-unit-id
```

The ad slot stays as a local preview during development and only loads real ads in production when both IDs are set. Follow AdSense's site verification, privacy, consent, and `ads.txt` instructions in the account dashboard before launch.

## Accounts, donations, and analytics

The app uses Astro server rendering on Netlify, Supabase Auth, Stripe Checkout, and GA4. Copy `.env.example` to `.env` for local setup; never commit `.env` or add secret keys to variables prefixed with `PUBLIC_`.

### Supabase Auth

1. Create a Supabase project and set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project API settings.
2. Keep email confirmation enabled. In Authentication URL settings, allow `http://localhost:4321/auth/callback` and your deployed domain's `/auth/callback` URL.
3. Set `ADMIN_EMAIL` to the exact email address you use for the administrator account. Register that address through the site and confirm it. The admin route compares against this server-only value; there is no default password or public admin account.

### Stripe donations

Create a Stripe account, start in test mode, and set `STRIPE_SECRET_KEY` to its test secret. Configure the Stripe customer portal to let customers cancel subscriptions. One-time and monthly donations use server-defined amounts of MXN 50, 100, 200, 500, or 1,000. Monthly support requires a signed-in account so donors can open the portal and manage or cancel it. Switch to a live secret only after reviewing your business, tax, and donation obligations.

### Google Analytics 4

1. Create a GA4 web data stream and set `PUBLIC_GA4_MEASUREMENT_ID` to its `G-...` ID.
2. Enable the Google Analytics Data API in Google Cloud. Create a service account, grant its email Viewer access to the GA4 property, and set `GA4_PROPERTY_ID` and `GA4_SERVICE_ACCOUNT_JSON` as private server environment variables. Never put service-account credentials in a `PUBLIC_` variable.
3. Accept the site's analytics consent prompt to allow GA4 to load. Visitors can reopen Analytics settings to change their choice. Custom `site_click` events cover links and buttons marked with `data-ga-event`.

The `/admin/` dashboard is protected by Supabase session verification and `ADMIN_EMAIL`. Its visitor, page-view, and click figures come from GA4; donation totals come from completed one-time Stripe Checkout sessions and paid subscription invoices over the last 28 days. The report is only live after the matching provider credentials are configured.

Deploy with Netlify's Astro framework support so the generated server function handles auth and API routes. Add every variable from `.env.example` to the Netlify site's environment settings, using production secrets there.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
