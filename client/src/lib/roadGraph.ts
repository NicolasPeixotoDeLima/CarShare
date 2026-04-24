// Incrementally-built driveable road network from OpenStreetMap via the
// public Overpass API. Calling code keeps ONE RoadGraph instance across the
// session and merges new regions into it as the user pans/zooms. Merging
// never renumbers existing nodes, so cars can hold on to `from`/`to` indices
// indefinitely without being respawned.

export type LatLng = [number, number];

export interface RoadGraph {
  /** Flat node list. Indices are stable — existing entries never renumber. */
  nodes: LatLng[];
  /** adjacency[i] = list of neighbor node indices reachable from i. */
  adjacency: number[][];
  /** Subset of node indices with ≥ 1 neighbor — safe spawn points. */
  validNodes: number[];
  /** Internal coord→index map used for dedup across merges. */
  _key: Map<string, number>;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function emptyGraph(): RoadGraph {
  return { nodes: [], adjacency: [], validNodes: [], _key: new Map() };
}

/** Road types a private car can plausibly drive on. */
const DRIVEABLE_HIGHWAYS = [
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'unclassified', 'residential', 'living_street',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link',
].join('|');

const COORD_PRECISION = 5; // decimals — ~1m, enough to merge shared intersection nodes

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

export interface OverpassElement {
  type: 'way' | 'node' | 'relation';
  id: number;
  geometry?: Array<{ lat: number; lon: number }>;
}

/** Fetch raw way-with-geometry elements for the given bbox. */
export async function fetchRoadElements(bbox: BBox, signal?: AbortSignal): Promise<OverpassElement[]> {
  const query =
    `[out:json][timeout:25];` +
    `way["highway"~"^(${DRIVEABLE_HIGHWAYS})$"]` +
    `(${bbox.south},${bbox.west},${bbox.north},${bbox.east});` +
    `out geom;`;

  let lastError: unknown;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url + '?data=' + encodeURIComponent(query), { signal });
      if (!res.ok) throw new Error(`overpass ${res.status}`);
      const json = await res.json() as { elements: OverpassElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastError = err;
      if ((err as { name?: string }).name === 'AbortError') throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('overpass_unreachable');
}

/** Merge new OSM way elements into an existing graph. Mutates in place.
 * Returns the number of nodes actually added (0 means full duplicate). */
export function mergeElementsIntoGraph(graph: RoadGraph, elements: OverpassElement[]): number {
  const { nodes, adjacency, _key } = graph;
  const before = nodes.length;

  function getOrCreate(lat: number, lng: number): number {
    const key = lat.toFixed(COORD_PRECISION) + ',' + lng.toFixed(COORD_PRECISION);
    const existing = _key.get(key);
    if (existing !== undefined) return existing;
    const idx = nodes.length;
    nodes.push([lat, lng]);
    adjacency.push([]);
    _key.set(key, idx);
    return idx;
  }

  function link(a: number, b: number) {
    if (a === b) return;
    if (!adjacency[a].includes(b)) adjacency[a].push(b);
    if (!adjacency[b].includes(a)) adjacency[b].push(a);
  }

  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
    let prev = -1;
    for (const pt of el.geometry) {
      const idx = getOrCreate(pt.lat, pt.lon);
      if (prev !== -1) link(prev, idx);
      prev = idx;
    }
  }

  // Rebuild validNodes lazily — this only runs after each merge, not per frame.
  graph.validNodes.length = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (adjacency[i].length > 0) graph.validNodes.push(i);
  }

  return nodes.length - before;
}

/** True if `inner` is fully inside `outer`. */
export function bboxContains(outer: BBox, inner: BBox): boolean {
  return (
    inner.south >= outer.south &&
    inner.north <= outer.north &&
    inner.west  >= outer.west  &&
    inner.east  <= outer.east
  );
}
