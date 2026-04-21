/**
 * A single cursor telemetry sample captured during a recording session.
 *
 * Coordinates (`cx`, `cy`) are clamped ratios in the `[0, 1]` range,
 * normalised against the captured surface's width and height by the
 * main-process `sampleCursorPoint()` before being pushed. `timeMs` is the
 * offset (in milliseconds) from the recording's start.
 */
export interface CursorTelemetryPoint {
	timeMs: number;
	cx: number;
	cy: number;
}

/**
 * Per-session cursor telemetry buffer with bounded memory.
 *
 * Flow: `startSession()` → `push(point)` N times → `endSession()` enqueues
 * the collected samples as a completed batch. The main process later
 * drains batches in FIFO order via `takeNextBatch()` to persist them to
 * disk, and can `prependBatch()` on write failure to retry without losing
 * order.
 *
 * Memory is bounded by `maxActiveSamples` (ring buffer on the in-progress
 * batch) and `maxPendingBatches` (FIFO cap across completed batches).
 */
export interface CursorTelemetryBuffer {
	/**
	 * Begin a new recording session. Clears any in-progress active samples
	 * (without touching already-completed pending batches). Safe to call
	 * repeatedly — e.g. a rapid Stop → Record sequence.
	 */
	startSession(): void;

	/**
	 * Append a telemetry sample to the current active session. When the
	 * active buffer exceeds `maxActiveSamples`, the oldest sample is
	 * dropped (ring behaviour).
	 */
	push(point: CursorTelemetryPoint): void;

	/**
	 * Finalize the active session, moving its samples into the pending
	 * queue as a single batch. Empty sessions are dropped (no empty batch
	 * is enqueued).
	 *
	 * If the pending queue would exceed `maxPendingBatches`, the oldest
	 * batches are evicted to bound memory. A `console.warn` is emitted
	 * whenever at least one batch is dropped so that pathological rapid-
	 * restart scenarios are observable.
	 *
	 * @returns the number of pending batches dropped by this call (0 under
	 * normal operation).
	 */
	endSession(): number;

	/**
	 * Remove and return the oldest pending batch, or an empty array if
	 * the queue is empty.
	 */
	takeNextBatch(): CursorTelemetryPoint[];

	/**
	 * Re-insert a batch at the front of the queue, preserving FIFO order
	 * on retry paths (e.g. when persisting the batch failed and the
	 * caller wants the next `takeNextBatch()` to yield it again).
	 *
	 * Empty batches are ignored. The pending cap is enforced defensively
	 * — if prepending would push the queue past `maxPendingBatches`, the
	 * oldest entries are evicted and a `console.warn` is emitted. In
	 * normal retry usage this trim is a no-op because the caller has just
	 * removed the batch via `takeNextBatch()`.
	 */
	prependBatch(batch: CursorTelemetryPoint[]): void;

	/**
	 * Drop the most recently enqueued pending batch. Used when a recording
	 * is discarded after `endSession()` but before it has been persisted.
	 * No-op on an empty queue.
	 */
	discardLatestPending(): void;

	/**
	 * Clear both the active and pending state. Intended for tests and
	 * full teardown paths.
	 */
	reset(): void;

	readonly activeCount: number;
	readonly pendingCount: number;
}

export interface CursorTelemetryBufferOptions {
	maxActiveSamples: number;
	maxPendingBatches?: number;
}

const DEFAULT_MAX_PENDING_BATCHES = 8;
const DEFAULT_MAX_ACTIVE_SAMPLES = 10_000;

/** Coerce a numeric option into a safe, finite, positive integer. */
function sanitizeLimit(value: number | undefined, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	const floored = Math.floor(value);
	return floored >= 1 ? floored : fallback;
}

/**
 * Create a cursor telemetry buffer.
 *
 * Numeric options are sanitized: non-finite, negative, or zero values fall
 * back to safe defaults so a bad caller cannot disable the memory bounds
 * (which would turn the trim loops into infinite loops).
 *
 * @see CursorTelemetryBuffer for the full lifecycle contract.
 */
export function createCursorTelemetryBuffer(
	options: CursorTelemetryBufferOptions,
): CursorTelemetryBuffer {
	const maxActive = sanitizeLimit(options.maxActiveSamples, DEFAULT_MAX_ACTIVE_SAMPLES);
	const maxPending = sanitizeLimit(options.maxPendingBatches, DEFAULT_MAX_PENDING_BATCHES);

	let active: CursorTelemetryPoint[] = [];
	let pending: CursorTelemetryPoint[][] = [];

	return {
		startSession() {
			active = [];
		},
		push(point) {
			active.push(point);
			if (active.length > maxActive) {
				active.shift();
			}
		},
		endSession() {
			let dropped = 0;
			if (active.length > 0) {
				pending.push(active);
				while (pending.length > maxPending) {
					pending.shift();
					dropped++;
				}
			}
			active = [];
			if (dropped > 0) {
				console.warn(
					`[cursorTelemetryBuffer] dropped ${dropped} pending batch(es) to stay within maxPendingBatches=${maxPending}`,
				);
			}
			return dropped;
		},
		takeNextBatch() {
			return pending.shift() ?? [];
		},
		prependBatch(batch) {
			if (batch.length === 0) return;
			pending.unshift(batch);
			let dropped = 0;
			while (pending.length > maxPending) {
				pending.pop();
				dropped++;
			}
			if (dropped > 0) {
				console.warn(
					`[cursorTelemetryBuffer] prependBatch trimmed ${dropped} trailing batch(es) to stay within maxPendingBatches=${maxPending}`,
				);
			}
		},
		discardLatestPending() {
			pending.pop();
		},
		reset() {
			active = [];
			pending = [];
		},
		get activeCount() {
			return active.length;
		},
		get pendingCount() {
			return pending.length;
		},
	};
}
