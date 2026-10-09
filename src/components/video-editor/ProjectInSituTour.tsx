import {
	Check,
	ChevronLeft,
	ChevronRight,
	Cpu,
	Gauge,
	Layers,
	Music,
	Pause,
	Play,
	Scissors,
	ShieldAlert,
	Target,
	Upload,
	Volume2,
	X,
	ZoomIn,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ACCENT_COLOR_MAP,
	type AccentColor,
	loadUserPreferences,
	markTutorialVersionSeen,
} from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

export interface ProjectInSituTourProps {
	isOpen: boolean;
	onClose: () => void;
	projectStats: {
		projectName?: string | null;
		duration: number;
		audioTrackName?: string | null;
		hasBackgroundMusic?: boolean;
		trimCount: number;
		speedCount: number;
		zoomCount: number;
		annotationCount: number;
		splitCount: number;
	};
	currentTime: number;
	isPlaying: boolean;
	onTogglePlay?: () => void;
	onSplitAtPlayhead?: () => void;
	onOpenAudioInspector?: () => void;
	onAddSampleTrim?: () => void;
	onAddSampleZoom?: () => void;
	onOpenExportDialog?: () => void;
	accentColor?: AccentColor;
	themeMode?: "dark" | "light";
}

export type TourStepId = "timeline" | "trim" | "audio" | "zoom" | "speed" | "export";

interface TourStepDef {
	id: TourStepId;
	targetId: string;
	title: string;
	badge: string;
	icon: React.ElementType;
	tagline: string;
	description: string;
	hotkey?: string;
	accentColorName?: string;
}

const TOUR_STEPS: TourStepDef[] = [
	{
		id: "timeline",
		targetId: "tour-timeline-deck",
		title: "Timeline & Slicing",
		badge: "Multi-Track",
		icon: Layers,
		tagline: "Scrub with your playhead and slice clips directly in your project",
		description:
			"Drag the playhead anywhere along the ruler to seek instantaneously. Press Space to play/pause, or hit S (Blade Cut) to split your clip at the current frame.",
		hotkey: "Space to Play • S to Split",
	},
	{
		id: "trim",
		targetId: "tour-timeline-deck",
		title: "Trim Cuts & Blank Screen",
		badge: "Precision Cuts",
		icon: Scissors,
		tagline: "Excise mistakes with Ripple Delete or sync-locked Blank Gaps",
		description:
			"Drag left/right trim handles to cut dead air. Use Ripple Delete to collapse timeline gaps, or Keep Blank Screen to preserve exact duration and audio sync.",
		hotkey: "T to Add Trim",
	},
	{
		id: "audio",
		targetId: "tour-inspector-deck",
		title: "Audio Engine & Dual Mux (3.2.0)",
		badge: "Guaranteed Mux",
		icon: Music,
		tagline: "Stereo dB metering, auto-normalization, and offline AAC mixing",
		description:
			"Attach background music (e.g. SEM DEMORA) or mic audio. In 3.2.0, WebCodecs decodes all audio offline to guarantee full sound in your exported MP4.",
		hotkey: "Auto-Normalize • Volume Boost",
	},
	{
		id: "zoom",
		targetId: "tour-preview-deck",
		title: "Smart Zoom & Framing",
		badge: "Cinematic",
		icon: ZoomIn,
		tagline: "Rule of Thirds camera punch and AI cursor tracking",
		description:
			"Punch in from 1.25x to 3.0x on critical menus or code. Smooth cubic-bezier transitions follow mouse clicks and keystrokes automatically.",
		hotkey: "Z to Zoom • Rule of Thirds",
	},
	{
		id: "speed",
		targetId: "tour-timeline-deck",
		title: "Speed Ramping & Pitch Lock",
		badge: "Pacing",
		icon: Gauge,
		tagline: "Fast-forward boring steps or slow down clutches naturally",
		description:
			"Speed up installs up to 4.0x or slow down to 0.5x. Voice pitch is locked so vocals never sound robotic or squeaky.",
		hotkey: "0.25x – 4.0x Speed",
	},
	{
		id: "export",
		targetId: "tour-export-button",
		title: "60 FPS GPU Export",
		badge: "WebCodecs AAC",
		icon: Cpu,
		tagline: "Blistering NVENC / QuickSync hardware export with AAC audio",
		description:
			"Export 4K/1080p MP4 or looping GIFs at up to 10x real-time speed with dual-channel AAC audio multiplexing directly embedded in the video container.",
		hotkey: "Ctrl+E to Export",
	},
];

