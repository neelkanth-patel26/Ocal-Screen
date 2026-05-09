import { describe, expect, it } from "vitest";
import { parentDirectoryOf } from "./userPreferences";

describe("parentDirectoryOf", () => {
	it("returns the directory for a POSIX path", () => {
		expect(parentDirectoryOf("/Users/me/Movies/clip.mp4")).toBe("/Users/me/Movies");
	});

	it("returns the directory for a Windows path", () => {
		expect(parentDirectoryOf("C:\\Users\\me\\Movies\\clip.mp4")).toBe("C:\\Users\\me\\Movies");
	});

	it("preserves the POSIX root when the file is at /", () => {
		expect(parentDirectoryOf("/video.mp4")).toBe("/");
	});

	it("preserves the Windows drive root with its trailing separator", () => {
		expect(parentDirectoryOf("C:\\video.mp4")).toBe("C:\\");
		expect(parentDirectoryOf("D:/video.mp4")).toBe("D:/");
	});

	it("returns null when no separator is present", () => {
		expect(parentDirectoryOf("video.mp4")).toBeNull();
		expect(parentDirectoryOf("")).toBeNull();
	});
});
