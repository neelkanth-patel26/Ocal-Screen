import { describe, expect, it } from "vitest";
import {
	buildGoogleFontImportUrl,
	generateFontId,
	isValidGoogleFontsUrl,
	parseFontFamilyFromImport,
} from "./customFonts";

describe("customFonts library", () => {
	it("should parse font family correctly from standard Google Fonts URLs", () => {
		const url1 = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap";
		expect(parseFontFamilyFromImport(url1)).toBe("Roboto");

		const url2 = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;600&display=swap";
		expect(parseFontFamilyFromImport(url2)).toBe("Open Sans");

		const urlWithImport =
			"@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&display=swap');";
		expect(parseFontFamilyFromImport(urlWithImport)).toBe("Plus Jakarta Sans");
	});

	it("should validate Google Fonts URLs", () => {
		expect(
			isValidGoogleFontsUrl(
				"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap",
			),
		).toBe(true);
		expect(
			isValidGoogleFontsUrl(
				"@import url('https://fonts.googleapis.com/css2?family=Montserrat&display=swap');",
			),
		).toBe(true);
		expect(isValidGoogleFontsUrl("https://example.com/font.css")).toBe(false);
		expect(isValidGoogleFontsUrl("not-a-url")).toBe(false);
	});

	it("should build Google Fonts import URL from font name", () => {
		const url = buildGoogleFontImportUrl("Space Grotesk");
		expect(url).toContain("family=Space+Grotesk");
		expect(isValidGoogleFontsUrl(url)).toBe(true);
	});

	it("should generate stable font ids", () => {
		const id = generateFontId("My Cool Font");
		expect(id).toMatch(/^my-cool-font-\d+$/);
	});
});
