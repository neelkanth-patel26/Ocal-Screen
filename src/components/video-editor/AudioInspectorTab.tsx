import { Diamond, Music, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { type AudioSettingsState, DEFAULT_AUDIO_SETTINGS } from "./FilmoraAudioInspector";

export interface AudioInspectorTabProps {
	audioTrackName?: string | null;
	settings?: AudioSettingsState;
	onSettingsChange?: (settings: AudioSettingsState) => void;
	onReset?: () => void;
	isLight: boolean;
	activeAccent: { hex: string; textHex: string };
}

export function AudioInspectorTab({
	audioTrackName,
	settings,
	onSettingsChange,
	onReset,
	isLight,
	activeAccent,
}: AudioInspectorTabProps) {
	const [activeSubTab, setActiveSubTab] = useState<"basic" | "voice">("basic");

	const state: AudioSettingsState = settings || {
		...DEFAULT_AUDIO_SETTINGS,
		trackName: audioTrackName || "Audio 1",
	};

	const update = useCallback(
		(partial: Partial<AudioSettingsState>) => {
			if (onSettingsChange) {
				onSettingsChange({ ...state, ...partial });
			}
		},
		[onSettingsChange, state],
	);

	return (
		<div className="space-y-4">
			{/* Sub Tabs: Basic vs Voice Changer */}
			<div
				className={cn(
					"flex items-center gap-1 p-1 rounded-2xl border shadow-2xs",
					isLight ? "bg-slate-100 border-[#e4e4e7]" : "bg-[#18181b] border-zinc-700",
				)}
			>
				<button
					type="button"
					onClick={() => setActiveSubTab("basic")}
					style={
						activeSubTab === "basic"
							? {
									backgroundColor: activeAccent.hex,
									borderColor: activeAccent.hex,
									color: activeAccent.textHex,
									boxShadow: `0 2px 8px ${activeAccent.hex}40`,
								}
							: undefined
					}
					className={cn(
						"flex-1 py-1 px-2.5 rounded-xl text-xs font-bold transition-all text-center border",
						activeSubTab === "basic"
							? "shadow-sm border-transparent"
							: isLight
								? "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200"
								: "border-transparent text-slate-400 hover:text-white hover:bg-zinc-800",
					)}
				>
					Basic Audio
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("voice")}
					style={
						activeSubTab === "voice"
							? {
									backgroundColor: activeAccent.hex,
									borderColor: activeAccent.hex,
									color: activeAccent.textHex,
									boxShadow: `0 2px 8px ${activeAccent.hex}40`,
								}
							: undefined
					}
					className={cn(
						"flex-1 py-1 px-2.5 rounded-xl text-xs font-bold transition-all text-center border",
						activeSubTab === "voice"
							? "shadow-sm border-transparent"
							: isLight
								? "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200"
								: "border-transparent text-slate-400 hover:text-white hover:bg-zinc-800",
					)}
				>
					Voice & AI FX
				</button>
			</div>

			{/* Emerald Waveform Active Audio Header */}
			<div className="relative rounded-2xl overflow-hidden p-3 bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-700/90 text-white shadow-md border border-emerald-400/30">
				<div className="flex items-center justify-between gap-2 relative z-10">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
							<Music className="w-3.5 h-3.5 text-white" />
						</div>
						<div className="min-w-0">
							<div className="text-xs font-extrabold truncate">
								{audioTrackName || "Audio Track 1"}
							</div>
							<div className="text-[10px] text-white/80 font-mono mt-0.5">Track: Audio 1</div>
						</div>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<span className="text-[11px] font-mono font-bold bg-black/30 px-2 py-0.5 rounded-full border border-white/20">
							{state.volumeDb > 0 ? `+${state.volumeDb.toFixed(1)}` : state.volumeDb.toFixed(1)} dB
						</span>
					</div>
				</div>

				{/* Stylized Waveform Bars */}
				<div className="flex items-center gap-1 h-6 mt-2.5 opacity-80 px-1">
					{[40, 75, 55, 90, 60, 30, 85, 95, 45, 70, 80, 50, 65, 85, 40, 95, 75, 55, 60, 45, 80].map(
						(height, i) => (
							<div
								key={`bar-${i}`}
								className="flex-1 bg-white/70 rounded-full transition-all duration-150"
								style={{ height: `${height}%` }}
							/>
						),
					)}
				</div>
			</div>

			{activeSubTab === "basic" && (
				<div className="space-y-3">
					{/* Card 1: Volume & Normalization */}
					<div
						className={cn(
							"p-3.5 rounded-2xl border space-y-3 shadow-xs",
							isLight ? "bg-white/90 border-slate-200" : "bg-white/[0.04] border-white/[0.08]",
						)}
					>
						<div className="flex items-center justify-between">
							<span
								className={cn(
									"text-xs font-bold uppercase tracking-wider",
									isLight ? "text-slate-600" : "text-slate-400",
								)}
							>
								Volume & Gain
							</span>
							<Diamond className="w-3 h-3 text-slate-400 hover:text-emerald-500 cursor-pointer" />
						</div>

						{/* Auto Normalization Toggle */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<span
									className={cn(
										"text-xs font-bold block",
										isLight ? "text-slate-800" : "text-slate-100",
									)}
								>
									Auto Normalization
								</span>
								<span className="text-[10px] text-slate-400 block">
									Balance dynamic peaks automatically
								</span>
							</div>
							<Switch
								checked={state.autoNormalization}
								onCheckedChange={(val) => update({ autoNormalization: val })}
								accentColor="#10b981"
							/>
						</div>

						<div className={cn("h-[1px] w-full", isLight ? "bg-slate-100" : "bg-white/[0.06]")} />

						{/* Volume Slider */}
						<div className="space-y-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className={cn("font-medium", isLight ? "text-slate-700" : "text-slate-300")}>
									Volume Gain
								</span>
								<span className="font-mono font-bold text-emerald-600 text-[11px]">
									{state.volumeDb > 0 ? `+${state.volumeDb.toFixed(1)}` : state.volumeDb.toFixed(1)}{" "}
									dB
								</span>
							</div>
							<Slider
								value={[state.volumeDb]}
								min={-24}
								max={12}
								step={0.5}
								onValueChange={([val]) => update({ volumeDb: val })}
								accentColor="#10b981"
								className="w-full"
							/>
						</div>

						{/* Audio Channels */}
						<div className="space-y-1.5">
							<span
								className={cn(
									"text-xs font-medium block",
									isLight ? "text-slate-700" : "text-slate-300",
								)}
							>
								Audio Channels
							</span>
							<Select
								value={state.audioChannels}
								onValueChange={(val: "none" | "stereo" | "mono") => update({ audioChannels: val })}
							>
								<SelectTrigger
									className={cn(
										"h-8 text-xs rounded-xl",
										isLight
											? "bg-slate-50 border-slate-200 text-slate-800"
											: "bg-white/[0.03] border-white/10 text-white",
									)}
								>
									<SelectValue placeholder="Channels" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									<SelectItem value="stereo">Stereo (L/R)</SelectItem>
									<SelectItem value="mono">Mono</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Sound Balance L / R */}
						<div className="space-y-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className={cn("font-medium", isLight ? "text-slate-700" : "text-slate-300")}>
									Sound Balance
								</span>
								<span className="font-mono text-[11px] text-slate-400">
									{state.soundBalance === 0
										? "Center"
										: state.soundBalance < 0
											? `L ${Math.abs(state.soundBalance)}`
											: `R ${state.soundBalance}`}
								</span>
							</div>
							<Slider
								value={[state.soundBalance]}
								min={-50}
								max={50}
								step={1}
								onValueChange={([val]) => update({ soundBalance: val })}
								accentColor="#10b981"
								className="w-full"
							/>
						</div>
					</div>

					{/* Card 2: Fades, Pitch & Ducking */}
					<div
						className={cn(
							"p-3.5 rounded-2xl border space-y-3 shadow-xs",
							isLight ? "bg-white/90 border-slate-200" : "bg-white/[0.04] border-white/[0.08]",
						)}
					>
						<span
							className={cn(
								"text-xs font-bold uppercase tracking-wider block",
								isLight ? "text-slate-600" : "text-slate-400",
							)}
						>
							Transitions & Pitch
						</span>

						{/* Fade In & Out */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<div className="flex items-center justify-between text-xs">
									<span
										className={cn("font-medium", isLight ? "text-slate-700" : "text-slate-300")}
									>
										Fade In
									</span>
									<span className="font-mono text-[11px] text-slate-400 font-semibold">
										{state.fadeInSec.toFixed(1)}s
									</span>
								</div>
								<Slider
									value={[state.fadeInSec]}
									min={0}
									max={5}
									step={0.1}
									onValueChange={([val]) => update({ fadeInSec: val })}
									accentColor="#10b981"
								/>
							</div>

							<div className="space-y-1.5">
								<div className="flex items-center justify-between text-xs">
									<span
										className={cn("font-medium", isLight ? "text-slate-700" : "text-slate-300")}
									>
										Fade Out
									</span>
									<span className="font-mono text-[11px] text-slate-400 font-semibold">
										{state.fadeOutSec.toFixed(1)}s
									</span>
								</div>
								<Slider
									value={[state.fadeOutSec]}
									min={0}
									max={5}
									step={0.1}
									onValueChange={([val]) => update({ fadeOutSec: val })}
									accentColor="#10b981"
								/>
							</div>
						</div>

						<div className={cn("h-[1px] w-full", isLight ? "bg-slate-100" : "bg-white/[0.06]")} />

						{/* Pitch */}
						<div className="space-y-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className={cn("font-medium", isLight ? "text-slate-700" : "text-slate-300")}>
									Pitch Shift
								</span>
								<span className="font-mono text-[11px] text-emerald-600 font-bold">
									{state.pitch > 0 ? `+${state.pitch}` : state.pitch} st
								</span>
							</div>
							<Slider
								value={[state.pitch]}
								min={-12}
								max={12}
								step={1}
								onValueChange={([val]) => update({ pitch: val })}
								accentColor="#10b981"
							/>
						</div>

						{/* Audio Ducking */}
						<div className="space-y-2 pt-1">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<span
										className={cn(
											"text-xs font-bold block",
											isLight ? "text-slate-800" : "text-slate-100",
										)}
									>
										Audio Ducking
									</span>
									<span className="text-[10px] text-slate-400 block">
										Lower BGM when voice is detected
									</span>
								</div>
								<Switch
									checked={state.audioDucking}
									onCheckedChange={(val) => update({ audioDucking: val })}
									accentColor="#10b981"
								/>
							</div>
							{state.audioDucking && (
								<Slider
									value={[state.duckingAmount]}
									min={10}
									max={90}
									step={5}
									onValueChange={([val]) => update({ duckingAmount: val })}
									accentColor="#10b981"
								/>
							)}
						</div>

						{/* Equalizer */}
						<div className="space-y-1.5 pt-1">
							<span
								className={cn(
									"text-xs font-medium block",
									isLight ? "text-slate-700" : "text-slate-300",
								)}
							>
								Equalizer Preset
							</span>
							<Select
								value={state.equalizerPreset}
								onValueChange={(val) => update({ equalizerPreset: val })}
							>
								<SelectTrigger
									className={cn(
										"h-8 text-xs rounded-xl",
										isLight
											? "bg-slate-50 border-slate-200 text-slate-800"
											: "bg-white/[0.03] border-white/10 text-white",
									)}
								>
									<SelectValue placeholder="Equalizer" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="default">Default Flat</SelectItem>
									<SelectItem value="pop">Pop Music</SelectItem>
									<SelectItem value="rock">Rock / Punchy</SelectItem>
									<SelectItem value="bass-boost">Bass Boost</SelectItem>
									<SelectItem value="vocal-boost">Vocal Clarity Boost</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			)}

			{activeSubTab === "voice" && (
				<div className="space-y-3">
					{/* AI Voice Enhancer */}
					<div
						className={cn(
							"p-3.5 rounded-2xl border space-y-3 shadow-xs",
							isLight ? "bg-white/90 border-slate-200" : "bg-white/[0.04] border-white/[0.08]",
						)}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-500">
									<Sparkles className="w-3.5 h-3.5" />
								</div>
								<div>
									<div
										className={cn(
											"text-xs font-bold flex items-center gap-1.5",
											isLight ? "text-slate-800" : "text-slate-100",
										)}
									>
										AI Voice Enhancer
										<span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-pink-500 text-white">
											NEW
										</span>
									</div>
									<div className="text-[10px] text-slate-400">
										Noise reduction & studio mic simulation
									</div>
								</div>
							</div>
							<Switch
								checked={state.aiVoiceEnhance}
								onCheckedChange={(val) => update({ aiVoiceEnhance: val })}
								accentColor="#ec4899"
							/>
						</div>

						{state.aiVoiceEnhance && (
							<div className="space-y-1.5 pt-1">
								<div className="flex items-center justify-between text-xs">
									<span
										className={cn("font-medium", isLight ? "text-slate-700" : "text-slate-300")}
									>
										Voice Clarity
									</span>
									<span className="font-mono text-[11px] text-pink-500 font-bold">
										{state.voiceClarity}%
									</span>
								</div>
								<Slider
									value={[state.voiceClarity]}
									min={0}
									max={100}
									step={5}
									onValueChange={([val]) => update({ voiceClarity: val })}
									accentColor="#ec4899"
								/>
							</div>
						)}
					</div>

					{/* Voice Changer Presets */}
					<div
						className={cn(
							"p-3.5 rounded-2xl border space-y-3 shadow-xs",
							isLight ? "bg-white/90 border-slate-200" : "bg-white/[0.04] border-white/[0.08]",
						)}
					>
						<span
							className={cn(
								"text-xs font-bold uppercase tracking-wider block",
								isLight ? "text-slate-600" : "text-slate-400",
							)}
						>
							Voice Changer
						</span>
						<div className="grid grid-cols-2 gap-2">
							{[
								{ id: "none", name: "None (Natural)" },
								{ id: "deep", name: "Deep Radio Voice" },
								{ id: "robot", name: "Robot Vocoder" },
								{ id: "chipmunk", name: "Helium Voice" },
								{ id: "echo", name: "Studio Reverb" },
								{ id: "telephone", name: "Lo-Fi Phone" },
							].map((vc) => {
								const isSelected = state.voiceChangerPreset === vc.id;
								return (
									<button
										key={vc.id}
										type="button"
										onClick={() => {
											update({ voiceChangerPreset: vc.id });
											toast.info(`Voice Changer: ${vc.name}`);
										}}
										className={cn(
											"p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer shadow-2xs",
											isSelected
												? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
												: isLight
													? "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300"
													: "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5 hover:border-white/20",
										)}
									>
										{vc.name}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* Reset Button */}
			<div className="pt-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => {
						onReset?.();
					}}
					className={cn(
						"w-full h-8 text-xs font-bold rounded-xl cursor-pointer border flex items-center justify-center gap-1.5",
						isLight
							? "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
							: "border-white/10 text-slate-300 hover:text-white hover:bg-white/5",
					)}
				>
					<RotateCcw className="w-3.5 h-3.5" />
					Reset Audio to Default
				</Button>
			</div>
		</div>
	);
}
