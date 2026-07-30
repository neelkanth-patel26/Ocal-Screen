import { useEffect, useState } from "react";
import { ACCENT_COLOR_MAP, type AccentColor, loadUserPreferences } from "@/lib/userPreferences";

interface OcalLoaderProps {
	size?: "sm" | "md" | "lg";
	text?: string;
	className?: string;
	accentColor?: AccentColor;
	themeMode?: "dark" | "light";
}

export function OcalLoader({
	size = "md",
	text,
	className = "",
	accentColor: explicitAccent,
	themeMode: explicitTheme,
}: OcalLoaderProps) {
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

	// Dimensions based on size prop
	const dimensions =
		size === "sm"
			? { box: "w-6 h-6", core: "w-1.5 h-1.5" }
			: size === "lg"
				? { box: "w-16 h-16", core: "w-3 h-3" }
				: { box: "w-10 h-10", core: "w-2 h-2" };

	return (
		<div className={`flex flex-col items-center justify-center gap-3.5 select-none ${className}`}>
			<div className={`relative ${dimensions.box} flex items-center justify-center`}>
				{/* Ambient Glow Backlight */}
				<div
					className="absolute inset-0 rounded-full blur-md opacity-35 animate-pulse"
					style={{ backgroundColor: activeAccent.hex }}
				/>

				{/* Outer Pulsing Aura Ring */}
				<div
					className="absolute inset-[-4px] rounded-full border border-current opacity-20 animate-ping"
					style={{ color: activeAccent.hex }}
				/>

				{/* Outer Rotating Segmented Shutter Ring */}
				<svg
					className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite]"
					viewBox="0 0 50 50"
					fill="none"
				>
					<circle
						cx="25"
						cy="25"
						r="22"
						stroke={isLight ? "#e4e4e7" : "#27272a"}
						strokeWidth="2.5"
						strokeDasharray="4 4"
					/>
					<circle
						cx="25"
						cy="25"
						r="22"
						stroke={activeAccent.hex}
						strokeWidth="3"
						strokeLinecap="round"
						strokeDasharray="35 100"
						style={{ filter: `drop-shadow(0 0 6px ${activeAccent.hex}80)` }}
					/>
				</svg>

				{/* Inner Counter-Rotating Precision Arc Ring */}
				<svg
					className="absolute inset-1 w-[80%] h-[80%] m-auto animate-[spin_1.8s_linear_infinite_reverse]"
					viewBox="0 0 40 40"
					fill="none"
				>
					<circle
						cx="20"
						cy="20"
						r="16"
						stroke={activeAccent.hex}
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeDasharray="25 75"
						opacity="0.9"
					/>
				</svg>

				{/* Center Glowing Lens Core */}
				<div
					className={`${dimensions.core} rounded-full transition-transform duration-300 animate-[bounce_1.5s_infinite]`}
					style={{
						backgroundColor: activeAccent.hex,
						boxShadow: `0 0 12px ${activeAccent.hex}, 0 0 24px ${activeAccent.hex}80`,
					}}
				/>
			</div>

			{text && (
				<div className="flex flex-col items-center gap-1 text-center">
					<p
						className={`text-xs font-bold tracking-wider uppercase transition-colors duration-200 ${
							isLight ? "text-[#18181b]" : "text-[#f4f4f5]"
						}`}
					>
						{text}
					</p>
					<div className="flex items-center gap-1">
						<span
							className="w-1.5 h-1.5 rounded-full animate-bounce"
							style={{ backgroundColor: activeAccent.hex, animationDelay: "0ms" }}
						/>
						<span
							className="w-1.5 h-1.5 rounded-full animate-bounce"
							style={{ backgroundColor: activeAccent.hex, animationDelay: "150ms" }}
						/>
						<span
							className="w-1.5 h-1.5 rounded-full animate-bounce"
							style={{ backgroundColor: activeAccent.hex, animationDelay: "300ms" }}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
