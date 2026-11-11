import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPresetRenderedText, TEXT_PRESETS, TextCenterTab } from "./TextCenterTab";

describe("getPresetRenderedText", () => {
	it("formats default sample text consistently for every preset type", () => {
		const socialPreset = TEXT_PRESETS.find((p) => p.id === "social-watermark")!;
		expect(getPresetRenderedText(socialPreset, "Sample Title")).toBe("@sampletitle • follow");

		const popPreset = TEXT_PRESETS.find((p) => p.id === "karaoke-pop")!;
		expect(getPresetRenderedText(popPreset, "Sample Title")).toBe("SAMPLE TITLE!");

		const glitchPreset = TEXT_PRESETS.find((p) => p.id === "glitch-pulse")!;
		expect(getPresetRenderedText(glitchPreset, "Sample Title")).toBe("• SAMPLE TITLE");

		const lowerThirdPreset = TEXT_PRESETS.find((p) => p.id === "lower-third")!;
		expect(getPresetRenderedText(lowerThirdPreset, "Sample Title")).toBe("SAMPLE TITLE • HOST");

		const tagPreset = TEXT_PRESETS.find((p) => p.id === "minimal-tag")!;
		expect(getPresetRenderedText(tagPreset, "Sample Title")).toBe("✦ SAMPLE TITLE");

		const floatPreset = TEXT_PRESETS.find((p) => p.id === "bold-float")!;
		expect(getPresetRenderedText(floatPreset, "Sample Title")).toBe("SAMPLE TITLE");
	});

	it("formats custom preview text dynamically when user types in preview bar", () => {
		const socialPreset = TEXT_PRESETS.find((p) => p.id === "social-watermark")!;
		expect(getPresetRenderedText(socialPreset, "OpenScreen")).toBe("@openscreen • follow");

		const arcadePreset = TEXT_PRESETS.find((p) => p.id === "gaming-victory")!;
		expect(getPresetRenderedText(arcadePreset, "Champion")).toBe("CHAMPION!");
	});
});

describe("TextCenterTab Component", () => {
	const defaultProps = {
		isLight: true,
		activeAccent: { hex: "#6366f1", textHex: "#ffffff" },
	};

	it("renders preset cards and calls onSelectTitlePreset with exact rendered text and rich styles", () => {
		const onSelectTitlePreset = vi.fn();
		render(<TextCenterTab {...defaultProps} onSelectTitlePreset={onSelectTitlePreset} />);

		// The Social Handle Badge card should be in the document
		expect(screen.getByText("Social Handle Badge")).toBeInTheDocument();

		// Clicking on Social Handle Badge card
		const socialCard = screen.getByText("Social Handle Badge").closest(".group");
		expect(socialCard).not.toBeNull();
		fireEvent.click(socialCard!);

		expect(onSelectTitlePreset).toHaveBeenCalledTimes(1);
		const insertedPreset = onSelectTitlePreset.mock.calls[0][0];

		// Verify what was presented in the card matches what gets inserted!
		expect(insertedPreset.id).toBe("social-watermark");
		expect(insertedPreset.text).toBe("@sampletitle • follow");
		expect(insertedPreset.fontFamily).toBe('"Plus Jakarta Sans", sans-serif');
		expect(insertedPreset.borderRadius).toBe("9999px");
		expect(insertedPreset.bg).toBe("rgba(15,23,42,0.85)");
		expect(insertedPreset.color).toBe("#ffffff");
	});

	it("updates preview text and inserts the updated custom text on click", () => {
		const onSelectTitlePreset = vi.fn();
		render(<TextCenterTab {...defaultProps} onSelectTitlePreset={onSelectTitlePreset} />);

		const previewInput = screen.getByPlaceholderText(
			"Type custom text to preview in all styles...",
		);
		fireEvent.change(previewInput, { target: { value: "Studio Pro" } });

		const socialCard = screen.getByText("Social Handle Badge").closest(".group");
		fireEvent.click(socialCard!);

		expect(onSelectTitlePreset).toHaveBeenCalledTimes(1);
		const insertedPreset = onSelectTitlePreset.mock.calls[0][0];
		expect(insertedPreset.text).toBe("@studiopro • follow");
	});
});
