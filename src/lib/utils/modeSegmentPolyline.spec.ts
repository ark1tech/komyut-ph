import { describe, expect, it } from 'vitest';
import {
	distanceAlongPolylineToPoint,
	modeSegmentDistanceIntervalOnPolyline,
	slicePolylineByDistanceInterval,
	totalPolylineLengthM
} from './modeSegmentPolyline';

/** Three collinear-ish points: start, middle (detour closer in 2D to "from" than path order), end. */
const zig: [number, number][] = [
	[121.05, 14.65],
	[121.051, 14.651],
	[121.052, 14.652]
];

describe('modeSegmentPolyline', () => {
	it('uses path distance so projection is along the polyline order', () => {
		const total = totalPolylineLengthM(zig);
		expect(total).toBeGreaterThan(0);
		const d0 = distanceAlongPolylineToPoint(zig, zig[0]!);
		const dMid = distanceAlongPolylineToPoint(zig, zig[1]!);
		expect(d0).toBeLessThanOrEqual(1);
		expect(dMid).toBeGreaterThan(d0);
		expect(dMid).toBeLessThan(total);
	});

	it('mode segment interval stays within path bounds of from/to', () => {
		const { lo, hi } = modeSegmentDistanceIntervalOnPolyline(zig, zig[0]!, zig[2]!);
		expect(lo).toBeGreaterThanOrEqual(0);
		expect(hi).toBeLessThanOrEqual(totalPolylineLengthM(zig) + 0.01);
		expect(hi).toBeGreaterThan(lo);
	});

	it('slicePolylineByDistanceInterval returns endpoints within interval only', () => {
		const { lo, hi } = modeSegmentDistanceIntervalOnPolyline(zig, zig[0]!, zig[2]!);
		const sliced = slicePolylineByDistanceInterval(zig, lo, hi);
		expect(sliced).not.toBeNull();
		expect(sliced!.length).toBeGreaterThanOrEqual(2);
	});
});
