import { describe, expect, it } from "vitest";
import { buildProjectMediaAssets, type MediaAsset } from "./mediaAssetStore";

describe("buildProjectMediaAssets", () => {
	it("includes screen recording, facecam (when on), and assigned audio", () => {
		const assets = buildProjectMediaAssets({
			videoSourcePath: "C:\\Videos\\recording-1789549479096.webm",
			videoPath: "file:///C:/Videos/recording-1789549479096.webm",
			videoDuration: 120,
			webcamVideoSourcePath: "C:\\Videos\\recording-webcam-1789549479096.webm",
			webcamVideoPath: "file:///C:/Videos/recording-webcam-1789549479096.webm",
			backgroundAudioUrl: "file:///C:/Audio/voiceover.mp3",
			audioTrackName: "Voiceover Track 1",
			projectCustomAssets: [],
		});

		expect(assets).toHaveLength(3);

		const mainVideo = assets.find((a) => a.isMainVideo);
		expect(mainVideo).toBeDefined();
		expect(mainVideo?.type).toBe("video");
		expect(mainVideo?.sourceType).toBe("screen");

		const webcam = assets.find((a) => a.isWebcam);
		expect(webcam).toBeDefined();
		expect(webcam?.type).toBe("video");
		expect(webcam?.sourceType).toBe("webcam");

		const audio = assets.find((a) => a.isAudioTrack);
		expect(audio).toBeDefined();
		expect(audio?.name).toBe("Voiceover Track 1");
		expect(audio?.type).toBe("audio");
		expect(audio?.sourceType).toBe("audio");
	});

	it("omits facecam when facecam was NOT active (no webcam path)", () => {
		const assets = buildProjectMediaAssets({
			videoSourcePath: "C:\\Videos\\screen-only.webm",
			videoDuration: 60,
			webcamVideoSourcePath: null,
			webcamVideoPath: null,
			backgroundAudioUrl: null,
			projectCustomAssets: [],
		});

		expect(assets).toHaveLength(1);
		expect(assets[0].isMainVideo).toBe(true);
		expect(assets.some((a) => a.isWebcam)).toBe(false);
		expect(assets.some((a) => a.isAudioTrack)).toBe(false);
	});

	it("isolates project custom assets and avoids bleed across different projects", () => {
		const customAssetProjectA: MediaAsset = {
			id: "proj-a-custom",
			name: "logo-overlay.png",
			path: "C:\\Assets\\logo.png",
			url: "file:///C:/Assets/logo.png",
			type: "image",
			addedAt: Date.now(),
		};

		const projectAAssets = buildProjectMediaAssets({
			videoSourcePath: "C:\\Videos\\projectA.mp4",
			videoDuration: 30,
			webcamVideoSourcePath: "C:\\Videos\\projectA_cam.mp4",
			backgroundAudioUrl: "file:///C:/Music/trackA.mp3",
			audioTrackName: "Music A",
			projectCustomAssets: [customAssetProjectA],
		});

		expect(projectAAssets).toHaveLength(4);
		expect(projectAAssets.some((a) => a.name === "logo-overlay.png")).toBe(true);

		// Now load Project B: It has its own recording, NO facecam, NO audio, and its own assets
		const customAssetProjectB: MediaAsset = {
			id: "proj-b-custom",
			name: "sponsors.mp4",
			path: "C:\\Assets\\sponsors.mp4",
			url: "file:///C:/Assets/sponsors.mp4",
			type: "video",
			addedAt: Date.now(),
		};

		const projectBAssets = buildProjectMediaAssets({
			videoSourcePath: "C:\\Videos\\projectB.mp4",
			videoDuration: 45,
			webcamVideoSourcePath: null,
			backgroundAudioUrl: null,
			projectCustomAssets: [customAssetProjectB],
		});

		// Project B must NOT contain Project A's facecam, audio, or custom logo!
		expect(projectBAssets).toHaveLength(2);
		expect(projectBAssets.some((a) => a.name === "logo-overlay.png")).toBe(false);
		expect(projectBAssets.some((a) => a.isWebcam)).toBe(false);
		expect(projectBAssets.some((a) => a.name === "Music A")).toBe(false);
		expect(projectBAssets.some((a) => a.name === "sponsors.mp4")).toBe(true);
	});
});
