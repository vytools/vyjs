// Natural cubic spline utilities
function thomas_algorithm(e, f, g, r) {
  const n = f.length;
  const x = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    e[i-1] = e[i-1] / f[i-1];
    f[i] = f[i] - e[i-1]*g[i-1];
    r[i] = r[i] - e[i-1]*r[i-1];
  }
  x[n-1] = r[n-1] / f[n-1];
  for (let i = n-2; i >= 0; i--) {
    x[i] = (r[i] - g[i]*x[i+1]) / f[i];
  }
  return x;
}

export function natural_cubic_spline(x, y) {
  const n = x.length;
  if (n < 2) return [];
  const a = new Array(n-1).fill(0);
  const b = new Array(n).fill(1);
  const c = new Array(n-1).fill(0);
  const r = new Array(n).fill(0);
  for (let i = 1; i < n-1; i++) {
    a[i-1] = x[i] - x[i-1];
    b[i]   = 2*(x[i+1] - x[i-1]);
    c[i]   = x[i+1] - x[i];
    r[i]   = 6*((y[i+1]-y[i])/(x[i+1]-x[i]) - (y[i]-y[i-1])/(x[i]-x[i-1]));
  }
  return thomas_algorithm(a, b, c, r);
}

function interp0(x0, y0, x1, y1, d2y0dx2, d2y1dx2, x) {
  const xhat = x - x0;
  const dx = x1 - x0;
  const d2y = d2y1dx2 - d2y0dx2;
  const dy0dx = (y1-y0)/dx - dx/2*d2y0dx2 - dx/6*d2y;
  const d2ydx2 = d2y0dx2 + xhat/dx*d2y;
  const y = y0 + dy0dx*xhat + (xhat**2)/2*d2y0dx2 + (xhat**3)/(6*dx)*d2y;
  const dydx = dy0dx + xhat*d2y0dx2 + (xhat**2)/2/dx*d2y;
  return {y, dydx, d2ydx2};
}

export function spline_interpolate(xk, yk, d2yk, x) {
  const n = xk.length;
  for (let i = 1; i < n; i++) {
    if (x < xk[i] || i+1 == n) {
      return interp0(xk[i-1], yk[i-1], xk[i], yk[i], d2yk[i-1], d2yk[i], x);
    }
  }
  throw new Error('Not enough knots');
}

// spline: list of {t,x,y} knots. Builds the natural cubic splines for x(t) and y(t).
export function compute_spline_knots(spline) {
  const ts = spline.map(s => s.t);
  const xs = spline.map(s => s.x);
  const ys = spline.map(s => s.y);
  return {ts, xs, ys, d2x: natural_cubic_spline(ts, xs), d2y: natural_cubic_spline(ts, ys)};
}

// Evaluate position/heading at parameter t (clamped to the knot range).
export function spline_state(knots, t) {
  const {ts, xs, ys, d2x, d2y} = knots;
  const tc = Math.min(Math.max(t, ts[0]), ts[ts.length-1]);
  const rx = spline_interpolate(ts, xs, d2x, tc);
  const ry = spline_interpolate(ts, ys, d2y, tc);
  return {x: rx.y, y: ry.y, q: Math.atan2(ry.dydx, rx.dydx)};
}

// dy/dx at both ends of one segment, from the same Hermite form used in interp0.
function segment_derivatives(x0, y0, x1, y1, d2y0dx2, d2y1dx2) {
  const dx = x1 - x0;
  const d2y = d2y1dx2 - d2y0dx2;
  const dydx0 = (y1-y0)/dx - dx/2*d2y0dx2 - dx/6*d2y;
  const dydx1 = dydx0 + dx*d2y0dx2 + dx/2*d2y;
  return {dydx0, dydx1};
}

// Each spline segment is a cubic in t for both x(t) and y(t), so it converts exactly
// (no sampling) into a single cubic bezier curve via the Hermite->Bezier formula.
export function spline_bezier_segments(spline) {
  const {ts, xs, ys, d2x, d2y} = compute_spline_knots(spline);
  const segments = [];
  for (let i = 1; i < ts.length; i++) {
    const dt = ts[i] - ts[i-1];
    const hx = segment_derivatives(ts[i-1], xs[i-1], ts[i], xs[i], d2x[i-1], d2x[i]);
    const hy = segment_derivatives(ts[i-1], ys[i-1], ts[i], ys[i], d2y[i-1], d2y[i]);
    segments.push({
      x0: xs[i-1], y0: ys[i-1],
      cp1x: xs[i-1] + hx.dydx0*dt/3, cp1y: ys[i-1] + hy.dydx0*dt/3,
      cp2x: xs[i] - hx.dydx1*dt/3,   cp2y: ys[i] - hy.dydx1*dt/3,
      x1: xs[i], y1: ys[i],
    });
  }
  return segments;
}
