import { initialize_map } from "https://cdn.jsdelivr.net/gh/natebu/jsutilities@v0.1.2/zoom_pan_canvas.js";

// allowable objects:
// polygons => {draw_type:'polygon',points:[{x:0,y:0},{x:200,y:0},{x:200,y:200}],fillStyle:'red',strokeStyle:'rgba(0,0,0,0.5)'}
// circles => {draw_type:'circle',x:0,y:0,radius:10,fillStyle:'red',strokeStyle:'rgba(0,0,0,0.5)'}

let draw_polygon = function(poly, ctx) {
  if (poly.points.length < 2) return;
  let trnsfrm = ctx.get_transform();
  if (poly.lineWidth) ctx.lineWidth = poly.lineWidth / trnsfrm.a;
  if (poly.fillStyle) ctx.fillStyle = poly.fillStyle;
  if (poly.strokeStyle) ctx.strokeStyle = poly.strokeStyle
  ctx.beginPath();
  ctx.moveTo(poly.points[0].x, poly.points[0].y);
  poly.points.forEach(p => { ctx.lineTo(p.x, p.y); })
  if (poly.fillStyle) ctx.fill();
  if (poly.strokeStyle) ctx.stroke()
}

let draw_circle = function(circ, ctx) {
  let trnsfrm = ctx.get_transform();
  if (circ.lineWidth) ctx.lineWidth = circ.width * trnsfrm.a;
  if (circ.fillStyle) ctx.fillStyle = circ.fillStyle;
  if (circ.strokeStyle) ctx.strokeStyle = circ.strokeStyle;
  ctx.beginPath();
  ctx.arc(circ.x, circ.y, circ.radius, 0, 2 * Math.PI, false);
  if (circ.fillStyle) ctx.fill();
  if (circ.strokeStyle || circ.lineWidth) ctx.stroke()
}

let draw_thing = function(thing, ctx) {
  if (typeof(thing) == "object") {
    if (thing.hasOwnProperty('draw_type')) {
      if (thing.draw_type == 'polygon') {
        draw_polygon(thing,ctx);
      } else if (thing.draw_type == 'circle') {
        draw_circle(thing,ctx);
      }
    } else {
      for (const [key, val] of Object.entries(thing)) {
        if (Array.isArray(val)) {
          val.forEach(v => draw_thing(v, ctx));
        } else {
          draw_thing(val, ctx);
        }
      }  
    }
  }
}

let draw = function(ctx, data) {
  ctx.save();
  ctx.clear_all();
  ctx.scale(1,-1);
  ctx.draw_grid();
  draw_thing(data, ctx);
  ctx.restore();
}

export function setup_generic_map(contentdiv, DATA) {
  let CANVAS = document.createElement('canvas');
  let CTX = null;
  contentdiv.appendChild(CANVAS);

  const resize = function() {
    let transform = null;
    if (CTX) {
      transform = CTX.get_transform();
    }
    CTX = initialize_map(CANVAS);
    CANVAS.width = contentdiv.offsetWidth;
    CANVAS.height = contentdiv.offsetHeight;
    CTX.SCREEN.lastX=CANVAS.width/2, CTX.SCREEN.lastY=CANVAS.height/2;
    if (transform) CTX.set_transform(transform);
    draw(CTX, DATA);
  }
  resize();
  window.onresize = resize;
  CANVAS.addEventListener('mousedown',(e) => { CTX.handleMouseDown(e) }, false);
  CANVAS.addEventListener('mousemove',(e) => { if (CTX.handleMouseMove(e)) draw(CTX,DATA);  }, false);
  CANVAS.addEventListener('mouseup',(e) => { CTX.handleMouseUp(e) }, false);
  CANVAS.addEventListener('DOMMouseScroll',(e) => { CTX.handleScroll(e); draw(CTX,DATA);    }, false);
  CANVAS.addEventListener('mousewheel',(e) => { CTX.handleScroll(e); draw(CTX,DATA);        }, false);
  return {
    'draw':() => { draw(CTX, DATA) },
    'resize':() => { resize() }
  };
}
