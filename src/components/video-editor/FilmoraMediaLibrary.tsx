import {
	CheckCircle2,
	Cloud,
	Film,
	Folder,
	HardDrive,
	Layers,
	Layout,
	Music2,
	Palette,
	Play,
	Plus,
	Search,
	Sliders,
	Smile,
	Sparkles,
	Square,
	Trash2,
	Type,
	Upload,
	Video,
	Volume2,
	Wand2,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPresetAudioUrl } from "@/lib/audio/presetMusicGenerator";
import { parseMediaDate } from "@/lib/mediaDateFormatter";
import { cn } from "@/lib/utils";
import { WALLPAPER_PATHS } from "@/lib/wallpaper";
import {
	getStoredMediaAssets,
	type MediaAsset,
	removeMediaAsset,
	saveMediaAsset,
} from "./mediaAssetStore";
import { toFileUrl } from "./projectPersistence";

export type FilmoraCategoryTab =
	| "media"
	| "stock"
	| "audio"
	| "titles"
	| "transitions"
	| "effects"
	| "filters"
	| "stickers"
	| "templates";

export interface AudioPreset {
	id: string;
	title: string;
	name: string;
	duration: string;
	durationSec: number;
	genre: string;
	color: string;
	url?: string;
}

export interface TitlePreset {
	id: string;
	title: string;
	text: string;
	styleName: string;
	color: string;
	bg: string;
	fontSize?: number;
	fontWeight?: "normal" | "bold";
	textAnimation?: "none" | "fade" | "rise" | "pop" | "slide-left" | "typewriter" | "pulse";
	category?: "titles" | "subtitles" | "badges";
}

export interface EffectPreset {
	id: string;
	name: string;
	desc: string;
	icon: string;
}

export interface WallpaperPreset {
	name: string;
	path: string;
	thumbnail?: string;
}

export interface FilmoraMediaLibraryProps {
	videoPath?: string | null;
	videoDuration?: number;
	currentTime?: number;
	onImportMedia?: () => void;
	onAddAudioTrack?: (audio: { name: string; url?: string; durationSec: number }) => void;
	onSelectAudioPreset?: (preset: AudioPreset) => void;
	onAddTitlePreset?: (preset: {
		text: string;
		styleName: string;
		color: string;
		bg: string;
	}) => void;
	onSelectTitlePreset?: (title: TitlePreset) => void;
	onAddEffectPreset?: (effectName: string) => void;
	onSelectEffectPreset?: (effect: EffectPreset) => void;
	onApplyWallpaper?: (wp: WallpaperPreset) => void;
	onSelectWallpaper?: (wp: WallpaperPreset) => void;
	onOpenAutoCaptions?: () => void;
	onOpenAssetManager?: () => void;
	themeMode?: "light" | "dark" | "system";
}

const CATEGORY_TABS: Array<{ id: FilmoraCategoryTab; label: string; icon: ReactNode }> = [
	{ id: "media", label: "Media", icon: <Folder className="w-4 h-4" /> },
	{ id: "stock", label: "Stock Media", icon: <Layers className="w-4 h-4" /> },
	{ id: "audio", label: "Audio", icon: <Music2 className="w-4 h-4" /> },
	{ id: "titles", label: "Titles", icon: <Type className="w-4 h-4" /> },
	{ id: "transitions", label: "Transitions", icon: <Sliders className="w-4 h-4" /> },
	{ id: "effects", label: "Effects", icon: <Sparkles className="w-4 h-4" /> },
	{ id: "filters", label: "Filters", icon: <Palette className="w-4 h-4" /> },
	{ id: "stickers", label: "Stickers", icon: <Smile className="w-4 h-4" /> },
	{ id: "templates", label: "Templates", icon: <Layout className="w-4 h-4" /> },
];

