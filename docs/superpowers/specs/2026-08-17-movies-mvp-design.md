# Media Centre — Phase 1 (Movies MVP) Design Spec

**Date:** 2026-08-17
**Status:** Approved — ready for implementation planning
**Scope:** Phase 1 only (movies, local-only, no accounts)

---

## Overview

Media Centre is a personal media-logging app in the spirit of Letterboxd, intended to eventually cover **movies, TV series, and anime** with reviews, diary entries, ratings, and (for episodic media) episode-progression tracking. The motivation is that Letterboxd's UI feels clunky, dated, and slow for the core "log what I watched" action, with weak search/discovery and a hard-to-navigate diary. Media Centre aims to feel cleaner, faster, and more like a modern, Apple-designed app.

The full product vision spans several independent subsystems (media cataloging, logging/diary, social/accounts, progression tracking for episodic media), so it is being built in phases. **This document specifies Phase 1 only: a fully-functional, movies-only, local-only (no accounts) version of the app.** TV series, anime, and all social/account features are explicitly deferred to Phase 2+ (see "Deferred to Phase 2 — What's Next") and are **out of scope** for the implementation plan that follows this spec.

This document is written to be self-contained: someone with zero prior context should be able to read only this document and know exactly what to build for Phase 1.

---

## Goals & Non-Goals

### Goals (Phase 1)

