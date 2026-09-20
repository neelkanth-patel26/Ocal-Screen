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

	const [isScrubbing, setIsScrubbing] = useState(false);
	const [scrubTime, setScrubTime] = useState<number | null>(null);

	useEffect(() => {
		if (!isScrubbing) return;
		const handleRelease = () => {
			setIsScrubbing(false);
			setScrubTime(null);
		};
		window.addEventListener("pointerup", handleRelease);
		window.addEventListener("pointercancel", handleRelease);
		return () => {
			window.removeEventListener("pointerup", handleRelease);
			window.removeEventListener("pointercancel", handleRelease);
		};
	}, [isScrubbing]);

	function formatTime(seconds: number) {
		if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			// ignore
		}
		setIsScrubbing(true);
		const rect = e.currentTarget.getBoundingClientRect();
		if (rect.width > 0) {
			const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const time = ratio * (duration || 0);
			setScrubTime(time);
			onSeek(time);
		}
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
		if (!isScrubbing) return;
		const rect = e.currentTarget.getBoundingClientRect();
		if (rect.width > 0) {
			const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const time = ratio * (duration || 0);
			setScrubTime(time);
			onSeek(time);
		}
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
		try {
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId);
			}
		} catch {
			// ignore
		}
		setIsScrubbing(false);
		setScrubTime(null);
	};

	function handleSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
		const val = parseFloat(e.target.value);
		if (!isNaN(val)) {
			setScrubTime(val);
			onSeek(val);
		}
	}

	const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
	const progress = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;

	return (
		<div
			className={cn(
				"flex items-center gap-3.5 px-4 py-2 rounded-2xl border shadow-2xl transition-all duration-300 select-none backdrop-blur-2xl",
				isLight
					? "bg-white/95 border-black/[0.08] text-zinc-900 shadow-[0_12px_36px_rgba(0,0,0,0.08)]"
					: "bg-[#0f1118]/90 border-white/[0.09] text-white shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:border-white/[0.14]",
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
					"w-10 h-10 rounded-xl transition-all duration-200 border active:scale-95 cursor-pointer shadow-sm shrink-0",
					isPlaying
						? isLight
							? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border-zinc-200"
							: "bg-white/10 text-white hover:bg-white/20 border-white/10"
						: "border-transparent hover:opacity-90 hover:scale-105",
				)}
				aria-label={isPlaying ? t("playback.pause") : t("playback.play")}
			>
				{isPlaying ? (
					<Pause className="w-5 h-5 fill-current" />
				) : (
					<Play className="w-5 h-5 fill-current ml-0.5" />
				)}
			</Button>

			<div className="flex items-center min-w-[34px] justify-end">
				<span
					className={cn(
						"text-xs font-mono font-semibold tracking-tight tabular-nums",
						isLight ? "text-slate-800" : "text-slate-200",
					)}
				>
					{formatTime(displayTime)}
				</span>
			</div>

			<div className="flex-1 relative h-6 flex items-center group cursor-pointer min-w-[120px]">
				{/* Custom Track Background */}
				<div
					className={cn(
						"absolute left-0 right-0 h-1.5 rounded-full overflow-hidden transition-colors",
						isLight ? "bg-zinc-200" : "bg-white/10",
					)}
				>
					<div
						className="h-full rounded-full !transition-none"
						style={{
							width: `${progress}%`,
							backgroundColor: activeAccent.hex,
							transition: "none",
						}}
					/>
				</div>

				{/* Interactive Range Input */}
				<input
					type="range"
					min="0"
					max={duration || 100}
					value={displayTime}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onChange={handleSeekChange}
					onInput={(e) => handleSeekChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
					step="0.01"
					className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
					aria-label={t("playback.seek")}
				/>

				{/* Custom Thumb Indicator */}
				<div
					className="absolute top-1/2 -mt-2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none group-hover:scale-125 transition-transform duration-150"
					style={{
						left: `${progress}%`,
						transform: "translateX(-50%)",
						backgroundColor: activeAccent.hex,
					}}
				/>
			</div>

			<div className="flex items-center min-w-[34px]">
				<span
					className={cn(
						"text-xs font-mono font-medium tracking-tight tabular-nums",
						isLight ? "text-slate-400" : "text-slate-500",
					)}
				>
					{formatTime(duration)}
				</span>
			</div>

			{onToggleFullscreen && (
				<Button
					onClick={onToggleFullscreen}
					size="icon"
					variant="ghost"
					className={cn(
						"w-7 h-7 rounded-lg transition-all duration-200 border border-transparent shrink-0 shadow-none cursor-pointer",
						isLight
							? "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
							: "hover:bg-white/10 text-zinc-400 hover:text-white",
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
