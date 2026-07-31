import { Building2, ExternalLink, Github, Heart, RefreshCw, Sparkles, User } from "lucide-react";
import { useCallback, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

// Read version from package.json at build time via Vite's define
const APP_VERSION = __APP_VERSION__;
const APP_NAME = "Ocal Screen";
const APP_DESCRIPTION =
	"A beautiful, open-source screen recorder and video editor. Record your screen, add zoom effects, annotations, captions, and export polished videos — all locally, no cloud required.";

const DETAILS = {
	software: "Ocal Software",
	studio: "Gaming Network Studio",
	developer: "Ocal Software",
	github: "neelkanth-patel26",
	repoUrl: "https://github.com/neelkanth-patel26/Ocal-Screen",
};

type UpdateStatus =
	| "idle"
	| "checking"
	| "up-to-date"
	| "update-available"
	| "downloading"
	| "downloaded"
	| "error";

interface UpdateInfo {
	latestVersion?: string;
	releaseUrl?: string;
	downloadUrl?: string;
	fileName?: string;
	downloadProgress?: {
		percent: number;
		downloadedBytes: number;
		totalBytes: number;
	};
	installerPath?: string;
	error?: string;
}

export function AboutDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = prefs.theme === "light";

	const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({});

	const checkForUpdates = useCallback(async () => {
		setUpdateStatus("checking");
		setUpdateInfo({});

		try {
			let response = await fetch(
				"https://api.github.com/repos/neelkanth-patel26/Ocal-Screen/releases/latest",
			);
			let data: any = null;

			if (response.ok) {
				data = await response.json();
			} else {
				// Fallback to all releases list if latest returns 404
				const listResp = await fetch(
					"https://api.github.com/repos/neelkanth-patel26/Ocal-Screen/releases",
				);
				if (!listResp.ok) {
					throw new Error(`GitHub API error: ${listResp.status}`);
				}
				const releases = await listResp.json();
				if (Array.isArray(releases) && releases.length > 0) {
					data = releases[0];
				} else {
					throw new Error("No releases published yet.");
				}
			}

			const latestVersion = (data.tag_name || "").replace(/^v/, "");
			const currentVersion = APP_VERSION.replace(/^v/, "");

			const exeAsset = data.assets?.find((a: any) => a.name?.endsWith(".exe"));
			const downloadUrl = exeAsset?.browser_download_url;
			const fileName = exeAsset?.name || `Ocal-Screen-${latestVersion}-Setup.exe`;

			if (latestVersion && latestVersion !== currentVersion) {
				setUpdateStatus("update-available");
				setUpdateInfo({
					latestVersion,
					releaseUrl: data.html_url || "https://github.com/neelkanth-patel26/Ocal-Screen/releases",
					downloadUrl,
					fileName,
				});
			} else {
				setUpdateStatus("up-to-date");
			}
		} catch (err) {
			setUpdateStatus("error");
			setUpdateInfo({
				error: err instanceof Error ? err.message : "Failed to check for updates",
			});
		}
	}, []);

	const startInAppDownload = useCallback(async () => {
		if (!updateInfo.downloadUrl) {
			if (updateInfo.releaseUrl) {
				window.electronAPI?.openExternalUrl(updateInfo.releaseUrl);
			}
			return;
		}

		setUpdateStatus("downloading");

		const removeListener = window.electronAPI?.onUpdateDownloadProgress?.((prog) => {
			setUpdateInfo((prev) => ({ ...prev, downloadProgress: prog }));
		});

		try {
			const res = await window.electronAPI?.downloadUpdate?.(
				updateInfo.downloadUrl,
				updateInfo.fileName || "Ocal-Screen-Setup.exe",
			);

			if (removeListener) removeListener();

			if (res?.success && res.path) {
				setUpdateStatus("downloaded");
				setUpdateInfo((prev) => ({ ...prev, installerPath: res.path }));
			} else {
				throw new Error(res?.error || "Download failed");
			}
		} catch (err: any) {
			if (removeListener) removeListener();
			setUpdateStatus("error");
			setUpdateInfo((prev) => ({
				...prev,
				error: err?.message || "Failed to download installer",
			}));
		}
	}, [updateInfo.downloadUrl, updateInfo.fileName, updateInfo.releaseUrl]);

	const installUpdateNow = useCallback(async () => {
		if (!updateInfo.installerPath) return;
		await window.electronAPI?.installAndLaunchUpdate?.(updateInfo.installerPath);
	}, [updateInfo.installerPath]);

	const openExternal = (url: string) => {
		window.electronAPI?.openExternalUrl(url);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"max-w-[420px] rounded-2xl border p-0 overflow-hidden shadow-2xl transition-colors",
					isLight
						? "bg-white border-[#e4e4e7] text-[#18181b]"
						: "bg-[#111113] border-white/10 text-slate-200",
				)}
			>
				<DialogHeader className="p-0">
					<DialogTitle className="sr-only">About {APP_NAME}</DialogTitle>
				</DialogHeader>

				{/* Header with app identity */}
				<div className="flex flex-col items-center pt-8 pb-3 px-6 text-center">
					{/* App icon */}
					<div
						className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg relative group"
						style={{
							background: `linear-gradient(135deg, ${activeAccent.hex}25, ${activeAccent.hex}50)`,
							border: `1.5px solid ${activeAccent.hex}40`,
						}}
					>
						<div
							className="w-8 h-8 rounded-xl shadow-md flex items-center justify-center"
							style={{
								background: `linear-gradient(135deg, ${activeAccent.hex}, ${activeAccent.hex}dd)`,
							}}
						>
							<Sparkles className="w-4 h-4 text-white" />
						</div>
					</div>

					<h2
						className={cn(
							"text-xl font-extrabold tracking-tight",
							isLight ? "text-[#18181b]" : "text-white",
						)}
					>
						{APP_NAME}
					</h2>
					<span
						className={cn(
							"text-[11px] font-mono font-semibold mt-1 px-2.5 py-0.5 rounded-full border",
							isLight
								? "text-slate-600 bg-[#f4f4f5] border-[#e4e4e7]"
								: "text-slate-300 bg-white/5 border-white/10",
						)}
					>
						v{APP_VERSION}
					</span>
				</div>

				{/* Description */}
				<div className="px-6 pb-4">
					<p
						className={cn(
							"text-xs leading-relaxed text-center",
							isLight ? "text-slate-500" : "text-slate-400",
						)}
					>
						{APP_DESCRIPTION}
					</p>
				</div>

				{/* Info Card List */}
				<div
					className={cn(
						"mx-6 rounded-xl border divide-y overflow-hidden",
						isLight
							? "border-[#e4e4e7] bg-[#fafafa] divide-[#e4e4e7]"
							: "border-white/10 bg-white/[0.02] divide-white/10",
					)}
				>
					{/* Software & Studio */}
					<div className="flex items-center gap-3 px-4 py-3">
						<Building2
							className="w-4 h-4 shrink-0"
							style={{ color: activeAccent.hex }}
						/>
						<div className="flex-1 min-w-0">
							<span
								className={cn(
									"text-[10px] font-bold uppercase tracking-wider block",
									isLight ? "text-slate-400" : "text-slate-500",
								)}
							>
								Software & Studio
							</span>
							<span
								className={cn(
									"text-xs font-semibold block truncate",
									isLight ? "text-[#18181b]" : "text-slate-200",
								)}
							>
								{DETAILS.software}
							</span>
							<span
								className={cn(
									"text-[11px] font-medium block truncate",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								by {DETAILS.studio}
							</span>
						</div>
					</div>

					{/* Maintainer */}
					<div className="flex items-center gap-3 px-4 py-3">
						<User
							className="w-4 h-4 shrink-0"
							style={{ color: activeAccent.hex }}
						/>
						<div className="flex-1 min-w-0">
							<span
								className={cn(
									"text-[10px] font-bold uppercase tracking-wider block",
									isLight ? "text-slate-400" : "text-slate-500",
								)}
							>
								Maintainer & Developer
							</span>
							<span
								className={cn(
									"text-xs font-semibold block truncate",
									isLight ? "text-[#18181b]" : "text-slate-200",
								)}
							>
								{DETAILS.developer}
							</span>
						</div>
						<button
							type="button"
							onClick={() =>
								openExternal(`https://github.com/${DETAILS.github}`)
							}
							className={cn(
								"text-[10px] font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0 border",
								isLight
									? "text-slate-600 bg-white border-[#e4e4e7] hover:text-slate-900 hover:bg-[#f4f4f5]"
									: "text-slate-300 bg-white/5 border-white/10 hover:text-white hover:bg-white/10",
							)}
						>
							@{DETAILS.github}
						</button>
					</div>

					{/* Source Code */}
					<div className="flex items-center gap-3 px-4 py-3">
						<Github
							className="w-4 h-4 shrink-0"
							style={{ color: activeAccent.hex }}
						/>
						<div className="flex-1 min-w-0">
							<span
								className={cn(
									"text-[10px] font-bold uppercase tracking-wider block",
									isLight ? "text-slate-400" : "text-slate-500",
								)}
							>
								Source Code
							</span>
							<span
								className={cn(
									"text-xs font-semibold block truncate",
									isLight ? "text-[#18181b]" : "text-slate-200",
								)}
							>
								Open Source · MIT License
							</span>
						</div>
						<button
							type="button"
							onClick={() => openExternal(DETAILS.repoUrl)}
							className={cn(
								"flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0 border",
								isLight
									? "text-slate-600 bg-white border-[#e4e4e7] hover:text-slate-900 hover:bg-[#f4f4f5]"
									: "text-slate-300 bg-white/5 border-white/10 hover:text-white hover:bg-white/10",
							)}
						>
							<ExternalLink className="w-3 h-3" />
							View Repo
						</button>
					</div>
				</div>

				{/* Check for updates */}
				<div className="px-6 pt-4 pb-5">
					{updateStatus === "idle" && (
						<Button
							onClick={checkForUpdates}
							variant="outline"
							className={cn(
								"w-full h-9 rounded-xl text-xs font-semibold gap-2 cursor-pointer transition-all border",
								isLight
									? "bg-[#f4f4f5] border-[#e4e4e7] text-slate-700 hover:bg-[#e4e4e7]"
									: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
							)}
						>
							<RefreshCw className="w-3.5 h-3.5" />
							Check for Updates
						</Button>
					)}

					{updateStatus === "checking" && (
						<div className="flex items-center justify-center gap-2 py-2">
							<RefreshCw
								className="w-3.5 h-3.5 animate-spin"
								style={{ color: activeAccent.hex }}
							/>
							<span
								className={cn(
									"text-xs font-medium",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								Checking for updates…
							</span>
						</div>
					)}

					{updateStatus === "up-to-date" && (
						<div
							className={cn(
								"flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-medium",
								isLight
									? "bg-emerald-50 text-emerald-700 border border-emerald-200"
									: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
							)}
						>
							<span>✓</span>
							<span>You're on the latest version</span>
						</div>
					)}

					{updateStatus === "update-available" && (
						<div className="space-y-2">
							<div
								className={cn(
									"flex items-center justify-between py-2 px-4 rounded-xl text-xs font-medium",
									isLight
										? "bg-amber-50 text-amber-700 border border-amber-200"
										: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
								)}
							>
								<span>v{updateInfo.latestVersion} is available</span>
							</div>
							<Button
								onClick={startInAppDownload}
								className="w-full h-9 rounded-xl text-xs font-semibold gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
								style={{
									backgroundColor: activeAccent.hex,
									color: activeAccent.textHex,
								}}
							>
								<Sparkles className="w-3.5 h-3.5" />
								Download & Install Update
							</Button>
							{updateInfo.releaseUrl && (
								<button
									type="button"
									onClick={() => openExternal(updateInfo.releaseUrl!)}
									className={cn(
										"w-full text-center text-[11px] underline hover:no-underline cursor-pointer pt-1",
										isLight ? "text-slate-500" : "text-slate-400",
									)}
								>
									View Release Notes on GitHub
								</button>
							)}
						</div>
					)}

					{updateStatus === "downloading" && (
						<div className="space-y-2">
							<div
								className={cn(
									"p-3 rounded-xl border text-left text-xs space-y-2",
									isLight
										? "bg-slate-50 border-slate-200 text-slate-700"
										: "bg-white/5 border-white/10 text-slate-300",
								)}
							>
								<div className="flex items-center justify-between font-medium">
									<span>Downloading v{updateInfo.latestVersion}…</span>
									<span>{updateInfo.downloadProgress?.percent || 0}%</span>
								</div>
								<div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden relative">
									<div
										className="h-full rounded-full transition-all duration-300"
										style={{
											width: `${updateInfo.downloadProgress?.percent || 0}%`,
											backgroundColor: activeAccent.hex,
										}}
									/>
								</div>
								<div className="flex items-center justify-between text-[11px] opacity-75">
									<span>
										{updateInfo.downloadProgress?.downloadedBytes
											? `${(updateInfo.downloadProgress.downloadedBytes / 1048576).toFixed(1)} MB`
											: "0 MB"}{" "}
										/{" "}
										{updateInfo.downloadProgress?.totalBytes
											? `${(updateInfo.downloadProgress.totalBytes / 1048576).toFixed(1)} MB`
											: "..."}
									</span>
									<span className="animate-pulse">Downloading in background…</span>
								</div>
							</div>
						</div>
					)}

					{updateStatus === "downloaded" && (
						<div className="space-y-2">
							<div
								className={cn(
									"flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-medium",
									isLight
										? "bg-emerald-50 text-emerald-700 border border-emerald-200"
										: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
								)}
							>
								<span>✓</span>
								<span>Installer downloaded & ready!</span>
							</div>
							<Button
								onClick={installUpdateNow}
								className="w-full h-10 rounded-xl text-xs font-semibold gap-2 cursor-pointer shadow-lg animate-bounce"
								style={{
									backgroundColor: activeAccent.hex,
									color: activeAccent.textHex,
								}}
							>
								<Sparkles className="w-4 h-4" />
								Relaunch & Install Now
							</Button>
							<p
								className={cn(
									"text-[11px] text-center opacity-75",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								Ocal Screen will close and launch the setup wizard automatically.
							</p>
						</div>
					)}

					{updateStatus === "error" && (
						<div className="space-y-2">
							<div
								className={cn(
									"py-2 px-4 rounded-xl text-xs font-medium",
									isLight
										? "bg-red-50 text-red-600 border border-red-200"
										: "bg-red-500/10 text-red-400 border border-red-500/20",
								)}
							>
								{updateInfo.error || "Failed to check for updates"}
							</div>
							<Button
								onClick={checkForUpdates}
								variant="outline"
								className={cn(
									"w-full h-9 rounded-xl text-xs font-semibold gap-2 cursor-pointer border",
									isLight
										? "border-[#e4e4e7] text-slate-600 hover:bg-[#f4f4f5]"
										: "border-white/10 text-slate-300 hover:bg-white/10",
								)}
							>
								<RefreshCw className="w-3.5 h-3.5" />
								Try Again
							</Button>
						</div>
					)}
				</div>

				{/* Footer */}
				<div
					className={cn(
						"flex items-center justify-center gap-1 py-3 text-[11px] border-t font-medium",
						isLight
							? "text-slate-500 border-[#e4e4e7] bg-[#fafafa]"
							: "text-slate-400 border-white/5 bg-white/[0.01]",
					)}
				>
					Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline mx-0.5" /> by {DETAILS.studio}
				</div>
			</DialogContent>
		</Dialog>
	);
}
