import { WebDemuxer } from "web-demuxer";
import type { AudioSettingsState } from "@/components/video-editor/FilmoraAudioInspector";
import type { SpeedRegion, TrimRegion } from "@/components/video-editor/types";
import { getPresetAudioUrl } from "@/lib/audio/presetMusicGenerator";
import type { ExportAudioMuxerCodec, VideoMuxer } from "./muxer";
import { StreamingVideoDecoder } from "./streamingDecoder";

const AUDIO_BITRATE = 128_000;
const DECODE_BACKPRESSURE_LIMIT = 20;
const MIN_SPEED_REGION_DELTA_MS = 0.0001;

export interface ExportAudioCodec {
	encoderCodec: string;
	muxerCodec: ExportAudioMuxerCodec;
	label: string;
	sampleRate: number;
	numberOfChannels: number;
}

type ExportAudioCodecCandidate = Omit<ExportAudioCodec, "sampleRate" | "numberOfChannels">;

const EXPORT_AUDIO_CODECS: ExportAudioCodecCandidate[] = [
	{ encoderCodec: "mp4a.40.2", muxerCodec: "aac", label: "AAC" },
	{ encoderCodec: "mp4a.40.02", muxerCodec: "aac", label: "AAC" },
	{ encoderCodec: "mp4a.40.5", muxerCodec: "aac", label: "AAC" },
	{ encoderCodec: "opus", muxerCodec: "opus", label: "Opus" },
];

function averageChannels(sourcePlanes: Float32Array[], frame: number) {
	let mixed = 0;
	for (const plane of sourcePlanes) {
		mixed += plane[frame] ?? 0;
	}
	return mixed / Math.max(1, sourcePlanes.length);
}

function weightedSample(
	sourcePlanes: Float32Array[],
	frame: number,
	weights: Array<[channel: number, weight: number]>,
) {
	let mixed = 0;
	let weightSum = 0;
	for (const [channel, weight] of weights) {
		const sample = sourcePlanes[channel]?.[frame];
		if (typeof sample !== "number") {
			continue;
		}
		mixed += sample * weight;
		weightSum += weight;
	}
	return weightSum > 0 ? mixed / weightSum : averageChannels(sourcePlanes, frame);
}

