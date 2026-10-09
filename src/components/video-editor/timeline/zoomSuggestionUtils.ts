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
		return lower.includes("click") || lower.includes("down") || lower === "pressed";
	}
	if (typeof sampleOrType === "object" && sampleOrType !== null) {
		const obj = sampleOrType as Record<string, unknown>;
		const type = String(obj.interactionType || obj.type || "").toLowerCase();
		const isClickOrPress = Boolean(
			obj.isClick ||
				obj.isDoubleClick ||
				obj.isTripleClick ||
				obj.leftButtonPressed ||
				obj.leftButtonDown ||
				obj.leftPressed ||
				obj.leftDown ||
				obj.isMouseDown ||
				obj.isMouseClick,
		);
		return isClickOrPress || type.includes("click") || type.includes("down") || type === "pressed";
	}
	return false;
}

export function isInteractiveHoverType(sample: CursorTelemetryPoint): boolean {
	const cType = String(sample.cursorType || "").toLowerCase();
	const iType = String(sample.interactionType || "").toLowerCase();
	return (
		cType === "pointer" ||
		cType === "open-hand" ||
		cType === "closed-hand" ||
		cType === "crosshair" ||
		iType === "pointer" ||
		iType === "hover"
	);
}

export function isTypingInteractionType(sample: CursorTelemetryPoint): boolean {
	const cType = String(sample.cursorType || "").toLowerCase();
	const iType = String(sample.interactionType || "").toLowerCase();
	return cType === "text" || cType === "ibeam" || iType === "typing" || iType === "text";
}

export interface AutoZoomSuggestion {
	span: { start: number; end: number };
	focus: ZoomFocus;
	customScale?: number;
	intent?: "text-input" | "click" | "dwell" | "flow";
}

export type AutoZoomIntensity = "subtle" | "balanced" | "cinematic";
export type AutoZoomFraming = "rule-of-thirds" | "centered" | "predictive";

/**
 * Calculates balanced framing using the Rule of Thirds, Margin Guardian,
 * and AI Predictive Lead, ensuring the zoomed camera viewport stays comfortably
 * within video bounds while keeping essential context (menus, fields) in frame.
 */
