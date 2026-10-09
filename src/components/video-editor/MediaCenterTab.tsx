import { FolderOpen, Layers, Music, Plus, Search, Trash2, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { parseMediaDate } from "@/lib/mediaDateFormatter";
import { cn } from "@/lib/utils";
import { WALLPAPER_PATHS } from "@/lib/wallpaper";
import type { EffectPreset, WallpaperPreset } from "./FilmoraMediaLibrary";
import {
	getStoredMediaAssets,
	type MediaAsset,
	removeMediaAsset,
	saveMediaAsset,
} from "./mediaAssetStore";
import { toFileUrl } from "./projectPersistence";

export interface MediaCenterTabProps {
	videoPath?: string | null;
	videoDuration?: number;
	currentTime?: number;
	projectAssets?: MediaAsset[];
	onImportMedia?: () => void;
	onImportAsset?: (asset: MediaAsset) => void;
	onDeleteAsset?: (id: string) => void;
	onSelectAudioPreset?: (preset: any) => void;
	onSelectTitlePreset?: (preset: any) => void;
	onSelectEffectPreset?: (preset: EffectPreset) => void;
	onApplyWallpaper?: (wp: WallpaperPreset) => void;
	onAddVideoLayer?: (customLayer?: Partial<import("./types").VideoLayerTrack>) => void;
	isLight: boolean;
	activeAccent: { hex: string; textHex: string };
}

type MediaSubFilter = "all" | "video" | "audio" | "stock";

function formatTimeSec(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function MediaCenterTab({
	videoPath,
	videoDuration = 0,
	currentTime = 0,
	projectAssets,
	onImportMedia,
	onImportAsset,
	onDeleteAsset,
	onSelectAudioPreset,
	onApplyWallpaper,
	onAddVideoLayer,
	isLight,
	activeAccent,
}: MediaCenterTabProps) {
	const [activeSubFilter, setActiveSubFilter] = useState<MediaSubFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [storedAssets, setStoredAssets] = useState<MediaAsset[]>(() => getStoredMediaAssets());

	const effectiveAssets = useMemo(() => {
		if (projectAssets !== undefined) {
			return projectAssets;
		}
		return storedAssets;
	}, [projectAssets, storedAssets]);

	const handleAddAssetToTimeline = async (asset: MediaAsset) => {
		const rawPath = asset.url || asset.path;
		const url =
			rawPath &&
			!rawPath.startsWith("blob:") &&
			!rawPath.startsWith("http:") &&
			!rawPath.startsWith("data:")
				? toFileUrl(rawPath)
				: rawPath;

		if (asset.isAudioTrack || asset.type === "audio") {
			onSelectAudioPreset?.({
				id: asset.id,
				name: asset.name,
				title: asset.name,
				duration: asset.duration ? formatTimeSec(asset.duration) : "03:00",
				durationSec: asset.duration || 180,
				genre: "Audio Track",
				color: "#10b981",
				url,
			});
			toast.success(`Assigned "${asset.name}" to Audio Track 1`);
		} else {
			const startMs = Math.round(currentTime * 1000);
			const clipDurMs = asset.duration ? Math.round(asset.duration * 1000) : 6000;
			onAddVideoLayer?.({
				name: asset.name,
				src: url,
				type: asset.type === "image" ? "overlay-video" : "pip",
				startMs,
				endMs: startMs + clipDurMs,
				width: 35,
				height: 35,
				x: 15,
				y: 15,
			});
			toast.success(`Added "${asset.name}" to Timeline as Video Track`);
		}
	};

	const handleImportFile = async () => {
		if (onImportMedia) {
			onImportMedia();
			return;
		}
		try {
			const electron = window.electronAPI as
				| {
						openFileDialog?: () => Promise<string | null>;
						openVideoFilePicker?: () => Promise<any>;
				  }
				| undefined;
			let filePath: string | null = null;
			if (electron?.openVideoFilePicker) {
				const res = await electron.openVideoFilePicker();
				if (!res.canceled && res.success && res.path) {
					filePath = res.path;
				}
			} else if (electron?.openFileDialog) {
				filePath = await electron.openFileDialog();
			}

			if (filePath) {
				const ext = filePath.split(".").pop()?.toLowerCase() || "";
				const isAudio = ["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(ext);
				const isImg = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
				const type: "video" | "audio" | "image" = isAudio ? "audio" : isImg ? "image" : "video";
				const name = filePath.split(/[/\\]/).pop() || "imported_media";

				const newAsset: MediaAsset = {
					id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					name,
					path: filePath,
					url: toFileUrl(filePath),
					type,
					addedAt: Date.now(),
					isProjectAsset: true,
					sourceType: "imported",
				};

				if (onImportAsset) {
					onImportAsset(newAsset);
				} else {
					const updated = saveMediaAsset(newAsset);
					setStoredAssets(updated);
				}
				toast.success(`Imported: ${name}`);
			}
		} catch {
			toast.error("Could not import file");
		}
	};

	const handleDeleteStoredAsset = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		const target = effectiveAssets.find((a) => a.id === id);
		if (target?.isMainVideo) {
			toast.error("Cannot delete active main screen recording");
			return;
		}
		if (onDeleteAsset) {
			onDeleteAsset(id);
		} else {
			const updated = removeMediaAsset(id);
			setStoredAssets(updated);
		}
		toast.info("Removed media asset");
	};

	const videoFileName = useMemo(() => {
		if (!videoPath) return "desktop";
		const base = videoPath.split(/[/\\]/).pop() || "desktop";
		return base.replace(/\.[^/.]+$/, "");
	}, [videoPath]);

	const mainDateInfo = useMemo(() => {
		return parseMediaDate(videoPath || "desktop", undefined);
	}, [videoPath]);

	const formattedDuration = useMemo(() => formatTimeSec(videoDuration), [videoDuration]);

	const filteredAssets = useMemo(() => {
		return effectiveAssets.filter((asset) => {
			if (activeSubFilter === "video" && asset.type !== "video") return false;
			if (activeSubFilter === "audio" && asset.type !== "audio" && !asset.isAudioTrack)
				return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				asset.name.toLowerCase().includes(q) || (asset.path && asset.path.toLowerCase().includes(q))
			);
		});
	}, [effectiveAssets, activeSubFilter, searchQuery]);

	return (
		<div className="space-y-4">
			{/* Sub-Filter Segmented Pills */}
			<div
				className={cn(
					"flex items-center gap-1 p-1 rounded-2xl border shadow-2xs",
					isLight ? "bg-slate-100/90 border-[#e4e4e7]" : "bg-white/[0.04] border-white/[0.06]",
				)}
			>
				{[
					{ id: "all", label: "All Clips" },
					{ id: "video", label: "Videos" },
					{ id: "audio", label: "Audio" },
					{ id: "stock", label: "Themes" },
				].map((tab) => {
					const isActive = activeSubFilter === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveSubFilter(tab.id as MediaSubFilter)}
							style={
								isActive
									? {
											backgroundColor: activeAccent.hex,
											borderColor: activeAccent.hex,
											color: activeAccent.textHex,
											boxShadow: `0 2px 8px ${activeAccent.hex}40`,
										}
									: undefined
							}
							className={cn(
								"flex-1 py-1 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer",
								isActive
									? "shadow-sm border-transparent"
									: isLight
										? "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200"
										: "border-transparent text-slate-400 hover:text-white hover:bg-zinc-800",
							)}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Search Box */}
			<div className="relative">
				<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search project media clips..."
					className={cn(
						"w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border transition-all outline-none",
						isLight
							? "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
							: "bg-white/[0.03] border-white/10 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20",
					)}
				/>
			</div>

			{/* 1. Project Media Section */}
			{activeSubFilter !== "stock" && (
				<div className="space-y-2.5">
					<div className="flex items-center justify-between">
						<span
							className={cn(
								"text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5",
								isLight ? "text-slate-600" : "text-slate-400",
							)}
						>
							<FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
							<span>Media Bin & Project Clips</span>
						</span>
						<span className="text-[10px] text-slate-400 font-semibold font-mono">
							{filteredAssets.length} Items
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2.5">
						{/* Import Box */}
						<div
							onClick={handleImportFile}
							className={cn(
								"h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center p-2 relative overflow-hidden",
								isLight
									? "border-slate-300 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-400"
									: "border-white/15 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-400",
							)}
						>
							<div
								className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 shadow-sm"
								style={{ backgroundColor: `${activeAccent.hex}20`, color: activeAccent.hex }}
							>
								<Plus className="w-4 h-4 stroke-[2.5]" />
							</div>
							<span
								className={cn(
									"text-xs font-bold transition-colors",
									isLight
										? "text-slate-700 group-hover:text-indigo-600"
										: "text-slate-200 group-hover:text-white",
								)}
							>
								Import Media
							</span>
							<span className="text-[9px] text-slate-400">Video, Audio, Images</span>
						</div>

						{/* Assets List */}
						{filteredAssets.length > 0 ? (
							filteredAssets.map((asset) => {
								const assetDateInfo = parseMediaDate(asset.name, asset.addedAt);
								return (
									<div
										key={asset.id}
										draggable={true}
										onDragStart={(e) => {
											const rawPath = asset.url || asset.path;
											const url =
												rawPath &&
												!rawPath.startsWith("blob:") &&
												!rawPath.startsWith("http:") &&
												!rawPath.startsWith("data:")
													? toFileUrl(rawPath)
													: rawPath;
											e.dataTransfer.setData(
												"application/ocal-media",
												JSON.stringify({
													type: asset.type,
													id: asset.id,
													name: asset.name,
													url,
													duration: asset.duration,
												}),
											);
											e.dataTransfer.effectAllowed = "copy";
										}}
										onClick={() => handleAddAssetToTimeline(asset)}
										className={cn(
											"h-24 rounded-2xl border p-2.5 flex flex-col justify-between relative group cursor-pointer transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99]",
											isLight
												? "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md"
												: "bg-white/[0.04] border-white/10 hover:border-emerald-400 hover:bg-white/[0.07]",
										)}
										title={`Click or drag to add "${asset.name}" to Timeline`}
									>
										<div className="flex items-center justify-between">
											<div
												className="w-6 h-6 rounded-lg flex items-center justify-center border"
												style={{
													backgroundColor: asset.isMainVideo
														? "rgba(16,185,129,0.15)"
														: asset.isWebcam
															? "rgba(168,85,247,0.15)"
															: asset.isAudioTrack || asset.type === "audio"
																? "rgba(245,158,11,0.15)"
																: `${activeAccent.hex}18`,
													borderColor: asset.isMainVideo
														? "rgba(16,185,129,0.3)"
														: asset.isWebcam
															? "rgba(168,85,247,0.3)"
															: asset.isAudioTrack || asset.type === "audio"
																? "rgba(245,158,11,0.3)"
																: `${activeAccent.hex}30`,
													color: asset.isMainVideo
														? "#10b981"
														: asset.isWebcam
															? "#c084fc"
															: asset.isAudioTrack || asset.type === "audio"
																? "#f59e0b"
																: activeAccent.hex,
												}}
											>
												{asset.isAudioTrack || asset.type === "audio" ? (
													<Music className="w-3.5 h-3.5" />
												) : asset.isWebcam ? (
													<Video className="w-3.5 h-3.5" />
												) : asset.type === "image" ? (
													<Layers className="w-3.5 h-3.5" />
												) : (
													<Video className="w-3.5 h-3.5" />
												)}
											</div>
											<div className="flex items-center gap-1.5">
												{asset.isMainVideo ? (
													<>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																if (!videoPath) return;
																const startMs = Math.round(currentTime * 1000);
																const clipDurMs = videoDuration
																	? Math.round(videoDuration * 1000)
																	: 10000;
																onAddVideoLayer?.({
																	name: `${mainDateInfo.cleanName} (PiP)`,
																	src: videoPath,
																	type: "pip",
																	startMs,
																	endMs: startMs + clipDurMs,
																	width: 35,
																	height: 35,
																	x: 10,
																	y: 10,
																});
																toast.success("Added recording as Picture-in-Picture layer");
															}}
															className="h-5 px-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/40 text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
															title="Add as secondary video layer on timeline"
														>
															<Plus className="w-2.5 h-2.5" />
															<span>Layer</span>
														</button>
														<span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
															Active
														</span>
													</>
												) : asset.isWebcam ? (
													<>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																handleAddAssetToTimeline(asset);
															}}
															className="h-5 px-1.5 rounded-md bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/40 text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer opacity-90 group-hover:opacity-100"
															title="Add Face Cam PiP to Timeline"
														>
															<Plus className="w-2.5 h-2.5" />
															<span>PiP</span>
														</button>
														<span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
															Face Cam
														</span>
													</>
												) : asset.isAudioTrack ? (
													<>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																handleAddAssetToTimeline(asset);
															}}
															className="h-6 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer"
															title="Assign to Audio Track 1"
														>
															<Plus className="w-3 h-3 stroke-[3]" />
															<span>Assign</span>
														</button>
														<span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30">
															Audio 1
														</span>
													</>
												) : (
													<>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																handleAddAssetToTimeline(asset);
															}}
															className="h-6 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer"
															title="Add to Timeline at playhead"
														>
															<Plus className="w-3 h-3 stroke-[3]" />
															<span>Add</span>
														</button>
														<button
															type="button"
															onClick={(e) => handleDeleteStoredAsset(asset.id, e)}
															className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer rounded hover:bg-rose-500/10"
															title="Delete Asset"
														>
															<Trash2 className="w-3.5 h-3.5" />
														</button>
													</>
												)}
											</div>
										</div>
										<div>
											<div
												className={cn(
													"text-xs font-bold truncate",
													isLight ? "text-slate-800" : "text-white",
												)}
												title={asset.name}
											>
												{assetDateInfo.cleanName}
											</div>
											<div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
												<span className="capitalize">
													{asset.isMainVideo
														? "Screen Recording"
														: asset.isWebcam
															? "Face Cam"
															: asset.isAudioTrack
																? "Voice Over"
																: asset.type}
												</span>
												{assetDateInfo.fullDateTime && (
													<span
														className="font-mono text-[9px] text-slate-400 truncate max-w-[100px]"
														title={assetDateInfo.fullDateTime}
													>
														{assetDateInfo.fullDateTime}
													</span>
												)}
											</div>
										</div>
									</div>
								);
							})
						) : (
							/* Fallback Primary Recording Video Card */
							<div
								draggable={true}
								onDragStart={(e) => {
									if (!videoPath) return;
									e.dataTransfer.setData(
										"application/ocal-media",
										JSON.stringify({
											type: "video",
											id: "primary-recording",
											name: mainDateInfo.cleanName,
											url: videoPath,
											duration: videoDuration,
										}),
									);
									e.dataTransfer.effectAllowed = "copy";
								}}
								className={cn(
									"h-24 rounded-2xl border p-2.5 flex flex-col justify-between relative group cursor-pointer transition-all shadow-xs",
									isLight
										? "bg-white border-slate-200 hover:border-cyan-400 shadow-slate-100"
										: "bg-white/[0.04] border-white/10 hover:border-cyan-400 hover:bg-white/[0.06]",
								)}
								title="Primary Recording (Drag to timeline to add as Video Layer)"
							>
								<div className="flex items-center justify-between">
									<div
										className="w-6 h-6 rounded-lg flex items-center justify-center border"
										style={{
											backgroundColor: `${activeAccent.hex}18`,
											borderColor: `${activeAccent.hex}30`,
											color: activeAccent.hex,
										}}
									>
										<Video className="w-3.5 h-3.5" />
									</div>
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => {
												if (!videoPath) return;
												const startMs = Math.round(currentTime * 1000);
												const clipDurMs = videoDuration ? Math.round(videoDuration * 1000) : 10000;
												onAddVideoLayer?.({
													name: `${mainDateInfo.cleanName} (PiP)`,
													src: videoPath,
													type: "pip",
													startMs,
													endMs: startMs + clipDurMs,
													width: 35,
													height: 35,
													x: 10,
													y: 10,
												});
												toast.success("Added recording as Picture-in-Picture layer");
											}}
											className="h-5 px-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/40 text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
											title="Add as secondary video layer on timeline"
										>
											<Plus className="w-2.5 h-2.5" />
											<span>Layer</span>
										</button>
										<span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
											Active
										</span>
									</div>
								</div>
								<div>
									<div
										className={cn(
											"text-xs font-bold truncate",
											isLight ? "text-slate-800" : "text-white",
										)}
										title={videoFileName}
									>
										{mainDateInfo.cleanName}
									</div>
									<div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
										<span title={mainDateInfo.fullDateTime || undefined}>
											{mainDateInfo.fullDateTime || formattedDuration}
										</span>
										<span className="text-emerald-500 font-semibold">{formattedDuration}</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Stock Media Themes Section */}
			{(activeSubFilter === "all" || activeSubFilter === "stock") && (
				<div className="space-y-2.5 pt-1">
					<div className="flex items-center justify-between">
						<span
							className={cn(
								"text-[11px] font-extrabold uppercase tracking-wider",
								isLight ? "text-slate-600" : "text-slate-400",
							)}
						>
							Stock Themes & Backdrops
						</span>
						<span className="text-[10px] text-slate-400 font-semibold">1-Click Apply</span>
					</div>

					<div className="grid grid-cols-2 gap-2">
						{WALLPAPER_PATHS.slice(0, 6).map((wp, idx) => (
							<div
								key={wp}
								onClick={() => {
									onApplyWallpaper?.({ name: `Theme ${idx + 1}`, path: wp });
									toast.success(`Applied Theme ${idx + 1}`);
								}}
								className="h-16 rounded-2xl border overflow-hidden cursor-pointer relative group transition-all bg-cover bg-center shadow-xs hover:scale-[1.02]"
								style={{ backgroundImage: `url(${wp})` }}
							>
								<div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
									<span className="text-[10px] font-extrabold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/20">
										Theme {idx + 1}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
