import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioProcessor, downmixPlanarChannelsForExport } from "./audioEncoder";

describe("AudioProcessor.selectSupportedExportCodec", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("falls back to stereo when the source channel count cannot be encoded", async () => {
		const isConfigSupported = vi.fn(async (config: AudioEncoderConfig) => ({
			config,
			supported:
				config.codec === "mp4a.40.2" &&
				config.sampleRate === 44100 &&
				config.numberOfChannels === 2,
		}));
		vi.stubGlobal("AudioEncoder", { isConfigSupported });

		const codec = await AudioProcessor.selectSupportedExportCodec(44100, 8);

		expect(codec).toMatchObject({
			encoderCodec: "mp4a.40.2",
			muxerCodec: "aac",
			sampleRate: 44100,
			numberOfChannels: 2,
		});
		expect(isConfigSupported).toHaveBeenCalledWith({
			codec: "mp4a.40.2",
			sampleRate: 44100,
			numberOfChannels: 8,
			bitrate: 128000,
		});
		expect(isConfigSupported).toHaveBeenCalledWith({
			codec: "mp4a.40.2",
			sampleRate: 44100,
			numberOfChannels: 2,
			bitrate: 128000,
		});
	});
});

describe("downmixPlanarChannelsForExport", () => {
	it("preserves non-front Windows system audio channels when exporting stereo", () => {
		const sourcePlanes = Array.from({ length: 8 }, (_, channel) => {
			const plane = new Float32Array(2);
			if (channel === 2) {
				plane[0] = 0.8;
				plane[1] = 0.4;
			}
			if (channel === 6) {
				plane[0] = 0.2;
				plane[1] = 0.1;
			}
			return plane;
		});

		const stereo = downmixPlanarChannelsForExport(sourcePlanes, 2);

		expect(stereo[0]).toBeGreaterThan(0);
		expect(stereo[1]).toBeGreaterThan(0);
		expect(stereo[2]).toBeGreaterThan(0);
		expect(stereo[3]).toBeGreaterThan(0);
	});

	it("duplicates mono microphone audio when exporting stereo", () => {
		const mono = new Float32Array([0.25, -0.5]);

		const stereo = downmixPlanarChannelsForExport([mono], 2);

		expect(Array.from(stereo)).toEqual([0.25, -0.5, 0.25, -0.5]);
	});
});

describe("AudioProcessor.loadAudioArrayBuffer", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("correctly preserves bytes when electron.readBinaryFile returns an ArrayBuffer", async () => {
		const processor = new AudioProcessor();
		const rawBytes = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]); // ID3 header
		const arrayBuf = rawBytes.buffer.slice(0);

		vi.stubGlobal("window", {
			electronAPI: {
				readBinaryFile: vi.fn(async () => ({
					success: true,
					data: arrayBuf,
				})),
			},
		});

		const loaded = await (
			processor as unknown as {
				loadAudioArrayBuffer: (p: string) => Promise<ArrayBuffer>;
			}
		).loadAudioArrayBuffer("file:///C:/Audio/soundtrack.mp3");

		const resultView = new Uint8Array(loaded);
		expect(resultView.length).toBe(6);
		expect(resultView[0]).toBe(0x49);
		expect(resultView[1]).toBe(0x44);
		expect(resultView[2]).toBe(0x33);
	});

	it("correctly preserves bytes when electron.readBinaryFile returns a Uint8Array", async () => {
		const processor = new AudioProcessor();
		const rawBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // RIFF header

		vi.stubGlobal("window", {
			electronAPI: {
				readBinaryFile: vi.fn(async () => ({
					success: true,
					data: rawBytes,
				})),
			},
		});

		const loaded = await (
			processor as unknown as {
				loadAudioArrayBuffer: (p: string) => Promise<ArrayBuffer>;
			}
		).loadAudioArrayBuffer("file:///C:/Audio/track.wav");

		const resultView = new Uint8Array(loaded);
		expect(resultView.length).toBe(4);
		expect(resultView[0]).toBe(0x52);
		expect(resultView[1]).toBe(0x49);
		expect(resultView[2]).toBe(0x46);
		expect(resultView[3]).toBe(0x46);
	});
});
