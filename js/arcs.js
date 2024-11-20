const SMALL_ANGLE = 0.001;
export const VERY_SMALL_CURVATURE = 1e-6;
const SMALL = 1e-9;
export const EPSILON = 1e-12;

export function pimod(q) {
  let qm = q % (Math.PI*2);
  if (qm >  Math.PI) qm -= 2*Math.PI;
  if (qm < -Math.PI) qm += 2*Math.PI;
  return qm;
}

export function arc_length(arc) {
  return Math.abs(arc.L);
}

export function arcs_length(arcs) {
  let l = 0;
  arcs.forEach(a => l+=arc_length(a));
  return l;
}

export function arc_state(arc, L) {
    let cq0 = Math.cos(arc.q0);
    let sq0 = Math.sin(arc.q0);
    let x = 0, y = 0;
    if (Math.abs(arc.k) < VERY_SMALL_CURVATURE) {
        x = arc.x0 + cq0*L;
        y = arc.y0 + sq0*L;
    } else if (Math.abs(arc.k * L) < SMALL_ANGLE) {
        let segment_scalar = arc.k * L / 2;
        x = arc.x0 + (cq0 - segment_scalar*sq0)*L;
        y = arc.y0 + (sq0 + segment_scalar * cq0)*L;
    } else {
        x = arc.x0 + (Math.sin(arc.q0 + arc.k*L) - sq0)/arc.k;
        y = arc.y0 + (cq0 - Math.cos(arc.q0 + arc.k * L))/arc.k;
    }
    return {x,y,q:arc.q0 + arc.k*L,k:arc.k};
}

let cmult = function(c,m) { return {r:c.r*m, i:c.i*m}; };
const cdivd = function(c1,c2) { // c1/c2
  let det = c2.r*c2.r + c2.i*c2.i;
  return {r:(c1.r*c2.r + c1.i*c2.i)/det, i:(c1.i*c2.r - c1.r*c2.i)/det} // = c1/c2;
}

export function three_point_arc(p1, p2, p3) {
  // fit a pair of arcs to p1, p2, p3. 
  // arcs will have the same radius (i.e. it's really one arc split into two sections)
  let d31 = {x:p3.x-p1.x,y:p3.y-p1.y},        d21 = {x:p2.x-p1.x,y:p2.y-p1.y};
  let l31 = Math.hypot(d31.x,d31.y),          l21 = Math.hypot(d21.x,d21.y);
  if (l31==0 && l21 == 0) { // all identical points
      return {x0:0, y0:0, q0:0, k:0, L:0};
  } else if (l31 == 0) {
      return {x0:p1.x, y0:p1.y, q0:Math.atan2(d21.y, d21.x), k:0, L:l21};
  } else if (l21 == 0) {
      return {x0:p1.x, y0:p1.y, q0:Math.atan2(d31.y, d31.x), k:0, L:l31};
  }
  let z31 = {r:d31.x, i:d31.y};
  let z21 = {r:d21.x, i:d21.y};
  let w = cdivd(z31,z21);
  if (Math.abs(w.i) <= 1e-12) { // Colinear TODO Magic number
      let q = Math.atan2(d31.y, d31.x), l = Math.max(l31,l21);
      // For colinear points p1 is always first but p2 and p3 may be reordered
      return {x0:p1.x, y0:p1.y, q0:q, k:0, L:l};
  } else {
    let z1  = {r:p1.x,  i:p1.y},  m = {r:0, i:2};
    let c = cdivd({r:w.r - w.r*w.r - w.i*w.i, i:w.i},cmult(m,w.i));
    c = {r:z21.r*c.r-z21.i*c.i, i:z21.r*c.i + z21.i*c.r} //cmult(z21,c);
    let cp = {x:c.r+z1.r, y:c.i+z1.i};
    let ray1 = {x:p1.x - cp.x, y:p1.y - cp.y};
    let k = ((d21.x*d31.y > d21.y*d31.x) ? 1 : -1)/Math.hypot(ray1.x, ray1.y);
    let q = Math.atan2(ray1.y, ray1.x);
    let dp2cp = {x:p2.x-cp.x, y:p2.y-cp.y};
    let dq2 = pimod(Math.atan2(dp2cp.y, dp2cp.x)-q);
    if (dq2*k < 0 && k<0)        { dq2 -= 2*Math.PI; }
    else if (dq2*k < 0 && k>0)   { dq2 += 2*Math.PI; }
    let dp3cp = {x:p3.x-cp.x, y:p3.y-cp.y};
    let dq3 = pimod(Math.atan2(dp3cp.y, dp3cp.x)-(q+dq2));
    if (dq3*k < 0 && k<0)        { dq3 -= 2*Math.PI; }
    else if (dq3*k < 0 && k>0)   { dq3 += 2*Math.PI; }
    q += (k>0) ? Math.PI/2 : -Math.PI/2;
    return {x0:p1.x, y0:p1.y, q0:q, k:k, L:Math.abs(dq2/k)+Math.abs(dq3/k)};
  }
}

