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

// India border correction (user order 2026-11-09): Natural Earth
// draws Jammu & Kashmir and Arunachal Pradesh with the Line of
// Control / McMahon Line, so dots there get tagged CN or PK. The
// official Indian map shows the full state of Jammu & Kashmir
// (including PoK and Gilgit-Baltistan) and the full state of
// Arunachal Pradesh as India. Retag dots in those claimed regions
// as IN after the geoContains pass. The boxes are tight to the
// claimed territory so Nepal, Bhutan and Bangladesh are untouched.
//
// Jammu & Kashmir shape (strictly from the user's reference image
// IMG_4814.jpeg, 2026-11-09): NOT a rectangle. The top is narrow
// and western, the middle is widest. Per-latitude lon ranges
// extracted from the reference dots:
//   lat 37: lon 73-76
//   lat 36: lon 72-80
//   lat 35: lon 73-80
//   lat 34: lon 73-79
//   lat 33: lon 73-79
const KASHMIR_BY_LAT = {
  37: [73, 76],
  36: [72, 80],
  35: [73, 80],
  34: [73, 79],
  33: [73, 79],
};

// Eastern side and the Seven Sisters (Arunachal Pradesh, Assam,
// Meghalaya, Manipur, Mizoram, Nagaland, Tripura, plus Sikkim,
// strictly from the user's reference image IMG_4814.jpeg,
// 2026-11-10, "fix the border dot by dot for the seven sisters").
// NOT a rectangle. Per-latitude lon sets extracted from the
// reference dots, dot by dot:
//   lat 29: lon 94, 96 (Arunachal north)
//   lat 28: lon 93-97 (Arunachal)
//   lat 27: lon 89, 92-97 (89 is Sikkim/corridor; 90-91 gap is Bhutan)
//   lat 26: lon 89-95 (corridor and Assam)
//   lat 25: lon 89-94 (Assam, Meghalaya)
//   lat 24: lon 92-94 (Manipur, Mizoram, Nagaland)
//   lat 23: lon 91-93 (Tripura, Mizoram)
const EASTERN_BY_LAT = {
  29: [94, 96],
  28: [93, 94, 95, 96, 97],
  27: [89, 92, 93, 94, 95, 96, 97],
  26: [89, 90, 91, 92, 93, 94, 95],
  25: [89, 90, 91, 92, 93, 94],
  24: [92, 93, 94],
  23: [91, 92, 93],
};

// Blocklist: dots the reference does NOT have, even though
// Natural Earth's India polygon includes them. The reference has a
// gap at lat 29 lon 95 (between the two Arunachal clusters), so
// that dot must not be tagged IN. Lon 88 at lat 23-27 is outside
// the reference border (Nepal/Bangladesh/Bhutan side), so those
// dots must not be tagged IN either.
const NOT_INDIA = new Set(['29,95', '23,88', '24,88', '25,88', '26,88', '27,88']);

const INDIA_OVERRIDES = [
  // (Siliguri Corridor is covered by the per-latitude northeast
  // sets above: lon 89 at lat 26-27. No rectangle override here,
  // the rectangle was too wide and tagged lon 88, which the
  // reference does not have.)
];

function codeFor(lat, lon) {
  // Jammu & Kashmir: exact shape from the reference, per latitude.
  const kRange = KASHMIR_BY_LAT[lat];
  if (kRange && lon >= kRange[0] && lon <= kRange[1]) {
    return 'IN';
  }
  // Eastern side: exact dots from the reference, per latitude.
  const eSet = EASTERN_BY_LAT[lat];
  if (eSet && eSet.includes(lon)) {
    return 'IN';
  }
  for (const o of INDIA_OVERRIDES) {
    if (lat >= o.minLat && lat <= o.maxLat && lon >= o.minLon && lon <= o.maxLon) {
      return 'IN';
    }
  }
  for (const { f, name, minLon, minLat, maxLon, maxLat } of indexed) {
    // Russia crosses the antimeridian, so geoBounds wraps: minLon
    // (19.66) > maxLon (-169.9). A point is in the lon range when it is
    // east of minLon OR west of maxLon in that case.
    const lonOutside = minLon <= maxLon
      ? (lon < minLon || lon > maxLon)
      : (lon < minLon && lon > maxLon);
    if (lonOutside || lat < minLat || lat > maxLat) continue;
    if (geoContains(f, [lon, lat])) {
      const code = NAME_TO_CODE[name] || null;
      // Blocklist: dots the reference does not have as India, even
      // though Natural Earth includes them. Return null (untagged)
      // instead of IN for these.
      if (code === 'IN' && NOT_INDIA.has(`${lat},${lon}`)) return null;
      return code;
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
