import { describe, expect, it, vi } from "vitest";
import { type CursorTelemetryPoint, createCursorTelemetryBuffer } from "./cursorTelemetryBuffer";

function sample(tag: number): CursorTelemetryPoint {
	return { timeMs: tag, cx: tag / 10, cy: tag / 10 };
}

describe("createCursorTelemetryBuffer", () => {
	it("stores samples captured during an active session", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.startSession();
		for (let i = 0; i < 3; i++) buf.push(sample(i));
		buf.endSession();

		const batch = buf.takeNextBatch();
		expect(batch).toHaveLength(3);
		expect(batch[0]?.timeMs).toBe(0);
	});

	it("trims active samples past maxActiveSamples (ring behaviour)", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 2 });
		buf.startSession();
		buf.push(sample(1));
		buf.push(sample(2));
		buf.push(sample(3));
		buf.endSession();

		const batch = buf.takeNextBatch();
		expect(batch).toEqual([sample(2), sample(3)]);
	});

	it("preserves earlier pending batches when a new session starts before store", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		// Recording 1
		buf.startSession();
		buf.push(sample(101));
		buf.push(sample(102));
		buf.endSession();

		// Recording 2 starts before recording 1's batch has been consumed
		buf.startSession();
		buf.push(sample(201));
		buf.endSession();

		const batch1 = buf.takeNextBatch();
		const batch2 = buf.takeNextBatch();
		expect(batch1.map((s) => s.timeMs)).toEqual([101, 102]);
		expect(batch2.map((s) => s.timeMs)).toEqual([201]);
	});

	it("returns an empty batch when nothing is pending", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		expect(buf.takeNextBatch()).toEqual([]);
	});

	it("drops empty sessions instead of queuing empty batches", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.startSession();
		buf.endSession();
		expect(buf.pendingCount).toBe(0);
		expect(buf.takeNextBatch()).toEqual([]);
	});

	it("caps the pending queue at maxPendingBatches to bound memory", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10, maxPendingBatches: 3 });

		for (let round = 1; round <= 5; round++) {
			buf.startSession();
			buf.push(sample(round));
			buf.endSession();
		}

		expect(buf.pendingCount).toBe(3);
		// Oldest two batches (rounds 1 and 2) should have been dropped
		expect(buf.takeNextBatch().map((s) => s.timeMs)).toEqual([3]);
		expect(buf.takeNextBatch().map((s) => s.timeMs)).toEqual([4]);
		expect(buf.takeNextBatch().map((s) => s.timeMs)).toEqual([5]);
	});

	it("starting a new session clears in-progress samples but keeps pending batches", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		buf.startSession();
		buf.push(sample(1));
		buf.endSession();

		buf.startSession();
		buf.push(sample(99));
		// Simulate another startSession before endSession (e.g. rapid restart)
		buf.startSession();
		expect(buf.activeCount).toBe(0);
		expect(buf.pendingCount).toBe(1);

		const batch = buf.takeNextBatch();
		expect(batch.map((s) => s.timeMs)).toEqual([1]);
	});

	it("discardLatestPending() drops the most recently enqueued batch", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		buf.startSession();
		buf.push(sample(1));
		buf.endSession();

		buf.startSession();
		buf.push(sample(2));
		buf.endSession();

		expect(buf.pendingCount).toBe(2);
		buf.discardLatestPending();
		expect(buf.pendingCount).toBe(1);
		expect(buf.takeNextBatch().map((s) => s.timeMs)).toEqual([1]);
	});

	it("discardLatestPending() is safe to call on an empty queue", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.discardLatestPending();
		expect(buf.pendingCount).toBe(0);
	});

	it("prependBatch() re-inserts a batch at the front of the queue", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });

		buf.startSession();
		buf.push(sample(1));
		buf.endSession();

		const batch = buf.takeNextBatch();
		expect(buf.pendingCount).toBe(0);

		buf.prependBatch(batch);
		expect(buf.pendingCount).toBe(1);
		expect(buf.takeNextBatch().map((s) => s.timeMs)).toEqual([1]);
	});

	it("prependBatch() ignores empty batches", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.prependBatch([]);
		expect(buf.pendingCount).toBe(0);
	});

	it("endSession() returns the number of dropped batches and warns when the cap is exceeded", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10, maxPendingBatches: 2 });
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		for (let round = 1; round <= 2; round++) {
			buf.startSession();
			buf.push(sample(round));
			expect(buf.endSession()).toBe(0);
		}
		expect(warn).not.toHaveBeenCalled();

		buf.startSession();
		buf.push(sample(3));
		const dropped = buf.endSession();
		expect(dropped).toBe(1);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toMatch(/dropped 1 pending batch/);
		expect(buf.pendingCount).toBe(2);

		warn.mockRestore();
	});

	it("prependBatch() defensively trims and warns when it would exceed the cap", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10, maxPendingBatches: 2 });
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		// Fill the queue to the cap without dropping anything.
		for (let round = 1; round <= 2; round++) {
			buf.startSession();
			buf.push(sample(round));
			buf.endSession();
		}
		expect(buf.pendingCount).toBe(2);
		expect(warn).not.toHaveBeenCalled();

		// Simulate a misuse where a retry prepends without first draining:
		// queue would grow to 3, so the oldest-trailing entry must be evicted.
		buf.prependBatch([sample(99)]);
		expect(buf.pendingCount).toBe(2);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toMatch(/prependBatch trimmed 1 trailing batch/);

		// Front is the prepended batch; the preserved trailing batch is round 1.
		expect(buf.takeNextBatch().map((s) => s.timeMs)).toEqual([99]);
		expect(buf.takeNextBatch().map((s) => s.timeMs)).toEqual([1]);
		expect(buf.pendingCount).toBe(0);

		warn.mockRestore();
	});

	it("sanitizes non-finite or non-positive option values to safe defaults", () => {
		// Infinity / NaN / negative would otherwise turn the trim loops
		// into infinite loops. The buffer must fall back to defaults.
		const buf = createCursorTelemetryBuffer({
			maxActiveSamples: Number.POSITIVE_INFINITY,
			maxPendingBatches: Number.NaN,
		});

		buf.startSession();
		buf.push(sample(1));
		expect(() => buf.endSession()).not.toThrow();
		expect(buf.pendingCount).toBe(1);

		const buf2 = createCursorTelemetryBuffer({
			maxActiveSamples: -5,
			maxPendingBatches: 0,
		});
		buf2.startSession();
		buf2.push(sample(2));
		expect(() => buf2.endSession()).not.toThrow();
		expect(buf2.pendingCount).toBe(1);
	});

	it("reset() clears both active and pending state", () => {
		const buf = createCursorTelemetryBuffer({ maxActiveSamples: 10 });
		buf.startSession();
		buf.push(sample(1));
		buf.endSession();
		buf.startSession();
		buf.push(sample(2));

		buf.reset();

		expect(buf.activeCount).toBe(0);
		expect(buf.pendingCount).toBe(0);
		expect(buf.takeNextBatch()).toEqual([]);
	});
});
