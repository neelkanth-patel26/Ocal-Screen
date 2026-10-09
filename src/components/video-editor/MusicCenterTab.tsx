import { Check, Music, Play, Plus, Search, Sliders, Square, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPresetAudioUrl } from "@/lib/audio/presetMusicGenerator";
import { cn } from "@/lib/utils";
import { AudioInspectorTab } from "./AudioInspectorTab";
import { type AudioSettingsState } from "./FilmoraAudioInspector";
import type { AudioPreset } from "./FilmoraMediaLibrary";

export interface MusicCenterTabProps {
	audioTrackName?: string | null;
	settings?: AudioSettingsState;
	onSettingsChange?: (settings: AudioSettingsState) => void;
	onResetAudioSettings?: () => void;
	onSelectAudioPreset?: (preset: AudioPreset) => void;
	isLight: boolean;
	activeAccent: { hex: string; textHex: string };
}

export const AUDIO_PRESETS: AudioPreset[] = [
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
		title: "Mechanical Click SFX",
		name: "Mechanical Click SFX",
		duration: "00:00:01",
		durationSec: 1,
		genre: "Sound Effect",
		color: "#ec4899",
	},
	{
		id: "deep-bass-drop",
		title: "Cinematic Bass Drop",
		name: "Cinematic Bass Drop",
		duration: "00:00:03",
		durationSec: 3,
		genre: "Sound Effect",
		color: "#ef4444",
	},
	{
		id: "pop-notification",
		title: "Pop Bubble Alert",
		name: "Pop Bubble Alert",
		duration: "00:00:01",
		durationSec: 1,
		genre: "Sound Effect",
		color: "#8b5cf6",
	},
];