const AUDIO_PRESETS: AudioPreset[] = [
	{
		id: "sem-demora",
		title: "SEM DEMORA (Slowed)",
		name: "SEM DEMORA (Slowed)",
		duration: "00:05:31",
		durationSec: 331,
		genre: "Lofi / Ambient",
		color: "#10b981",
	},
	{
		id: "upbeat-vlog",
		title: "Upbeat Horizon",
		name: "Upbeat Horizon",
		duration: "00:02:45",
		durationSec: 165,
		genre: "Vlog / Pop",
		color: "#06b6d4",
	},
	{
		id: "chill-lofi",
		title: "Midnight Study Lofi",
		name: "Midnight Study Lofi",
		duration: "00:03:15",
		durationSec: 195,
		genre: "Chillhop",
		color: "#8b5cf6",
	},
	{
		id: "tech-future",
		title: "Cyber Tech Minimal",
		name: "Cyber Tech Minimal",
		duration: "00:02:20",
		durationSec: 140,
		genre: "Corporate / Electronic",
		color: "#3b82f6",
	},
	{
		id: "whoosh-sfx",
		title: "Smooth Whoosh SFX",
		name: "Smooth Whoosh SFX",
		duration: "00:00:02",
		durationSec: 2,
		genre: "Sound Effect",
		color: "#f59e0b",
	},
	{
		id: "mouse-click",
		title: "Crisp Mouse Click",
		name: "Crisp Mouse Click",
		duration: "00:00:01",
		durationSec: 1,
		genre: "Sound Effect",
		color: "#10b981",
	},
];

const TITLE_PRESETS: TitlePreset[] = [
	{
		id: "filmora-neon",
		title: "FILMORA NEON",
		text: "FILMORA NEON",
		styleName: "Filmora Neon",
		color: "#d4f933",
		bg: "rgba(11, 12, 16, 0.88)",
	},
	{
		id: "clean-minimal",
		title: "CLEAN MINIMAL TITLE",
		text: "CLEAN MINIMAL TITLE",
		styleName: "Clean Minimal",
		color: "#ffffff",
		bg: "rgba(0, 0, 0, 0.6)",
	},
	{
		id: "cinematic-gold",
		title: "CINEMATIC CHAPTER",
		text: "CINEMATIC CHAPTER",
		styleName: "Cinematic Gold",
		color: "#f59e0b",
		bg: "rgba(15, 23, 42, 0.8)",
	},
	{
		id: "karaoke-pop",
		title: "KARAOKE POP HIGHLIGHT",
		text: "KARAOKE POP HIGHLIGHT",
		styleName: "Karaoke Pop",
		color: "#facc15",
		bg: "rgba(0, 0, 0, 0.85)",
	},
	{
		id: "lower-third",
		title: "Presenter / Speaker Name",
		text: "Presenter / Speaker Name",
		styleName: "Lower Third",
		color: "#38bdf8",
		bg: "rgba(15, 23, 42, 0.9)",
	},
];

const EFFECT_PRESETS: EffectPreset[] = [
	{
		id: "bg-blur",
		name: "Studio Background Blur",
		desc: "Silky soft background depth of field",
		icon: "✨",
	},
	{
		id: "dynamic-zoom",
		name: "Dynamic Punch Zoom",
		desc: "Crisp focal emphasis on interaction",
		icon: "🔍",
	},
	{
		id: "focus-spotlight",
		name: "Spotlight Glow",
		desc: "Darken perimeter & illuminate cursor focus",
		icon: "💡",
	},
	{ id: "vignette", name: "Cinematic Vignette", desc: "Film noir edge shadow falloff", icon: "🎬" },
	{
		id: "color-grade",
		name: "Cool Tech Color Grade",
		desc: "Vibrant high-contrast studio look",
		icon: "🎨",
	},
];

