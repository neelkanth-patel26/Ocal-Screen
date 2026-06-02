/**
 * Web Worker: runs in-browser Whisper transcription off the renderer's main
 * thread so the editor UI never blocks while the model loads or audio is
 * transcribed.
 *
 * Input message:  { samples: Float32Array; trimRegions: TrimRegion[] }
 * Output messages (see `TranscribeWorkerResponse`):
 *   { type: "status", phase: "model" | "transcribe" }  progress updates
 *   { type: "result", segments, granularity }          final captions
 *   { type: "error", message }                          failure detail
 *
 * The caller terminates this worker to abort (model load / inference cannot be
 * cooperatively cancelled), so there is no in-worker abort handling.
 */

import type { TranscribeWorkerRequest, TranscribeWorkerResponse } from "./transcribe";
import { runTranscription, type TranscriberFn } from "./transcribeCore";

function post(message: TranscribeWorkerResponse): void {
	(self as unknown as Worker).postMessage(message);
}

/**
 * ONNX Runtime's wasm bundle treats `process.versions.node` (which can leak into
 * an Electron worker) as Node and tries `require("fs")`, which Vite does not
 * support. Mask it only while Transformers / ORT run. No-op when `process` is
 * undefined (the usual case in a Web Worker).
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

async function loadTranscriber(): Promise<TranscriberFn> {
	return withoutNodeVersion(async () => {
		const { pipeline, env } = await import("@xenova/transformers");
		env.allowLocalModels = false;
		// Default tiny weights only: the `output_attentions` revision has regressed inference for
		// some environments (empty chunks / thrown errors) while phrase mode works on this model.
		const transcriber = (await pipeline(
			"automatic-speech-recognition",
			"Xenova/whisper-tiny",
		)) as unknown as TranscriberFn;
		return transcriber;
	});
}

self.onmessage = async (event: MessageEvent<TranscribeWorkerRequest>) => {
	const { samples, trimRegions } = event.data;
	try {
		post({ type: "status", phase: "model" });
		const transcriber = await loadTranscriber();

		post({ type: "status", phase: "transcribe" });
		const { segments, granularity } = await runTranscription(
			transcriber,
			samples,
			trimRegions ?? [],
		);

		post({ type: "result", segments, granularity });
	} catch (e) {
		post({ type: "error", message: e instanceof Error ? e.message : String(e) });
	}
};
