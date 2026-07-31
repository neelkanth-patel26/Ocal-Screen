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

	const dim =
		size === "sm"
			? { box: 24, stroke: 2.5 }
			: size === "lg"
				? { box: 48, stroke: 3 }
				: { box: 36, stroke: 2.5 };

	const r = (dim.box - dim.stroke * 2) / 2;
	const circumference = 2 * Math.PI * r;
	const trackColor = isLight ? "#e4e4e7" : "#27272a";

	return (
		<div className={`flex flex-col items-center justify-center gap-3 select-none ${className}`}>
			{/* Spinner */}
			<svg
				width={dim.box}
				height={dim.box}
				viewBox={`0 0 ${dim.box} ${dim.box}`}
				fill="none"
				className="animate-[spin_0.9s_linear_infinite]"
			>
				{/* Track ring */}
				<circle
					cx={dim.box / 2}
					cy={dim.box / 2}
					r={r}
					stroke={trackColor}
					strokeWidth={dim.stroke}
				/>
				{/* Accent arc */}
				<circle
					cx={dim.box / 2}
					cy={dim.box / 2}
					r={r}
					stroke={activeAccent.hex}
					strokeWidth={dim.stroke}
					strokeLinecap="round"
					strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
				/>
			</svg>

			{/* Text label */}
			{text && (
				<p
					className={`text-xs font-medium tracking-wide ${
						isLight ? "text-[#3f3f46]" : "text-[#a1a1aa]"
					}`}
				>
					{text}
				</p>
			)}
		</div>
	);
}
