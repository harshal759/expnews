# Adobe EDS (Edge Delivery Services) – Agent Instructions

## Project Overview

This is an **AEM Edge Delivery Services (EDS) / Helix** reference demo project. Content is authored in AEM Author and delivered via EDS. The project targets migration of DSN Public projects to EDS.

- **Preview**: http://main--refdemoeds--aemxsc.aem.page/
- **Live**: http://main--refdemoeds--aemxsc.aem.live/
- **AEM Author** (content mount): See [fstab.yaml](fstab.yaml)

## Key Commands

```bash
npm run lint          # Run all linting (JS + CSS) — run before committing
npm run lint:js       # ESLint on .js/.json/.mjs files
npm run lint:css      # Stylelint on blocks/**/*.css and styles/*.css
npm run build:json    # Merge component model JSON files from models/ → root
```

> No test command exists. Linting is the main automated check.  
> JSON model files (`component-models.json`, `component-definition.json`, `component-filters.json`) are **generated** — edit sources in `models/` then run `build:json`.

## Architecture

### Block Structure

Every UI feature is a **block** in `blocks/<block-name>/`:

| File | Purpose |
|------|---------|
| `block-name.js` | Required. Must export a default `decorate(block)` function |
| `block-name.css` | Block styles |
| `_block-name.json` | Optional. AEM Universal Editor model definition |

**Block entry point pattern:**
```js
export default function decorate(block) {
  // block is the DOM element with class "block-name"
  // Read config from child divs or readBlockConfig()
}
```

### Core Scripts

| File | Role |
|------|------|
| [`scripts/aem.js`](scripts/aem.js) | Adobe Helix framework — `loadHeader`, `loadFooter`, `decorateBlocks`, `createOptimizedPicture`, `fetchPlaceholders`, `getMetadata`, `readBlockConfig`, etc. |
| [`scripts/scripts.js`](scripts/scripts.js) | Project initialization, `isAuthorEnvironment()`, `moveInstrumentation()`, `decorateButtons()` |
| [`scripts/utils.js`](scripts/utils.js) | `getSiteName()`, `getHostname()`, `getLanguage()`, `formatDate()`, `PATH_PREFIX`, `SUPPORTED_LANGUAGES` |
| [`scripts/dom-helpers.js`](scripts/dom-helpers.js) | `domEl(tag, ...items)` + named element helpers (`div`, `a`, `p`, `span`, `img`, etc.) |
| [`scripts/datalayer.js`](scripts/datalayer.js) | Adobe Experience Platform data layer — auto-imported in scripts.js |
| [`scripts/delayed.js`](scripts/delayed.js) | Late-loading scripts (analytics, third-party) |

### Styles

- [`styles/styles.css`](styles/styles.css) — Global styles + CSS custom properties for theming
- [`styles/lazy-styles.css`](styles/lazy-styles.css) — Loaded after LCP
- [`styles/industry-specific/`](styles/industry-specific/) — Per-tenant themes (luma, citi-signal, frescopa, carvelo, wehealthcare, fly, securbank, binji, halliby)

Theme is selected via page metadata `theme` property or Content Fragment reference.

### Localization

- Content lives under `/language-masters/<lang>/` paths
- `PATH_PREFIX = '/language-masters'` (from `utils.js`)
- Supported languages defined in `SUPPORTED_LANGUAGES` array in [`scripts/utils.js`](scripts/utils.js)
- Use `getLanguage()` to resolve the current language

### Component Models (Universal Editor)

- Source files: `models/_component-models.json`, `models/_component-definition.json`, `models/_component-filters.json`
- Per-block model files: `blocks/<name>/_<name>.json`
- Generated outputs at root: `component-models.json`, `component-definition.json`, `component-filters.json`
- **Always edit source files in `models/` or block `_*.json` files, not the generated root files**

## Common Patterns

### Reading block config (author-aware)
```js
import { readBlockConfig } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';

// Reads key-value rows in the block as config
const config = readBlockConfig(block) || {};
// Or read by data-aue-prop (Universal Editor) with fallback to row index
const val = block.querySelector('[data-aue-prop="myprop"]')?.textContent?.trim()
  ?? block.querySelector(':scope > div:nth-child(2) > div')?.textContent?.trim();
```

### DOM construction
```js
import { div, a, p, span, img } from '../../scripts/dom-helpers.js';

const card = div({ class: 'card' },
  a({ href: item.path }, img({ src: item.image, alt: item.title })),
  p(item.title),
);
```

### Fetching placeholders (config values)
```js
import { fetchPlaceholders } from '../../scripts/aem.js';
const placeholders = await fetchPlaceholders();
const siteName = placeholders?.siteName;
```

### Author vs. Publish environment
```js
import { isAuthorEnvironment } from '../../scripts/scripts.js';
if (isAuthorEnvironment()) { /* AEM Author-specific behavior */ }
```

## Pitfalls

- **Do not edit generated JSON** at root (`component-models.json` etc.) — always edit `models/` sources and run `build:json`.
- **`getSiteName()` and `getHostname()` are async** — always `await` them.
- **Top-level `await`** is used in some block files (e.g., `header.js`) — this is intentional for ES module blocks.
- **`moveInstrumentation()`** must be called when restructuring block DOM to preserve Universal Editor instrumentation attributes.
- **Placeholders.json** drives runtime config (siteName, hostname, launch script URL, etc.) — changes need AEM Author publish.
- CSS variables for theming use `--brand-*` prefix and are defined per industry theme in `styles/industry-specific/`.
