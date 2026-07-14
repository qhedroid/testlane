# Task 03 (`main`) — push full history to GitLab (`se-group/relay`)

## Why this is a Cursor task, not a Claude (Cowork) one
This needs a real local machine with network access to `git.trialinteractive.com` (an internal company GitLab instance) and real GitLab credentials to authenticate the push. Claude's Cowork sandbox has neither — confirmed it can't even reach `github.com` without credentials, and an internal/VPN-gated instance is a different, likely harder, network problem on top of that.

## Context
- Target: `https://git.trialinteractive.com/se-group/relay` — a project DevOps already created there, currently containing only a single placeholder `README.md` commit.
- Original plan was to use GitLab's "Import project from GitHub" wizard (brings across full history *and* converts old GitHub PRs into real GitLab Merge Requests with their comments intact). That path is blocked for two reasons: (1) the target project path already has a commit, so the importer won't create fresh there, and (2) Noel doesn't have Maintainer-level access on the `se-group` group namespace, which the importer needs to place a new project there.
- **Decision (2026-07-14): do a direct manual git push instead.** This gets the full commit history and every merge commit across (nothing lost from `git log`'s point of view) but does **not** convert old GitHub PRs into GitLab Merge Request objects — those live in GitHub's database, not in git, and only the import wizard can bring them across. That trade-off is accepted for now; revisit later if the PR-level detail turns out to matter (would need someone with `se-group` Maintainer rights to delete the placeholder and redo this via the importer).
- Noel likely already has push access to the *project itself* (DevOps created it for him specifically) even without group-level rights — that's a different permission scope in GitLab, and it's what this task actually needs.

## Scope — do this, in order

1. **Confirm local state before touching anything:**
   ```bash
   git status   # expect: on `main`, clean working tree
   git branch -a
   ```
   If not on `main` or the tree isn't clean, stop and report back rather than proceeding.

2. **Add the GitLab remote:**
   ```bash
   git remote add gitlab https://git.trialinteractive.com/se-group/relay.git
   git remote -v   # confirm both origin (GitHub) and gitlab are listed correctly
   ```

3. **Authenticate.** This will prompt for credentials over HTTPS. Ask the human operator for a GitLab personal access token first if one isn't already available — generated on `git.trialinteractive.com` under their own account (User Settings → Access Tokens), scope `write_repository`, used as the password when git prompts (username can be anything/the GitLab username, token goes in the password field). Do not proceed by guessing at credentials or trying to bypass this prompt.

4. **Push everything:**
   ```bash
   git push gitlab --all --force
   git push gitlab --tags
   ```
   `--force` is required and expected — GitLab's `main` has one placeholder commit with no shared history with this repo's `main`, so this overwrites it. That commit is a template README with no real content; this is not a mistake to double-check with the human first, just proceed.

5. **Verify:**
   - On `git.trialinteractive.com/se-group/relay`, confirm `main`'s commit count and latest commit SHA match this repo's local `main`.
   - Confirm the other branches (`mvp-main`, `mvp-backend`, etc.) are present.
   - Spot-check that a merge commit (e.g. "Merge pull request #20 from qhedroid/mvp-backend") is visible in GitLab's commit history for `main` — confirms merge history came across, even though it won't be a clickable Merge Request object.

## Explicit non-goals
- Do not attempt the GitLab import-wizard path as part of this task — that's blocked on a permissions issue outside this task's scope, not something to route around.
- Do not try to recreate old GitHub PRs as GitLab Merge Requests manually — out of scope for this task.
- No application code changes.
- Do not write to `docs/claude/**` — report results (commit SHAs, branches confirmed present, any auth issues) in your final chat response; Noel can relay it to Claude to log.

## Output format
State: which branches were pushed successfully, the resulting `main` commit SHA on GitLab, confirmation the merge-commit spot-check passed, and anything that didn't go as expected (auth failures, missing branches, etc.) rather than silently working around it.
