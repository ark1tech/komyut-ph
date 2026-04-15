import { describe, expect, it } from 'vitest';
import { buildModeSegments, type ModeMarker } from './buildModeSegments';

describe('buildModeSegments', () => {
	it('adds implicit Walk marker at index 0 and emits index boundaries', () => {
		const points: [number, number][] = [
			[120.98, 14.59],
			[120.99, 14.6],
			[121.0, 14.61],
			[121.01, 14.62]
		];
		const markers: ModeMarker[] = [{ pointIndex: 2, mode: 'Jeepney' }];

		const segments = buildModeSegments(points, markers);

		expect(segments).toEqual([
			{
				mode: 'Walk',
				from: [120.98, 14.59],
				to: [121.0, 14.61],
				start_index: 0,
				end_index: 2
			},
			{
				mode: 'Jeepney',
				from: [121.0, 14.61],
				to: [121.01, 14.62],
				start_index: 2,
				end_index: 3
			}
		]);
	});

	it('returns empty for traces with fewer than 2 points', () => {
		expect(buildModeSegments([], [])).toEqual([]);
		expect(buildModeSegments([[120.98, 14.59]], [])).toEqual([]);
	});
});
