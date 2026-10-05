import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fmtRate, siteStatus, STATUS_STYLE } from "../utils/rates";

const ZIMBABWE = [-19.0154, 29.1549];

// Map backgrounds, tried in order. If the first can't be reached the next is used.
// None of these needs an account key. (CARTO's basemaps now return "API KEY REQUIRED" images instead.)
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
const PROVIDERS = [
  {
    // light grey background so the coloured bubbles stand out, with place names on top
    url: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    maxZoom: 16,
    attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
  },
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];
const TILE_ERRORS_BEFORE_SWITCH = 4;

const bubbleRadius = (count, max) => (max === 0 ? 8 : 8 + (count / max) * 32);
const bubbleColor = (count, max) => {
  if (max === 0 || count === 0) return "#10b981"; // green
  const ratio = count / max;
  if (ratio < 0.4) return "#10b981";
  if (ratio < 0.7) return "#f59e0b"; // amber
  return "#ef4444"; // red
};
const hasLocation = (s) =>
  Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)) &&
  s.latitude !== null && s.longitude !== null && !(Number(s.latitude) === 0 && Number(s.longitude) === 0);

// Keeps the map sized to its box (when the layout changes, e.g. the menu opens) and zoomed to show every site
function FitToSites({ points }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);

  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) map.setView(ZIMBABWE, 6);
    else if (points.length === 1) map.setView(points[0], 10);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function SitesMap({ sites, search, limits }) {
  const [provider, setProvider] = useState(0);
  const [failed, setFailed] = useState(false);
  const errors = useRef(0);

  const filtered = useMemo(
    () => sites.filter((s) => s.name.toLowerCase().includes((search || "").toLowerCase())),
    [sites, search],
  );
  const located = filtered.filter(hasLocation);
  const missing = filtered.filter((s) => !hasLocation(s));
  const points = located.map((s) => [Number(s.latitude), Number(s.longitude)]);
  const maxCount = Math.max(...filtered.map((s) => s.incidentCount), 1);

  const tileHandlers = {
    tileerror: () => {
      errors.current += 1;
      if (errors.current < TILE_ERRORS_BEFORE_SWITCH) return;
      errors.current = 0;
      if (provider < PROVIDERS.length - 1) setProvider(provider + 1);
      else setFailed(true);
    },
    tileload: () => {
      errors.current = 0;
      setFailed((f) => (f ? false : f));
    },
  };

  return (
    // isolation keeps the map library's own layers (z-index up to 1000) inside this box, so they can't
    // cover the phone menu or dialogs that open on top of the page
    <div style={{ position: "relative", isolation: "isolate", zIndex: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      {failed && (
        <div role="status" style={{ background: "#fffbeb", color: "#92400e", padding: "8px 14px", fontSize: "0.8rem", borderBottom: "1px solid #fcd34d" }}>
          The map background couldn't load (check the internet connection). Your sites are still shown below.
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, background: "#e5edf5" }}>
        <MapContainer center={ZIMBABWE} zoom={6} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer key={provider} url={PROVIDERS[provider].url} attribution={PROVIDERS[provider].attribution}
            maxZoom={PROVIDERS[provider].maxZoom} eventHandlers={tileHandlers} />
          {PROVIDERS[provider].labels && (
            <TileLayer key={`labels-${provider}`} url={PROVIDERS[provider].labels} maxZoom={PROVIDERS[provider].maxZoom} />
          )}
          <FitToSites points={points} />
          {located.map((site) => {
            const radius = bubbleRadius(site.incidentCount, maxCount);
            const color = bubbleColor(site.incidentCount, maxCount);
            const status = STATUS_STYLE[siteStatus(site, limits)];
            return (
              <CircleMarker key={site.id} center={[Number(site.latitude), Number(site.longitude)]} radius={radius}
                pathOptions={{ fillColor: color, fillOpacity: 0.55, color, weight: 2, opacity: 0.9 }}>
                <LeafletTooltip direction="top" offset={[0, -radius]} permanent={false}>
                  <div style={{ textAlign: "center", lineHeight: "1.4" }}>
                    <strong>{site.name}</strong><br />
                    {site.incidentCount} incident{site.incidentCount !== 1 ? "s" : ""}<br />
                    TRIR: {fmtRate(site.trir)} &nbsp;|&nbsp; LTIFR: {fmtRate(site.ltifr)}
                  </div>
                </LeafletTooltip>
                <Popup>
                  <strong>{site.name}</strong><br />
                  Incidents: <strong>{site.incidentCount}</strong><br />
                  TRIR: {fmtRate(site.trir)}<br />
                  LTIFR: {fmtRate(site.ltifr)}<br />
                  Status: <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      {missing.length > 0 && (
        <div style={{ padding: "8px 14px", fontSize: "0.78rem", color: "#64748b", borderTop: "1px solid #e2e8f0", background: "#fff" }}>
          {missing.length === 1 ? "1 site has" : `${missing.length} sites have`} no location set, so {missing.length === 1 ? "it isn't" : "they aren't"} on the map:{" "}
          {missing.map((s) => s.name).join(", ")}. Add the coordinates on the Sites page.
        </div>
      )}
    </div>
  );
}
