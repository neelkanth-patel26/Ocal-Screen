import type { CursorTelemetryPoint, ZoomFocus } from "../types";
import { interpolateCursorAt } from "../videoPlayback/cursorFollowUtils";

export const MIN_DWELL_DURATION_MS = 300;
/** Extended to 8 s so long typing / input sessions stay in one dwell window. */
export const MAX_DWELL_DURATION_MS = 8000;
/** Radius threshold for spatial dispersion clustering. */
export const DWELL_MOVE_THRESHOLD = 0.08;
/** Minimum spacing between two accepted suggestion centres. */
export const SUGGESTION_SPACING_MS = 1000;

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
		...sample,
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
		const avgCx = clampFocus(
			runSamples.reduce((sum, sample) => sum + sample.cx, 0) / runSamples.length,
		);
		const avgCy = clampFocus(
			runSamples.reduce((sum, sample) => sum + sample.cy, 0) / runSamples.length,
		);

		dwellCandidates.push({
			centerTimeMs: Math.round((start.timeMs + end.timeMs) / 2),
			focus: { cx: avgCx, cy: avgCy },
			strength: runDuration,
		});
	};

	let minX = samples[0].cx;
	let maxX = samples[0].cx;
	let minY = samples[0].cy;
	let maxY = samples[0].cy;

	for (let index = 1; index < samples.length; index += 1) {
		const curr = samples[index];
		minX = Math.min(minX, curr.cx);
		maxX = Math.max(maxX, curr.cx);
		minY = Math.min(minY, curr.cy);
		maxY = Math.max(maxY, curr.cy);

		const boundingRadius = Math.max(maxX - minX, maxY - minY);

		if (boundingRadius > DWELL_MOVE_THRESHOLD) {
			pushRunIfDwell(runStart, index);
			runStart = index;
			minX = curr.cx;
			maxX = curr.cx;
			minY = curr.cy;
			maxY = curr.cy;
		}
	}
	pushRunIfDwell(runStart, samples.length);

	return dwellCandidates;
}