export function arc_from_states(xyq0, xyq1) {
  let dy = xyq1.y-xyq0.y, dx = xyq1.x-xyq0.x;
  let chord = Math.hypot(dx, dy);
  if (chord < EPSILON) { // TODO Should get rid of one of these points.
    return {x0:xyq0.x, y0:xyq0.y, q0:xyq0.q, k:0, L:chord};
  } else {
    let theta0 = pimod(Math.atan2(dy, dx) - xyq0.q);
    let theta = theta0;
    if (Math.abs(theta0) > Math.PI/2) { // Big arc
      theta = -pimod(Math.atan2(-dy, -dx) - xyq0.q);
    }
    let k = 2*Math.sin(theta)/chord;
    let L = (Math.abs(k) < VERY_SMALL_CURVATURE) ? chord : theta0*2/k;
    return {x0:xyq0.x, y0:xyq0.y, q0:xyq0.q, k, L};
  }
}

const sgn = function(x) {  return (x == 0) ? 0 : ((x > 0) ? 1 : -1);  }
const nrm = function(a) { return Math.hypot(a.x, a.y); }
const subv = function(a,b) { return {x:a.x-b.x, y:a.y-b.y}; }
const addv = function(a,b) { return {x:a.x+b.x, y:a.y+b.y}; }
const dot = function(a,b) { return a.x*b.x + a.y*b.y; }
const crs = function(a,b) { return a.x*b.y - a.y*b.x; }
const mltv = function(a,b) { return {x:a.x*b, y:a.y*b}; }
export function biarc(xyq0, xyq1) {
    let arcs = [];
    let t1 = {x:Math.cos(xyq0.q), y:Math.sin(xyq0.q)};
    let t2 = {x:Math.cos(xyq1.q), y:Math.sin(xyq1.q)};
    let v = subv(xyq1, xyq0);
    let L = nrm(v);
    if (L <= SMALL) {
        return [];
    }
    let t = addv(t1,t2);
    let denom1 = 2*(1 - dot(t1,t2));
    if (Math.abs(denom1) < SMALL && Math.abs(4*dot(v, t2)) < SMALL) {
        let pm = addv(xyq0 , mltv(v,0.5));
        let r = L/4;
        let l = Math.PI*r
        let k = (crs(v,t1) < 0) ? -1/r : 1/r;
        return [
          {x0:xyq0.x, y0:xyq0.y, q0:xyq0.q, k:k, L:l},
          {x0:pm.x, y0:pm.y, q0:xyq0.q+k*l, k:-k, L:l},
        ];
    } else {
      let d1 = 0;
      let pm = {x:0, y:0};
      if (Math.abs(denom1) < SMALL) {
        const d1denoma = 4*dot(v, t2);
        d1 = dot(v, v)/d1denoma;
      } else {
        const vdott = dot(v, t);
        const d1numerb = 2*(1-dot(t1, t2));
        const d1numera = vdott*vdott + d1numerb*dot(v,v);
        d1 = (-vdott + Math.sqrt(d1numera))/denom1;
      }
      let q1 = addv(xyq0,mltv(t1,d1));
      let denom = dot(v, t2)-d1*(dot(t1,t2)-1);
      if (Math.abs(denom) < SMALL) {
        pm = q1+t2*dot(t2, subv(xyq1, q1));
      } else {
        let d2 = (0.5*dot(v,v)-d1*dot(v,t1)) / denom;
        let q2 = subv(xyq1, mltv(t2,d2));
        pm = mltv(addv(mltv(q1,d2),mltv(q2,d1)), 1/(d1+d2));
      }
      let a1 = arc_from_states(xyq0, pm);
      pm.q = xyq0.q + a1.k*a1.L;
      return [a1, arc_from_states(pm, xyq1)];
    }
  }

const add_arc = function(arc, lineWidth, color) {
  arc.draw_type = 'arc';
  arc.lineWidth = lineWidth;
  arc.strokeStyle = color;
  return arc;
}

export class ArcPath {
  constructor(is_closed_loop) {
    this.is_closed_loop = is_closed_loop;
    this.arc_color = 'gray';
    this.arc_width = 1;
    this.nodes = [];
    this.down_loc = null;
  }

