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

	it("contains current version 3.0.00 with new features and performance", () => {
		const current = CHANGELOG_DATA.find((r) => r.version.replace(/^v/i, "") === "3.0.00");
		expect(current).toBeDefined();

		const categoryNames = current!.categories.map((c) => c.name.toLowerCase());
		expect(categoryNames.some((n) => n.includes("feature"))).toBe(true);
		expect(categoryNames.some((n) => n.includes("performance") || n.includes("engine"))).toBe(true);
	});
});