export function isClickInteractionType(sampleOrType: unknown): boolean {
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
	if (typeof sampleOrType === "object" && sampleOrType !== null) {
		const obj = sampleOrType as Record<string, unknown>;
		const type = String(obj.interactionType || obj.type || "").toLowerCase();
		const cursor = String(obj.cursorType || "").toLowerCase();
		const isClickOrKey = Boolean(
			obj.isClick ||
				obj.isDoubleClick ||
				obj.isTripleClick ||
				obj.isKeyboardAction ||
				obj.isInputFocus,
		);
		return (
			isClickOrKey ||
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
	customScale?: number;
	intent?: "text-input" | "click" | "dwell" | "flow";
}

/**
 * Calculates balanced framing using the Rule of Thirds and Margin Guardian,
 * ensuring the zoomed camera viewport stays comfortably within video bounds
 * while keeping essential context (menus, fields) in frame.
 */
function calculateFramingFocus(cx: number, cy: number, scale: number): ZoomFocus {
	const halfWidth = 0.5 / scale;
	const halfHeight = 0.5 / scale;
	const margin = 0.03;
	const minX = halfWidth + margin;
	const maxX = 1 - halfWidth - margin;
	const minY = halfHeight + margin;
	const maxY = 1 - halfHeight - margin;

	let framedX = cx;
	let framedY = cy;

	// Rule of Thirds contextual bias: leave breathing room for dropdowns/menus below top targets
	if (cy < 0.4) {
		framedY = Math.min(maxY, cy + 0.04);
	} else if (cy > 0.6) {
		framedY = Math.max(minY, cy - 0.04);
	}

	if (cx < 0.4) {
		framedX = Math.min(maxX, cx + 0.04);
	} else if (cx > 0.6) {
		framedX = Math.max(minX, cx - 0.04);
	}

	return {
		cx: Math.max(minX, Math.min(maxX, framedX)),
		cy: Math.max(minY, Math.min(maxY, framedY)),
	};
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

	// 1. Detect all active interaction points with intent tagging
	interface DetectedPoint {
		timeMs: number;
		cx: number;
		cy: number;
		intent: "text-input" | "click" | "action";
	}

	const eventPoints: DetectedPoint[] = [];

	for (const clickMs of cursorClickTimestamps) {
		if (clickMs > 0 && clickMs < totalMs) {
			const focus = interpolateCursorAt(normalizedSamples, clickMs) ?? { cx: 0.5, cy: 0.5 };
			eventPoints.push({
				timeMs: clickMs,
				cx: clampFocus(focus.cx),
				cy: clampFocus(focus.cy),
				intent: "click",
			});
		}
	}

	for (const s of normalizedSamples) {
		const cursorTypeStr = String(s.cursorType || "").toLowerCase();
		const isText =
			cursorTypeStr === "text" ||
			cursorTypeStr === "ibeam" ||
			s.interactionType === "typing" ||
			s.interactionType === "text";
		const isClick = isClickInteractionType(s) || s.interactionType === "click";

		if (isText) {
			eventPoints.push({
				timeMs: s.timeMs,
				cx: clampFocus(s.cx),
				cy: clampFocus(s.cy),
				intent: "text-input",
			});
		} else if (isClick) {
			eventPoints.push({
				timeMs: s.timeMs,
				cx: clampFocus(s.cx),
				cy: clampFocus(s.cy),
				intent: "click",
			});
		}
	}

	const candidates: Array<{
		startMs: number;
		endMs: number;
		focus: ZoomFocus;
		strength: number;
		customScale: number;
		intent: "text-input" | "click" | "dwell" | "flow";
	}> = [];

	if (eventPoints.length > 0) {
		eventPoints.sort((a, b) => a.timeMs - b.timeMs);

		// Cluster fusion: combine nearby temporal events into coherent interaction shots
		let currentCluster: DetectedPoint[] = [eventPoints[0]];

		for (let i = 1; i < eventPoints.length; i++) {
			const prev = currentCluster[currentCluster.length - 1];
			const curr = eventPoints[i];
			const dt = curr.timeMs - prev.timeMs;
			const dx = curr.cx - prev.cx;
			const dy = curr.cy - prev.cy;
			const dist = Math.sqrt(dx * dx + dy * dy);

			// Fuse if close in time (<= 3800ms) and within related screen area (<= 0.42), or very rapid (<= 1500ms)
			const shouldFuse = dt <= 1500 || (dt <= 3800 && dist <= 0.42);

			if (shouldFuse) {
				currentCluster.push(curr);
			} else {
				const hasTextInput = currentCluster.some((p) => p.intent === "text-input");
				const isMultiActionFlow = currentCluster.length >= 3;

				let intent: "text-input" | "click" | "flow" = "click";
				let targetScale = 1.55;
				let preRoll = 420;
				let postHold = 2000;

				if (hasTextInput) {
					intent = "text-input";
					targetScale = 1.85; // Deep zoom on typing & form fields
					preRoll = 500;
					postHold = 2500;
				} else if (isMultiActionFlow) {
					intent = "flow";
					targetScale = 1.38; // Medium balanced zoom for multi-step workflows
					preRoll = 450;
					postHold = 2200;
				}

				const start = Math.max(0, Math.round(currentCluster[0].timeMs - preRoll));
				const lastTime = currentCluster[currentCluster.length - 1].timeMs;
				const end = Math.min(totalMs, Math.round(lastTime + postHold));

				const rawCx = currentCluster.reduce((sum, p) => sum + p.cx, 0) / currentCluster.length;
				const rawCy = currentCluster.reduce((sum, p) => sum + p.cy, 0) / currentCluster.length;

				const framedFocus = calculateFramingFocus(rawCx, rawCy, targetScale);

				candidates.push({
					startMs: start,
					endMs: Math.max(end, start + Math.max(defaultDuration, 2400)),
					focus: framedFocus,
					strength: 100000 + currentCluster.length * 100 + (hasTextInput ? 500 : 0),
					customScale: targetScale,
					intent,
				});

				currentCluster = [curr];
			}
		}

		if (currentCluster.length > 0) {
			const hasTextInput = currentCluster.some((p) => p.intent === "text-input");
			const isMultiActionFlow = currentCluster.length >= 3;

			let intent: "text-input" | "click" | "flow" = "click";
			let targetScale = 1.55;
			let preRoll = 420;
			let postHold = 2000;

			if (hasTextInput) {
				intent = "text-input";
				targetScale = 1.85;
				preRoll = 500;
				postHold = 2500;
			} else if (isMultiActionFlow) {
				intent = "flow";
				targetScale = 1.38;
				preRoll = 450;
				postHold = 2200;
			}

			const start = Math.max(0, Math.round(currentCluster[0].timeMs - preRoll));
			const lastTime = currentCluster[currentCluster.length - 1].timeMs;
			const end = Math.min(totalMs, Math.round(lastTime + postHold));

			const rawCx = currentCluster.reduce((sum, p) => sum + p.cx, 0) / currentCluster.length;
			const rawCy = currentCluster.reduce((sum, p) => sum + p.cy, 0) / currentCluster.length;

			const framedFocus = calculateFramingFocus(rawCx, rawCy, targetScale);

			candidates.push({
				startMs: start,
				endMs: Math.max(end, start + Math.max(defaultDuration, 2400)),
				focus: framedFocus,
				strength: 100000 + currentCluster.length * 100 + (hasTextInput ? 500 : 0),
				customScale: targetScale,
				intent,
			});
		}
	}

	// 2. Add dwell candidates (focused reading / observation areas)
	if (normalizedSamples.length >= 2) {
		const dwells = detectZoomDwellCandidates(normalizedSamples);
		for (const dwell of dwells) {
			const start = Math.max(0, Math.round(dwell.centerTimeMs - defaultDuration / 2));
			const end = Math.min(totalMs, Math.round(dwell.centerTimeMs + defaultDuration / 2));
			const coveredByCluster = candidates.some((c) => start < c.endMs && end > c.startMs);
			if (!coveredByCluster) {
				const dwellScale = 1.42;
				const framed = calculateFramingFocus(dwell.focus.cx, dwell.focus.cy, dwellScale);
				candidates.push({
					startMs: start,
					endMs: end,
					focus: framed,
					strength: dwell.strength,
					customScale: dwellScale,
					intent: "dwell",
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

		// Anti-ping-pong: ensure at least 600ms spacing between distinct zooms
		const MIN_ZOOM_GAP_MS = 600;
		const hasOverlap = reservedSpans.some(
			(span) =>
				candidateEnd + MIN_ZOOM_GAP_MS > span.start && candidateStart - MIN_ZOOM_GAP_MS < span.end,
		);
		if (hasOverlap) {
			continue;
		}

		reservedSpans.push({ start: candidateStart, end: candidateEnd });
		suggestions.push({
			span: { start: candidateStart, end: candidateEnd },
			focus: candidate.focus,
			customScale: candidate.customScale,
			intent: candidate.intent,
		});
	}

	return suggestions.sort((a, b) => a.span.start - b.span.start);
}
