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

/** Request payload posted from the renderer to the transcription worker. */
export interface TranscribeWorkerRequest {
	samples: Float32Array;
	trimRegions: TrimRegion[];
}

/** Messages the transcription worker posts back to the renderer. */
export type TranscribeWorkerResponse =
	| { type: "status"; phase: "model" | "transcribe" }
	| { type: "result"; segments: CaptionSegment[]; granularity: CaptionTimestampGranularity }
	| { type: "error"; message: string };

/**
 * Transcribes mono 16 kHz audio into timed caption segments using in-browser Whisper.
 *
 * The model load and inference run inside a dedicated Web Worker so the editor's
 * main thread stays responsive (WASM inference does not yield). The first run
 * downloads model weights. Aborting (via `options.signal`) terminates the worker
 * immediately, since model load / inference cannot be cooperatively cancelled.
 */
export function transcribeMono16kToSegments(
	samples: Float32Array,
	options?: {
		trimRegions?: TrimRegion[];
		onStatus?: (phase: "model" | "transcribe") => void;
		signal?: AbortSignal;
	},
): Promise<TranscribeMono16kResult> {
	if (options?.signal?.aborted) {
		return Promise.reject(new DOMException("Aborted", "AbortError"));
	}

	return new Promise<TranscribeMono16kResult>((resolve, reject) => {
		const worker = new Worker(new URL("./transcribe.worker.ts", import.meta.url), {
			type: "module",
		});

		let settled = false;
		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			options?.signal?.removeEventListener("abort", onAbort);
			worker.terminate();
			fn();
		};

		const onAbort = () => finish(() => reject(new DOMException("Aborted", "AbortError")));
		options?.signal?.addEventListener("abort", onAbort, { once: true });

		worker.onmessage = (e: MessageEvent<TranscribeWorkerResponse>) => {
			const msg = e.data;
			if (msg.type === "status") {
				options?.onStatus?.(msg.phase);
				return;
			}
			if (msg.type === "result") {
				finish(() => resolve({ segments: msg.segments, granularity: msg.granularity }));
				return;
			}
			finish(() => reject(new Error(msg.message)));
		};

		worker.onerror = (e) => {
			finish(() => reject(new Error(e.message || "Caption transcription worker failed")));
		};

		// Structured-clone copy (not a transfer): the caller may reuse `samples`
		// for the full-buffer retry pass, so the buffer must stay valid here.
		const request: TranscribeWorkerRequest = {
			samples,
			trimRegions: options?.trimRegions ?? [],
		};
		worker.postMessage(request);
	});
}
