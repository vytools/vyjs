# vyjs
A group of javascript modules to make creating user interfaces simpler
You can use jsdelivr.net to get the latest modules. For example the module generic_map.js can be accessed in your javascript with

import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/vyjs@v5.0.3/js/generic_map.js";

## Live, editable examples

`test/main.html` is a gallery of every example below, live and editable: pick one from the list on the left, its source shows in the middle panel, and it runs in the panel on the right -- edit the code and it re-runs automatically. Run it locally with:

```
cd test && docker compose up
# or: python3 testserver.py --port 8080
```

then open the server root in a browser (it routes `/` to `main.html`).

## generic_map.js

generic_map.js uses zoom_pan_canvas.js to create a two dimensional grid and render objects defined in a DRAW_DATA object. These objects can be one of several types including "polygon", "circle", "text", "image", "arc", "spline", or "animation". The DRAW_DATA object does not have a specific format requirement. The object is searched recursively for sub-objects that have a "draw_type" field that matches one of the types listed above.

Custom draw_types can also be defined and registered via the `DRAW_EXT` argument to `setup_generic_map`, and the visibility of sub-objects can be toggled on/off via a `draw_toggle` key.

See the "Polygons", "Circles", "Text", "Image", "Arc", "Spline", "Toggle groups", "Custom draw types", "Interactive arc path", "Animation - *", and "Definition form" examples in `test/main.html` for working code covering all of this.

## flex.js and flex.css

Tools for resizable divs, use the \<flex\>, \<flexitem\> and \<flexresizer\> tags along with the "display:flex" style properties. `test/main.html` itself is built with flex.js -- its three-panel resizable layout is a live example.

## mousefollower.js

In progress...

## plotly-X.XX.min.js

Copy of plotly js

## definition_form.js definition_form.css

In progress...
