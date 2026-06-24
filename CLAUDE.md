# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development / Testing
Run a local test server (serves `test/main.html` at root):
```bash
# Using Docker Compose (recommended)
cd test && docker compose up

# Or directly with Python
python3 test/testserver.py --port 8080
```
The server serves the repo root at `http://localhost:80` (or specified port), routing `/` to `test/main.html`.

### Building the esbuild Docker image
```bash
./esbuild.sh          # build and optionally push to Docker Hub
./esbuild.sh -n       # build only, skip push prompt
```

### Bundling HTML files
The Docker image (`vytools/esbuild:latest`) runs `bundle-html.mjs` to produce standalone single-file HTML:
```bash
# Bundle an HTML file — inlines local scripts (src= or inline) and CSS
node esbuild/bundle-html.mjs input.vyt.html output.html

# Skip minification
node esbuild/bundle-html.mjs input.vyt.html output.html --no-minify

# Bundle CDN deps inline (fetches and inlines three.js etc.)
node esbuild/bundle-html.mjs input.vyt.html output.html --bundle-cdn
```

The modules are also published to jsDelivr via GitHub releases. Consumers import them as:
```js
import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/vyjs@v4.0.11/js/generic_map.js";
```

## Architecture

This repo is a collection of standalone ES module JavaScript files in `js/` — no bundler or build step is required for development. Files are consumed directly via `<script type="module">` or imported with `import`.

### Core modules

- **`js/zoom_pan_canvas.js`** — Low-level canvas with zoom/pan support. `initialize_map(div)` returns a canvas context with a custom `get_transform()` method that callers use to compute zoom-invariant sizes.

- **`js/generic_map.js`** — Builds on `zoom_pan_canvas.js`. `setup_generic_map(div, DRAW_DATA, DRAW_EXT)` takes a `DRAW_DATA` object/array and recursively searches it for items with a `draw_type` field. Built-in types: `polygon`, `circle`, `text`, `image`, `arc`, `animation`. Custom types can be registered via `DRAW_EXT = { my_type: function(obj, ctx) {...} }`. Objects with `draw_toggle` keys create toggle groups. Returns `{resize}`.

  **`draw_type: 'animation'`** — Animates child `items` along a path using a global independent variable read from `DRAW_DATA.__independent_variable__`. The animation object fields:
  - `arc_path` — array of arc objects (`{x0,y0,q0,k,L}`). Each arc's "duration" is `|L|` unless the arc has a `dt` field. Position/heading interpolated via `ARCS.arc_state`.
  - `states` — alternative to `arc_path`: array of `{x,y,q,t}` waypoints; interpolated linearly (heading via `pimod` for wrap-around).
  - `independent_variable_scale` — multiplier applied to `__independent_variable__` before indexing into the path (useful to map a normalized time to a distance).
  - `draw_path` — if present, its properties (e.g. `{stroke, stroke_width}`) are merged with each arc and drawn as background path lines.
  - `items` — any draw object(s) rendered in the local frame (origin = current position, x-axis = current heading).

  The canvas `ctx` is saved, translated to position, rotated to heading, `items` drawn, then restored. Works correctly with the global `scale(1,-1)` — `ctx.rotate(q)` produces world-space heading `q`.

- **`js/arcs.js`** — Arc math utilities used by `generic_map.js`. `arcs_state(arcs, distance)` supports negative-`L` arcs (reverse direction) — it passes `distance` or `-distance` to `arc_state` based on the sign of `arc.L`.

- **`js/playback.js`** — `setup_playback(parentNode, callback)` injects a Bootstrap-styled play/pause/seek control bar into `parentNode`. Calls `callback(currenttime)` during playback.

- **`js/flex.js` + `css/flex.css`** — Custom `<flex>`, `<flexitem>`, `<flexresizer>` elements for resizable split panes. Used with `style="display:flex"`.

- **`js/definition_form.js` + `css/definition_form.css`** — Dynamic form UI for editing structured config objects (in progress).

- **`js/geo.js`**, **`js/rng.js`**, **`js/mousefollower.js`** — Utility modules (geo math, RNG, mouse-following UI).

- **`js/plotly-3.0.1.min.js`** — Vendored Plotly.js copy.

### vydisp — the display shell

`esbuild/vydisp.html` + `esbuild/vydisp.js` form a reusable host for simulations. `vydisp.html` provides a fixed layout (toolbar with play/pause/follow/restart, sidebar with params panel and alerts). `vydisp.js` exports `setup(VYD)` which wires the toolbar, map, and definition form. The `VYD` object passed in must have:
- `DRAWDATA`, `DRAWEXT` — draw data and custom drawers
- `defobj` — definition form config object
- `step()` — called on each simulation tick; returns false when done
- `restart()` — resets simulation state
- `set_vyrslts(vyrslts)` — loads result data

`vydisp.js` receives data from a parent frame via `window.postMessage` with topic `tool_data`. Sends to parent: `request_tool_data` on init, `save` (online config save), `save_vycnfig` (VS Code config save), `download_tool_data` (item download).

### Bundling pipeline

`esbuild/bundle-html.mjs` uses esbuild to inline `<script type="module">` tags into the HTML and produce a standalone single-file output. It handles two script forms:
- **`src=` scripts** (`<script type="module" src="...">`) — runs esbuild with the file as entry point.
- **Inline scripts** (`<script type="module">...code...</script>`) — runs esbuild via `stdin` with `resolveDir` set to the HTML file's directory so relative imports resolve correctly.

It also inlines local `<link rel="stylesheet">` tags. Remote URLs (http/https) are left untouched. An `importmap` in the HTML is respected for resolving bare specifiers (bare CDN specifiers are marked external unless `--bundle-cdn` is passed). PNG/JPG images referenced in bundled JS are base64-inlined automatically.

**`.vyt.html` format** — challenges use self-contained HTML files with an empty `<head>` and all JS content inline in a single `<script type="module">` block. The bundler processes these via the stdin path above, resolving all relative imports from the file's directory.

The Dockerfile copies `js/`, `css/`, and the esbuild scripts into a Node 20 Alpine image — the image is the deployment artifact for running the bundler.
