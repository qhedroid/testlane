# Compass Design System · TransPerfect TechOps

> The design system for **GlobalLink** products and other TransPerfect TechOps surfaces.
> Compass sits on top of the broader **TransPerfect master brand**, which governs marketing,
> presentations, social and print. Both layers live in this repo.

**Tagline:** *The Language of Global Business*

---

## About TransPerfect & GlobalLink

TransPerfect is the world's largest privately-held provider of language and AI solutions
for global business — translation, localization, interpretation, multimedia, technology
and consulting services. The brand voice is built on the core values **Own It, Service,
Integrity, Respect, Financial Responsibility, Transparency, Quality, Results, Urgency,
Diversity, Teamwork**.

The four divisions of the corporate brand are:

| Division | What it covers |
|---|---|
| **Business Solutions** | Vertical-specific groups (Life Sciences, Medical Device, Legal, Travel, Retail, Financial, Gaming, Tech, Health). |
| **Specialized Agencies** | Cross-vertical specialist groups (Learning, Connect, Live, Content Labs, Media). |
| **Technology** | Client-facing technologies, mostly unified under **GlobalLink**. |
| **Direct** | Self-serve products transacted directly with end-users. |

This design system serves the **Technology** division — specifically the **GlobalLink**
family of products built and maintained by the **TechOps** team. The system is named
**Compass** because, as the GlobalLink platform grew across many apps (A2A, Assets,
Authoring, Home, Invoices, LIVE, NOW, Patents, Portal, RM, SHARE, SideBySide, SUBCONNECT,
TV, etc.), Compass became the shared north star — a single visual & interaction language
that all GlobalLink properties pull from.

### Products represented in this file

- **GlobalLink (suite)** — the broader product portal: A2A, Assets, Authoring, Home,
  Invoices, LIVE, NOW (GO), Patents, Portal, Project Director / Tracker, Quotes Tool,
  Reef Central, Review Manager, Scribe, Semantix Hub / XTRF, SHARE, Side-by-Side,
  Strings, Stylus, SUBCONNECT, TransCEND, Trial Interactive, TV, Voice, Web…
- **Copernicus** — adjacent TechOps product (logo present in brand assets).
- **TechOps internal tooling** — admin, dashboards, support consoles.

---

## Sources

- **Figma file**: `Compass Design System – GlobalLink.fig` (61 pages, 408 frames,
  253k nodes — see the mounted `.fig` virtual filesystem for `/Color-Pallete`,
  `/Typography-styles`, `/Tokens`, `/Brand`, `/Buttons`, `/Header-V1.2`, etc.)
- **Brand Guidelines V2.0**: `uploads/TransPerfect Brand Guidelines 2025.pdf`
  (master brand colour, type, logo, photography, social, signature rules)
- **Fonts**: shipped under `fonts/` — Poppins (primary), Montserrat (secondary),
  Gotham (display, OTF). Open Sans is loaded from Google Fonts; see *Caveats*.
- **Icon bank**: `uploads/SVG.zip` (510 brand icons in white + light-blue) →
  unpacked into `assets/icons/{white,light-blue}/` and surfaced via
  `assets/icons/icons.css`.

---

## Index — what's in this repo

```
/                         ← root
├── README.md                       this file
├── SKILL.md                        skill description for Claude Code
├── colors_and_type.css             ALL tokens — colors, type, spacing, radii, shadows
├── fonts/                          .ttf + .otf font files
├── assets/
│   ├── logos/                      TransPerfect, GlobalLink, sub-product, Compass, TechOps
│   └── icons/
│       ├── light-blue/             ~250 brand icons in #139DD8 (Light Blue)
│       └── white/                  ~250 brand icons in #FFFFFF (for dark BGs)
├── preview/                        Design-System-tab cards (typography, color, components…)
├── ui_kits/
│   └── globallink/                 GlobalLink Compass app UI kit (index.html + JSX comps)
```

> **Marketing or deck work?** Use `--tp-*` tokens, Poppins, and the
> guidance in *Visual Foundations → Brand surfaces*.
> **In-product UI work?** Use `--gl-*` tokens, Open Sans body / Gotham SSm display,
> and the components in `ui_kits/globallink/`.

---

## Content fundamentals

The brand voice is **professional, confident, internationally-minded, and quietly
human**. It is the voice of a global services company writing to operators,
project managers, localization engineers and procurement.

### Tone

- **Authoritative but approachable.** "Authority, dignity, security, stability, heritage,
  trust" — but also "friendly, approachable, reliable, trustworthy." The blue palette is
  the visual analogue of the voice.
