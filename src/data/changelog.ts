export interface ChangelogItem {
	type: "feature" | "fix" | "improvement" | "ui" | "perf";
	title: string;
	description: string;
}

export interface ChangelogCategory {
	name: string;
	icon: "sparkles" | "bug" | "palette" | "zap";
	badgeColor: "emerald" | "rose" | "sky" | "amber";
	items: ChangelogItem[];
}

export interface VersionRelease {
	version: string;
	date: string;
	isCurrent?: boolean;
	title: string;
	tagline: string;
	categories: ChangelogCategory[];
}

export const CHANGELOG_DATA: VersionRelease[] = [
	{
		version: "3.0.00",
		date: "September 2026",
		isCurrent: true,
		title: "v3.0.00 Stable — Studio Feature Catalog",
		tagline:
			"Re-engineered installer, Portrait Pro workspace, Export Studio Hub, unified theme engine, and hardware-accelerated recording.",
		categories: [
			{
				name: "New Features",
				icon: "sparkles",
				badgeColor: "emerald",
				items: [
					{
						type: "feature",
						title: "Solid Color Floating Recorder HUD",
						description:
							"Tactile squircle bar with 100% solid opaque dark and light themes, Lucide stroke iconography, and instant source selection.",
					},
					{
						type: "feature",
						title: "Dynamic Theme Accent Engine",
						description:
							"All sliders, toggles, badges, tabs, and active borders synchronize dynamically with your selected studio accent color.",
					},
				],
			},
			{
				name: "Bug Fixes & Stability",
				icon: "bug",
				badgeColor: "rose",
				items: [
					{
						type: "fix",
						title: "Auto-Zoom Engine Stability",
						description:
							"Resolved race condition in zoom state calculation and improved typing and click cluster dwell detection.",
					},
					{
						type: "fix",
						title: "Timeline & Progress Bar Scrubbing Lag",
						description:
							"Eliminated 150ms CSS animation delay on progress fill and thumb, achieving instantaneous coordinate seeking at 60 FPS.",
					},
					{
						type: "fix",
						title: "HUD Control Targets Enlarged",
						description:
							"Expanded Media Hub and Tools capsules with comfortable 32x32px buttons and 18px stroke icons.",
					},
				],
			},
			{
				name: "UI & Aesthetics Polish",
				icon: "palette",
				badgeColor: "sky",
				items: [
					{
						type: "ui",
						title: "16px Pro Studio Radius",
						description:
							"Replaced oversized bubble radii with a refined 16px studio dock grid across the inspector, timeline, and preview deck.",
					},
					{
						type: "ui",
						title: "Dynamic Icon-Pill Tab Rail",
						description:
							"Eliminated text truncation in the inspector tab bar; active tab smoothly expands with icon and label while inactive tabs collapse into icons.",
					},
					{
						type: "ui",
						title: "Gradient Background Removal",
						description:
							"Removed distracting ambient gradient fills and specular sheens in favor of sleek, clean solid obsidian tones.",
					},
				],
			},
			{
				name: "Performance & Engine",
				icon: "zap",
				badgeColor: "amber",
				items: [
					{
						type: "perf",
						title: "Hardware-Accelerated Recording & Cursor Telemetry",
						description:
							"Windows Graphics Capture (WGC) helper for smooth, low-latency screen capture. Native Windows Cursor Engine with zero-delay capture, high-accuracy position tracking, and click bounce dampening.",
					},
					{
						type: "perf",
						title: "100% Private & On-Device",
						description:
							"Zero cloud dependencies for video rendering and Whisper voiceover captioning. No telemetric tracking — your creative content stays on your machine.",
					},
				],
			},
		],
	},
	{
		version: "2.9.00",
		date: "September 2026",
		title: "Studio Rework & Solid Color Floating HUD",
		tagline: "Complete UI redesign, solid color floating HUD, and comprehensive bug fixes.",
		categories: [
			{
				name: "New Features",
				icon: "sparkles",
				badgeColor: "emerald",
				items: [
					{
						type: "feature",
						title: "Solid Color Floating Recorder HUD",
						description:
							"Tactile squircle bar with 100% solid opaque dark and light themes, Lucide stroke iconography, and instant source selection.",
					},
					{
						type: "feature",
						title: "Dynamic Theme Accent Engine",
						description:
							"All sliders, toggles, badges, tabs, and active borders synchronize dynamically with your selected studio accent color.",
					},
				],
			},
			{
				name: "Bug Fixes & Stability",
				icon: "bug",
				badgeColor: "rose",
				items: [
					{
						type: "fix",
						title: "Auto-Zoom Engine Stability",
						description:
							"Resolved race condition in zoom state calculation and improved typing and click cluster dwell detection.",
					},
					{
						type: "fix",
						title: "Timeline & Progress Bar Scrubbing Lag",
						description:
							"Eliminated 150ms CSS animation delay on progress fill and thumb, achieving instantaneous coordinate seeking at 60 FPS.",
					},
					{
						type: "fix",
						title: "HUD Control Targets Enlarged",
						description:
							"Expanded Media Hub and Tools capsules with comfortable 32×32px buttons and 18px stroke icons.",
					},
				],
			},
			{
				name: "UI & Aesthetics Polish",
				icon: "palette",
				badgeColor: "sky",
				items: [
					{
						type: "ui",
						title: "16px Pro Studio Radius",
						description:
							"Replaced oversized bubble radii with a refined 16px studio dock grid across the inspector, timeline, and preview deck.",
					},
					{
						type: "ui",
						title: "Dynamic Icon-Pill Tab Rail",
						description:
							"Eliminated text truncation in the inspector tab bar; active tab smoothly expands with icon and label while inactive tabs collapse into icons.",
					},
					{
						type: "ui",
						title: "Gradient Background Removal",
						description:
							"Removed distracting ambient gradient fills and specular sheens in favor of sleek, clean solid obsidian tones.",
					},
				],
			},
		],
	},
	{
		version: "2.0.2",
		date: "August 2026",
		title: "Portrait Pro & Export Hub Introduction",
		tagline: "First introduction of Portrait Pro 9:16 layout and multi-format GIF/MP4 export.",
		categories: [
			{
				name: "New Features",
				icon: "sparkles",
				badgeColor: "emerald",
				items: [
					{
						type: "feature",
						title: "Portrait Workspace Mode",
						description: "Specialized vertical view optimized for mobile social formats.",
					},
					{
						type: "feature",
						title: "Export Studio Modal",
						description: "Custom framerate and resolution settings for MP4 and GIF output.",
					},
				],
			},
			{
				name: "Bug Fixes",
				icon: "bug",
				badgeColor: "rose",
				items: [
					{
						type: "fix",
						title: "Aspect Ratio Presets",
						description:
							"Fixed scaling glitches when switching between 16:9, 9:16, 1:1, and 4:3 video canvases.",
					},
				],
			},
		],
	},
	{
		version: "1.1.0",
		date: "July 2026",
		title: "Asset Engine & System Upgrades",
		tagline: "High-resolution multi-format icons, automated build scripts, and bug fixes.",
		categories: [
			{
				name: "Improvements",
				icon: "zap",
				badgeColor: "amber",
				items: [
					{
						type: "improvement",
						title: "High-Resolution Icon Packaging",
						description:
							"Added multi-size ICO and PNG assets for Windows taskbar and installer stamping.",
					},
					{
						type: "improvement",
						title: "Automated Build Pipeline",
						description: "Streamlined PowerShell build and release script suite.",
					},
				],
			},
		],
	},
];