export function ProjectInSituTour({
	isOpen,
	onClose,
	projectStats,
	currentTime,
	isPlaying,
	onTogglePlay,
	onSplitAtPlayhead,
	onOpenAudioInspector,
	onAddSampleTrim,
	onAddSampleZoom,
	onOpenExportDialog,
	accentColor,
	themeMode,
}: ProjectInSituTourProps) {
	const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
	const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

	const prefs = loadUserPreferences();
	const effectiveTheme = themeMode || prefs.theme || "dark";
	const isLight = effectiveTheme === "light";
	const effectiveAccent = (accentColor || prefs.accentColor || "lime") as AccentColor;
	const activeAccent = ACCENT_COLOR_MAP[effectiveAccent] || ACCENT_COLOR_MAP.lime;
	const currentStep = TOUR_STEPS[activeStepIndex] || TOUR_STEPS[0];

	// Project name display
	const displayProjectName = useMemo(() => {
		if (projectStats.projectName) {
			const clean = projectStats.projectName.replace(/^.*[\\/]/, "").replace(/^file:\/\//, "");
			return clean || "Active Video Project";
		}
		return "Timeline Video Project";
	}, [projectStats.projectName]);

	// Format duration into m:ss
	const formattedDuration = useMemo(() => {
		const sec = Math.max(0, projectStats.duration || 0);
		const mins = Math.floor(sec / 60);
		const remainingSec = Math.floor(sec % 60);
		return `${mins}:${remainingSec.toString().padStart(2, "0")}s`;
	}, [projectStats.duration]);

	// Format current playhead time
	const formattedPlayhead = useMemo(() => {
		const sec = Math.max(0, currentTime || 0);
		const mins = Math.floor(sec / 60);
		const remainingSec = Math.floor(sec % 60);
		const tenths = Math.floor((sec % 1) * 10);
		return `${mins}:${remainingSec.toString().padStart(2, "0")}.${tenths}s`;
	}, [currentTime]);

	// Measure and highlight target DOM element
	const updateTargetMeasurement = useCallback(() => {
		if (!isOpen) {
			setTargetRect(null);
			return;
		}
		const element = document.getElementById(currentStep.targetId);
		if (element) {
			setTargetRect(element.getBoundingClientRect());
		} else {
			setTargetRect(null);
		}
	}, [isOpen, currentStep.targetId]);

	useEffect(() => {
		updateTargetMeasurement();
		window.addEventListener("resize", updateTargetMeasurement);
		const timer = setTimeout(updateTargetMeasurement, 100);
		return () => {
			window.removeEventListener("resize", updateTargetMeasurement);
			clearTimeout(timer);
		};
	}, [updateTargetMeasurement, activeStepIndex]);

	if (!isOpen) return null;

	const handleDismiss = () => {
		if (dontShowAgain) {
			markTutorialVersionSeen("3.2.0");
		}
		onClose();
	};

	const handleNext = () => {
		if (activeStepIndex < TOUR_STEPS.length - 1) {
			setActiveStepIndex((prev) => prev + 1);
		} else {
			handleDismiss();
		}
	};

	const handlePrev = () => {
		if (activeStepIndex > 0) {
			setActiveStepIndex((prev) => prev - 1);
		}
	};

	const Icon = currentStep.icon;

	return (
		<div className="fixed inset-0 z-40 pointer-events-none">
			{/* Spotlight Highlight Box around the real project element */}
			{targetRect && (
				<div
					className="absolute pointer-events-none rounded-xl"
					style={{
						top: `${targetRect.top - 6}px`,
						left: `${targetRect.left - 6}px`,
						width: `${targetRect.width + 12}px`,
						height: `${targetRect.height + 12}px`,
						boxShadow: isLight
							? `0 0 0 9999px rgba(0, 0, 0, 0.4), 0 0 25px ${activeAccent.hex}55`
							: `0 0 0 9999px rgba(0, 0, 0, 0.58), 0 0 25px ${activeAccent.hex}66`,
						border: `2px solid ${activeAccent.hex}`,
					}}
				>
					{/* Target Beacon Indicator (solid, non-animated) */}
					<div
						className="absolute -top-3 -left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg"
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
					>
						<Target className="w-3.5 h-3.5 stroke-[2.5]" />
						<span>{currentStep.badge}</span>
					</div>
				</div>
			)}

			{/* Floating In-Project Showcase Interactive HUD Bar */}
			<div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-3xl pointer-events-auto">
				<div
					className={cn(
						"rounded-2xl border p-4 md:p-5 flex flex-col gap-3.5 backdrop-blur-xl transition-colors",
						isLight
							? "bg-white/95 border-zinc-200/90 text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
							: "bg-[#0c0d14]/95 border-white/15 text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)]",
					)}
				>
					{/* Header line with step counter and dismiss button */}
					<div
						className={cn(
							"flex items-center justify-between gap-2 border-b pb-2.5",
							isLight ? "border-zinc-200/80" : "border-white/10",
						)}
					>
						<div className="flex items-center gap-2.5 flex-wrap">
							<div
								className="flex h-7 w-7 items-center justify-center rounded-lg font-black text-xs shadow-md"
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								<Icon className="w-4 h-4" />
							</div>

							<div className="flex items-center gap-2">
								<h3
									className={cn(
										"text-sm font-bold tracking-tight flex items-center gap-1.5",
										isLight ? "text-zinc-900" : "text-white",
									)}
								>
									{currentStep.title}
								</h3>
								<span
									className="px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider shadow-xs"
									style={{
										backgroundColor: activeAccent.hex,
										color: activeAccent.textHex,
									}}
								>
									Step {activeStepIndex + 1} of {TOUR_STEPS.length}
								</span>
							</div>

							{/* Live Project Info Badge */}
							<span
								className={cn(
									"hidden sm:inline-flex text-[11px] items-center gap-1.5 px-2 py-0.5 rounded-md border",
									isLight
										? "bg-zinc-100/80 text-zinc-600 border-zinc-200"
										: "bg-white/5 text-zinc-400 border-white/5",
								)}
							>
								<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
								<strong
									className={cn(
										"truncate max-w-[130px]",
										isLight ? "text-zinc-800" : "text-zinc-200",
									)}
									title={displayProjectName}
								>
									{displayProjectName}
								</strong>
								<span className={cn("font-mono", isLight ? "text-zinc-500" : "text-zinc-400")}>
									({formattedDuration})
								</span>
							</span>
						</div>

						<div className="flex items-center gap-1.5">
							{/* Mini step dots */}
							<div className="hidden md:flex items-center gap-1 mr-2">
								{TOUR_STEPS.map((step, idx) => (
									<button
										key={step.id}
										type="button"
										onClick={() => setActiveStepIndex(idx)}
										title={step.title}
										className={cn(
											"h-1.5 rounded-full transition-all cursor-pointer",
											idx === activeStepIndex
												? "w-5"
												: isLight
													? "w-1.5 bg-zinc-300 hover:bg-zinc-400"
													: "w-1.5 bg-white/20 hover:bg-white/40",
										)}
										style={{
											backgroundColor: idx === activeStepIndex ? activeAccent.hex : undefined,
										}}
									/>
								))}
							</div>

							<button
								type="button"
								onClick={handleDismiss}
								className={cn(
									"p-1 rounded-md transition-colors cursor-pointer",
									isLight
										? "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
										: "text-zinc-400 hover:text-white hover:bg-white/10",
								)}
								title="Exit Interactive Tour"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Explanation & Hotkey */}
					<div className="space-y-1.5">
						<p
							className={cn("text-xs leading-relaxed", isLight ? "text-zinc-600" : "text-zinc-300")}
						>
							{currentStep.description}
						</p>

						{/* Disclaimer specific to Trim Cuts */}
						{currentStep.id === "trim" && (
							<div
								className={cn(
									"p-2 rounded-lg border flex items-center gap-2 text-[11px] font-medium",
									isLight
										? "bg-amber-50/80 border-amber-200 text-amber-800"
										: "bg-amber-500/10 border-amber-500/25 text-amber-300",
								)}
							>
								<ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
								<span>
									<strong>Disclaimer:</strong> Ocal Screen is not responsible for editing gaps or
									timeline mistakes. Review cuts before exporting.
								</span>
							</div>
						)}

						{currentStep.hotkey && (
							<div
								className={cn(
									"text-[11px] flex items-center gap-1.5 pt-0.5",
									isLight ? "text-zinc-500" : "text-zinc-400",
								)}
							>
								<span className="font-semibold">Shortcuts:</span>
								<span
									className={cn(
										"font-mono px-1.5 py-0.5 rounded border",
										isLight
											? "text-zinc-700 bg-zinc-100 border-zinc-200"
											: "text-zinc-300 bg-white/5 border-white/5",
									)}
								>
									{currentStep.hotkey}
								</span>
							</div>
						)}
					</div>

					{/* Interactive Live Actions: Directly manipulates user's real project */}
					<div
						className={cn(
							"flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t",
							isLight ? "border-zinc-200/80" : "border-white/10",
						)}
					>
						<div className="flex items-center gap-2 flex-wrap">
							{/* Timeline Step Live Actions */}
							{currentStep.id === "timeline" && (
								<>
									{onTogglePlay && (
										<button
											type="button"
											onClick={onTogglePlay}
											className={cn(
												"px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
												isLight
													? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200"
													: "bg-white/10 hover:bg-white/20 text-white",
											)}
										>
											{isPlaying ? (
												<Pause className="w-3.5 h-3.5" />
											) : (
												<Play className="w-3.5 h-3.5" />
											)}
											<span>{isPlaying ? "Pause Video" : "Play Current Video"}</span>
											<span
												className={cn(
													"text-[10px] font-mono",
													isLight ? "text-zinc-500" : "text-zinc-400",
												)}
											>
												({formattedPlayhead})
											</span>
										</button>
									)}

									{onSplitAtPlayhead && (
										<button
											type="button"
											onClick={onSplitAtPlayhead}
											className={cn(
												"px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer",
												isLight
													? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
													: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30",
											)}
										>
											<Scissors className="w-3.5 h-3.5" />
											<span>Split at Current Playhead (S)</span>
										</button>
									)}
								</>
							)}

							{/* Trim Step Live Actions */}
							{currentStep.id === "trim" && (
								<>
									{onAddSampleTrim && (
										<button
											type="button"
											onClick={onAddSampleTrim}
											className={cn(
												"px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer",
												isLight
													? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
													: "bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30",
											)}
										>
											<Scissors className="w-3.5 h-3.5" />
											<span>Add Trim Cut at Playhead</span>
										</button>
									)}
									<span className={cn("text-[11px]", isLight ? "text-zinc-600" : "text-zinc-400")}>
										Active Cuts in Project: <strong>{projectStats.trimCount}</strong>
									</span>
								</>
							)}

							{/* Audio Step Live Actions */}
							{currentStep.id === "audio" && (
								<>
									{onOpenAudioInspector && (
										<button
											type="button"
											onClick={onOpenAudioInspector}
											className={cn(
												"px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer",
												isLight
													? "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
													: "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30",
											)}
										>
											<Volume2 className="w-3.5 h-3.5" />
											<span>Open Audio Inspector Controls</span>
										</button>
									)}
									<span
										className={cn("text-[11px]", isLight ? "text-purple-700" : "text-purple-300")}
									>
										Track: <strong>{projectStats.audioTrackName || "Source Audio"}</strong>
									</span>
								</>
							)}

							{/* Zoom Step Live Actions */}
							{currentStep.id === "zoom" && (
								<>
									{onAddSampleZoom && (
										<button
											type="button"
											onClick={onAddSampleZoom}
											className={cn(
												"px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer",
												isLight
													? "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
													: "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30",
											)}
										>
											<ZoomIn className="w-3.5 h-3.5" />
											<span>Add Zoom on Current Frame</span>
										</button>
									)}
									<span className={cn("text-[11px]", isLight ? "text-zinc-600" : "text-zinc-400")}>
										Active Zooms: <strong>{projectStats.zoomCount}</strong>
									</span>
								</>
							)}

							{/* Speed Step Live Actions */}
							{currentStep.id === "speed" && (
								<div
									className={cn(
										"flex items-center gap-2 text-xs",
										isLight ? "text-zinc-600" : "text-zinc-300",
									)}
								>
									<Gauge className="w-3.5 h-3.5 text-emerald-500" />
									<span>Select any clip segment on the timeline to set speed ramp.</span>
								</div>
							)}

							{/* Export Step Live Actions */}
							{currentStep.id === "export" && onOpenExportDialog && (
								<button
									type="button"
									onClick={() => {
										handleDismiss();
										onOpenExportDialog();
									}}
									className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00e59b] hover:bg-[#00c988] text-black shadow-[0_0_12px_rgba(0,229,155,0.4)] flex items-center gap-1.5 transition-all cursor-pointer"
								>
									<Upload className="w-3.5 h-3.5 stroke-[2.5]" />
									<span>Test 3.2.0 GPU Export Dialog</span>
								</button>
							)}
						</div>

						{/* Step Navigation Controls */}
						<div className="flex items-center gap-2 ml-auto">
							<label
								className={cn(
									"hidden sm:flex items-center gap-1.5 text-[11px] cursor-pointer mr-2 select-none",
									isLight ? "text-zinc-600" : "text-zinc-400",
								)}
							>
								<input
									type="checkbox"
									checked={dontShowAgain}
									onChange={(e) => setDontShowAgain(e.target.checked)}
									className={cn(
										"rounded cursor-pointer",
										isLight
											? "bg-zinc-100 border-zinc-300 accent-emerald-600"
											: "bg-white/10 border-white/20 accent-emerald-500",
									)}
								/>
								<span>Don&apos;t show again</span>
							</label>

							{activeStepIndex > 0 && (
								<button
									type="button"
									onClick={handlePrev}
									className={cn(
										"px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border",
										isLight
											? "text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border-zinc-200"
											: "text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10",
									)}
								>
									<ChevronLeft className="w-3.5 h-3.5" />
									<span>Back</span>
								</button>
							)}

							<button
								type="button"
								onClick={handleNext}
								className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition-transform active:scale-95 cursor-pointer"
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								<span>{activeStepIndex === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next"}</span>
								{activeStepIndex < TOUR_STEPS.length - 1 ? (
									<ChevronRight className="w-3.5 h-3.5" />
								) : (
									<Check className="w-3.5 h-3.5 stroke-[3]" />
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
