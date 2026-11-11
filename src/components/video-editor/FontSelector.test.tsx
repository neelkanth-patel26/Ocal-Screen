import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FontSelector } from "./FontSelector";

describe("FontSelector Component", () => {
	it("renders with default font Inter", () => {
		render(<FontSelector value="Inter" onValueChange={vi.fn()} />);
		expect(screen.getByText("Inter")).toBeInTheDocument();
	});

	it("renders font name and category badge correctly", () => {
		render(
			<FontSelector
				value='"Bebas Neue", sans-serif'
				onValueChange={vi.fn()}
				showLabel
				label="Typography"
			/>,
		);
		expect(screen.getByText("Typography")).toBeInTheDocument();
		expect(screen.getByText("Bebas Neue")).toBeInTheDocument();
		expect(screen.getByText("display")).toBeInTheDocument();
	});

	it("opens dropdown and allows selecting a font", () => {
		const onValueChange = vi.fn();
		render(<FontSelector value="Inter" onValueChange={onValueChange} />);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		// Expect popover search input to appear
		const searchInput = screen.getByPlaceholderText(/search fonts/i);
		expect(searchInput).toBeInTheDocument();

		// Find and click a different font e.g. "Space Grotesk"
		const option = screen.getByText("Space Grotesk");
		expect(option).toBeInTheDocument();
		fireEvent.click(option);

		expect(onValueChange).toHaveBeenCalledWith('"Space Grotesk", sans-serif');
	});

	it("filters fonts when user types in search box", () => {
		render(<FontSelector value="Inter" onValueChange={vi.fn()} />);
		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		const searchInput = screen.getByPlaceholderText(/search fonts/i);
		fireEvent.change(searchInput, { target: { value: "Oswald" } });

		expect(screen.getByText("Oswald")).toBeInTheDocument();
		expect(screen.queryByText("Playfair Display")).not.toBeInTheDocument();
	});
});
