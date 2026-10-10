# Vahanly Admin Portal

Web portal for **platform admins** (`SUPER_ADMIN`) of the Vahanly platform. Car wash
owners and staff use the mobile app; this portal is where the platform team:

- sees platform numbers (car washes by status, users, orders),
- **onboards a car wash** together with its owner account,
- edits a car wash's profile and **activates / suspends / deactivates** it,
- manages any car wash's team (add users, edit, change status, reset passwords),
- searches every user across all car washes,
- manages their own profile and password.

Only `SUPER_ADMIN` accounts can sign in. Other accounts are turned away.

It talks to the [Car Wash API](https://github.com/vjth8129/car-wash-mobile-apis)
(`/api/v1`) and is served from the same host at `/admin/`, so there's no CORS setup.

## Stack

React 19 + TypeScript, Vite, React Router. No UI library: styles are in
`src/index.css` (light and dark mode).

```
src/
  api/          fetch client (tokens, refresh, errors) + typed endpoints
  auth/         session context (super-admin only)
  components/   layout, form fields, modals, user table
  lib/          formatting, password helpers, data hooks
  pages/        dashboard, car washes, onboarding, car wash detail, users, profile
```

## Develop

Run the API locally on port 5000 (see the API repo), then:

```bash
npm install
npm run dev          # http://localhost:5174/admin/  (proxies /api to localhost:5000)
API_PROXY=https://3-110-172-236.nip.io npm run dev   # or against the live API
```

```bash
npm run build        # type-check + production build into dist/
npm run lint
```

## Deploy (AWS)

The portal is static files served by the nginx that already fronts the API on the
EC2 instance, at **https://3-110-172-236.nip.io/admin/**.

```bash
EC2_INSTANCE_ID=i-08c2b6c26f77abbd8 ./scripts/deploy-ec2.sh   # uses your AWS CLI credentials
# or
SSH_KEY=~/carwash-deploy-key.pem ./scripts/deploy-ec2.sh
```

The script builds, uploads `dist/` to `/var/www/carwash-admin/admin`, installs
`deploy/nginx-admin.conf` as `/etc/nginx/snippets/carwash-admin.conf`, includes it in
the API's server block (once, with a backup), tests the nginx config and reloads.
Re-run it for every release.

Deploy the API first when a release depends on new API endpoints.
