import { describe, expect, it } from "vitest";
import { AUTO_FOLLOW_PARAMS } from "../videoPlayback/constants";
import { adaptiveSmoothFactor, advanceFollowFocus } from "../videoPlayback/cursorFollowUtils";
import { buildAutoZoomSuggestions, calculateFramingFocus } from "./zoomSuggestionUtils";

describe("zoomSuggestionUtils & cursorFollowUtils", () => {
	describe("calculateFramingFocus", () => {
		it("calculates predictive framing keeping bounds and applying intent bias", () => {
			const focus = calculateFramingFocus(0.2, 0.2, 2.0, "predictive", "click");
			expect(focus.cx).toBeGreaterThan(0.2);
			expect(focus.cy).toBeGreaterThan(0.2);
			expect(focus.cx).toBeLessThanOrEqual(0.75);
			expect(focus.cy).toBeLessThanOrEqual(0.75);
		});

		it("centers text input with vertical reading comfort in predictive mode", () => {
			const focus = calculateFramingFocus(0.5, 0.5, 2.0, "predictive", "text-input");
			expect(focus.cy).toBeLessThan(0.5); // Slightly raised for reading
			expect(focus.cx).toBeCloseTo(0.5, 2);
		});

		it("clamps properly within safe viewport bounds", () => {
			const focus = calculateFramingFocus(0.01, 0.01, 2.0, "rule-of-thirds");
			expect(focus.cx).toBeGreaterThanOrEqual(0.25);
			expect(focus.cy).toBeGreaterThanOrEqual(0.25);
		});
	});

	describe("advanceFollowFocus", () => {
		it("applies soft deadzone damping for micro-movements to eliminate camera jitter", () => {
			const prev = { cx: 0.5, cy: 0.5 };
			const rawMicro = { cx: 0.505, cy: 0.505 }; // Tiny movement within deadzone (0.007 dist < 0.012)
			const factorMicro = adaptiveSmoothFactor(rawMicro, prev, 0.1, 0.25, 0.15, 0.012);
			const rawLarge = { cx: 0.55, cy: 0.55 }; // Large intentional movement
			const factorLarge = adaptiveSmoothFactor(rawLarge, prev, 0.1, 0.25, 0.15, 0.012);

			expect(factorMicro).toBeLessThan(factorLarge);
		});

		it("smoothly advances focus with predictive velocity lead", () => {
			const prev = { cx: 0.5, cy: 0.5 };
			const raw = { cx: 0.55, cy: 0.52 };
			const result = advanceFollowFocus(prev, raw, 16.6, AUTO_FOLLOW_PARAMS);

			expect(result.cx).toBeGreaterThan(prev.cx);
			expect(result.cy).toBeGreaterThan(prev.cy);
		});

		it("returns prev position if dtMs is 0 or negative (paused)", () => {
			const prev = { cx: 0.4, cy: 0.4 };
			const raw = { cx: 0.8, cy: 0.8 };
			const result = advanceFollowFocus(prev, raw, 0, AUTO_FOLLOW_PARAMS);
			expect(result).toEqual(prev);
		});
	});

	describe("buildAutoZoomSuggestions", () => {
		it("generates coherent zoom suggestions from click interaction telemetry", () => {
			const telemetry = [
				{ timeMs: 0, cx: 0.3, cy: 0.3 },
				{ timeMs: 500, cx: 0.3, cy: 0.3, interactionType: "click", isClick: true },
				{ timeMs: 1000, cx: 0.31, cy: 0.3 },
				{ timeMs: 4000, cx: 0.7, cy: 0.7 },
				{ timeMs: 4500, cx: 0.7, cy: 0.7, interactionType: "typing" },
				{ timeMs: 5000, cx: 0.71, cy: 0.7 },
			];

			const suggestions = buildAutoZoomSuggestions({
				cursorTelemetry: telemetry,
				cursorClickTimestamps: [500],
				totalMs: 8000,
				existingRegions: [],
				defaultDurationMs: 2500,
				intensity: "cinematic",
				framing: "predictive",
			});

			expect(suggestions.length).toBeGreaterThanOrEqual(1);
			expect(suggestions[0].customScale).toBeDefined();
			expect(suggestions[0].span.start).toBeLessThan(500);
			expect(suggestions[0].span.end).toBeGreaterThan(500);
		});

		it("divides multiple events into separate zoom clips across the timeline", () => {
			const telemetry = [
				{ timeMs: 0, cx: 0.2, cy: 0.2 },
				// Event 1: Click at 800ms
				{ timeMs: 800, cx: 0.2, cy: 0.2, interactionType: "click", isClick: true },
				{ timeMs: 1200, cx: 0.22, cy: 0.2 },
				// Event 2: Button Hover at 3200ms
				{ timeMs: 3000, cx: 0.7, cy: 0.4, cursorType: "pointer" },
				{ timeMs: 3200, cx: 0.7, cy: 0.4, cursorType: "pointer" },
				{ timeMs: 3500, cx: 0.7, cy: 0.4, cursorType: "pointer" },
				// Event 3: Action at 5800ms
				{ timeMs: 5600, cx: 0.4, cy: 0.8 },
				{ timeMs: 5800, cx: 0.4, cy: 0.8, interactionType: "click", isClick: true },
				{ timeMs: 6200, cx: 0.4, cy: 0.8 },
				{ timeMs: 7000, cx: 0.4, cy: 0.8 },
			];

			const suggestions = buildAutoZoomSuggestions({
				cursorTelemetry: telemetry,
				cursorClickTimestamps: [800, 5800],
				totalMs: 7500,
				existingRegions: [],
				defaultDurationMs: 2000,
				intensity: "balanced",
				framing: "rule-of-thirds",
			});

			// Must detect multiple distinct clips across the timeline
			expect(suggestions.length).toBeGreaterThanOrEqual(2);

			// First clip encompasses event 1
			expect(suggestions[0].span.start).toBeLessThanOrEqual(800);
			expect(suggestions[0].span.end).toBeGreaterThanOrEqual(800);

			// Later clip covers the late event around 5800ms
			const lateSuggestion = suggestions.find((s) => s.span.start <= 5800 && s.span.end >= 5800);
			expect(lateSuggestion).toBeDefined();

			// Clean separation between sequential clips
			for (let i = 1; i < suggestions.length; i++) {
				expect(suggestions[i].span.start).toBeGreaterThanOrEqual(suggestions[i - 1].span.end);
			}
		});

		it("merges multiple actions in the same area into one continuous zoom clip", () => {
			const telemetry = [
				{ timeMs: 0, cx: 0.3, cy: 0.3 },
				// Action 1 in menu (0.3, 0.3)
				{ timeMs: 600, cx: 0.3, cy: 0.3, interactionType: "click", isClick: true },
				{ timeMs: 1200, cx: 0.31, cy: 0.3 },
				// Action 2 in same menu (0.32, 0.33) 1.5s later
				{ timeMs: 2100, cx: 0.32, cy: 0.33, interactionType: "click", isClick: true },
				{ timeMs: 2700, cx: 0.31, cy: 0.32 },
				// Action 3 in same menu (0.33, 0.34) 1.5s later
				{ timeMs: 3800, cx: 0.33, cy: 0.34, interactionType: "click", isClick: true },
				{ timeMs: 4400, cx: 0.32, cy: 0.32 },
			];

			const suggestions = buildAutoZoomSuggestions({
				cursorTelemetry: telemetry,
				cursorClickTimestamps: [600, 2100, 3800],
				totalMs: 8000,
				existingRegions: [],
				defaultDurationMs: 2000,
				intensity: "balanced",
				framing: "rule-of-thirds",
			});

			// Since all 3 actions are in the same menu/area, keep it as ONE smooth zoom clip
			expect(suggestions.length).toBe(1);
			expect(suggestions[0].span.start).toBeLessThanOrEqual(600);
			expect(suggestions[0].span.end).toBeGreaterThanOrEqual(3800);
		});
	});
});
