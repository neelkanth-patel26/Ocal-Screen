import { Download, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScopedT } from "@/contexts/I18nContext";
import type { ExportProgress } from "@/lib/exporter";
import { ACCENT_COLOR_MAP, type AccentColor } from "@/lib/userPreferences";

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
			}, 2000);
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

	return (
		<>
			<div
				className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200"
				onClick={isExporting ? undefined : onClose}
			/>
			<div
				className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] rounded-3xl shadow-2xl border p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200 ${
					isLight
						? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
						: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
				}`}
			>
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						{showSuccess ? (
							<>
								<div
									className="w-12 h-12 rounded-2xl flex items-center justify-center border"
									style={{
										backgroundColor: `${activeAccent.hex}20`,
										borderColor: `${activeAccent.hex}50`,
										color: activeAccent.hex,
									}}
								>
									<Download className="w-6 h-6" style={{ color: activeAccent.hex }} />
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-lg font-extrabold text-[#e8e8e8] block">
										{t("export.complete")}
									</span>
									<span className="text-xs text-[#888888]">
										{t("export.yourFormatReady", { format: formatLabel.toLowerCase() })}
									</span>
									{exportedFilePath && (
										<Button
											variant="secondary"
											onClick={onShowInFolder}
											className="mt-2 w-fit px-3 py-1 text-xs rounded-full bg-[#141414] hover:bg-[#202020] border border-[#252525] text-[#e8e8e8] font-bold"
										>
											{t("export.showInFolder")}
										</Button>
									)}
									{exportedFilePath && (
										<span className="text-xs text-[#666666] break-all max-w-xs mt-1">
											{exportedFilePath.split("/").pop()}
										</span>
									)}
								</div>
							</>
						) : (
							<>
								{isExporting ? (
									<div
										className="w-12 h-12 rounded-2xl flex items-center justify-center border"
										style={{
											backgroundColor: `${activeAccent.hex}20`,
											borderColor: `${activeAccent.hex}40`,
											color: activeAccent.hex,
										}}
									>
										<Loader2 className="w-6 h-6 animate-spin" style={{ color: activeAccent.hex }} />
									</div>
								) : (
									<div className="w-12 h-12 rounded-2xl bg-[#141414] flex items-center justify-center border border-[#252525]">
										<Download className="w-6 h-6 text-[#e8e8e8]" />
									</div>
								)}
								<div>
									<span className="text-lg font-extrabold text-[#e8e8e8] block">{getTitle()}</span>
									<span className="text-xs text-[#888888]">{getStatusMessage()}</span>
								</div>
							</>
						)}
					</div>
					{!isExporting && (
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="hover:bg-[#141414] text-[#888888] hover:text-[#e8e8e8] rounded-full"
						>
							<X className="w-5 h-5" />
						</Button>
					)}
				</div>

				{error && (
					<div className="mb-6 animate-in slide-in-from-top-2">
						<div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
							<div className="p-1 bg-red-500/20 rounded-full">
								<X className="w-3 h-3 text-red-400" />
							</div>
							<p className="whitespace-pre-wrap break-words text-xs text-red-400 leading-relaxed">
								{error}
							</p>
						</div>
					</div>
				)}

				{isExporting && progress && (
					<div className="space-y-6">
						<div className="space-y-2">
							<div className="flex justify-between text-xs font-semibold text-[#888888] uppercase tracking-wider">
								<span>
									{isCompiling || isFinalizing
										? t("export.compiling")
										: t("export.renderingFrames")}
								</span>
								<span className="font-mono text-[#e8e8e8]">
									{isCompiling || isFinalizing ? (
										renderProgress !== undefined && renderProgress > 0 ? (
											`${renderProgress}%`
										) : (
											<span className="flex items-center gap-2">
												<Loader2 className="w-3 h-3 animate-spin" style={{ color: activeAccent.hex }} />
												{t("export.processing")}
											</span>
										)
									) : (
										`${progress.percentage.toFixed(0)}%`
									)}
								</span>
							</div>
							<div className="h-2.5 bg-[#141414] rounded-full overflow-hidden border border-[#252525]">
								{isCompiling || isFinalizing ? (
									// Real progress if we have it, otherwise an indeterminate bar.
									renderProgress !== undefined && renderProgress > 0 ? (
										<div
											className="h-full transition-all duration-300 ease-out"
											style={{
												width: `${renderProgress}%`,
												backgroundColor: activeAccent.hex,
												boxShadow: `0 0 10px ${activeAccent.hex}60`,
											}}
										/>
									) : (
										<div className="h-full w-full relative overflow-hidden">
											<div
												className="absolute h-full w-1/3"
												style={{
													backgroundColor: activeAccent.hex,
													boxShadow: `0 0 10px ${activeAccent.hex}60`,
													animation: "indeterminate 1.5s ease-in-out infinite",
												}}
											/>
											<style>{`
                        @keyframes indeterminate {
                          0% { transform: translateX(-100%); }
                          100% { transform: translateX(400%); }
                        }
                      `}</style>
										</div>
									)
								) : (
									<div
										className="h-full transition-all duration-300 ease-out"
										style={{
											width: `${Math.min(progress.percentage, 100)}%`,
											backgroundColor: activeAccent.hex,
											boxShadow: `0 0 10px ${activeAccent.hex}60`,
										}}
									/>
								)}
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="bg-white/5 rounded-xl p-3 border border-white/5">
								<div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
									{isCompiling || isFinalizing ? t("export.status") : t("export.format")}
								</div>
								<div className="text-slate-200 font-medium text-sm">
									{isFinalizing && exportFormat === "mp4"
										? t("export.finalizing")
										: isCompiling || isFinalizing
											? t("export.compilingStatus")
											: formatLabel}
								</div>
							</div>
							<div className="bg-white/5 rounded-xl p-3 border border-white/5">
								<div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
									{t("export.frames")}
								</div>
								<div className="text-slate-200 font-medium text-sm">
									{progress.currentFrame} / {progress.totalFrames}
								</div>
							</div>
						</div>

						{onCancel && (
							<div className="pt-2">
								<Button
									onClick={onCancel}
									variant="destructive"
									className="w-full py-6 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all rounded-xl"
								>
									{t("export.cancelExport")}
								</Button>
							</div>
						)}
					</div>
				)}

				{showSuccess && (
					<div className="text-center py-4 animate-in zoom-in-95">
						<p className="text-lg text-slate-200 font-medium">
							{t("export.savedSuccessfully", { format: formatLabel })}
						</p>
					</div>
				)}
			</div>
		</>
	);
}
