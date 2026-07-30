import { Maximize, Minimize, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useScopedT } from "@/contexts/I18nContext";
import { ACCENT_COLOR_MAP, type AccentColor, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface PlaybackControlsProps {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	isFullscreen?: boolean;
	onToggleFullscreen?: () => void;
	onTogglePlayPause: () => void;
	onSeek: (time: number) => void;
	accentColor?: AccentColor;
	themeMode?: "dark" | "light";
}

export default function PlaybackControls({
	isPlaying,
	currentTime,
	duration,
	isFullscreen = false,
	onToggleFullscreen,
	onTogglePlayPause,
	onSeek,
	accentColor: explicitAccent,
	themeMode: explicitTheme,
}: PlaybackControlsProps) {
	const t = useScopedT("common");

	const [accentColor, setAccentColor] = useState<AccentColor>(
		() => explicitAccent || loadUserPreferences().accentColor || "lime",
	);
	const [themeMode, setThemeMode] = useState<"dark" | "light">(
		() => explicitTheme || loadUserPreferences().theme || "dark",
	);

	useEffect(() => {
		if (explicitAccent) setAccentColor(explicitAccent);
		if (explicitTheme) setThemeMode(explicitTheme);

		if (!explicitAccent || !explicitTheme) {
			const syncPrefs = () => {
				const prefs = loadUserPreferences();
				if (!explicitAccent) setAccentColor(prefs.accentColor || "lime");
				if (!explicitTheme) setThemeMode(prefs.theme || "dark");
			};
			window.addEventListener("storage", syncPrefs);
			const timer = setInterval(syncPrefs, 400);
			return () => {
				window.removeEventListener("storage", syncPrefs);
				clearInterval(timer);
			};
		}
	}, [explicitAccent, explicitTheme]);

	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = themeMode === "light";

	function formatTime(seconds: number) {
		if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	function handleSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
		onSeek(parseFloat(e.target.value));
	}

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div
			className={cn(
				"flex items-center gap-2.5 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-2xl transition-all duration-300",
				isLight
					? "bg-white/80 border-[#e4e4e7] text-[#18181b] hover:bg-white/95 hover:border-[#d4d4d8]"
					: "bg-black/70 border-white/10 text-white hover:bg-black/85 hover:border-white/20",
			)}
		>
			<Button
				onClick={onTogglePlayPause}
				size="icon"
				style={
					!isPlaying
						? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
						: undefined
				}
				className={cn(
					"w-7 h-7 rounded-full transition-all duration-200 border active:scale-95 cursor-pointer shadow-md",
					isPlaying
						? isLight
							? "bg-[#f4f4f5] text-[#18181b] hover:bg-[#e4e4e7] border-[#e4e4e7]"
							: "bg-white/10 text-white hover:bg-white/20 border-white/10"
						: "border-transparent hover:opacity-90 hover:scale-105",
				)}
				aria-label={isPlaying ? t("playback.pause") : t("playback.play")}
			>
				{isPlaying ? (
					<Pause className="w-3.5 h-3.5 fill-current" />
				) : (
					<Play className="w-3.5 h-3.5 fill-current ml-0.5" />
				)}
			</Button>

			<span
				className={cn(
					"text-[10px] font-bold tabular-nums min-w-[32px] text-right",
					isLight ? "text-[#52525b]" : "text-slate-300",
				)}
			>
				{formatTime(currentTime)}
			</span>

			<div className="flex-1 relative h-6 flex items-center group cursor-pointer">
				{/* Custom Track Background */}
				<div
					className={cn(
						"absolute left-0 right-0 h-1 rounded-full overflow-hidden transition-colors",
						isLight ? "bg-[#e4e4e7]" : "bg-white/15",
					)}
				>
					<div
						className="h-full rounded-full transition-all duration-75"
						style={{
							width: `${progress}%`,
							backgroundColor: activeAccent.hex,
							boxShadow: `0 0 8px ${activeAccent.hex}80`,
						}}
					/>
				</div>

				{/* Interactive Input */}
				<input
					type="range"
					min="0"
					max={duration || 100}
					value={currentTime}
					onChange={handleSeekChange}
					step="0.01"
					className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
				/>

				{/* Custom Thumb */}
				<div
					className="absolute w-3 h-3 rounded-full shadow-md pointer-events-none group-hover:scale-125 transition-transform duration-100"
					style={{
						left: `${progress}%`,
						transform: "translateX(-50%)",
						backgroundColor: activeAccent.hex,
						boxShadow: `0 0 10px ${activeAccent.hex}`,
					}}
				/>
			</div>

			<span
				className={cn(
					"text-[10px] font-bold tabular-nums min-w-[32px]",
					isLight ? "text-[#a1a1aa]" : "text-slate-500",
				)}
			>
				{formatTime(duration)}
			</span>

			{onToggleFullscreen && (
				<Button
					onClick={onToggleFullscreen}
					size="icon"
					variant="ghost"
					className={cn(
						"w-7 h-7 rounded-full transition-all duration-200 border border-transparent shrink-0 shadow-none cursor-pointer",
						isLight
							? "hover:bg-[#f4f4f5] text-[#52525b] hover:text-[#18181b]"
							: "hover:bg-white/10 text-slate-300 hover:text-white",
					)}
					aria-label={isFullscreen ? t("playback.exitFullscreen") : t("playback.fullscreen")}
				>
					{isFullscreen ? (
						<Minimize className="w-3.5 h-3.5" />
					) : (
						<Maximize className="w-3.5 h-3.5" />
					)}
				</Button>
			)}
		</div>
	);
}
