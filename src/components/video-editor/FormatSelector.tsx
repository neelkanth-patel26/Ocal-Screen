import { Film, Image } from "lucide-react";
import { useScopedT } from "@/contexts/I18nContext";
import type { ExportFormat } from "@/lib/exporter/types";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

interface FormatSelectorProps {
	selectedFormat: ExportFormat;
	onFormatChange: (format: ExportFormat) => void;
	disabled?: boolean;
}

const formatOptions: Array<{ value: ExportFormat; icon: React.ReactNode }> = [
	{ value: "mp4", icon: <Film className="w-5 h-5" /> },
	{ value: "gif", icon: <Image className="w-5 h-5" /> },
];

export function FormatSelector({
	selectedFormat,
	onFormatChange,
	disabled = false,
}: FormatSelectorProps) {
	const t = useScopedT("settings");
	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = prefs.theme === "light";

	const formatLabels: Record<ExportFormat, { label: string; description: string }> = {
		mp4: { label: t("exportFormat.mp4Video"), description: t("exportFormat.mp4Description") },
		gif: { label: t("exportFormat.gifAnimation"), description: t("exportFormat.gifDescription") },
	};

	return (
		<div className="grid grid-cols-2 gap-3">
			{formatOptions.map((option) => {
				const isSelected = selectedFormat === option.value;
				const labels = formatLabels[option.value];
				return (
					<button
						key={option.value}
						type="button"
						disabled={disabled}
						onClick={() => onFormatChange(option.value)}
						style={
							isSelected
								? {
										borderColor: activeAccent.hex,
										backgroundColor: `${activeAccent.hex}15`,
										boxShadow: `0 0 0 1px ${activeAccent.hex}40, 0 8px 20px rgba(0,0,0,0.15)`,
									}
								: undefined
						}
						className={cn(
							"relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 cursor-pointer",
							isSelected
								? isLight
									? "text-slate-900"
									: "text-white"
								: isLight
									? "bg-[#f4f4f5] border-[#e4e4e7] text-slate-600 hover:bg-white hover:border-slate-300"
									: "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20 hover:text-slate-200",
							disabled && "opacity-50 cursor-not-allowed",
						)}
					>
						<div
							className={cn(
								"w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
								isSelected ? "" : isLight ? "bg-white text-slate-700" : "bg-white/5",
							)}
							style={
								isSelected
									? { backgroundColor: `${activeAccent.hex}25`, color: activeAccent.hex }
									: undefined
							}
						>
							{option.icon}
						</div>
						<div className="text-center">
							<div className="font-bold text-sm">{labels.label}</div>
							<div className="text-xs text-slate-500 mt-0.5">{labels.description}</div>
						</div>
						{isSelected && (
							<div
								className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
								style={{ backgroundColor: activeAccent.hex }}
							/>
						)}
					</button>
				);
			})}
		</div>
	);
}
