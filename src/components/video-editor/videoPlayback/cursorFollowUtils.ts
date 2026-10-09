import type { CursorTelemetryPoint, ZoomFocus } from "../types";

/** Binary-search the sorted telemetry and lerp the cursor position at the given playback time. */
export function interpolateCursorAt(
	telemetry: CursorTelemetryPoint[],
	timeMs: number,
): ZoomFocus | null {
	if (telemetry.length === 0) return null;

	if (timeMs <= telemetry[0].timeMs) {
		return { cx: telemetry[0].cx, cy: telemetry[0].cy };
	}

	const last = telemetry[telemetry.length - 1];
	if (timeMs >= last.timeMs) {
		return { cx: last.cx, cy: last.cy };
	}

	let lo = 0;
	let hi = telemetry.length - 1;

	while (lo < hi - 1) {
		const mid = (lo + hi) >>> 1;
		if (telemetry[mid].timeMs <= timeMs) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const before = telemetry[lo];
	const after = telemetry[hi];
	const span = after.timeMs - before.timeMs;
	const t = span > 0 ? (timeMs - before.timeMs) / span : 0;

	return {
		cx: before.cx + (after.cx - before.cx) * t,
		cy: before.cy + (after.cy - before.cy) * t,
	};
}

/**
 * Exponential smoothing to reduce jitter from high-frequency cursor data.
 * Lower factor = smoother/more lag, higher = more responsive.
 */
export function smoothCursorFocus(raw: ZoomFocus, prev: ZoomFocus, factor: number): ZoomFocus {
	return {
		cx: prev.cx + (raw.cx - prev.cx) * factor,
		cy: prev.cy + (raw.cy - prev.cy) * factor,
	};
}

export interface FollowParams {
	minFactor: number;
	maxFactor: number;
	rampDistance: number;
	referenceMs: number;
	deadzoneRadius?: number;
	leadFactor?: number;
}

/**
 * Advance the auto-follow focus from `prev` toward target `raw` over `dtMs` of content time. The
 * distance-adaptive factor is reframed against `referenceMs` so convergence is content-time based and
 * matches between preview and export.
 *
 * Enhanced with:
 * 1. Predictive velocity lead-ahead: smoothly pans ahead of the cursor trajectory so it stays comfortably framed.
 * 2. Soft micro-deadzone: absorbs micro-jitters without hard snapping.
 * 3. Smooth Hermite curve acceleration for cinematic tracking feel.
 */
export function advanceFollowFocus(
	prev: ZoomFocus,
	raw: ZoomFocus,
	dtMs: number,
	params: FollowParams,
): ZoomFocus {
	if (!(dtMs > 0)) return prev;
	const base = adaptiveSmoothFactor(
		raw,
		prev,
		params.minFactor,
		params.maxFactor,
		params.rampDistance,
		params.deadzoneRadius ?? 0.012,
	);
	const factor = timeCorrectedFollowFactor(base, dtMs, params.referenceMs);

	let target = raw;
	const leadFactor = params.leadFactor ?? 0.35;
	if (leadFactor > 0 && dtMs > 0 && dtMs < 200) {
		const vx = (raw.cx - prev.cx) / dtMs;
		const vy = (raw.cy - prev.cy) / dtMs;
		const speed = Math.hypot(vx, vy);
		// If moving deliberately, offset target smoothly ahead along movement vector
		if (speed > 0.00012) {
			const leadTimeMs = Math.min(95, dtMs * leadFactor * 4.5);
			const maxLead = 0.075 * (leadFactor / 0.35);

			// Edge cushioning: as cursor approaches screen boundary, gently taper lead
			const edgeDistX = Math.min(raw.cx, 1 - raw.cx);
			const edgeDistY = Math.min(raw.cy, 1 - raw.cy);
			const cushionX = Math.min(1, Math.max(0, edgeDistX / 0.18));
			const cushionY = Math.min(1, Math.max(0, edgeDistY / 0.18));

			const rawLeadX = Math.max(-maxLead, Math.min(maxLead, vx * leadTimeMs));
			const rawLeadY = Math.max(-maxLead, Math.min(maxLead, vy * leadTimeMs));

			const leadX = rawLeadX * cushionX;
			const leadY = rawLeadY * cushionY;

			target = {
				cx: Math.max(0.06, Math.min(0.94, raw.cx + leadX)),
				cy: Math.max(0.06, Math.min(0.94, raw.cy + leadY)),
			};
		}
	}

	return smoothCursorFocus(target, prev, factor);
}

/**
 * Make a per-frame smoothing `baseFactor` frame-rate independent by reframing it in content time.
 * The camera converges as `(1 - baseFactor)^(dtMs / referenceMs)` regardless of frame chunking, so
 * preview (variable fps) and export (fixed fps) follow at the same speed. Larger `referenceMs` =
 * floatier. Returns 0 when paused so the camera holds still.
 */
export function timeCorrectedFollowFactor(
	baseFactor: number,
	dtMs: number,
	referenceMs: number,
): number {
	if (!(dtMs > 0) || !(referenceMs > 0)) return 0;
	return 1 - (1 - baseFactor) ** (dtMs / referenceMs);
}

/**
 * Adaptive smoothing factor that scales with distance:
 * Uses a soft micro-deadzone (< 0.012) to absorb micro-tremors and hand jitter,
 * transitioning smoothly into dynamic acceleration via cubic easing for fast mouse gestures.
 */
export function adaptiveSmoothFactor(
	raw: ZoomFocus,
	prev: ZoomFocus,
	minFactor: number,
	maxFactor: number,
	rampDistance: number,
	deadzoneRadius = 0.012,
): number {
	const dx = raw.cx - prev.cx;
	const dy = raw.cy - prev.cy;
	const distance = Math.hypot(dx, dy);

	if (distance <= deadzoneRadius) {
		// Inside soft deadzone: gentle quadratic damping so camera doesn't vibrate
		const r = distance / deadzoneRadius;
		return minFactor * (r * r * 0.4);
	}

	const activeDist = distance - deadzoneRadius;
	const effectiveRamp = Math.max(0.001, rampDistance - deadzoneRadius);
	const t = Math.min(1, activeDist / effectiveRamp);
	// Smoothstep curve: 3t^2 - 2t^3 for cinematic, organic acceleration
	const smoothT = t * t * (3 - 2 * t);
	return minFactor + (maxFactor - minFactor) * smoothT;
}
