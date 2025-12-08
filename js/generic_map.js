import { initialize_map } from "./zoom_pan_canvas.js";
import { version } from "./version.js";

let draw_arc = function(arc, ctx) {
  let trnsfrm = ctx.get_transform();
  if (arc.stroke_width) ctx.lineWidth = arc.stroke_width / trnsfrm.a;
  if (arc.fill) ctx.fillStyle = arc.fill;
  if (arc.stroke) ctx.strokeStyle = arc.stroke
  let x0 = arc.x0 || 0;
  let y0 = arc.y0 || 0;
  let q0 = arc.q0 || 0;
  let k = arc.k || 0;
  ctx.beginPath();
  if (Math.abs(k) > 0.001) { // something happens below this limit so that it doesn't draw correctly, make it a straight line
    let dq = (k > 0) ? Math.PI/2 : -Math.PI/2;
    let r = Math.abs(1/k);
    let cx = x0 + Math.cos(q0+dq)*r;
    let cy = y0 + Math.sin(q0+dq)*r;
    ctx.arc(cx, cy, r, q0-dq, q0-dq+arc.L*k, k*arc.L < 0);
  } else if (Math.abs(k) > 1e-12) {
    ctx.moveTo(x0, y0);
    let n = 10, cq = Math.cos(q0), sq = Math.sin(q0);
    for (var ii = 1; ii <= n; ii++) {
      let q = q0 + k*ii/n*arc.L;
      ctx.lineTo(x0 + (Math.sin(q)-sq)/k, y0 + (cq-Math.cos(q))/k);
    }
  } else {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + arc.L*Math.cos(q0), y0 + arc.L*Math.sin(q0));
  }
  if (arc.fill) ctx.fill();
  if (arc.stroke) ctx.stroke();
}

let draw_image = function(img, ctx) {
  if (img.image.naturalWidth == undefined) return;
  ctx.save();
  ctx.translate(img.x, img.y);
  ctx.rotate(img.rotation);
  ctx.drawImage(img.image, 0, 0, img.w, img.h);
  ctx.restore();
}

let draw_polygon = function(poly, ctx) {
  if (poly.points.length < 2) return;
  let trnsfrm = ctx.get_transform();
  if (poly.stroke_width) ctx.lineWidth = poly.stroke_width / trnsfrm.a;
  if (poly.fill) ctx.fillStyle = poly.fill;
  if (poly.stroke) ctx.strokeStyle = poly.stroke
  ctx.beginPath();
  ctx.moveTo(poly.points[0].x, poly.points[0].y);
  poly.points.forEach(p => { ctx.lineTo(p.x, p.y); })
  if (poly.fill) ctx.fill();
  if (poly.stroke) ctx.stroke();

  if (poly.circles && poly.circles.radius && poly.circles.color) {
    ctx.fillStyle = poly.circles.color;
    let r = (poly.circles.scale_with_zoom) ? poly.circles.radius/trnsfrm.a : poly.circles.radius;
    poly.points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI, false);
      ctx.fill();
    });
  }
}

let draw_circle = function(circ, ctx) {
  let trnsfrm = ctx.get_transform();
  let radius = circ.radius;
  if (circ.scale_with_zoom) radius /= trnsfrm.a;
  if (circ.stroke_width) ctx.lineWidth = (circ.scale_with_zoom) ? circ.stroke_width/trnsfrm.a : circ.stroke_width; // * trnsfrm.a;
  if (circ.fill) ctx.fillStyle = circ.fill;
  if (circ.stroke) ctx.strokeStyle = circ.stroke;
  ctx.beginPath();
  ctx.arc(circ.x, circ.y, radius, 0, 2 * Math.PI, false);
  if (circ.fill) ctx.fill();
  if (circ.stroke || circ.stroke_width) ctx.stroke()
}

let draw_text = function(txt, ctx) {
  let font = txt.font;
  if (font && txt.scale_with_zoom) {
    let splt = txt.font.split('px');
    let px = parseInt(splt[0]);
    if (splt.length > 1 && !isNaN(px)) {
      let trnsfrm = ctx.get_transform();
      splt[0] = ''+(px/trnsfrm.a);
      font = splt.join('px');
      //console.log('font',font);
    }
  }
  if (font) ctx.font = font; //"30px Arial";
  if (txt.fill) ctx.fillStyle = txt.fill; //"red";
  if (txt.stroke) ctx.strokeStyle = txt.stroke; //"red";
  if (txt.align) ctx.textAlign = txt.align; // "center"
  ctx.scale(1,-1);
  if (txt.fill_text) ctx.fillText(txt.fill_text, txt.x, -txt.y);
  if (txt.stroke_text) ctx.strokeText(txt.stroke_text, txt.x, -txt.y);
  ctx.scale(1,-1);
}

