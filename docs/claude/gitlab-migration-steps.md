# GitHub → GitLab migration steps

Target: `https://git.trialinteractive.com/se-group/relay`, importing from `github.com/qhedroid/Relay`. This is entirely self-service via GitLab's UI — it runs server-to-server (GitLab pulling from GitHub's API), so it doesn't need me, Cursor, or any local git operation. Do this directly.

## 1. Generate a GitHub token for the importer to use

On GitHub: **Settings → Developer settings → Personal access tokens**.
- Classic token: scope `repo` (needed since this is a private repo).
- Or fine-grained token, scoped to just `qhedroid/Relay`, with **Contents: Read**, **Metadata: Read**, **Pull requests: Read**, **Issues: Read**.

Copy it somewhere safe — you'll paste it once into GitLab's import wizard, not store it long-term.

## 2. Start the import on GitLab

On `git.trialinteractive.com`:
1. **New project** → **Import project** → **GitHub**.
2. Paste the token when asked to authenticate.
3. GitLab lists your accessible GitHub repos — select `qhedroid/Relay`.
4. Set the destination: namespace `se-group`, project name `relay` (matching the URL you gave). If a project already exists at that path, you'll need to either import into a differently-named slot first or clear/rename the existing one — GitLab won't overwrite an existing project silently.
5. Start the import.

## 3. What actually transfers

- **Full commit history, all branches, all merge commits** — this is a real git clone under the hood, not a partial copy. `main`, `mvp-main`, `mvp-backend`, and every other branch will all come across by default; there's no "only import `main`" toggle in the standard wizard. If you want a cleaner GitLab side with just `main` (and maybe `mvp-main`) visible, the simplest path is: let the import bring everything, then delete the branches you don't want afterward on GitLab — nothing is lost by doing it this way, it's just a cleanup step after.
- **Pull requests → Merge Requests**, with their descriptions and comments, plus the fork/PR branches they were built from.
- **Issues**, if you use GitHub Issues (worth knowing even if you don't use it heavily).

## 4. Verify after it finishes

Import time depends on repo size — this repo isn't huge, expect a few minutes, not hours.
- `git log` commit count on GitLab's `main` matches GitHub's.
- Old PR numbers show up as Merge Requests (spot-check a couple, e.g. PR #20, the `mvp-backend` → `mvp-main` merge).
- All expected branches are present (`main`, `mvp-main`, `mvp-backend`, etc.).

## 5. After this, for ongoing work

Once the GitLab project exists, "access" becomes relevant again — for you and Shaun to keep pushing there, and if you want Cursor pointed at it too. That's the point where a desktop client (GitKraken or Sourcetree, both handle GitLab natively) or just `git remote set-url origin <gitlab-url>` locally comes in. Separate step from the migration itself — happy to walk through it once the import's done and you've confirmed it landed cleanly.
