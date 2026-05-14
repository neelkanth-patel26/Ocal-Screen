import { describe, expect, it } from "vitest";

import {
	captionSegmentsToAnnotationRegions,
	groupPhraseCaptionSegmentsIntoLines,
	groupTimedCaptionWordsIntoLines,
	reconcileAutoCaptionTimelineGaps,
} from "./annotationsFromCaptions";

describe("groupPhraseCaptionSegmentsIntoLines", () => {
	it("preserves phrase boundaries when formatting phrase-timestamp captions", () => {
		const lines = groupPhraseCaptionSegmentsIntoLines(
			[
				{ startSec: 0, endSec: 0.5, text: "alpha beta" },
				{ startSec: 0.62, endSec: 1.6, text: "gamma delta" },
			],
			2,
			2,
		);

		expect(lines).toHaveLength(2);
		expect(lines[0]).toMatchObject({ text: "alpha beta", startSec: 0 });
		expect(lines[1]).toMatchObject({ text: "gamma delta", startSec: 0.62 });
		expect(lines[0]!.endSec).toBeLessThanOrEqual(0.62);
	});

	it("wraps a single phrase into multiple visual lines without inventing extra timing regions", () => {
		const lines = groupPhraseCaptionSegmentsIntoLines(
			[{ startSec: 0, endSec: 1, text: "alpha beta gamma delta" }],
			2,
			2,
		);

		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({
			startSec: 0,
			endSec: 1,
			text: "alpha beta\ngamma delta",
		});
	});
});

describe("captionSegmentsToAnnotationRegions", () => {
	it("uses raw phrase timing instead of shifting caption boundaries", () => {
		const { regions } = captionSegmentsToAnnotationRegions(
			[
				{ startSec: 0, endSec: 0.5, text: "first second" },
				{ startSec: 0.62, endSec: 1.2, text: "third fourth" },
			],
			1,
			1,
			{ minWordsPerCaption: 2, maxWordsPerCaption: 2, timestampGranularity: "phrase" },
		);

		expect(regions).toHaveLength(2);
		expect(regions[0]).toMatchObject({ startMs: 0, endMs: 500 });
		expect(regions[1]).toMatchObject({ startMs: 620, endMs: 1200 });
	});

	it("preserves empty timeline space when word timestamps contain a real pause", () => {
		const lines = groupTimedCaptionWordsIntoLines(
			[
				{ startSec: 0, endSec: 0.12, text: "first" },
				{ startSec: 0.13, endSec: 0.28, text: "caption" },
				{ startSec: 0.7, endSec: 0.83, text: "second" },
				{ startSec: 0.84, endSec: 0.98, text: "caption" },
			],
			2,
			2,
		);

		expect(lines).toHaveLength(2);
		expect(lines[0]).toMatchObject({ startSec: 0, endSec: 0.28, text: "first caption" });
		expect(lines[1]).toMatchObject({ startSec: 0.7, endSec: 0.98, text: "second caption" });
	});
});

describe("reconcileAutoCaptionTimelineGaps", () => {
	it("does not change regions when the minimum enforced gap is zero", () => {
		const regions = reconcileAutoCaptionTimelineGaps([
			{
				id: "annotation-1",
				startMs: 0,
				endMs: 120,
				type: "text",
				content: "one",
				annotationSource: "auto-caption",
				position: { x: 0, y: 0 },
				size: { width: 10, height: 10 },
				style: {
					color: "#fff",
					backgroundColor: "transparent",
					fontSize: 24,
					fontFamily: "Inter",
					fontWeight: "normal",
					fontStyle: "normal",
					textDecoration: "none",
					textAlign: "center",
				},
				zIndex: 1,
			},
			{
				id: "manual-1",
				startMs: 50,
				endMs: 1000,
				type: "text",
				content: "manual",
				position: { x: 10, y: 10 },
				size: { width: 10, height: 10 },
				style: {
					color: "#fff",
					backgroundColor: "transparent",
					fontSize: 24,
					fontFamily: "Inter",
					fontWeight: "normal",
					fontStyle: "normal",
					textDecoration: "none",
					textAlign: "center",
				},
				zIndex: 2,
			},
			{
				id: "annotation-2",
				startMs: 130,
				endMs: 300,
				type: "text",
				content: "two",
				annotationSource: "auto-caption",
				position: { x: 0, y: 0 },
				size: { width: 10, height: 10 },
				style: {
					color: "#fff",
					backgroundColor: "transparent",
					fontSize: 24,
					fontFamily: "Inter",
					fontWeight: "normal",
					fontStyle: "normal",
					textDecoration: "none",
					textAlign: "center",
				},
				zIndex: 3,
			},
		]);

		expect(regions.find((r) => r.id === "manual-1")).toMatchObject({
			startMs: 50,
			endMs: 1000,
		});
		expect(regions.find((r) => r.id === "annotation-1")).toMatchObject({
			startMs: 0,
			endMs: 120,
		});
		expect(regions.find((r) => r.id === "annotation-2")).toMatchObject({
			startMs: 130,
			endMs: 300,
		});
	});
});