let draw_thing = function(thing, ctx, toggleable, togname) {
  try {
    if (thing && typeof(thing) == "object") {
      if (thing.draw_toggle) {
        let current = Boolean(thing._draw_toggle_off_);
        thing._draw_toggle_off_ = (thing.draw_toggle == togname) ? !current : current;
        let cls = (thing._draw_toggle_off_) ? 'btn-light' : 'btn-dark';
        let but = `<button class="btn btn-sm ${cls} form-control mt-1">${thing.draw_toggle}</button>`;
        toggleable.insertAdjacentHTML('beforeend',but)
      }
      if (thing._draw_toggle_off_) return;
      if (thing.hasOwnProperty('draw_type')) {
        if (thing.draw_type == 'polygon') {
          draw_polygon(thing,ctx);
        } else if (thing.draw_type == 'none') {
        } else if (thing.draw_type == 'arc') {
          draw_arc(thing,ctx);
        } else if (thing.draw_type == 'circle') {
          draw_circle(thing,ctx);
        } else if (thing.draw_type == 'text') {
          draw_text(thing,ctx);
        } else if (thing.draw_type == 'image') {
          draw_image(thing,ctx);
        } else if (ctx.RenderFuncs && ctx.RenderFuncs.hasOwnProperty(thing.draw_type)) {
          ctx.RenderFuncs[thing.draw_type](thing,ctx);
        }
      } else {
        for (const [key, val] of Object.entries(thing)) {
          if (Array.isArray(val)) {
            val.forEach(v => draw_thing(v, ctx, toggleable, togname));
          } else {
            draw_thing(val, ctx, toggleable, togname);
          }
        }  
      }
    }
  } catch(err) {
    console.error(err);
  }
}

let draw = function(ctx, data, togname) {
  ctx.save();
  ctx.clear_all();
  ctx.scale(1,-1);
  ctx.draw_grid();
  ctx.draw_mouse();
  let toggleable = ctx.canvas.parentElement.querySelector('div.toggleable');
  while (toggleable.firstChild) toggleable.removeChild(toggleable.lastChild);
  draw_thing(data, ctx, toggleable, togname);
  ctx.restore();
}

let center_map = function(ctx, xc, yc) { // x, y, map coordinates of center and desired width/height
  let t = ctx.get_transform();
  let w = ctx.canvas.width;
  let h = ctx.canvas.height;
  t.e = w/2 - xc*t.a;
  t.f = yc*t.a + h/2;
  ctx.set_transform(t);
}

let center_map_with_dimensions = function(ctx, xc, yc, width,height) { // x, y, map coordinates of center and desired width/height
  let t = ctx.get_transform();
  let w = ctx.canvas.width;
  let h = ctx.canvas.height;
  let scl = (height == 0 || width == 1) ? 1 : Math.min(h/height, w/width);
  t.a = scl;
  t.d = scl;
  t.e = w/2 - xc*scl;
  t.f = yc*scl + h/2;
  ctx.set_transform(t);
}

