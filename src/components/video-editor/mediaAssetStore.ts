import { parseMediaDate } from "@/lib/mediaDateFormatter";
import { fromFileUrl, toFileUrl } from "./projectPersistence";

export interface MediaAsset {
	id: string;
	name: string;
	path: string;
	url: string;
	type: "video" | "audio" | "image";
	duration?: number;
	sizeFormatted?: string;
	addedAt: number;
	width?: number;
	height?: number;
	isMainVideo?: boolean;
	isWebcam?: boolean;
	isAudioTrack?: boolean;
	isProjectAsset?: boolean;
	sourceType?: "screen" | "webcam" | "audio" | "layer" | "imported";
}

export interface BuildProjectMediaAssetsParams {
	videoSourcePath?: string | null;
	videoPath?: string | null;
	videoDuration?: number;
	webcamVideoSourcePath?: string | null;
	webcamVideoPath?: string | null;
	backgroundAudioUrl?: string | null;
	audioTrackName?: string | null;
	projectCustomAssets?: MediaAsset[];
	videoLayers?: Array<{
		id: string;
		name: string;
		src?: string;
		type?: string;
		startMs?: number;
		endMs?: number;
	}>;
}

const LEGACY_STORAGE_KEY = "ocal_screen_media_assets_v1";

// Safely clear legacy global assets once so they don't leak into new projects
try {
	if (typeof window !== "undefined" && window.localStorage) {
		window.localStorage.removeItem(LEGACY_STORAGE_KEY);
	}
} catch {
	// no-op
}

export function getProjectStorageKey(projectIdentifier?: string | null): string | null {
	if (!projectIdentifier || !projectIdentifier.trim()) return null;
	const safeKey = projectIdentifier.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-64);
	return `ocal_screen_assets_proj_${safeKey}`;
}

