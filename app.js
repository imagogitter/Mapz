const DATA_URL = "./data/demolition_permits_last_month.geojson";
const STREET_VIEW_API_KEY = "YOUR_STREET_VIEW_API_KEY";
const STREET_VIEW_SIZE = "320x160";

let map;
let currentMarker = null;
let permitsLayer = null;

const infoPanel = document.getElementById("info-panel");
const infoAddress = document.getElementById("info-address");
const infoPermit = document.getElementById("info-permit");
const infoType = document.getElementById("info-type");
const infoStatus = document.getElementById("info-status");
const infoIssued = document.getElementById("info-issued");
const infoDescription = document.getElementById("info-description");
const infoClose = document.getElementById("info-close");

const svContainer = document.getElementById("streetview-container");
const svPlaceholder = document.getElementById("streetview-placeholder");
const svImg = document.getElementById("streetview-thumb");

function initMap() {
  map = L.map("map", { zoomControl: true, minZoom: 9 }).setView([39.7392, -104.9903], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
  loadPermits();
}

async function loadPermits() {
  try {
    const res = await fetch(DATA_URL);
    const geojson = await res.json();
    permitsLayer = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, fillColor: "#e53935", color: "#b71c1c", weight: 1, opacity: 1, fillOpacity: 0.9 }),
      onEachFeature: (feature, layer) => layer.on("click", () => onFeatureClick(feature, layer))
    }).addTo(map);
    try { const bounds = permitsLayer.getBounds(); if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] }); } catch (_) {}
  } catch (err) { console.error("Failed to load permits data", err); }
}

function onFeatureClick(feature, layer) {
  currentMarker = layer;
  const props = feature.properties || {};
  const coords = feature.geometry && feature.geometry.coordinates;
  const lng = coords && coords[0]; const lat = coords && coords[1];
  infoAddress.textContent = props.address || "(no address)";
  infoPermit.textContent = props.permit_num || "";
  infoType.textContent = props.type || "";
  infoStatus.textContent = props.status || "";
  infoIssued.textContent = props.issued_date || "";
  infoDescription.textContent = props.description || "";
  setupStreetView(lat, lng);
  openInfoPanel();
  if (lat != null && lng != null) map.panTo([lat, lng], { animate: true, duration: 0.3 });
}

function openInfoPanel() { infoPanel.classList.add("open"); }
function closeInfoPanel() { infoPanel.classList.remove("open"); currentMarker = null; }
infoClose.addEventListener("click", closeInfoPanel);

function setupStreetView(lat, lng) {
  if (lat == null || lng == null) { svImg.style.display = "none"; svPlaceholder.textContent = "Location not available."; svPlaceholder.style.display = "flex"; svImg.onclick = null; return; }
  if (!STREET_VIEW_API_KEY) { svImg.style.display = "none"; svPlaceholder.textContent = "Tap to open Street View (online)."; svPlaceholder.onclick = () => { const url = buildStreetViewMapsUrl(lat, lng); window.open(url, "_blank"); }; svPlaceholder.style.display = "flex"; return; }
  const svUrl = buildStreetViewStaticUrl(lat, lng);
  svPlaceholder.style.display = "none"; svImg.src = svUrl; svImg.style.display = "block"; svImg.onclick = () => { const url = buildStreetViewMapsUrl(lat, lng); window.open(url, "_blank"); };
}

function buildStreetViewStaticUrl(lat, lng) {
  const base = "https://maps.googleapis.com/maps/api/streetview";
  const params = new URLSearchParams({ size: STREET_VIEW_SIZE, location: `${lat},${lng}`, key: STREET_VIEW_API_KEY });
  return `${base}?${params.toString()}`;
}

function buildStreetViewMapsUrl(lat, lng) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeInfoPanel(); });
document.addEventListener("DOMContentLoaded", initMap);
