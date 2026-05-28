import { useTimelineContext } from "dnd-timeline";
import { useEffect, useRef, useState } from "react";

export interface BackgroundWaveformProps {
	/** Pre-computed peaks array: pairs of [min, max] per block (length = 2 * N). */
	peaks: Float32Array | null;
	videoDurationMs: number;
}

/**
 * Renders a faint audio waveform on a `<canvas>` that fills its containing
 * block. Designed to be passed as the `background` prop of `<Row>`, which
 * already provides `relative overflow-hidden` — no wrapper element needed.
 *
 * - Accepts pre-computed `peaks` from the caller (see `useAudioPeaks`).
 * - Redraws whenever the timeline zoom/pan range changes.
 * - `pointer-events: none` — never blocks drag-to-create interactions.
 */
export default function BackgroundWaveform({ peaks, videoDurationMs }: BackgroundWaveformProps) {
	const { range } = useTimelineContext();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

	// Observe the canvas itself — Row's `relative overflow-hidden` parent
	// makes it fill the row exactly, so no wrapper div is needed.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ro = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			setCanvasSize({ w: width, h: height });
		});
		ro.observe(canvas);
		return () => ro.disconnect();
	}, []);

	// Redraw whenever peaks, range, or canvas size changes.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || canvasSize.w <= 0 || canvasSize.h <= 0) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(canvasSize.w * dpr);
		canvas.height = Math.round(canvasSize.h * dpr);

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

		if (!peaks || peaks.length === 0) return;

		const W = canvasSize.w;
		const H = canvasSize.h;
		const mid = H / 2;
		const amp = mid * 0.9;
		const rangeMs = range.end - range.start;
		if (rangeMs <= 0 || videoDurationMs <= 0) return;

		const N = peaks.length / 2;

		// Pre-compute per-column peaks so we can draw a single filled polygon.
		const colMax = new Float32Array(W);
		const colMin = new Float32Array(W);
		for (let x = 0; x < W; x++) {
			const startMs = range.start + (x / W) * rangeMs;
			const endMs = range.start + ((x + 1) / W) * rangeMs;
			const lo = Math.max(0, Math.floor((startMs / videoDurationMs) * N));
			const hi = Math.min(N - 1, Math.ceil((endMs / videoDurationMs) * N));

			let minVal = 0;
			let maxVal = 0;
			for (let i = lo; i <= hi; i++) {
				const mn = peaks[i * 2];
				const mx = peaks[i * 2 + 1];
				if (mn < minVal) minVal = mn;
				if (mx > maxVal) maxVal = mx;
			}
			colMax[x] = maxVal;
			colMin[x] = minVal;
		}

		// Filled waveform polygon: upper edge (max) left→right, lower edge (min) right→left.
		ctx.beginPath();
		ctx.moveTo(0, mid - colMax[0] * amp);
		for (let x = 1; x < W; x++) {
			ctx.lineTo(x, mid - colMax[x] * amp);
		}
		for (let x = W - 1; x >= 0; x--) {
			ctx.lineTo(x, mid - colMin[x] * amp);
		}
		ctx.closePath();
		ctx.fillStyle = "rgba(74, 222, 128, 0.55)";
		ctx.fill();

		// Crisp top-edge stroke for the "pro app" sharp silhouette.
		ctx.beginPath();
		ctx.moveTo(0, mid - colMax[0] * amp);
		for (let x = 1; x < W; x++) {
			ctx.lineTo(x, mid - colMax[x] * amp);
		}
		ctx.strokeStyle = "rgba(74, 222, 128, 0.80)";
		ctx.lineWidth = 1;
		ctx.stroke();

		// Mirror: bottom edge stroke.
		ctx.beginPath();
		ctx.moveTo(0, mid - colMin[0] * amp);
		for (let x = 1; x < W; x++) {
			ctx.lineTo(x, mid - colMin[x] * amp);
		}
		ctx.strokeStyle = "rgba(74, 222, 128, 0.80)";
		ctx.lineWidth = 1;
		ctx.stroke();
	}, [peaks, range, canvasSize, videoDurationMs]);

	return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />;
}
