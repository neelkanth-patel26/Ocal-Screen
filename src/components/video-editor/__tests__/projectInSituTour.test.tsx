import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	hasSeenTutorialVersion,
	loadUserPreferences,
	markTutorialVersionSeen,
	resetTutorialVersionSeen,
} from "@/lib/userPreferences";
import { ProjectInSituTour } from "../ProjectInSituTour";

describe("ProjectInSituTour and tutorial version preferences", () => {
	beforeEach(() => {
		const store = new Map<string, string>();
		const stub = {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, String(value));
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
			clear: () => store.clear(),
			key: (i: number) => Array.from(store.keys())[i] ?? null,
			get length() {
				return store.size;
			},
		};
		Object.defineProperty(globalThis, "localStorage", {
			value: stub,
			configurable: true,
		});
	});

	it("manages tutorial version seen status", () => {
		expect(hasSeenTutorialVersion("3.2.0")).toBe(false);

		markTutorialVersionSeen("3.2.0");
		expect(hasSeenTutorialVersion("3.2.0")).toBe(true);
		expect(loadUserPreferences().lastSeenTutorialVersion).toBe("3.2.0");

		resetTutorialVersionSeen();
		expect(hasSeenTutorialVersion("3.2.0")).toBe(false);
		expect(loadUserPreferences().lastSeenTutorialVersion).toBe(null);
	});

	it("renders personalized project stats directly in the in-situ showcase", () => {
		const onTogglePlay = vi.fn();
		const onSplitAtPlayhead = vi.fn();
		const onClose = vi.fn();

		render(
			<ProjectInSituTour
				isOpen={true}
				onClose={onClose}
				projectStats={{
					projectName: "my-gameplay-recording.mp4",
					duration: 42.5,
					audioTrackName: "SEM DEMORA",
					hasBackgroundMusic: true,
					trimCount: 2,
					speedCount: 1,
					zoomCount: 3,
					annotationCount: 0,
					splitCount: 1,
				}}
				currentTime={12.4}
				isPlaying={false}
				onTogglePlay={onTogglePlay}
				onSplitAtPlayhead={onSplitAtPlayhead}
			/>,
		);

		// Verified personalized project name and duration appear on-screen
		expect(screen.getByText("my-gameplay-recording.mp4")).toBeDefined();
		expect(screen.getByText("(0:42s)")).toBeDefined();

		// Step 1: Timeline Slicing is active
		expect(screen.getByText("Timeline & Slicing")).toBeDefined();

		// Interactive test play button triggers real project playback
		const playBtn = screen.getByText("Play Current Video");
		fireEvent.click(playBtn);
		expect(onTogglePlay).toHaveBeenCalledTimes(1);

		// Interactive test split button triggers blade cut in project
		const splitBtn = screen.getByText("Split at Current Playhead (S)");
		fireEvent.click(splitBtn);
		expect(onSplitAtPlayhead).toHaveBeenCalledTimes(1);
	});

	it("allows stepping forward through all feature chapters", () => {
		const onClose = vi.fn();

		render(
			<ProjectInSituTour
				isOpen={true}
				onClose={onClose}
				projectStats={{
					projectName: "demo.mp4",
					duration: 25,
					audioTrackName: "SEM DEMORA",
					hasBackgroundMusic: true,
					trimCount: 1,
					speedCount: 0,
					zoomCount: 0,
					annotationCount: 0,
					splitCount: 0,
				}}
				currentTime={5}
				isPlaying={false}
			/>,
		);

		// Step 1 -> Step 2 (Trim)
		const nextBtn = screen.getByText("Next");
		fireEvent.click(nextBtn);

		expect(screen.getByText("Trim Cuts & Blank Screen")).toBeDefined();
		expect(screen.getByText(/Ocal Screen is not responsible for editing gaps/)).toBeDefined();

		// Step 2 -> Step 3 (Audio)
		fireEvent.click(screen.getByText("Next"));
		expect(screen.getByText(/Audio Engine & Dual Mux \(3\.2\.0\)/)).toBeDefined();
	});
});
