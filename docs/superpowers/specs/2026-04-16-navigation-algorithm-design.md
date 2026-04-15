# Navigation Algorithm & Route Recording Design

**Date:** 2026-04-16
**Status:** Approved

---

## Overview

This spec covers two related features:

1. **Navigation algorithm** — given a user's named origin and destination, find the best itinerary across multiple community-recorded routes, accounting for walking transfers and the Philippine flag-down-anywhere commute model.
2. **Route recording improvements** — add snap-to-road (OSRM), live GPS recording, and per-segment mode markers to the existing trace flow so recorded routes carry richer geometry and transport mode data.

These two features are independent and can be built separately. The navigation algorithm consumes `mode_segments` data produced by the improved recording flow, but falls back gracefully to the flat `vehicle_types[]` array for routes recorded before this feature.

---

## 1. Database Schema Changes

### 1a. Add `mode_segments` column to `route` table

```sql
ALTER TABLE route
  ADD COLUMN mode_segments JSONB DEFAULT NULL;
```

`NULL` means the route was recorded before this feature — the navigation algorithm falls back to `vehicle_types[]`. When present, `mode_segments` is an ordered array of segment objects:

```json
[
  { "mode": "Walk",    "from": [120.984, 14.600], "to": [120.987, 14.601] },
  { "mode": "Jeepney", "from": [120.987, 14.601], "to": [120.995, 14.610] },
  { "mode": "Walk",    "from": [120.995, 14.610], "to": [121.001, 14.615] },
  { "mode": "MRT-3",   "from": [121.001, 14.615], "to": [121.010, 14.620] }
]
```

**Constraints:**
- `from` of segment N must equal `to` of segment N-1 (continuity enforced at save time).
- `from`/`to` coordinates are `[lng, lat]` pairs snapped to the route's LineString geometry.
- Segment `mode` values must be a valid `RouteVehicleType` (see Section 3a).

### 1b. Add PostGIS spatial index on `route.geometry`

The navigation BFS calls `ST_DWithin` on `route.geometry` repeatedly. A GiST index is required for this to be fast.

```sql
CREATE INDEX IF NOT EXISTS route_geometry_gist
  ON route USING GIST (geometry);
```

The `geometry` column is already stored as native PostGIS `geometry(LineString, 4326)`, so no column migration is needed.

---

## 2. Navigation Algorithm

### 2a. New API endpoint

```
GET /api/navigate?from=<location_name>&to=<location_name>
```

All graph traversal logic runs server-side in Node.js. PostGIS handles spatial lookups via the Supabase client. The client sends two named locations and receives a complete itinerary.

### 2b. Graph model

This is a **geometry proximity graph**, not a fixed-stop graph:

- **Nodes** — geographic points: user origin, user destination, and any point along any route's LineString where a transfer occurs.
- **Ride edges** — travel along a route's geometry between a board point and an alight point.
- **Walk edges** — move up to **800 meters** between a point on one route and a point on another, or between the user's origin/destination and a nearby route.

Because Philippine jeepneys and many buses are flag-down anywhere, any point within 800m of a route's geometry corridor is considered reachable from that route.

### 2c. Algorithm steps

**Step 1 — Resolve named locations to coordinates**

Query the `route` table for rows where `start_loc` or `end_loc` matches the user's input via `ILIKE`, ordered by subscription count descending so the most-used routes surface first. Extract the coordinate from the matched route's geometry directly — `ST_StartPoint(geometry)` if matched on `start_loc`, or `ST_EndPoint(geometry)` if matched on `end_loc` — to produce `origin_point` and `destination_point` as PostGIS geography points. Do not use `start_loc_osmid` / `end_loc_osmid` for this; those are OpenStreetMap node IDs, not coordinates.

**Step 2 — Seed the BFS frontier**

Find all routes whose geometry passes within 800m of `origin_point`:

```sql
SELECT route_id, geometry, route_name, vehicle_types, mode_segments,
       ST_AsGeoJSON(ST_ClosestPoint(geometry, $origin)) AS board_point
FROM route
WHERE ST_DWithin(geometry, $origin, 800)
```

Immediately check if any of these routes also pass within 800m of `destination_point`. If yes, that is a **zero-transfer direct route** — return it without further BFS.

**Step 3 — BFS expansion**

For each route in the current frontier, find all routes whose geometry comes within 800m of it:

```sql
SELECT r.route_id, r.geometry, r.route_name, r.vehicle_types, r.mode_segments,
       ST_AsGeoJSON(ST_ClosestPoint(r.geometry, ST_ClosestPoint($current_geometry, r.geometry))) AS board_point,
       ST_AsGeoJSON(ST_ClosestPoint($current_geometry, r.geometry)) AS alight_point
FROM route r
WHERE ST_DWithin(r.geometry, $current_geometry, 800)
  AND r.route_id NOT IN ($visited_ids)
```

