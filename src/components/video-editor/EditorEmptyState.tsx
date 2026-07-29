import { AlertCircle, Film, FolderOpen, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { ACCENT_COLOR_MAP, type AccentColor, getProjectFolder, parentDirectoryOf, saveUserPreferences } from "@/lib/userPreferences";
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
	// Freeze the last non-null error type so dialog content doesn't snap to the else-branch
	// during the closing animation (same pattern as UnsavedChangesDialog).
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

			const projectFile = files.find((f) => f.name.endsWith(".openscreen"));
			if (!projectFile) {
				setDropError("unsupported-format");
				return;
			}

			// Use Electron's webUtils.getPathForFile; File.path was removed in Electron 32+
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
		[onProjectOpened],
	);

	return (
		<div
			className={`flex h-full w-full flex-col items-center justify-center transition-colors duration-200 ${
				isLight ? "bg-[#f4f4f5] text-[#18181b]" : "bg-[#0c0c0c] text-[#e8e8e8]"
			}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Drop overlay */}
			{isDraggingOver && (
				<div
					className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-sm"
					style={{
						borderColor: activeAccent.hex,
						backgroundColor: `${activeAccent.hex}15`,
					}}
				>
					<Upload className="mb-3 h-10 w-10 animate-bounce" style={{ color: activeAccent.hex }} />
					<p className="text-base font-extrabold" style={{ color: activeAccent.hex }}>
						{te("emptyState.dropOverlay")}
					</p>
				</div>
			)}

			{/* Drop error dialog */}
			<Dialog open={dropError !== null} onOpenChange={(open) => !open && setDropError(null)}>
				<DialogContent
					className={`rounded-3xl max-w-sm p-6 gap-0 shadow-2xl ${
						isLight
							? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
							: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
					}`}
				>
					<DialogHeader className="mb-4">
						<div className="flex items-center gap-3">
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
									isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
								}`}
								style={{ color: activeAccent.hex }}
							>
								<Film className="h-5 w-5" />
							</div>
							<DialogTitle
								className={`text-base font-bold leading-tight ${isLight ? "text-[#18181b]" : "text-[#e8e8e8]"}`}
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
								isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
							}`}
						>
							<AlertCircle className="w-5 h-5 text-[#888888] flex-shrink-0" />
						</div>
						<p className="text-xs text-[#888888] leading-relaxed">
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
								? "bg-[#f4f4f5] hover:bg-[#e4e4e7] border-[#e4e4e7] text-[#18181b]"
								: "bg-[#141414] hover:bg-[#202020] border-[#252525] text-[#e8e8e8]"
						}`}
					>
						<X className="w-4 h-4" />
						{tc("actions.close")}
					</button>
				</DialogContent>
			</Dialog>

			<div className="relative flex flex-col items-center gap-6 px-6 text-center max-w-md">
				{/* Ocal Studio Icon Badge */}
				<div className="relative flex items-center justify-center">
					<div
						className="absolute inset-0 rounded-3xl blur-xl opacity-30"
						style={{ backgroundColor: activeAccent.hex }}
					/>
					<div
						className={`relative flex h-16 w-16 items-center justify-center rounded-3xl border shadow-xl ${
							isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
						}`}
						style={{ color: activeAccent.hex }}
					>
						<Film className="h-8 w-8" />
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<span className="text-xs font-extrabold uppercase tracking-wider text-[#888888]">
						Welcome back, <span style={{ color: activeAccent.hex }}>{userName}</span>
					</span>
					<h2
						className={`text-xl font-extrabold tracking-tight ${isLight ? "text-[#18181b]" : "text-[#e8e8e8]"}`}
					>
						{te("emptyState.title")}
					</h2>
					<p className="max-w-sm text-xs leading-relaxed text-[#888888]">
						{te("emptyState.description")}
					</p>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-3 w-full max-w-xs mt-2">
					<button
						type="button"
						onClick={handleImportVideo}
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						className="flex items-center justify-center gap-2.5 w-full px-6 py-3 rounded-full active:scale-95 font-extrabold text-xs tracking-wide transition-all shadow-md cursor-pointer hover:opacity-90"
					>
						<Film className="h-4 w-4" />
						{te("emptyState.importVideoButton")}
					</button>
					<button
						type="button"
						onClick={handleLoadProject}
						className={`flex items-center justify-center gap-2.5 w-full px-6 py-3 rounded-full border active:scale-95 font-bold text-xs tracking-wide transition-all cursor-pointer ${
							isLight
								? "bg-[#ffffff] hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
								: "bg-[#141414] hover:bg-[#1a1a1a] border-[#252525] text-[#e8e8e8]"
						}`}
					>
						<FolderOpen className="h-4 w-4" />
						{te("emptyState.loadProjectButton")}
					</button>
				</div>

				<div className="flex flex-col items-center gap-2 mt-4">
					<p className="text-[11px] font-medium text-[#888888]">{te("emptyState.supportedFormats")}</p>
					<div className="flex items-center gap-1.5 text-[11px] text-[#888888] mt-2">
						<Upload className="h-3 w-3" />
						<span>{te("emptyState.dragDropHint")}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