- **Outcome-led.** Copy leads with what the reader gets done: *"All modules were rolled
  out on time, within budget."* / *"Project management time was reduced from three months
  to 10 days."* / *"a 33% reduction in engineering localization costs overall."*
- **Plain language. No idioms.** Most readers are non-native English speakers; many
  TransPerfect-produced surfaces are themselves localized into 100+ languages.

### Casing & punctuation

- **Headlines:** sentence case is preferred everywhere in product UI ("Project status").
  The master-brand decks lean on **ALL-CAPS + bold Poppins** for splashes and section
  dividers ("THE MASTER BRAND", "OUR CORE VALUES") — this is a *deck* device, not a
  general one.
- **Product names** are written exactly as the brand owns them: `GlobalLink`,
  `GlobalLink LIVE`, `GlobalLink A2A`, `Side-by-Side`. Never `Global Link`.
- **Buttons:** sentence case verbs ("Save changes", "Submit for review").
- **Numbers:** spelled out for one through nine in body copy; numerals from 10+
  and always in stats. Use the en-dash for ranges (3–5 days).
- Em-dashes are used sparingly; en-dashes for ranges; commas (Oxford optional but consistent).

### Pronoun & address

- **"You"** is the right address for app UI and for client-facing decks ("you can…",
  "your project…").
- **"We"** is used for the master brand: *"We help people and businesses to shine in
  any language."*
- "I" is never used.

### Vibe (and what to avoid)

- **Vibe:** measured, confident, factual; small enthusiasms are reserved for results
  ("Aēsop's Success Story in Rapid Product Knowledge Localization"). Long-form descriptions
  are dense with metrics, not adjectives.
- **Avoid:** marketing exclamation marks, emoji in product UI (none appear in Compass
  components — only the 🧭 compass glyph in the design-system cover frame as an internal
  Easter egg), ALL-CAPS shouting in body, ironic/playful copy, idioms that don't translate.

### Examples (verbatim from source material)

> *"TransPerfect is a leading language technology company, offering a broad range of
> translation and interpreting services. We help people and businesses to shine in
> any language."* — master brand primer

> *"Our design system leverages a purposeful set of color styles as the perfect
> starting point for any brand or project. When it comes to color, contrast is
> critical for ensuring text is legible."* — Compass color page

> *"Blue is your 'primary' color, and is used across all interactive elements such
> as buttons, links, inputs, etc."* — Compass color page

> *"Note that it's recommended to use Open Sans for ≤ 16px and Gotham for ≥ 24px."*
> — Compass typography rule

---

## Visual foundations

### Colour

**Two palettes live side-by-side; pick by surface.**

#### Master brand (marketing, decks, social, print)
- **Primary:** Light Blue `#139DD8` (Pantone 299 C) + Dark Blue `#003B71` (Pantone 541 C).
  The pair embodies "creativity and dynamism" — bright blue = innovation/technology;
  dark blue = tradition/quality.
- Each is approved as a **5-stop tint gradient** (100/80/60/40/20%).
- **Secondary palette** (10% accent only, never primary): Orange `#FF6600`,
  Teal `#3BBFB5`, Purple `#7356C0`, Pink `#EC388A`, Green `#7BC3DA`,
  Alabaster `#E7E3DA`, Blue White `#E0E8F5`, Dark Gray `#666666`, Light Gray `#F2F2F2`.
- **On colour:** *white on blue is the preferred treatment.* Blue-on-blue is to be
  minimised.

#### Compass / GlobalLink (in-product UI)
- **Primary:** Blue 500 `#1976D2` (interactive: buttons, links, inputs, focus rings).
  Full 9-stop ramp 50→900.
- **Neutral:** 14-step gray ramp (50, 100, 200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900 — Original = 700). Almost every surface, divider, text colour
  and form chrome is gray.
- **Secondary / Tertiary / Accents:** Purple (upsell), Pink (user feedback / updates),
  Greenish (accent 1), Orange (accent 2).
