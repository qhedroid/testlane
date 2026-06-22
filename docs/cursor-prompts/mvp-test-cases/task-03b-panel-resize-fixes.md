# Task 03b — Case detail panel: fix drag direction and resize bounds

## Context
Branch: `mvp-test-cases`. Tasks 01–03 are complete.

The `CaseDetail` panel is on the right side of the three-pane layout. Two bugs need fixing:

1. **Drag direction is inverted.** Dragging the resize handle left makes the panel shrink; dragging right makes it grow. Because the panel is right-anchored, the logic should be reversed: left = expand, right = shrink.
2. **Min/max bounds are wrong.** The current minimum (300px) is too small — it squashes the 7-tab bar and other content. The current maximum (540px) is fine as a starting size but should become the new minimum. The new maximum should allow the panel to grow a bit further towards the centre of the page.

## Files that will change
- `apps/web/src/fresh/hooks/useResizablePanes.ts`
- `apps/web/src/fresh/screens/CasesScreen.tsx`
- `apps/web/src/fresh/styles/fresh.css`

## Files that will NOT change
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/hooks/useResizablePanes.ts
Read apps/web/src/fresh/screens/CasesScreen.tsx
Read apps/web/src/fresh/styles/fresh.css
```

---

## Step 2 — Fix the drag direction in `useResizablePanes.ts`

Find the `onMove` handler inside `useResizablePanes`. The `case-detail` branch currently reads:

```ts
if (type === 'case-detail') {
  const val = Math.max(min, Math.min(max, start + dx))
  root.style.setProperty('--case-detail-width', `${val}px`)
}
```

Change `start + dx` to `start - dx`:

```ts
if (type === 'case-detail') {
  const val = Math.max(min, Math.min(max, start - dx))
  root.style.setProperty('--case-detail-width', `${val}px`)
}
```

**Why:** `dx` is positive when the mouse moves right. For a right-anchored panel, moving right (toward the edge) should shrink it and moving left (toward the centre) should expand it — which is the opposite sign from a left-anchored panel.

Do not change the `else` branch — the other panes (`suite-tree`, `plan-list`, `run-list`) are left-anchored and use `start + dx` correctly.

---

## Step 3 — Update the resize bounds in `CasesScreen.tsx`

Find the detail resizer element (line ~510):

```tsx
<div className="resizer-v detail-resizer" data-resize="case-detail" data-min="300" data-max="540" />
```

Change to:

```tsx
<div className="resizer-v detail-resizer" data-resize="case-detail" data-min="540" data-max="720" />
```

---

## Step 4 — Update the default panel width in `fresh.css`

Find:

```css
.dp.open{width:var(--case-detail-width,360px)}
```

Change the fallback to match the new minimum:

```css
.dp.open{width:var(--case-detail-width,540px)}
```

---

## Step 5 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 6 — Manual check

1. Restart the dev server:
   ```bash
   cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
   ```
2. Open `/DP/testcases/` and click a case to open the detail panel.
3. **Drag direction**: grab the left edge of the panel and drag left — confirm the panel expands (grows wider). Drag right — confirm it shrinks.
4. **Minimum**: drag the panel as far right as possible — confirm it stops at ~540px (all 7 tabs remain visible and nothing is squashed).
5. **Maximum**: drag the panel as far left as possible — confirm it stops at ~720px and does not cover the full page.
6. Confirm the Details tab, all form fields, and all 7 tabs still render correctly at both extremes.

---

## Step 7 — Commit

Run `git diff HEAD` and cross-check the actual changes against the proposed message below. Before committing, flag:
- Any file changed that is not mentioned in the message
- Any change made that is not reflected in the bullets
- Any bullet that describes something not actually done

Adjust the message to match reality, then commit.

**Proposed message:**
```
Test cases: fix case detail panel drag direction and resize bounds

- useResizablePanes: flip sign for case-detail drag (start - dx) so dragging left expands the right-anchored panel
- CasesScreen: update detail-resizer data-min from 300→540 and data-max from 540→720
- fresh.css: update --case-detail-width fallback from 360px to 540px to match new minimum
```

---

## Step 8 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