- Let a single local user **search** for movies, **browse** trending/curated/personalized rows, and **discover** new titles.
- Let the user **log a watch** in as few taps as possible via a single quick-log sheet (the core pain point being "too many taps to log a watch").
- Support **rewatches**: logging a movie again always adds a new diary entry.
- Let the user **rate** and **review** movies (one rating and one review per movie), keep a **watchlist**, and **like** movies.
- Present the user's history through a **Library** (watched movies, diary, ratings) with a grid/list view toggle.
- Show local-only **profile stats** and app settings.
- Work **fully offline** for all app-owned data (SQLite on device); only movie metadata/images require the network (TMDB).
- Feel visually clean and Apple-inspired (card-based, translucent "Liquid Glass"-style materials evoking iOS 26's design language).

### Non-Goals (Phase 1)

- No user accounts, authentication, or backend.
- No public profiles, public reviews, usernames, or profile pictures.
- No social features of any kind.
- No TV series or anime support.
- No episode/season progression tracking.
- No per-user public/private visibility toggles (likes are a purely local boolean flag with no visibility concept).
- No full end-to-end UI test automation.

---

## Architecture & Stack

### Framework

- **React Native + Expo**, a single codebase. The **initial target platform is iOS**.
- Visual style is **Apple-inspired**: card-based layouts and translucent "Liquid Glass"-ish materials evoking iOS 26's design language. Note that this is a React Native app, not a native Swift app — the design language is emulated, not native.

### Storage

- **Fully local, on-device**, using `expo-sqlite`.
- No user accounts, no backend, no network dependency for the app's own data. Everything works offline **except** fetching movie metadata and images from TMDB.

### External data source

- **The Movie Database (TMDB) public API** is the single external data source. It powers:
  - text search,
  - movie metadata (title, poster, release year, genres, overview, cast),
  - trending and "Top 10 This Week",
  - genre browsing,
  - similar/recommended titles ("Suggested For You", "Discover Something New", and the detail-page "Similar movies" row).
- **Setup dependency:** TMDB requires a free API key. This must be provisioned and configured before the app can fetch any remote data.
- AniList/Jikan (anime data) is **not** used in Phase 1. Anime support and its data source arrive in Phase 2.

### Caching model

- The `Movie` table doubles as a **local cache** of TMDB data for any movie the user has interacted with (logged, watchlisted, or liked). Metadata is written to `Movie` on first fetch, so previously-seen movies remain fully browsable offline even when TMDB is unreachable.
- Personalized rows ("Suggested For You", "Discover Something New") are **computed on-demand** from local rows cross-referenced against TMDB endpoints — nothing about them is persisted beyond the normal `Movie` caching described above.

### Navigation

- A **bottom tab bar with exactly 4 tabs**: **Home**, **Search**, **Library**, **Profile**.

---

## Data Model (SQLite)

Phase 1 uses four tables. Rating and review live on `Movie` (one per movie); watches live in `LogEntry` (one per watch).

### `Movie`

Local cache of TMDB data plus the user's personal rating/review. One row per movie the user has interacted with (logged, watchlisted, or liked).

| Column | Type | Notes |
| --- | --- | --- |
| `tmdb_id` | integer | **Primary key** (the movie's TMDB id) |
| `title` | text | |
| `poster_path` | text | TMDB poster path |
| `release_year` | integer | |
| `genres` | text | Genre list (e.g. JSON-encoded array or delimited string) |
| `overview` | text | Synopsis |
| `my_rating` | float, nullable | Range 0.5–5.0 in 0.5 increments |
| `my_review` | text, nullable | |
| `rating_updated_at` | timestamp, nullable | When the rating/review was last set/changed |

> **Critical modeling decision:** rating and review are **one per movie, not one per diary entry**. Re-rating or re-reviewing a movie **overwrites** the existing value on the `Movie` row. This is a deliberate, final decision — do **not** model rating/review as per-log-entry.

### `LogEntry`

The diary. One row per watch; rewatches are allowed and expected, so this table accumulates multiple rows for the same movie over time.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer | **Primary key** |
| `movie_id` | integer | Foreign key → `Movie.tmdb_id` |
| `watched_date` | date | The date the user watched the movie |
| `created_at` | timestamp | When the log row was created |

> `LogEntry` holds **only** the fact "I watched this on this date." It has **no** rating or review fields — those live on `Movie`.

### `WatchlistItem`

| Column | Type | Notes |
| --- | --- | --- |
| `movie_id` | integer | Foreign key → `Movie.tmdb_id` |
| `added_at` | timestamp | |

### `Like`

| Column | Type | Notes |
| --- | --- | --- |
| `movie_id` | integer | Foreign key → `Movie.tmdb_id` |
| `liked_at` | timestamp | |

> In Phase 1 a like is a **personal boolean flag** with **no visibility/privacy setting** at all. Likes exist purely to power the "Suggested For You" and "Discover Something New" algorithms locally.

### Derived views (no additional storage)

- The **Diary** and **Ratings** views in the UI are just different sorts/filters over `LogEntry`/`Movie` — they require no additional tables.
- **"Suggested For You"** and **"Discover Something New"** are computed on-demand from the user's `Movie.my_rating`/`Like` rows cross-referenced against TMDB's similar/discover endpoints — nothing is persisted locally beyond normal `Movie` caching.

---

## Screens & Features

### Home tab

Netflix-style **horizontally-scrolling rows**, in this order:

1. **Trending Now** — TMDB trending.
2. **Top 10 This Week** — TMDB, with a numbered **1–10 badge** on each poster.
3. **Suggested For You** — derived from the user's highly-rated and liked movies via TMDB's similar/recommendations endpoint.
4. **Discover Something New** — deliberately pulls from genres the user watches/rates **less** often, to surprise them rather than reinforce existing habits. This is a **genre-diversifying** pick, not just another trending list.

The rows layout was chosen over a single mixed vertical/editorial feed because rows scale better as more categories are added later and are easier to scan.

### Search tab

- A **search bar** at the top.
- In the **empty/pre-search state**, a grid of **colorful genre tiles** to browse by (Action, Drama, Sci-Fi, Comedy, etc., pulled from the TMDB genre list). This was chosen over filter-chips-on-results because it is more inviting for open-ended discovery when the user doesn't know exactly what they want.
- Typing in the search bar **live-filters** to TMDB text search results.

### Movie detail page

Displays:

- Poster
- Synopsis
- Cast
- The user's own rating/review, if set
- A **"Log this"** entry point (opens the quick-log sheet described below)
- A **like (heart) toggle**
- An **add-to-watchlist toggle**
- A **"Similar movies"** row (TMDB similar endpoint)

### Logging a watch ("quick-log")

A **single bottom-sheet/modal** — explicitly **not** a multi-step wizard. It contains:

- **Date watched** (defaults to today)
- **Star rating** control (0.5–5 in 0.5 increments)
- An **optional review** text field
- A **single save action**

Save behavior:

- Always **creates a new `LogEntry` row** (so rewatches accumulate in the diary).
- If a rating and/or review were entered or changed in this sheet, it **also updates** `Movie.my_rating`/`Movie.my_review`, **overwriting** any previous value and updating `rating_updated_at`.
- **Overwrite guard:** if a review already exists on the `Movie` row and this save would overwrite it with a new non-empty review, show a **lightweight confirmation** before overwriting, so the user does not silently lose a review they forgot about.

This single-sheet flow was chosen over a Letterboxd-style multi-screen step-by-step flow specifically because the core identified pain point was "too many taps to log a watch."

### Library tab

- Home for the user's **watched movies** (backed by `LogEntry`/`Movie`), **diary**, and **ratings**.
- Includes a user-facing **grid/list view toggle** (poster grid vs. compact row list).
- **Scope of the toggle:** this grid/list toggle applies **only** to the Library/diary screen in Phase 1 — **not** to Search results or Home rows, which keep simpler fixed layouts to limit Phase 1 UI surface area.

### Watchlist

- Movies saved to watch later.
- Addable from search, browse, and detail pages **without** logging them as watched.
- **Included in Phase 1** as a core expected feature (not deferred), alongside logging/rating/diary.

### Likes

- A **heart/like toggle** on any movie, independent of the star rating.
- **Included in Phase 1.**
- In Phase 1, likes have **no visibility/privacy setting** — they are used purely locally to power the Suggested-For-You / Discover algorithms.

### Profile tab

- In Phase 1 this is **local-only**: the user's own **stats** (count watched, average rating, etc.) and **app settings**.
- **No** username, **no** profile picture, **no** public-facing version yet.
- This screen is explicitly the **seed** that becomes the public profile page in Phase 2, so its internal structure should be reasonably ready to grow into that — but it should **not** attempt to build any public/account functionality now.

---

## Error Handling & Edge Cases

- **No network / TMDB unreachable:** Search and Home rows show a **retry/error state**. Movies already logged locally remain fully browsable offline because their metadata is cached in the `Movie` table on first fetch.
- **TMDB rate limiting or downtime:** Because movie metadata is cached locally on first interaction, a previously-logged movie's detail page should **never** break just because TMDB is temporarily unavailable.
- **Re-logging an already-watched movie:** Always adds a new diary `LogEntry`. If the quick-log sheet also includes a rating/review change, it overwrites `Movie.my_rating`/`my_review` — and shows a **confirmation step** if overwriting a non-empty existing review (per the overwrite guard above).
- **Empty states** are needed for:
  - **First-run Home** — before enough data exists to personalize, fall back to **generic Trending / Top 10 only**, until the user has logged/liked enough for personalization to kick in.
  - **Empty Library**
  - **Empty Diary**
  - **Empty Watchlist**

  Each empty state needs a simple "nothing here yet, go search" prompt.
- **Ambiguous titles / remakes / franchises:** Rely on **TMDB's own disambiguation** (release year + poster shown alongside the title in search results) rather than building custom matching logic.

---

## Testing Approach

This is a solo / personal-scale project. Verification strategy:

- **Primary verification is manual testing** on the iOS Simulator (and ideally a real device) during development.
- **Lightweight automated unit tests** are worthwhile specifically for the parts that are easy to get subtly wrong without UI feedback:
  - The **SQLite data-access layer** — log / rate / review / watchlist / like CRUD operations, **especially** the rating/review-overwrite-on-relog behavior.
  - The **Suggested-For-You** and **Discover-Something-New** selection logic.
- **Full end-to-end UI test automation is explicitly not needed** at this stage.

---

## Deferred to Phase 2 — What's Next

The following are **out of scope** for the Phase 1 implementation plan and are listed here only as a brief pointer to what comes next:

- **Accounts + backend** (e.g. Supabase) + **authentication**.
- **Public profile pages:** visible watch stats and public reviews to other users; diary, watchlist, and likes stay private by default, with a per-user **public/private toggle** (for likes specifically).
- **Username and profile picture** selection.
- **TV series support** (via TMDB).
- **Anime support** (via AniList/Jikan) plus an episode/season **progression-level tracking** feature specific to episodic media.
