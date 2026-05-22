import { describe, expect, it, vi } from "vitest";
import { TimestampedVideoFrameQueue } from "./timestampedVideoFrameQueue";

class MockVideoFrame {
	timestamp: number;
	closed = false;

	constructor(source: MockVideoFrame | number) {
		this.timestamp = typeof source === "number" ? source : source.timestamp;
	}

	close() {
		this.closed = true;
	}
}

describe("TimestampedVideoFrameQueue", () => {
	it("samples the latest webcam frame at or before the requested source timestamp", async () => {
		const originalVideoFrame = globalThis.VideoFrame;
		vi.stubGlobal("VideoFrame", MockVideoFrame);
		try {
			const queue = new TimestampedVideoFrameQueue();
			const frame0 = new MockVideoFrame(0) as unknown as VideoFrame;
			const frame33 = new MockVideoFrame(33_000) as unknown as VideoFrame;
			const frame66 = new MockVideoFrame(66_000) as unknown as VideoFrame;

			queue.enqueue(frame0, 0);
			queue.enqueue(frame33, 33);
			queue.enqueue(frame66, 66);

			const sampled0 = await queue.frameAt(0);
			const sampled20 = await queue.frameAt(20);
			const sampled40 = await queue.frameAt(40);
			const sampled80 = await queue.frameAt(80);

			expect(sampled0?.timestamp).toBe(0);
			expect(sampled20?.timestamp).toBe(0);
			expect(sampled40?.timestamp).toBe(33_000);
			expect(sampled80?.timestamp).toBe(66_000);

			sampled0?.close();
			sampled20?.close();
			sampled40?.close();
			sampled80?.close();
			queue.destroy();
		} finally {
			vi.stubGlobal("VideoFrame", originalVideoFrame);
		}
	});
});
