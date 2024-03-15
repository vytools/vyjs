// https://en.wikipedia.org/wiki/Geographic_coordinate_conversion
const EARTH_A = 6378137;
const EARTH_F = 1.0/298.257223563;
const EARTH_B = EARTH_A * ( 1.0 - EARTH_F );
const EARTH_A2 = EARTH_A*EARTH_A;
const EARTH_B2 = EARTH_B*EARTH_B;
const EARTH_Ecc2 = 1 - EARTH_B2/EARTH_A2;
const D2R = Math.PI/180.0, R2D = 180.0/Math.PI;
const N = (lat) => EARTH_A / Math.sqrt(1-EARTH_Ecc2*Math.pow(Math.sin(lat),2));
const GEO = (origin, points) => { // origin = {lat(degrees),lng(degress),altm(meters)}, points={x(meters east from origin),y(meters north from origin)}
    let lat = origin.lat*D2R, lon = origin.lng*D2R, h = origin.altm || 0;
    let clat = Math.cos(lat), slat = Math.sin(lat);
    let clon = Math.cos(lon), slon = Math.sin(lon);
    let n = N(lat);
    let nh = n+h, g = ((1-EARTH_Ecc2)*n+h);
    let xyz = {x:nh*clat*clon, y:nh*clat*slon, z:g*slat};
    let lla = [];
    for (var ii = 0; ii < points.length; ii++) {
        let dE = points[ii].x, dN = points[ii].y;
        let dx = -slon*dE - slat*clon*dN; // + clat*clon*dU
        let dy = clon*dE - slat*slon*dN; // + clat*slon*dU
        let dz = clat*dN; // + slat*dU
        if (Math.hypot(dx,dy,dz) < 1e-8) {
            lla.push({lat:origin.lat, lng:origin.lng, h});
        } else {
            let Xi = xyz.x + dx, Yi = xyz.y + dy, Zi = xyz.z + dz;
            let loni = Math.atan2(Yi,Xi), p = Math.hypot(Xi,Yi), lati = lat, hi = h;
            for (var jj = 0; jj < 4; jj++) {
                n = N(lati);
                hi = p/Math.cos(lati) - n;
                lati = Math.atan((n+hi)*Zi/(p*((1-EARTH_Ecc2)*n+hi)));
            }
            lla.push({lat:lati*R2D, lng:loni*R2D, altm:hi});
        }
    }
    return lla;
}