import {
	AlertCircle,
	Captions,
	Film,
	FolderOpen,
	MousePointer,
	Sparkles,
	Upload,
	Wand2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import {
	ACCENT_COLOR_MAP,
	type AccentColor,
	getProjectFolder,
	parentDirectoryOf,
	saveUserPreferences,
} from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import { nativeBridgeClient } from "@/native";

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

			const projectFile = files.find((f) => f.name.endsWith(".openscreen"));
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
				"relative flex-1 w-full h-full flex flex-col items-center justify-start md:justify-center overflow-y-auto px-4 py-6 sm:py-8 transition-colors duration-200 select-none",
				isLight ? "bg-[#f8f9fc] text-zinc-900" : "bg-[#090a0f] text-zinc-100",
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Masked studio canvas grid — smooth edge fade, NO murky background blur glow */}
			<div
				className={cn(
					"pointer-events-none absolute inset-0 transition-opacity duration-300",
					isLight
						? "opacity-[0.35] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)]"
						: "opacity-[0.09] [background-image:radial-gradient(#ffffff_1px,transparent_1px)]",
					"[background-size:24px_24px] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_45%,#000_50%,transparent_100%)]",
				)}
			/>

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
						Supports MP4, MOV, WebM, MKV, AVI, and .openscreen project files
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
			<div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full my-auto">
				{/* Top Welcome Greeting */}
				{userName && (
					<div className="mb-2.5">
						<span
							className={cn(
								"inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border backdrop-blur-md transition-all shadow-sm",
								isLight
									? "bg-white/80 border-zinc-200/80 text-zinc-600"
									: "bg-white/[0.04] border-white/[0.08] text-zinc-400",
							)}
						>
							<span
								className="w-1.5 h-1.5 rounded-full animate-pulse"
								style={{ backgroundColor: activeAccent.hex }}
							/>
							<span>Welcome back,</span>
							<strong className={cn("font-bold", isLight ? "text-zinc-900" : "text-white")}>
								{userName}
							</strong>
						</span>
					</div>
				)}

				{/* Primary Headline */}
				<h1
					className={cn(
						"text-2xl sm:text-3xl font-black tracking-tight mb-1.5",
						isLight ? "text-zinc-950" : "text-white",
					)}
				>
					{te("emptyState.title") || "No project open"}
				</h1>

				{/* Subtitle */}
				<p
					className={cn(
						"max-w-md text-xs sm:text-[13px] leading-relaxed mb-5",
						isLight ? "text-zinc-500" : "text-zinc-400",
					)}
				>
					{te("emptyState.description") ||
						"Import a video to start editing, or load an existing Ocal Screen project."}
				</p>

				{/* Central Interactive Hero Dropzone Card */}
				<div
					className={cn(
						"relative w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl backdrop-blur-xl group",
						isLight
							? "bg-white/90 hover:bg-white border-zinc-200/90 hover:border-zinc-300 shadow-zinc-200/50"
							: "bg-[#111218]/90 hover:bg-[#14161f]/90 border-white/[0.08] hover:border-white/[0.16] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)]",
					)}
				>
					{/* Drop Canvas Area */}
					<div
						onClick={handleImportVideo}
						className={cn(
							"p-6 sm:p-7 cursor-pointer flex flex-col items-center text-center transition-colors border-b",
							isLight
								? "border-zinc-100 hover:bg-zinc-50/60"
								: "border-white/[0.05] hover:bg-white/[0.02]",
						)}
					>
						{/* Precision Studio Upload Target Frame (Clean, zero glow) */}
						<div className="relative mb-3.5 flex items-center justify-center">
							<div
								className={cn(
									"relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 shadow-md",
									isLight
										? "bg-gradient-to-b from-white to-zinc-100 border-zinc-200 text-zinc-900 shadow-zinc-200/60"
										: "bg-gradient-to-b from-[#181a24] to-[#101118] border-white/[0.12] text-white shadow-black/60 group-hover:border-white/25",
								)}
							>
								{/* Stylized Viewfinder Corner Accents */}
								<span
									className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l rounded-tl-[2px] transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>
								<span
									className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r rounded-tr-[2px] transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>
								<span
									className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l rounded-bl-[2px] transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>
								<span
									className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r rounded-br-[2px] transition-colors"
									style={{ borderColor: activeAccent.hex }}
								/>

								{/* Crisp Upload Icon */}
								<Upload
									className="h-6 w-6 stroke-[2.2] transition-transform duration-300 group-hover:-translate-y-0.5"
									style={{ color: activeAccent.hex }}
								/>
							</div>
						</div>

						<h2
							className={cn(
								"text-base sm:text-lg font-bold tracking-tight mb-1",
								isLight ? "text-zinc-900" : "text-white",
							)}
						>
							Drop your video or project file here
						</h2>

						<p
							className={cn(
								"text-xs max-w-sm mb-3.5 leading-relaxed",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Click to browse your files, or drag and drop any recording directly into this window
						</p>

						{/* Format Badges Pill Strip */}
						<div className="flex flex-wrap items-center justify-center gap-1.5">
							{["MP4", "MOV", "WEBM", "MKV", "AVI", ".OPENSCREEN"].map((fmt) => (
								<span
									key={fmt}
									className={cn(
										"px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold tracking-wider transition-colors",
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
							"p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-center gap-2.5",
							isLight
								? "bg-zinc-50/80 border-t border-zinc-100"
								: "bg-black/25 border-t border-white/[0.04]",
						)}
					>
						<button
							type="button"
							onClick={handleImportVideo}
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 h-8.5 rounded-full font-black text-xs tracking-wide transition-all cursor-pointer hover:opacity-90 active:scale-95 shadow-md"
						>
							<Film className="h-3.5 w-3.5" />
							<span>{te("emptyState.importVideoButton") || "Import Video File..."}</span>
						</button>

						<button
							type="button"
							onClick={handleLoadProject}
							className={cn(
								"flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 h-8.5 rounded-full border font-bold text-xs tracking-wide transition-all cursor-pointer active:scale-95",
								isLight
									? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900 shadow-sm"
									: "bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-zinc-200 hover:text-white",
							)}
						>
							<FolderOpen className="h-3.5 w-3.5" />
							<span>{te("emptyState.loadProjectButton") || "Load Project..."}</span>
						</button>

						{onStartRecording && (
							<button
								type="button"
								onClick={onStartRecording}
								className={cn(
									"flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 h-8.5 rounded-full border font-bold text-xs tracking-wide transition-all cursor-pointer active:scale-95",
									isLight
										? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900 shadow-sm"
										: "bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-zinc-200 hover:text-white",
								)}
							>
								<span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
								<span>Record Screen</span>
							</button>
						)}
					</div>
				</div>

				{/* Studio Superpowers Showcase Grid */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full max-w-2xl mt-4">
					{/* Card 1: Auto-Zoom */}
					<div
						className={cn(
							"flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5",
							isLight
								? "bg-white/70 hover:bg-white border-zinc-200/80 hover:border-zinc-300 shadow-sm"
								: "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/[0.12]",
						)}
					>
						<div className="flex items-center justify-between mb-1.5">
							<div
								className="flex h-6 w-6 items-center justify-center rounded-lg"
								style={{ backgroundColor: `${activeAccent.hex}20`, color: activeAccent.hex }}
							>
								<Wand2 className="h-3 w-3" />
							</div>
							<span
								className="text-[8.5px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded"
								style={{ backgroundColor: `${activeAccent.hex}18`, color: activeAccent.hex }}
							>
								Focus
							</span>
						</div>
						<div
							className={cn(
								"text-[11.5px] font-bold mb-0.5",
								isLight ? "text-zinc-900" : "text-zinc-200",
							)}
						>
							Smart Auto-Zoom
						</div>
						<p
							className={cn(
								"text-[10px] leading-snug",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Smooth dynamic zoom into clicks & keystrokes.
						</p>
					</div>

					{/* Card 2: Cursor Smoothing */}
					<div
						className={cn(
							"flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5",
							isLight
								? "bg-white/70 hover:bg-white border-zinc-200/80 hover:border-zinc-300 shadow-sm"
								: "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/[0.12]",
						)}
					>
						<div className="flex items-center justify-between mb-1.5">
							<div
								className="flex h-6 w-6 items-center justify-center rounded-lg"
								style={{ backgroundColor: `${activeAccent.hex}20`, color: activeAccent.hex }}
							>
								<MousePointer className="h-3 w-3" />
							</div>
							<span
								className="text-[8.5px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded"
								style={{ backgroundColor: `${activeAccent.hex}18`, color: activeAccent.hex }}
							>
								Splines
							</span>
						</div>
						<div
							className={cn(
								"text-[11.5px] font-bold mb-0.5",
								isLight ? "text-zinc-900" : "text-zinc-200",
							)}
						>
							Cursor Smoothing
						</div>
						<p
							className={cn(
								"text-[10px] leading-snug",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Sub-pixel splines, click ripples & motion blur.
						</p>
					</div>

					{/* Card 3: 4K Wallpaper Studio */}
					<div
						className={cn(
							"flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5",
							isLight
								? "bg-white/70 hover:bg-white border-zinc-200/80 hover:border-zinc-300 shadow-sm"
								: "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/[0.12]",
						)}
					>
						<div className="flex items-center justify-between mb-1.5">
							<div
								className="flex h-6 w-6 items-center justify-center rounded-lg"
								style={{ backgroundColor: `${activeAccent.hex}20`, color: activeAccent.hex }}
							>
								<Sparkles className="h-3 w-3" />
							</div>
							<span
								className="text-[8.5px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded"
								style={{ backgroundColor: `${activeAccent.hex}18`, color: activeAccent.hex }}
							>
								Canvas
							</span>
						</div>
						<div
							className={cn(
								"text-[11.5px] font-bold mb-0.5",
								isLight ? "text-zinc-900" : "text-zinc-200",
							)}
						>
							4K Wallpaper Studio
						</div>
						<p
							className={cn(
								"text-[10px] leading-snug",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							Mesh gradients, 3D tilt & rounded bezels.
						</p>
					</div>

					{/* Card 4: AI Auto-Captions */}
					<div
						className={cn(
							"flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5",
							isLight
								? "bg-white/70 hover:bg-white border-zinc-200/80 hover:border-zinc-300 shadow-sm"
								: "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/[0.12]",
						)}
					>
						<div className="flex items-center justify-between mb-1.5">
							<div
								className="flex h-6 w-6 items-center justify-center rounded-lg"
								style={{ backgroundColor: `${activeAccent.hex}20`, color: activeAccent.hex }}
							>
								<Captions className="h-3 w-3" />
							</div>
							<span
								className="text-[8.5px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded"
								style={{ backgroundColor: `${activeAccent.hex}18`, color: activeAccent.hex }}
							>
								Whisper
							</span>
						</div>
						<div
							className={cn(
								"text-[11.5px] font-bold mb-0.5",
								isLight ? "text-zinc-900" : "text-zinc-200",
							)}
						>
							AI Auto-Captions
						</div>
						<p
							className={cn(
								"text-[10px] leading-snug",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							On-device speech-to-text with word timing.
						</p>
					</div>
				</div>

				{/* Quick Tips / Keyboard Shortcut Strip */}
				<div className="flex items-center justify-center gap-1.5 mt-3 text-[10.5px] font-medium text-zinc-500">
					<span>Tip: Press</span>
					<kbd
						className={cn(
							"px-1.5 py-0.5 rounded border text-[9.5px] font-mono font-bold",
							isLight
								? "bg-zinc-100 border-zinc-300 text-zinc-700"
								: "bg-white/[0.06] border-white/10 text-zinc-300",
						)}
					>
						Ctrl + O
					</kbd>
					<span>to open video or project, or drag files anywhere onto this screen</span>
				</div>
			</div>
		</div>
	);
}
