import {
	BufferTarget,
	EncodedAudioPacketSource,
	EncodedPacket,
	EncodedVideoPacketSource,
	Mp4OutputFormat,
	Output,
} from "mediabunny";
import type { ExportConfig } from "./types";

export type ExportAudioMuxerCodec = "aac" | "opus";

/**
 * Builds standard ISO 14496-3 2-byte AudioSpecificConfig for AAC-LC.
 * Required by mediabunny's MP4 muxer when raw AAC packets are added.
 */
export function createAacAudioSpecificConfig(sampleRate: number, channels: number): Uint8Array {
	const sampleRateMap: Record<number, number> = {
		96000: 0,
		88200: 1,
		64000: 2,
		48000: 3,
		44100: 4,
		32000: 5,
		24000: 6,
		22050: 7,
		16000: 8,
		12000: 9,
		11025: 10,
		8000: 11,
		7350: 12,
	};
	const sampleRateIndex = sampleRateMap[sampleRate] ?? 3; // Default 48000 Hz
	const audioObjectType = 2; // AAC-LC
	const channelConfig = Math.max(1, Math.min(channels, 2));

	const byte1 = (audioObjectType << 3) | ((sampleRateIndex >> 1) & 0x07);
	const byte2 = ((sampleRateIndex & 0x01) << 7) | ((channelConfig & 0x0f) << 3);

	return new Uint8Array([byte1, byte2]);
}

export class VideoMuxer {
	private output: Output | null = null;
	private videoSource: EncodedVideoPacketSource | null = null;
	private audioSource: EncodedAudioPacketSource | null = null;
	private hasAudio: boolean;
	private target: BufferTarget | null = null;
	private config: ExportConfig;
	private audioCodec: ExportAudioMuxerCodec;
	private audioSampleRate: number;
	private audioChannels: number;
	private firstAudioChunkAdded = false;

	constructor(
		config: ExportConfig,
		hasAudio = false,
		audioCodec: ExportAudioMuxerCodec = "aac",
		sampleRate = 48000,
		channels = 2,
	) {
		this.config = config;
		this.hasAudio = hasAudio;
		this.audioCodec = audioCodec;
		this.audioSampleRate = sampleRate;
		this.audioChannels = channels;
	}

	async initialize(): Promise<void> {
		this.target = new BufferTarget();

		this.output = new Output({
			format: new Mp4OutputFormat({
				fastStart: "in-memory",
			}),
			target: this.target,
		});

		// Codec is deduced from the chunk metadata.
		this.videoSource = new EncodedVideoPacketSource("avc");
		this.output.addVideoTrack(this.videoSource, {
			frameRate: this.config.frameRate,
		});

		if (this.hasAudio) {
			this.audioSource = new EncodedAudioPacketSource(this.audioCodec);
			this.output.addAudioTrack(this.audioSource);
		}

		await this.output.start();
	}

	async addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): Promise<void> {
		if (!this.videoSource) {
			throw new Error("Muxer not initialized");
		}

		const packet = EncodedPacket.fromEncodedChunk(chunk);

		await this.videoSource.add(packet, meta);
	}

	async addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): Promise<void> {
		if (!this.audioSource) {
			throw new Error("Audio not configured for this muxer");
		}

		const packet = EncodedPacket.fromEncodedChunk(chunk);

		let effectiveMeta = meta;
		if (!this.firstAudioChunkAdded) {
			this.firstAudioChunkAdded = true;
			const codecStr =
				meta?.decoderConfig?.codec || (this.audioCodec === "aac" ? "mp4a.40.2" : "opus");
			const sr = meta?.decoderConfig?.sampleRate || this.audioSampleRate;
			const ch = meta?.decoderConfig?.numberOfChannels || this.audioChannels;
			const desc =
				meta?.decoderConfig?.description ||
				(this.audioCodec === "aac" ? createAacAudioSpecificConfig(sr, ch) : undefined);

			effectiveMeta = {
				...meta,
				decoderConfig: {
					codec: codecStr,
					sampleRate: sr,
					numberOfChannels: ch,
					description: desc,
				},
			};
		}

		await this.audioSource.add(packet, effectiveMeta);
	}

	getBuffer(): ArrayBuffer | null {
		return this.target?.buffer ?? null;
	}

	async finalize(): Promise<Blob> {
		if (!this.output || !this.target) {
			throw new Error("Muxer not initialized");
		}

		await this.output.finalize();
		const buffer = this.target.buffer;

		if (!buffer) {
			throw new Error("Failed to finalize output");
		}

		return new Blob([buffer], { type: "video/mp4" });
	}
}
