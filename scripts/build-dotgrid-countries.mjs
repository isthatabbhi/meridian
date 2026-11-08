// Build-time script: tag every land dot in src/lib/dot-grid.json with
// its country (2-letter code) using world-atlas countries-110m.json.
// Output: src/lib/dot-grid-countries.json — [lat, lon, code] for land
// dots only (code is null when no tracked country contains the dot).
// Dots at lon === -180 are dropped (the old seam fix: that meridian
// carried a full 86-dot column while every other meridian has <= 10).
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains, geoBounds } from 'd3-geo';

const topo = JSON.parse(readFileSync('/tmp/countries-110m.json', 'utf8'));
const grid = JSON.parse(
  readFileSync('./src/lib/dot-grid.json', 'utf8')
);

const features = feature(topo, topo.objects.countries).features;

// Natural Earth name -> 2-letter code, for the countries Meridian tracks.
const NAME_TO_CODE = {
  'United States of America': 'US',
  'India': 'IN',
  'United Kingdom': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Japan': 'JP',
  'Brazil': 'BR',
  'Australia': 'AU',
  'Canada': 'CA',
  'China': 'CN',
  'Russia': 'RU',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  'Mexico': 'MX',
  'Italy': 'IT',
  'Spain': 'ES',
  'Netherlands': 'NL',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Finland': 'FI',
  'Poland': 'PL',
  'Turkey': 'TR',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Malaysia': 'MY',
  'Pakistan': 'PK',
  'Bangladesh': 'BD',
  'Nigeria': 'NG',
  'Egypt': 'EG',
  'Kenya': 'KE',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'New Zealand': 'NZ',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Taiwan': 'TW',
  'Romania': 'RO',
  'Czechia': 'CZ',
  'Austria': 'AT',
  'Switzerland': 'CH',
};

// Singapore and Hong Kong are not separate polygons at 110m, so tag
// them by proximity to their coordinates (lat, lon, radius in degrees).
const PROXIMITY = [
  { code: 'SG', lat: 1.35, lon: 103.8, r: 1.0 },
  { code: 'HK', lat: 22.4, lon: 114.1, r: 0.6 },
];

// Precompute bounding boxes so most dots skip most features quickly.
const indexed = features.map((f) => {
  const b = geoBounds(f); // [[minLon, minLat], [maxLon, maxLat]]
  return { f, name: f.properties.name, minLon: b[0][0], minLat: b[0][1], maxLon: b[1][0], maxLat: b[1][1] };
});

function codeFor(lat, lon) {
  for (const { f, name, minLon, minLat, maxLon, maxLat } of indexed) {
    // Russia crosses the antimeridian, so geoBounds wraps: minLon
    // (19.66) > maxLon (-169.9). A point is in the lon range when it is
    // east of minLon OR west of maxLon in that case.
    const lonOutside = minLon <= maxLon
      ? (lon < minLon || lon > maxLon)
      : (lon < minLon && lon > maxLon);
    if (lonOutside || lat < minLat || lat > maxLat) continue;
    if (geoContains(f, [lon, lat])) {
      return NAME_TO_CODE[name] || null;
    }
  }
  for (const p of PROXIMITY) {
    const dLat = lat - p.lat;
    const dLon = lon - p.lon;
    if (dLat * dLat + dLon * dLon <= p.r * p.r) return p.code;
  }
  return null;
}

const out = [];
const perCountry = {};
for (const [lat, lon, land] of grid) {
  if (land !== 1) continue;
  if (lon === -180) continue; // seam fix
  const code = codeFor(lat, lon);
  out.push([lat, lon, code]);
  if (code) perCountry[code] = (perCountry[code] || 0) + 1;
}

writeFileSync(
  './src/lib/dot-grid-countries.json',
  JSON.stringify(out)
);
console.log('land dots written:', out.length);
console.log('tagged by country:', JSON.stringify(perCountry, null, 0));
const untagged = out.filter((d) => d[2] === null).length;
console.log('untagged land dots:', untagged);
