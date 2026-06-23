export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Dark basemap for the portfolio map (matches the mockups). */
export const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

/** Mapbox Standard (v3, config-driven): used by the digital-twin scene. */
export const MAP_STYLE_STANDARD = "mapbox://styles/mapbox/standard";

/** VinUni campus (new default location). */
export const VINUNI_ORIGIN = {
  longitude: 105.94542061064729,
  latitude: 20.989925395134943,
};

export const DEFAULT_CAMERA = {
  longitude: VINUNI_ORIGIN.longitude,
  latitude: VINUNI_ORIGIN.latitude,
  zoom: 16.2,
  pitch: 0,
  bearing: 50,
};

/**
 * Twin scene camera fallback (used if public/config/bim.json fails to load).
 * Mirrors the Mapbox Standard labs reference view over VinUni.
 */
export const TWIN_CAMERA = {
  longitude: VINUNI_ORIGIN.longitude,
  latitude: VINUNI_ORIGIN.latitude,
  zoom: 18.5,
  // Mapbox pitch is measured from top-down. This equals ~15° above ground.
  pitch: 75,
  bearing: -146.8,
};

export const hasMapboxToken = (): boolean => MAPBOX_TOKEN.length > 0;
