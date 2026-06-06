#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
	console.log("Skipping macOS ScreenCaptureKit helper build: host platform is not macOS.");
	process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const helperName = "openscreen-screencapturekit-helper";
const cursorHelperName = "openscreen-macos-cursor-helper";
const packageDir = path.join(root, "electron", "native", "screencapturekit");
const buildDir = path.join(packageDir, "build");
const swiftBuildDir = path.join(buildDir, "swiftpm");
const localHelperPath = path.join(buildDir, helperName);
const localCursorHelperPath = path.join(buildDir, cursorHelperName);

// Build a universal (arm64 + x86_64) binary by default so both the arm64 and x64 DMGs ship a helper
// that runs natively. Override with OPENSCREEN_MAC_HELPER_ARCHS (comma-separated) for a faster
// single-arch local build.
const archs = (process.env.OPENSCREEN_MAC_HELPER_ARCHS ?? "arm64,x86_64")
	.split(",")
	.map((a) => a.trim())
	.filter(Boolean);
const archToTag = (arch) => (arch === "x86_64" || arch === "x64" ? "darwin-x64" : "darwin-arm64");
// A universal binary runs on both arches, so when building both, place it in each dir the runtime
// might read (it resolves electron/native/bin/<darwin-arm64|darwin-x64> by the running app's arch).
const targetTags = archs.length > 1 ? ["darwin-arm64", "darwin-x64"] : [archToTag(archs[0])];

const xcodebuildVersion = spawnSync("xcodebuild", ["-version"], {
	cwd: root,
	encoding: "utf8",
});

if (xcodebuildVersion.status !== 0) {
	const message = `${xcodebuildVersion.stderr ?? ""}${xcodebuildVersion.stdout ?? ""}`.trim();
	console.error(
		[
			"Unable to build the macOS ScreenCaptureKit helper because full Xcode is not active.",
			"",
			message,
			"",
			"Install Xcode from the App Store or Apple Developer downloads, then run:",
			"  sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer",
			"  sudo xcodebuild -license accept",
			"",
			"Command Line Tools alone may not include the Swift SDK/platform metadata required by SwiftPM.",
		].join("\n"),
	);
	process.exit(1);
}

// Locate a built binary by name under a build dir (SwiftPM's exact output path varies by version).
function findArtifact(dir, name) {
	const stack = [dir];
	const matches = [];
	while (stack.length > 0) {
		const current = stack.pop();
		let entries;
		try {
			entries = fs.readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) stack.push(full);
			else if (entry.isFile() && entry.name === name) matches.push(full);
		}
	}
	matches.sort((a, b) => {
		const ra = /release/i.test(a) ? 0 : 1;
		const rb = /release/i.test(b) ? 0 : 1;
		if (ra !== rb) return ra - rb;
		return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
	});
	return matches[0] ?? null;
}

// Build each arch in its own SwiftPM invocation. A single --arch uses SwiftPM's lenient build path
// that tolerates the helper's `@main` inside a main.swift file; combining arches in one invocation
// (--arch a --arch b) switches to the stricter "apple" build system that rejects it. We lipo the
// slices together afterwards.
const slicesByName = { [helperName]: [], [cursorHelperName]: [] };
for (const arch of archs) {
	const archBuildDir = path.join(swiftBuildDir, arch);
	const result = spawnSync(
		"swift",
		[
			"build",
			"-c",
			"release",
			"--arch",
			arch,
			"--package-path",
			packageDir,
			"--build-path",
			archBuildDir,
		],
		{
			cwd: root,
			stdio: "inherit",
		},
	);
	if (result.error) {
		console.error(`Failed to start Swift build (${arch}): ${result.error.message}`);
		process.exit(1);
	}
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
	for (const name of [helperName, cursorHelperName]) {
		const artifact = findArtifact(archBuildDir, name);
		if (!artifact) {
			console.error(`Swift build (${arch}) completed but artifact was not found: ${name}`);
			process.exit(1);
		}
		slicesByName[name].push(artifact);
	}
}

fs.mkdirSync(buildDir, { recursive: true });
const targetDirs = targetTags.map((tag) => path.join(root, "electron", "native", "bin", tag));
for (const dir of targetDirs) fs.mkdirSync(dir, { recursive: true });

for (const [name, localPath] of [
	[helperName, localHelperPath],
	[cursorHelperName, localCursorHelperPath],
]) {
	const slices = slicesByName[name];
	let source = slices[0];
	// Stitch the per-arch slices into one universal (fat) binary so the same file runs on both arches.
	if (slices.length > 1) {
		const universal = path.join(buildDir, `${name}.universal`);
		const lipo = spawnSync("lipo", ["-create", ...slices, "-output", universal], {
			cwd: root,
			stdio: "inherit",
		});
		if (lipo.status !== 0) {
			console.error(`lipo failed to combine ${name} (${archs.join(", ")})`);
			process.exit(lipo.status ?? 1);
		}
		source = universal;
	}
	for (const dest of [localPath, ...targetDirs.map((dir) => path.join(dir, name))]) {
		fs.copyFileSync(source, dest);
		fs.chmodSync(dest, 0o755);
	}
	console.log(`Built ${name} (${archs.join(", ")}) → ${targetTags.join(", ")}`);
}