  set(xyq) {
    this.nodes.length = 0;
    for (var ii = 0; ii < xyq.length; ii++) {
      let xyq0 = xyq[ii];
      let xyq1 = xyq[(ii + 1) % xyq.length];
      let node = {xyq:xyq0, arcs:[], 
        handle:{draw_type:'circle', x:xyq0.x, y:xyq0.y, radius:8, scaleSizeToScreen:true, fillStyle:this.arc_color}
      };
      if (ii +1 < xyq.length || this.is_closed_loop) {
        biarc(xyq0, xyq1).forEach(arc => {
          node.arcs.push(add_arc(arc, this.arc_width, this.arc_color)) 
        })
      }
      this.nodes.push(node);
    }
  }
  
  states() {
    return this.nodes.map(node => node.xyq);
  }

  arcs() {
    let a = [];
    for (const n of this.nodes) {
      for (const a_ of n.arcs) a.push(a_);
    }
    return JSON.parse(JSON.stringify(a));
  }

  drawing() {
    return this.nodes;
  }
}

const screendist = function(MAPFUNCS,obj1,obj2) {
  let o1 = MAPFUNCS.positionToScreen(obj1.x, obj1.y);
  let o2 = MAPFUNCS.positionToScreen(obj2.x, obj2.y);
  return Math.hypot(o1.x-o2.x, o1.y-o2.y);
}

export function mouse_up(MAPFUNCS, arcpath, e) {
  if (!arcpath) return;
  if (arcpath.down_loc && arcpath.down_loc.P && arcpath.down_loc.insert) {
    let P = MAPFUNCS.eventToPosition(e);
    let q = Math.atan2(P.y-arcpath.down_loc.P.y,P.x-arcpath.down_loc.P.x);
    let xyq = arcpath.states();
    xyq.push({x:arcpath.down_loc.P.x, y:arcpath.down_loc.P.y, q});
    arcpath.set(xyq);
  }
  let upd = Boolean(arcpath.down_loc);
  arcpath.down_loc = false;
  return upd;
}

export function mouse_move(MAPFUNCS, arcpath, e) {
  if (!arcpath) return;
  if (arcpath.down_loc) {
    if (arcpath.down_loc.insert) return;
    let P = MAPFUNCS.eventToPosition(e);
    let ii = arcpath.down_loc.node_index;
    if (ii < arcpath.nodes.length && ii >= 0) {
      if (arcpath.down_loc.P) {
        arcpath.nodes[ii].xyq.q = Math.atan2(P.y - arcpath.down_loc.P.y, P.x - arcpath.down_loc.P.x)
      } else {
        arcpath.nodes[ii].xyq.x = P.x;
        arcpath.nodes[ii].xyq.y = P.y;
      }
      arcpath.set(arcpath.states());
      return true;
    }
  }
}

export function mouse_down(MAPFUNCS, arcpath, e) { 
  if (!arcpath) return;
  let P = MAPFUNCS.eventToPosition(e);
  let insdel = e.buttons == 1 && e.detail == 2;
  for (let ii = 0; ii < arcpath.nodes.length; ii++) {
    let N = arcpath.nodes[ii];
    if (screendist(MAPFUNCS, {x:N.xyq.x, y:N.xyq.y}, P) <= N.handle.radius) {
      if (insdel) { // Delete
        arcpath.nodes.splice(ii, 1);
        arcpath.set(arcpath.states());
        return true;
      } else if (e.ctrlKey) {  // Move heading
        arcpath.down_loc = {node_index:ii, P};
        return true;
      } else if (e.shiftKey) {  // Move 
        arcpath.down_loc = {node_index:ii};
        return true;
      }
    }
  }
  if (insdel) {
    for (let ii = 0; ii < arcpath.nodes.length; ii++) {
      for (let arc of arcpath.nodes[ii].arcs) {
        let prcnt = percent_along_arc(arc, P.x, P.y);
        if (prcnt < 1 && prcnt > 0) {
          let s = arc_state(arc, prcnt*Math.abs(arc.L));
          if (screendist(MAPFUNCS,P,s) < arcpath.nodes[ii].handle.radius) {
            let states = arcpath.states();
            states.splice(ii+1, 0, s);
            arcpath.set(states);
            return true;
          }
        }
      }
    }
    arcpath.down_loc = {P, insert:true};
    return true;
  }
}