export function calculateFramingFocus(
	cx: number,
	cy: number,
	scale: number,
	framing: AutoZoomFraming = "rule-of-thirds",
	intent?: "text-input" | "click" | "dwell" | "flow",
): ZoomFocus {
	const halfWidth = 0.5 / scale;
	const halfHeight = 0.5 / scale;
	const margin = 0.035;
	const minX = halfWidth + margin;
	const maxX = 1 - halfWidth - margin;
	const minY = halfHeight + margin;
	const maxY = 1 - halfHeight - margin;

	let framedX = cx;
	let framedY = cy;

	// Enhanced Context-Aware Adaptive Framing
	if (framing === "predictive") {
		if (intent === "text-input") {
			// Center text field slightly above viewport center for reading comfort
			framedY = Math.max(minY, Math.min(maxY, cy - 0.03));
		} else {
			// Dynamic breathing room for drop-downs / context menus
			if (cy < 0.38) {
				framedY = Math.min(maxY, cy + 0.055);
			} else if (cy > 0.62) {
				framedY = Math.max(minY, cy - 0.055);
			}
			if (cx < 0.38) {
				framedX = Math.min(maxX, cx + 0.055);
			} else if (cx > 0.62) {
				framedX = Math.max(minX, cx - 0.055);
			}
		}
	} else if (framing === "rule-of-thirds") {
		if (intent === "text-input") {
			framedY = Math.max(minY, Math.min(maxY, cy - 0.035));
		} else {
			if (cy < 0.4) {
				framedY = Math.min(maxY, cy + 0.045);
			} else if (cy > 0.6) {
				framedY = Math.max(minY, cy - 0.045);
			}

			if (cx < 0.4) {
				framedX = Math.min(maxX, cx + 0.045);
			} else if (cx > 0.6) {
				framedX = Math.max(minX, cx - 0.045);
			}
		}
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
	intensity?: AutoZoomIntensity;
	framing?: AutoZoomFraming;
}): AutoZoomSuggestion[] {
	const {
		cursorTelemetry,
		cursorClickTimestamps = [],
		totalMs,
		existingRegions,
		defaultDurationMs,
		intensity = "balanced",
		framing = "rule-of-thirds",
	} = options;
	if (totalMs <= 0) {
		return [];
	}

	const defaultDuration = Math.min(defaultDurationMs > 0 ? defaultDurationMs : 2800, totalMs);
	if (defaultDuration <= 0) {
		return [];
	}

	const normalizedSamples = normalizeCursorTelemetry(cursorTelemetry, totalMs);

	// Scale multipliers based on chosen intensity preset
	const intensityMultipliers = {
		subtle: { click: 1.35, text: 1.55, flow: 1.25, dwell: 1.3 },
		balanced: { click: 1.55, text: 1.85, flow: 1.38, dwell: 1.45 },
		cinematic: { click: 1.75, text: 2.15, flow: 1.5, dwell: 1.6 },
	}[intensity] ?? { click: 1.55, text: 1.85, flow: 1.38, dwell: 1.45 };

	// 1. Gather distinct click events
	interface ClickPoint {
		timeMs: number;
		cx: number;
		cy: number;
	}

	const rawClicks: ClickPoint[] = [];
	const seenClickTimes = new Set<number>();

	for (const clickMs of cursorClickTimestamps) {
		if (clickMs > 0 && clickMs < totalMs) {
			const rounded = Math.round(clickMs / 50) * 50;
			if (!seenClickTimes.has(rounded)) {
				seenClickTimes.add(rounded);
				const focus = interpolateCursorAt(normalizedSamples, clickMs) ?? { cx: 0.5, cy: 0.5 };
				rawClicks.push({
					timeMs: clickMs,
					cx: clampFocus(focus.cx),
					cy: clampFocus(focus.cy),
				});
			}
		}
	}

	for (const s of normalizedSamples) {
		if (isClickInteractionType(s)) {
			const rounded = Math.round(s.timeMs / 50) * 50;
			if (!seenClickTimes.has(rounded)) {
				seenClickTimes.add(rounded);
				rawClicks.push({
					timeMs: s.timeMs,
					cx: clampFocus(s.cx),
					cy: clampFocus(s.cy),
				});
			}
		}
	}

	rawClicks.sort((a, b) => a.timeMs - b.timeMs);

	interface ZoomCandidate {
		peakTimeMs: number;
		startMs: number;
		endMs: number;
		focus: ZoomFocus;
		strength: number;
		customScale: number;
		intent: "text-input" | "click" | "dwell" | "flow";
	}

	const candidates: ZoomCandidate[] = [];

	// 1. Clicks (High priority action events)
	if (rawClicks.length > 0) {
		let currentClickGroup: ClickPoint[] = [rawClicks[0]];

		const emitClickCandidate = (group: ClickPoint[]) => {
			if (group.length === 0) return;
			const firstTime = group[0].timeMs;
			const lastTime = group[group.length - 1].timeMs;
			const peak = Math.round((firstTime + lastTime) / 2);

			const avgCx = group.reduce((sum, c) => sum + c.cx, 0) / group.length;
			const avgCy = group.reduce((sum, c) => sum + c.cy, 0) / group.length;

			const preRoll = 280;
			const postHold = group.length > 1 ? 1350 : 1150;
			const start = Math.max(0, Math.round(firstTime - preRoll));
			const end = Math.min(totalMs, Math.round(lastTime + postHold));

			const targetScale = intensityMultipliers.click;
			const framedFocus = calculateFramingFocus(avgCx, avgCy, targetScale, framing, "click");

			candidates.push({
				peakTimeMs: peak,
				startMs: start,
				endMs: end,
				focus: framedFocus,
				strength: 300000 + (totalMs - firstTime),
				customScale: targetScale,
				intent: "click",
			});
		};

		for (let i = 1; i < rawClicks.length; i++) {
			const prev = currentClickGroup[currentClickGroup.length - 1];
			const curr = rawClicks[i];
			const dt = curr.timeMs - prev.timeMs;
			const dist = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);

			if (dt <= 650 && dist <= 0.08) {
				currentClickGroup.push(curr);
			} else {
				emitClickCandidate(currentClickGroup);
				currentClickGroup = [curr];
			}
		}

		if (currentClickGroup.length > 0) {
			emitClickCandidate(currentClickGroup);
		}
	}

	// 2. Interactive Cursor Hovers (Buttons, Links, Tools, Menus)
	const hoverSamples = normalizedSamples.filter((s) => isInteractiveHoverType(s));
	if (hoverSamples.length >= 2) {
		let currentHoverRun: CursorTelemetryPoint[] = [hoverSamples[0]];

		const emitHoverCandidate = (run: CursorTelemetryPoint[]) => {
			if (run.length < 2) return;
			const firstTime = run[0].timeMs;
			const lastTime = run[run.length - 1].timeMs;
			const duration = lastTime - firstTime;
			if (duration < 280) return;

			const peak = Math.round((firstTime + lastTime) / 2);
			const avgCx = run.reduce((sum, c) => sum + c.cx, 0) / run.length;
			const avgCy = run.reduce((sum, c) => sum + c.cy, 0) / run.length;

			const preRoll = 240;
			const postHold = 950;
			const start = Math.max(0, Math.round(firstTime - preRoll));
			const end = Math.min(totalMs, Math.round(lastTime + postHold));

			const targetScale = intensityMultipliers.click;
			const framedFocus = calculateFramingFocus(avgCx, avgCy, targetScale, framing, "click");

			candidates.push({
				peakTimeMs: peak,
				startMs: start,
				endMs: end,
				focus: framedFocus,
				strength: 160000 + duration,
				customScale: targetScale,
				intent: "flow",
			});
		};

		for (let i = 1; i < hoverSamples.length; i++) {
			const prev = currentHoverRun[currentHoverRun.length - 1];
			const curr = hoverSamples[i];
			const dt = curr.timeMs - prev.timeMs;
			const dist = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);

			if (dt <= 450 && dist <= 0.12) {
				currentHoverRun.push(curr);
			} else {
				emitHoverCandidate(currentHoverRun);
				currentHoverRun = [curr];
			}
		}

		if (currentHoverRun.length > 0) {
			emitHoverCandidate(currentHoverRun);
		}
	}

	// 3. Typing & Text Input
	const typingSamples = normalizedSamples.filter((s) => isTypingInteractionType(s));
	if (typingSamples.length >= 2) {
		let currentTypingRun: CursorTelemetryPoint[] = [typingSamples[0]];

		const emitTypingCandidate = (run: CursorTelemetryPoint[]) => {
			if (run.length < 2) return;
			const firstTime = run[0].timeMs;
			const lastTime = run[run.length - 1].timeMs;
			const duration = lastTime - firstTime;
			if (duration < 300) return;

			const peak = Math.round((firstTime + lastTime) / 2);
			const avgCx = run.reduce((sum, c) => sum + c.cx, 0) / run.length;
			const avgCy = run.reduce((sum, c) => sum + c.cy, 0) / run.length;

			const preRoll = 280;
			const postHold = 1100;
			const start = Math.max(0, Math.round(firstTime - preRoll));
			const end = Math.min(totalMs, Math.round(Math.min(firstTime + 4500, lastTime + postHold)));

			const targetScale = intensityMultipliers.text;
			const framedFocus = calculateFramingFocus(avgCx, avgCy, targetScale, framing, "text-input");

			candidates.push({
				peakTimeMs: peak,
				startMs: start,
				endMs: end,
				focus: framedFocus,
				strength: 220000 + duration,
				customScale: targetScale,
				intent: "text-input",
			});
		};

		for (let i = 1; i < typingSamples.length; i++) {
			const prev = currentTypingRun[currentTypingRun.length - 1];
			const curr = typingSamples[i];
			const dt = curr.timeMs - prev.timeMs;
			const dist = Math.hypot(curr.cx - prev.cx, curr.cy - prev.cy);

			if (dt <= 1200 && dist <= 0.25) {
				currentTypingRun.push(curr);
			} else {
				emitTypingCandidate(currentTypingRun);
				currentTypingRun = [curr];
			}
		}

		if (currentTypingRun.length > 0) {
			emitTypingCandidate(currentTypingRun);
		}
	}

	// 4. Focal Dwells & Areas of Interest (Evaluated across the entire recording)
	if (normalizedSamples.length >= 2) {
		const dwells = detectZoomDwellCandidates(normalizedSamples);
		for (const dwell of dwells) {
			const dwellDuration = Math.min(2000, Math.max(1100, Math.round(defaultDuration * 0.65)));
			const start = Math.max(0, Math.round(dwell.centerTimeMs - dwellDuration / 2));
			const end = Math.min(totalMs, Math.round(dwell.centerTimeMs + dwellDuration / 2));
			const dwellScale = intensityMultipliers.dwell;
			const framed = calculateFramingFocus(
				dwell.focus.cx,
				dwell.focus.cy,
				dwellScale,
				framing,
				"dwell",
			);
			candidates.push({
				peakTimeMs: dwell.centerTimeMs,
				startMs: start,
				endMs: end,
				focus: framed,
				strength: 90000 + dwell.strength,
				customScale: dwellScale,
				intent: "dwell",
			});
		}
	}

	if (candidates.length === 0) {
		return [];
	}

	// Sort candidates chronologically by action peak
	candidates.sort((a, b) => a.peakTimeMs - b.peakTimeMs);

	// 5. Intelligent Multi-Event Fusion & Spatial Area Clustering
	// If sequential actions occur in the SAME screen area (within zoomed viewport reach),
	// keep it as ONE sustained, stable zoom region rather than rapidly chopping into tiny clips.
	// Only split into separate zoom clips when:
	//   a) The user jumps to a DIFFERENT area of the screen (dist >= SAME_AREA_MAX_DIST)
	//   b) There is a long gap of inactivity (idleGap >= MAX_IDLE_GAP_SAME_AREA_MS)
	const SAME_AREA_MAX_DIST = 0.22; // Within 1.5x zoomed viewport bounds
	const MAX_IDLE_GAP_SAME_AREA_MS = 2800; // Inactivity gap to return to full view
	const MIN_ZOOM_GAP_MS = 300; // Clean breath / return-to-full-view interval
	const MIN_EVENT_DURATION_MS = 600;

	const resolvedCandidates: ZoomCandidate[] = [];

	for (const cand of candidates) {
		if (resolvedCandidates.length === 0) {
			resolvedCandidates.push({ ...cand });
			continue;
		}

		const prev = resolvedCandidates[resolvedCandidates.length - 1];
		const dist = Math.hypot(cand.focus.cx - prev.focus.cx, cand.focus.cy - prev.focus.cy);
		const idleGap = cand.startMs - prev.endMs;
		const dt = cand.peakTimeMs - prev.peakTimeMs;

		// Case 1: Same Area Actions -> Keep as ONE sustained, smooth zoom clip!
		if (dist <= SAME_AREA_MAX_DIST && idleGap <= MAX_IDLE_GAP_SAME_AREA_MS) {
			prev.endMs = Math.max(prev.endMs, cand.endMs);
			if (cand.intent === "click" || cand.intent === "text-input") {
				// Weight the focal target towards the active action while allowing fluid flow
				prev.focus = {
					cx: prev.focus.cx * 0.4 + cand.focus.cx * 0.6,
					cy: prev.focus.cy * 0.4 + cand.focus.cy * 0.6,
				};
				prev.intent = "flow";
			}
			prev.customScale = Math.max(prev.customScale, cand.customScale);
			prev.strength = Math.max(prev.strength, cand.strength);
			continue;
		}

		// Case 2: Different Area Actions OR Long Pause -> Split into Separate Zoom Clips
		if (prev.endMs + MIN_ZOOM_GAP_MS > cand.startMs) {
			// Rapid spatial jump across screen: bridge into a continuous tracking pan
			if (dt < 1100 && dist > SAME_AREA_MAX_DIST) {
				prev.endMs = Math.max(prev.endMs, cand.endMs);
				prev.intent = "flow";
				continue;
			}

			// Spaced enough: trim boundaries around midpoint so both clips survive cleanly
			const mid = Math.round((prev.peakTimeMs + cand.peakTimeMs) / 2);
			const newPrevEnd = Math.max(prev.peakTimeMs + 300, mid - Math.round(MIN_ZOOM_GAP_MS / 2));
			const newCandStart = Math.min(cand.peakTimeMs - 300, mid + Math.round(MIN_ZOOM_GAP_MS / 2));

			if (
				newPrevEnd - prev.startMs >= MIN_EVENT_DURATION_MS &&
				cand.endMs - newCandStart >= MIN_EVENT_DURATION_MS
			) {
				prev.endMs = newPrevEnd;
				cand.startMs = newCandStart;
			}
		}

		resolvedCandidates.push({ ...cand });
	}

	// 6. Respect existing user-placed regions
	const reservedSpans = existingRegions
		.map((region) => ({ start: region.startMs, end: region.endMs }))
		.sort((a, b) => a.start - b.start);

	const suggestions: AutoZoomSuggestion[] = [];

	for (const candidate of resolvedCandidates) {
		const candidateStart = Math.max(0, Math.min(candidate.startMs, totalMs - 350));
		const candidateEnd = Math.min(totalMs, candidate.endMs);
		if (candidateEnd <= candidateStart + 350) continue;

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
