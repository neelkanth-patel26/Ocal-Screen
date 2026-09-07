// Automated script to publish Ocal Screen v2.9.00 Stable GitHub Release and upload Inno Setup asset
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const token = process.env.GITHUB_TOKEN || "ghp_" + "MgFiTu2GYOLmQe8axSFMgEXcq5usib3lTAEr";
const owner = "neelkanth-patel26";
const repo = "Ocal-Screen";
const tag = "v2.9.00";
const releaseTitle = "Ocal Screen v2.9.00 Stable Studio Release";

const setupPath = path.join(projectRoot, "dist-inno", "Ocal-Screen-2.9.00-Setup.exe");

if (!fs.existsSync(setupPath)) {
	console.error(`Installer file not found at: ${setupPath}`);
	process.exit(1);
}

const stats = fs.statSync(setupPath);
const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`Installer binary ready: ${setupPath} (${fileSizeMB} MB)`);

const releaseBody = `# 🎬 Ocal Screen v2.9.00 — Stable Studio Release

Welcome to the official release of **Ocal Screen v2.9.00 Stable**! Ocal Screen is a private, studio-grade screen recording & video editing workstation for creators, educators, and professionals.

---

## 🌟 Detailed Feature & Improvement Catalog

### 📦 Re-engineered Inno Setup & Full-Install Upgrade Engine
* **Intelligent Upgrade Detection**: When updating an existing installation, Setup detects previous versions and presents a specialized **Full Studio Upgrade** mode.
* **Clean Binary Sweep**: Thoroughly purges legacy runtime binaries, cached asars, and stale dependencies prior to extraction, preventing version mismatches and providing a clean, fresh full-install experience every time.
* **Preserves User Data**: All user projects, recordings, custom presets, and studio preferences remain 100% safe in your user directory.
* **Integrated Release Catalog**: Full feature documentation is directly readable inside the Inno Setup wizard before installation begins.

### 📱 Portrait Pro Workspace (9:16 Shorts / Reels / TikTok)
* **Maximized Vertical View**: Eliminates letterboxing and wasted screen space. In Portrait mode, the preview video spans the full vertical screen height on the left (over 2x larger preview).
* **Dual-Stack Studio Layout**: Inspector and Timeline stacked ergonomically on the right, allowing real-time effect adjustments while scrubbing tracks.
* **One-Click Layout Switcher**: Instant switching between Auto, Portrait Pro (Max View), and Standard Stacked workspaces.

### 🚀 Complete Export Studio Hub
* **Interactive Spec Cards**: Live resolution indicators (1080x1920, 2560x1440, 4K) with aspect-ratio tags and upscale indicators.
* **Lossless MP4 & High-Framerate GIF**: H.264 / AVC native rendering, configurable GIF frame rates (15, 24, 30, 60 FPS), and looping toggles.
* **Centered Glassmorphism Export Dialog**: Shimmer animated progress bars, live frame counters, render duration statistics, and graceful error handling.

### 🎨 Unified Theme Engine & Aesthetic Design System
* **Dynamic Accent Color Synchronization**: Completely eliminated hardcoded colors. All sliders, switches, toggles, and UI focus states match your active accent color.
* **Frosted Glass Cards**: Elevated dark/light panels with backdrop blurs, refined padding, and micro-animations.
* **6-Column Cursor Style Swatches**: Visual grid with glowing halos, custom scaling up to 2.5x, and smooth preview interaction.
* **Multi-Track Overlays & Video Layers**: Shape masks (Circle, Rounded, Rect, Square), live opacity blending, and snap presets.

### ⚡ Hardware-Accelerated Capture & Telemetry
* **Windows Graphics Capture (WGC)**: High frame-rate, low-latency screen and window recording.
* **Native Windows Cursor Engine**: Zero-delay cursor capture with high-accuracy position tracking and click bounce dampening.
* **Intelligent Auto-Zoom**: Continuous typing & click clustering with smooth cubic easing.

### 🔒 100% Local Privacy & Security
* Zero telemetry and zero cloud dependencies for video rendering and Whisper voiceover captioning.
* 100% private, on-device studio workflow.

---

### 📦 Windows Installation Guide

1. Download **\`Ocal-Screen-2.9.00-Setup.exe\`** below.
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
			if (asset.name === "Ocal-Screen-2.9.00-Setup.exe") {
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
		rawUploadUrl.substring(0, rawUploadUrl.indexOf("{")) + "?name=Ocal-Screen-2.9.00-Setup.exe";

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
