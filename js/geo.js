// https://en.wikipedia.org/wiki/Geographic_coordinate_conversion
const EARTH_A = 6378137;
const EARTH_F = 1.0/298.257223563;
const EARTH_B = EARTH_A * ( 1.0 - EARTH_F );
const EARTH_A2 = EARTH_A*EARTH_A;
const EARTH_B2 = EARTH_B*EARTH_B;
const EARTH_Ecc2 = 1 - EARTH_B2/EARTH_A2;
const D2R = Math.PI/180.0, R2D = 180.0/Math.PI;
const N = (lat) => EARTH_A / Math.sqrt(1-EARTH_Ecc2*Math.pow(Math.sin(lat),2));
export function ENU_to_LLA(origin, points) { // origin = {lat(degrees),lon(degress),altm(meters)}, points={x(meters east from origin),y(meters north from origin)}
    let lat = origin.lat*D2R, lon = origin.lon*D2R, h = origin.altm || 0;
    let clat = Math.cos(lat), slat = Math.sin(lat);
    let clon = Math.cos(lon), slon = Math.sin(lon);
    let n = N(lat);
    let nh = n+h, g = ((1-EARTH_Ecc2)*n+h);
    let xyz = {x:nh*clat*clon, y:nh*clat*slon, z:g*slat};
    let lla = [];
    for (var ii = 0; ii < points.length; ii++) {
        let dE = points[ii].x, dN = points[ii].y, dU = points[ii].z || 0;
        let dx = -slon*dE - slat*clon*dN + clat*clon*dU;
        let dy = clon*dE - slat*slon*dN + clat*slon*dU;
        let dz = clat*dN + slat*dU;
        if (Math.hypot(dx,dy,dz) < 1e-8) {
            lla.push({lat:origin.lat, lon:origin.lon, h});
        } else {
            let Xi = xyz.x + dx, Yi = xyz.y + dy, Zi = xyz.z + dz;
            let loni = Math.atan2(Yi,Xi), p = Math.hypot(Xi,Yi), lati = lat, hi = h;
            for (var jj = 0; jj < 4; jj++) {
                n = N(lati);
                hi = p/Math.cos(lati) - n;
                lati = Math.atan((n+hi)*Zi/(p*((1-EARTH_Ecc2)*n+hi)));
            }
            lla.push({lat:lati*R2D, lon:loni*R2D, altm:hi});
        }
    }
    return lla;
}

const LLAtoECEF = (lat, lon, h) => {
    lat *= D2R; lon *= D2R;
    const slat = Math.sin(lat), clat = Math.cos(lat);
    const slon = Math.sin(lon), clon = Math.cos(lon);
    const n = EARTH_A / Math.sqrt(1 - EARTH_Ecc2 * slat * slat);
    return {
        x: (n + h) * clat * clon,
        y: (n + h) * clat * slon,
        z: (n * (1 - EARTH_Ecc2) + h) * slat
    };
};

// Main conversion: from LLA to ENU relative to an origin
export function LLA_to_ENU(origin, points) {
    const lat0 = origin.lat * D2R, lon0 = origin.lon * D2R, h0 = origin.altm || 0;
    const slat = Math.sin(lat0), clat = Math.cos(lat0);
    const slon = Math.sin(lon0), clon = Math.cos(lon0);
    const originECEF = LLAtoECEF(origin.lat, origin.lon, h0);
    const enu = [];
    for (let ii = 0; ii < points.length; ii++) {
        const { lat, lon, altm } = points[ii];
        const targetECEF = LLAtoECEF(lat, lon, altm || 0);

        const dx = targetECEF.x - originECEF.x;
        const dy = targetECEF.y - originECEF.y;
        const dz = targetECEF.z - originECEF.z;

        const dE = -slon * dx + clon * dy;
        const dN = -clon * slat * dx - slat * slon * dy + clat * dz;
        const dU =  clat * clon * dx + clat * slon * dy + slat * dz;
        enu.push({ x: dE, y: dN, z: dU });
    }
    return enu;
};

/*
function assert(a, b) {
    let cond = (a.hasOwnProperty('x')) ? 
        Math.abs(a.x-b.x)<1e-5 && Math.abs(a.y-b.y)<1e-5 && Math.abs(a.z-b.z)<1e-5 :
        Math.abs(a.lat-b.lat)<1e-8 && Math.abs(a.lon-b.lon)<1e-8 && Math.abs(a.altm-b.altm)<1e-5;
    console.log((!cond) ? `❌ ${JSON.stringify(a)} ${JSON.stringify(b)}` : `✅`);
}
// Test data
const origin = { lat: 42.0, lon: -111.9, altm: 1500 };
const llaPoints = [
    { lat: 42.00001, lon: -111.89999, altm: 1501 },
    { lat: 42.0001, lon: -111.899, altm: 1495 },
    { lat: 42.001, lon: -111.898, altm: 1510 }
];
const enuPoints = [
    { x: 1.2, y: 3.4, z: 5.6 },
    { x: -10, y: 20, z: -2 },
    { x: 50, y: 50, z: 50 }
];

console.log("Running Geo Conversion Tests...\n");
const llaBack = ENU_to_LLA(origin, LLA_to_ENU(origin, llaPoints));
for (let i = 0; i < llaPoints.length; i++) assert(llaBack[i], llaPoints[i]);
const enuBack = LLA_to_ENU(origin, ENU_to_LLA(origin, enuPoints));
for (let i = 0; i < enuPoints.length; i++) assert(enuBack[i], enuPoints[i]);
*/