function formatTimeSec(sec: number): string {
	const totalSec = Math.max(0, Math.floor(sec));
	const mins = Math.floor(totalSec / 60);
	const secs = totalSec % 60;
	return `00:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function FilmoraMediaLibrary({
	videoPath,
	videoDuration = 0,
	onImportMedia,
	onAddAudioTrack,
	onSelectAudioPreset,
	onAddTitlePreset,
	onSelectTitlePreset,
	onAddEffectPreset,
	onSelectEffectPreset,
	onApplyWallpaper,
	onSelectWallpaper,
	onOpenAutoCaptions,
}: FilmoraMediaLibraryProps) {
	const [activeCategory, setActiveCategory] = useState<FilmoraCategoryTab>("media");
	const [activeSubFolder, setActiveSubFolder] = useState<string>("folder");
	const [searchQuery, setSearchQuery] = useState("");
	const [storedAssets, setStoredAssets] = useState<MediaAsset[]>(() => getStoredMediaAssets());

	const handleImportFile = async () => {
		if (onImportMedia) {
			onImportMedia();
			return;
		}
		try {
			const electron = window.electronAPI as
				| { openFileDialog?: () => Promise<string | null> }
				| undefined;
			const filePath = await electron?.openFileDialog?.();
			if (filePath) {
				const ext = filePath.split(".").pop()?.toLowerCase() || "";
				const isAudio = ["mp3", "wav", "aac", "m4a", "ogg"].includes(ext);
				const isImg = ["png", "jpg", "jpeg", "webp"].includes(ext);
				const type: "video" | "audio" | "image" = isAudio ? "audio" : isImg ? "image" : "video";
				const name = filePath.split(/[/\\]/).pop() || "imported_media";

				const updated = saveMediaAsset({
					name,
					path: filePath,
					url: toFileUrl(filePath),
					type,
				});
				setStoredAssets(updated);
				toast.success(`Imported: ${name}`);
			}
		} catch {
			toast.error("Could not import file");
		}
	};

	const handleDeleteStoredAsset = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		const updated = removeMediaAsset(id);
		setStoredAssets(updated);
		toast.info("Removed media asset");
	};

	const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
	const previewAudioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		return () => {
			if (previewAudioRef.current) {
				previewAudioRef.current.pause();
				previewAudioRef.current = null;
			}
		};
	}, []);

	const handleTogglePreviewAudio = async (audioId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (previewingAudioId === audioId) {
			previewAudioRef.current?.pause();
			setPreviewingAudioId(null);
			return;
		}

		try {
			const url = await getPresetAudioUrl(audioId);
			if (!url) {
				toast.error("Audio generation failed");
				return;
			}
			if (!previewAudioRef.current) {
				previewAudioRef.current = new Audio();
				previewAudioRef.current.onended = () => setPreviewingAudioId(null);
			}
			previewAudioRef.current.src = url;
			previewAudioRef.current.currentTime = 0;
			await previewAudioRef.current.play();
			setPreviewingAudioId(audioId);
		} catch (err) {
			console.warn("Could not preview audio:", err);
		}
	};

	const filteredAudioPresets = useMemo(() => {
		if (!searchQuery.trim()) return AUDIO_PRESETS;
		const q = searchQuery.toLowerCase();
		return AUDIO_PRESETS.filter(
			(p) => p.name.toLowerCase().includes(q) || p.genre.toLowerCase().includes(q),
		);
	}, [searchQuery]);

	const videoFileName = useMemo(() => {
		if (!videoPath) return "desktop";
		const base = videoPath.split(/[/\\]/).pop() || "desktop";
		return base.replace(/\.[^/.]+$/, "");
	}, [videoPath]);

	const formattedDuration = useMemo(() => formatTimeSec(videoDuration), [videoDuration]);

	return (
		<div className="filmora-media-panel flex flex-col h-full bg-[#0b0c10] border-r border-[#1a1b24] select-none overflow-hidden text-slate-300">
			{/* Filmora Category Top Tabs */}
			<div className="flex items-center overflow-x-auto no-scrollbar border-b border-[#181924] bg-[#0c0d12] px-2 py-1 gap-1 min-h-[42px] shrink-0">
				{CATEGORY_TABS.map((tab) => {
					const isActive = activeCategory === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveCategory(tab.id)}
							className={cn(
								"flex flex-col items-center justify-center px-2.5 py-1 rounded text-[11px] font-medium transition-all shrink-0 relative group",
								isActive
									? "text-cyan-400 font-semibold"
									: "text-slate-400 hover:text-white hover:bg-white/[0.04]",
							)}
						>
							<div className="w-4 h-4 mb-0.5 flex items-center justify-center">{tab.icon}</div>
							<span className="whitespace-nowrap tracking-tight">{tab.label}</span>
							{isActive && (
								<div className="absolute bottom-0 left-2 right-2 h-[2px] bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
							)}
						</button>
					);
				})}
			</div>

			{/* Sub-body: Sidebar + Content */}
			<div className="flex flex-1 min-h-0">
				{/* Filmora Left Sub-Navigation for Media */}
				{activeCategory === "media" && (
					<div className="w-32 bg-[#090a0e] border-r border-[#161720] flex flex-col py-2 px-1 text-[11px] shrink-0">
						<button
							type="button"
							onClick={() => setActiveSubFolder("folder")}
							className={cn(
								"flex items-center gap-2 px-2.5 py-1.5 rounded transition-all text-left font-medium",
								activeSubFolder === "folder"
									? "bg-cyan-500/15 text-cyan-400 font-semibold border-l-2 border-cyan-400"
									: "text-slate-400 hover:text-white hover:bg-white/[0.04]",
							)}
						>
							<Folder className="w-3.5 h-3.5 shrink-0" />
							<span className="truncate">Folder</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveSubFolder("global")}
							className={cn(
								"flex items-center gap-2 px-2.5 py-1.5 rounded transition-all text-left font-medium mt-0.5",
								activeSubFolder === "global"
									? "bg-cyan-500/15 text-cyan-400 font-semibold border-l-2 border-cyan-400"
									: "text-slate-400 hover:text-white hover:bg-white/[0.04]",
							)}
						>
							<HardDrive className="w-3.5 h-3.5 shrink-0" />
							<span className="truncate">Global Media</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveSubFolder("cloud")}
							className={cn(
								"flex items-center gap-2 px-2.5 py-1.5 rounded transition-all text-left font-medium mt-0.5",
								activeSubFolder === "cloud"
									? "bg-cyan-500/15 text-cyan-400 font-semibold border-l-2 border-cyan-400"
									: "text-slate-400 hover:text-white hover:bg-white/[0.04]",
							)}
						>
							<Cloud className="w-3.5 h-3.5 shrink-0" />
							<span className="truncate">Cloud Media</span>
						</button>
						<button
							type="button"
							onClick={() => onOpenAutoCaptions?.()}
							className="flex items-center gap-2 px-2.5 py-1.5 rounded transition-all text-left font-medium mt-0.5 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04]"
						>
							<Type className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
							<span className="truncate">AI Captions</span>
						</button>
					</div>
				)}

				{/* Main Content Area */}
				<div className="flex-1 flex flex-col min-w-0 bg-[#0d0e14]">
					{/* Toolbar: Import, Search, Filter */}
					<div className="flex items-center justify-between px-3 py-2 border-b border-[#181924] gap-2 shrink-0">
						<div className="flex items-center gap-1.5">
							{activeCategory === "media" && (
								<Button
									size="sm"
									variant="outline"
									onClick={handleImportFile}
									className="h-7 text-xs gap-1.5 bg-[#151722] border-[#262836] text-white hover:bg-cyan-500 hover:text-black hover:border-cyan-400 font-medium px-2.5"
								>
									<Upload className="w-3 h-3 text-cyan-400" />
									<span>Import</span>
								</Button>
							)}
							{activeCategory === "audio" && (
								<span className="text-xs font-semibold text-white/90">Soundtrack & SFX</span>
							)}
							{activeCategory === "titles" && (
								<span className="text-xs font-semibold text-white/90">Title Presets</span>
							)}
							{activeCategory === "effects" && (
								<span className="text-xs font-semibold text-white/90">Visual FX Library</span>
							)}
						</div>

						{/* Search box */}
						<div className="relative w-36 sm:w-44">
							<Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search..."
								className="h-6 text-[11px] pl-6 pr-2 bg-[#12141c] border-[#222432] focus-visible:ring-cyan-500 text-slate-200"
							/>
						</div>
					</div>

					{/* Category Body Grid */}
					<div className="flex-1 overflow-y-auto p-3 no-scrollbar min-h-0">
						{/* 1. MEDIA TAB */}
						{activeCategory === "media" && (
							<div className="flex flex-col gap-2">
								<div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									FOLDER
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
									{/* + Import Media Card */}
									<div
										onClick={handleImportFile}
										className="h-28 rounded-lg border-2 border-dashed border-[#222432] hover:border-cyan-500/60 bg-[#12131b]/60 hover:bg-cyan-950/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
									>
										<div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-cyan-500/20 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
											<Plus className="w-5 h-5" />
										</div>
										<span className="text-xs font-medium text-slate-400 group-hover:text-cyan-300">
											Import Media
										</span>
									</div>

									{/* Main Desktop Video Card */}
									{videoPath && (
										<div className="h-28 rounded-lg border border-cyan-500/40 bg-[#12141e] relative overflow-hidden flex flex-col group shadow-lg ring-1 ring-cyan-500/20">
											<div className="flex-1 bg-gradient-to-br from-slate-900 to-black flex items-center justify-center relative p-1">
												<Video className="w-7 h-7 text-cyan-400/80" />
												<div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/75 text-[9px] font-mono text-cyan-300 font-semibold tabular-nums">
													{formattedDuration}
												</div>
												<div className="absolute top-1.5 left-1.5">
													<CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
												</div>
											</div>
											<div className="h-7 px-2 bg-[#0c0d12] flex items-center justify-between border-t border-white/[0.06]">
												{(() => {
													const mainDateInfo = parseMediaDate(videoPath || "desktop");
													return (
														<span
															className="text-[11px] font-medium text-white truncate max-w-[110px]"
															title={mainDateInfo.fullDateTime || videoFileName}
														>
															{mainDateInfo.cleanName}
														</span>
													);
												})()}
												<span className="text-[9px] text-cyan-400 font-mono">active</span>
											</div>
										</div>
									)}

									{/* Audio Presets & Imported Audio */}
									<div
										onClick={async () => {
											const url = await getPresetAudioUrl("sem-demora");
											onAddAudioTrack?.({
												name: "SEM DEMORA (Slowed)",
												durationSec: 331,
												url,
											});
											onSelectAudioPreset?.({
												id: "sem-demora",
												name: "SEM DEMORA (Slowed)",
												title: "SEM DEMORA (Slowed)",
												duration: "00:05:31",
												durationSec: 331,
												genre: "Lofi / Ambient",
												color: "#10b981",
												url,
											});
											toast.success("Added SEM DEMORA to Audio Track 1");
										}}
										className="h-28 rounded-lg border border-[#1f2230] hover:border-emerald-500/60 bg-[#11131a] relative overflow-hidden flex flex-col group cursor-pointer transition-all"
									>
										<div className="flex-1 bg-gradient-to-b from-emerald-950/40 to-black flex items-center justify-center relative p-1">
											<Music2 className="w-7 h-7 text-emerald-400" />
											<div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/75 text-[9px] font-mono text-emerald-300 font-semibold tabular-nums">
												00:05:31
											</div>
											<div className="absolute top-1.5 left-1.5">
												<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
											</div>
										</div>
										<div className="h-7 px-2 bg-[#0c0d12] flex items-center justify-between border-t border-white/[0.06]">
											<span className="text-[11px] font-medium text-white truncate max-w-[110px]">
												SEM DEMORA (Slowed)
											</span>
											<Plus className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-125 transition-transform" />
										</div>
									</div>

									{/* User Imported Media Assets */}
									{storedAssets.map((asset) => {
										const assetDateInfo = parseMediaDate(asset.name, asset.addedAt);
										return (
											<div
												key={asset.id}
												onClick={() => {
													if (asset.type === "audio") {
														const rawPath = asset.url || asset.path;
														const resolvedUrl =
															rawPath &&
															!rawPath.startsWith("blob:") &&
															!rawPath.startsWith("http:") &&
															!rawPath.startsWith("data:")
																? toFileUrl(rawPath)
																: rawPath;
														onAddAudioTrack?.({
															name: asset.name,
															url: resolvedUrl,
															durationSec: asset.duration || 60,
														});
														onSelectAudioPreset?.({
															id: asset.id,
															name: asset.name,
															title: asset.name,
															duration: "03:00",
															durationSec: asset.duration || 180,
															genre: "Custom Audio",
															color: "#10b981",
															url: resolvedUrl,
														});
														toast.success(`Added ${asset.name} to Audio`);
													} else {
														toast.info(`Asset ${asset.name} ready`);
													}
												}}
												className="h-28 rounded-lg border border-[#1f2230] hover:border-cyan-500/60 bg-[#11131a] relative overflow-hidden flex flex-col group cursor-pointer transition-all"
											>
												<div className="flex-1 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center relative p-1">
													{asset.type === "audio" ? (
														<Music2 className="w-7 h-7 text-emerald-400" />
													) : asset.type === "image" ? (
														<Palette className="w-7 h-7 text-amber-400" />
													) : (
														<Film className="w-7 h-7 text-cyan-400" />
													)}
													<button
														type="button"
														onClick={(e) => handleDeleteStoredAsset(asset.id, e)}
														className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-black/80 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
														title="Delete asset"
													>
														<Trash2 className="w-3 h-3" />
													</button>
												</div>
												<div className="h-7 px-2 bg-[#0c0d12] flex items-center justify-between border-t border-white/[0.06]">
													<div className="flex flex-col min-w-0 pr-1 leading-tight">
														<span
															className="text-[11px] font-medium text-white truncate max-w-[100px]"
															title={assetDateInfo.fullDateTime || asset.name}
														>
															{assetDateInfo.cleanName}
														</span>
														<span className="text-[8px] text-slate-400 font-mono truncate">
															{assetDateInfo.formattedDate}
														</span>
													</div>
													<Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-125 transition-transform shrink-0" />
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* 2. AUDIO TAB */}
						{activeCategory === "audio" && (
							<div className="flex flex-col gap-2">
								<div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									FILMORA SOUNDTRACKS & EFFECTS
								</div>
								<div className="grid grid-cols-1 gap-2">
									{filteredAudioPresets.map((audio) => {
										const isPreviewing = previewingAudioId === audio.id;
										return (
											<div
												key={audio.id}
												className="flex items-center justify-between p-2.5 rounded-lg border border-[#1a1b26] bg-[#10121a] hover:bg-[#141622] hover:border-emerald-500/50 transition-all group"
											>
												<div className="flex items-center gap-3 min-w-0">
													<div
														className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer relative"
														style={{ backgroundColor: `${audio.color}20`, color: audio.color }}
														onClick={(e) => handleTogglePreviewAudio(audio.id, e)}
														title={isPreviewing ? "Stop audio" : "Preview real audio"}
													>
														{isPreviewing ? (
															<Square className="w-4 h-4 fill-current animate-pulse text-amber-400" />
														) : (
															<Play className="w-4 h-4 fill-current ml-0.5" />
														)}
													</div>
													<div className="flex flex-col min-w-0">
														<span className="text-xs font-semibold text-white truncate">
															{audio.name}
														</span>
														<span className="text-[10px] text-slate-400">
															{audio.genre} •{" "}
															<span className="font-mono text-emerald-400">{audio.duration}</span>
														</span>
													</div>
												</div>
												<div className="flex items-center gap-1.5 shrink-0">
													<button
														type="button"
														onClick={(e) => handleTogglePreviewAudio(audio.id, e)}
														className={cn(
															"h-7 w-7 rounded flex items-center justify-center text-xs transition-colors",
															isPreviewing
																? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
																: "text-slate-400 hover:text-white hover:bg-white/[0.06]",
														)}
														title={isPreviewing ? "Stop audio" : "Listen preview"}
													>
														{isPreviewing ? (
															<Square className="w-3 h-3 fill-current" />
														) : (
															<Volume2 className="w-3.5 h-3.5" />
														)}
													</button>
													<Button
														size="sm"
														variant="ghost"
														onClick={async () => {
															const url = await getPresetAudioUrl(audio.id);
															const resolvedAudio = { ...audio, url };
															if (onSelectAudioPreset) {
																onSelectAudioPreset(resolvedAudio);
															} else if (onAddAudioTrack) {
																onAddAudioTrack({
																	name: audio.name,
																	durationSec: audio.durationSec,
																	url,
																});
															}
															toast.success(`Loaded ${audio.name} into Timeline & Player`);
														}}
														className="h-7 px-2 text-xs gap-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black font-semibold border border-emerald-500/40"
													>
														<Plus className="w-3.5 h-3.5" />
														<span>Add</span>
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* 3. TITLES TAB */}
						{activeCategory === "titles" && (
							<div className="flex flex-col gap-2">
								<div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									FILMORA TITLE STYLES
								</div>
								<div className="grid grid-cols-2 gap-2.5">
									{TITLE_PRESETS.map((preset) => (
										<div
											key={preset.id}
											onClick={() => {
												if (onSelectTitlePreset) {
													onSelectTitlePreset(preset);
												} else if (onAddTitlePreset) {
													onAddTitlePreset(preset);
												}
												toast.success(`Added ${preset.styleName} to Timeline`);
											}}
											className="h-24 rounded-lg border border-[#1e202e] hover:border-cyan-400 bg-[#12131c] flex flex-col justify-between p-2.5 cursor-pointer group transition-all"
										>
											<div className="flex items-center justify-between">
												<span className="text-[10px] text-slate-400 font-medium">
													{preset.styleName}
												</span>
												<Plus className="w-3.5 h-3.5 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all" />
											</div>
											<div
												className="py-1 px-2 rounded text-center text-xs font-bold truncate shadow"
												style={{ color: preset.color, backgroundColor: preset.bg }}
											>
												{preset.text}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* 4. EFFECTS TAB */}
						{activeCategory === "effects" && (
							<div className="flex flex-col gap-2">
								<div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									VISUAL EFFECTS
								</div>
								<div className="grid grid-cols-1 gap-2">
									{EFFECT_PRESETS.map((eff) => (
										<div
											key={eff.id}
											onClick={() => {
												if (onSelectEffectPreset) {
													onSelectEffectPreset(eff);
												} else if (onAddEffectPreset) {
													onAddEffectPreset(eff.id);
												}
												toast.success(`Applied ${eff.name}`);
											}}
											className="flex items-center justify-between p-2.5 rounded-lg border border-[#1a1b26] bg-[#10121a] hover:bg-[#151724] hover:border-cyan-500/50 cursor-pointer transition-all group"
										>
											<div className="flex items-center gap-3">
												<span className="text-xl">{eff.icon}</span>
												<div className="flex flex-col">
													<span className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors">
														{eff.name}
													</span>
													<span className="text-[10px] text-slate-400">{eff.desc}</span>
												</div>
											</div>
											<Plus className="w-4 h-4 text-cyan-400 group-hover:scale-125 transition-transform shrink-0" />
										</div>
									))}
								</div>
							</div>
						)}

						{/* 5. STOCK MEDIA TAB */}
						{activeCategory === "stock" && (
							<div className="flex flex-col gap-2">
								<div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									STOCK WALLPAPERS & BACKDROPS
								</div>
								<div className="grid grid-cols-2 gap-2">
									{WALLPAPER_PATHS.slice(0, 8).map((wp, idx) => (
										<div
											key={wp}
											onClick={() => {
												if (onSelectWallpaper) {
													onSelectWallpaper({ name: `Wallpaper ${idx + 1}`, path: wp });
												} else if (onApplyWallpaper) {
													onApplyWallpaper({ name: `Wallpaper ${idx + 1}`, path: wp });
												}
												toast.success(`Applied Wallpaper ${idx + 1}`);
											}}
											className="h-16 rounded-lg border border-[#1e202e] hover:border-cyan-400 overflow-hidden cursor-pointer relative group transition-all bg-cover bg-center"
											style={{ backgroundImage: `url(${wp})` }}
										>
											<div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
												<span className="text-[10px] font-semibold text-white/90 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
													Theme {idx + 1}
												</span>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* 6. OTHER TABS (Transitions, Filters, Stickers, Templates) */}
						{["transitions", "filters", "stickers", "templates"].includes(activeCategory) && (
							<div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 gap-2">
								<Wand2 className="w-8 h-8 text-cyan-400/40 animate-pulse" />
								<span className="text-xs font-medium text-slate-400 capitalize">
									Filmora {activeCategory} Presets
								</span>
								<p className="text-[11px] max-w-[200px]">
									Select clips on the timeline to apply smart {activeCategory}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
