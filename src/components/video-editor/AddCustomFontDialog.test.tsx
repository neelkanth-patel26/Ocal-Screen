import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddCustomFontDialog } from "./AddCustomFontDialog";

describe("AddCustomFontDialog Component", () => {
	it("renders trigger button and opens dialog", () => {
		render(<AddCustomFontDialog />);

		const trigger = screen.getByRole("button", { name: /install \/ import fonts/i });
		expect(trigger).toBeInTheDocument();

		fireEvent.click(trigger);

		expect(screen.getByText("Font Studio & Library")).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /1-click library/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /local file/i })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /google fonts/i })).toBeInTheDocument();
	});

	it("renders curated fonts in 1-Click Library tab", () => {
		render(<AddCustomFontDialog defaultTab="curated" />);

		const trigger = screen.getByRole("button", { name: /install \/ import fonts/i });
		fireEvent.click(trigger);

		// Check for some curated fonts like Montserrat and Bangers
		expect(screen.getByText("Montserrat")).toBeInTheDocument();
		expect(screen.getByText("Bangers")).toBeInTheDocument();
	});

	it("switches to Local File tab and shows dropzone instructions", () => {
		render(<AddCustomFontDialog defaultTab="local" />);

		const trigger = screen.getByRole("button", { name: /install \/ import fonts/i });
		fireEvent.click(trigger);

		const localTab = screen.getByRole("tab", { name: /local file/i });
		fireEvent.click(localTab);

		expect(screen.getByText(/click or drag & drop font file here/i)).toBeInTheDocument();
	});
});
