import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BackgroundLoadError,
	classifyWallpaper,
	DEFAULT_WALLPAPER,
	resolveImageWallpaperUrl,
} from "./wallpaper";

describe("classifyWallpaper", () => {
	it("classifies hex color", () => {
		expect(classifyWallpaper("#1a1a2e")).toEqual({ kind: "color", value: "#1a1a2e" });
	});

	it("classifies linear gradient", () => {
		const value = "linear-gradient(90deg, red, blue)";
		expect(classifyWallpaper(value)).toEqual({ kind: "gradient", value });
	});

	it("classifies radial gradient", () => {
		const value = "radial-gradient(circle, red, blue)";
		expect(classifyWallpaper(value)).toEqual({ kind: "gradient", value });
	});

	it("classifies leading-slash image path", () => {
		expect(classifyWallpaper("/wallpapers/wallpaper1.jpg")).toEqual({
			kind: "image",
			path: "/wallpapers/wallpaper1.jpg",
		});
	});

	it("classifies http URL as image", () => {
		expect(classifyWallpaper("https://example.com/bg.jpg")).toEqual({
			kind: "image",
			path: "https://example.com/bg.jpg",
		});
	});

	it("classifies file:// URL as image", () => {
		expect(classifyWallpaper("file:///tmp/bg.jpg")).toEqual({
			kind: "image",
			path: "file:///tmp/bg.jpg",
		});
	});

	it("classifies data URI as image", () => {
		expect(classifyWallpaper("data:image/png;base64,AAA")).toEqual({
			kind: "image",
			path: "data:image/png;base64,AAA",
		});
	});

	it("DEFAULT_WALLPAPER classifies as image", () => {
		expect(classifyWallpaper(DEFAULT_WALLPAPER)).toEqual({
			kind: "image",
			path: DEFAULT_WALLPAPER,
		});
	});
});

describe("resolveImageWallpaperUrl", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "http:" },
			electronAPI: undefined,
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("passes through http URL unchanged", async () => {
		expect(await resolveImageWallpaperUrl("http://example.com/bg.jpg")).toBe(
			"http://example.com/bg.jpg",
		);
	});

	it("passes through https URL unchanged", async () => {
		expect(await resolveImageWallpaperUrl("https://example.com/bg.jpg")).toBe(
			"https://example.com/bg.jpg",
		);
	});

	it("passes through file:// URL unchanged", async () => {
		expect(await resolveImageWallpaperUrl("file:///tmp/bg.jpg")).toBe("file:///tmp/bg.jpg");
	});

	it("passes through data URI unchanged", async () => {
		const uri = "data:image/png;base64,AAAA";
		expect(await resolveImageWallpaperUrl(uri)).toBe(uri);
	});

	it("resolves leading-slash path via http dev server fallback", async () => {
		expect(await resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg")).toBe(
			"/wallpapers/wallpaper1.jpg",
		);
	});

	it("resolves bare relative path via http dev server fallback", async () => {
		expect(await resolveImageWallpaperUrl("wallpapers/wallpaper1.jpg")).toBe(
			"/wallpapers/wallpaper1.jpg",
		);
	});

	it("encodes path segments with special characters", async () => {
		expect(await resolveImageWallpaperUrl("/wallpapers/my image.jpg")).toBe(
			"/wallpapers/my%20image.jpg",
		);
	});

	it("resolves via electronAPI when not http protocol", async () => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "file:" },
			electronAPI: {
				getAssetBasePath: vi.fn().mockResolvedValue("file:///opt/app/public/"),
			},
		});
		expect(await resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg")).toBe(
			"file:///opt/app/public/wallpapers/wallpaper1.jpg",
		);
	});

	it("electronAPI branch appends trailing slash to base if missing", async () => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "file:" },
			electronAPI: {
				getAssetBasePath: vi.fn().mockResolvedValue("file:///opt/app/public"),
			},
		});
		expect(await resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg")).toBe(
			"file:///opt/app/public/wallpapers/wallpaper1.jpg",
		);
	});

	it("falls back to leading-slash relative when electronAPI returns null", async () => {
		vi.stubGlobal("window", {
			...globalThis.window,
			location: { protocol: "file:" },
			electronAPI: {
				getAssetBasePath: vi.fn().mockResolvedValue(null),
			},
		});
		expect(await resolveImageWallpaperUrl("/wallpapers/wallpaper1.jpg")).toBe(
			"/wallpapers/wallpaper1.jpg",
		);
	});
});

describe("BackgroundLoadError", () => {
	it("carries the failing URL and is instanceof Error", () => {
		const err = new BackgroundLoadError("file:///missing.jpg");
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(BackgroundLoadError);
		expect(err.url).toBe("file:///missing.jpg");
		expect(err.name).toBe("BackgroundLoadError");
		expect(err.message).toContain("file:///missing.jpg");
	});

	it("preserves cause when provided", () => {
		const cause = new Error("inner");
		const err = new BackgroundLoadError("file:///missing.jpg", cause);
		expect(err.cause).toBe(cause);
	});
});