All routes at a given BFS depth level are processed together before moving to the next level (true breadth-first, not depth-first). Each visited route stores a parent pointer: the route it was reached from and the transfer coordinates (alight point on the parent, board point on the current route). After all routes at the current depth level are expanded, check if any newly found route passes within 800m of `destination_point`. If yes, stop and reconstruct the path.

**Step 4 — Direction-of-travel constraint**

A route's LineString coordinates are ordered from start to end. The alight point must come *after* the board point along the line. This is enforced using:

```sql
ST_LineLocatePoint(geometry, alight_point) > ST_LineLocatePoint(geometry, board_point)
```

If the nearest transfer point would require backtracking along the current route, that transfer is skipped. The algorithm looks for the next valid transfer further along the line.

**Step 5 — Depth limit**

BFS is capped at **3 transfers** (4 ride legs maximum). If no path is found within that depth, return a no-route result. This bounds query complexity and reflects practical commuting limits.

**Step 6 — Path reconstruction**

Walk back through BFS parent pointers to assemble ordered legs. For each leg, compute the walking distance using `ST_Distance`. For each ride leg, if `mode_segments` is present, identify which segments the user passes through and include the mode breakdown.

### 2d. Response shape

```json
{
  "itinerary": [
    {
      "type": "walk",
      "distance_m": 180,
      "from": [120.984, 14.600],
      "to": [120.987, 14.601]
    },
    {
      "type": "ride",
      "route_id": 42,
      "route_name": "Cubao–Quiapo",
      "mode": "Jeepney",
      "board": [120.987, 14.601],
      "alight": [120.995, 14.610],
      "geometry": { "type": "LineString", "coordinates": [[...], [...]] }
    },
    {
      "type": "walk",
      "distance_m": 420,
      "from": [120.995, 14.610],
      "to": [121.001, 14.615]
    },
    {
      "type": "ride",
      "route_id": 87,
      "route_name": "Quiapo–Taft via España",
      "mode": "MRT-3",
      "board": [121.001, 14.615],
      "alight": [121.010, 14.620],
      "geometry": { "type": "LineString", "coordinates": [[...], [...]] }
    },
    {
      "type": "walk",
      "distance_m": 90,
      "from": [121.010, 14.620],
      "to": [121.012, 14.622]
    }
  ],
  "summary": {
    "transfers": 1,
    "walk_distance_m": 690
  }
}
```

The `geometry` on each ride leg is a **clipped** LineString — only the portion between the board and alight points, not the full recorded route.

### 2e. No-route result

If BFS finds no path within 3 transfers and 800m walk radius:

```json
{ "itinerary": null, "message": "no_route_found" }
```

The client displays: *"No route found. Try a different destination or check if routes have been recorded for this area."*

---

## 3. Route Recording Improvements

### 3a. Add "Walk" to `RouteVehicleType`

