import { getAssetPath } from "@/lib/assetPath";

export const DEFAULT_WALLPAPER = "/wallpapers/wallpaper1.jpg";

export type WallpaperClassification =
	| { kind: "color"; value: string }
	| { kind: "gradient"; value: string }
	| { kind: "image"; path: string };

export function classifyWallpaper(value: string): WallpaperClassification {
	if (value.startsWith("#")) {
		return { kind: "color", value };
	}
	if (value.startsWith("linear-gradient") || value.startsWith("radial-gradient")) {
		return { kind: "gradient", value };
	}
	return { kind: "image", path: value };
}

export async function resolveImageWallpaperUrl(imagePath: string): Promise<string> {
	if (
		imagePath.startsWith("http://") ||
		imagePath.startsWith("https://") ||
		imagePath.startsWith("file://") ||
		imagePath.startsWith("data:")
	) {
		return imagePath;
	}
	const relative = imagePath.replace(/^\/+/, "");
	return getAssetPath(relative);
}

export class BackgroundLoadError extends Error {
	readonly url: string;
	readonly cause?: unknown;

	constructor(url: string, cause?: unknown) {
		super(`Failed to load background image: ${url}`);
		this.name = "BackgroundLoadError";
		this.url = url;
		this.cause = cause;
	}
}
