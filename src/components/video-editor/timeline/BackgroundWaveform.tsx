import { useTimelineContext } from "dnd-timeline";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Perceptual curve applied to normalized amplitude (exponent < 1 lifts quiet
 * passages so they stay visible without a single loud spike flattening the rest).
 */
const WAVEFORM_GAMMA = 0.6;

export interface BackgroundWaveformProps {
	/** Pre-computed peaks array: pairs of [min, max] per block (length = 2 * N). */
	peaks: Float32Array | null;
	videoDurationMs: number;
	/**
	 * Pixels to inset the drawn waveform from the top of the canvas row,
	 * so it aligns with the item content top edge. Defaults to 0.
	 */
	topInset?: number;
	/**
	 * Pixels to inset the drawn waveform from the bottom of the canvas row,
	 * so it aligns with the item content bottom edge. Defaults to 0.
	 */
	bottomInset?: number;
}

/**
 * Renders a rectified (half-wave) audio waveform on a `<canvas>` that fills
 * its containing block. Designed to be passed as the `background` prop of
 * `<Row>`, which already provides `relative overflow-hidden` — no wrapper
 * element needed.
 *
 * The canvas always uses `inset-0` (full row height). Vertical alignment with
 * the item content is achieved via `topInset`/`bottomInset` in the draw calls
 * rather than CSS positioning, so the result is immune to sub-pixel CSS layout
 * differences.
 *
 * - Accepts pre-computed `peaks` from the caller (see `useAudioPeaks`).
 * - Redraws whenever the timeline zoom/pan range changes.
 * - `pointer-events: none` — never blocks drag-to-create interactions.
 */
export default function BackgroundWaveform({
	peaks,
	videoDurationMs,
	topInset = 0,
	bottomInset = 0,
}: BackgroundWaveformProps) {
	const { range } = useTimelineContext();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

	// Normalize against the track's own loudest peak so quiet recordings (mic /
	// system audio rarely approach full scale) still fill the row. Computed once
	// per peaks change, not per zoom/pan, so the height stays stable as you scroll.
	const normFactor = useMemo(() => {
		if (!peaks || peaks.length === 0) return 0;
		let globalMax = 0;
		for (let i = 0; i < peaks.length; i++) {
			const a = Math.abs(peaks[i]);
			if (a > globalMax) globalMax = a;
		}
		return globalMax > 0 ? 1 / globalMax : 0;
	}, [peaks]);

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

		if (!peaks || peaks.length === 0 || normFactor === 0) return;

		const W = canvasSize.w;
		const H = canvasSize.h;
		const rangeMs = range.end - range.start;
		if (rangeMs <= 0 || videoDurationMs <= 0) return;

		// Draw within [topY, bottomY] so the waveform aligns with item bounds
		// regardless of CSS sub-pixel rounding on the canvas element itself.
		const topY = topInset;
		const bottomY = H - bottomInset;
		const drawHeight = bottomY - topY;
		if (drawHeight <= 0) return;

		const N = peaks.length / 2;
		const amp = drawHeight * 0.9;

		// Rectified (half-wave): amplitude = max(|min|, |max|), normalized to the
		// track's loudest peak and perceptually curved, drawn upward from bottomY.
		const colY = new Float32Array(W);
		for (let x = 0; x < W; x++) {
			const startMs = range.start + (x / W) * rangeMs;
			const endMs = range.start + ((x + 1) / W) * rangeMs;
			const lo = Math.max(0, Math.floor((startMs / videoDurationMs) * N));
			const hi = Math.min(N - 1, Math.ceil((endMs / videoDurationMs) * N));

			let absMax = 0;
			for (let i = lo; i <= hi; i++) {
				const a = Math.abs(peaks[i * 2]);
				const b = Math.abs(peaks[i * 2 + 1]);
				if (a > absMax) absMax = a;
				if (b > absMax) absMax = b;
			}
			const normalized = Math.min(1, absMax * normFactor);
			const display = normalized > 0 ? normalized ** WAVEFORM_GAMMA : 0;
			colY[x] = bottomY - display * amp;
		}

		// Filled polygon: bottom-left → top silhouette → bottom-right.
		ctx.beginPath();
		ctx.moveTo(0, bottomY);
		for (let x = 0; x < W; x++) {
			ctx.lineTo(x, colY[x]);
		}
		ctx.lineTo(W, bottomY);
		ctx.closePath();
		ctx.fillStyle = "rgba(74, 222, 128, 0.55)";
		ctx.fill();

		// Crisp top-edge stroke for the sharp silhouette.
		ctx.beginPath();
		ctx.moveTo(0, colY[0]);
		for (let x = 1; x < W; x++) {
			ctx.lineTo(x, colY[x]);
		}
		ctx.strokeStyle = "rgba(74, 222, 128, 0.85)";
		ctx.lineWidth = 1;
		ctx.stroke();
	}, [peaks, normFactor, range, canvasSize, videoDurationMs, topInset, bottomInset]);

	return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />;
}
