import { AlertCircle, CheckCircle2, Folder, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScopedT } from "@/contexts/I18nContext";
import type { ExportProgress } from "@/lib/exporter";
import { ACCENT_COLOR_MAP, type AccentColor } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	progress: ExportProgress | null;
	isExporting: boolean;
	error: string | null;
	onCancel?: () => void;
	exportFormat?: "mp4" | "gif";
	exportedFilePath?: string;
	onShowInFolder?: () => void;
	accentColor?: AccentColor;
	themeMode?: "dark" | "light";
}

export function ExportDialog({
	isOpen,
	onClose,
	progress,
	isExporting,
	error,
	onCancel,
	exportFormat = "mp4",
	exportedFilePath,
	onShowInFolder,
	accentColor = "lime",
	themeMode = "dark",
}: ExportDialogProps) {
	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = themeMode === "light";
	const t = useScopedT("dialogs");
	const [showSuccess, setShowSuccess] = useState(false);

	useEffect(() => {
		if (isExporting) {
			setShowSuccess(false);
		}
	}, [isExporting]);

	// Reset when the dialog opens fresh (not mid-export).
	useEffect(() => {
		if (isOpen && !isExporting && !progress) {
			setShowSuccess(false);
		}
	}, [isOpen, isExporting, progress]);

	useEffect(() => {
		if (!isExporting && progress && progress.percentage >= 100 && !error) {
			setShowSuccess(true);
			const timer = setTimeout(() => {
				setShowSuccess(false);
				onClose();
			}, 2500);
			return () => clearTimeout(timer);
		}
	}, [isExporting, progress, error, onClose]);

	if (!isOpen) return null;

	const formatLabel = exportFormat === "gif" ? "GIF" : "Video";

	// Compiling phase: frames are done but the export is still finishing.
	const isCompiling =
		isExporting && progress && progress.percentage >= 100 && exportFormat === "gif";
	const isFinalizing = progress?.phase === "finalizing";
	const renderProgress = progress?.renderProgress;

	const getStatusMessage = () => {
		if (error) return t("export.tryAgain");
		if (isCompiling || isFinalizing) {
			if (exportFormat === "mp4") {
				return t("export.finalizingVideo");
			}
			if (renderProgress !== undefined && renderProgress > 0) {
				return t("export.compilingGifProgress", { progress: String(renderProgress) });
			}
			return t("export.compilingGifWait");
		}
		return t("export.takeMoment");
	};

	const getTitle = () => {
		if (error) return t("export.failed");
		if (isFinalizing && exportFormat === "mp4") return t("export.finalizingVideoTitle");
		if (isCompiling || isFinalizing) return t("export.compilingGif");
		return t("export.exportingFormat", { format: formatLabel });
	};

	const percentage = progress?.percentage ?? 0;
	const isIndeterminate =
		!progress || isCompiling || (isFinalizing && renderProgress === undefined);

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 animate-in fade-in duration-200"
				onClick={isExporting ? undefined : onClose}
			/>

			{/* Modal Dialog Card */}
			<div
				className={cn(
					"fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] rounded-[28px] shadow-2xl border p-6 w-[92vw] max-w-[440px] animate-in zoom-in-95 duration-200 backdrop-blur-2xl transition-all",
					isLight
						? "bg-white/95 border-[#e4e4e7] text-[#18181b] shadow-slate-900/10"
						: "bg-[#0d0e12]/95 border-white/10 text-slate-100 shadow-2xl shadow-black/80",
				)}
			>
				{/* Top ambient glow */}
				<div
					className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl pointer-events-none opacity-20"
					style={{ backgroundColor: error ? "#ef4444" : activeAccent.hex }}
				/>

				{/* Header with Hero Icon & Status */}
				<div
					className={cn(
						"flex items-center justify-between gap-3.5 relative",
						(isExporting || error || showSuccess) && "mb-5",
					)}
				>
					<div className="flex items-center gap-3.5 min-w-0 flex-1">
						{showSuccess ? (
							<div
								className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-lg"
								style={{
									backgroundColor: `${activeAccent.hex}18`,
									borderColor: `${activeAccent.hex}40`,
									color: activeAccent.hex,
								}}
							>
								<CheckCircle2 className="w-6 h-6" style={{ color: activeAccent.hex }} />
							</div>
						) : error ? (
							<div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0 shadow-lg">
								<AlertCircle className="w-6 h-6 text-red-400" />
							</div>
						) : (
							<div
								className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 relative shadow-lg"
								style={{
									backgroundColor: `${activeAccent.hex}15`,
									borderColor: `${activeAccent.hex}35`,
								}}
							>
								<Loader2 className="w-6 h-6 animate-spin" style={{ color: activeAccent.hex }} />
							</div>
						)}

						<div className="min-w-0 flex-1 flex flex-col justify-center">
							<h3
								className={cn(
									"text-base font-extrabold tracking-tight truncate leading-tight",
									isLight ? "text-[#18181b]" : "text-white",
								)}
							>
								{showSuccess ? t("export.complete") : getTitle()}
							</h3>
							<p
								className={cn(
									"text-xs font-medium truncate mt-1 leading-tight",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								{showSuccess
									? t("export.yourFormatReady", { format: formatLabel.toLowerCase() })
									: getStatusMessage()}
							</p>
						</div>
					</div>

					{!isExporting && (
						<button
							type="button"
							onClick={onClose}
							className={cn(
								"w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 self-center",
								isLight
									? "border-[#e4e4e7] text-slate-500 hover:text-slate-900 hover:bg-[#f4f4f5]"
									: "border-white/10 text-slate-400 hover:text-white hover:bg-white/10",
							)}
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{/* Error Box */}
				{error && (
					<div className="mb-5 animate-in slide-in-from-top-2">
						<div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-3.5 flex items-center gap-3">
							<AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
							<p className="whitespace-pre-wrap break-words text-xs text-red-400 leading-relaxed font-medium">
								{error}
							</p>
						</div>
					</div>
				)}

				{/* Exporting Active Progress Section */}
				{!showSuccess && !error && (
					<div className="space-y-4">
						{/* Progress Bar & Percentage */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-xs font-bold">
								<span
									className={cn(
										"text-[11px] uppercase tracking-wider",
										isLight ? "text-slate-500" : "text-slate-400",
									)}
								>
									{isCompiling || isFinalizing
										? t("export.compiling")
										: t("export.renderingFrames")}
								</span>
								<span
									className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
									style={{
										backgroundColor: `${activeAccent.hex}15`,
										borderColor: `${activeAccent.hex}30`,
										color: activeAccent.hex,
									}}
								>
									{isCompiling || isFinalizing
										? renderProgress !== undefined && renderProgress > 0
											? `${renderProgress}%`
											: t("export.processing")
										: progress
											? `${percentage.toFixed(0)}%`
											: "0%"}
								</span>
							</div>

							{/* Track */}
							<div
								className={cn(
									"h-2.5 rounded-full overflow-hidden border p-0.5 relative",
									isLight ? "bg-slate-100 border-[#e4e4e7]" : "bg-black/40 border-white/10",
								)}
							>
								{isIndeterminate ? (
									<div className="h-full w-full relative overflow-hidden rounded-full">
										<div
											className="absolute h-full w-1/3 rounded-full"
											style={{
												backgroundColor: activeAccent.hex,
												boxShadow: `0 0 12px ${activeAccent.hex}90`,
												animation: "export-shimmer 1.5s ease-in-out infinite",
											}}
										/>
										<style>{`
											@keyframes export-shimmer {
												0% { transform: translateX(-100%); }
												100% { transform: translateX(350%); }
											}
										`}</style>
									</div>
								) : (
									<div
										className="h-full rounded-full transition-all duration-300 ease-out"
										style={{
											width: `${Math.min(percentage, 100)}%`,
											backgroundColor: activeAccent.hex,
											boxShadow: `0 0 12px ${activeAccent.hex}80`,
										}}
									/>
								)}
							</div>
						</div>

						{/* Stats Info Cards */}
						<div className="grid grid-cols-2 gap-2.5">
							<div
								className={cn(
									"rounded-2xl p-3 border shadow-2xs flex flex-col justify-center",
									isLight ? "bg-slate-50 border-[#e4e4e7]" : "bg-white/[0.03] border-white/[0.06]",
								)}
							>
								<div
									className={cn(
										"text-[10px] uppercase font-bold tracking-wider mb-0.5",
										isLight ? "text-slate-400" : "text-slate-500",
									)}
								>
									{isCompiling || isFinalizing ? t("export.status") : t("export.format")}
								</div>
								<div
									className={cn(
										"font-bold text-xs truncate",
										isLight ? "text-slate-800" : "text-slate-200",
									)}
								>
									{isFinalizing && exportFormat === "mp4"
										? t("export.finalizing")
										: isCompiling || isFinalizing
											? t("export.compilingStatus")
											: `${formatLabel} Video`}
								</div>
							</div>

							<div
								className={cn(
									"rounded-2xl p-3 border shadow-2xs flex flex-col justify-center",
									isLight ? "bg-slate-50 border-[#e4e4e7]" : "bg-white/[0.03] border-white/[0.06]",
								)}
							>
								<div
									className={cn(
										"text-[10px] uppercase font-bold tracking-wider mb-0.5",
										isLight ? "text-slate-400" : "text-slate-500",
									)}
								>
									{t("export.frames")}
								</div>
								<div
									className={cn(
										"font-bold text-xs font-mono truncate",
										isLight ? "text-slate-800" : "text-slate-200",
									)}
								>
									{progress ? `${progress.currentFrame} / ${progress.totalFrames}` : "Preparing..."}
								</div>
							</div>
						</div>

						{/* Cancel Button */}
						{onCancel && (
							<Button
								onClick={onCancel}
								variant="outline"
								className="w-full h-10 rounded-2xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
							>
								{t("export.cancelExport")}
							</Button>
						)}
					</div>
				)}

				{/* Success State */}
				{showSuccess && (
					<div className="space-y-3 animate-in zoom-in-95 pt-1">
						{exportedFilePath && (
							<div
								className={cn(
									"p-3 rounded-2xl border text-xs break-all shadow-2xs flex items-center gap-2",
									isLight
										? "bg-slate-50 border-[#e4e4e7] text-slate-700"
										: "bg-white/[0.03] border-white/[0.06] text-slate-300",
								)}
							>
								<Folder className="w-4 h-4 shrink-0 text-slate-400" />
								<span className="truncate flex-1 font-mono text-[11px]">
									{exportedFilePath.split(/[\\/]/).pop()}
								</span>
							</div>
						)}

						{exportedFilePath && onShowInFolder && (
							<Button
								type="button"
								onClick={onShowInFolder}
								className="w-full h-10 rounded-2xl text-xs font-bold gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
								style={{
									backgroundColor: activeAccent.hex,
									color: activeAccent.textHex,
								}}
							>
								<Folder className="w-4 h-4" />
								{t("export.showInFolder")}
							</Button>
						)}
					</div>
				)}
			</div>
		</>
	);
}