export function setup_generic_map(contentdiv, DATA, RenderFuncs) {
  let CANVAS = document.createElement('canvas');
  let CTX = null;
  if (!DATA.hasOwnProperty('measuring_tool')) {
    DATA.measuring_tool = {
      draw_toggle:'Measuring Tool',
      _draw_toggle_off_:true,
      points:{draw_type:'polygon',points:[{x:0,y:0},{x:0,y:0}],stroke_width:3,stroke:'black'},
      text:{draw_type:'text',font:'20px Arial',scale_with_zoom:true,fill_text:'',x:0,y:0,fill:'black'}
    }
  }

  contentdiv.appendChild(CANVAS);
  contentdiv.insertAdjacentHTML('beforeend',`
  <div class="toggleable form-group" style="position: absolute; bottom:30px; right:10px; width:200px; max-height:calc(100% - 50px);overflow-y:auto">
  </div>`);
  let TOGGLEABLE = contentdiv.querySelector('div.toggleable');

  const resize = function() {
    let transform = null;
    if (CTX) {
      transform = CTX.get_transform();
    }
    CTX = initialize_map(CANVAS);
    if (RenderFuncs) CTX.RenderFuncs = RenderFuncs;
    CANVAS.width = contentdiv.offsetWidth;
    CANVAS.height = contentdiv.offsetHeight;
    // console.log('w','h',CANVAS.width, CANVAS.height)
    CTX.SCREEN.lastX=CANVAS.width/2, CTX.SCREEN.lastY=CANVAS.height/2;
    if (transform) CTX.set_transform(transform);
    draw(CTX, DATA, null);
  }
  resize();
  window.onresize = resize;
  TOGGLEABLE.addEventListener('click',(e) => {
    let tog = e.target.closest('button');
    if (tog && tog.innerText) draw(CTX, DATA, tog.innerText);
  })
  CANVAS.addEventListener('mousedown',(e) => { 
    if (DATA.disable_map_events) {
      return
    } else if (e.buttons == 1 && e.shiftKey && DATA.measuring_tool && !DATA.measuring_tool._draw_toggle_off_) {
      let p = CTX.eventToPosition(e); p.y = -p.y;
      DATA.measuring_tool.active = true;
      DATA.measuring_tool.points.points[0] = p;
      DATA.measuring_tool.points.points[1] = p;
    }
    CTX.handleMouseDown(e) 
  }, false);
  CANVAS.addEventListener('mousemove',(e) => { 
    if (DATA.disable_map_events) {
      return;
    } else if (e.buttons == 1 && e.shiftKey && DATA.measuring_tool && DATA.measuring_tool.active && !DATA.measuring_tool._draw_toggle_off_) {
      DATA.measuring_tool.points.points[1] = CTX.eventToPosition(e);
      DATA.measuring_tool.points.points[1].y = -DATA.measuring_tool.points.points[1].y;
      let p = DATA.measuring_tool.points.points;
      let a = Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
      let d = Math.hypot(p[1].y-p[0].y,p[1].x-p[0].x);
      DATA.measuring_tool.text.x = p[1].x;
      DATA.measuring_tool.text.y = p[1].y;
      DATA.measuring_tool.text.align = (Math.abs(a)>Math.PI/2) ? 'right' : 'left';
      DATA.measuring_tool.text.fill_text = d.toFixed(3);
      draw(CTX, DATA, null);
    } else if (CTX.handleMouseMove(e)) {
      draw(CTX, DATA, null);
    } else {
      CTX.draw_mouse();
    }
  }, false);
  CANVAS.addEventListener('mouseup',(e) => { 
    // if (DATA.disable_map_events) return;
    if (DATA.measuring_tool && !DATA.measuring_tool._draw_toggle_off_ && DATA.measuring_tool.active) {
      DATA.measuring_tool.active = false;
      draw(CTX, DATA, null);
    }
    CTX.handleMouseUp(e) 
  }, false);
  CANVAS.addEventListener('wheel',(e) => { 
    if (DATA.disable_map_events) return;
    CTX.handleScroll(e); draw(CTX,DATA, null);    
  }, {passive:false});
  CANVAS.addEventListener('mousewheel',(e) => { 
    if (DATA.disable_map_events) return;
    CTX.handleScroll(e); draw(CTX,DATA, null);        
  }, {passive:false});
  return {
    draw:() => { draw(CTX, DATA, null) },
    resize:() => { resize() },
    eventToPosition:(e) => { 
      let P = CTX.eventToPosition(e);
      P.y = -P.y; // because of the -1 scale applied above
      return P;
    },
    centerMap:(x,y) => { center_map(CTX,x,y); },
    centerMapWithDimensions:(x,y,width,height) => { center_map_with_dimensions(CTX,x,y,width,height); },
    positionToScreen:(x,y) => {
      return CTX.positionToScreen(x,-y);
    },
    CANVAS:CANVAS,
    CTX:CTX,
    export:(fname) => {
      let html = `<html><head><meta content="text/html;charset=utf-8" http-equiv="Content-Type">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
<style>.full {position:absolute;top:0px;left:0px;width:100%; height:100%;overflow:none}</style></head>
<body class="full"><div id="map" class="full"></div>
<script type="module">import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/vyjs@v${version}/js/generic_map.js";
let DRAW_EXT = ${JSON.stringify(RenderFuncs, (k, v) => { return (typeof v === "function") ? v.toString() : v;}, 2)};
for (const key in DRAW_EXT) {
  if (typeof DRAW_EXT[key] === "string" && DRAW_EXT[key].startsWith("function")) {
    DRAW_EXT[key] = eval(\`(\$\{DRAW_EXT[key]})\`);
  }
}
let DRAW_DATA = ${JSON.stringify(DATA,null,1)};
let MAPFUNCS = setup_generic_map(document.querySelector('#map'), DRAW_DATA, DRAW_EXT);
</script>
</body></html>`;
      if (fname) {
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        let url = URL.createObjectURL(blob);
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);  
        URL.revokeObjectURL(url);
      } else {
        return html;
      }
    }
  };
}
