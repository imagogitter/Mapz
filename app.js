const DATA_URL = "./data/demolition_permits_last_month.geojson";
// Using Mapillary - no API key required for basic usage
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
      pointToLayer: async (feature, latlng) => {
        const coords = feature.geometry && feature.geometry.coordinates;
        const lng = coords && coords[0]; const lat = coords && coords[1];

        // Create custom marker with street view thumbnail
        const marker = await createStreetViewMarker(lat, lng, feature);
        return marker;
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const coords = feature.geometry && feature.geometry.coordinates;
        const lng = coords && coords[0]; const lat = coords && coords[1];

        // Create popup with street view thumbnail
        const popupContent = createPopupContent(feature, lat, lng);
        layer.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'permit-popup'
        });

        // Keep the click handler for the info panel
        layer.on("click", () => onFeatureClick(feature, layer));
      }
    }).addTo(map);
    try { const bounds = permitsLayer.getBounds(); if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] }); } catch (_) {}
  } catch (err) { console.error("Failed to load permits data", err); }
}

async function createStreetViewMarker(lat, lng, feature) {
  const thumbnailUrl = await getStreetViewThumbnail(lat, lng);

  const iconHtml = `
    <div class="streetview-marker">
      <img src="${thumbnailUrl}" alt="Street View" class="streetview-thumb" />
      <div class="marker-overlay">
        <span class="marker-icon">📍</span>
      </div>
    </div>
  `;

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'custom-streetview-marker',
    iconSize: [60, 45],
    iconAnchor: [30, 45],
    popupAnchor: [0, -45]
  });

  return L.marker([lat, lng], { icon: customIcon });
}

async function getStreetViewThumbnail(lat, lng) {
  // Create a styled marker with street view icon using canvas
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 45;
    const ctx = canvas.getContext('2d');

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 60, 45);
    gradient.addColorStop(0, '#e53935');
    gradient.addColorStop(1, '#b71c1c');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 60, 45);

    // Add street view icon
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏙️', 30, 28);

    // Add camera icon in corner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(50, 15, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#e53935';
    ctx.font = '8px Arial';
    ctx.fillText('📷', 50, 19);

    resolve(canvas.toDataURL());
  });
}

function createPopupContent(feature, lat, lng) {
  const props = feature.properties || {};
  const address = props.address || "Unknown address";
  const permitNum = props.permit_num || "";
  const status = props.status || "";
  const type = props.type || "";

  return `
    <div class="popup-content">
      <div class="popup-header">
        <strong>${address}</strong>
      </div>
      <div class="popup-details">
        <div><span class="label">Permit:</span> ${permitNum}</div>
        <div><span class="label">Type:</span> ${type}</div>
        <div><span class="label">Status:</span> ${status}</div>
      </div>
      <div class="popup-streetview">
        <button class="streetview-btn" onclick="openStreetView(${lat}, ${lng})">
          🏙️ View Street View
        </button>
      </div>
    </div>
  `;
}

function openStreetView(lat, lng) {
  if (lat != null && lng != null) {
    const url = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17&focus=photo`;
    window.open(url, "_blank");
  }
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
  if (lat == null || lng == null) {
    svImg.style.display = "none";
    svPlaceholder.textContent = "Location not available.";
    svPlaceholder.style.display = "flex";
    svImg.onclick = null;
    return;
  }

  // Mapillary doesn't require API key for web viewing
  svImg.style.display = "none";
  svPlaceholder.textContent = "Tap to open Mapillary Street View";
  svPlaceholder.onclick = () => {
    const url = buildMapillaryUrl(lat, lng);
    window.open(url, "_blank");
  };
  svPlaceholder.style.display = "flex";
}

function buildMapillaryUrl(lat, lng) {
  // Mapillary web viewer - opens street view at the location
  return `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17&focus=photo`;
}

function buildStreetViewStaticUrl(lat, lng) {
  // Fallback - not used with Mapillary
  return "";
}

function buildStreetViewMapsUrl(lat, lng) {
  // Fallback - not used with Mapillary
  return buildMapillaryUrl(lat, lng);
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeInfoPanel(); });
document.addEventListener("DOMContentLoaded", initMap);