export function getStoredMediaAssets(projectIdentifier?: string | null): MediaAsset[] {
	try {
		const key = getProjectStorageKey(projectIdentifier);
		if (!key) {
			return [];
		}
		const raw = localStorage.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (e) {
		console.warn("Failed to load stored media assets:", e);
		return [];
	}
}

export function saveMediaAsset(
	asset: Partial<MediaAsset> & {
		name: string;
		path: string;
		url: string;
		type: "video" | "audio" | "image";
	},
	projectIdentifier?: string | null,
): MediaAsset[] {
	try {
		const fullAsset: MediaAsset = {
			id: asset.id || `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			name: asset.name,
			path: asset.path,
			url: asset.url,
			type: asset.type,
			duration: asset.duration,
			sizeFormatted: asset.sizeFormatted,
			addedAt: asset.addedAt || Date.now(),
			width: asset.width,
			height: asset.height,
			isMainVideo: asset.isMainVideo,
			isWebcam: asset.isWebcam,
			isAudioTrack: asset.isAudioTrack,
			isProjectAsset: true,
			sourceType: asset.sourceType || "imported",
		};
		const key = getProjectStorageKey(projectIdentifier);
		if (!key) {
			return [fullAsset];
		}
		const current = getStoredMediaAssets(projectIdentifier);
		const filtered = current.filter((a) => a.path !== fullAsset.path && a.id !== fullAsset.id);
		const updated = [fullAsset, ...filtered];
		localStorage.setItem(key, JSON.stringify(updated.slice(0, 50)));
		return updated;
	} catch (e) {
		console.warn("Failed to save media asset:", e);
		return [];
	}
}

export function removeMediaAsset(id: string, projectIdentifier?: string | null): MediaAsset[] {
	try {
		const key = getProjectStorageKey(projectIdentifier);
		if (!key) return [];
		const current = getStoredMediaAssets(projectIdentifier);
		const updated = current.filter((a) => a.id !== id);
		localStorage.setItem(key, JSON.stringify(updated));
		return updated;
	} catch (e) {
		console.warn("Failed to remove media asset:", e);
		return [];
	}
}

export function clearAllMediaAssets(projectIdentifier?: string | null): void {
	try {
		const key = getProjectStorageKey(projectIdentifier);
		if (key) {
			localStorage.removeItem(key);
		}
	} catch (e) {
		console.warn("Failed to clear media assets:", e);
	}
}

/**
 * Builds the project-isolated asset list containing:
 * 1. Primary Screen Recording
 * 2. Face Cam Recording (ONLY if face cam was on/recorded)
 * 3. Assigned Audio Track / Voice Over (if assigned)
 * 4. Distinct Video / Image Layers from the timeline
 * 5. Project-specific custom imported assets
 *
 * Switching or loading a different project completely isolates assets to that project.
 */
export function buildProjectMediaAssets(params: BuildProjectMediaAssetsParams): MediaAsset[] {
	const assets: MediaAsset[] = [];
	const seenUrls = new Set<string>();
	const seenPaths = new Set<string>();

	const markSeen = (url?: string, path?: string) => {
		if (url) seenUrls.add(url.toLowerCase().trim());
		if (path) seenPaths.add(path.toLowerCase().trim());
	};

	const isSeen = (url?: string, path?: string) => {
		if (url && seenUrls.has(url.toLowerCase().trim())) return true;
		if (path && seenPaths.has(path.toLowerCase().trim())) return true;
		return false;
	};

	// 1. Primary Screen Recording
	const rawScreenPath =
		params.videoSourcePath?.trim() ||
		(params.videoPath ? fromFileUrl(params.videoPath.trim()) : "");
	const screenUrl = params.videoPath?.trim() || (rawScreenPath ? toFileUrl(rawScreenPath) : "");

	if (rawScreenPath || screenUrl) {
		const rawName = (rawScreenPath || screenUrl).split(/[/\\]/).pop() || "Screen Recording";
		const dateInfo = parseMediaDate(rawName);
		const displayName = dateInfo.cleanName !== rawName ? dateInfo.cleanName : rawName;

		const mainAsset: MediaAsset = {
			id: "project-main-screen",
			name: displayName,
			path: rawScreenPath,
			url: screenUrl,
			type: "video",
			duration: params.videoDuration,
			addedAt: dateInfo.rawTimestamp || Date.now(),
			isMainVideo: true,
			isProjectAsset: true,
			sourceType: "screen",
		};
		assets.push(mainAsset);
		markSeen(screenUrl, rawScreenPath);
	}

	// 2. Face Cam / Webcam Recording (ONLY if face cam was on)
	const rawWebcamPath =
		params.webcamVideoSourcePath?.trim() ||
		(params.webcamVideoPath ? fromFileUrl(params.webcamVideoPath.trim()) : "");
	const webcamUrl =
		params.webcamVideoPath?.trim() || (rawWebcamPath ? toFileUrl(rawWebcamPath) : "");

	if ((rawWebcamPath || webcamUrl) && !isSeen(webcamUrl, rawWebcamPath)) {
		const rawName = (rawWebcamPath || webcamUrl).split(/[/\\]/).pop() || "Face Cam";
		const dateInfo = parseMediaDate(rawName);
		const displayName = dateInfo.cleanName.includes("Recording")
			? `Face Cam • ${dateInfo.formattedDate || "Recording"}`
			: `Face Cam (${dateInfo.cleanName || rawName})`;

		const webcamAsset: MediaAsset = {
			id: "project-webcam-video",
			name: displayName,
			path: rawWebcamPath,
			url: webcamUrl,
			type: "video",
			duration: params.videoDuration,
			addedAt: dateInfo.rawTimestamp || Date.now(),
			isWebcam: true,
			isProjectAsset: true,
			sourceType: "webcam",
		};
		assets.push(webcamAsset);
		markSeen(webcamUrl, rawWebcamPath);
	}

	// 3. Audio Assigned To It (Voice Over / Background Audio)
	if (params.backgroundAudioUrl && params.backgroundAudioUrl.trim()) {
		const audioUrl = params.backgroundAudioUrl.trim();
		const rawAudioPath = fromFileUrl(audioUrl);
		if (!isSeen(audioUrl, rawAudioPath)) {
			const fallbackName = rawAudioPath.split(/[/\\]/).pop() || "Voice Over / Audio";
			const displayName = params.audioTrackName || fallbackName;

			const audioAsset: MediaAsset = {
				id: "project-assigned-audio",
				name: displayName,
				path: rawAudioPath,
				url: audioUrl,
				type: "audio",
				duration: undefined,
				addedAt: Date.now(),
				isAudioTrack: true,
				isProjectAsset: true,
				sourceType: "audio",
			};
			assets.push(audioAsset);
			markSeen(audioUrl, rawAudioPath);
		}
	}

	// 4. Video / Image Layers from timeline (if present and distinct)
	if (params.videoLayers && Array.isArray(params.videoLayers)) {
		for (const layer of params.videoLayers) {
			if (!layer.src || !layer.src.trim()) continue;
			const layerUrl = layer.src.trim();
			const layerPath = fromFileUrl(layerUrl);
			if (isSeen(layerUrl, layerPath)) continue;

			const ext = (layerPath || layerUrl).split(".").pop()?.toLowerCase() || "";
			const isImg =
				["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) ||
				(layer.type === "overlay-video" && Boolean(ext.match(/png|jpg|jpeg|webp/)));
			const isAud = ["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(ext);
			const layerType: "video" | "audio" | "image" = isAud ? "audio" : isImg ? "image" : "video";

			const layerAsset: MediaAsset = {
				id: `layer-asset-${layer.id}`,
				name: layer.name || `Layer Clip`,
				path: layerPath,
				url: layerUrl,
				type: layerType,
				addedAt: Date.now(),
				isProjectAsset: true,
				sourceType: "layer",
			};
			assets.push(layerAsset);
			markSeen(layerUrl, layerPath);
		}
	}

	// 5. Project-Specific Custom Assets (imported directly into this project)
	if (params.projectCustomAssets && Array.isArray(params.projectCustomAssets)) {
		for (const custom of params.projectCustomAssets) {
			if (isSeen(custom.url, custom.path)) continue;
			assets.push({
				...custom,
				isProjectAsset: true,
				sourceType: custom.sourceType || "imported",
			});
			markSeen(custom.url, custom.path);
		}
	}

	return assets;
}
