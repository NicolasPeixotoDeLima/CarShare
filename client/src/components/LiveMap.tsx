import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { bboxContains, emptyGraph, fetchRoadElements, mergeElementsIntoGraph } from '../lib/roadGraph';
import type { BBox, RoadGraph } from '../lib/roadGraph';
import './LiveMap.css';

type LatLng = [number, number];

const DEFAULT_CENTER: LatLng = [-23.5948, -46.6856]; // Vila Olímpia, São Paulo

interface Props {
  /** Allow zooming with mouse wheel — disabled in hero preview, enabled in fullscreen. */
  interactive?: boolean;
  /** Called when user clicks the "Expandir" chip. Omit to hide the chip. */
  onExpand?: () => void;
  /** Zoom level. */
  zoom?: number;
}

export function LiveMap({ interactive = false, onExpand, zoom = 14 }: Props) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) { setDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => setDenied(true),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const center: LatLng = pos ?? DEFAULT_CENTER;

  return (
    <div className="live-map">
      <MapContainer
        center={center}
        zoom={zoom}
        // Drag works in both modes; scroll-wheel-zoom only when fully interactive
        // so the landing page doesn't hijack the user's scroll.
        dragging
        touchZoom
        doubleClickZoom
        scrollWheelZoom={interactive}
        zoomControl={interactive}
        attributionControl
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>'
          subdomains={['a', 'b', 'c', 'd']}
          maxZoom={19}
        />
        <Recenter center={center} />
        <UserMarker position={center} />
        <AnimatedCars />
      </MapContainer>

      {onExpand && (
        <button
          className="live-map__expand"
          onClick={onExpand}
          aria-label={denied ? 'Expandir mapa' : 'Expandir mapa da sua região'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Expandir
        </button>
      )}
    </div>
  );
}

/** Keeps the map view in sync when the resolved position arrives asynchronously. */
function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
    // Resize tiles after any layout change (e.g. entering fullscreen).
    const id = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(id);
  }, [map, center[0], center[1]]);
  return null;
}