- **Status:** Success `#108718`, Danger `#C50007`, Warning `#E4AF03`.
- **High-contrast (Ally) mode** swaps in saturated "shock" variants
  (#6BEAFF, #FF5CC3, #4BFF6B, #FF6363, #FBFB0F) for accessibility.
- **Turquoise `#6BEAFF`** is reserved exclusively for the GlobalLink product-name
  lockup inside the app header. Don't use it anywhere else.
- All swatches have documented WCAG 2.1 contrast ratios in `colors_and_type.css`
  comments.

### Typography

- **Brand display (marketing):** **Poppins** — bold for headlines, light → medium → bold
  for multi-thickness compositions, regular for body. *"A clear hierarchy with a few
  font weights. This is how we build recognition and a clear connection to our brand
  identity."*
- **Brand secondary:** **Montserrat** — used when Poppins isn't available on a
  recipient's machine (shared editable docs).
- **Brand web-fallback:** **Verdana** — for email signatures and old-browser web.
- **Compass body (in-product):** **Open Sans** for everything ≤ 16px — buttons,
  fields, labels, body copy.
- **Compass display (in-product):** **Gotham SSm** for ≥ 24px — page titles,
  card headings, dashboard numbers. *Note: shipping plain Gotham (OTF) here as
  Gotham SSm is a separate Hoefler license; visually near-identical.*
- **Type tokens** mirror Compass Figma names: `gl-fontSize__{xs,s,m,l,xl,xxl,xxxl}` =
  12/14/16/20/24/32/40 px. Weight tokens are nominal:
  `light(300) regular(400) medium(500) semibold(600) bold(700) extraBold(800)`.

### Spacing

- **8-point grid.** Tokens `gl-spacing__1..11` = `2 4 8 16 24 32 40 48 64 72 80 px`.
- Most app components use 4/8/16/24 spacings; section padding is 32-64.

### Radii, borders, shadows

- **Radii:** `s 6 · m 8 · l 10 · xl 16 · rounded 100` px. Most cards & buttons sit on
  `m` or `l`. Pills (filter chips, tags) use `rounded`.
- **Border widths:** `s 1px · m 2px`. 1px is the default; 2px is reserved for focus
  rings and emphasis.
- **Shadow scale** (`gl-shadow__{xs,s,m,l}`):
  - `xs` 0 0 8 rgba(0,0,0,.10) — flat raised
  - `s`  0 4 10 rgba(0,0,0,.12) — card
  - `m`  0 4 15 rgba(0,0,0,.15) — popover
  - `l`  0 4 20 rgba(0,0,0,.20) — modal / overlay
- **No inner shadows** in Compass; only outer drop shadows.
- **No "capsule" protection gradients** — Compass uses solid surfaces + 1px border
  for separation, never gradient overlays.

### Backgrounds & imagery

- **Default surfaces are solid.** White/`gl-gray-100`/`gl-gray-200` for light mode,
  the dark gray ramp for dark mode. **No gradients on in-product surfaces.**
- **Marketing surfaces** may use the **light-blue ↔ dark-blue** 5-stop tint gradients
  documented above.
- **Photography:** vibrant, eye-catching, professional. Themes: creativity, nature,
  technology, diversity of people. Single-color logo overlays only (preferably white).
- **Black-and-white photography** is allowed for high-contrast / minimalist contexts;
  prefer a colour overlay when adding text.
- **Patterns/textures** (Patterns A-D from the brand guide) are approved for adding
  depth to a layout; you may recolour them as long as they comply with the brand palette.
- **Imagery vibe:** cool-leaning, well-lit, modern; no overt warmth, no grain, no film
  treatments, no hand-drawn illustration.

### Animation

- **Easing:** `cubic-bezier(0.2, 0, 0, 1)` (standard) and `cubic-bezier(0.3, 0, 0.1, 1)`
  (emphasis).
- **Durations:** 120 ms fast (hover), 200 ms normal (panel open), 320 ms slow (modal /
  page-level transitions).
- **Default motion is a fade + 4-8 px translate.** No bounces; no spring physics; no
  large overshoots.
- **Loaders:** dot-pulse / horizontal progress only. The `.loader` component is the
  single instance across the system (1,960 instances in Figma).

### Interaction states

- **Hover:** darker token of the same role (`blue-500` → `blue-600`). Ghost buttons
  pick up a translucent `accent-soft` background. Links gain a 1px underline at hover.
- **Active / pressed:** one further step darker (`blue-700`). Pressed state does
  **not** scale or shrink the element.
- **Focus:** 2 px outline in `--gl-focus-ring` (blue-500 @ 40 %), 2 px offset, never
  removed.
- **Disabled:** 40 % opacity + `cursor: not-allowed`; never grey-out by changing colour
  inside the element.

### Cards

- White surface, **1 px solid `--gl-border` (gl-gray-300)**, no shadow at rest.
- Hover: `shadow-s` + border darkens to `--gl-border-strong`. No transform.
- Radius: `m` (8 px) for content cards; `l` (10 px) for dashboard cards; `xl` (16 px)
  is reserved for marketing / hero cards.

### Layout

- **App shell:** 56 px top header (`Header-V1.2`) + 193 px side menu on desktop. The
  workspace fills the rest with 24 px page padding.
- **Mobile:** the side menu collapses; the header keeps its app-switcher.
- **Fixed elements:** header, side menu, footer (when present), feedback button
  (bottom-right floating).
- **Containers:** max-width `1247 px` for documentation surfaces; product app is
  fluid to viewport.

### Transparency & blur

- Used sparingly. Modal overlays use `rgba(11,24,33,0.55)` over content (no blur).
- Floating bars (notification toasts) sit on solid surfaces, not blurred ones.
- **Avoid frosted-glass / heavy blur** — it does not appear in the source designs.

---

## Iconography

- **Brand icon bank (TransPerfect "Asset 1XXX" set)** — ~510 line icons used across
  TransPerfect marketing. Each icon ships in **white** (`assets/icons/white/`) and
  **light-blue** (`assets/icons/light-blue/`). They are simple line-only,
  rounded-square framing, 1 px minimum stroke, geometric. Use them on dark
  backgrounds (white version) or light backgrounds (light-blue version). Per the
  brand guide: *"Do not use any other variations or solid icon styles."* No icon
  font is shipped; use as inline `<img>` or `<object>`.
- **Compass UI icon set (`gl-icon/*`)** — the in-product icon family used inside
  GlobalLink apps. The Figma source references **Material Design** glyphs
  (`gl-icon/apps`, `gl-icon/warning`, `gl-icon/launch`, `gl-icon/title`,
  `gl-icon/font_download`, `gl-icon/space_bar`, `gl-icon/border_outer`,
  `gl-icon/blur_circular`, `gl-icon/highlight`, etc.). 24 px standard size.
  **For UI work we pull from Google's Material Icons — Rounded style (CDN)** — the closest
  available match to the in-product set; documented as a substitution.
- **Logos** — TransPerfect master mark, GlobalLink mark + product-specific wordmarks
  (LIVE, SUBCONNECT, etc.), Compass mark, TechOps mark, "by TransPerfect" lockup,
  and Copernicus mark. All live in `assets/logos/`. They use `fill="currentColor"`
  so you can recolour with CSS.
- **Emoji:** never in product UI. The compass glyph 🧭 appears once on the Figma
  cover page; do not propagate.
- **Unicode chars** as icons: not used.

### Substitutions (please flag to designer)

| Slot | Source spec | What we ship | Why |
|---|---|---|---|
| Compass display face | Gotham SSm (Hoefler) | **Gotham SSm Web** (Hoefler & Co., supplied by user May 2026) | Real licensed copy now installed. |
| Compass body face | Open Sans (Compass Figma) | Open Sans via Google Fonts | No OFL copy in uploads. |
| In-product icons | Material Symbols (Compass) | Material Icons Rounded via Google CDN | Compass references MD Rounded; nothing to ship locally. |
| Verdana web-fallback | system Verdana | system fallback | Standard system font. |

---

## Caveats

- Gotham SSm — real Hoefler & Co. Web fonts (woff/woff2) are now installed in `fonts/`. ✅
- Open Sans is loaded from Google Fonts, not shipped — easy to swap to the OFL OTF
  file once supplied.
- The brand icon set is delivered as **white / light-blue** PNG-style SVGs only.
  If you need a navy or dark-grey variant, recolour at use-time with CSS
  (`filter: invert()` won't work; you'll need to find/replace `currentColor` or
  drop the icon into a wrapper with the desired `color`).
- The Compass Figma file is enormous (61 pages); only the top-traffic components
  (Buttons, Header, Side menu, Inputs, Modal, Notification, Tabs, Toast, Toggles,
  Chips, Filter-chip) are recreated in the UI kit. Less-used components are
  referenced from the Figma but not yet recreated in code.

---

## Quick-start snippet

```html
<link rel="stylesheet" href="colors_and_type.css">
<body data-theme="light">
  <h1 style="font-family: var(--gl-font-display);">GlobalLink</h1>
  <p>Welcome back. <a href="#">Continue to dashboard →</a></p>
  <button style="
    background: var(--gl-accent); color: var(--gl-fg-on-brand);
    padding: 10px 16px; border-radius: var(--gl-radius-m); border: 0;
    font: 600 14px/1 var(--gl-font-body);
  ">Get started</button>
</body>
```
