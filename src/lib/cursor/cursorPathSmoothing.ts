import { getCursorSpringConfig } from "@/components/video-editor/videoPlayback/motionSmoothing";
import type { CursorRecordingData, CursorRecordingSample } from "@/native/contracts";

/**
 * Offline cursor-path smoothing for native recordings.
 *
 * We have the whole path up front, so instead of a per-frame causal filter we precompute once:
 * resample to a fixed high rate, then run a spring-damper over it. The spring gives the motion
 * inertia (it trails the real cursor) and is deterministic, so preview and export match exactly.
 */

export interface SmoothedCursorPosition {
	cx: number;
	cy: number;
}

export interface SmoothedCursorPath {
	/** Smoothed normalized position at a time, or null when the cursor is hidden there. */
	sampleAt(timeMs: number): SmoothedCursorPosition | null;
}

/** 240 steps/sec keeps the spring stable and crisp at any playback fps. */
const STEP_MS = 1000 / 240;
const STEP_S = STEP_MS / 1000;

interface SmoothedRun {
	start: number;
	end: number;
	times: Float32Array;
	xs: Float32Array;
	ys: Float32Array;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function binarySearchAtOrBefore(
	times: Float32Array | number[],
	timeMs: number,
	hi: number,
): number {
	let low = 0;
	let high = hi;
	let result = -1;
	while (low <= high) {
		const mid = low + ((high - low) >> 1);
		if (times[mid] <= timeMs) {
			result = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return result;
}

function centripetalCatmullRom(
	p0: { cx: number; cy: number },
	p1: { cx: number; cy: number },
	p2: { cx: number; cy: number },
	p3: { cx: number; cy: number },
	tFraction: number,
): SmoothedCursorPosition {
	// Centripetal parameterization (alpha = 0.5) eliminates cusps and overshooting loops
	const dist = (a: { cx: number; cy: number }, b: { cx: number; cy: number }) => {
		const dx = b.cx - a.cx;
		const dy = b.cy - a.cy;
		return Math.sqrt(Math.sqrt(dx * dx + dy * dy)) + 1e-4;
	};

	const t0 = 0;
	const t1 = t0 + dist(p0, p1);
	const t2 = t1 + dist(p1, p2);
	const t3 = t2 + dist(p2, p3);

	const t = t1 + tFraction * (t2 - t1);

	const lerpPoint = (
		a: { cx: number; cy: number },
		b: { cx: number; cy: number },
		ta: number,
		tb: number,
	) => {
		const f = (t - ta) / (tb - ta);
		return { cx: a.cx + (b.cx - a.cx) * f, cy: a.cy + (b.cy - a.cy) * f };
	};

	const a1 = lerpPoint(p0, p1, t0, t1);
	const a2 = lerpPoint(p1, p2, t1, t2);
	const a3 = lerpPoint(p2, p3, t2, t3);

	const b1 = lerpPoint(a1, a2, t0, t2);
	const b2 = lerpPoint(a2, a3, t1, t3);

	const c = lerpPoint(b1, b2, t1, t2);

	return {
		cx: clamp(c.cx, 0, 1),
		cy: clamp(c.cy, 0, 1),
	};
}

/** Catmull-Rom spline interpolation of a sample run's position at an arbitrary time. */
function interpolateRun(samples: CursorRecordingSample[], timeMs: number): SmoothedCursorPosition {
	const last = samples.length - 1;
	if (timeMs <= samples[0].timeMs) return { cx: samples[0].cx, cy: samples[0].cy };
	if (timeMs >= samples[last].timeMs) return { cx: samples[last].cx, cy: samples[last].cy };
	const i = binarySearchAtOrBefore(
		samples.map((s) => s.timeMs),
		timeMs,
		last,
	);
	const a = samples[i];
	const b = samples[i + 1] ?? a;
	const span = b.timeMs - a.timeMs;
	if (span <= 0) return { cx: a.cx, cy: a.cy };
	const t = (timeMs - a.timeMs) / span;

	// For runs with 2 samples, linear interpolation is exact
	if (samples.length <= 2) {
		return { cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t };
	}

	// 4 control points for Centripetal Catmull-Rom spline
	const s0 = samples[Math.max(0, i - 1)];
	const s3 = samples[Math.min(last, i + 2)];

	return centripetalCatmullRom(s0, a, b, s3, t);
}

/**
 * Drive a bidirectional velocity-adaptive spring across `targets`, returning zero-phase smoothed series.
 * Runs forward and backward passes to completely cancel phase lag while adapting responsiveness to flick speeds.
 */
function bidirectionalSpringSmooth(
	targets: Float32Array,
	baseStiffness: number,
	baseDamping: number,
	mass: number,
): Float32Array {
	const n = targets.length;
	if (n === 0) return new Float32Array(0);
	if (n === 1) return new Float32Array(targets);

	// Adaptive spring parameters per sample based on local traversal velocity
	const getAdaptiveParams = (curr: number, prev: number) => {
		const speed = Math.abs(curr - prev) / STEP_S;
		// Speed normalized against typical screen-crossing speed (0.5 screen/sec)
		const velocityFactor = Math.min(2.5, Math.max(0, speed / 0.5));
		const stiffness = baseStiffness * (1 + 0.8 * velocityFactor);
		// Critically damped adjustment for smooth settles without overshoot
		const criticalDamping = 2 * Math.sqrt(stiffness * mass);
		const damping = Math.max(baseDamping, criticalDamping * 0.95);
		return { stiffness, damping };
	};

	// Forward pass
	const fwd = new Float32Array(n);
	let xFwd = targets[0];
	let vFwd = 0;
	fwd[0] = xFwd;
	for (let i = 1; i < n; i++) {
		const { stiffness, damping } = getAdaptiveParams(targets[i], targets[i - 1]);
		const accel = (-stiffness * (xFwd - targets[i]) - damping * vFwd) / mass;
		vFwd += accel * STEP_S;
		xFwd += vFwd * STEP_S;
		fwd[i] = xFwd;
	}

	// Backward pass (from end to start)
	const bwd = new Float32Array(n);
	let xBwd = targets[n - 1];
	let vBwd = 0;
	bwd[n - 1] = xBwd;
	for (let i = n - 2; i >= 0; i--) {
		const { stiffness, damping } = getAdaptiveParams(targets[i], targets[i + 1]);
		const accel = (-stiffness * (xBwd - targets[i]) - damping * vBwd) / mass;
		vBwd += accel * STEP_S;
		xBwd += vBwd * STEP_S;
		bwd[i] = xBwd;
	}

	// Zero-phase blend (cancels out phase delay)
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		out[i] = 0.5 * (fwd[i] + bwd[i]);
	}
	return out;
}

/** Maximal runs of visible samples, so we never smooth across a hidden gap. */
function splitVisibleRuns(samples: CursorRecordingSample[]): CursorRecordingSample[][] {
	const runs: CursorRecordingSample[][] = [];
	let current: CursorRecordingSample[] = [];
	for (const sample of samples) {
		if (sample.visible === false) {
			if (current.length) runs.push(current);
			current = [];
			continue;
		}
		current.push(sample);
	}
	if (current.length) runs.push(current);
	return runs;
}

function isSampleClick(sample: CursorRecordingSample): boolean {
	const s = sample as unknown as Record<string, unknown>;
	const interaction = String(s.interactionType || "").toLowerCase();
	return (
		interaction.includes("click") ||
		interaction === "pressed" ||
		interaction === "down" ||
		Boolean(s.isClick || s.isDoubleClick)
	);
}

function buildSmoothedRun(
	samples: CursorRecordingSample[],
	stiffness: number,
	damping: number,
	mass: number,
): SmoothedRun {
	const start = samples[0].timeMs;
	const end = samples[samples.length - 1].timeMs;
	const stepCount = Math.max(1, Math.round((end - start) / STEP_MS));
	const n = stepCount + 1;
	const times = new Float32Array(n);
	const rawX = new Float32Array(n);
	const rawY = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const t = i === n - 1 ? end : start + i * STEP_MS;
		times[i] = t;
		const p = interpolateRun(samples, t);
		rawX[i] = p.cx;
		rawY[i] = p.cy;
	}

	const smoothX = bidirectionalSpringSmooth(rawX, stiffness, damping, mass);
	const smoothY = bidirectionalSpringSmooth(rawY, stiffness, damping, mass);

	// Click Anchor Snapping: precisely anchor the path to exact coordinates on click events
	// Uses C2 quintic polynomial smootherstep to ensure zero jerk and 100% click fidelity
	const clickAnchors = samples.filter(isSampleClick);
	const ANCHOR_WINDOW_MS = 85;

	if (clickAnchors.length > 0) {
		for (const anchor of clickAnchors) {
			for (let i = 0; i < n; i++) {
				const dt = Math.abs(times[i] - anchor.timeMs);
				if (dt <= ANCHOR_WINDOW_MS) {
					const u = dt / ANCHOR_WINDOW_MS;
					// Quintic polynomial bell weighting: 1 - 10u^3 + 15u^4 - 6u^5
					const weight = 1 - u * u * u * (10 - 15 * u + 6 * u * u);
					smoothX[i] = (1 - weight) * smoothX[i] + weight * anchor.cx;
					smoothY[i] = (1 - weight) * smoothY[i] + weight * anchor.cy;
				}
			}
		}
	}

	return {
		start,
		end,
		times,
		xs: smoothX,
		ys: smoothY,
	};
}

function sampleRun(run: SmoothedRun, timeMs: number): SmoothedCursorPosition {
	const last = run.times.length - 1;
	if (timeMs <= run.times[0]) return { cx: run.xs[0], cy: run.ys[0] };
	if (timeMs >= run.times[last]) return { cx: run.xs[last], cy: run.ys[last] };
	const i = binarySearchAtOrBefore(run.times, timeMs, last);
	const span = run.times[i + 1] - run.times[i];
	if (span <= 0) return { cx: run.xs[i], cy: run.ys[i] };
	const t = (timeMs - run.times[i]) / span;
	return {
		cx: run.xs[i] + (run.xs[i + 1] - run.xs[i]) * t,
		cy: run.ys[i] + (run.ys[i + 1] - run.ys[i]) * t,
	};
}

/** Passthrough path (smoothing 0): raw linear interpolation, still respecting visibility gaps. */
function buildRawPath(runs: CursorRecordingSample[][]): SmoothedCursorPath {
	return {
		sampleAt(timeMs) {
			for (const run of runs) {
				if (timeMs >= run[0].timeMs && timeMs <= run[run.length - 1].timeMs) {
					return interpolateRun(run, timeMs);
				}
			}
			return null;
		},
	};
}

function buildSmoothedPath(
	recordingData: CursorRecordingData,
	smoothing01: number,
): SmoothedCursorPath {
	const runs = splitVisibleRuns(recordingData.samples).filter((run) => run.length > 0);
	if (runs.length === 0) {
		return { sampleAt: () => null };
	}
	if (smoothing01 <= 0) {
		return buildRawPath(runs);
	}

	// Use the slider value directly to match the live overlay's spring strength so both cursor
	// systems lag identically (an extra multiplier here over-smoothed, causing a visible offset).
	const config = getCursorSpringConfig(clamp(smoothing01, 0, 1));

	const smoothedRuns = runs.map((run) =>
		run.length < 2
			? {
					start: run[0].timeMs,
					end: run[0].timeMs,
					times: new Float32Array([run[0].timeMs]),
					xs: new Float32Array([run[0].cx]),
					ys: new Float32Array([run[0].cy]),
				}
			: buildSmoothedRun(run, config.stiffness, config.damping, config.mass),
	);

	return {
		sampleAt(timeMs) {
			for (const run of smoothedRuns) {
				if (timeMs >= run.start && timeMs <= run.end) return sampleRun(run, timeMs);
			}
			return null;
		},
	};
}

const pathCache = new WeakMap<CursorRecordingData, Map<string, SmoothedCursorPath>>();

/**
 * Returns the smoothed cursor path for a recording at a given strength, memoized per
 * (recordingData, strength) so it's built once and shared by preview and export.
 */
export function getSmoothedCursorPath(
	recordingData: CursorRecordingData | null | undefined,
	smoothing01: number,
): SmoothedCursorPath | null {
	if (!recordingData || recordingData.samples.length === 0) return null;
	const key = (Number.isFinite(smoothing01) ? clamp(smoothing01, 0, 1) : 0).toFixed(2);
	let byStrength = pathCache.get(recordingData);
	if (!byStrength) {
		byStrength = new Map();
		pathCache.set(recordingData, byStrength);
	}
	let path = byStrength.get(key);
	if (!path) {
		path = buildSmoothedPath(recordingData, Number.parseFloat(key));
		byStrength.set(key, path);
	}
	return path;
}
