import type { TrimRegion } from "@/components/video-editor/types";

export interface CaptionSegment {
	startSec: number;
	endSec: number;
	text: string;
}

/** How caption layout should interpret `CaptionSegment` times from `transcribeMono16kToSegments`. */
export type CaptionTimestampGranularity = "word" | "phrase";

export interface TranscribeMono16kResult {
	segments: CaptionSegment[];
	granularity: CaptionTimestampGranularity;
}

function segmentOverlapsTrim(startMs: number, endMs: number, trims: TrimRegion[]): boolean {
	return trims.some((t) => startMs < t.endMs && endMs > t.startMs);
}

/**
 * ONNX Runtime's wasm bundle treats `process.versions.node` (present in Electron's
 * renderer) as Node and tries `require("fs")`, which Vite does not support. Mask it
 * only while Transformers / ORT run.
 */
function withoutNodeVersion<T>(fn: () => Promise<T>): Promise<T> {
	const versions =
		typeof process !== "undefined" && process.versions && typeof process.versions === "object"
			? process.versions
			: null;
	const hadNode = versions !== null && "node" in versions;
	const savedNode = hadNode ? (versions as { node?: string }).node : undefined;
	if (hadNode && versions) {
		try {
			Reflect.deleteProperty(versions, "node");
		} catch {
			(versions as { node?: string }).node = undefined;
		}
	}
	return fn().finally(() => {
		if (hadNode && versions && savedNode !== undefined) {
			(versions as { node: string }).node = savedNode;
		}
	});
}

/** Whisper runs with internal 30s chunks; keep each forward pass bounded for WASM memory. */
const TRANSCRIBE_SLICE_SAMPLES = 12 * 60 * 16_000;

/** Very short slices are skipped in the multi-slice loop unless padded (see `padTailSliceForTranscribe`). */
const MIN_TRANSCRIBE_SLICE_SAMPLES = 800;

/**
 * Pad a short tail slice so Whisper still runs; timestamps are clamped with `realDurationSec` so
 * padding does not extend perceived audio on the timeline.
 */
function padTailSliceForTranscribe(samples: Float32Array): {
	slice: Float32Array;
	realDurationSec: number;
} {
	const realDurationSec = samples.length / 16_000;
	if (samples.length >= MIN_TRANSCRIBE_SLICE_SAMPLES) {
		return { slice: samples, realDurationSec };
	}
	const padded = new Float32Array(MIN_TRANSCRIBE_SLICE_SAMPLES);
	padded.set(samples);
	return { slice: padded, realDurationSec };
}

function segmentsFromTranscriberChunks(
	chunks: Array<{ timestamp?: [number | null, number | null]; text?: unknown }>,
	timeOffsetSec: number,
	trims: TrimRegion[],
	audioDurationSec: number,
): CaptionSegment[] {
	const sorted = [...chunks].sort((x, y) => {
		const ax = x.timestamp?.[0];
		const ay = y.timestamp?.[0];
		const na = typeof ax === "number" ? ax : -1;
		const nb = typeof ay === "number" ? ay : -1;
		return na - nb;
	});

	const segments: CaptionSegment[] = [];

	for (let idx = 0; idx < sorted.length; idx++) {
		const c = sorted[idx]!;
		const ts = c.timestamp as [number | null, number | null] | undefined;
		if (!ts) continue;
		let a = ts[0];
		let b = ts[1];
		if (a == null) a = 0;
		a = Math.max(0, a);
		if (b == null) {
			let nextStart: number | null = null;
			for (let j = idx + 1; j < sorted.length; j++) {
				const na = sorted[j]?.timestamp?.[0];
				if (typeof na === "number") {
					nextStart = na;
					break;
				}
			}
			b = nextStart ?? audioDurationSec;
		}
		if (b <= a) {
			b = Math.min(a + 0.25, audioDurationSec);
		}
		b = Math.min(b, audioDurationSec);

		const text = String(c.text ?? "")
			.replace(/\s+/g, " ")
			.trim();
		if (!text) continue;

		const startSec = a + timeOffsetSec;
		const sliceEnd = timeOffsetSec + audioDurationSec;
		const endSec = Math.min(Math.max(startSec + 0.08, b + timeOffsetSec), sliceEnd);
		const startMs = Math.round(startSec * 1000);
		const endMs = Math.round(endSec * 1000);
		if (segmentOverlapsTrim(startMs, endMs, trims)) continue;

		segments.push({ startSec, endSec, text });
	}

	segments.sort((u, v) => u.startSec - v.startSec || u.endSec - v.endSec);
	const rawDeduped: CaptionSegment[] = [];
	const CHUNK_DUP_MAX_GAP_SEC = 0.42;
	for (const seg of segments) {
		const prev = rawDeduped[rawDeduped.length - 1];
		if (prev && prev.text === seg.text && seg.startSec <= prev.endSec + CHUNK_DUP_MAX_GAP_SEC) {
			prev.endSec = Math.max(prev.endSec, seg.endSec);
			prev.startSec = Math.min(prev.startSec, seg.startSec);
			continue;
		}
		rawDeduped.push(seg);
	}
	return rawDeduped;
}