`Walk` must be added to `routeVehicleTypeOptions` in `schemas.ts` so it is valid in `mode_segments`. It should not appear in the vehicle type checklist in the metadata form (users don't select "Walk" as a vehicle type for the whole route), but it must be a valid value in the mode marker picker during tracing.

### 3b. Two recording modes

The trace toolbar presents two explicit modes before the user starts tracing:

#### Mode A — Manual Trace with Snap-to-Road

The user taps points on the map. After each tap, the app calls the OSRM routing API between the previous point and the new tap:

```
GET https://router.project-osrm.org/route/v1/{profile}/{lng1},{lat1};{lng2},{lat2}
    ?overview=full&geometries=geojson
```

The `profile` is `driving` for all vehicle mode segments and `foot` for `Walk` mode segments. The returned road-following LineString replaces the straight segment between those two tapped points. The full `tracedPoints` array is the concatenation of all OSRM-returned coordinates.

**Fallback:** if the OSRM call fails (network error, unmapped road), the app falls back to a straight-line segment and shows: *"Road data unavailable for this segment — straight line used."*

#### Mode B — Live GPS Recording

The user taps "Record live," grants location permission, and presses Start. The app calls `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`. A new point is added to `tracedPoints` only when the device has moved at least **10 meters** from the last recorded point (computed via Haversine formula). A live indicator shows point count and elapsed time.

When the user presses Stop, the raw GPS trace is sent to the OSRM map matching endpoint:

```
GET https://router.project-osrm.org/match/v1/driving/{lng1,lat1};{lng2,lat2};...
    ?overview=full&geometries=geojson&radiuses=30;30;30;...
```

The `radiuses` parameter is a semicolon-separated list of `30` (one per GPS point) to account for urban GPS drift in dense areas like Metro Manila. The returned snapped LineString replaces the raw `tracedPoints` as the geometry to be saved.

**Profile note:** Mode B map matching uses the `driving` profile for the entire trace. If the journey includes walk segments (identified by mode markers), those segments will be snapped to roads using driving rules, which may not follow pedestrian-only paths precisely. This is an accepted trade-off for the initial version — a future improvement would split the trace at mode marker boundaries and match each segment with the appropriate profile (`foot` vs `driving`) separately.

**Fallback:** if map matching fails (OSRM error or fewer than 2 points), the raw GPS trace is used as the geometry with a warning shown to the user.

**Deployment note:** The OSRM public demo server (`router.project-osrm.org`) is for testing only and has no SLA. All OSRM calls must be proxied through a backend API endpoint (never called directly from the client) so the server can be swapped to a self-hosted instance for production without client changes.

### 3c. Mode markers

Both recording modes support per-segment mode markers. This is the same mechanism for both — only the placement trigger differs.

**Toolbar button:** A "Change mode" button in the trace toolbar, disabled until at least one point has been traced.

**Flow (Mode A):** User taps "Change mode" → picks a mode from a bottom sheet → cursor changes to indicate "place marker mode" → next map tap drops a mode-change pin, snapped to the nearest already-traced point index in `tracedPoints`.

**Flow (Mode B):** User taps "Change mode" → picks a mode → the marker is immediately placed at the **most recently recorded GPS point** in `tracedPoints` (the last point that passed the 10-meter threshold).

**Visual feedback:** The drawn line is rendered as color-coded segments between markers. Walk = dashed gray, transit modes = solid colored.

**Undo behavior:** Undo removes the last traced point. If that point had a mode marker attached, the marker is also removed and the line re-renders.

### 3d. Serialization on save

Before opening the metadata form, the app converts `tracedPoints` + `modeMarkers` into the `mode_segments` array:

```ts
type ModeMarker = { pointIndex: number; mode: RouteVehicleType }

function buildModeSegments(
  points: [number, number][],
  markers: ModeMarker[]
): ModeSegment[] {
  // Sort markers by pointIndex ascending
  // Walk through points array, splitting at each marker boundary
  // Each segment: { mode, from: points[startIdx], to: points[endIdx] }
  // First segment defaults to "Walk" if no marker is placed at index 0
}
```

`mode_segments` is sent alongside existing metadata in `POST /api/map/routes`. The `mapRouteCreateSchema` is extended to accept `mode_segments` as an optional field.

---

## 4. Navigation Results Display

### 4a. Entry point

A **From / To** search bar on the map page, separate from the existing route-lookup search bar. Both fields use `ILIKE` search against `start_loc` / `end_loc`. On submit, calls `GET /api/navigate`. The existing `RouteLoaderBar` shows progress while the BFS runs.

### 4b. Pre-navigation result

Each itinerary leg is drawn on the map:

- **Walk legs** — dashed gray line between endpoints
- **Ride legs** — solid colored line, one color per route, drawn only over the clipped board-to-alight segment

A bottom card shows the step-by-step itinerary with total walk distance and transfer count as a summary row at the top. The user taps **Start Navigation** to enter live navigation mode.

### 4c. Live navigation mode

Once the user starts navigation, the map enters a navigation camera:

- **Heading-up orientation** — the map rotates so the user's direction of travel always faces upward via `map.easeTo({ bearing })`. Bearing is read from `GeolocationCoordinates.heading` when available; otherwise computed as the angle between the last two GPS positions.
- **Zoomed-in perspective** — camera zooms to level 17 with a 45° pitch for a perspective view consistent with standard navigation apps.
- **Smooth position tracking** — `watchPosition` updates the map center on every GPS fix via `map.easeTo({ center, bearing })`.
- **Re-center button** — appears if the user manually pans away from their position; tapping it snaps the camera back to their live location.
- **Leg progress** — the current active leg is highlighted prominently; completed legs are dimmed.

### 4d. Ending navigation and saving a combined route

A persistent **"I've arrived"** button is visible throughout navigation. When tapped:

- Navigation mode ends; camera returns to default north-up overview.
- If the completed journey used **two or more ride legs**, a prompt appears:

> *"Your route combined [N] recorded routes. Want to save this as a new route so others can use it?"*

Tapping **Save combined route** opens `RouteTraceSaveDrawer` pre-filled with:

| Field | Value |
|---|---|
| `geometry` | Full concatenated LineString of all legs (walk + ride) in order |
| `mode_segments` | Auto-generated from itinerary legs |
| `start_loc` / `end_loc` | From the user's From / To inputs |
| `vehicle_types` | Union of all vehicle types across ride legs |
| `fare` | Sum of fares across ride legs only |
| `est_time_of_arrival` | Sum of `est_time_of_arrival` across ride legs only (walk time excluded, consistent with existing convention) |

The user reviews, adjusts if needed, and confirms. Saved via the existing `POST /api/map/routes` endpoint — no new endpoint needed. If the journey used only one route, the prompt is skipped.

---

## 5. Out of Scope

- Turn-by-turn voice directions
- Real-time traffic or route disruption data during navigation
- Offline routing (OSRM calls require network)
- Per-segment fare computation within a single recorded route
- Automatic route re-calculation if the user goes off-route during navigation
