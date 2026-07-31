import type { CursorTelemetryPoint, ZoomFocus } from "../types";
import { interpolateCursorAt } from "../videoPlayback/cursorFollowUtils";

export const MIN_DWELL_DURATION_MS = 300;
export const MAX_DWELL_DURATION_MS = 3200;
export const DWELL_MOVE_THRESHOLD = 0.035;
/** Minimum spacing between two accepted suggestion centres. */
export const SUGGESTION_SPACING_MS = 1800;

function clampFocus(val: number): number {
	return Math.max(0.15, Math.min(0.85, val));
}

export interface ZoomDwellCandidate {
	centerTimeMs: number;
	focus: ZoomFocus;
	strength: number;
}

function normalizeTelemetrySample(
	sample: CursorTelemetryPoint,
	totalMs: number,
): CursorTelemetryPoint {
	return {
		timeMs: Math.max(0, Math.min(sample.timeMs, totalMs)),
		cx: Math.max(0, Math.min(sample.cx, 1)),
		cy: Math.max(0, Math.min(sample.cy, 1)),
	};
}

export function normalizeCursorTelemetry(
	telemetry: CursorTelemetryPoint[],
	totalMs: number,
): CursorTelemetryPoint[] {
	return [...telemetry]
		.filter(
			(sample) =>
				Number.isFinite(sample.timeMs) && Number.isFinite(sample.cx) && Number.isFinite(sample.cy),
		)
		.sort((a, b) => a.timeMs - b.timeMs)
		.map((sample) => normalizeTelemetrySample(sample, totalMs));
}

export function detectZoomDwellCandidates(samples: CursorTelemetryPoint[]): ZoomDwellCandidate[] {
	if (samples.length < 2) {
		return [];
	}

	const dwellCandidates: ZoomDwellCandidate[] = [];
	let runStart = 0;

	const pushRunIfDwell = (startIndex: number, endIndexExclusive: number) => {
		if (endIndexExclusive - startIndex < 2) {
			return;
		}

		const start = samples[startIndex];
		const end = samples[endIndexExclusive - 1];
		const runDuration = end.timeMs - start.timeMs;
		if (runDuration < MIN_DWELL_DURATION_MS || runDuration > MAX_DWELL_DURATION_MS) {
			return;
		}

		const runSamples = samples.slice(startIndex, endIndexExclusive);
		const avgCx = clampFocus(runSamples.reduce((sum, sample) => sum + sample.cx, 0) / runSamples.length);
		const avgCy = clampFocus(runSamples.reduce((sum, sample) => sum + sample.cy, 0) / runSamples.length);

		dwellCandidates.push({
			centerTimeMs: Math.round((start.timeMs + end.timeMs) / 2),
			focus: { cx: avgCx, cy: avgCy },
			strength: runDuration,
		});
	};

	for (let index = 1; index < samples.length; index += 1) {
		const prev = samples[index - 1];
		const curr = samples[index];
		const distance = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);

		if (distance > DWELL_MOVE_THRESHOLD) {
			pushRunIfDwell(runStart, index);
			runStart = index;
		}
	}
	pushRunIfDwell(runStart, samples.length);

	return dwellCandidates;
}
export function isClickInteractionType(sampleOrType: any): boolean {
	if (!sampleOrType) return false;
	if (typeof sampleOrType === "string") {
		const lower = sampleOrType.toLowerCase();
		return (
			lower.includes("click") ||
			lower === "pointer" ||
			lower === "closed-hand" ||
			lower === "pressed" ||
			lower === "down" ||
			lower === "text" ||
			lower === "ibeam" ||
			lower === "typing" ||
			lower === "hand"
		);
	}
	if (typeof sampleOrType === "object") {
		const type = String(sampleOrType.interactionType || sampleOrType.type || "").toLowerCase();
		const cursor = String(sampleOrType.cursorType || "").toLowerCase();
		const isClick = Boolean(sampleOrType.isClick || sampleOrType.pressed || sampleOrType.click);
		return (
			isClick ||
			type.includes("click") ||
			type === "pressed" ||
			type === "down" ||
			type === "text" ||
			type === "ibeam" ||
			type === "typing" ||
			cursor === "pointer" ||
			cursor === "closed-hand" ||
			cursor === "text" ||
			cursor === "ibeam" ||
			cursor === "hand"
		);
	}
	return false;
}

export interface AutoZoomSuggestion {
	span: { start: number; end: number };
	focus: ZoomFocus;
}

