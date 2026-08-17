# Media Centre — Phase 1 (Movies MVP) Design Spec

**Date:** 2026-08-17
**Status:** Approved — ready for implementation planning
**Scope:** Phase 1 only (movies, local-only, no accounts)

---

## Overview

Media Centre is a personal media-logging app in the spirit of Letterboxd, built to eventually cover movies, TV series, anime, and further media types beyond that, with reviews, diary entries, ratings, and progression tracking. The motivation is that Letterboxd's UI feels clunky, dated, and slow for the core "log what I watched" action, with weak search/discovery and a hard-to-navigate diary. Media Centre aims to feel cleaner, faster, and more like a modern, Apple-designed app.

The full product is being built in **phases**, each with its own design document. **A phase is only designed once the phase before it has been fully implemented and verified** — see [`docs/ROADMAP.md`](../../ROADMAP.md) for the phase list, what each one covers, and current status. **This document specifies Phase 1 only: a fully-functional, movies-only, local-only (no accounts) version of the app, with exactly one media type and therefore no type-selection UI.** Every later phase — additional media types, media-type selection, accounts, and public profiles — is entirely out of scope here and lives in its own phase document.

This document is written to be self-contained: someone with zero prior context should be able to read only this document and know exactly what to build for Phase 1.

---

## Goals & Non-Goals

### Goals (Phase 1)

