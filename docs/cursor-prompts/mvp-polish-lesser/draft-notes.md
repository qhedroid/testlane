# DRAFT — Remaining Lesser Improvements (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Part of the "Lesser Improvements" tier — true backlog, not urgent, not scheduled. Branch name `mvp-polish-lesser` is a guess; these four items don't share a screen, so may end up split across separate branches once actually picked up — this file just keeps them from being lost to chat history in the meantime. (The Steps redesign / Create-run-button / commenting Lesser items are tracked instead in `mvp-test-runs-extra/draft-notes.md` since they share that screen.)

## Searching

**Ask:** remove the raw internal case ID (long number) from global search results — only show friendly ids (TC-XXXX, TR-XXXX, etc).

**Status:** not researched yet, either in Relay's code or on Testiny. Should be a small, self-contained fix once picked up — find wherever global search renders result rows and drop the raw id field from display.

## MTI Stuff

**Ask:** for MTI structure, use the CTMS domain overview as a basis. Shaun said he'll go through this directly with Claude.

**Status:** not actionable yet — no code investigation or Testiny recon has been done, intentionally, since this needs Shaun's direct input first. Don't start on this without him.

## Audit History

**Ask:** all frontend actions should be logged in the audit log, attributed to the current actor (even with limited user functionality, an active user can be selected).

**Status:** not researched yet. Explicitly sequenced by Shaun to depend on User Management improvements landing first (see `mvp-user-management/draft-notes.md`) — don't scope this before that lands, since "current actor" attribution presumably ties into whichever user-identity model comes out of that work.

## Permissions Management Extra

**Ask:** add a feature to manage permissions. TODO: double-check what set of permissions to have — ask Syed or Vijay.

**Status:** blocked on external input. Do not scope or draft anything here until Shaun has confirmed the permission set with Syed or Vijay — guessing at a permission list would likely need to be redone.

## Suggested next steps when any of these is picked up

Each of these is independent enough to scope on its own once its blocker (if any) clears. Follow the `mvp-custom-fields/task-01-field-type-parity.md` format for whichever one starts first.
