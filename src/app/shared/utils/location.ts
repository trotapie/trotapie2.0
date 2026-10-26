export interface MapPoint {
  lat: number;
  lng: number;
}

function validPoint(
  lat: string | null | undefined,
  lng: string | null | undefined,
): MapPoint | null {
  if (lat == null || lng == null || !lat.trim() || !lng.trim()) return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
    ? point
    : null;
}

/** Prefer the place's coordinates over the camera position in a Google Maps link. */
export function parseMapPoint(location: string | null | undefined): MapPoint | null {
  if (!location?.trim()) return null;
  let value = location.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* Keep a malformed escape from breaking the page. */
  }
  try {
    const url = new URL(value);
    const marker = validPoint(url.searchParams.get('mlat'), url.searchParams.get('mlon'));
    if (marker) return marker;
  } catch {
    /* Coordinates can also be stored without a URL. */
  }
  const embedded = value.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (embedded) return validPoint(embedded[2], embedded[1]);
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /#map=\d+\/(\-?\d+(?:\.\d+)?)\/(\-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return validPoint(match[1], match[2]);
  }
  try {
    const url = new URL(value);
    return validPoint(url.searchParams.get('mlat'), url.searchParams.get('mlon'));
  } catch {
    return null;
  }
}

export function externalMapUrl(
  location: string | null | undefined,
  point = parseMapPoint(location),
): string | null {
  if (point) return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
  try {
    const url = new URL(location || '');
    const hosts = new Set([
      'google.com',
      'www.google.com',
      'maps.google.com',
      'google.com.mx',
      'www.google.com.mx',
      'maps.google.com.mx',
      'maps.app.goo.gl',
      'goo.gl',
      'openstreetmap.org',
      'www.openstreetmap.org',
    ]);
    return url.protocol === 'https:' && hosts.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