function getStereoDownmixWeights(sourceChannels: number) {
	const centerWeight = Math.SQRT1_2;
	const surroundWeight = Math.SQRT1_2;
	const lfeWeight = 0.5;

	if (sourceChannels >= 8) {
		// Windows 7.1 order: FL, FR, FC, LFE, BL, BR, SL, SR.
		return {
			left: [
				[0, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[4, surroundWeight],
				[6, surroundWeight],
			] satisfies Array<[number, number]>,
			right: [
				[1, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[5, surroundWeight],
				[7, surroundWeight],
			] satisfies Array<[number, number]>,
		};
	}

	if (sourceChannels >= 6) {
		// Windows 5.1 order: FL, FR, FC, LFE, BL, BR.
		return {
			left: [
				[0, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[4, surroundWeight],
			] satisfies Array<[number, number]>,
			right: [
				[1, 1],
				[2, centerWeight],
				[3, lfeWeight],
				[5, surroundWeight],
			] satisfies Array<[number, number]>,
		};
	}

	if (sourceChannels >= 4) {
		return {
			left: [
				[0, 1],
				[2, surroundWeight],
			] satisfies Array<[number, number]>,
			right: [
				[1, 1],
				[3, surroundWeight],
			] satisfies Array<[number, number]>,
		};
	}

	return {
		left: [
			[0, 1],
			[2, centerWeight],
		] satisfies Array<[number, number]>,
		right: [
			[1, 1],
			[2, centerWeight],
		] satisfies Array<[number, number]>,
	};
}

export function downmixPlanarChannelsForExport(
	sourcePlanes: Float32Array[],
	targetChannels: number,
): Float32Array {
	const frameCount = sourcePlanes[0]?.length ?? 0;
	const output = new Float32Array(frameCount * targetChannels);

	if (targetChannels === 1) {
		for (let frame = 0; frame < frameCount; frame++) {
			output[frame] = averageChannels(sourcePlanes, frame);
		}
		return output;
	}

	if (targetChannels !== 2) {
		throw new Error(`Unsupported target channel count: ${targetChannels}`);
	}

	if (sourcePlanes.length === 1) {
		output.set(sourcePlanes[0], 0);
		output.set(sourcePlanes[0], frameCount);
		return output;
	}

	if (sourcePlanes.length === 2) {
		output.set(sourcePlanes[0], 0);
		output.set(sourcePlanes[1], frameCount);
		return output;
	}

	const weights = getStereoDownmixWeights(sourcePlanes.length);
	for (let frame = 0; frame < frameCount; frame++) {
		output[frame] = weightedSample(sourcePlanes, frame, weights.left);
		output[frameCount + frame] = weightedSample(sourcePlanes, frame, weights.right);
	}
	return output;
}

export class AudioProcessor {
	private cancelled = false;

	static async selectSupportedExportCodec(
		sampleRate: number,
		numberOfChannels: number,
	): Promise<ExportAudioCodec | null> {
		const sampleRateOptions = [sampleRate];
		if (!sampleRateOptions.includes(48000)) sampleRateOptions.push(48000);
		if (!sampleRateOptions.includes(44100)) sampleRateOptions.push(44100);

		const channelOptions = [numberOfChannels];
		if (numberOfChannels > 2) {
			channelOptions.push(2);
		}
		if (!channelOptions.includes(2)) {
			channelOptions.push(2);
		}
		if (!channelOptions.includes(1)) {
			channelOptions.push(1);
		}

		for (const codec of EXPORT_AUDIO_CODECS) {
			for (const sr of sampleRateOptions) {
				// Opus in WebCodecs strictly requires 48000
				if (codec.muxerCodec === "opus" && sr !== 48000) continue;

				for (const channels of channelOptions) {
					try {
						const support = await AudioEncoder.isConfigSupported({
							codec: codec.encoderCodec,
							sampleRate: sr,
							numberOfChannels: channels,
							bitrate: AUDIO_BITRATE,
						});
						if (support.supported) {
							return { ...codec, sampleRate: sr, numberOfChannels: channels };
						}
					} catch (_e) {
						// Some browsers throw when testing unsupported codec strings
					}
				}
			}
		}

		return null;
	}

	static async selectSupportedExportCodecForSource(
		demuxer: WebDemuxer,
	): Promise<ExportAudioCodec | null> {
		let audioConfig: AudioDecoderConfig | null = null;
		try {
			audioConfig = await demuxer.getDecoderConfig("audio");
		} catch {
			audioConfig = null;
		}

		if (audioConfig) {
			try {
				const codecCheck = await AudioDecoder.isConfigSupported(audioConfig);
				if (codecCheck.supported) {
					const candidate = await AudioProcessor.selectSupportedExportCodec(
						audioConfig.sampleRate || 48000,
						audioConfig.numberOfChannels || 2,
					);
					if (candidate) return candidate;
				}
			} catch {
				/* ignore */
			}
		}

		// Fallback to standard 48000Hz stereo
		return AudioProcessor.selectSupportedExportCodec(48000, 2);
	}

	/**
	 * Two modes: no speed regions / background audio uses the fast WebCodecs trim-only pipeline;
	 * speed regions or background audio use the offline rendered & mixed timeline pipeline.
	 */
	async process(
		demuxer: WebDemuxer | null,
		muxer: VideoMuxer,
		videoUrl: string,
		trimRegions: TrimRegion[] | undefined,
		speedRegions: SpeedRegion[] | undefined,
		validatedDurationSec: number,
		exportCodec: ExportAudioCodec,
		backgroundAudioUrl?: string,
		audioSettings?: AudioSettingsState,
		hasSourceAudio: boolean = true,
		effectiveDurationSec?: number,
	): Promise<void> {
		const sortedTrims = trimRegions ? [...trimRegions].sort((a, b) => a.startMs - b.startMs) : [];
		const sortedSpeedRegions = speedRegions
			? [...speedRegions]
					.filter((region) => region.endMs - region.startMs > MIN_SPEED_REGION_DELTA_MS)
					.sort((a, b) => a.startMs - b.startMs)
			: [];

		// Speed edits or background audio track mixing need timeline offline rendering & mixing.
		if (sortedSpeedRegions.length > 0 || backgroundAudioUrl) {
			await this.renderTimelineAudioOffline(
				demuxer,
				muxer,
				videoUrl,
				sortedTrims,
				sortedSpeedRegions,
				validatedDurationSec,
				exportCodec,
				backgroundAudioUrl,
				audioSettings,
				hasSourceAudio,
				effectiveDurationSec,
			);
			return;
		}

		if (!demuxer) {
			return;
		}

		// No speed edits and no background audio: demux/decode/encode with trim timestamp remap.
		const readEndSec = validatedDurationSec + 0.5;
		const cutOnlyTrims = sortedTrims.filter((t) => !t.keepBlankScreen);
		await this.processTrimOnlyAudio(demuxer, muxer, cutOnlyTrims, readEndSec, exportCodec);
	}

	// Trim-only path, used for projects without speed regions.
	private async processTrimOnlyAudio(
		demuxer: WebDemuxer,
		muxer: VideoMuxer,
		sortedTrims: TrimRegion[],
		readEndSec?: number,
		exportCodec?: ExportAudioCodec,
	): Promise<void> {
		let audioConfig: AudioDecoderConfig;
		try {
			audioConfig = await demuxer.getDecoderConfig("audio");
		} catch {
			console.warn("[AudioProcessor] No audio track found, skipping");
			return;
		}

		const codecCheck = await AudioDecoder.isConfigSupported(audioConfig);
		if (!codecCheck.supported) {
			console.warn("[AudioProcessor] Audio codec not supported:", audioConfig.codec);
			return;
		}

		// Phase 1: decode, skipping trimmed regions.
		const decodedFrames: AudioData[] = [];

		const decoder = new AudioDecoder({
			output: (data: AudioData) => decodedFrames.push(data),
			error: (e: DOMException) => console.error("[AudioProcessor] Decode error:", e),
		});
		decoder.configure(audioConfig);

		const safeReadEndSec =
			typeof readEndSec === "number" && Number.isFinite(readEndSec)
				? Math.max(0, readEndSec)
				: undefined;
		const audioStream =
			safeReadEndSec !== undefined
				? demuxer.read("audio", 0, safeReadEndSec)
				: demuxer.read("audio");
		const reader = audioStream.getReader();

		try {
			while (!this.cancelled) {
				const { done, value: chunk } = await reader.read();
				if (done || !chunk) break;

				const timestampMs = chunk.timestamp / 1000;
				if (this.isInTrimRegion(timestampMs, sortedTrims)) continue;

				decoder.decode(chunk);

				while (decoder.decodeQueueSize > DECODE_BACKPRESSURE_LIMIT && !this.cancelled) {
					await new Promise((resolve) => setTimeout(resolve, 1));
				}
			}
		} finally {
			try {
				await reader.cancel();
			} catch {
				/* reader already closed */
			}
		}

		if (decoder.state === "configured") {
			await decoder.flush();
			decoder.close();
		}

		if (this.cancelled || decodedFrames.length === 0) {
			for (const frame of decodedFrames) frame.close();
			return;
		}

		// Phase 2: re-encode with timestamps adjusted for trim gaps.
		const encodedChunks: { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }[] = [];

		const encoder = new AudioEncoder({
			output: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => {
				encodedChunks.push({ chunk, meta });
			},
			error: (e: DOMException) => console.error("[AudioProcessor] Encode error:", e),
		});

		const sampleRate = audioConfig.sampleRate || 48000;
		const channels = audioConfig.numberOfChannels || 2;
		const selectedCodec =
			exportCodec ?? (await AudioProcessor.selectSupportedExportCodec(sampleRate, channels));
		if (!selectedCodec) {
			console.warn("[AudioProcessor] No supported audio export codec, skipping audio");
			for (const frame of decodedFrames) frame.close();
			return;
		}

		const outputSampleRate = selectedCodec.sampleRate || sampleRate;
		const outputChannels = selectedCodec.numberOfChannels || channels;
		const encodeConfig: AudioEncoderConfig = {
			codec: selectedCodec.encoderCodec,
			sampleRate: outputSampleRate,
			numberOfChannels: outputChannels,
			bitrate: AUDIO_BITRATE,
		};

		const encodeSupport = await AudioEncoder.isConfigSupported(encodeConfig);
		if (!encodeSupport.supported) {
			console.warn(
				`[AudioProcessor] ${selectedCodec.label} encoding not supported, skipping audio`,
			);
			for (const frame of decodedFrames) frame.close();
			return;
		}

		encoder.configure(encodeConfig);

		for (const audioData of decodedFrames) {
			if (this.cancelled) {
				audioData.close();
				continue;
			}

			const timestampMs = audioData.timestamp / 1000;
			const trimOffsetMs = this.computeTrimOffset(timestampMs, sortedTrims);
			const adjustedTimestampUs = audioData.timestamp - trimOffsetMs * 1000;

			const adjusted = this.cloneForEncoding(
				audioData,
				Math.max(0, adjustedTimestampUs),
				outputChannels,
			);
			audioData.close();

			encoder.encode(adjusted);
			adjusted.close();
		}

		if (encoder.state === "configured") {
			await encoder.flush();
			encoder.close();
		}

		// Phase 3: flush encoded chunks to muxer.
		for (const { chunk, meta } of encodedChunks) {
			if (this.cancelled) break;
			await muxer.addAudioChunk(chunk, meta);
		}

		console.log(
			`[AudioProcessor] Processed ${decodedFrames.length} audio frames, encoded ${encodedChunks.length} chunks`,
		);
	}

	private async loadAudioArrayBuffer(urlOrPath: string): Promise<ArrayBuffer> {
		if (!urlOrPath) throw new Error("Empty audio URL or path");

		// If it's a preset ID without protocol, attempt synthesize via getPresetAudioUrl
		if (
			!urlOrPath.includes("://") &&
			!urlOrPath.includes("/") &&
			!urlOrPath.includes("\\") &&
			!urlOrPath.includes(".")
		) {
			try {
				const presetUrl = await getPresetAudioUrl(urlOrPath);
				if (presetUrl) {
					urlOrPath = presetUrl;
				}
			} catch {
				/* continue */
			}
		}

		// If it's a blob, data, or web URL, fetch directly (no IPC disk lookup needed)
		if (
			urlOrPath.startsWith("blob:") ||
			urlOrPath.startsWith("data:") ||
			urlOrPath.startsWith("http:") ||
			urlOrPath.startsWith("https:")
		) {
			const res = await fetch(urlOrPath);
			if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`);
			return await res.arrayBuffer();
		}

		// Local file path or file:// URL
		if (
			typeof window !== "undefined" &&
			(
				window as unknown as {
					electronAPI?: {
						readBinaryFile?: (
							p: string,
						) => Promise<{ success: boolean; data?: Uint8Array | ArrayBuffer; error?: string }>;
					};
				}
			).electronAPI?.readBinaryFile
		) {
			try {
				const electron = (
					window as unknown as {
						electronAPI: {
							readBinaryFile: (
								p: string,
							) => Promise<{ success: boolean; data?: Uint8Array | ArrayBuffer; error?: string }>;
						};
					}
				).electronAPI;

				let localPath = urlOrPath;
				if (localPath.startsWith("file://")) {
					try {
						const parsed = new URL(localPath);
						localPath = decodeURIComponent(parsed.pathname);
						if (localPath.match(/^\/[a-zA-Z]:/)) {
							localPath = localPath.slice(1);
						}
					} catch {
						localPath = urlOrPath.replace(/^file:\/\/\/?/, "");
					}
				}
				let res = await electron.readBinaryFile(localPath);
				if (!res.success && localPath !== urlOrPath) {
					res = await electron.readBinaryFile(urlOrPath);
				}
				if (res.success && res.data) {
					const raw = res.data;
					if (raw instanceof ArrayBuffer) {
						return raw.slice(0);
					}
					if (ArrayBuffer.isView(raw)) {
						const view = raw as ArrayBufferView;
						const copy = new Uint8Array(view.byteLength);
						copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
						return copy.buffer;
					}
					if (typeof (raw as unknown as { byteLength?: number }).byteLength === "number") {
						const rawBuf = (raw as unknown as { buffer?: ArrayBuffer }).buffer;
						if (rawBuf instanceof ArrayBuffer) {
							return rawBuf.slice(0);
						}
					}
				}
			} catch (e) {
				console.warn("[AudioProcessor] readBinaryFile failed, falling back to fetch", e);
			}
		}

		let fetchUrl = urlOrPath;
		if (
			!fetchUrl.startsWith("file://") &&
			!fetchUrl.startsWith("http://") &&
			!fetchUrl.startsWith("https://") &&
			!fetchUrl.startsWith("blob:") &&
			!fetchUrl.startsWith("data:")
		) {
			const normalized = fetchUrl.replace(/\\/g, "/");
			fetchUrl = `file:///${normalized.replace(/^\/+/, "")}`;
		}

		try {
			const safeFetchUrl = encodeURI(decodeURI(fetchUrl));
			const res = await fetch(safeFetchUrl);
			if (res.ok) {
				return await res.arrayBuffer();
			}
		} catch (fetchErr) {
			console.warn("[AudioProcessor] fetch fallback failed:", fetchErr);
		}

		throw new Error(`Failed to fetch audio: ${urlOrPath}`);
	}

	private async decodeAudioBufferFromBytes(bytes: ArrayBuffer): Promise<AudioBuffer> {
		const AudioCtxClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		const OfflineAudioCtxClass =
			window.OfflineAudioContext ||
			(window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
				.webkitOfflineAudioContext;

		let lastError: unknown = null;
		if (AudioCtxClass) {
			let ctx: AudioContext | null = null;
			try {
				ctx = new AudioCtxClass();
				const copy = bytes.slice(0);
				return await ctx.decodeAudioData(copy);
			} catch (err) {
				lastError = err;
			} finally {
				if (ctx && typeof ctx.close === "function") {
					ctx.close().catch(() => {});
				}
			}
		}

		if (OfflineAudioCtxClass) {
			try {
				const offlineCtx = new OfflineAudioCtxClass(1, 1, 44100);
				const copy = bytes.slice(0);
				return await offlineCtx.decodeAudioData(copy);
			} catch (err) {
				lastError = err;
			}
		}

		throw lastError || new Error("Failed to decode audio data: no compatible audio context");
	}

	private async decodeSourceAudioBufferFromDemuxer(
		demuxer: WebDemuxer,
		readEndSec?: number,
	): Promise<AudioBuffer | null> {
		let audioConfig: AudioDecoderConfig;
		try {
			audioConfig = await demuxer.getDecoderConfig("audio");
		} catch {
			return null;
		}

		const decodedFrames: AudioData[] = [];
		const decoder = new AudioDecoder({
			output: (frame) => decodedFrames.push(frame),
			error: (err) => console.warn("[AudioProcessor] Demuxer decode error:", err),
		});
		decoder.configure(audioConfig);

		const audioStream = readEndSec ? demuxer.read("audio", 0, readEndSec) : demuxer.read("audio");
		const reader = audioStream.getReader();

		try {
			while (!this.cancelled) {
				const { done, value: chunk } = await reader.read();
				if (done || !chunk) break;
				decoder.decode(chunk);
				while (decoder.decodeQueueSize > DECODE_BACKPRESSURE_LIMIT && !this.cancelled) {
					await new Promise((r) => setTimeout(r, 1));
				}
			}
		} finally {
			try {
				await reader.cancel();
			} catch {
				/* ignore */
			}
		}

		if (decoder.state === "configured") {
			await decoder.flush();
			decoder.close();
		}

		if (decodedFrames.length === 0) return null;

		const sampleRate = audioConfig.sampleRate || 48000;
		const channels = audioConfig.numberOfChannels || 2;
		let totalFramesCount = 0;
		for (const f of decodedFrames) totalFramesCount += f.numberOfFrames;

		const offlineCtxClass =
			window.OfflineAudioContext ||
			(window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
				.webkitOfflineAudioContext;
		const ctx = new offlineCtxClass(channels, Math.max(1, totalFramesCount), sampleRate);
		const audioBuffer = ctx.createBuffer(channels, Math.max(1, totalFramesCount), sampleRate);
		const channelArrays = Array.from({ length: channels }, (_, c) => audioBuffer.getChannelData(c));

		let frameOffset = 0;
		for (const f of decodedFrames) {
			for (let c = 0; c < channels; c++) {
				const plane = new Float32Array(f.numberOfFrames);
				f.copyTo(plane, { planeIndex: c });
				channelArrays[c].set(plane, frameOffset);
			}
			frameOffset += f.numberOfFrames;
			f.close();
		}

		return audioBuffer;
	}

	private async renderTimelineAudioOffline(
		demuxer: WebDemuxer | null,
		muxer: VideoMuxer,
		videoUrl: string,
		trimRegions: TrimRegion[],
		speedRegions: SpeedRegion[],
		validatedDurationSec: number,
		exportCodec: ExportAudioCodec,
		backgroundAudioUrl?: string,
		audioSettings?: AudioSettingsState,
		hasSourceAudio: boolean = true,
		effectiveDurationSec?: number,
	): Promise<void> {
		const targetDurationSec = effectiveDurationSec ?? validatedDurationSec;
		if (targetDurationSec <= 0) return;

		const sampleRate = exportCodec.sampleRate || 48000;
		const totalFrames = Math.max(1, Math.ceil(targetDurationSec * sampleRate));

		const offlineCtxClass =
			window.OfflineAudioContext ||
			(window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
				.webkitOfflineAudioContext;
		if (!offlineCtxClass) {
			console.warn("[AudioProcessor] OfflineAudioContext unavailable");
			return;
		}

		const offlineCtx = new offlineCtxClass(2, totalFrames, sampleRate);

		// 1. Load Background Audio if provided
		let bgAudioBuffer: AudioBuffer | null = null;
		if (backgroundAudioUrl) {
			try {
				const bgBytes = await this.loadAudioArrayBuffer(backgroundAudioUrl);
				bgAudioBuffer = await this.decodeAudioBufferFromBytes(bgBytes);
				console.log(
					`[AudioProcessor] Loaded background audio: ${bgAudioBuffer.duration.toFixed(1)}s, ${bgAudioBuffer.numberOfChannels}ch`,
				);
			} catch (err) {
				console.warn("[AudioProcessor] Failed to decode background audio:", err);
			}
		}

		// 2. Load Source Audio if present (prioritize fast demuxer stream, fallback to full buffer)
		let sourceAudioBuffer: AudioBuffer | null = null;
		if (hasSourceAudio) {
			if (demuxer) {
				try {
					sourceAudioBuffer = await this.decodeSourceAudioBufferFromDemuxer(
						demuxer,
						validatedDurationSec + 0.5,
					);
					if (sourceAudioBuffer) {
						console.log(
							`[AudioProcessor] Decoded source audio via demuxer: ${sourceAudioBuffer.duration.toFixed(1)}s`,
						);
					}
				} catch (err) {
					console.warn(
						"[AudioProcessor] Demuxer audio decoding failed, trying direct buffer:",
						err,
					);
				}
			}
			if (!sourceAudioBuffer && videoUrl) {
				try {
					const srcBytes = await this.loadAudioArrayBuffer(videoUrl);
					sourceAudioBuffer = await this.decodeAudioBufferFromBytes(srcBytes);
					console.log(
						`[AudioProcessor] Loaded source audio via direct decode: ${sourceAudioBuffer.duration.toFixed(1)}s`,
					);
				} catch (err) {
					console.warn("[AudioProcessor] Direct source audio decode failed:", err);
				}
			}
		}

		if (this.cancelled) return;
		if (!bgAudioBuffer && !sourceAudioBuffer) {
			console.warn("[AudioProcessor] Neither background nor source audio buffer could be decoded.");
			return;
		}

		// 3. Connect Background Audio
		if (bgAudioBuffer) {
			const bgSource = offlineCtx.createBufferSource();
			bgSource.buffer = bgAudioBuffer;
			bgSource.loop = true;

			const bgGain = offlineCtx.createGain();
			const baseDb = audioSettings?.volumeDb ?? 0;
			let gain = Math.pow(10, baseDb / 20);
			if (audioSettings?.autoNormalization) {
				gain = Math.min(gain, 1.0);
			}
			const targetGain = Math.max(0, gain);

			const fadeInSec = audioSettings?.fadeInSec ?? 0;
			const fadeOutSec = audioSettings?.fadeOutSec ?? 0;
			if (fadeInSec > 0) {
				bgGain.gain.setValueAtTime(0, 0);
				bgGain.gain.linearRampToValueAtTime(targetGain, Math.min(fadeInSec, targetDurationSec));
			} else {
				bgGain.gain.setValueAtTime(targetGain, 0);
			}
			if (fadeOutSec > 0 && targetDurationSec > fadeOutSec) {
				const fadeStart = targetDurationSec - fadeOutSec;
				bgGain.gain.setValueAtTime(targetGain, fadeStart);
				bgGain.gain.linearRampToValueAtTime(0, targetDurationSec);
			}

			bgSource.connect(bgGain);
			bgGain.connect(offlineCtx.destination);
			bgSource.start(0);
		}

		// 4. Connect Source Audio with trim, speed, and blank gap muting
		if (sourceAudioBuffer) {
			const trimSegments = StreamingVideoDecoder.computeSegments(validatedDurationSec, trimRegions);
			const speedSegments = StreamingVideoDecoder.splitBySpeed(trimSegments, speedRegions);
			let timelineCursor = 0;

			for (const seg of speedSegments) {
				const segDuration = (seg.endSec - seg.startSec) / seg.speed;
				if (segDuration <= 0.0001) continue;

				// Check if this segment is inside a kept blank screen gap
				const isKeptBlank = trimRegions?.some(
					(t) =>
						t.keepBlankScreen &&
						seg.startSec * 1000 >= t.startMs - 5 &&
						seg.endSec * 1000 <= t.endMs + 5,
				);

				if (!isKeptBlank) {
					const segSource = offlineCtx.createBufferSource();
					segSource.buffer = sourceAudioBuffer;
					segSource.playbackRate.value = seg.speed;
					segSource.connect(offlineCtx.destination);
					segSource.start(timelineCursor, seg.startSec, seg.endSec - seg.startSec);
				}

				timelineCursor += segDuration;
			}
		}

		// 5. Render Timeline Offline
		const renderedBuffer = await offlineCtx.startRendering();
		if (this.cancelled) return;

		// 6. Encode into AudioEncoder
		const encodedChunks: { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }[] = [];
		const encoder = new AudioEncoder({
			output: (chunk, meta) => encodedChunks.push({ chunk, meta }),
			error: (e) => console.error("[AudioProcessor] Audio encode error:", e),
		});

		const encodeConfig: AudioEncoderConfig = {
			codec: exportCodec.encoderCodec,
			sampleRate,
			numberOfChannels: 2,
			bitrate: AUDIO_BITRATE,
		};

		const support = await AudioEncoder.isConfigSupported(encodeConfig);
		if (!support.supported) {
			console.warn(`[AudioProcessor] ${exportCodec.label} encoding not supported`);
			return;
		}
		encoder.configure(encodeConfig);

		const frameSize = 1024;
		const totalRenderedFrames = renderedBuffer.length;
		const left = renderedBuffer.getChannelData(0);
		const right = renderedBuffer.numberOfChannels > 1 ? renderedBuffer.getChannelData(1) : left;

		for (let offset = 0; offset < totalRenderedFrames; offset += frameSize) {
			if (this.cancelled) break;
			const len = Math.min(frameSize, totalRenderedFrames - offset);
			const planarData = new Float32Array(len * 2);
			planarData.set(left.subarray(offset, offset + len), 0);
			planarData.set(right.subarray(offset, offset + len), len);

			const timestampUs = Math.round((offset / sampleRate) * 1_000_000);
			const audioData = new AudioData({
				format: "f32-planar",
				sampleRate,
				numberOfFrames: len,
				numberOfChannels: 2,
				timestamp: timestampUs,
				data: planarData,
			});
			encoder.encode(audioData);
			audioData.close();
		}

		if (encoder.state === "configured") {
			await encoder.flush();
			encoder.close();
		}

		for (const { chunk, meta } of encodedChunks) {
			if (this.cancelled) break;
			await muxer.addAudioChunk(chunk, meta);
		}

		console.log(
			`[AudioProcessor] Offline timeline audio rendered (${targetDurationSec.toFixed(1)}s), encoded ${encodedChunks.length} chunks`,
		);
	}

	private cloneForEncoding(
		src: AudioData,
		newTimestamp: number,
		targetChannels: number,
	): AudioData {
		if (targetChannels !== src.numberOfChannels) {
			return this.downmixWithTimestamp(src, newTimestamp, targetChannels);
		}

		if (!src.format) {
			throw new Error("AudioData format is required for cloning");
		}
		const isPlanar = src.format.includes("planar");
		const numPlanes = isPlanar ? src.numberOfChannels : 1;

		let totalSize = 0;
		for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
			totalSize += src.allocationSize({ planeIndex });
		}

		const buffer = new ArrayBuffer(totalSize);
		let offset = 0;
		for (let planeIndex = 0; planeIndex < numPlanes; planeIndex++) {
			const planeSize = src.allocationSize({ planeIndex });
			src.copyTo(new Uint8Array(buffer, offset, planeSize), { planeIndex });
			offset += planeSize;
		}

		return new AudioData({
			format: src.format,
			sampleRate: src.sampleRate,
			numberOfFrames: src.numberOfFrames,
			numberOfChannels: src.numberOfChannels,
			timestamp: newTimestamp,
			data: buffer,
		});
	}

	private downmixWithTimestamp(
		src: AudioData,
		newTimestamp: number,
		targetChannels: number,
	): AudioData {
		const sourceChannels = src.numberOfChannels;
		const frameCount = src.numberOfFrames;
		if (targetChannels < 1 || targetChannels > 2) {
			throw new Error(`Unsupported target channel count: ${targetChannels}`);
		}

		const sourcePlanes = Array.from({ length: sourceChannels }, () => new Float32Array(frameCount));
		for (let channel = 0; channel < sourceChannels; channel++) {
			src.copyTo(sourcePlanes[channel], {
				format: "f32-planar",
				planeIndex: channel,
			});
		}

		const output = downmixPlanarChannelsForExport(sourcePlanes, targetChannels);

		return new AudioData({
			format: "f32-planar",
			sampleRate: src.sampleRate,
			numberOfFrames: frameCount,
			numberOfChannels: targetChannels,
			timestamp: newTimestamp,
			data: output.buffer instanceof ArrayBuffer ? output.buffer : output.slice().buffer,
		});
	}

	private isInTrimRegion(timestampMs: number, trims: TrimRegion[]): boolean {
		return trims.some((trim) => timestampMs >= trim.startMs && timestampMs < trim.endMs);
	}

	private computeTrimOffset(timestampMs: number, trims: TrimRegion[]): number {
		let offset = 0;
		for (const trim of trims) {
			if (trim.endMs <= timestampMs) {
				offset += trim.endMs - trim.startMs;
			}
		}
		return offset;
	}

	cancel(): void {
		this.cancelled = true;
	}
}
