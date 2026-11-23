import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin, Search } from 'lucide-react';

const defaultMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface StandardizedLocation {
  latitude: number;
  longitude: number;
  standardizedAddress: string;
  city: string;
}

interface LocationMapPickerProps {
  latitude?: number;
  longitude?: number;
  city?: string;
  address?: string;
  onLocationChange: (loc: StandardizedLocation) => void;
  readOnly?: boolean;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationMapPicker({
  latitude = 10.46314,
  longitude = -73.25322,
  city = 'Valledupar',
  address = '',
  onLocationChange,
  readOnly = false,
}: LocationMapPickerProps) {
  const [searchQuery, setSearchQuery] = useState(address);
  const [searching, setSearching] = useState(false);
  const [prevAddress, setPrevAddress] = useState(address);

  if (address !== prevAddress) {
    setPrevAddress(address);
    if (address) {
      setSearchQuery(address);
    }
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`,
      );
      const data = await res.json();
      const addr = data?.address ?? {};
      const detectedCity =
        addr.city || addr.town || addr.village || addr.municipality || city || 'Valledupar';
      const road = [addr.road, addr.house_number].filter(Boolean).join(' # ');
      const neighbourhood = addr.suburb || addr.neighbourhood || '';
      const standardized = [road, neighbourhood, detectedCity, 'Colombia']
        .filter(Boolean)
        .join(', ');

      setSearchQuery(standardized);
      onLocationChange({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        standardizedAddress:
          standardized || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city: detectedCity,
      });
    } catch {
      onLocationChange({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        standardizedAddress: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city,
      });
    }
  }

  async function handleSearchPlace() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const queryWithCity = searchQuery.toLowerCase().includes(city.toLowerCase())
        ? `${searchQuery.trim()}, Colombia`
        : `${searchQuery.trim()}, ${city}, Colombia`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(queryWithCity)}&limit=1&accept-language=es`,
      );
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const hit = results[0];
        await reverseGeocode(Number(hit.lat), Number(hit.lon));
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div
      data-testid="location-map-picker"
      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#15172b] uppercase">
          <MapPin className="h-4 w-4 text-[#ff684a]" />
          Geolocalización Exacta (GPS)
        </span>
        <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600 shadow-2xs">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </span>
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              data-testid="input-map-search-address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearchPlace();
                }
              }}
              placeholder={`Buscar recinto o calle en ${city}...`}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-800 focus:border-[#7765f8] focus:outline-none"
            />
          </div>
          <button
            type="button"
            data-testid="btn-map-search-address"
            disabled={searching}
            onClick={() => void handleSearchPlace()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#15172b] px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {searching ? 'Ubicando...' : 'Ubicar Pin'}
          </button>
        </div>
      )}

      <div className="relative z-0 h-52 w-full overflow-hidden rounded-xl border border-slate-300 shadow-inner">
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter lat={latitude} lng={longitude} />
          {!readOnly && (
            <ClickHandler onSelect={(lat, lng) => void reverseGeocode(lat, lng)} />
          )}
          <Marker position={[latitude, longitude]} icon={defaultMarkerIcon} />
        </MapContainer>
      </div>

      {!readOnly && (
        <p className="text-[11px] text-slate-500">
          Haz clic en el mapa para ajustar el pin exacto de ingreso al recinto y estandarizar la dirección automáticamente.
        </p>
      )}
    </div>
  );
}