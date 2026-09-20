import { AlertCircle, ChevronLeft, Film, FolderOpen, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { CHANGELOG_DATA } from "@/data/changelog";
import {
	ACCENT_COLOR_MAP,
	type AccentColor,
	getProjectFolder,
	parentDirectoryOf,
	saveUserPreferences,
} from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import { nativeBridgeClient } from "@/native";
import { DotMatrixText } from "../ui/dot-matrix-text";
import { WhatsNewSection } from "./WhatsNewSection";

interface EditorEmptyStateProps {
	onVideoImported: (videoPath: string) => void;
	/** Called with the loaded project data; handles both button click and drag-drop */
	onProjectOpened: (project: unknown, path: string | null) => void;
	onStartRecording?: () => void;
	themeMode?: "dark" | "light";
	accentColor?: AccentColor;
	userName?: string;
}

type DropError = "unsupported-format" | "load-failed" | null;

export function EditorEmptyState({
	onVideoImported,
	onProjectOpened,
	onStartRecording,
	themeMode = "dark",
	accentColor = "lime",
	userName = "Ocal User",
}: EditorEmptyStateProps) {
	const te = useScopedT("editor");
	const tc = useScopedT("common");
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [dropError, setDropError] = useState<DropError>(null);
	const isLight = themeMode === "light";
	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;
	const lastDropErrorRef = useRef<Exclude<DropError, null>>("unsupported-format");
	if (dropError !== null) {
		lastDropErrorRef.current = dropError;
	}

	const [whatsNewOpen, setWhatsNewOpen] = useState(false);

	const handleImportVideo = useCallback(async () => {
		const result = await window.electronAPI.openVideoFilePicker();
		if (result.canceled || !result.success || !result.path) return;

		const setResult = await nativeBridgeClient.project.setCurrentVideoPath(result.path);
		if (!setResult.success) return;

		onVideoImported(result.path);
	}, [onVideoImported]);

	const handleLoadProject = useCallback(async () => {
		const result = await nativeBridgeClient.project.loadProjectFile(getProjectFolder());
		if (result.canceled || !result.success || !result.project) return;
		if (result.path) {
			const folder = parentDirectoryOf(result.path);
			if (folder) {
				saveUserPreferences({ projectFolder: folder });
			}
		}
		onProjectOpened(result.project, result.path ?? null);
	}, [onProjectOpened]);

	// Global shortcut for opening files (Ctrl+O / Cmd+O)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
				e.preventDefault();
				handleImportVideo();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleImportVideo]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer.items.length > 0) {
			setIsDraggingOver(true);
		}
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setIsDraggingOver(false);
		}
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDraggingOver(false);

			const files = Array.from(e.dataTransfer.files);
			if (files.length === 0) return;

			// Handle video file drop directly
			const videoFile = files.find((f) => {
				const lower = f.name.toLowerCase();
				return (
					lower.endsWith(".mp4") ||
					lower.endsWith(".mov") ||
					lower.endsWith(".webm") ||
					lower.endsWith(".mkv") ||
					lower.endsWith(".avi") ||
					lower.endsWith(".m4v") ||
					lower.endsWith(".wmv")
				);
			});

			if (videoFile) {
				let filePath: string;
				try {
					filePath = window.electronAPI.getPathForFile(videoFile);
				} catch {
					setDropError("load-failed");
					return;
				}
				if (filePath) {
					const setResult = await nativeBridgeClient.project.setCurrentVideoPath(filePath);
					if (setResult.success) {
						onVideoImported(filePath);
						return;
					}
				}
			}

			const projectFile = files.find((f) => {
				const lower = f.name.toLowerCase();
				return lower.endsWith(".ocalscreen") || lower.endsWith(".openscreen");
			});
			if (!projectFile) {
				setDropError("unsupported-format");
				return;
			}

			let filePath: string;
			try {
				filePath = window.electronAPI.getPathForFile(projectFile);
			} catch {
				setDropError("load-failed");
				return;
			}
			if (!filePath) {
				setDropError("load-failed");
				return;
			}

			let result: Awaited<ReturnType<typeof window.electronAPI.loadProjectFileFromPath>>;
			try {
				result = await window.electronAPI.loadProjectFileFromPath(filePath);
			} catch {
				setDropError("load-failed");
				return;
			}
			if (!result.success || !result.project) {
				setDropError("load-failed");
				return;
			}

			onProjectOpened(result.project, result.path ?? null);
		},
		[onProjectOpened, onVideoImported],
	);

	return (
		<div
			className={cn(
				"relative flex-1 w-full h-full flex flex-col items-center justify-start md:justify-center overflow-hidden px-4 py-6 sm:py-8 transition-colors duration-200 select-none",
				isLight ? "bg-[#edf0f2] text-zinc-900" : "bg-[#0b0c10] text-zinc-100",
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Fullscreen Drop Overlay */}
			{isDraggingOver && (
				<div
					className={cn(
						"pointer-events-none fixed inset-3 z-50 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed backdrop-blur-xl transition-all duration-200 animate-in fade-in-0",
						isLight ? "bg-white/95" : "bg-[#090a0f]/95",
					)}
					style={{ borderColor: activeAccent.hex }}
				>
					<div
						className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-2xl animate-bounce"
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
					>
						<Upload className="h-8 w-8" />
					</div>
					<p className="text-xl font-black tracking-tight mb-1" style={{ color: activeAccent.hex }}>
						Release to Open Video or Project
					</p>
					<p className={cn("text-xs font-medium", isLight ? "text-zinc-600" : "text-zinc-400")}>
						Supports MP4, MOV, WebM, MKV, AVI, and .ocalscreen project files
					</p>
				</div>
			)}

			{/* Drop error dialog */}
			<Dialog open={dropError !== null} onOpenChange={(open) => !open && setDropError(null)}>
				<DialogContent
					className={cn(
						"rounded-3xl max-w-sm p-6 gap-0",
						isLight
							? "bg-white border-zinc-200 text-zinc-900"
							: "bg-[#0e0f14] border-white/10 text-zinc-100",
					)}
				>
					<DialogHeader className="mb-4">
						<div className="flex items-center gap-3">
							<div
								className={cn(
									"flex h-10 w-10 items-center justify-center rounded-2xl border",
									isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border-white/10",
								)}
								style={{ color: activeAccent.hex }}
							>
								<Film className="h-5 w-5" />
							</div>
							<DialogTitle
								className={cn(
									"text-base font-bold leading-tight",
									isLight ? "text-zinc-900" : "text-white",
								)}
							>
								{lastDropErrorRef.current === "unsupported-format"
									? te("emptyState.dropErrors.unsupportedFormatTitle")
									: te("emptyState.dropErrors.couldNotOpenTitle")}
							</DialogTitle>
						</div>
					</DialogHeader>

					<div className="flex flex-col items-center gap-3 mb-6 text-center">
						<div
							className={cn(
								"flex items-center justify-center w-10 h-10 rounded-full border",
								isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border-white/10",
							)}
						>
							<AlertCircle className="w-5 h-5 text-zinc-400 flex-shrink-0" />
						</div>
						<p className="text-xs text-zinc-400 leading-relaxed">
							{lastDropErrorRef.current === "unsupported-format"
								? te("emptyState.dropErrors.unsupportedFormatMessage")
								: te("emptyState.dropErrors.couldNotOpenMessage")}
						</p>
					</div>

					<button
						type="button"
						onClick={() => setDropError(null)}
						className={cn(
							"flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full border font-bold text-xs transition-colors outline-none cursor-pointer",
							isLight
								? "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900"
								: "bg-white/5 hover:bg-white/10 border-white/10 text-white",
						)}
					>
						<X className="w-4 h-4" />
						{tc("actions.close")}
					</button>
				</DialogContent>
			</Dialog>

			{/* Main Centered Stage */}
			<div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full my-auto py-4">
				{/* Top Welcome Greeting & Quick Status */}
				<div className="flex items-center justify-center gap-2 mb-3">
					{userName && (
						<span
							className={cn(
								"inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all shadow-sm",
								isLight
									? "bg-white/90 border-black/[0.06] text-zinc-700 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
									: "bg-white/[0.04] border-white/[0.08] text-zinc-300",
							)}
						>
							<span
								className="w-2 h-2 rounded-full animate-pulse"
								style={{ backgroundColor: activeAccent.hex }}
							/>
							<span>Welcome back,</span>
							<strong className={cn("font-bold", isLight ? "text-zinc-950" : "text-white")}>
								{userName}
							</strong>
						</span>
					)}

					<span
						className={cn(
							"neon-accent-badge text-[10px] uppercase font-black px-2.5 py-1 shadow-sm",
						)}
					>
						Studio Pro
					</span>
				</div>

				{/* Primary Headline */}
				<h1
					className={cn(
						"text-3xl sm:text-4xl font-extrabold tracking-tight mb-2",
						isLight ? "text-zinc-950" : "text-white",
					)}
				>
					{te("emptyState.title") || "Ocal Screen Studio"}
				</h1>

				{/* Subtitle */}
				<p
					className={cn(
						"max-w-md text-xs sm:text-[13px] leading-relaxed mb-5",
						isLight ? "text-zinc-500" : "text-zinc-400",
					)}
				>
					{te("emptyState.description") ||
						"Drop your screen recordings or project files to edit with smart zoom, smooth splines & 4K wallpapers."}
				</p>

				{/* Top Dot-Matrix Telemetry Deck (Reference Image Inspired Style) */}
				<div className="grid grid-cols-3 gap-2.5 w-full max-w-lg mb-5">
					{/* Stat 1: Resolution */}
					<div
						className={cn(
							"flex flex-col items-center justify-center py-2.5 px-3 rounded-[20px] border transition-all duration-200",
							isLight
								? "bg-white/90 border-black/[0.05] shadow-[0_4px_16px_rgba(0,0,0,0.03)] text-zinc-900"
								: "bg-white/[0.03] border-white/[0.07] text-white",
						)}
					>
						<div className="flex items-center gap-1.5 mb-1">
							<DotMatrixText text="4K" size="sm" color={isLight ? "#18181b" : "#ffffff"} />
							<span className="neon-accent-badge text-[8px] font-bold px-1.5 py-0.2 rounded-full">
								Ultra
							</span>
						</div>
						<span
							className={cn(
								"text-[9.5px] font-medium tracking-wide uppercase",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Resolution
						</span>
					</div>

					{/* Stat 2: Frame Rate */}
					<div
						className={cn(
							"flex flex-col items-center justify-center py-2.5 px-3 rounded-[20px] border transition-all duration-200",
							isLight
								? "bg-white/90 border-black/[0.05] shadow-[0_4px_16px_rgba(0,0,0,0.03)] text-zinc-900"
								: "bg-white/[0.03] border-white/[0.07] text-white",
						)}
					>
						<div className="flex items-center gap-1.5 mb-1">
							<DotMatrixText text="60" size="sm" color={isLight ? "#18181b" : "#ffffff"} />
							<span
								className={cn(
									"text-[8px] font-bold px-1.5 py-0.2 rounded-full border",
									isLight
										? "bg-zinc-100 text-zinc-600 border-zinc-200"
										: "bg-white/10 text-zinc-300 border-white/10",
								)}
							>
								FPS
							</span>
						</div>
						<span
							className={cn(
								"text-[9.5px] font-medium tracking-wide uppercase",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Fluid Render
						</span>
					</div>

					{/* Stat 3: Ready State */}
					<div
						className={cn(
							"flex flex-col items-center justify-center py-2.5 px-3 rounded-[20px] border transition-all duration-200",
							isLight
								? "bg-white/90 border-black/[0.05] shadow-[0_4px_16px_rgba(0,0,0,0.03)] text-zinc-900"
								: "bg-white/[0.03] border-white/[0.07] text-white",
						)}
					>
						<div className="flex items-center gap-1.5 mb-1">
							<DotMatrixText text="00:00" size="xs" color={activeAccent.hex} />
						</div>
						<span
							className={cn(
								"text-[9.5px] font-medium tracking-wide uppercase",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Timeline Ready
						</span>
					</div>
				</div>

				{/* Central Interactive Squircle Hero Dropzone Card */}
				<div
					className={cn(
						"relative w-full rounded-[30px] border transition-all duration-300 overflow-hidden group",
						isLight
							? "bg-white border-black/[0.05] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.02)]"
							: "bg-[#111319] border-white/[0.08] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)]",
					)}
				>
					{/* Drop Canvas Area */}
					<div
						onClick={handleImportVideo}
						className={cn(
							"p-7 sm:p-8 cursor-pointer flex flex-col items-center text-center transition-colors border-b",
							isLight
								? "border-zinc-100 hover:bg-zinc-50/50"
								: "border-white/[0.05] hover:bg-white/[0.02]",
						)}
					>
						{/* Precision Studio Upload Target Frame */}
						<div className="relative mb-4 flex items-center justify-center">
							<div
								className={cn(
									"relative flex h-16 w-16 items-center justify-center rounded-[22px] border transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5",
									isLight
										? "bg-gradient-to-b from-zinc-50 to-zinc-100/80 border-black/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
										: "bg-gradient-to-b from-[#1c1e28] to-[#12131b] border-white/[0.12] shadow-black/60",
								)}
							>
								{/* Stylized Viewfinder Corner Accents */}
								<span
									className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 rounded-tl-sm transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>
								<span
									className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 rounded-tr-sm transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>
								<span
									className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 rounded-bl-sm transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>
								<span
									className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 rounded-br-sm transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>

								{/* Crisp Upload Icon */}
								<Upload
									className="h-7 w-7 stroke-[2.2] transition-transform duration-300 group-hover:-translate-y-0.5"
									style={{ color: activeAccent.hex }}
								/>
							</div>
						</div>

						<h2
							className={cn(
								"text-lg sm:text-xl font-bold tracking-tight mb-1.5",
								isLight ? "text-zinc-950" : "text-white",
							)}
						>
							Drop your video or project file here
						</h2>

						<p
							className={cn(
								"text-xs max-w-sm mb-4 leading-relaxed",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Click to browse your files, or drag and drop any recording directly onto this canvas
						</p>

						{/* Format Badges Pill Strip */}
						<div className="flex flex-wrap items-center justify-center gap-1.5">
							{["MP4", "MOV", "WEBM", "MKV", "AVI", ".OCALSCREEN"].map((fmt) => (
								<span
									key={fmt}
									className={cn(
										"px-2.5 py-1 rounded-full text-[9.5px] font-mono font-bold tracking-wider transition-colors",
										isLight
											? "bg-zinc-100 text-zinc-700 border border-zinc-200/80"
											: "bg-white/[0.04] text-zinc-300 border border-white/[0.06] group-hover:border-white/[0.12]",
									)}
								>
									{fmt}
								</span>
							))}
						</div>
					</div>

					{/* Integrated Action Buttons Bar */}
					<div
						className={cn(
							"p-4 sm:p-4.5 flex flex-col sm:flex-row items-center justify-center gap-3",
							isLight
								? "bg-[#fafbfc] border-t border-zinc-100"
								: "bg-black/25 border-t border-white/[0.04]",
						)}
					>
						<button
							type="button"
							onClick={handleImportVideo}
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							className="flex items-center justify-center gap-2 w-full sm:w-auto px-7 h-11 rounded-full font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer hover:brightness-105 active:scale-[0.98] shadow-md hover:shadow-lg"
						>
							<Film className="h-4 w-4 stroke-[2.2]" />
							<span>{te("emptyState.importVideoButton") || "Import Video File..."}</span>
						</button>

						<button
							type="button"
							onClick={handleLoadProject}
							className={cn(
								"flex items-center justify-center gap-2 w-full sm:w-auto px-5 h-11 rounded-full border font-semibold text-sm tracking-wide transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm",
								isLight
									? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900"
									: "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] hover:border-white/[0.2] text-zinc-100 hover:text-white",
							)}
						>
							<FolderOpen className="h-4 w-4" />
							<span>{te("emptyState.loadProjectButton") || "Load Project..."}</span>
						</button>

						{onStartRecording && (
							<button
								type="button"
								onClick={onStartRecording}
								className={cn(
									"flex items-center justify-center gap-2.5 w-full sm:w-auto px-5 h-11 rounded-full border font-semibold text-sm tracking-wide transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm",
									isLight
										? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900"
										: "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] hover:border-white/[0.2] text-zinc-100 hover:text-white",
								)}
							>
								<span className="relative flex h-2.5 w-2.5">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
								</span>
								<span>Record Screen</span>
							</button>
						)}
					</div>
				</div>

				{/* Quick Tips / Keyboard Shortcut Pill Strip */}
				<div
					className={cn(
						"flex items-center justify-center gap-2 mt-4 px-4 py-1.5 rounded-full border text-[11px] font-medium shadow-sm",
						isLight
							? "bg-white/80 border-black/[0.05] text-zinc-600"
							: "bg-white/[0.03] border-white/[0.06] text-zinc-400",
					)}
				>
					<span>Quick open:</span>
					<kbd
						className={cn(
							"px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold shadow-2xs",
							isLight
								? "bg-zinc-100 border-zinc-300 text-zinc-800"
								: "bg-white/[0.08] border-white/15 text-zinc-200",
						)}
					>
						Ctrl + O
					</kbd>
					<span className="text-zinc-400">•</span>
					<span>or drag files anywhere to load</span>
				</div>
			</div>

			{/* Floating "What's New" Button — Bottom Right */}
			{!whatsNewOpen && (
				<button
					type="button"
					onClick={() => setWhatsNewOpen(true)}
					className={cn(
						"absolute bottom-5 right-5 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.03] active:scale-[0.97] group",
						isLight
							? "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800 shadow-zinc-200/60"
							: "bg-[#151720] hover:bg-[#1a1d2a] border-white/[0.1] hover:border-white/[0.18] text-zinc-200 shadow-black/40",
					)}
				>
					<span
						className="flex items-center justify-center w-5 h-5 rounded-md transition-colors"
						style={{ backgroundColor: `${activeAccent.hex}20` }}
					>
						<Sparkles className="w-3 h-3 text-amber-400" />
					</span>
					<span>What's New</span>
					<span
						className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider"
						style={{
							backgroundColor: `${activeAccent.hex}18`,
							borderColor: `${activeAccent.hex}35`,
							color: activeAccent.hex,
						}}
					>
						{CHANGELOG_DATA[0].version}
					</span>
				</button>
			)}

			{/* Slide-In "What's New" Panel — Right Side, No Overlay */}
			<div
				className={cn(
					"absolute top-0 right-0 bottom-0 z-30 flex flex-col transition-transform duration-300 ease-out",
					"w-[380px] max-w-[90vw]",
					isLight
						? "bg-white border-l border-zinc-200 shadow-[-8px_0_30px_rgba(0,0,0,0.06)]"
						: "bg-[#0e1017] border-l border-white/[0.08] shadow-[-8px_0_30px_rgba(0,0,0,0.5)]",
					whatsNewOpen ? "translate-x-0" : "translate-x-full",
				)}
			>
				{/* Panel Header */}
				<div
					className={cn(
						"flex items-center justify-between px-5 py-3.5 border-b shrink-0",
						isLight ? "border-zinc-200" : "border-white/[0.06]",
					)}
				>
					<div className="flex items-center gap-2.5">
						<div
							className="w-7 h-7 rounded-xl flex items-center justify-center"
							style={{ backgroundColor: `${activeAccent.hex}18` }}
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-400" />
						</div>
						<div>
							<h2
								className={cn(
									"text-sm font-bold tracking-tight leading-tight",
									isLight ? "text-zinc-900" : "text-white",
								)}
							>
								What's New
							</h2>
							<span
								className={cn(
									"text-[10px] font-medium",
									isLight ? "text-zinc-500" : "text-zinc-400",
								)}
							>
								Ocal Screen v{CHANGELOG_DATA[0].version}
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setWhatsNewOpen(false)}
						className={cn(
							"flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95",
							isLight
								? "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600 hover:text-zinc-900"
								: "bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.08] text-zinc-400 hover:text-white",
						)}
					>
						<ChevronLeft className="w-3.5 h-3.5" />
						<span>Close</span>
					</button>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto custom-scrollbar py-3">
					<WhatsNewSection
						isLight={isLight}
						accentHex={activeAccent.hex}
						initialVersion={CHANGELOG_DATA[0].version}
					/>
				</div>
			</div>
		</div>
	);
}
