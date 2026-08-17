# Media Centre — Phase 3 Scope: Accounts, Backend & Public Profiles

**Date:** 2026-08-17
**Status:** Scope captured only — **not yet brainstormed into a full design spec.** Per [`docs/ROADMAP.md`](../../ROADMAP.md), this phase is not designed in detail until Phase 2 is fully implemented and verified.

---

## Progress Checklist

- [x] High-level scope captured (this document)
- [ ] Brainstormed into a full design spec — **blocked until Phase 2 is fully implemented and verified**
- [ ] Spec approved
- [ ] Implementation plan written
- [ ] Implemented
- [ ] Verified (manual testing + relevant unit tests)
- [ ] Phase 3 complete → Phase 4 design work unlocked

---

## Purpose of this document

This is a placeholder of intent, not a design. It exists so the eventual shape of Phase 3 isn't lost between now and when Phase 2 is done — at which point this document is the starting point for a real brainstorming pass, not something to implement as-is.

## Scope (high-level, subject to revision when brainstormed)

- **Accounts + backend** (e.g. Supabase) + **authentication** — the first phase where the app talks to a backend of its own, rather than being fully local. Everything from Phase 1/2 (movies, series, anime, ratings, diary, watchlist, likes) needs a migration path from local-only SQLite to an account-backed store.
- **Public profile pages** — visible watch stats and public reviews, viewable by other users.
- **Privacy defaults:** diary, watchlist, and likes stay **private by default**. Likes specifically get a **per-user public/private toggle** (established during Phase 1 brainstorming as the intended behavior — likes are the one thing a user might reasonably want to show off).
- **Username and profile picture** selection.

## Explicitly not decided yet

- Backend choice is a placeholder example (Supabase), not a commitment — to be evaluated properly when this phase starts.
- Migration strategy for existing local Phase 1/2 data into an account once one is created.
- Whether reviews are public by default or also need an opt-in/opt-out toggle like likes.
- Any social features beyond viewing profiles (follows, comments, activity feed) — not assumed in scope here; Phase 1's Non-Goals explicitly excluded "social features of any kind," and this phase only adds public *visibility*, not interaction between users, unless a future brainstorming pass decides otherwise.

## Depends on

- Phase 2 fully implemented — public profiles are more meaningful once there's more than one media type's worth of activity to show, and this phase's privacy model builds on the local-only privacy assumptions already established.
