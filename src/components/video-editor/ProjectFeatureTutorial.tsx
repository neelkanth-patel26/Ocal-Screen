import {
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Cpu,
	Eye,
	FileVideo,
	Gauge,
	Layers,
	Music,
	Pause,
	Play,
	Radio,
	Scissors,
	ShieldAlert,
	Sliders,
	Sparkles,
	Upload,
	Volume2,
	X,
	ZoomIn,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { ACCENT_COLOR_MAP, type AccentColor, markTutorialVersionSeen } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

export interface ProjectStatsSummary {
	projectName?: string | null;
	duration: number; // seconds
	audioTrackName?: string | null;
	hasBackgroundMusic?: boolean;
	trimCount?: number;
	speedCount?: number;
	zoomCount?: number;
	annotationCount?: number;
	splitCount?: number;
}

export interface ProjectFeatureTutorialProps {
	isOpen: boolean;
	onClose: () => void;
	projectStats: ProjectStatsSummary;
	themeMode?: "dark" | "light";
	accentColor?: AccentColor;
	onNavigateToAudioTab?: () => void;
	onNavigateToTrimTab?: () => void;
	onNavigateToZoomTab?: () => void;
}

type ChapterId = "timeline" | "trim" | "audio" | "zoom" | "speed" | "effects" | "export";

interface ChapterDef {
	id: ChapterId;
	title: string;
	badge: string;
	icon: React.ElementType;
	tagline: string;
}

const CHAPTERS: ChapterDef[] = [
	{
		id: "timeline",
		title: "Timeline & Slicing",
		badge: "Precision",
		icon: Layers,
		tagline: "Navigate, scrub, and slice multi-track clips effortlessly",
	},
	{
		id: "trim",
		title: "Trim & Blank Screen",
		badge: "Cuts",
		icon: Scissors,
		tagline: "Remove dead air with Ripple Delete or sync-locked Blank gaps",
	},
	{
		id: "audio",
		title: "Audio Engine (v3.2)",
		badge: "Guaranteed Mux",
		icon: Music,
		tagline: "Background music, dB metering, normalization & export mixdown",
	},
	{
		id: "zoom",
		title: "Smart Zoom & Framing",
		badge: "Cinematic",
		icon: ZoomIn,
		tagline: "Dynamic camera focus with Rule of Thirds and click telemetry",
	},
	{
		id: "speed",
		title: "Speed Ramping",
		badge: "Pacing",
		icon: Gauge,
		tagline: "Smooth fast-forward & slow-mo with pitch-preserved audio",
	},
	{
		id: "effects",
		title: "Captions & Blur Masks",
		badge: "Polish",
		icon: Sliders,
		tagline: "Lower thirds, spotlight accents, and privacy blur regions",
	},
	{
		id: "export",
		title: "Hardware Export",
		badge: "60 FPS GPU",
		icon: Cpu,
		tagline: "Ultra-fast WebCodecs NVENC/QuickSync encoding with AAC audio",
	},
];

export function ProjectFeatureTutorial({
	isOpen,
	onClose,
	projectStats,
	themeMode = "dark",
	accentColor = "lime",
	onNavigateToAudioTab,
	onNavigateToTrimTab,
	onNavigateToZoomTab,
}: ProjectFeatureTutorialProps) {
	const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
	const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

	// Interactive states for visual mockups
	const [mockPlayheadPos, setMockPlayheadPos] = useState<number>(42);
	const [mockIsPlaying, setMockIsPlaying] = useState<boolean>(false);
	const [mockSplitApplied, setMockSplitApplied] = useState<boolean>(false);
	const [mockTrimMode, setMockTrimMode] = useState<"ripple" | "blank">("blank");
	const [mockAudioVolume, setMockAudioVolume] = useState<number>(85);
	const [mockNormalizeActive, setMockNormalizeActive] = useState<boolean>(true);
	const [mockZoomScale, setMockZoomScale] = useState<number>(1.8);
	const [mockSpeedRate, setMockSpeedRate] = useState<number>(1.5);

	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = themeMode === "light";

	// Format duration into m:ss
	const formattedDuration = useMemo(() => {
		const sec = Math.max(0, projectStats.duration || 0);
		const mins = Math.floor(sec / 60);
		const remainingSec = Math.floor(sec % 60);
		const tenths = Math.floor((sec % 1) * 10);
		return `${mins}:${remainingSec.toString().padStart(2, "0")}.${tenths}s`;
	}, [projectStats.duration]);

	// Clean project name
	const displayProjectName = useMemo(() => {
		if (projectStats.projectName) {
			const clean = projectStats.projectName.replace(/^.*[\\/]/, "").replace(/^file:\/\//, "");
			return clean || "Active Video Project";
		}
		return "Untitled Recording Project";
	}, [projectStats.projectName]);

	// Simulate playback in interactive timeline
	useEffect(() => {
		if (!mockIsPlaying) return;
		const interval = setInterval(() => {
			setMockPlayheadPos((prev) => (prev >= 92 ? 10 : prev + 1.5));
		}, 60);
		return () => clearInterval(interval);
	}, [mockIsPlaying]);

	if (!isOpen) return null;

	const handleDismiss = () => {
		if (dontShowAgain) {
			markTutorialVersionSeen("3.2.0");
		}
		onClose();
	};

	const currentChapter = CHAPTERS[activeChapterIndex] || CHAPTERS[0];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
				onClick={handleDismiss}
			/>

			{/* Modal Dialog Card */}
			<div
				className={cn(
					"relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden z-10 transition-all",
					isLight
						? "bg-zinc-900/95 border-zinc-700/80 text-zinc-100"
						: "bg-[#0c0d12]/95 border-white/10 text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]",
				)}
			>
				{/* Top Header Bar */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
					<div className="flex items-center gap-3">
						<div
							className="flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-lg"
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						>
							<Sparkles className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
									Ocal Screen 3.2.0 Guide
								</h2>
								<span
									className="px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider shadow-xs"
									style={{
										backgroundColor: `${activeAccent.hex}22`,
										color: activeAccent.hex,
										border: `1px solid ${activeAccent.hex}55`,
									}}
								>
									Interactive Tour
								</span>
							</div>
							<p className="text-xs text-zinc-400">
								Master your timeline, audio engine, trims, and GPU export workflows.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={handleDismiss}
						className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
						title="Close Guide"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Personalized Project Live-Context Strip */}
				<div className="bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent px-6 py-2.5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex items-center gap-4 flex-wrap">
						<div className="flex items-center gap-1.5 text-zinc-300">
							<FileVideo className="w-3.5 h-3.5 text-emerald-400" />
							<span className="text-zinc-400">Current Project:</span>
							<span
								className="font-semibold text-white max-w-[220px] truncate"
								title={displayProjectName}
							>
								{displayProjectName}
							</span>
						</div>

						<div className="flex items-center gap-1.5 text-zinc-300">
							<Clock className="w-3.5 h-3.5 text-cyan-400" />
							<span className="text-zinc-400">Duration:</span>
							<span className="font-mono font-bold text-white">{formattedDuration}</span>
						</div>

						<div className="flex items-center gap-1.5 text-zinc-300">
							<Music className="w-3.5 h-3.5 text-purple-400" />
							<span className="text-zinc-400">Audio Track:</span>
							<span
								className={cn(
									"font-medium px-1.5 py-0.5 rounded text-[11px]",
									projectStats.audioTrackName || projectStats.hasBackgroundMusic
										? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
										: "bg-zinc-800 text-zinc-400",
								)}
							>
								{projectStats.audioTrackName ||
									(projectStats.hasBackgroundMusic ? "Attached Music" : "Source Audio Only")}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-3 text-[11px] text-zinc-400">
						<span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
							✂️ Trims: <strong className="text-zinc-200">{projectStats.trimCount ?? 0}</strong>
						</span>
						<span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
							🔍 Zooms: <strong className="text-zinc-200">{projectStats.zoomCount ?? 0}</strong>
						</span>
						<span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
							⚡ Speed Ramps:{" "}
							<strong className="text-zinc-200">{projectStats.speedCount ?? 0}</strong>
						</span>
					</div>
				</div>

				{/* Chapter Navigation Tabs */}
				<div className="flex items-center px-6 border-b border-white/10 bg-black/40 overflow-x-auto no-scrollbar">
					{CHAPTERS.map((chapter, idx) => {
						const isActive = idx === activeChapterIndex;
						const Icon = chapter.icon;
						return (
							<button
								key={chapter.id}
								type="button"
								onClick={() => setActiveChapterIndex(idx)}
								className={cn(
									"flex items-center gap-2 py-3 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer",
									isActive
										? "border-current text-white bg-white/[0.04]"
										: "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]",
								)}
								style={{ color: isActive ? activeAccent.hex : undefined }}
							>
								<Icon className="w-4 h-4" />
								<span>{chapter.title}</span>
							</button>
						);
					})}
				</div>

				{/* Main Content Area */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Chapter Heading */}
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
									{currentChapter.title}
								</h3>
								<span className="px-2 py-0.5 text-[11px] font-bold rounded bg-white/10 text-zinc-300">
									Step {activeChapterIndex + 1} of {CHAPTERS.length}
								</span>
							</div>
							<p className="text-sm text-zinc-400 mt-0.5">{currentChapter.tagline}</p>
						</div>

						{/* Quick Action jump if relevant */}
						{currentChapter.id === "audio" && onNavigateToAudioTab && (
							<button
								type="button"
								onClick={() => {
									handleDismiss();
									onNavigateToAudioTab();
								}}
								className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
							>
								<Music className="w-3.5 h-3.5" />
								<span>Open Audio Inspector</span>
							</button>
						)}
						{currentChapter.id === "trim" && onNavigateToTrimTab && (
							<button
								type="button"
								onClick={() => {
									handleDismiss();
									onNavigateToTrimTab();
								}}
								className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
							>
								<Scissors className="w-3.5 h-3.5" />
								<span>Inspect Project Trims</span>
							</button>
						)}
						{currentChapter.id === "zoom" && onNavigateToZoomTab && (
							<button
								type="button"
								onClick={() => {
									handleDismiss();
									onNavigateToZoomTab();
								}}
								className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
							>
								<ZoomIn className="w-3.5 h-3.5" />
								<span>Open Zoom & Crop Tools</span>
							</button>
						)}
					</div>

					{/* CHAPTER 1: TIMELINE & SLICING */}
					{currentChapter.id === "timeline" && (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<span className="flex h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 items-center justify-center text-xs">
											1
										</span>
										Playhead & Timecode Scrubbing
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Drag the playhead handle or click anywhere along the ruler to seek
										instantaneously. Press{" "}
										<kbd className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">
											Space
										</kbd>{" "}
										to play/pause, or use{" "}
										<kbd className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">J</kbd>{" "}
										<kbd className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">K</kbd>{" "}
										<kbd className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">L</kbd>{" "}
										for shuttle playback.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<span className="flex h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 items-center justify-center text-xs">
											2
										</span>
										Split / Blade Cut (S Key)
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Position the playhead where you want to segment your clip, then click the{" "}
										<strong>Split</strong> blade icon or press{" "}
										<kbd className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">S</kbd>.
										This slices your clip so you can apply independent speed, zoom, or trims.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<span className="flex h-5 w-5 rounded-full bg-purple-500/20 text-purple-400 items-center justify-center text-xs">
											3
										</span>
										Multi-Layer Stacking
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Video clips sit on the primary track, with dedicated lanes underneath for
										background music, audio waveforms, camera zooms, annotations, and webcam
										picture-in-picture.
									</p>
								</div>
							</div>

							{/* Interactive Visual Timeline Simulation */}
							<div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
								<div className="flex items-center justify-between text-xs text-zinc-400">
									<span className="font-semibold text-zinc-300 flex items-center gap-2">
										<Layers className="w-3.5 h-3.5 text-blue-400" />
										Interactive Timeline Simulator
									</span>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setMockIsPlaying(!mockIsPlaying)}
											className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
										>
											{mockIsPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
											<span>{mockIsPlaying ? "Pause" : "Play"}</span>
										</button>
										<button
											type="button"
											onClick={() => setMockSplitApplied(!mockSplitApplied)}
											className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
										>
											<Scissors className="w-3 h-3" />
											<span>{mockSplitApplied ? "Reset Split" : "Simulate 'S' Blade Cut"}</span>
										</button>
									</div>
								</div>

								{/* Mock Timeline Ruler & Track */}
								<div className="relative h-28 bg-[#12131a] rounded-lg border border-white/10 overflow-hidden select-none px-4 py-2 flex flex-col justify-between">
									{/* Timecode ticks */}
									<div className="flex justify-between text-[10px] text-zinc-500 font-mono border-b border-white/5 pb-1">
										<span>00:00</span>
										<span>00:05</span>
										<span>00:10</span>
										<span>00:15</span>
										<span>00:20</span>
									</div>

									{/* Main Video Track Lane */}
									<div className="relative h-12 bg-zinc-900 rounded flex items-center overflow-hidden border border-white/10">
										{mockSplitApplied ? (
											<>
												<div
													className="h-full bg-blue-600/40 border-r-2 border-white flex items-center justify-center transition-all"
													style={{ width: `${mockPlayheadPos}%` }}
												>
													<span className="text-[10px] font-bold text-blue-200">
														Clip A (Main Video)
													</span>
												</div>
												<div className="h-full bg-emerald-600/40 flex items-center justify-center flex-1 transition-all">
													<span className="text-[10px] font-bold text-emerald-200">
														Clip B (Segment)
													</span>
												</div>
											</>
										) : (
											<div className="w-full h-full bg-blue-600/30 flex items-center justify-center">
												<span className="text-[10px] font-bold text-blue-200">
													{displayProjectName} (Single Continuous Track)
												</span>
											</div>
										)}

										{/* Interactive Playhead Needle */}
										<div
											className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none transition-all shadow-[0_0_8px_rgba(239,68,68,0.8)]"
											style={{ left: `${mockPlayheadPos}%` }}
										>
											<div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45 rounded-xs" />
										</div>
									</div>

									{/* Audio Sub-track */}
									<div className="h-5 bg-purple-950/40 rounded flex items-center px-2 border border-purple-500/20 text-[9px] text-purple-300 font-mono">
										🎵 Audio Lane: {projectStats.audioTrackName || "Source Master Channel"}
									</div>
								</div>
								<p className="text-[11px] text-zinc-400 italic">
									💡 Tip: Click on any segment to open its individual inspector properties in the
									left sidebar!
								</p>
							</div>
						</div>
					)}

					{/* CHAPTER 2: TRIM & BLANK SCREEN */}
					{currentChapter.id === "trim" && (
						<div className="space-y-6">
							{/* Important Disclaimer Banner */}
							<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
								<ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
								<div>
									<strong className="font-bold text-amber-300">Important Editing Policy:</strong>{" "}
									Ocal Screen is not responsible for editing gaps or timeline mistakes. Please
									preview your cut regions before exporting your final video.
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div
									onClick={() => setMockTrimMode("ripple")}
									className={cn(
										"p-4 rounded-xl border transition-all cursor-pointer space-y-2",
										mockTrimMode === "ripple"
											? "bg-blue-500/10 border-blue-500/50 shadow-md"
											: "bg-white/[0.02] border-white/5 hover:border-white/10",
									)}
								>
									<div className="flex items-center justify-between">
										<div className="font-bold text-white text-sm flex items-center gap-2">
											<Scissors className="w-4 h-4 text-blue-400" />
											Mode 1: Ripple Delete
										</div>
										{mockTrimMode === "ripple" && (
											<span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
												Active Mode
											</span>
										)}
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Snaps adjacent video clips together after the trimmed portion is excised. The
										total video duration shrinks by the length of the deleted section.
									</p>
								</div>

								<div
									onClick={() => setMockTrimMode("blank")}
									className={cn(
										"p-4 rounded-xl border transition-all cursor-pointer space-y-2",
										mockTrimMode === "blank"
											? "bg-purple-500/10 border-purple-500/50 shadow-md"
											: "bg-white/[0.02] border-white/5 hover:border-white/10",
									)}
								>
									<div className="flex items-center justify-between">
										<div className="font-bold text-white text-sm flex items-center gap-2">
											<Eye className="w-4 h-4 text-purple-400" />
											Mode 2: Keep Blank Screen (Sync-Locked)
										</div>
										{mockTrimMode === "blank" && (
											<span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
												Active Mode
											</span>
										)}
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Preserves the exact absolute timecode and duration. During the cut interval, the
										video renders a clean black pause frame while keeping overall audio/subtitle
										sync intact.
									</p>
								</div>
							</div>

							{/* Visual Diagram Representation */}
							<div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
								<div className="flex items-center justify-between text-xs text-zinc-400">
									<span className="font-semibold text-zinc-300">
										Visual Diagram: Cut Interval vs Final Render
									</span>
									<span className="text-[11px] text-zinc-400">
										Current Mode: <strong className="text-white capitalize">{mockTrimMode}</strong>
									</span>
								</div>

								{/* Original Timeline with Cut Section */}
								<div className="space-y-1">
									<div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
										1. Raw Recorded Track (With Cut Region)
									</div>
									<div className="relative h-10 bg-zinc-900 rounded border border-white/10 flex items-center overflow-hidden">
										<div className="w-[30%] h-full bg-emerald-700/50 flex items-center justify-center text-[10px] font-bold text-emerald-200">
											Kept Content (Part 1)
										</div>
										<div className="w-[35%] h-full bg-red-600/30 border-x-2 border-red-500 flex items-center justify-center text-[10px] font-bold text-red-300">
											❌ Trim Cut (Dead Air)
										</div>
										<div className="w-[35%] h-full bg-emerald-700/50 flex items-center justify-center text-[10px] font-bold text-emerald-200">
											Kept Content (Part 2)
										</div>
									</div>
								</div>

								{/* Resulting Export Output based on mode */}
								<div className="space-y-1 pt-2">
									<div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
										2. Exported Output (
										{mockTrimMode === "ripple" ? "Total Time Shortened" : "Exact Timing Preserved"})
									</div>
									{mockTrimMode === "ripple" ? (
										<div className="relative h-10 bg-zinc-900 rounded border border-blue-500/40 flex items-center overflow-hidden w-[65%]">
											<div className="w-[46%] h-full bg-emerald-700/60 border-r border-blue-400 flex items-center justify-center text-[10px] font-bold text-white">
												Part 1
											</div>
											<div className="flex-1 h-full bg-emerald-700/60 flex items-center justify-center text-[10px] font-bold text-white">
												Part 2 (Snapped Together)
											</div>
										</div>
									) : (
										<div className="relative h-10 bg-zinc-900 rounded border border-purple-500/40 flex items-center overflow-hidden w-full">
											<div className="w-[30%] h-full bg-emerald-700/60 flex items-center justify-center text-[10px] font-bold text-white">
												Part 1
											</div>
											<div className="w-[35%] h-full bg-black border-x border-purple-500/50 flex items-center justify-center text-[10px] font-medium text-purple-400">
												⬛ Blank Screen Gap
											</div>
											<div className="w-[35%] h-full bg-emerald-700/60 flex items-center justify-center text-[10px] font-bold text-white">
												Part 2
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* CHAPTER 3: AUDIO ENGINE (V3.2) */}
					{currentChapter.id === "audio" && (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Radio className="w-4 h-4 text-purple-400" />
										Music Library & Custom MP3s
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Choose from high-energy presets (like <strong>SEM DEMORA</strong>,{" "}
										<strong>Cyber Beat</strong>, <strong>Synthwave Drift</strong>) or drag & drop
										any personal audio/music file directly onto the timeline.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Sliders className="w-4 h-4 text-emerald-400" />
										Auto-Normalization & Fade Curves
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Eliminate quiet speech or deafening music. One-click normalization levels peak
										loudness to broadcasting standards (-14 LUFS) with smooth fade-in/fade-out
										curves.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Check className="w-4 h-4 text-cyan-400" />
										3.2.0 Offline Dual Muxer
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Our updated audio engine decodes source audio directly into offline buffers.
										Exported videos are guaranteed to embed both microphone and background music
										without missing audio tracks.
									</p>
								</div>
							</div>

							{/* Interactive Audio Inspector Mockup */}
							<div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-4">
								<div className="flex items-center justify-between text-xs">
									<span className="font-semibold text-zinc-300 flex items-center gap-2">
										<Volume2 className="w-4 h-4 text-purple-400" />
										Audio Meter & Inspector Preview
									</span>
									<span className="text-[11px] text-purple-400 font-mono">
										Mux Engine: WebCodecs AAC (48kHz Stereo)
									</span>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
									{/* Stereo Equalizer Bars */}
									<div className="bg-[#12131c] p-4 rounded-lg border border-white/5 space-y-3">
										<div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between">
											<span>Stereo Level Meters</span>
											<span className="text-emerald-400 font-mono">-6.2 dB Peak</span>
										</div>
										<div className="space-y-1.5">
											{/* Left channel */}
											<div className="flex items-center gap-2">
												<span className="text-[10px] font-mono text-zinc-500 w-3">L</span>
												<div className="flex-1 h-3 bg-zinc-800 rounded-xs overflow-hidden flex gap-0.5">
													<div className="h-full bg-emerald-500 w-[55%] animate-pulse" />
													<div className="h-full bg-yellow-500 w-[20%]" />
													<div className="h-full bg-red-500/20 w-[25%]" />
												</div>
											</div>
											{/* Right channel */}
											<div className="flex items-center gap-2">
												<span className="text-[10px] font-mono text-zinc-500 w-3">R</span>
												<div className="flex-1 h-3 bg-zinc-800 rounded-xs overflow-hidden flex gap-0.5">
													<div className="h-full bg-emerald-500 w-[60%] animate-pulse" />
													<div className="h-full bg-yellow-500 w-[18%]" />
													<div className="h-full bg-red-500/20 w-[22%]" />
												</div>
											</div>
										</div>
										<div className="flex justify-between text-[9px] font-mono text-zinc-500 px-5">
											<span>-36dB</span>
											<span>-18dB</span>
											<span>-12dB</span>
											<span>-6dB</span>
											<span className="text-red-400">0dB</span>
										</div>
									</div>

									{/* Controls */}
									<div className="space-y-3">
										<div>
											<div className="flex justify-between text-xs text-zinc-300 mb-1">
												<span>Background Volume</span>
												<span className="font-mono text-purple-400 font-bold">
													{mockAudioVolume}%
												</span>
											</div>
											<input
												type="range"
												min={0}
												max={200}
												value={mockAudioVolume}
												onChange={(e) => setMockAudioVolume(Number(e.target.value))}
												className="w-full accent-purple-500 cursor-pointer"
											/>
										</div>

										<div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 text-xs">
											<span className="text-zinc-300">Auto-Normalize Loudness</span>
											<button
												type="button"
												onClick={() => setMockNormalizeActive(!mockNormalizeActive)}
												className={cn(
													"px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer",
													mockNormalizeActive
														? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
														: "bg-zinc-800 text-zinc-400",
												)}
											>
												{mockNormalizeActive ? "Enabled (-14 LUFS)" : "Bypassed"}
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* CHAPTER 4: SMART ZOOM */}
					{currentChapter.id === "zoom" && (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<ZoomIn className="w-4 h-4 text-cyan-400" />
										Dynamic Camera Punch
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Highlight vital button clicks, code lines, or menus. Choose zoom magnification
										from 1.25x up to 3.0x with smooth cubic-bezier camera motion.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Sliders className="w-4 h-4 text-emerald-400" />
										Rule of Thirds Framing
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Automated cinematic framing positions your action cursor at harmonious visual
										intersections instead of clumsy center crops.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Eye className="w-4 h-4 text-purple-400" />
										AI Click Telemetry
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Ocal Screen detects recorded mouse clicks and keyboard focus to suggest
										automatic zoom keyframes instantly!
									</p>
								</div>
							</div>

							{/* Interactive Zoom Viewfinder */}
							<div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
								<div className="flex items-center justify-between text-xs text-zinc-400">
									<span className="font-semibold text-zinc-300">
										Interactive Viewfinder & Rule-of-Thirds Grid
									</span>
									<div className="flex items-center gap-3">
										<span>Depth:</span>
										<button
											type="button"
											onClick={() => setMockZoomScale(1.3)}
											className={cn(
												"px-2 py-0.5 rounded text-[11px] font-bold",
												mockZoomScale === 1.3 ? "bg-cyan-500 text-black" : "bg-white/10 text-white",
											)}
										>
											1.3x
										</button>
										<button
											type="button"
											onClick={() => setMockZoomScale(1.8)}
											className={cn(
												"px-2 py-0.5 rounded text-[11px] font-bold",
												mockZoomScale === 1.8 ? "bg-cyan-500 text-black" : "bg-white/10 text-white",
											)}
										>
											1.8x
										</button>
										<button
											type="button"
											onClick={() => setMockZoomScale(2.5)}
											className={cn(
												"px-2 py-0.5 rounded text-[11px] font-bold",
												mockZoomScale === 2.5 ? "bg-cyan-500 text-black" : "bg-white/10 text-white",
											)}
										>
											2.5x
										</button>
									</div>
								</div>

								{/* Mock Screen with Framing Grid */}
								<div className="relative h-44 bg-zinc-950 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
									{/* Rule of thirds grid lines */}
									<div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
										<div className="border-r border-b border-cyan-400" />
										<div className="border-r border-b border-cyan-400" />
										<div className="border-b border-cyan-400" />
										<div className="border-r border-b border-cyan-400" />
										<div className="border-r border-b border-cyan-400" />
										<div className="border-b border-cyan-400" />
										<div className="border-r border-cyan-400" />
										<div className="border-r border-cyan-400" />
										<div />
									</div>

									{/* Simulated Camera Target Box */}
									<div
										className="relative border-2 border-cyan-400 bg-cyan-500/10 rounded transition-all duration-300 flex items-center justify-center"
										style={{
											width: `${100 / mockZoomScale}%`,
											height: `${100 / mockZoomScale}%`,
										}}
									>
										<div className="absolute -top-2.5 left-2 bg-cyan-400 text-black text-[9px] font-bold px-1.5 rounded-xs">
											Target Camera Viewport ({mockZoomScale}x)
										</div>
										<div className="w-3 h-3 border border-cyan-300 rounded-full flex items-center justify-center">
											<div className="w-1 h-1 bg-cyan-300 rounded-full" />
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* CHAPTER 5: SPEED RAMPING */}
					{currentChapter.id === "speed" && (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Gauge className="w-4 h-4 text-emerald-400" />
										Fast-Forward Boring Steps
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Speed up lengthy installs, file downloads, or typing sequences (up to 4.0x) so
										your viewers stay engaged.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Clock className="w-4 h-4 text-blue-400" />
										Slow-Motion Emphasis
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Slow down critical gameplay clutches or micro-animations (0.25x – 0.75x) to
										reveal fine details.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Music className="w-4 h-4 text-purple-400" />
										Pitch-Lock Preservation
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Speech remains natural without high-pitched chipmunk squeaks or groaning low
										frequencies during speed changes.
									</p>
								</div>
							</div>

							{/* Interactive Speed Multiplier Bar */}
							<div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
								<div className="flex items-center justify-between text-xs text-zinc-400">
									<span className="font-semibold text-zinc-300">Speed Multiplier Simulation</span>
									<span className="text-[11px] font-mono font-bold text-emerald-400">
										Active Rate: {mockSpeedRate}x Normal Speed
									</span>
								</div>

								<div className="flex gap-2">
									{[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0].map((rate) => (
										<button
											key={rate}
											type="button"
											onClick={() => setMockSpeedRate(rate)}
											className={cn(
												"flex-1 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer border",
												mockSpeedRate === rate
													? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md scale-105"
													: "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white",
											)}
										>
											{rate}x
										</button>
									))}
								</div>

								<div className="h-6 bg-zinc-900 rounded border border-white/10 overflow-hidden flex items-center px-3">
									<div
										className="h-2 bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 rounded-full transition-all"
										style={{ width: `${Math.min(100, (mockSpeedRate / 3.0) * 100)}%` }}
									/>
								</div>
							</div>
						</div>
					)}

					{/* CHAPTER 6: EFFECTS & ANNOTATIONS */}
					{currentChapter.id === "effects" && (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Sliders className="w-4 h-4 text-purple-400" />
										Lower Thirds & Text Callouts
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Add polished speaker titles, step instructions, and animated labels anywhere in
										your video layout.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Eye className="w-4 h-4 text-cyan-400" />
										Privacy Blur Masks
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Easily obscure private API keys, passwords, sensitive email addresses, or
										personal credentials before sharing.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Sparkles className="w-4 h-4 text-amber-400" />
										Spotlight & Arrow Overlays
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Dim peripheral UI elements to draw laser-sharp visual focus to exact toolbar
										buttons and drop-downs.
									</p>
								</div>
							</div>

							{/* Visual Mockup */}
							<div className="p-4 rounded-xl bg-black/60 border border-white/10 relative h-36 flex items-center justify-center overflow-hidden">
								{/* Mock blurred region */}
								<div className="absolute left-10 p-2.5 rounded bg-zinc-800/80 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300">
									api_key:{" "}
									<span className="filter blur-[4px] select-none text-white">
										sk-proj-998811776655
									</span>
									<span className="ml-2 text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-sans font-bold">
										Protected
									</span>
								</div>

								{/* Mock lower-third label */}
								<div className="absolute bottom-4 right-10 bg-purple-900/80 border border-purple-500/40 px-3 py-1.5 rounded-lg shadow-lg text-xs font-semibold text-white flex items-center gap-2">
									<Sparkles className="w-3.5 h-3.5 text-purple-300" />
									<span>Step 2: Initialize Database Connection</span>
								</div>
							</div>
						</div>
					)}

					{/* CHAPTER 7: HARDWARE EXPORT (3.2.0) */}
					{currentChapter.id === "export" && (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Cpu className="w-4 h-4 text-emerald-400" />
										GPU Hardware Acceleration
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Direct WebCodecs pipeline leverages your GPU (NVIDIA NVENC, Intel QuickSync,
										AMD, Apple Silicon) for blistering 60 FPS renders.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Music className="w-4 h-4 text-purple-400" />
										AAC Dual Audio Container
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Full AudioSpecificConfig metadata multiplexing ensures crystal-clear stereo
										sound compatible with QuickTime, YouTube, and Discord.
									</p>
								</div>

								<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
									<div className="font-bold text-white text-sm flex items-center gap-2">
										<Upload className="w-4 h-4 text-cyan-400" />
										Formats: MP4 & Optimized GIF
									</div>
									<p className="text-xs text-zinc-400 leading-relaxed">
										Choose between 4K/1080p MP4 master videos or lightweight, loopable GIFs with
										custom palette quantization.
									</p>
								</div>
							</div>

							{/* Status Card */}
							<div className="p-4 rounded-xl bg-black/60 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
										<Check className="w-5 h-5 stroke-[3]" />
									</div>
									<div>
										<h4 className="text-sm font-bold text-white">3.2.0 Engine Verified & Active</h4>
										<p className="text-xs text-zinc-400">
											Ready to export your project at 60fps with full background music & microphone
											mixing.
										</p>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30">
										~10x Real-time GPU Render
									</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Bottom Footer Action Controls */}
				<div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02] gap-3">
					<label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={dontShowAgain}
							onChange={(e) => setDontShowAgain(e.target.checked)}
							className="rounded bg-white/10 border-white/20 text-emerald-500 accent-emerald-500 cursor-pointer"
						/>
						<span>Don&apos;t show again automatically on project load</span>
					</label>

					<div className="flex items-center gap-3 w-full sm:w-auto justify-end">
						{activeChapterIndex > 0 && (
							<button
								type="button"
								onClick={() => setActiveChapterIndex((prev) => Math.max(0, prev - 1))}
								className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								<ChevronLeft className="w-4 h-4" />
								<span>Previous</span>
							</button>
						)}

						{activeChapterIndex < CHAPTERS.length - 1 ? (
							<button
								type="button"
								onClick={() =>
									setActiveChapterIndex((prev) => Math.min(CHAPTERS.length - 1, prev + 1))
								}
								className="px-5 py-2 rounded-xl text-xs font-bold text-black flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								<span>Next Feature</span>
								<ChevronRight className="w-4 h-4" />
							</button>
						) : (
							<button
								type="button"
								onClick={handleDismiss}
								className="px-6 py-2 rounded-xl text-xs font-bold bg-[#00e59b] hover:bg-[#00c988] text-black shadow-[0_0_15px_rgba(0,229,155,0.4)] flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
							>
								<Check className="w-4 h-4 stroke-[3]" />
								<span>Got It! Start Editing</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
