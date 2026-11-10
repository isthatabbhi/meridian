// Generate a 1-degree dot grid (dot-grid.json) from world-atlas.
// Output: src/lib/dot-grid.json — [lat, lon, land] for a 1-degree grid.
// Land = 1 if the point is inside any country polygon in
// countries-110m.json, else 0. Lon -180 dropped (seam fix).
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains, geoBounds } from 'd3-geo';

const topo = JSON.parse(readFileSync('/tmp/countries-110m.json', 'utf8'));
const features = feature(topo, topo.objects.countries).features;
const indexed = features.map((f) => {
  const b = geoBounds(f);
  return { f, minLon: b[0][0], minLat: b[0][1], maxLon: b[1][0], maxLat: b[1][1] };
});

function isLand(lat, lon) {
  for (const { f, minLon, minLat, maxLon, maxLat } of indexed) {
    const lonOutside = minLon <= maxLon
      ? (lon < minLon || lon > maxLon)
      : (lon < minLon && lon > maxLon);
    if (lonOutside || lat < minLat || lat > maxLat) continue;
    if (geoContains(f, [lon, lat])) return 1;
  }
  return 0;
}

const out = [];
for (let lat = -85; lat <= 85; lat += 1) {
  for (let lon = -180; lon < 180; lon += 1) {
    if (lon === -180) continue;
    out.push([lat, lon, isLand(lat, lon)]);
  }
}
writeFileSync('./src/lib/dot-grid.json', JSON.stringify(out));
const land = out.filter((d) => d[2] === 1).length;
console.log('grid points:', out.length, 'land:', land);
