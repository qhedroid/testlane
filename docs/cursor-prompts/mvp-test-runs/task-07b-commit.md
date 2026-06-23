# Task 07b — Commit

Task 07b is complete and `pnpm build` passes with zero TypeScript errors.
Stage and commit the following four changed files:

```
apps/web/src/fresh/components/TestRunsTopbar.tsx
apps/web/src/fresh/screens/CasesScreen.tsx
apps/web/src/fresh/screens/RunsScreen.tsx
apps/web/src/fresh/styles/prototype-runs.css
```

Use this exact commit message:

```
Runs: Task 07b — UI polish (9 fixes)

`TestRunsTopbar.tsx`
* Added `hasCases?: boolean` prop; disabled "Create new run…" when false

`CasesScreen.tsx`
* Sparkline tooltip "Go to execution" link now shows TR-XXXXX format

`RunsScreen.tsx`
* Details pane: Assigned to moved to standalone top field; Metadata
  renamed to collapsible "Custom Fields" (Priority, Type, Last result);
  order is now Assigned to → Custom Fields → Preconditions → Steps →
  Result information
* Step comment textarea: rows 1→2 with resize: vertical
* Shortcut bar: J/K replaced with ↑/↓ for Navigate hint
* Destructured activeCases from useFresh(); hasCases wired to all four
  TestRunsTopbar instances; empty-state Create buttons disabled when
  hasCases is false
* Added summaryOpen state; RunStatusInfographic wrapped in collapsible
  "Summary" section with chevron header
* Tab order changed to Details, Comments, Defects, Requirements, History;
  EdTab type updated; read-only Requirements panel added from
  caseData.references

`prototype-runs.css`
* .ed-pane: min-height 0 to allow inner scroll
* .ed-tp.on: overflow-y auto + padding-bottom 12px
* .runs-v12 .esc: overflow changed to visible so step content never clips
* .runs-v12 .ec-cid: color accent + underline + 11px font size
* .runs-v12 .ec-cnm: 14px; .runs-v12 .ec-cby: 11px
* Added .ec-summary-section / .ec-summary-hd collapsible header styles
* Added .ed-custom-fields / .ed-custom-fields-hd / .ed-custom-fields-body
  collapsible styles for Custom Fields section
```

Run:
```bash
cd /Users/shaun.sevume/Projects/Relay
git add apps/web/src/fresh/components/TestRunsTopbar.tsx \
        apps/web/src/fresh/screens/CasesScreen.tsx \
        apps/web/src/fresh/screens/RunsScreen.tsx \
        apps/web/src/fresh/styles/prototype-runs.css
git commit -m "$(cat <<'EOF'
Runs: Task 07b — UI polish (9 fixes)

\`TestRunsTopbar.tsx\`
* Added \`hasCases?: boolean\` prop; disabled "Create new run…" when false

\`CasesScreen.tsx\`
* Sparkline tooltip "Go to execution" link now shows TR-XXXXX format

\`RunsScreen.tsx\`
* Details pane: Assigned to moved to standalone top field; Metadata
  renamed to collapsible "Custom Fields" (Priority, Type, Last result);
  order is now Assigned to → Custom Fields → Preconditions → Steps →
  Result information
* Step comment textarea: rows 1→2 with resize: vertical
* Shortcut bar: J/K replaced with ↑/↓ for Navigate hint
* Destructured activeCases from useFresh(); hasCases wired to all four
  TestRunsTopbar instances; empty-state Create buttons disabled when
  hasCases is false
* Added summaryOpen state; RunStatusInfographic wrapped in collapsible
  Summary section with chevron header
* Tab order changed to Details, Comments, Defects, Requirements, History;
  EdTab type updated; read-only Requirements panel added from
  caseData.references

\`prototype-runs.css\`
* .ed-pane: min-height 0 to allow inner scroll
* .ed-tp.on: overflow-y auto + padding-bottom 12px
* .runs-v12 .esc: overflow changed to visible so step content never clips
* .runs-v12 .ec-cid: color accent + underline + 11px font size
* .runs-v12 .ec-cnm: 14px; .runs-v12 .ec-cby: 11px
* Added .ec-summary-section / .ec-summary-hd collapsible header styles
* Added .ed-custom-fields collapsible styles for Custom Fields section

Co-authored-by: Claude <claude@anthropic.com>
EOF
)"
```
