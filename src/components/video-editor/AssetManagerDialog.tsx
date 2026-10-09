import {
	Calendar,
	Camera,
	Check,
	Clock,
	Film,
	FolderPlus,
	HardDrive,
	Image as ImageIcon,
	Layers,
	Music,
	Play,
	Plus,
	Search,
	Trash2,
	Upload,
	Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { parseMediaDate } from "@/lib/mediaDateFormatter";
import { ACCENT_COLOR_MAP, type AccentColor, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import {
	getStoredMediaAssets,
	type MediaAsset,
	removeMediaAsset,
	saveMediaAsset,
} from "./mediaAssetStore";
import { toFileUrl } from "./projectPersistence";

export interface AssetManagerDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectMainVideo: (asset: MediaAsset) => void;
	onAddVideoLayer?: (asset: MediaAsset) => void;
	onSelectAudioPreset?: (preset: any) => void;
	currentVideoPath?: string | null;
	themeMode?: "dark" | "light";
	accentColor?: AccentColor;
	projectAssets?: MediaAsset[];
	onImportAsset?: (asset: MediaAsset) => void;
	onDeleteAsset?: (id: string) => void;
}

export function AssetManagerDialog({
	isOpen,
	onClose,
	onSelectMainVideo,
	onAddVideoLayer,
	onSelectAudioPreset,
	currentVideoPath,
	themeMode: explicitTheme,
	accentColor: explicitAccent,
	projectAssets,
	onImportAsset,
	onDeleteAsset,
}: AssetManagerDialogProps) {
	const [internalAssets, setInternalAssets] = useState<MediaAsset[]>([]);
	const [activeFilter, setActiveFilter] = useState<"all" | "video" | "audio" | "image">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
	const [previewPlaying, setPreviewPlaying] = useState(false);
	const previewVideoRef = useRef<HTMLVideoElement | null>(null);

	const prefs = loadUserPreferences();
	const theme = explicitTheme || prefs.theme || "dark";
	const isLight = theme === "light";
	const accent = explicitAccent || prefs.accentColor || "lime";
	const activeAccent = ACCENT_COLOR_MAP[accent] || ACCENT_COLOR_MAP.lime;

	const reloadInternalAssets = useCallback(() => {
		const list = getStoredMediaAssets().map((asset) => {
			const ext = asset.name.split(".").pop()?.toLowerCase() || "";
			const isAudio = ["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(ext);
			const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
			if (isAudio && asset.type !== "audio") {
				return { ...asset, type: "audio" as const };
			}
			if (isImage && asset.type !== "image") {
				return { ...asset, type: "image" as const };
			}
			return asset;
		});
		setInternalAssets(list);
	}, []);

	useEffect(() => {
		if (isOpen && projectAssets === undefined) {
			reloadInternalAssets();
		}
	}, [isOpen, projectAssets, reloadInternalAssets]);

	const assets = useMemo(() => {
		return projectAssets !== undefined ? projectAssets : internalAssets;
	}, [projectAssets, internalAssets]);

	useEffect(() => {
		if (assets.length > 0) {
			if (!selectedAssetId || !assets.some((a) => a.id === selectedAssetId)) {
				setSelectedAssetId(assets[0].id);
			}
		} else {
			setSelectedAssetId(null);
		}
	}, [assets, selectedAssetId]);

	const selectedAsset = useMemo(() => {
		return assets.find((a) => a.id === selectedAssetId) || assets[0] || null;
	}, [assets, selectedAssetId]);

	const filteredAssets = useMemo(() => {
		return assets.filter((asset) => {
			const matchesFilter = activeFilter === "all" || asset.type === activeFilter;
			const matchesQuery =
				!searchQuery.trim() ||
				asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				asset.path.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesFilter && matchesQuery;
		});
	}, [assets, activeFilter, searchQuery]);

	const handleImportMedia = async () => {
		if (window.electronAPI?.openVideoFilePicker) {
			const res = await window.electronAPI.openVideoFilePicker();
			if (res.canceled || !res.success || !res.path) return;

			const fileName = res.path.split(/[\\/]/).pop() || "Media Clip";
			const ext = fileName.split(".").pop()?.toLowerCase() || "";
			const isAudio = ["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(ext);
			const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
			const detectedType: "video" | "audio" | "image" = isAudio
				? "audio"
				: isImage
					? "image"
					: "video";

			const newAsset: MediaAsset = {
				id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
				name: fileName,
				path: res.path,
				url: toFileUrl(res.path),
				type: detectedType,
				addedAt: Date.now(),
				isProjectAsset: true,
				sourceType: "imported",
			};

			if (onImportAsset) {
				onImportAsset(newAsset);
			} else {
				const updated = saveMediaAsset(newAsset);
				setInternalAssets(updated);
			}
			setSelectedAssetId(newAsset.id);
			toast.success(`Imported ${fileName} to Project Media`);
		}
	};

	const handleDelete = (id: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const target = assets.find((a) => a.id === id);
		if (target?.isMainVideo) {
			toast.error("Cannot delete active main screen recording");
			return;
		}

		if (onDeleteAsset) {
			onDeleteAsset(id);
		} else {
			const updated = removeMediaAsset(id);
			setInternalAssets(updated);
		}

		if (selectedAssetId === id) {
			const remaining = assets.filter((a) => a.id !== id);
			setSelectedAssetId(remaining[0]?.id || null);
		}
		toast.info("Removed asset from Project Media Bin");
	};

	const handleSetAsMain = (asset: MediaAsset) => {
		onSelectMainVideo(asset);
		toast.success(`Loaded "${asset.name}" as main video`);
		onClose();
	};

	const handleAddToLayer = (asset: MediaAsset) => {
		if (onAddVideoLayer) {
			onAddVideoLayer(asset);
			toast.success(`Added "${asset.name}" as video layer`);
		}
	};

	const formatDuration = (sec?: number) => {
		if (!sec || Number.isNaN(sec)) return "—";
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"max-w-4xl w-[92vw] h-[82vh] max-h-[720px] p-0 gap-0 overflow-hidden rounded-3xl border shadow-2xl flex flex-col z-[100]",
					isLight
						? "bg-white border-zinc-200 text-zinc-900"
						: "bg-[#0b0c10] border-white/10 text-zinc-100",
				)}
			>
				{/* Header */}
				<DialogHeader
					className={cn(
						"flex flex-row items-center justify-between px-6 py-4 border-b shrink-0",
						isLight ? "border-zinc-200 bg-zinc-50/80" : "border-white/10 bg-white/[0.02]",
					)}
				>
					<div className="flex items-center gap-3">
						<div
							className="w-9 h-9 rounded-2xl flex items-center justify-center border shadow-xs"
							style={{
								backgroundColor: `${activeAccent.hex}18`,
								borderColor: `${activeAccent.hex}40`,
							}}
						>
							<Film className="w-5 h-5" style={{ color: activeAccent.hex }} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<DialogTitle className="text-base font-extrabold tracking-tight">
									Project Asset Manager
								</DialogTitle>
								<span
									className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs"
									style={{
										backgroundColor: `${activeAccent.hex}18`,
										color: activeAccent.hex,
										borderColor: `${activeAccent.hex}35`,
									}}
								>
									Project Bin
								</span>
							</div>
							<DialogDescription className="text-xs text-zinc-400">
								Scoped to this project: Screen recording, Face Cam, assigned audio & voiceover
							</DialogDescription>
						</div>
					</div>

					<div className="flex items-center gap-2 mr-8">
						<Button
							onClick={handleImportMedia}
							size="sm"
							className="h-8 gap-1.5 rounded-full font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-sm"
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						>
							<FolderPlus className="w-4 h-4" />
							<span>+ Import Media</span>
						</Button>
					</div>
				</DialogHeader>

				{/* Toolbar / Search & Filters */}
				<div
					className={cn(
						"flex items-center justify-between px-6 py-2.5 border-b gap-4 shrink-0 text-xs",
						isLight ? "bg-white border-zinc-100" : "bg-[#0f1015] border-white/5",
					)}
				>
					<div className="flex items-center gap-1.5 bg-black/10 dark:bg-white/5 p-0.5 rounded-xl border border-black/5 dark:border-white/5">
						{(
							[
								{ id: "all", label: "All Clips", icon: Layers },
								{ id: "video", label: "Videos", icon: Video },
								{ id: "audio", label: "Audio", icon: Music },
								{ id: "image", label: "Images", icon: ImageIcon },
							] as const
						).map((tab) => {
							const Icon = tab.icon;
							const isActive = activeFilter === tab.id;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveFilter(tab.id)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px]",
										isActive
											? isLight
												? "bg-white text-zinc-950 shadow-2xs font-bold"
												: "bg-white/15 text-white font-bold"
											: "text-zinc-400 hover:text-zinc-200",
									)}
								>
									<Icon className="w-3.5 h-3.5" />
									<span>{tab.label}</span>
									{tab.id === "all" && assets.length > 0 && (
										<span className="text-[10px] opacity-75 font-mono">({assets.length})</span>
									)}
								</button>
							);
						})}
					</div>

					<div className="relative flex-1 max-w-xs">
						<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
						<input
							type="text"
							placeholder="Search project clips..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={cn(
								"w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none border transition-all",
								isLight
									? "bg-zinc-50 border-zinc-200 focus:border-zinc-400 text-zinc-900"
									: "bg-white/5 border-white/10 focus:border-white/20 text-white placeholder-zinc-500",
							)}
						/>
					</div>
				</div>

				{/* Main Body: Left Grid + Right Inspector Preview */}
				<div className="flex-1 flex min-h-0 overflow-hidden">
					{/* Left: Asset Grid */}
					<div className="flex-1 min-w-0 p-5 overflow-y-auto custom-scrollbar">
						{filteredAssets.length === 0 ? (
							<div
								onClick={handleImportMedia}
								className={cn(
									"h-full min-h-[260px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all group",
									isLight
										? "border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"
										: "border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03]",
								)}
							>
								<div
									className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 border"
									style={{
										backgroundColor: `${activeAccent.hex}18`,
										borderColor: `${activeAccent.hex}30`,
									}}
								>
									<Upload className="w-8 h-8" style={{ color: activeAccent.hex }} />
								</div>
								<h3 className="text-sm font-bold mb-1">
									{searchQuery ? "No matching assets found" : "Project Media Bin is empty"}
								</h3>
								<p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
									{searchQuery
										? "Try searching for a different keyword or switch filters."
										: "Import screen recordings, b-roll footage, audio voiceovers, or background music for this project."}
								</p>
								<Button
									size="sm"
									className="rounded-full text-xs font-bold gap-1.5 shadow-sm"
									style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
								>
									<Plus className="w-4 h-4" />
									<span>
										{activeFilter === "audio"
											? "Import Audio Files"
											: activeFilter === "image"
												? "Import Image Files"
												: activeFilter === "video"
													? "Import Video Files"
													: "Import Media Files"}
									</span>
								</Button>
							</div>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
								{filteredAssets.map((asset) => {
									const isSelected = selectedAssetId === asset.id;
									const isCurrentMain =
										asset.isMainVideo ||
										(currentVideoPath && currentVideoPath.includes(asset.path));

									return (
										<div
											key={asset.id}
											onClick={() => setSelectedAssetId(asset.id)}
											className={cn(
												"group relative rounded-2xl border p-2.5 flex flex-col transition-all cursor-pointer overflow-hidden",
												isSelected
													? "ring-2 ring-offset-2 ring-offset-[#0b0c10]"
													: isLight
														? "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
														: "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]",
											)}
											style={{
												borderColor: isSelected ? activeAccent.hex : undefined,
											}}
										>
											{/* Thumbnail / Preview Container */}
											<div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 mb-2 flex items-center justify-center">
												{asset.type === "video" ? (
													<video
														src={asset.url}
														preload="metadata"
														className="w-full h-full object-cover pointer-events-none"
													/>
												) : asset.type === "image" ? (
													<img
														src={asset.url}
														alt={asset.name}
														className="w-full h-full object-cover pointer-events-none"
													/>
												) : (
													<div className="flex flex-col items-center justify-center text-purple-400 gap-1">
														<Music className="w-7 h-7" />
														<span className="text-[9px] font-bold uppercase tracking-wider text-purple-300">
															Audio
														</span>
													</div>
												)}

												{/* Play overlay icon */}
												<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
													<div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
														<Play className="w-4 h-4 fill-white ml-0.5" />
													</div>
												</div>

												{/* Duration badge */}
												{asset.duration && (
													<span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-[10px] font-mono text-white px-1.5 py-0.5 rounded-md">
														{formatDuration(asset.duration)}
													</span>
												)}

												{/* Role badges */}
												{isCurrentMain && (
													<span className="absolute top-1 left-1 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
														SCREEN
													</span>
												)}
												{asset.isWebcam && (
													<span className="absolute top-1 left-1 bg-purple-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
														<Camera className="w-2.5 h-2.5 inline" /> FACE CAM
													</span>
												)}
												{asset.isAudioTrack && (
													<span className="absolute top-1 left-1 bg-amber-500 text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
														<Music className="w-2.5 h-2.5 inline" /> AUDIO
													</span>
												)}
												{!asset.isMainVideo &&
													!asset.isWebcam &&
													!asset.isAudioTrack &&
													asset.sourceType === "layer" && (
														<span className="absolute top-1 left-1 bg-cyan-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
															LAYER
														</span>
													)}
											</div>

											{/* Info */}
											{(() => {
												const assetDate = parseMediaDate(asset.name, asset.addedAt);
												return (
													<div className="min-w-0 flex-1 flex flex-col justify-between">
														<span
															className="text-xs font-semibold truncate text-left mb-0.5"
															title={asset.name}
														>
															{assetDate.cleanName}
														</span>
														<div className="flex items-center justify-between text-[10px] text-zinc-400">
															<span
																className={cn(
																	"uppercase font-mono tracking-wider text-[9px] font-bold",
																	asset.isMainVideo
																		? "text-emerald-400"
																		: asset.isWebcam
																			? "text-purple-400"
																			: asset.isAudioTrack
																				? "text-amber-400"
																				: asset.type === "audio"
																					? "text-purple-400"
																					: asset.type === "image"
																						? "text-amber-400"
																						: "text-zinc-400",
																)}
															>
																{asset.isMainVideo
																	? "Screen"
																	: asset.isWebcam
																		? "Webcam"
																		: asset.isAudioTrack
																			? "Audio"
																			: asset.type}
															</span>
															{assetDate.fullDateTime ? (
																<span
																	className="text-[9px] text-zinc-400 font-mono truncate max-w-[110px]"
																	title={assetDate.fullDateTime}
																>
																	{assetDate.fullDateTime}
																</span>
															) : null}
															{!asset.isMainVideo ? (
																<button
																	type="button"
																	onClick={(e) => handleDelete(asset.id, e)}
																	className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
																	title="Delete asset"
																>
																	<Trash2 className="w-3.5 h-3.5" />
																</button>
															) : null}
														</div>
													</div>
												);
											})()}
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Right Inspector Deck (Preview & Actions) */}
					{selectedAsset && (
						<div
							className={cn(
								"w-72 shrink-0 border-l p-5 flex flex-col justify-between overflow-y-auto text-xs",
								isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#0e0f14] border-white/5",
							)}
						>
							<div>
								<div className="flex items-center justify-between mb-3">
									<span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
										Clip Inspector
									</span>
									<div className="flex items-center gap-1.5">
										{previewPlaying && (
											<span className="text-[9px] font-mono text-emerald-400 animate-pulse flex items-center gap-1">
												● LIVE
											</span>
										)}
										<span
											className={cn(
												"text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
												selectedAsset.isMainVideo
													? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
													: selectedAsset.isWebcam
														? "bg-purple-500/20 text-purple-300 border-purple-500/40"
														: selectedAsset.isAudioTrack || selectedAsset.type === "audio"
															? "bg-amber-500/20 text-amber-300 border-amber-500/40"
															: selectedAsset.type === "image"
																? "bg-amber-500/20 text-amber-300 border-amber-500/40"
																: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
											)}
										>
											{selectedAsset.isMainVideo
												? "SCREEN"
												: selectedAsset.isWebcam
													? "FACE CAM"
													: selectedAsset.isAudioTrack
														? "VOICEOVER"
														: selectedAsset.type.toUpperCase()}
										</span>
									</div>
								</div>

								{/* Player / Preview */}
								{selectedAsset.type === "audio" ? (
									<div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-purple-950/80 to-zinc-950 p-4 flex flex-col items-center justify-center gap-2 mb-4 border border-purple-500/20 shadow-lg">
										<div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
											<Music className="w-5 h-5" />
										</div>
										<audio
											src={selectedAsset.url}
											controls
											className="w-full h-8"
											onPlay={() => setPreviewPlaying(true)}
											onPause={() => setPreviewPlaying(false)}
										/>
									</div>
								) : selectedAsset.type === "image" ? (
									<div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-4 border border-white/10 shadow-lg flex items-center justify-center">
										<img
											src={selectedAsset.url}
											alt={selectedAsset.name}
											className="w-full h-full object-contain"
										/>
									</div>
								) : (
									<div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-4 border border-white/10 shadow-lg">
										<video
											ref={previewVideoRef}
											src={selectedAsset.url}
											controls
											className="w-full h-full object-contain"
											onPlay={() => setPreviewPlaying(true)}
											onPause={() => setPreviewPlaying(false)}
										/>
									</div>
								)}

								{/* Metadata Details */}
								{(() => {
									const selectedDateInfo = parseMediaDate(
										selectedAsset.name,
										selectedAsset.addedAt,
									);
									return (
										<>
											<h4 className="font-bold text-sm truncate mb-0.5">
												{selectedDateInfo.cleanName}
											</h4>
											{selectedDateInfo.cleanName !== selectedAsset.name && (
												<div className="text-[10px] text-zinc-400 font-mono truncate mb-2">
													{selectedAsset.name}
												</div>
											)}

											<div className="space-y-2 mb-6">
												{selectedDateInfo.fullDateTime && (
													<div className="flex items-center justify-between text-[11px] py-1 border-b border-white/5">
														<span className="text-zinc-400 flex items-center gap-1.5">
															<Calendar className="w-3 h-3 text-cyan-400" /> Recorded / Added
														</span>
														<span className="font-mono font-medium text-cyan-400">
															{selectedDateInfo.fullDateTime}
														</span>
													</div>
												)}

												<div className="flex items-center justify-between text-[11px] py-1 border-b border-white/5">
													<span className="text-zinc-400 flex items-center gap-1.5">
														<Clock className="w-3 h-3" /> Duration
													</span>
													<span className="font-mono font-medium">
														{formatDuration(selectedAsset.duration)}
													</span>
												</div>

												<div className="flex items-center justify-between text-[11px] py-1 border-b border-white/5">
													<span className="text-zinc-400 flex items-center gap-1.5">
														<HardDrive className="w-3 h-3" /> Storage
													</span>
													<span className="font-mono font-medium text-emerald-400">
														Project Scoped
													</span>
												</div>

												{selectedAsset.path ? (
													<div className="text-[10px] text-zinc-500 font-mono break-all pt-1">
														{selectedAsset.path}
													</div>
												) : null}
											</div>
										</>
									);
								})()}
							</div>

							{/* Actions */}
							<div className="space-y-2 pt-4 border-t border-white/5">
								{selectedAsset.isAudioTrack || selectedAsset.type === "audio" ? (
									<Button
										onClick={() => {
											const rawPath = selectedAsset.url || selectedAsset.path;
											const resolvedUrl =
												rawPath &&
												!rawPath.startsWith("blob:") &&
												!rawPath.startsWith("http:") &&
												!rawPath.startsWith("data:")
													? toFileUrl(rawPath)
													: rawPath;
											if (onSelectAudioPreset) {
												onSelectAudioPreset({
													id: selectedAsset.id,
													name: selectedAsset.name,
													title: selectedAsset.name,
													durationSec: selectedAsset.duration || 180,
													genre: "Audio Track",
													color: "#10b981",
													url: resolvedUrl,
												});
												toast.success(`Assigned "${selectedAsset.name}" to Audio 1`);
											} else if (onAddVideoLayer) {
												onAddVideoLayer(selectedAsset);
												toast.success(`Added "${selectedAsset.name}" as audio track`);
											}
										}}
										className="w-full h-9 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-md transition-all active:scale-95"
										style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
									>
										<Music className="w-4 h-4" />
										<span>Assign to Audio Track 1</span>
									</Button>
								) : selectedAsset.type === "image" ? (
									<Button
										onClick={() => {
											if (onAddVideoLayer) {
												onAddVideoLayer(selectedAsset);
												toast.success(`Added "${selectedAsset.name}" as image overlay`);
											}
										}}
										className="w-full h-9 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-md transition-all active:scale-95"
										style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
									>
										<ImageIcon className="w-4 h-4" />
										<span>Add as Image Overlay</span>
									</Button>
								) : selectedAsset.isWebcam ? (
									<>
										{onAddVideoLayer && (
											<Button
												onClick={() => handleAddToLayer(selectedAsset)}
												className="w-full h-9 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-md transition-all active:scale-95"
												style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
											>
												<Camera className="w-4 h-4" />
												<span>Add as Face Cam (PiP)</span>
											</Button>
										)}
										<Button
											variant="outline"
											onClick={() => handleSetAsMain(selectedAsset)}
											className={cn(
												"w-full h-9 rounded-xl font-semibold text-xs gap-2 cursor-pointer transition-all active:scale-95 border",
												isLight
													? "border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900"
													: "border-white/10 bg-white/5 hover:bg-white/10 text-white",
											)}
										>
											<Video className="w-4 h-4" />
											<span>Use as Main Video</span>
										</Button>
									</>
								) : (
									<>
										<Button
											onClick={() => handleSetAsMain(selectedAsset)}
											className="w-full h-9 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-md transition-all active:scale-95"
											style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
										>
											<Check className="w-4 h-4 stroke-[3]" />
											<span>
												{selectedAsset.isMainVideo
													? "Selected as Main Video"
													: "Edit as Main Video"}
											</span>
										</Button>

										{onAddVideoLayer && (
											<Button
												variant="outline"
												onClick={() => handleAddToLayer(selectedAsset)}
												className={cn(
													"w-full h-9 rounded-xl font-semibold text-xs gap-2 cursor-pointer transition-all active:scale-95 border",
													isLight
														? "border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900"
														: "border-white/10 bg-white/5 hover:bg-white/10 text-white",
												)}
											>
												<Layers className="w-4 h-4" />
												<span>+ Add to Video Track</span>
											</Button>
										)}
									</>
								)}

								{!selectedAsset.isMainVideo && (
									<Button
										variant="ghost"
										onClick={() => handleDelete(selectedAsset.id)}
										className="w-full h-8 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl cursor-pointer"
									>
										<Trash2 className="w-3.5 h-3.5 mr-1.5" />
										<span>Delete from Bin</span>
									</Button>
								)}
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