export function buildAutoZoomSuggestions(options: {
	cursorTelemetry: CursorTelemetryPoint[];
	cursorClickTimestamps?: number[];
	totalMs: number;
	existingRegions: { startMs: number; endMs: number }[];
	defaultDurationMs: number;
}): AutoZoomSuggestion[] {
	const {
		cursorTelemetry,
		cursorClickTimestamps = [],
		totalMs,
		existingRegions,
		defaultDurationMs,
	} = options;
	if (totalMs <= 0) {
		return [];
	}

	const defaultDuration = Math.min(defaultDurationMs > 0 ? defaultDurationMs : 2800, totalMs);
	if (defaultDuration <= 0) {
		return [];
	}

	const normalizedSamples = normalizeCursorTelemetry(cursorTelemetry, totalMs);

	// 1. Detect continuous active interaction sessions (clicks, typing, pointer movements)
	// Keeps camera zoomed throughout the entire typing/activity sequence!
	const eventPoints: Array<{ timeMs: number; cx: number; cy: number }> = [];

	for (const clickMs of cursorClickTimestamps) {
		if (clickMs > 0 && clickMs < totalMs) {
			const focus = interpolateCursorAt(normalizedSamples, clickMs) ?? { cx: 0.5, cy: 0.5 };
			eventPoints.push({ timeMs: clickMs, cx: clampFocus(focus.cx), cy: clampFocus(focus.cy) });
		}
	}

	for (const s of normalizedSamples) {
		const cursorTypeStr = String(s.cursorType || "").toLowerCase();
		const isClickOrTyping =
			isClickInteractionType(s) ||
			cursorTypeStr === "text" ||
			cursorTypeStr === "ibeam" ||
			s.interactionType === "typing";

		if (isClickOrTyping) {
			eventPoints.push({ timeMs: s.timeMs, cx: clampFocus(s.cx), cy: clampFocus(s.cy) });
		}
	}

	const candidates: Array<{ startMs: number; endMs: number; focus: ZoomFocus; strength: number }> = [];

	if (eventPoints.length > 0) {
		eventPoints.sort((a, b) => a.timeMs - b.timeMs);
		let currentCluster: typeof eventPoints = [eventPoints[0]];

		for (let i = 1; i < eventPoints.length; i++) {
			const prev = currentCluster[currentCluster.length - 1];
			const curr = eventPoints[i];

			if (curr.timeMs - prev.timeMs <= 3000) {
				currentCluster.push(curr);
			} else {
				const start = Math.max(0, Math.round(currentCluster[0].timeMs - 500));
				const lastTime = currentCluster[currentCluster.length - 1].timeMs;
				const end = Math.min(totalMs, Math.round(lastTime + 2200));

				const avgCx = clampFocus(
					currentCluster.reduce((sum, p) => sum + p.cx, 0) / currentCluster.length
				);
				const avgCy = clampFocus(
					currentCluster.reduce((sum, p) => sum + p.cy, 0) / currentCluster.length
				);

				candidates.push({
					startMs: start,
					endMs: Math.max(end, start + Math.max(defaultDuration, 2800)),
					focus: { cx: avgCx, cy: avgCy },
					strength: 100000 + currentCluster.length * 100,
				});

				currentCluster = [curr];
			}
		}

		if (currentCluster.length > 0) {
			const start = Math.max(0, Math.round(currentCluster[0].timeMs - 500));
			const lastTime = currentCluster[currentCluster.length - 1].timeMs;
			const end = Math.min(totalMs, Math.round(lastTime + 2200));

			const avgCx = clampFocus(
				currentCluster.reduce((sum, p) => sum + p.cx, 0) / currentCluster.length
			);
			const avgCy = clampFocus(
				currentCluster.reduce((sum, p) => sum + p.cy, 0) / currentCluster.length
			);

			candidates.push({
				startMs: start,
				endMs: Math.max(end, start + Math.max(defaultDuration, 2800)),
				focus: { cx: avgCx, cy: avgCy },
				strength: 100000 + currentCluster.length * 100,
			});
		}
	}

	// 2. Add hover dwell candidates if no active click/typing clusters cover them
	if (normalizedSamples.length >= 2) {
		const dwells = detectZoomDwellCandidates(normalizedSamples);
		for (const dwell of dwells) {
			const start = Math.max(0, Math.round(dwell.centerTimeMs - defaultDuration / 2));
			const end = Math.min(totalMs, Math.round(dwell.centerTimeMs + defaultDuration / 2));
			const coveredByCluster = candidates.some(
				(c) => start < c.endMs && end > c.startMs
			);
			if (!coveredByCluster) {
				candidates.push({
					startMs: start,
					endMs: end,
					focus: dwell.focus,
					strength: dwell.strength,
				});
			}
		}
	}

	const reservedSpans = existingRegions
		.map((region) => ({ start: region.startMs, end: region.endMs }))
		.sort((a, b) => a.start - b.start);

	const sortedCandidates = [...candidates].sort((a, b) => b.strength - a.strength);
	const suggestions: AutoZoomSuggestion[] = [];

	for (const candidate of sortedCandidates) {
		const candidateStart = Math.max(0, Math.min(candidate.startMs, totalMs - 500));
		const candidateEnd = Math.min(totalMs, candidate.endMs);
		if (candidateEnd <= candidateStart) continue;

		const hasOverlap = reservedSpans.some(
			(span) => candidateEnd > span.start && candidateStart < span.end,
		);
		if (hasOverlap) {
			continue;
		}

		reservedSpans.push({ start: candidateStart, end: candidateEnd });
		suggestions.push({
			span: { start: candidateStart, end: candidateEnd },
			focus: candidate.focus,
		});
	}

	return suggestions.sort((a, b) => a.span.start - b.span.start);
}
