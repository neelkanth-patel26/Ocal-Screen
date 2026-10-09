import { Diamond, Music2, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
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

export interface AudioSettingsState {
	trackName: string;
	volumeDb: number; // -24 to +12, default 0
	autoNormalization: boolean;
	audioChannels: "none" | "stereo" | "mono";
	soundBalance: number; // -100 (L) to +100 (R), default 0
	fadeInSec: number; // 0 to 5
	fadeOutSec: number; // 0 to 5
	pitch: number; // -12 to 12, default 0
	audioDucking: boolean;
	duckingAmount: number; // 0 to 100, default 50
	equalizerPreset: string;
	aiVoiceEnhance: boolean;
	voiceClarity: number; // 0 to 100, default 80
	voiceChangerPreset?: string;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettingsState = {
	trackName: "SEM DEMORA (Slowed)",
	volumeDb: 0,
	autoNormalization: false,
	audioChannels: "stereo",
	soundBalance: 0,
	fadeInSec: 0,
	fadeOutSec: 0,
	pitch: 0,
	audioDucking: false,
	duckingAmount: 50,
	equalizerPreset: "Default",
	aiVoiceEnhance: false,
	voiceClarity: 80,
	voiceChangerPreset: "None",
};

export interface FilmoraAudioInspectorProps {
	audioSettings?: Partial<AudioSettingsState>;
	onAudioSettingsChange?: (settings: AudioSettingsState) => void;
	settings?: AudioSettingsState;
	onSettingsChange?: (settings: AudioSettingsState) => void;
	onReset?: () => void;
	onClose?: () => void;
	onSwitchToSpeedTab?: () => void;
	trackName?: string;
	audioTrackName?: string;
	themeMode?: "light" | "dark" | "system";
}

export function FilmoraAudioInspector({
	audioSettings = {},
	onAudioSettingsChange,
	settings,
	onSettingsChange,
	onReset,
	onClose,
	onSwitchToSpeedTab,
	trackName,
	audioTrackName,
}: FilmoraAudioInspectorProps) {
	const [activeTopTab, setActiveTopTab] = useState<"audio" | "speed">("audio");
	const [activeSubTab, setActiveSubTab] = useState<"basic" | "voice-changer">("basic");

	const currentTrackName =
		audioTrackName || trackName || settings?.trackName || "SEM DEMORA (Slowed)";

	const [state, setState] = useState<AudioSettingsState>({
		...DEFAULT_AUDIO_SETTINGS,
		...audioSettings,
		...(settings ?? {}),
		trackName: currentTrackName,
	});

	useEffect(() => {
		if (settings) {
			setState((prev) => ({ ...prev, ...settings, trackName: currentTrackName }));
		}
	}, [settings, currentTrackName]);

	const update = (patch: Partial<AudioSettingsState>) => {
		const next = { ...state, ...patch };
		setState(next);
		onAudioSettingsChange?.(next);
		onSettingsChange?.(next);
	};

	const handleReset = () => {
		setState(DEFAULT_AUDIO_SETTINGS);
		onAudioSettingsChange?.(DEFAULT_AUDIO_SETTINGS);
		onSettingsChange?.(DEFAULT_AUDIO_SETTINGS);
		onReset?.();
		toast.info("Audio settings reset to default");
	};

	return (
		<div className="filmora-audio-inspector flex flex-col h-full bg-[#111218] border-l border-[#1f202b] text-slate-200 select-none overflow-hidden font-sans">
			{/* Top Tabs: Audio | Speed */}
			<div className="flex items-center px-4 border-b border-[#1f202b] bg-[#0d0e14] gap-6 shrink-0 h-10">
				<button
					type="button"
					onClick={() => setActiveTopTab("audio")}
					className={cn(
						"h-full text-xs font-semibold relative transition-colors",
						activeTopTab === "audio" ? "text-cyan-400" : "text-slate-400 hover:text-white",
					)}
				>
					<span>Audio</span>
					{activeTopTab === "audio" && (
						<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
					)}
				</button>
				<button
					type="button"
					onClick={() => {
						setActiveTopTab("speed");
						onSwitchToSpeedTab?.();
					}}
					className={cn(
						"h-full text-xs font-semibold relative transition-colors",
						activeTopTab === "speed" ? "text-cyan-400" : "text-slate-400 hover:text-white",
					)}
				>
					<span>Speed</span>
					{activeTopTab === "speed" && (
						<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
					)}
				</button>

				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="ml-auto p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
						title="Close Inspector"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{/* Sub Tabs: Basic | Voice Changer */}
			<div className="flex items-center px-4 py-2 bg-[#12131b] border-b border-[#1c1d27] gap-2 shrink-0">
				<button
					type="button"
					onClick={() => setActiveSubTab("basic")}
					className={cn(
						"px-3 py-1 rounded-full text-[11px] font-semibold transition-all",
						activeSubTab === "basic"
							? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
							: "text-slate-400 hover:text-white hover:bg-white/[0.04]",
					)}
				>
					Basic
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("voice-changer")}
					className={cn(
						"px-3 py-1 rounded-full text-[11px] font-semibold transition-all",
						activeSubTab === "voice-changer"
							? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
							: "text-slate-400 hover:text-white hover:bg-white/[0.04]",
					)}
				>
					Voice Changer
				</button>
			</div>

			{/* Scrollable Content Body */}
			<div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar text-xs">
				{activeSubTab === "basic" ? (
					<>
						{/* Green Audio Waveform Banner (Exact Filmora Look) */}
						<div className="rounded-xl overflow-hidden border border-emerald-500/40 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-[#0e2a1e] p-3 shadow-lg">
							<div className="flex items-center justify-between gap-2 mb-2">
								<div className="flex items-center gap-2 min-w-0">
									<Music2 className="w-4 h-4 text-emerald-300 shrink-0" />
									<span className="font-semibold text-white truncate text-xs">
										{state.trackName}
									</span>
								</div>
								<span className="text-[10px] font-mono text-emerald-300 tabular-nums">
									{state.volumeDb >= 0
										? `+${state.volumeDb.toFixed(2)}`
										: state.volumeDb.toFixed(2)}{" "}
									dB
								</span>
							</div>

							{/* Simulated waveform peak bars */}
							<div className="h-6 flex items-end justify-between gap-[2px] opacity-80 px-1 py-0.5 bg-black/30 rounded">
								{[
									24, 45, 78, 62, 90, 84, 55, 30, 48, 88, 100, 75, 60, 40, 65, 82, 95, 70, 45, 52,
									68, 85, 92, 60, 35, 48, 72, 80, 58, 32,
								].map((h, idx) => (
									<div
										key={idx}
										className="flex-1 bg-emerald-400 rounded-t-[1px]"
										style={{ height: `${h}%` }}
									/>
								))}
							</div>
						</div>

						{/* Adjustment Section */}
						<div className="space-y-3.5 pt-1">
							<div className="flex items-center justify-between text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
								<span>Adjustment</span>
								<Diamond className="w-3 h-3 text-slate-500 hover:text-cyan-400 cursor-pointer transition-colors" />
							</div>

							{/* Auto Normalization */}
							<div className="flex items-center justify-between py-1">
								<span className="text-slate-300">Auto Normalization</span>
								<Switch
									checked={state.autoNormalization}
									onCheckedChange={(v) => update({ autoNormalization: v })}
									className="scale-90"
								/>
							</div>

							{/* Volume Slider */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-slate-300">Volume</span>
									<span className="font-mono text-slate-400 tabular-nums text-[11px]">
										{state.volumeDb.toFixed(2)} dB
									</span>
								</div>
								<div className="flex items-center gap-3">
									<Slider
										value={[state.volumeDb]}
										min={-24}
										max={12}
										step={0.5}
										onValueChange={([val]) => update({ volumeDb: val })}
										className="flex-1"
									/>
									<Diamond className="w-3 h-3 text-slate-500 shrink-0 hover:text-cyan-400 cursor-pointer" />
								</div>
							</div>

							{/* Audio Channels */}
							<div className="space-y-1.5">
								<span className="text-slate-300">Audio Channels</span>
								<Select
									value={state.audioChannels}
									onValueChange={(val: "none" | "stereo" | "mono") =>
										update({ audioChannels: val })
									}
								>
									<SelectTrigger className="h-7 text-xs bg-[#161722] border-[#252736] text-white">
										<SelectValue placeholder="Audio Channels" />
									</SelectTrigger>
									<SelectContent className="bg-[#161722] border-[#252736] text-white">
										<SelectItem value="none">None</SelectItem>
										<SelectItem value="stereo">Stereo</SelectItem>
										<SelectItem value="mono">Mono</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Sound Balance */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-slate-300">Sound Balance</span>
									<span className="font-mono text-slate-400 tabular-nums text-[11px]">
										{state.soundBalance === 0
											? "0.00"
											: state.soundBalance > 0
												? `R ${state.soundBalance}`
												: `L ${Math.abs(state.soundBalance)}`}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-[10px] font-bold text-slate-500">L</span>
									<Slider
										value={[state.soundBalance]}
										min={-100}
										max={100}
										step={1}
										onValueChange={([val]) => update({ soundBalance: val })}
										className="flex-1"
									/>
									<span className="text-[10px] font-bold text-slate-500">R</span>
									<Diamond className="w-3 h-3 text-slate-500 shrink-0" />
								</div>
							</div>

							{/* Fade In */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-slate-300">Fade In</span>
									<span className="font-mono text-slate-400 tabular-nums text-[11px]">
										{state.fadeInSec.toFixed(2)} s
									</span>
								</div>
								<Slider
									value={[state.fadeInSec]}
									min={0}
									max={5}
									step={0.1}
									onValueChange={([val]) => update({ fadeInSec: val })}
								/>
							</div>

							{/* Fade Out */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-slate-300">Fade Out</span>
									<span className="font-mono text-slate-400 tabular-nums text-[11px]">
										{state.fadeOutSec.toFixed(2)} s
									</span>
								</div>
								<Slider
									value={[state.fadeOutSec]}
									min={0}
									max={5}
									step={0.1}
									onValueChange={([val]) => update({ fadeOutSec: val })}
								/>
							</div>

							{/* Pitch */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-slate-300">Pitch</span>
									<span className="font-mono text-slate-400 tabular-nums text-[11px]">
										{state.pitch > 0 ? `+${state.pitch}` : state.pitch}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<Slider
										value={[state.pitch]}
										min={-12}
										max={12}
										step={1}
										onValueChange={([val]) => update({ pitch: val })}
										className="flex-1"
									/>
									<Diamond className="w-3 h-3 text-slate-500 shrink-0" />
								</div>
							</div>

							{/* Audio Ducking */}
							<div className="space-y-2 pt-1 border-t border-[#1c1d27]">
								<div className="flex items-center justify-between">
									<span className="text-slate-300">Audio Ducking</span>
									<Switch
										checked={state.audioDucking}
										onCheckedChange={(v) => update({ audioDucking: v })}
										className="scale-90"
									/>
								</div>
								{state.audioDucking && (
									<div className="space-y-1">
										<div className="flex justify-between text-[11px] text-slate-400">
											<span>Ducking Level</span>
											<span className="font-mono">{state.duckingAmount}%</span>
										</div>
										<Slider
											value={[state.duckingAmount]}
											min={10}
											max={90}
											step={5}
											onValueChange={([val]) => update({ duckingAmount: val })}
										/>
									</div>
								)}
							</div>

							{/* Equalizer */}
							<div className="space-y-1.5 pt-1">
								<span className="text-slate-300">Equalizer</span>
								<div className="flex items-center gap-2">
									<Select
										value={state.equalizerPreset}
										onValueChange={(val) => update({ equalizerPreset: val })}
									>
										<SelectTrigger className="h-7 text-xs bg-[#161722] border-[#252736] text-white flex-1">
											<SelectValue placeholder="Equalizer" />
										</SelectTrigger>
										<SelectContent className="bg-[#161722] border-[#252736] text-white">
											<SelectItem value="Default">Default</SelectItem>
											<SelectItem value="Pop">Pop</SelectItem>
											<SelectItem value="Rock">Rock</SelectItem>
											<SelectItem value="Classical">Classical</SelectItem>
											<SelectItem value="Bass Boost">Bass Boost</SelectItem>
											<SelectItem value="Voice Enhance">Voice Enhance</SelectItem>
											<SelectItem value="Podcast">Podcast</SelectItem>
										</SelectContent>
									</Select>
									<Button
										size="sm"
										variant="outline"
										onClick={() => toast.info(`EQ Preset: ${state.equalizerPreset}`)}
										className="h-7 px-2.5 text-xs bg-[#161722] border-[#252736] text-slate-300 hover:text-white"
									>
										Setting
									</Button>
								</div>
							</div>
						</div>

						{/* AI Voice Enhancer (NEW badge) */}
						<div className="pt-3 border-t border-[#1c1d27] space-y-2.5">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Switch
										checked={state.aiVoiceEnhance}
										onCheckedChange={(v) => update({ aiVoiceEnhance: v })}
										className="scale-90"
									/>
									<span className="font-medium text-white text-xs">AI Voice Enhancer</span>
									<span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-pink-500 text-white uppercase tracking-wider">
										NEW
									</span>
								</div>
							</div>

							{state.aiVoiceEnhance && (
								<div className="space-y-1.5 pl-6">
									<div className="flex items-center justify-between text-slate-400 text-[11px]">
										<span>Voice Clarity</span>
										<span className="font-mono text-cyan-400 tabular-nums">
											{state.voiceClarity.toFixed(2)}
										</span>
									</div>
									<Slider
										value={[state.voiceClarity]}
										min={0}
										max={100}
										step={1}
										onValueChange={([val]) => update({ voiceClarity: val })}
									/>
								</div>
							)}
						</div>
					</>
				) : (
					/* Voice Changer Tab */
					<div className="space-y-3 py-2">
						<span className="text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
							Voice Changer Effects
						</span>
						<div className="grid grid-cols-2 gap-2">
							{["Robot", "Chipmunk", "Deep Male", "Warm Female", "Echo Chamber", "Telephone"].map(
								(fx) => (
									<button
										key={fx}
										type="button"
										onClick={() => {
											update({ voiceChangerPreset: fx });
											toast.success(`Voice filter: ${fx}`);
										}}
										className={cn(
											"p-2.5 rounded-lg border text-left transition-all",
											state.voiceChangerPreset === fx
												? "border-cyan-400 bg-cyan-950/30 text-cyan-300 font-semibold"
												: "border-[#202230] bg-[#141622] text-slate-300 hover:border-slate-600",
										)}
									>
										<span className="text-xs block">{fx}</span>
									</button>
								),
							)}
						</div>
					</div>
				)}
			</div>

			{/* Reset Button Footer */}
			<div className="p-3 border-t border-[#1c1d27] bg-[#0d0e14] shrink-0">
				<Button
					size="sm"
					variant="outline"
					onClick={handleReset}
					className="h-7 text-xs gap-1.5 bg-[#171824] border-[#27293a] text-slate-300 hover:text-white hover:bg-white/[0.08]"
				>
					<RotateCcw className="w-3 h-3 text-slate-400" />
					<span>Reset</span>
				</Button>
			</div>
		</div>
	);
}
