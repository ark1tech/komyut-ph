/**
 * Mode segments are defined by (from, to) coordinates on a traced polyline.
 * Snapping with "nearest vertex" in 2D can pick vertices **before** or **after** the true
 * position along the path, bleeding one mode into another. These helpers use **distance along
 * the polyline** (path order) so each mode stays within its indicated bounds.
 */

export function haversineM(a: [number, number], b: [number, number]): number {
	const R = 6_371_000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(b[1] - a[1]);
	const dLng = toRad(b[0] - a[0]);
	const sa =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.asin(Math.sqrt(sa));
}

function projectPointOntoSegment(
	p: [number, number],
	a: [number, number],
	b: [number, number]
): { point: [number, number]; t: number } {
	const ax = a[0],
		ay = a[1],
		bx = b[0],
		by = b[1];
	const px = p[0],
		py = p[1];
	const vx = bx - ax,
		vy = by - ay;
	const wx = px - ax,
		wy = py - ay;
	const c2 = vx * vx + vy * vy;
	const t = c2 > 1e-24 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / c2)) : 0;
	return { point: [ax + t * vx, ay + t * vy], t };
}

/** Cumulative distance (m) from the first vertex along the polyline to each vertex index. */
export function cumulativeVertexDistances(coords: [number, number][]): number[] {
	const cum: number[] = [0];
	for (let i = 0; i < coords.length - 1; i++) {
		const a = coords[i];
		const b = coords[i + 1];
		if (!a || !b) break;
		cum.push(cum[i]! + haversineM(a, b));
	}
	return cum;
}

export function totalPolylineLengthM(coords: [number, number][]): number {
	const c = cumulativeVertexDistances(coords);
	return c.length > 0 ? c[c.length - 1]! : 0;
}

/**
 * Distance along the polyline from its start to the closest point on the path to `point`
 * (projection onto the chain of segments).
 */
export function distanceAlongPolylineToPoint(
	coords: [number, number][],
	point: [number, number]
): number {
	if (coords.length < 2) return 0;
	let bestD = Infinity;
	let bestS = 0;
	let acc = 0;
	for (let i = 0; i < coords.length - 1; i++) {
		const a = coords[i]!;
		const b = coords[i + 1]!;
		const edgeLen = haversineM(a, b);
		const { point: proj, t } = projectPointOntoSegment(point, a, b);
		const d = haversineM(point, proj);
		if (d < bestD) {
			bestD = d;
			bestS = acc + t * edgeLen;
		}
		acc += edgeLen;
	}
	return bestS;
}

/** Ordered distance interval [lo, hi] for a mode segment's from/to on this polyline. */
export function modeSegmentDistanceIntervalOnPolyline(
	coords: [number, number][],
	from: [number, number],
	to: [number, number]
): { lo: number; hi: number } {
	const a = distanceAlongPolylineToPoint(coords, from);
	const b = distanceAlongPolylineToPoint(coords, to);
	return { lo: Math.min(a, b), hi: Math.max(a, b) };
}

function interpolatePointAtDistance(
	coords: [number, number][],
	cum: number[],
	dist: number
): [number, number] {
	if (coords.length === 0) return [0, 0];
	if (coords.length === 1) return coords[0]!;
	const total = cum[cum.length - 1] ?? 0;
	const d = Math.max(0, Math.min(dist, total));
	for (let i = 0; i < coords.length - 1; i++) {
		const c0 = cum[i]!;
		const c1 = cum[i + 1]!;
		if (d >= c0 && d <= c1) {
			const segLen = c1 - c0;
			const t = segLen > 1e-12 ? (d - c0) / segLen : 0;
			const a = coords[i]!;
			const b = coords[i + 1]!;
			return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
		}
	}
	return coords[coords.length - 1]!;
}

/**
 * Vertices strictly between `distLo` and `distHi` (m along path), with interpolated endpoints
 * at exact distances. Does not extend past [distLo, distHi].
 */
export function slicePolylineByDistanceInterval(
	coords: [number, number][],
	distLo: number,
	distHi: number
): [number, number][] | null {
	if (coords.length < 2) return null;
	const lo = Math.min(distLo, distHi);
	const hi = Math.max(distLo, distHi);
	const total = totalPolylineLengthM(coords);
	if (hi - lo < 1e-6 || total < 1e-9) return null;
	const clampedLo = Math.max(0, lo);
	const clampedHi = Math.min(hi, total);
	if (clampedHi - clampedLo < 1e-6) return null;

	const cum = cumulativeVertexDistances(coords);
	const out: [number, number][] = [];

	const pLo = interpolatePointAtDistance(coords, cum, clampedLo);
	const pHi = interpolatePointAtDistance(coords, cum, clampedHi);
	out.push(pLo);

	for (let k = 0; k < coords.length; k++) {
		const cd = cum[k];
		if (cd !== undefined && cd > clampedLo && cd < clampedHi) {
			out.push(coords[k]!);
		}
	}

	if (haversineM(pLo, pHi) > 0.05) {
		out.push(pHi);
	}

	return out.length >= 2 ? out : null;
}
