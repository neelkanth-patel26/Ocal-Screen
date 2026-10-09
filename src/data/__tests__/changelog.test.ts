import { describe, expect, it } from "vitest";
import { CHANGELOG_DATA } from "../changelog";

describe("Changelog Data Integrity", () => {
	it("contains at least one release", () => {
		expect(CHANGELOG_DATA.length).toBeGreaterThan(0);
	});

	it("has valid semver versions and release metadata for all releases", () => {
		for (const release of CHANGELOG_DATA) {
			expect(release.version).toMatch(/^(v)?\d+\.\d+(\.\d+)?$/);
			expect(release.title).toBeTruthy();
			expect(release.date).toBeTruthy();
			expect(release.tagline).toBeTruthy();
			expect(release.categories.length).toBeGreaterThan(0);

			for (const category of release.categories) {
				expect(category.name).toBeTruthy();
				expect(category.icon).toBeTruthy();
				expect(category.items.length).toBeGreaterThan(0);

				for (const item of category.items) {
					expect(item.title).toBeTruthy();
					expect(item.description).toBeTruthy();
				}
			}
		}
	});

	it("contains current latest version 3.2.0 with new features and stability fixes", () => {
		const latest = CHANGELOG_DATA[0];
		expect(latest.version.replace(/^v/i, "")).toBe("3.2.0");
		expect(latest.isCurrent).toBe(true);

		const categoryNames = latest.categories.map((c) => c.name.toLowerCase());
		expect(categoryNames.some((n) => n.includes("feature") || n.includes("editor"))).toBe(true);
		expect(categoryNames.some((n) => n.includes("fix") || n.includes("stability"))).toBe(true);
	});

	it("contains historical version 3.0.00", () => {
		const v3000 = CHANGELOG_DATA.find((r) => r.version.replace(/^v/i, "") === "3.0.00");
		expect(v3000).toBeDefined();
	});
});
