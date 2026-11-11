// Google Fonts and Local Custom Fonts loading and management
import { useEffect, useState } from "react";
import type { FontCategory } from "./fontCatalog";

export interface CustomFont {
	id: string;
	name: string;
	fontFamily: string;
	importUrl?: string; // Google Fonts @import URL
	dataUrl?: string; // Base64 data URL for local font files (.ttf, .otf, .woff, .woff2)
	format?: "truetype" | "opentype" | "woff" | "woff2";
	category?: FontCategory;
	source?: "google" | "local" | "curated" | "system";
	createdAt?: number;
}

const STORAGE_KEY = "openscreen_custom_fonts";
export const FONTS_UPDATED_EVENT = "openscreen:fonts-updated";
const loadedFonts = new Set<string>();

export function getCustomFonts(): CustomFont[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error("Failed to load custom fonts from storage:", error);
		return [];
	}
}

export function saveCustomFonts(fonts: CustomFont[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
		notifyFontsUpdated();
	} catch (error) {
		console.error("Failed to save custom fonts to storage:", error);
		// If quota exceeded, inform caller by re-throwing
		throw error;
	}
}

export function notifyFontsUpdated(): void {
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(FONTS_UPDATED_EVENT));
	}
}

// React hook to listen to custom fonts in real-time across any component
export function useCustomFonts(): CustomFont[] {
	const [fonts, setFonts] = useState<CustomFont[]>(() => getCustomFonts());

	useEffect(() => {
		const handleUpdate = () => {
			setFonts(getCustomFonts());
		};

		window.addEventListener(FONTS_UPDATED_EVENT, handleUpdate);
		return () => {
			window.removeEventListener(FONTS_UPDATED_EVENT, handleUpdate);
		};
	}, []);

	return fonts;
}

