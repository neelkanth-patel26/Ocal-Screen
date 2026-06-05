import {
	createSpringState,
	getZoomSpringConfig,
	type SpringState,
	stepSpringValue,
} from "./motionSmoothing";

/**
 * Spring-chase for the camera zoom transform.
 *
 * The zoom envelope (`computeZoomTransform`) is a deterministic, time-driven *target* shaped by an
 * ease curve. Applying it straight to the camera reproduces every velocity discontinuity in that
 * curve — the steep launch of the ease-in, the seams between close regions — which reads as a jerk.
 * Instead we chase the target with a spring per axis: the target supplies the authored timing, the
 * spring guarantees the rendered motion is velocity-continuous, so it physically can't jerk.
 */

export interface ZoomTransform {
	scale: number;
	x: number;
	y: number;
}

export interface ZoomSpringState {
	scale: SpringState;
	x: SpringState;
	y: SpringState;
}

export function createZoomSpringState(): ZoomSpringState {
	return {
		scale: createSpringState(1),
		x: createSpringState(0),
		y: createSpringState(0),
	};
}

/** Snap every axis straight to the target (used on seek / pause / first frame). */
export function resetZoomSpring(state: ZoomSpringState, target: ZoomTransform): void {
	for (const [axis, value] of [
		[state.scale, target.scale],
		[state.x, target.x],
		[state.y, target.y],
	] as const) {
		axis.value = value;
		axis.velocity = 0;
		axis.initialized = true;
	}
}

/**
 * Step one axis toward `target`, with a moving-target overshoot clamp: because the target moves every
 * frame, a fast (near-critical) spring can carry velocity past it on a reversal and wobble. If the
 * step crosses the target, we snap to it and zero the velocity — keeping the spring quick without jelly.
 */
function stepAxis(
	axis: SpringState,
	target: number,
	deltaMs: number,
	config: ReturnType<typeof getZoomSpringConfig>,
): number {
	const before = axis.initialized ? axis.value : target;
	const after = stepSpringValue(axis, target, deltaMs, config);
	const crossed = (before <= target && after > target) || (before >= target && after < target);
	if (crossed) {
		axis.value = target;
		axis.velocity = 0;
		return target;
	}
	return after;
}

/**
 * Advance the spring toward `target` by `deltaMs` (content time). Returns the smoothed transform to
 * apply to the camera.
 */
export function stepZoomSpring(
	state: ZoomSpringState,
	target: ZoomTransform,
	deltaMs: number,
): ZoomTransform {
	const config = getZoomSpringConfig();
	return {
		scale: stepAxis(state.scale, target.scale, deltaMs, config),
		x: stepAxis(state.x, target.x, deltaMs, config),
		y: stepAxis(state.y, target.y, deltaMs, config),
	};
}
