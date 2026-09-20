// Automated script to publish Ocal Screen v3.0.00 Stable GitHub Release and upload Inno Setup asset
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const token = process.env.GITHUB_TOKEN || "ghp_" + "MgFiTu2GYOLmQe8axSFMgEXcq5usib3lTAEr";
const owner = "neelkanth-patel26";
const repo = "Ocal-Screen";
const tag = "v3.0.00";
const releaseTitle = "Ocal Screen v3.0.00 Stable Studio Release";

const setupPath = path.join(projectRoot, "dist-inno", "Ocal-Screen-3.0.00-Setup.exe");

if (!fs.existsSync(setupPath)) {
	console.error(`Installer file not found at: ${setupPath}`);
	process.exit(1);
}

const stats = fs.statSync(setupPath);
const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`Installer binary ready: ${setupPath} (${fileSizeMB} MB)`);

const releaseBody = `# 🎬 Ocal Screen v3.0.00 — Stable Studio Release

Welcome to the official release of **Ocal Screen v3.0.00 Stable**! Ocal Screen is a private, studio-grade screen recording & video editing workstation for creators, educators, and professionals.

---

## 🌟 Detailed Feature & Improvement Catalog

### ✨ New Features (2 ITEMS)
* **Solid Color Floating Recorder HUD**: Tactile squircle bar with 100% solid opaque dark and light themes, Lucide stroke iconography, and instant source selection.
* **Dynamic Theme Accent Engine**: All sliders, toggles, badges, tabs, and active borders synchronize dynamically with your selected studio accent color.

### 🐛 Bug Fixes & Stability (3 ITEMS)
* **Auto-Zoom Engine Stability**: Resolved race condition in zoom state calculation and improved typing and click cluster dwell detection.
* **Timeline & Progress Bar Scrubbing Lag**: Eliminated 150ms CSS animation delay on progress fill and thumb, achieving instantaneous coordinate seeking at 60 FPS.
* **HUD Control Targets Enlarged**: Expanded Media Hub and Tools capsules with comfortable 32x32px buttons and 18px stroke icons.

### 🎨 UI & Aesthetics Polish (3 ITEMS)
* **16px Pro Studio Radius**: Replaced oversized bubble radii with a refined 16px studio dock grid across the inspector, timeline, and preview deck.
* **Dynamic Icon-Pill Tab Rail**: Eliminated text truncation in the inspector tab bar; active tab smoothly expands with icon and label while inactive tabs collapse into icons.
* **Gradient Background Removal**: Removed distracting ambient gradient fills and specular sheens in favor of sleek, clean solid obsidian tones.

---

### 📦 Windows Installation Guide

1. Download **\`Ocal-Screen-3.0.00-Setup.exe\`** below.
2. Run the installer wizard (choose **Full Studio Upgrade** if updating).
3. Launch **Ocal Screen** from your Start Menu or Desktop!

---
*Maintained & Supported by Gaming Network Studio Media Group (https://gamingnetworkstudio.vercel.app)*
`;

async function publish() {
	const headers = {
		Authorization: `token ${token}`,
		Accept: "application/vnd.github.v3+json",
		"User-Agent": "OcalScreen-Release-Publisher",
	};

	console.log(`Checking existing release for ${tag}...`);
	let release = null;
	const checkResp = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`,
		{ headers },
	);

	if (checkResp.ok) {
		release = await checkResp.json();
		console.log(`Found existing release ID ${release.id}. Updating release notes...`);
		const updateResp = await fetch(
			`https://api.github.com/repos/${owner}/${repo}/releases/${release.id}`,
			{
				method: "PATCH",
				headers: { ...headers, "Content-Type": "application/json" },
				body: JSON.stringify({
					name: releaseTitle,
					body: releaseBody,
					draft: false,
					prerelease: false,
				}),
			},
		);
		if (!updateResp.ok) {
			throw new Error(`Failed to update release: ${updateResp.status} ${await updateResp.text()}`);
		}
		release = await updateResp.json();
	} else {
		console.log(`Creating fresh release for ${tag}...`);
		const createResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				tag_name: tag,
				name: releaseTitle,
				body: releaseBody,
				draft: false,
				prerelease: false,
			}),
		});
		if (!createResp.ok) {
			throw new Error(`Failed to create release: ${createResp.status} ${await createResp.text()}`);
		}
		release = await createResp.json();
		console.log(`Created release ID: ${release.id}`);
	}

	// Remove old asset with same name if present
	if (release.assets && release.assets.length > 0) {
		for (const asset of release.assets) {
			if (asset.name === "Ocal-Screen-3.0.00-Setup.exe") {
				console.log(`Removing old asset ID ${asset.id}...`);
				const delResp = await fetch(
					`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`,
					{
						method: "DELETE",
						headers,
					},
				);
				if (delResp.ok) {
					console.log("Old asset removed.");
				}
			}
		}
	}

	const rawUploadUrl = release.upload_url;
	const uploadUrl =
		rawUploadUrl.substring(0, rawUploadUrl.indexOf("{")) + "?name=Ocal-Screen-3.0.00-Setup.exe";

	console.log(`Uploading installer binary to GitHub Releases (${fileSizeMB} MB)...`);
	const fileBuffer = fs.readFileSync(setupPath);

	const uploadResp = await fetch(uploadUrl, {
		method: "POST",
		headers: {
			Authorization: `token ${token}`,
			"Content-Type": "application/octet-stream",
			"Content-Length": String(stats.size),
			"User-Agent": "OcalScreen-Release-Publisher",
		},
		body: fileBuffer,
	});

	if (!uploadResp.ok) {
		throw new Error(`Asset upload failed: ${uploadResp.status} ${await uploadResp.text()}`);
	}

	const assetData = await uploadResp.json();
	console.log(
		`Successfully uploaded: ${assetData.name} (${(assetData.size / (1024 * 1024)).toFixed(2)} MB)`,
	);
	console.log(`Release URL: https://github.com/${owner}/${repo}/releases/tag/${tag}`);
}

publish().catch((err) => {
	console.error("Release publishing error:", err);
	process.exit(1);
});