- Let a single local user **search** for movies, **browse** trending/curated/personalized rows, and **discover** new titles.
- Let the user **log a watch** in as few taps as possible via a single quick-log sheet (the core pain point being "too many taps to log a watch").
- Support **rewatches**: logging a movie again always adds a new diary entry.
- Let the user **rate** and **review** movies (one rating and one review per movie), keep a **watchlist**, and **like** movies.
- Present the user's history through a **Library** (watched movies, diary, ratings) with a grid/list view toggle, and let the user **sort and filter** it (by rating, date watched, title, genre).
- Make rewatching frictionless with a **one-tap rewatch** shortcut, and protect destructive actions (delete/overwrite) with an **undo** affordance.
- Surface **franchise / collection watch order** on a movie's detail page — the other films in that movie's collection, shown in order, each marked if the user has already watched it.
- Let the user **import** an existing Letterboxd diary/ratings on first launch, and **back up / restore** all local data as JSON (there is no backend, so the on-device SQLite store is the only copy of the user's data).
- Offer a yearly **"Your Year" recap** — a wrapped-style stats screen computed from the user's existing local diary data.
- Show local-only **profile stats** and app settings.
- Work **fully offline** for all app-owned data (SQLite on device); only movie metadata/images require the network (TMDB).
- Feel visually clean and Apple-inspired (card-based, translucent "Liquid Glass"-style materials evoking iOS 26's design language).

### Non-Goals (Phase 1)

- No user accounts, authentication, or backend.
- No public profiles, public reviews, usernames, or profile pictures.
- No social features of any kind.
- No TV series, anime, books, manga, music, or any media type other than movies.
- No episode/season progression tracking.
- No **media-type selection UI** — with exactly one media type in Phase 1, there is nothing to choose between yet. This arrives in Phase 2, alongside the first additional media type (see [`docs/ROADMAP.md`](../../ROADMAP.md)).
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
| `dominant_color` | text, nullable | Hex color extracted from the poster on first cache; tints the foreground glass/accent on the Poster-Driven Glass backdrop (see "Visual Design System"). Falls back to the default accent when null. |
| `release_year` | integer | |
| `genres` | text | Genre list (e.g. JSON-encoded array or delimited string) |
| `overview` | text | Synopsis |
| `collection_id` | integer, nullable | TMDB collection id from the movie's `belongs_to_collection`, cached on first fetch. Null if the movie belongs to no TMDB collection. Powers the "Franchise & Collection Ordering" row (see Screens & Features). |
| `collection_name` | text, nullable | TMDB collection name (e.g. "The Dark Knight Collection"), cached alongside `collection_id`. Null when `collection_id` is null. |
| `my_rating` | float, nullable | Range 0.5–5.0 in 0.5 increments |
| `my_review` | text, nullable | |
| `rating_updated_at` | timestamp, nullable | When the rating/review was last set/changed |

> **Critical modeling decision:** rating and review are **one per movie, not one per diary entry**. Re-rating or re-reviewing a movie **overwrites** the existing value on the `Movie` row. This is a deliberate, final decision — do **not** model rating/review as per-log-entry.

> **The curated shared-universe seed list is NOT a SQLite table.** The hand-curated cross-collection watch-order dataset used by "Franchise & Collection Ordering" (see Screens & Features) is **bundled static app content** — e.g. a JSON file shipped in the app bundle — not per-user data and not fetched at runtime. It therefore has no table here. Only the two nullable `collection_id`/`collection_name` columns above are added to the schema; the "already watched" indicator on the franchise row is computed on the fly from existing `LogEntry` rows, with **no new join table**.

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
- A **franchise / collection row**, when the movie belongs to one — see "Franchise & Collection Ordering" below

### Franchise & Collection Ordering

When a movie belongs to a franchise or collection, the detail page shows a **horizontal row of the other films in that collection, in release order**, so the user can see the intended watch order at a glance. Each poster in the row carries a small **"already watched" indicator** when the user has at least one `LogEntry` for that movie — computed on the fly by checking `LogEntry`, with **no new join table** and no persisted "franchise" record.

This ships as **two layers**:

1. **Dynamic TMDB collections (automatic, zero maintenance).** TMDB exposes a `belongs_to_collection` field on a movie and a `/collection/{id}` endpoint that returns the collection's member movies. When a cached movie has a `collection_id` (see Data Model), the app fetches that collection's members and renders them release-ordered. This is automatic for any movie TMDB has grouped, needs no upkeep, and cleanly handles trilogies and direct sequel chains (e.g. "The Dark Knight Collection," "Star Wars Collection").
2. **A small bundled static seed list (hand-curated shared universes).** A short, manually-maintained dataset shipped with the app (bundled JSON — see the Data Model note, **not** a SQLite table) maps well-known **cross-collection shared universes** to a suggested watch order by TMDB movie id. The seed ships with the user's own examples — the **MCU** and the **Transformers** films — as its starting entries.

> **Honest limitation, and the judgment call that resolves it (please correct if wrong).** TMDB's official collections are usually just **direct sequel chains**, not shared universes: "Iron Man Collection," "Captain America Collection," and "Avengers Collection" are each a *separate* TMDB collection, and TMDB has **no single unified "MCU" collection** spanning all of them. So a pure TMDB-collections approach **cannot alone** produce "the MCU in watch order" — which is exactly the example that motivated this feature. The resolution is the two-layer design above: layer 1 (dynamic TMDB collections) covers simple franchises automatically, and layer 2 (the bundled seed list) hand-curates a **short, deliberately incomplete** set of famous shared universes (MCU, Transformers to start) on top. This seed list is **manually maintained and intentionally small** — it is **not** a general-purpose franchise database, and it is **not** a Phase 1 completeness requirement that it be exhaustive. Growing it is ongoing maintenance / future-phase work, not something Phase 1 must finish.

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

**One-tap rewatch.** For a movie already in the Library, a **long-press or swipe action on the Library item** logs "watched again today" — creating a new `LogEntry` dated today **without opening the quick-log sheet at all**. This is the fastest path for the common "watched this again" case; it touches only `LogEntry` (no rating/review change, so no overwrite concern) and reuses the existing diary model.

**Undo on destructive actions.** Deleting a diary entry, and overwriting an existing rating/review, both surface a brief **undo toast** immediately afterward so a mistaken tap is instantly reversible. This complements the overwrite guard above (the guard asks *before* overwriting a review; the toast lets the user reverse *after* the fact) and covers diary-entry deletes, which have no confirmation step of their own.

### Library tab

- Home for the user's **watched movies** (backed by `LogEntry`/`Movie`), **diary**, and **ratings**.
- Includes a user-facing **grid/list view toggle** (poster grid vs. compact row list).
- **Scope of the toggle:** this grid/list toggle applies **only** to the Library/diary screen in Phase 1 — **not** to Search results or Home rows, which keep simpler fixed layouts to limit Phase 1 UI surface area.
- **Sort & filter.** The Library supports **sorting** (by rating, date watched, title) and **filtering** (by genre), operating entirely over the existing `LogEntry`/`Movie` rows — no new tables or schema. This is the one screen where the user's own history is large enough to need reordering/narrowing, so the controls live here rather than being spread across Search/Home.
- The **one-tap rewatch** long-press/swipe action (see "Logging a watch") lives on Library items.

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

### Data import & export

Because Phase 1 has **no backend**, the on-device SQLite store is the **only** copy of the user's diary, ratings, watchlist, and likes. Two local-only data flows protect and seed that data, both reached from **Profile → Settings**:

- **Letterboxd CSV import.** On first launch (and available afterward from Settings), the user can import an existing **Letterboxd diary/ratings CSV export**. Imported rows are matched to TMDB movies and written into the existing `Movie`/`LogEntry` tables (a rating/review maps to `Movie`, each watched-date row to a `LogEntry`), so a switching user starts with their history intact rather than an empty app.
- **Local backup & restore.** The user can **export** all app-owned data to a **JSON file** and **restore** from one. This is a plain local file the user manages themselves (e.g. via the iOS share sheet / Files) — there is no cloud sync in Phase 1; it exists specifically because the SQLite store is otherwise the only copy.

Both flows operate purely over the **existing** tables and add **no new schema**. Ambiguous CSV titles reuse the same TMDB disambiguation already described in "Error Handling & Edge Cases" rather than any custom matcher.

### "Your Year" recap

A **wrapped-style yearly recap** screen — total films watched, hours (from runtime), top genres, highest-rated, busiest month, and similar highlights — computed **on demand from the existing local diary data** (`LogEntry`/`Movie`), persisting nothing new. It reads as its own focused screen rather than more rows on Profile, but is reached from the Profile tab.

> **Placement judgment (please correct if wrong):** the recap is given its **own Screens & Features subsection** and its own screen, entered from Profile, rather than being folded inline into the Profile tab's stats. Reason: it is a seasonal, celebratory, full-screen experience distinct from Profile's always-on summary stats. It adds no data model of its own either way, so this is purely a UI-placement call and cheap to revisit.

---

## Visual Design System

This section defines the concrete visual language for Phase 1. The goal is a **"Card Feed"** aesthetic — a medium poster/banner image with an info card below it — that evokes iOS 26's **"Liquid Glass"** translucent materials. This is a **React Native + Expo** app emulating Apple's design language (see "Architecture & Stack"); it is **not** a native Swift app, so every Apple-ish behavior below is achieved with RN primitives and Expo modules (`expo-blur`, `expo-symbols`, `expo-haptics`), not UIKit/SwiftUI.

All values below are Phase-1 targets for the **iOS** platform only. They are concrete enough to implement directly, but exact pixel-tuning during implementation is expected and fine.

> **Personalization scope (explicit interpretation — please correct if wrong):** Earlier in brainstorming, when asked to commit to ONE fixed visual style (poster-grid wall vs. editorial list vs. card feed), the answer was "the user can select what they want" rather than hard-picking one. For Phase 1 this is interpreted **narrowly and YAGNI-style** as standard Apple-native personalization: **Light / Dark / Auto** appearance mode (follows the system by default, manual override in Profile → Settings) and an optional **accent color** choice (like Reminders/Notes/Calendar let you pick a tint). It is **not** interpreted as building three swappable app-wide layout paradigms (grid-wall / editorial / card-feed as runtime themes) — a full theming engine is scope creep for an MVP. The fixed app-wide layout is the **Card Feed** style already decided above. If this reading is wrong, flag it before implementation.

### Typography

The type system uses the **system font (San Francisco on iOS)**, obtained through React Native's default OS font mapping (`System` / the platform default family) — no bundled custom font in Phase 1. Weights map to the standard SF weights.

| Role | Approx. size (pt) | Weight | Usage |
| --- | --- | --- | --- |
| Large Title | 34 | Bold | Collapsible screen headers (Home, Library) |
| Title | 28 | Bold | Movie detail title, sheet titles |
| Headline | 17 | Semibold | Row section headers, emphasized labels |
| Body | 17 | Regular | Synopsis, review text, primary content |
| Subheadline | 15 | Regular | Card meta line (year · genre · rating), secondary content |
| Caption | 12 | Regular | Timestamps, badges, tertiary metadata |

- **Numerals & data:** numeric UI — the **Top 10** row badges, the **star-rating numeric value**, and **year/runtime** meta — uses **SF Pro Rounded** (`ui-rounded` in RN's font-family stack) rather than the standard SF Pro used for prose. This mirrors Apple's own use of Rounded for badges and data in apps like Fitness and News, and gives numeric UI a distinct, friendly texture against the sharper prose type.

- **Dynamic Type:** text respects the user's OS text-size setting. Use RN's `allowFontScaling` (default-on) and size text with the scalable font metrics rather than fixed line heights that clip. Layouts (cards, rows, sheet content) must reflow, not truncate, at larger accessibility text sizes. This ties directly into **Accessibility** below.

### Color System & Appearance Modes

Colors are defined as **semantic tokens**, never as hardcoded hex values sprinkled through components. Each token resolves to a named, concrete value in light vs. dark mode; components reference the token, so appearance switching is automatic. The palette is grounded in the movie-marquee subject rather than an arbitrary brand color.

| Token | Name | Purpose | Light | Dark |
| --- | --- | --- | --- | --- |
| `background` | **Canvas** | Primary screen background | Canvas Light `#F5F5F7` | Canvas Dark `#0B0B0D` |
| `secondaryBackground` | — | Cards, grouped surfaces, sheet body | `#FFFFFF` | `#1C1C1E` |
| `label` | **Ink** | Primary text | `#1C1C1E` | `#F5F5F5` |
| `secondaryLabel` | **Secondary Ink** | Meta text, captions | `#6E6E73` | `#98989D` |
| `accent` / `tint` | **Marquee Amber** | Default/resting accent: active tab, buttons, star-rating fill | `#FF9F0A` | `#FF9F0A` |
| `separator` | — | Hairline dividers, list separators | `#C6C6C8` | `#38383A` |
| _(dynamic)_ | **Poster-tinted Glass** | Per-movie tint on single-film screens | see "Signature: Poster-Driven Glass" | see "Signature: Poster-Driven Glass" |

- **Marquee Amber** is the default/resting accent, used for the active tab, buttons, and star-rating fill whenever no film-specific tint is active. It is chosen deliberately over a generic neon/acid accent: warm amber reads as movie-marquee / cinema-lighting, grounding the accent in the subject rather than picking an arbitrary brand color.
- **Poster-tinted Glass** is not a fixed hex; it is a dynamic token derived per movie — see the **"Signature: Poster-Driven Glass"** subsection below.
- **Light / Dark / Auto:** all three are fully supported. **Auto** (follow system) is the default; a manual override lives in **Profile → Settings**. Read the active scheme via RN `useColorScheme()` plus the user's override preference, resolving tokens accordingly.
- **Accent color personalization:** the user may override **Marquee Amber** with another accent/tint color (a small fixed palette, Apple-style), stored in local settings and applied to the `accent`/`tint` token app-wide. This is the personalization described in the callout above and lives in **Profile → Settings** alongside the appearance-mode control. Persist the choice in the local settings store (no accounts — see "Architecture & Stack").

### Materials ("Liquid Glass")

Translucent, blurred materials are the signature of the look and are implemented with **`expo-blur`** (`BlurView`) layered over content, with `tint` following the active appearance mode.

- **Where translucency IS used:** the **bottom tab bar**, the **quick-log bottom sheet** background, and the **navigation bar / large-title header** background. These are chrome surfaces that sit over scrolling content, so the blur reads as depth and looks intentionally Apple-like.
- **Where translucency is NOT used:** **dense list content** — Library compact rows, search-result rows, and the bodies of cards — render on the **opaque** `secondaryBackground` token. Blurring behind dense, fast-scrolling content hurts both **readability** and **performance** (many stacked `BlurView`s are expensive), so those surfaces stay solid.
- **Layering & elevation:** depth comes from **subtle shadows and hairline (`separator`-colored) borders**, not heavy drop-shadows. Cards use a soft, low-opacity shadow (small blur radius, minimal offset) to lift them a hair off the background; adjacent surfaces are delineated with 1px hairline borders. Avoid pronounced, dark Material-style elevation shadows — they read as Android, not iOS.
- **Chrome blur vs. poster backdrop:** the `BlurView` usage above is for **chrome** (tab bar, sheet, nav bar) sitting over the neutral **Canvas**. On the Movie detail page and quick-log sheet specifically, the background beneath that chrome is not Canvas at all — it is the film's own poster image, blurred full-bleed. See **"Signature: Poster-Driven Glass"** below.

### Signature: Poster-Driven Glass

This is the one memorable, subject-grounded visual idea for the app. On any screen centered on a **single film** — the **Movie detail page** and the **quick-log sheet** — **the page background itself is that film's own poster art**: the poster image, heavily blurred and scaled to fill the screen behind the content, the way Apple Music's Now Playing screen or the Apple TV app use the current album/show artwork as the backdrop rather than a plain color. The glass surfaces and accent color layered on top then pick up the poster's dominant color, so the whole screen — not just an accent chip — reads as belonging to that film.

- **Two layers, two jobs:** (1) the **backdrop** is the actual poster image (already fetched and cached for display elsewhere — see "Caching model"), rendered full-bleed with a strong blur and slight scale so no hard poster edges show; (2) the **dominant color** (a single extracted hex, `Movie.dominant_color`) tints the *foreground* glass elements — the info card, buttons, star-rating fill — so they read as part of the same color world as the backdrop rather than clashing with it.
- **Applied with restraint:** **Home**, **Search**, and **Library** stay on the neutral **Canvas** / **Marquee Amber** palette described above, because those are multi-poster browse/scan screens — there is no single "the movie cover" to back a screen showing dozens of films at once, and a shifting per-item backdrop would be visually noisy. The full-bleed poster backdrop is reserved for single-film focus, so it reads as a deliberate reveal rather than decoration smeared across every screen.
- **Implementation approach:** the backdrop reuses the poster image already cached locally — no extra fetch. The `Movie.dominant_color` hex is extracted client-side **once**, at the same time the poster is first cached (see "Caching model" in "Architecture & Stack"), not recomputed on every view, and stored in the `Movie.dominant_color` column (see "Data Model") so both the image and its derived tint are available offline together.
- **Graceful fallback:** if a poster image is not yet cached, or dominant-color extraction fails or is still pending, fall back to the neutral **Canvas** background with the default **Marquee Amber** tint on the foreground glass — never block rendering on either.

### Iconography

- Icons use **`expo-symbols`** (SF Symbols on iOS) for both **tab bar icons** and **inline UI icons** (heart/like, bookmark/watchlist, stars, chevrons, "see all" arrows).
- Icon **weight and scale** are matched to the adjacent type — e.g. an inline icon next to Headline/Body text uses a comparable optical weight so glyph and label sit as a unit.
- **Fallback note:** SF Symbols are **iOS-only**. This is consistent with Phase 1's **iOS-only** target (see "Architecture & Stack"), so no cross-platform symbol fallback is built in Phase 1; should Android enter scope in a later phase, a symbol-mapping fallback would be added then.

### Spacing & Shape

- **Spacing grid:** an **8pt grid**. Standard steps are 4 / 8 / 16 / 24 / 32 pt (4pt used only for tight intra-component gaps). Screen gutters and inter-card spacing default to 16pt.
- **Corner-radius scale:**

| Token | Radius (pt) | Applied to |
| --- | --- | --- |
| Small | 8 | Buttons, genre tiles, small controls |
| Medium | 12 | Card Feed items, poster cells |
| Large | 20 | Bottom sheet top corners, large hero surfaces |

- **Continuous corners:** larger surfaces (cards, sheets) use **continuous ("squircle"-style) corners** rather than simple circular arcs, matching iOS. In RN this is `borderCurve: 'continuous'` on the relevant surfaces.

### Navigation Patterns

- **Collapsing large title:** Home and Library use a **large-title header that collapses to a compact inline title on scroll**, the native iOS pattern. Achieved via the navigation library's large-title header option with a collapse-on-scroll behavior; the header background is a translucent material (see "Materials").
- **Native sheet for quick-log:** the quick-log flow uses **native sheet presentation with a grabber handle**, presented with **detents** (e.g. a **medium** detent that the user can drag up to **large**), not a custom full-screen modal. This matches the single-sheet quick-log decision in "Logging a watch."
- **Swipe-back:** the standard iOS **edge swipe-back gesture** is preserved on all pushed screens (e.g. movie detail), using the default native stack behavior.

### Component Library

The screens already spec'd imply this small reusable component set (named here; full props/API belong in the implementation plan, not this spec):

- **Card Feed item** — poster/banner image with an info card below it (title + meta line); the primary Home/detail content unit.
- **Poster grid cell** — a poster tile for the Library grid view and Search results.
- **Compact library row** — a thumbnail + title + meta single-line row for the Library list view (the list half of the grid/list toggle).
- **Genre tile** — a colorful, tappable category tile for the Search empty-state grid.
- **Star rating control** — 0.5–5.0 rating in **0.5 increments**, tappable and draggable, used in the quick-log sheet and on the detail page.
- **Row header** — a section title with an optional **"see all"** affordance, used above each horizontal Home row.
- **Tab bar item** — an SF Symbol icon + label for the 4-tab bar (Home, Search, Library, Profile), with active-state `tint`.
- **Toggle button** — the icon-only **like (heart)** and **watchlist (bookmark)** controls on the detail page.

### Motion & Haptics

- **Spring-based transitions:** sheet presentation and card/press interactions use **spring animations (not linear easing)** for a natural, iOS-native feel. Prefer the platform's native spring for sheet presentation and RN's spring/reanimated springs for in-content taps.
- **Haptics:** use **`expo-haptics`** **light-impact** feedback on **rating changes** (each 0.5 step), the **like toggle**, and **save** actions (logging a watch, adding to watchlist). Keep haptics to light impact — no heavy/notification haptics for these routine actions.
- **Reduce Motion:** respect the OS **"Reduce Motion"** accessibility setting — when enabled, replace spring/slide transitions with a simple cross-fade (or no animation) and skip non-essential motion. Ties into **Accessibility** below.

### Accessibility

- **Dynamic Type scaling:** text scales with the OS text-size setting and layouts reflow rather than clip (see "Typography").
- **VoiceOver labels:** every **icon-only** control has an explicit accessibility label — the **like** toggle ("Like" / "Unlike"), the **watchlist** toggle ("Add to watchlist" / "Remove from watchlist"), and the **star rating control** (current value announced, e.g. "Rating, 3.5 of 5 stars, adjustable"). "See all" and tab items are likewise labeled.
- **Contrast:** semantic color tokens meet **WCAG AA** contrast against **both** the light and dark `background`/`secondaryBackground` tokens — verified for `label`, `secondaryLabel`, and any text placed over translucent material.
- **Reduce Motion:** honored as described in "Motion & Haptics" — reduced or cross-faded transitions when the OS setting is on.

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

## What's Next

Everything beyond Phase 1 — additional media types, media-type selection, accounts, and public profiles — is **out of scope** for this document and for the Phase 1 implementation plan. Per the phase-gating rule, none of it is designed in detail until Phase 1 is fully built and verified.

See [`docs/ROADMAP.md`](../../ROADMAP.md) for the full phase list and status. Each later phase has its own scope document under `docs/superpowers/specs/`:

- **Phase 2 — TV Series, Anime & Media-Type Selection:** [`2026-08-17-phase2-series-anime-media-selection.md`](2026-08-17-phase2-series-anime-media-selection.md)
- **Phase 3 — Accounts, Backend & Public Profiles:** [`2026-08-17-phase3-accounts-public-profiles.md`](2026-08-17-phase3-accounts-public-profiles.md)
- **Phase 4 — Further Media Types (Books, Manga, Music):** [`2026-08-17-phase4-additional-media-types.md`](2026-08-17-phase4-additional-media-types.md)
- **Phase 5 — Platform Integration (Widget, Spotlight, Siri):** [`2026-08-17-phase5-platform-integration.md`](2026-08-17-phase5-platform-integration.md)
