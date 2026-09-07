import {
	Building2,
	CheckCircle2,
	ExternalLink,
	Github,
	Heart,
	RefreshCw,
	Sparkles,
	User,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface GitHubReleaseAsset {
	name?: string;
	browser_download_url?: string;
}

interface GitHubRelease {
	tag_name?: string;
	html_url?: string;
	assets?: GitHubReleaseAsset[];
}

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

/**
 * Returns true if remoteVersion is strictly newer/higher than currentVersion
 */
function isNewerVersion(remote: string, current: string): boolean {
	const rParts = remote
		.replace(/^v/i, "")
		.split(".")
		.map((p) => parseInt(p, 10) || 0);
	const cParts = current
		.replace(/^v/i, "")
		.split(".")
		.map((p) => parseInt(p, 10) || 0);

	for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
		const r = rParts[i] ?? 0;
		const c = cParts[i] ?? 0;
		if (r > c) return true;
		if (r < c) return false;
	}
	return false;
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
			const response = await fetch(
				"https://api.github.com/repos/neelkanth-patel26/Ocal-Screen/releases/latest",
			);
			let data: GitHubRelease | null = null;

			if (response.ok) {
				data = (await response.json()) as GitHubRelease;
			} else {
				// Fallback to all releases list if latest returns 404
				const listResp = await fetch(
					"https://api.github.com/repos/neelkanth-patel26/Ocal-Screen/releases",
				);
				if (!listResp.ok) {
					throw new Error(`GitHub API error: ${listResp.status}`);
				}
				const releases = (await listResp.json()) as GitHubRelease[];
				if (Array.isArray(releases) && releases.length > 0) {
					data = releases[0];
				} else {
					throw new Error("No releases published yet.");
				}
			}

			const latestVersion = (data?.tag_name || "").replace(/^v/i, "");
			const currentVersion = APP_VERSION.replace(/^v/i, "");

			const exeAsset = data?.assets?.find((a) => a.name?.endsWith(".exe"));
			const downloadUrl = exeAsset?.browser_download_url;
			const fileName = exeAsset?.name || `Ocal-Screen-${latestVersion}-Setup.exe`;

			// Only show update-available if the remote version is strictly newer than our current version
			if (latestVersion && isNewerVersion(latestVersion, currentVersion)) {
				setUpdateStatus("update-available");
				setUpdateInfo({
					latestVersion,
					releaseUrl: data?.html_url || "https://github.com/neelkanth-patel26/Ocal-Screen/releases",
					downloadUrl,
					fileName,
				});
			} else {
				setUpdateStatus("up-to-date");
				setUpdateInfo({
					latestVersion: currentVersion,
				});
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
		} catch (err) {
			if (removeListener) removeListener();
			setUpdateStatus("error");
			setUpdateInfo((prev) => ({
				...prev,
				error: err instanceof Error ? err.message : "Failed to download installer",
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
					"max-w-[420px] max-h-[88vh] flex flex-col rounded-[26px] border p-0 overflow-hidden backdrop-blur-3xl transition-all duration-300 gap-0",
					"[&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5 [&>button:last-child]:w-7.5 [&>button:last-child]:h-7.5 [&>button:last-child]:rounded-full [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:border [&>button:last-child]:transition-all [&>button:last-child]:cursor-pointer [&>button:last-child]:opacity-100 [&>button:last-child]:z-30",
					isLight
						? "bg-white/95 border-zinc-200/80 text-zinc-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.9)] [&>button:last-child]:bg-zinc-100 [&>button:last-child]:hover:bg-zinc-200 [&>button:last-child]:border-zinc-200/80 [&>button:last-child]:text-zinc-500 [&>button:last-child]:hover:text-zinc-900"
						: "bg-[#0c0d12]/95 border-white/[0.1] text-zinc-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] [&>button:last-child]:bg-white/[0.06] [&>button:last-child]:hover:bg-white/[0.14] [&>button:last-child]:border-white/10 [&>button:last-child]:text-zinc-400 [&>button:last-child]:hover:text-white",
				)}
			>
				<DialogHeader className="p-0">
					<DialogTitle className="sr-only">About {APP_NAME}</DialogTitle>
				</DialogHeader>

				{/* Top ambient radial glow matching active accent */}
				<div
					className="absolute -top-16 left-1/2 -translate-x-1/2 w-60 h-32 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500"
					style={{ backgroundColor: activeAccent.hex }}
				/>

				{/* Scrollable Dialog Body */}
				<div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
					{/* Header with 3D Glassmorphic Brand Identity */}
					<div className="flex flex-col items-center pt-6 pb-2 px-6 text-center">
						{/* App Icon / 3D Glass Squircle */}
						<div
							className="w-13 h-13 rounded-[18px] p-[1px] mb-2.5 relative shadow-xl group cursor-default transition-transform duration-300 hover:scale-105"
							style={{
								background: `linear-gradient(135deg, ${activeAccent.hex}70, ${activeAccent.hex}20, rgba(255,255,255,0.12))`,
							}}
						>
							<div
								className={cn(
									"w-full h-full rounded-[17px] flex items-center justify-center relative overflow-hidden backdrop-blur-md transition-colors",
									isLight
										? "bg-gradient-to-b from-white/95 to-zinc-50/90 shadow-inner"
										: "bg-gradient-to-b from-zinc-800/90 to-zinc-950/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]",
								)}
							>
								<div
									className="w-7 h-7 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-6"
									style={{
										backgroundColor: activeAccent.hex,
										color: activeAccent.textHex,
										boxShadow: `0 3px 12px ${activeAccent.hex}50`,
									}}
								>
									<Sparkles className="w-4 h-4 drop-shadow-xs" />
								</div>
							</div>
						</div>

						<h2
							className={cn(
								"text-xl font-black tracking-tight",
								isLight
									? "text-zinc-900"
									: "bg-gradient-to-b from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent",
							)}
						>
							{APP_NAME}
						</h2>
						<div className="mt-1 flex items-center gap-1.5">
							<span
								className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-xs inline-flex items-center gap-1.5"
								style={{
									backgroundColor: `${activeAccent.hex}16`,
									borderColor: `${activeAccent.hex}35`,
									color: activeAccent.hex,
								}}
							>
								<span
									className="w-1.5 h-1.5 rounded-full animate-pulse"
									style={{ backgroundColor: activeAccent.hex }}
								/>
								v{APP_VERSION}
							</span>
						</div>
					</div>

					{/* Description */}
					<div className="px-5 pb-3">
						<p
							className={cn(
								"text-[11px] leading-relaxed text-center font-normal",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							{APP_DESCRIPTION}
						</p>
					</div>

					{/* Info Card List */}
					<div
						className={cn(
							"mx-5 rounded-2xl border divide-y overflow-hidden shadow-xs backdrop-blur-sm transition-colors",
							isLight
								? "border-zinc-200/90 bg-zinc-50/70 divide-zinc-200/70"
								: "border-white/[0.08] bg-white/[0.025] divide-white/[0.06]",
						)}
					>
						{/* Software & Studio */}
						<div
							className={cn(
								"flex items-center gap-3 px-3.5 py-2.5 transition-colors group/row",
								isLight ? "hover:bg-zinc-100/50" : "hover:bg-white/[0.02]",
							)}
						>
							<div
								className={cn(
									"w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
									isLight
										? "bg-white border-zinc-200/80 text-zinc-700 shadow-xs"
										: "bg-white/[0.04] border-white/[0.08] text-white shadow-xs",
								)}
							>
								<Building2 className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
							</div>
							<div className="flex-1 min-w-0">
								<span
									className={cn(
										"text-[9px] font-bold uppercase tracking-wider block mb-0.5",
										isLight ? "text-zinc-400" : "text-zinc-500",
									)}
								>
									Software & Studio
								</span>
								<span
									className={cn(
										"text-xs font-semibold block truncate leading-tight",
										isLight ? "text-zinc-900" : "text-zinc-100",
									)}
								>
									{DETAILS.software}
								</span>
								<span
									className={cn(
										"text-[10px] font-medium block truncate leading-tight mt-0.5",
										isLight ? "text-zinc-500" : "text-zinc-400",
									)}
								>
									by {DETAILS.studio}
								</span>
							</div>
						</div>

						{/* Maintainer */}
						<div
							className={cn(
								"flex items-center gap-3 px-3.5 py-2.5 transition-colors group/row",
								isLight ? "hover:bg-zinc-100/50" : "hover:bg-white/[0.02]",
							)}
						>
							<div
								className={cn(
									"w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
									isLight
										? "bg-white border-zinc-200/80 text-zinc-700 shadow-xs"
										: "bg-white/[0.04] border-white/[0.08] text-white shadow-xs",
								)}
							>
								<User className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
							</div>
							<div className="flex-1 min-w-0">
								<span
									className={cn(
										"text-[9px] font-bold uppercase tracking-wider block mb-0.5",
										isLight ? "text-zinc-400" : "text-zinc-500",
									)}
								>
									Maintainer & Developer
								</span>
								<span
									className={cn(
										"text-xs font-semibold block truncate leading-tight",
										isLight ? "text-zinc-900" : "text-zinc-100",
									)}
								>
									{DETAILS.developer}
								</span>
							</div>
							<button
								type="button"
								onClick={() => openExternal(`https://github.com/${DETAILS.github}`)}
								className={cn(
									"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 shadow-xs active:scale-95",
									isLight
										? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900"
										: "bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-zinc-300 hover:text-white",
								)}
							>
								@{DETAILS.github}
							</button>
						</div>

						{/* Source Code */}
						<div
							className={cn(
								"flex items-center gap-3 px-3.5 py-2.5 transition-colors group/row",
								isLight ? "hover:bg-zinc-100/50" : "hover:bg-white/[0.02]",
							)}
						>
							<div
								className={cn(
									"w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
									isLight
										? "bg-white border-zinc-200/80 text-zinc-700 shadow-xs"
										: "bg-white/[0.04] border-white/[0.08] text-white shadow-xs",
								)}
							>
								<Github className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
							</div>
							<div className="flex-1 min-w-0">
								<span
									className={cn(
										"text-[9px] font-bold uppercase tracking-wider block mb-0.5",
										isLight ? "text-zinc-400" : "text-zinc-500",
									)}
								>
									Source Code
								</span>
								<span
									className={cn(
										"text-xs font-semibold block truncate leading-tight",
										isLight ? "text-zinc-900" : "text-zinc-100",
									)}
								>
									Open Source · MIT License
								</span>
							</div>
							<button
								type="button"
								onClick={() => openExternal(DETAILS.repoUrl)}
								className={cn(
									"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 shadow-xs active:scale-95",
									isLight
										? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900"
										: "bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-zinc-300 hover:text-white",
								)}
							>
								<ExternalLink className="w-3 h-3" />
								<span>View Repo</span>
							</button>
						</div>
					</div>

					{/* Check for updates */}
					<div className="px-5 pt-3 pb-3.5">
						{updateStatus === "idle" && (
							<Button
								onClick={checkForUpdates}
								variant="outline"
								className={cn(
									"w-full h-10 rounded-xl text-xs font-bold gap-2 cursor-pointer transition-all border shadow-sm hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center group",
									isLight
										? "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800 shadow-zinc-200/50"
										: "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/20 text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
								)}
							>
								<RefreshCw
									className="w-3.5 h-3.5 transition-transform duration-500 group-hover:rotate-180"
									style={{ color: activeAccent.hex }}
								/>
								Check for Updates
							</Button>
						)}

						{updateStatus === "checking" && (
							<div
								className={cn(
									"flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border backdrop-blur-sm shadow-xs",
									isLight
										? "bg-zinc-50/80 border-zinc-200 text-zinc-700"
										: "bg-white/[0.03] border-white/[0.08] text-zinc-300",
								)}
							>
								<RefreshCw className="w-4 h-4 animate-spin" style={{ color: activeAccent.hex }} />
								<span className="text-xs font-semibold">Checking for updates…</span>
							</div>
						)}

						{updateStatus === "up-to-date" && (
							<div
								className={cn(
									"flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border shadow-xs transition-all",
									isLight
										? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
										: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-emerald-950/20",
								)}
							>
								<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
								<span>You're on the latest version (v{APP_VERSION})</span>
							</div>
						)}

						{updateStatus === "update-available" && (
							<div className="space-y-2.5">
								<div
									className={cn(
										"flex items-center justify-between py-2 px-3.5 rounded-xl text-xs font-bold border shadow-xs",
										isLight
											? "bg-amber-50 text-amber-800 border-amber-200"
											: "bg-amber-500/10 text-amber-300 border-amber-500/25",
									)}
								>
									<div className="flex items-center gap-2">
										<Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
										<span>v{updateInfo.latestVersion} is available!</span>
									</div>
								</div>
								<Button
									onClick={startInAppDownload}
									className="w-full h-10 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-lg transition-all active:scale-[0.98] border-0"
									style={{
										backgroundColor: activeAccent.hex,
										color: activeAccent.textHex,
										boxShadow: `0 6px 18px ${activeAccent.hex}35`,
									}}
								>
									<Sparkles className="w-4 h-4" />
									Download & Install Update
								</Button>
								{updateInfo.releaseUrl && (
									<button
										type="button"
										onClick={() => openExternal(updateInfo.releaseUrl!)}
										className={cn(
											"w-full text-center text-[11px] font-semibold underline hover:no-underline cursor-pointer pt-0.5",
											isLight
												? "text-zinc-500 hover:text-zinc-800"
												: "text-zinc-400 hover:text-white",
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
										"p-3 rounded-xl border text-left text-xs space-y-2 shadow-xs",
										isLight
											? "bg-zinc-50 border-zinc-200 text-zinc-700"
											: "bg-white/[0.03] border-white/[0.08] text-zinc-300",
									)}
								>
									<div className="flex items-center justify-between font-semibold">
										<span>Downloading v{updateInfo.latestVersion}…</span>
										<span className="font-mono text-[11px]">
											{updateInfo.downloadProgress?.percent || 0}%
										</span>
									</div>
									<div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden relative">
										<div
											className="h-full rounded-full transition-all duration-300"
											style={{
												width: `${updateInfo.downloadProgress?.percent || 0}%`,
												backgroundColor: activeAccent.hex,
											}}
										/>
									</div>
									<div className="flex items-center justify-between text-[11px] opacity-75">
										<span className="font-mono">
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
										"flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold border",
										isLight
											? "bg-emerald-50 text-emerald-700 border-emerald-200"
											: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
									)}
								>
									<CheckCircle2 className="w-4 h-4 text-emerald-400" />
									<span>Installer downloaded & ready!</span>
								</div>
								<Button
									onClick={installUpdateNow}
									className="w-full h-10 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-lg animate-bounce border-0"
									style={{
										backgroundColor: activeAccent.hex,
										color: activeAccent.textHex,
										boxShadow: `0 6px 18px ${activeAccent.hex}35`,
									}}
								>
									<Sparkles className="w-4 h-4" />
									Relaunch & Install Now
								</Button>
								<p
									className={cn(
										"text-[10px] text-center opacity-75 font-medium",
										isLight ? "text-zinc-500" : "text-zinc-400",
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
										"py-2 px-3.5 rounded-xl text-xs font-semibold border",
										isLight
											? "bg-rose-50 text-rose-600 border-rose-200"
											: "bg-rose-500/10 text-rose-400 border-rose-500/20",
									)}
								>
									{updateInfo.error || "Failed to check for updates"}
								</div>
								<Button
									onClick={checkForUpdates}
									variant="outline"
									className={cn(
										"w-full h-9 rounded-xl text-xs font-bold gap-2 cursor-pointer border",
										isLight
											? "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
											: "border-white/10 text-zinc-300 hover:bg-white/10",
									)}
								>
									<RefreshCw className="w-3.5 h-3.5" />
									Try Again
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div
					className={cn(
						"flex items-center justify-center gap-1.5 py-2.5 text-[11px] border-t font-medium transition-colors shrink-0 relative z-10",
						isLight
							? "text-zinc-500 border-zinc-200/80 bg-zinc-50/50"
							: "text-zinc-400 border-white/[0.06] bg-white/[0.015]",
					)}
				>
					<span>Made with</span>
					<Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline transition-transform hover:scale-125 duration-200 cursor-pointer" />
					<span>by</span>
					<span className={cn("font-semibold", isLight ? "text-zinc-700" : "text-zinc-300")}>
						{DETAILS.studio}
					</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}