export function arcs_state(arcs, distance) {
    for (var ii = 0; ii < arcs.length; ii++) {
        if ( distance < arc_length(arcs[ii]) ) {
            return arc_state(arcs[ii], distance);
        }
        distance -= arc_length(arcs[ii]);
    }
    if (arcs.length > 0) {
        let arc = arcs[arcs.length-1];
        return arc_state(arc, distance + arc_length(arc));
    }
    return null
}

export function arc_center(arc) {
  return {x:arc.x0 - Math.sin(arc.q0)/arc.k, y:arc.y0 + Math.cos(arc.q0)/arc.k};
} 

export function draw_arcs(arcs, offset, lineWidth, strokeStyle) {
  return arcs.map(a => {
    let x0 = a.x0 - offset*Math.sin(a.q0)
    let y0 = a.y0 + offset*Math.cos(a.q0)
    let k = (Math.abs(a.k) < 1e-6) ? 0 : (1/((1/a.k)-offset))
    let L = (k==0) ? a.L : (a.k*a.L)/k;
    return {draw_type:'arc', x0, y0, q0:a.q0, k, L, lineWidth, strokeStyle}
  });
}

export function make_arc_path(x, y, q, kLlist) {
    let p = {x,y,q,k:0};
    return kLlist.filter(kl => Math.abs(kl.length) > EPSILON).map(kl => {
      let arc = {x0:p.x, y0:p.y, q0:p.q, k:kl.curvature, L:kl.length};
      p = arc_state(arc, Math.abs(kl.length));
      return arc;
    });
}

const percent_along_lineseg = function(x0, y0, x1, y1, x, y) {
    let dpx = x1 - x0;
    let dpy = y1 - y0;
    let distance_squared = dpx*dpx + dpy*dpy;
    // If segment is too short to check return a value (2) outside range 0-1
    return (distance_squared == 0) ? 2 : ((x - x0)*dpx + (y - y0)*dpy)/distance_squared;
}

export function percent_along_arc(arc, x, y) {
  let final_state = arc_state(arc, arc_length(arc));
  if (Math.abs(arc.k) < VERY_SMALL_CURVATURE) {
    return percent_along_lineseg(arc.x0, arc.y0, final_state.x, final_state.y, x, y);
  }
  let center = arc_center(arc);
  let arc_center_x_to_test_x = x - center.x;
  let arc_center_y_to_test_y = y - center.y;
  let arc_delta_heading = arc.k*arc.L;
  if (Math.abs(arc_delta_heading) <= EPSILON) {
    return 2; // arc is too short to check, just return a value outside the range 0 - 1
  }
  let angle_from_arc_center_to_test_point = Math.atan2(arc_center_y_to_test_y, arc_center_x_to_test_x);
  let angle_from_arc_center_to_arc_midpoint = arc.q0 + arc_delta_heading/2 + 
      ((arc.k > 0) ? -Math.PI/2 : Math.PI/2);
  angle_from_arc_center_to_arc_midpoint = pimod(angle_from_arc_center_to_arc_midpoint);
  let delta_angle = angle_from_arc_center_to_test_point - angle_from_arc_center_to_arc_midpoint;
  let qdistc = pimod(delta_angle) / arc_delta_heading;
  let qdistc_opposite = pimod(delta_angle + Math.PI) / arc_delta_heading;
  if (Math.abs(qdistc) <= 0.5) {
    return qdistc + 0.5; // Line goes from center point of arc to (x,y) to point on arc
  } else if (Math.abs(qdistc_opposite) <= 0.5) {
    return qdistc_opposite + 0.5; // Line goes from (x,y) to center of arc to point on arc
  } else {
    // Can't draw a line from (x,y) to center point of arc to arc
    let checkside = Math.hypot(arc.x0 - x, arc.y0 - y) < Math.hypot(final_state.x - x, final_state.y - y);
    let choice = [qdistc + 0.5, qdistc_opposite + 0.5];
    return (checkside) ? Math.min(choice[0],choice[1]) : Math.max(choice[0],choice[1]); // return outside region
  }
}

export function nearest_point(arcs, x, y, lstart) {
  let lpast = 0, prcnt = 0;
  for (var ii = 0; ii < arcs.length; ii++) {
    let arc = arcs[ii];
    if (lpast + arc_length(arc) < lstart) {
      lpast += arc_length(arc);
      continue;
    }
    prcnt = percent_along_arc(arc, x, y);
    if (prcnt >= 0) {
      lpast += prcnt*arc_length(arc)
      return {l:lpast, finished:prcnt >= 1 && ii+1 == arcs.length};
    } else if (prcnt < 0) {
      return {l:lpast, finished:false};
    }
    lpast += arc_length(arc);
  }
  return {l:lpast, finished:true};
}
