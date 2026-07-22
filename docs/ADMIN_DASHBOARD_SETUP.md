# Tiger Gents Salon admin setup

The admin is available at `https://tigergentssaloon.com/admin` and is intentionally small. It manages only:

- Team members, roles, biographies, booking links, visibility and portraits
- Homepage/gallery pictures, order, layout, visibility and alternative text

There is no D1 database and no R2 bucket. GitHub is the single source of truth:

1. The admin reads `data/site-content.json` from GitHub.
2. Clicking **Save to website** creates one commit containing the content change and, when supplied, the new image.
3. The existing Cloudflare GitHub integration sees the new commit and deploys it.
4. The public site reads the deployed `data/site-content.json` file.

This stays within the normal Cloudflare Workers Free architecture and avoids maintaining a separate content database.

## One-time setup

### 1. Create a GitHub token for this repository

In GitHub, open **Settings > Developer settings > Personal access tokens > Fine-grained tokens** and create a token with:

- Repository access: **Only select repositories** > `fadifamous/tigergentssaloon`
- Repository permission: **Contents — Read and write**

No administration, workflow or organization permission is required. Copy the token when GitHub displays it; GitHub will not show it again.

### 2. Add two encrypted Cloudflare secrets

Open **Cloudflare > Workers & Pages > tigergentssalon > Settings > Variables and Secrets**. Add both entries as **Secret**, not plain-text variables:

| Secret name | Value |
|---|---|
| `ADMIN_PASSWORD` | The admin password supplied by the owner (`tigersalonadmin` initially) |
| `GITHUB_TOKEN` | The fine-grained GitHub token from step 1 |

Select **Deploy** after adding the secrets. The username is already configured as `admin` in `wrangler.jsonc`.

The equivalent command-line setup is:

```powershell
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put GITHUB_TOKEN
```

Wrangler prompts for each value without storing it in the repository.

### 3. Confirm Cloudflare Builds settings

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: blank / repository root
- Build non-production branches: off unless preview deployments are wanted

No D1 or R2 binding should be added.

## Using the admin

1. Open `https://tigergentssaloon.com/admin`.
2. Sign in with username `admin` and the configured password.
3. Choose **Team members** or **Website pictures**.
4. Add, edit, reorder, hide or remove an item.
5. Click **Save to website**.
6. Wait for the connected Cloudflare build to finish, normally about one or two minutes, then refresh the public website.

Every save appears in the GitHub commit history. If two browser sessions try to update the same version, the second is asked to refresh instead of overwriting the newer change.

Uploaded pictures are stored under:

```text
assets/uploads/team/
assets/uploads/gallery/
```

Removing an item from the admin does not delete its old image file, so an accidental removal remains recoverable from GitHub.

## Local testing

The normal static website can still be viewed with:

```powershell
npm start
```

To test the real admin/Worker flow locally:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Edit the ignored `.dev.vars` file and enter a local admin password plus a GitHub token, then run:

```powershell
npm run build
npx wrangler dev
```

Open the local URL printed by Wrangler and add `/admin`. A real save will commit to the configured GitHub repository, so use it only when that is intended.

## Changing access later

- Change the password by replacing the `ADMIN_PASSWORD` Cloudflare secret.
- Remove admin access by deleting or rotating `GITHUB_TOKEN`.
- Change the repository/branch through the non-secret values in `wrangler.jsonc`.
- Do not place the password or token in source code, `wrangler.jsonc`, screenshots, logs or GitHub files.