export function MusicCenterTab({
	audioTrackName,
	settings,
	onSettingsChange,
	onResetAudioSettings,
	onSelectAudioPreset,
	isLight,
	activeAccent,
}: MusicCenterTabProps) {
	const [activeSubTab, setActiveSubTab] = useState<"library" | "controls">("library");
	const [activeCategory, setActiveCategory] = useState<"all" | "music" | "sfx">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [previewingPresetId, setPreviewingPresetId] = useState<string | null>(null);
	const previewAudioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		return () => {
			if (previewAudioRef.current) {
				previewAudioRef.current.pause();
				previewAudioRef.current = null;
			}
		};
	}, []);

	const handleTogglePreviewAudio = async (preset: AudioPreset, e: React.MouseEvent) => {
		e.stopPropagation();
		if (previewingPresetId === preset.id) {
			previewAudioRef.current?.pause();
			setPreviewingPresetId(null);
			return;
		}

		try {
			const url = await getPresetAudioUrl(preset.id);
			if (!url) return;
			if (!previewAudioRef.current) {
				previewAudioRef.current = new Audio();
				previewAudioRef.current.onended = () => setPreviewingPresetId(null);
			}
			previewAudioRef.current.src = url;
			previewAudioRef.current.currentTime = 0;
			await previewAudioRef.current.play();
			setPreviewingPresetId(preset.id);
		} catch (err) {
			console.warn("Could not preview audio:", err);
		}
	};

	const filteredAudio = useMemo(() => {
		return AUDIO_PRESETS.filter((p) => {
			const isSfx = p.genre.toLowerCase().includes("sound effect") || p.durationSec <= 5;
			if (activeCategory === "music" && isSfx) return false;
			if (activeCategory === "sfx" && !isSfx) return false;

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return p.name.toLowerCase().includes(q) || p.genre.toLowerCase().includes(q);
		});
	}, [activeCategory, searchQuery]);

	const handleAddAudioPreset = async (preset: AudioPreset) => {
		const url = await getPresetAudioUrl(preset.id);
		if (onSelectAudioPreset) {
			onSelectAudioPreset({ ...preset, url });
			toast.success(`Assigned "${preset.name}" to Audio Track 1`);
		}
	};

	return (
		<div className="space-y-4">
			{/* Top Subtab Navigator: Library vs Controls */}
			<div
				className={cn(
					"flex items-center gap-1 p-1 rounded-2xl border shadow-2xs",
					isLight ? "bg-slate-100/90 border-[#e4e4e7]" : "bg-white/[0.04] border-white/[0.06]",
				)}
			>
				<button
					type="button"
					onClick={() => setActiveSubTab("library")}
					style={
						activeSubTab === "library"
							? {
									backgroundColor: activeAccent.hex,
									borderColor: activeAccent.hex,
									color: activeAccent.textHex,
									boxShadow: `0 2px 8px ${activeAccent.hex}40`,
								}
							: undefined
					}
					className={cn(
						"flex-1 py-1 px-2.5 rounded-xl text-xs font-bold transition-all text-center border flex items-center justify-center gap-1.5 cursor-pointer",
						activeSubTab === "library"
							? "shadow-sm border-transparent"
							: isLight
								? "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200"
								: "border-transparent text-slate-400 hover:text-white hover:bg-zinc-800",
					)}
				>
					<Music className="w-3.5 h-3.5" />
					<span>Tracks & SFX</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("controls")}
					style={
						activeSubTab === "controls"
							? {
									backgroundColor: activeAccent.hex,
									borderColor: activeAccent.hex,
									color: activeAccent.textHex,
									boxShadow: `0 2px 8px ${activeAccent.hex}40`,
								}
							: undefined
					}
					className={cn(
						"flex-1 py-1 px-2.5 rounded-xl text-xs font-bold transition-all text-center border flex items-center justify-center gap-1.5 cursor-pointer",
						activeSubTab === "controls"
							? "shadow-sm border-transparent"
							: isLight
								? "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200"
								: "border-transparent text-slate-400 hover:text-white hover:bg-zinc-800",
					)}
				>
					<Sliders className="w-3.5 h-3.5" />
					<span>Audio Controls</span>
				</button>
			</div>

			{activeSubTab === "library" ? (
				<div className="space-y-3.5">
					{/* Active audio track badge banner if loaded */}
					{audioTrackName && (
						<div
							className={cn(
								"p-3 rounded-2xl border flex items-center justify-between transition-all",
								isLight
									? "bg-emerald-50/70 border-emerald-200"
									: "bg-emerald-500/10 border-emerald-500/25",
							)}
						>
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm font-bold">
									<Volume2 className="w-4 h-4" />
								</div>
								<div className="min-w-0">
									<div className="flex items-center gap-1.5">
										<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 font-mono">
											Audio 1
										</span>
										<span
											className={cn(
												"text-xs font-bold truncate",
												isLight ? "text-slate-900" : "text-white",
											)}
										>
											{audioTrackName}
										</span>
									</div>
									<p className="text-[10px] text-slate-400 mt-0.5">Assigned Soundtrack</p>
								</div>
							</div>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setActiveSubTab("controls")}
								className="h-7 text-[11px] font-bold rounded-xl cursor-pointer"
							>
								Adjust Audio
							</Button>
						</div>
					)}

					{/* Category filter pills: All, Music, SFX */}
					<div
						className={cn(
							"flex items-center gap-1 p-1 rounded-xl border",
							isLight ? "bg-slate-50 border-[#e4e4e7]" : "bg-black/20 border-white/[0.06]",
						)}
					>
						{[
							{ id: "all", label: "All Sounds" },
							{ id: "music", label: "Music Tracks" },
							{ id: "sfx", label: "Sound Effects (SFX)" },
						].map((tab) => {
							const isActive = activeCategory === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveCategory(tab.id as "all" | "music" | "sfx")}
									className={cn(
										"flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer",
										isActive
											? isLight
												? "bg-white text-slate-900 shadow-2xs font-extrabold"
												: "bg-white/10 text-white shadow-2xs font-extrabold"
											: "text-slate-400 hover:text-slate-200",
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
							placeholder="Search music, lofi, whoosh, click..."
							className={cn(
								"w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border transition-all outline-none",
								isLight
									? "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20"
									: "bg-white/[0.03] border-white/10 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20",
							)}
						/>
					</div>

					{/* Preset list */}
					<div className="space-y-2">
						{filteredAudio.length === 0 ? (
							<div className="text-center py-6 text-xs text-slate-400">
								No audio presets found matching "{searchQuery}"
							</div>
						) : (
							filteredAudio.map((preset) => {
								const isCurrent = audioTrackName === preset.name || audioTrackName === preset.title;
								return (
									<div
										key={preset.id}
										className={cn(
											"flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-150 group shadow-2xs",
											isCurrent
												? isLight
													? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300"
													: "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
												: isLight
													? "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xs"
													: "bg-white/[0.03] border-white/[0.08] hover:border-emerald-400 hover:bg-white/[0.05]",
										)}
									>
										<div className="flex items-center gap-2.5 min-w-0 flex-1">
											<div
												className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
												style={{
													backgroundColor: `${preset.color}15`,
													borderColor: `${preset.color}35`,
													color: preset.color,
												}}
											>
												<Music className="w-4 h-4" />
											</div>
											<div className="min-w-0 flex-1">
												<div
													className={cn(
														"text-xs font-bold truncate flex items-center gap-1.5",
														isLight ? "text-slate-800" : "text-slate-100",
													)}
												>
													<span>{preset.name}</span>
													{isCurrent && (
														<span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-500">
															Active
														</span>
													)}
												</div>
												<div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
													<span>{preset.duration}</span>
													<span>•</span>
													<span className="text-emerald-500 font-sans font-medium">
														{preset.genre}
													</span>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-1.5 shrink-0">
											<button
												type="button"
												onClick={(e) => handleTogglePreviewAudio(preset, e)}
												className={cn(
													"w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer border",
													previewingPresetId === preset.id
														? "bg-emerald-500 text-white border-emerald-500 shadow-sm animate-pulse"
														: isLight
															? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
															: "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10",
												)}
												title={previewingPresetId === preset.id ? "Stop Preview" : "Listen Preview"}
											>
												{previewingPresetId === preset.id ? (
													<Square className="w-3 h-3 fill-current" />
												) : (
													<Play className="w-3 h-3 fill-current ml-0.5" />
												)}
											</button>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => handleAddAudioPreset(preset)}
												className={cn(
													"h-7 px-2.5 text-xs font-bold rounded-xl shrink-0 transition-all cursor-pointer border",
													isCurrent
														? "border-emerald-500 bg-emerald-500 text-black hover:bg-emerald-400"
														: isLight
															? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
															: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black",
												)}
											>
												{isCurrent ? (
													<>
														<Check className="w-3 h-3 mr-1 stroke-[3]" />
														Added
													</>
												) : (
													<>
														<Plus className="w-3 h-3 mr-1" />
														Add
													</>
												)}
											</Button>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			) : (
				/* Audio Controls subtab */
				<AudioInspectorTab
					audioTrackName={audioTrackName}
					settings={settings}
					onSettingsChange={onSettingsChange}
					onReset={onResetAudioSettings}
					isLight={isLight}
					activeAccent={activeAccent}
				/>
			)}
		</div>
	);
}
