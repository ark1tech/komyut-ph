import type { ModeSegment, RouteVehicleType } from '$lib/validation/schemas';

export interface ModeMarker {
	/** Index into the `tracedPoints` array where the mode changes. */
	pointIndex: number;
	mode: RouteVehicleType;
}

/**
 * Convert a flat array of traced coordinates + mode markers into an ordered
 * array of ModeSegment objects suitable for storing in route.mode_segments.
 *
 * Rules:
 * - Markers are sorted by pointIndex ascending before processing.
 * - If no marker exists at pointIndex 0, the first segment defaults to 'Walk'.
 * - Each segment spans [markers[i].pointIndex, markers[i+1].pointIndex] (or
 *   the end of the array for the last segment).
 * - Segments with fewer than 2 distinct points are omitted.
 *
 * @param points  Ordered [lng, lat] coordinate pairs from tracedPoints.
 * @param markers Mode markers placed by the user during tracing.
 */
export function buildModeSegments(
	points: [number, number][],
	markers: ModeMarker[]
): ModeSegment[] {
	if (points.length < 2) return [];

	// Normalise: sort ascending and add implicit start-marker if absent.
	const sorted = [...markers].sort((a, b) => a.pointIndex - b.pointIndex);

	// Ensure there is always a marker for index 0.
	if (sorted.length === 0 || sorted[0].pointIndex !== 0) {
		sorted.unshift({ pointIndex: 0, mode: 'Walk' });
	}

	const segments: ModeSegment[] = [];

	for (let i = 0; i < sorted.length; i++) {
		const startIdx = sorted[i].pointIndex;
		// End of this segment is the start of the next marker, or the last point.
		const endIdx = i + 1 < sorted.length ? sorted[i + 1].pointIndex : points.length - 1;

		if (endIdx <= startIdx) continue; // degenerate: skip

		const from = points[startIdx];
		const to = points[endIdx];

		if (!from || !to) continue;

		segments.push({
			mode: sorted[i].mode,
			from,
			to
		});
	}

	return segments;
}