async function runTranscriberOnSlice(
	transcriber: (audio: Float32Array, opts: Record<string, unknown>) => Promise<unknown>,
	samples: Float32Array,
	opts: { forceFullSequences: boolean },
): Promise<unknown> {
	const durationSec = samples.length / 16_000;
	// Only chunk long clips; short-audio chunking regressed some Whisper.js runs (empty chunks).
	const chunking = durationSec > 30 ? { chunk_length_s: 30, stride_length_s: 5 } : {};
	return transcriber(samples, {
		return_timestamps: true,
		force_full_sequences: opts.forceFullSequences,
		...chunking,
	});
}

function getChunksFromTranscriberResult(result: unknown): Array<{
	timestamp?: [number | null, number | null];
	text?: unknown;
}> {
	if (result == null) return [];
	if (Array.isArray(result)) {
		const out: Array<{ timestamp?: [number | null, number | null]; text?: unknown }> = [];
		for (const item of result) {
			const chunks = (item as { chunks?: unknown })?.chunks;
			if (Array.isArray(chunks)) out.push(...chunks);
		}
		return out;
	}
	const chunks = (result as { chunks?: unknown })?.chunks;
	return Array.isArray(chunks) ? chunks : [];
}

/** Prefer `chunks`; if the model only returned top-level `text`, synthesize one span for timing. */
function extractChunksFromAsrResult(result: unknown): Array<{
	timestamp?: [number | null, number | null];
	text?: unknown;
}> {
	const fromChunks = getChunksFromTranscriberResult(result);
	if (fromChunks.length > 0) return fromChunks;
	const single = Array.isArray(result) ? result[0] : result;
	const text =
		typeof (single as { text?: unknown })?.text === "string"
			? String((single as { text: string }).text).trim()
			: "";
	if (text) {
		return [{ timestamp: [0, null], text }];
	}
	return [];
}

/**
 * Runs Whisper in-browser via Transformers.js. First run downloads model weights.
 * Long audio is split into slices so one forward pass does not exhaust WASM memory;
 * timestamps are shifted to the full timeline.
 */
export async function transcribeMono16kToSegments(
	samples: Float32Array,
	options?: {
		trimRegions?: TrimRegion[];
		onStatus?: (phase: "model" | "transcribe") => void;
		signal?: AbortSignal;
	},
): Promise<TranscribeMono16kResult> {
	return withoutNodeVersion(async () => {
		const { pipeline, env } = await import("@xenova/transformers");
		env.allowLocalModels = false;

		if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

		options?.onStatus?.("model");
		// Default tiny weights only: the `output_attentions` revision has regressed inference for
		// some environments (empty chunks / thrown errors) while phrase mode works on this model.
		const transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny");

		if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

		const trims = options?.trimRegions ?? [];
		options?.onStatus?.("transcribe");

		const transcribeOne = async (
			ignoreTrims: boolean,
			forceFullSequences: boolean,
		): Promise<CaptionSegment[]> => {
			try {
				const activeTrims = ignoreTrims ? [] : trims;
				if (samples.length <= TRANSCRIBE_SLICE_SAMPLES) {
					const { slice, realDurationSec } = padTailSliceForTranscribe(samples);
					const result = await runTranscriberOnSlice(transcriber, slice, {
						forceFullSequences,
					});
					return segmentsFromTranscriberChunks(
						extractChunksFromAsrResult(result),
						0,
						activeTrims,
						realDurationSec,
					);
				}

				const all: CaptionSegment[] = [];
				for (let offset = 0; offset < samples.length; offset += TRANSCRIBE_SLICE_SAMPLES) {
					if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
					const end = Math.min(offset + TRANSCRIBE_SLICE_SAMPLES, samples.length);
					const sliceRaw = samples.subarray(offset, end);
					const isFinalSlice = end >= samples.length;
					if (sliceRaw.length === 0) continue;
					if (sliceRaw.length < MIN_TRANSCRIBE_SLICE_SAMPLES && !isFinalSlice) continue;

					const { slice, realDurationSec } =
						sliceRaw.length < MIN_TRANSCRIBE_SLICE_SAMPLES && isFinalSlice
							? padTailSliceForTranscribe(sliceRaw)
							: { slice: sliceRaw, realDurationSec: sliceRaw.length / 16_000 };

					const result = await runTranscriberOnSlice(transcriber, slice, {
						forceFullSequences,
					});
					const tOff = offset / 16_000;
					all.push(
						...segmentsFromTranscriberChunks(
							extractChunksFromAsrResult(result),
							tOff,
							activeTrims,
							realDurationSec,
						),
					);
				}
				return all;
			} catch (e) {
				if (e instanceof DOMException && e.name === "AbortError") throw e;
				console.warn("[captioning] Whisper pass failed:", e);
				return [];
			}
		};

		let segments = await transcribeOne(false, true);
		if (segments.length === 0) {
			segments = await transcribeOne(false, false);
		}
		if (segments.length === 0 && trims.length > 0) {
			segments = await transcribeOne(true, true);
			if (segments.length === 0) {
				segments = await transcribeOne(true, false);
			}
		}

		return { segments, granularity: "phrase" };
	});
}