/** User position: amber dot with pulsing rings. */
function UserMarker({ position }: { position: LatLng }) {
  const icon = useMemo(() => L.divIcon({
    className: 'user-marker-wrap',
    html: '<div class="user-marker"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }), []);
  return <Marker position={position} icon={icon} />;
}

/* ============ ANIMATED CARS ON REAL ROADS ============
 *
 * 1. Fetch a driveable road graph from Overpass (OSM) around the viewport.
 * 2. Each car picks two adjacent nodes and slides along that edge.
 * 3. When it reaches the far node, it picks a random neighbor and continues.
 *
 * Because every movement is along an OSM edge, cars naturally stay on roads
 * and never enter water, buildings, parks, etc.
 */

type Variant = 'amber' | 'signal' | 'dim';

interface Car {
  id: number;
  from: number;     // node index (start of current edge)
  to:   number;     // node index (end of current edge)
  progress: number; // 0..1 along from→to
  speed: number;    // degrees per second
  variant: Variant;
}

// Pre-built once — shared across all cars of a given variant.
const ICONS: Record<Variant, L.DivIcon> = {
  amber:  carDivIcon('amber'),
  signal: carDivIcon('signal'),
  dim:    carDivIcon('dim'),
};

function carDivIcon(variant: Variant): L.DivIcon {
  return L.divIcon({
    className: `car-marker car-marker--${variant}`,
    html: '<div class="car-marker__rect"></div>',
    iconSize:   [10, 5],
    iconAnchor: [5, 2.5],
  });
}

/** Fleet size grows with zoom-out so bigger visible area keeps feeling busy. */
function carCountForZoom(zoom: number): number {
  if (zoom >= 16) return 10;
  if (zoom >= 15) return 16;
  if (zoom >= 14) return 24;
  if (zoom >= 13) return 40;
  if (zoom >= 12) return 60;
  if (zoom >= 11) return 90;
  return 120;
}

function pickVariant(): Variant {
  const r = Math.random();
  if (r < 0.55) return 'amber';
  if (r < 0.78) return 'signal';
  return 'dim';
}

/** Upper bound on the fleet — protects memory if the user explores a lot. */
const MAX_CARS = 220;

/** Spawn a car near a random node in the current viewport. Falls back to any
 * valid node in the graph if the viewport has none (e.g. ocean / first load). */
function spawnCar(id: number, graph: RoadGraph, bounds: L.LatLngBounds): Car | null {
  if (graph.validNodes.length === 0) return null;

  // First try: inside the visible area, so new cars feel "there where I'm looking".
  const inView: number[] = [];
  for (const idx of graph.validNodes) {
    const [lat, lng] = graph.nodes[idx];
    if (bounds.contains([lat, lng] as L.LatLngExpression)) inView.push(idx);
  }
  const pool = inView.length > 0 ? inView : graph.validNodes;

  const from = pool[Math.floor(Math.random() * pool.length)];
  const neighbors = graph.adjacency[from];
  if (neighbors.length === 0) return null;
  const to = neighbors[Math.floor(Math.random() * neighbors.length)];
  return {
    id, from, to,
    progress: Math.random(),
    speed:    0.00015 + Math.random() * 0.00035, // slow, 1–5 px/s @ z14
    variant:  pickVariant(),
  };
}

function AnimatedCars() {
  const map = useMap();
  // ONE graph grows across the whole session. Nodes are never renumbered, so
  // car indices stay valid even after the user explores new regions.
  const graphRef = useRef<RoadGraph>(emptyGraph());
  const coveredBBoxesRef = useRef<BBox[]>([]);
  const carsRef = useRef<Car[]>([]);
  const nextIdRef = useRef(0);
  const [graphVersion, setGraphVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Fetch a new region only when the current viewport isn't already covered by
  // something we downloaded earlier. Debounced so a quick drag doesn't spam.
  useEffect(() => {
    let debounceId: number | undefined;
    let abort: AbortController | null = null;

    const toBBox = (b: L.LatLngBounds): BBox => ({
      south: b.getSouth(), north: b.getNorth(),
      west:  b.getWest(),  east:  b.getEast(),
    });

    function maybeFetch() {
      const viewport = toBBox(map.getBounds());
      const alreadyCovered = coveredBBoxesRef.current.some(b => bboxContains(b, viewport));
      if (alreadyCovered) return;

      // Pad the viewport by 40% so small pans stay inside the cache.
      const padLat = (viewport.north - viewport.south) * 0.4;
      const padLng = (viewport.east  - viewport.west ) * 0.4;
      const target: BBox = {
        south: viewport.south - padLat, north: viewport.north + padLat,
        west:  viewport.west  - padLng, east:  viewport.east  + padLng,
      };
      // Cap the span so a country-wide zoom-out doesn't fire a huge query.
      const MAX_SPAN = 0.20; // ~22 km
      if (target.north - target.south > MAX_SPAN || target.east - target.west > MAX_SPAN) return;

      abort?.abort();
      abort = new AbortController();
      setLoading(true);
      fetchRoadElements(target, abort.signal)
        .then(elements => {
          coveredBBoxesRef.current.push(target);
          mergeElementsIntoGraph(graphRef.current, elements);
          setGraphVersion(v => v + 1);   // re-run spawn effect
          setLoading(false);
        })
        .catch(err => {
          if ((err as { name?: string }).name !== 'AbortError') {
            console.warn('[LiveMap] road graph fetch failed:', err);
            setLoading(false);
          }
        });
    }

    const scheduled = () => {
      window.clearTimeout(debounceId);
      debounceId = window.setTimeout(maybeFetch, 400);
    };

    maybeFetch(); // initial
    map.on('moveend', scheduled);
    map.on('zoomend', scheduled);
    return () => {
      window.clearTimeout(debounceId);
      abort?.abort();
      map.off('moveend', scheduled);
      map.off('zoomend', scheduled);
    };
  }, [map]);

  // Grow the fleet when needed. We never trim — existing cars persist forever,
  // even if the user pans far away and comes back later.
  useEffect(() => {
    const graph = graphRef.current;
    if (graph.validNodes.length === 0) return;

    const sync = () => {
      const needed = Math.min(carCountForZoom(map.getZoom()), MAX_CARS);
      const list = carsRef.current;
      const bounds = map.getBounds();
      while (list.length < needed) {
        const c = spawnCar(nextIdRef.current++, graph, bounds);
        if (!c) break;
        list.push(c);
      }
    };
    sync();
    map.on('zoomend', sync);
    return () => { map.off('zoomend', sync); };
  }, [map, graphVersion]);

  // Animation loop — advance every car along its current edge. Reads the
  // shared ref so it automatically picks up merges without restarting.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - last) / 1000;
      last = now;
      const graph = graphRef.current;
      if (graph.nodes.length > 0) {
        for (const car of carsRef.current) {
          const [fLat, fLng] = graph.nodes[car.from];
          const [tLat, tLng] = graph.nodes[car.to];
          const edgeLen = Math.hypot(tLat - fLat, tLng - fLng);
          car.progress += (car.speed * dt) / Math.max(edgeLen, 1e-9);

          let guard = 0;
          while (car.progress >= 1 && guard++ < 4) {
            const neighbors = graph.adjacency[car.to];
            const forward   = neighbors.filter(n => n !== car.from);
            const pool = forward.length ? forward : neighbors;
            if (pool.length === 0) { car.progress = 1; break; }
            const next = pool[Math.floor(Math.random() * pool.length)];
            car.from = car.to;
            car.to = next;
            car.progress -= 1;
          }
        }
      }
      setTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  void tick;
  const graph = graphRef.current;
  return (
    <>
      {loading && <LoadingChip />}
      {carsRef.current.map(car => {
        const [fLat, fLng] = graph.nodes[car.from];
        const [tLat, tLng] = graph.nodes[car.to];
        const lat = fLat + (tLat - fLat) * car.progress;
        const lng = fLng + (tLng - fLng) * car.progress;
        return (
          <Marker
            key={car.id}
            position={[lat, lng]}
            icon={ICONS[car.variant]}
            interactive={false}
          />
        );
      })}
    </>
  );
}

function LoadingChip() {
  return (
    <div className="live-map__loading">
      <span className="live-map__loading-dot" />
      carregando tráfego…
    </div>
  );
}
