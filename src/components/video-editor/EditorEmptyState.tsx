import {
	AlertCircle,
	Film,
	FolderOpen,
	MousePointer,
	Sparkles,
	Upload,
	Video,
	Wand2,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import {
	ACCENT_COLOR_MAP,
	type AccentColor,
	getProjectFolder,
	parentDirectoryOf,
	saveUserPreferences,
} from "@/lib/userPreferences";
import { nativeBridgeClient } from "@/native";

interface EditorEmptyStateProps {
	onVideoImported: (videoPath: string) => void;
	/** Called with the loaded project data; handles both button click and drag-drop */
	onProjectOpened: (project: unknown, path: string | null) => void;
	themeMode?: "dark" | "light";
	accentColor?: AccentColor;
	userName?: string;
}

type DropError = "unsupported-format" | "load-failed" | null;

export function EditorEmptyState({
	onVideoImported,
	onProjectOpened,
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

			// Handle video file drop directly!
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
			className={`relative flex h-full w-full flex-col items-center justify-center overflow-y-auto px-6 py-8 transition-colors duration-200 ${
				isLight
					? "bg-gradient-to-b from-[#f8f9fa] to-[#f1f3f5] text-zinc-900"
					: "bg-gradient-to-b from-[#0a0b0f] via-[#0c0d12] to-[#07080b] text-zinc-100"
			}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Subtle ambient background glow */}
			<div
				className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-10"
				style={{ backgroundColor: activeAccent.hex }}
			/>

			{/* Drop overlay */}
			{isDraggingOver && (
				<div
					className="pointer-events-none absolute inset-4 z-50 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed backdrop-blur-md transition-all animate-in fade-in-0 duration-150"
					style={{
						borderColor: activeAccent.hex,
						backgroundColor: isLight ? "rgba(255,255,255,0.9)" : "rgba(10,11,15,0.9)",
					}}
				>
					<div
						className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 animate-bounce"
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
					>
						<Upload className="h-8 w-8" />
					</div>
					<p className="text-lg font-black tracking-tight" style={{ color: activeAccent.hex }}>
						Drop your video or project here
					</p>
					<p className={`mt-1 text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
						Supports MP4, MOV, WebM, MKV, AVI, and .openscreen
					</p>
				</div>
			)}

			{/* Drop error dialog */}
			<Dialog open={dropError !== null} onOpenChange={(open) => !open && setDropError(null)}>
				<DialogContent
					className={`rounded-3xl max-w-sm p-6 gap-0 ${
						isLight
							? "bg-white border-zinc-200 text-zinc-900"
							: "bg-[#0e0f14] border-white/10 text-zinc-100"
					}`}
				>
					<DialogHeader className="mb-4">
						<div className="flex items-center gap-3">
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
									isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border-white/10"
								}`}
								style={{ color: activeAccent.hex }}
							>
								<Film className="h-5 w-5" />
							</div>
							<DialogTitle
								className={`text-base font-bold leading-tight ${isLight ? "text-zinc-900" : "text-white"}`}
							>
								{lastDropErrorRef.current === "unsupported-format"
									? te("emptyState.dropErrors.unsupportedFormatTitle")
									: te("emptyState.dropErrors.couldNotOpenTitle")}
							</DialogTitle>
						</div>
					</DialogHeader>

					<div className="flex flex-col items-center gap-3 mb-6 text-center">
						<div
							className={`flex items-center justify-center w-10 h-10 rounded-full border ${
								isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border-white/10"
							}`}
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
						className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full border font-bold text-xs transition-colors outline-none cursor-pointer ${
							isLight
								? "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900"
								: "bg-white/5 hover:bg-white/10 border-white/10 text-white"
						}`}
					>
						<X className="w-4 h-4" />
						{tc("actions.close")}
					</button>
				</DialogContent>
			</Dialog>

			{/* Main Centered Content Container */}
			<div className="relative flex flex-col items-center text-center max-w-xl w-full my-auto">
				{/* Studio Icon Badge */}
				<div className="relative mb-5 flex items-center justify-center">
					<div
						className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border transition-transform duration-300 hover:scale-105 ${
							isLight
								? "bg-white border-zinc-200 text-zinc-900"
								: "bg-white/[0.04] border-white/[0.09] text-white"
						}`}
					>
						<Video className="h-7 w-7" style={{ color: activeAccent.hex }} />
					</div>
				</div>

				{/* Title and Greeting */}
				<div className="flex flex-col items-center gap-2 mb-6">
					<div className="flex items-center gap-2">
						<span
							className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
							style={{ backgroundColor: `${activeAccent.hex}25`, color: activeAccent.hex }}
						>
							Studio Workspace
						</span>
						<span
							className={`text-xs font-semibold ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
						>
							Welcome back, <span className="font-bold text-current">{userName}</span>
						</span>
					</div>

					<h1
						className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
							isLight ? "text-zinc-950" : "text-white"
						}`}
					>
						{te("emptyState.title") || "Start Creating Your Video"}
					</h1>

					<p
						className={`max-w-md text-xs sm:text-sm leading-relaxed ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
					>
						{te("emptyState.description") ||
							"Import a recorded video to add smooth auto-zoom, cursor animations, blur filters, and auto-captions."}
					</p>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm mb-6">
					<button
						type="button"
						onClick={handleImportVideo}
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						className="flex items-center justify-center gap-2 w-full sm:flex-1 h-10 px-5 rounded-full active:scale-95 font-black text-xs tracking-wide transition-all cursor-pointer hover:opacity-90"
					>
						<Film className="h-4 w-4" />
						<span>{te("emptyState.importVideoButton") || "Import Video File..."}</span>
					</button>

					<button
						type="button"
						onClick={handleLoadProject}
						className={`flex items-center justify-center gap-2 w-full sm:flex-1 h-10 px-5 rounded-full border active:scale-95 font-bold text-xs tracking-wide transition-all cursor-pointer ${
							isLight
								? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900"
								: "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200 hover:text-white"
						}`}
					>
						<FolderOpen className="h-4 w-4" />
						<span>{te("emptyState.loadProjectButton") || "Load Project..."}</span>
					</button>
				</div>

				{/* Drag & Drop Hint Card */}
				<div
					onClick={handleImportVideo}
					className={`w-full max-w-md p-4 rounded-2xl border border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center gap-1.5 ${
						isLight
							? "border-zinc-300 bg-white/60 hover:bg-white hover:border-zinc-400"
							: "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
					}`}
				>
					<div className="flex items-center gap-1.5 text-xs font-semibold">
						<Upload className="h-3.5 w-3.5" style={{ color: activeAccent.hex }} />
						<span className={isLight ? "text-zinc-700" : "text-zinc-300"}>
							{te("emptyState.dragDropHint") ||
								"or drag and drop video files directly into this window"}
						</span>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
						{["MP4", "MOV", "WEBM", "MKV", "AVI"].map((fmt) => (
							<span
								key={fmt}
								className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold tracking-wider ${
									isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/[0.06] text-zinc-400"
								}`}
							>
								{fmt}
							</span>
						))}
					</div>
				</div>

				{/* Studio Feature Highlights Bar */}
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg mt-6 pt-5 border-t border-white/[0.06]">
					<div
						className={`flex items-center gap-2 p-2 rounded-xl text-left ${isLight ? "bg-white/40" : "bg-white/[0.02]"}`}
					>
						<Wand2 className="h-3.5 w-3.5 shrink-0" style={{ color: activeAccent.hex }} />
						<div className="min-w-0">
							<div
								className={`text-[11px] font-bold truncate ${isLight ? "text-zinc-800" : "text-zinc-200"}`}
							>
								Smart Auto-Zoom
							</div>
							<div
								className={`text-[9.5px] truncate ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
							>
								Automatic focus tracking
							</div>
						</div>
					</div>

					<div
						className={`flex items-center gap-2 p-2 rounded-xl text-left ${isLight ? "bg-white/40" : "bg-white/[0.02]"}`}
					>
						<Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: activeAccent.hex }} />
						<div className="min-w-0">
							<div
								className={`text-[11px] font-bold truncate ${isLight ? "text-zinc-800" : "text-zinc-200"}`}
							>
								4K Wallpaper Studio
							</div>
							<div
								className={`text-[9.5px] truncate ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
							>
								Gradients & canvas inset
							</div>
						</div>
					</div>

					<div
						className={`col-span-2 sm:col-span-1 flex items-center gap-2 p-2 rounded-xl text-left ${isLight ? "bg-white/40" : "bg-white/[0.02]"}`}
					>
						<MousePointer className="h-3.5 w-3.5 shrink-0" style={{ color: activeAccent.hex }} />
						<div className="min-w-0">
							<div
								className={`text-[11px] font-bold truncate ${isLight ? "text-zinc-800" : "text-zinc-200"}`}
							>
								Cursor Smoothing
							</div>
							<div
								className={`text-[9.5px] truncate ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
							>
								Motion blur & clicks
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