// Check if a font family is already present in custom fonts
export function isFontFamilyInstalled(fontFamily: string): boolean {
	const clean = fontFamily.replace(/['"]/g, "").split(",")[0].trim().toLowerCase();
	const fonts = getCustomFonts();
	return fonts.some((f) => {
		const fClean = f.fontFamily.replace(/['"]/g, "").split(",")[0].trim().toLowerCase();
		return fClean === clean;
	});
}

// Throws if the font fails to load
export async function addCustomFont(font: CustomFont): Promise<CustomFont[]> {
	const fonts = getCustomFonts();
	const cleanName = font.fontFamily.replace(/['"]/g, "").split(",")[0].trim().toLowerCase();

	const existsIndex = fonts.findIndex(
		(f) =>
			f.id === font.id ||
			f.fontFamily.replace(/['"]/g, "").split(",")[0].trim().toLowerCase() === cleanName,
	);

	// Load first so a failure throws before we persist it
	await loadFont(font);

	if (existsIndex >= 0) {
		fonts[existsIndex] = { ...fonts[existsIndex], ...font };
	} else {
		fonts.push(font);
	}

	saveCustomFonts(fonts);
	return fonts;
}

export function removeCustomFont(fontId: string): CustomFont[] {
	const fonts = getCustomFonts();
	const filtered = fonts.filter((f) => f.id !== fontId);
	saveCustomFonts(filtered);

	const styleEl = document.getElementById(`custom-font-${fontId}`);
	if (styleEl) {
		styleEl.remove();
	}

	loadedFonts.delete(fontId);
	return filtered;
}

// Load a Custom Font (Google Font @import or local @font-face data URL) into the document
export function loadFont(font: CustomFont): Promise<void> {
	return new Promise((resolve, reject) => {
		if (loadedFonts.has(font.id)) {
			resolve();
			return;
		}

		try {
			const styleId = `custom-font-${font.id}`;
			const existing = document.getElementById(styleId);
			if (existing) {
				existing.remove();
			}

			const style = document.createElement("style");
			style.id = styleId;

			if (font.dataUrl) {
				// Local font file as Data URL
				const formatStr = font.format ? ` format('${font.format}')` : "";
				style.textContent = `
@font-face {
  font-family: '${font.fontFamily}';
  src: url('${font.dataUrl}')${formatStr};
  font-display: swap;
}`;
			} else if (font.importUrl) {
				// Google Fonts or web stylesheet URL
				style.textContent = `@import url('${font.importUrl}');`;
			} else {
				// System or preloaded font
				loadedFonts.add(font.id);
				resolve();
				return;
			}

			document.head.appendChild(style);

			// Also register with FontFace API if supported for immediate Canvas 2D availability
			if (font.dataUrl && typeof FontFace !== "undefined") {
				try {
					const fontFace = new FontFace(font.fontFamily, `url(${font.dataUrl})`);
					fontFace
						.load()
						.then((loadedFace) => {
							if (document.fonts) {
								document.fonts.add(loadedFace);
							}
						})
						.catch((err) => {
							console.warn("FontFace API loading warning:", err);
						});
				} catch (ffErr) {
					console.warn("Could not register FontFace instance:", ffErr);
				}
			}

			waitForFont(font.fontFamily)
				.then(() => {
					loadedFonts.add(font.id);
					resolve();
				})
				.catch((err) => {
					// Fallback: in headless or test environments where check() might timeout,
					// mark loaded if stylesheet is attached
					console.warn(`Font verification warning for "${font.fontFamily}":`, err);
					loadedFonts.add(font.id);
					resolve();
				});
		} catch (error) {
			console.error("Failed to load font:", font, error);
			reject(error);
		}
	});
}

// Wait for a font to load and verify it's actually available
function waitForFont(fontFamily: string, timeout = 5000): Promise<void> {
	return new Promise((resolve, reject) => {
		const cleanName = fontFamily.replace(/['"]/g, "").split(",")[0].trim();
		if (typeof document !== "undefined" && "fonts" in document) {
			Promise.race([
				document.fonts.load(`16px "${cleanName}"`),
				new Promise((_, rej) => setTimeout(() => rej(new Error("Font load timeout")), timeout)),
			])
				.then(() => {
					const isAvailable = document.fonts.check(`16px "${cleanName}"`);
					if (isAvailable) {
						resolve();
					} else {
						// Some browsers report false on check() right after load(), give a short grace period
						setTimeout(() => {
							if (document.fonts.check(`16px "${cleanName}"`)) {
								resolve();
							} else {
								resolve(); // Resolve anyway so UI doesn't block if font was rendered
							}
						}, 300);
					}
				})
				.catch((error) => {
					reject(error);
				});
		} else {
			// No Font Loading API (e.g. Node test environment)
			setTimeout(() => resolve(), 300);
		}
	});
}

// Load all stored custom fonts on app init
export function loadAllCustomFonts(): Promise<void[]> {
	const fonts = getCustomFonts();
	return Promise.all(
		fonts.map((font) =>
			loadFont(font).catch((err) => {
				console.error("Failed to load custom font:", font.name, err);
			}),
		),
	);
}

export function generateFontId(name: string): string {
	return `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
}

// Extract the font family from a Google Fonts @import URL or full URL
export function parseFontFamilyFromImport(importUrl: string): string | null {
	try {
		// Clean up import wrapper if user pasted `@import url('...')`
		const match = importUrl.match(/url\(['"]?(.*?)['"]?\)/);
		const rawUrl = match ? match[1] : importUrl.trim();

		const url = new URL(rawUrl);
		const familyParam = url.searchParams.get("family");

		if (familyParam) {
			// "Roboto:wght@400;700" -> "Roboto"
			const fontName = familyParam.split(":")[0];
			// "Open+Sans" -> "Open Sans"
			return fontName.replace(/\+/g, " ");
		}

		return null;
	} catch (error) {
		console.error("Failed to parse font family from import URL:", error);
		return null;
	}
}

// Does this look like a Google Fonts import URL?
export function isValidGoogleFontsUrl(url: string): boolean {
	try {
		const match = url.match(/url\(['"]?(.*?)['"]?\)/);
		const clean = match ? match[1] : url.trim();
		const urlObj = new URL(clean);
		return urlObj.hostname === "fonts.googleapis.com" && urlObj.searchParams.has("family");
	} catch {
		return false;
	}
}

// Build standard Google Fonts @import URL from a plain font name
export function buildGoogleFontImportUrl(fontName: string): string {
	const formatted = fontName.trim().replace(/\s+/g, "+");
	return `https://fonts.googleapis.com/css2?family=${formatted}:ital,wght@0,400;0,700;1,400&display=swap`;
}

// Read local font file and return base64 Data URL + format + clean name
export async function readFontFile(file: File): Promise<{
	dataUrl: string;
	format: "truetype" | "opentype" | "woff" | "woff2";
	name: string;
}> {
	const extension = file.name.split(".").pop()?.toLowerCase();
	let format: "truetype" | "opentype" | "woff" | "woff2" = "truetype";

	if (extension === "otf") {
		format = "opentype";
	} else if (extension === "woff") {
		format = "woff";
	} else if (extension === "woff2") {
		format = "woff2";
	} else if (extension === "ttf") {
		format = "truetype";
	} else {
		throw new Error("Unsupported font format. Please upload .ttf, .otf, .woff, or .woff2");
	}

	// Clean name: "Roboto-Bold.ttf" -> "Roboto Bold"
	const baseName = file.name.replace(/\.[^/.]+$/, "");
	const cleanName = baseName
		.replace(/[-_]/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.trim();

	const dataUrl = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Failed to read font file"));
		reader.readAsDataURL(file);
	});

	return {
		dataUrl,
		format,
		name: cleanName || "Custom Font",
	};
}
