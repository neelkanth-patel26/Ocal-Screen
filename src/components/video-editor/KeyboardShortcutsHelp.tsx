import { HelpCircle, Settings2 } from "lucide-react";
import { useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { FIXED_SHORTCUTS, formatBinding, SHORTCUT_ACTIONS } from "@/lib/shortcuts";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { BLUR_REGIONS_ENABLED } from "./featureFlags";

export function KeyboardShortcutsHelp() {
	const { shortcuts, isMac, openConfig } = useShortcuts();
	const t = useScopedT("shortcuts");
	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = prefs.theme === "light";

	return (
		<div className="relative group">
			<HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-200 transition-colors cursor-help" />

			<div
				className={`absolute right-0 top-full mt-2 w-64 border rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-2xl z-50 ${isLight ? "bg-white border-[#e4e4e7]" : "bg-[#0f1015] border-white/10"}`}
			>
				<div className="flex items-center justify-between mb-2">
					<span className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
						{t("title")}
					</span>
					<button
						type="button"
						onClick={openConfig}
						title="Customize shortcuts"
						className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
					>
						<Settings2 className="w-3 h-3" />
						{t("customize")}
					</button>
				</div>

				<div className="space-y-1.5 text-[10px]">
					{SHORTCUT_ACTIONS.filter((action) => BLUR_REGIONS_ENABLED || action !== "addBlur").map(
						(action) => (
							<div key={action} className="flex items-center justify-between">
								<span className={isLight ? "text-slate-600" : "text-slate-400"}>
									{t(`actions.${action}`)}
								</span>
								<kbd
									className={`px-1.5 py-0.5 rounded-md font-mono font-bold border ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/10 border-white/10"}`}
									style={{ color: activeAccent.hex }}
								>
									{formatBinding(shortcuts[action], isMac)}
								</kbd>
							</div>
						),
					)}

					<div
						className={`pt-1.5 border-t mt-1.5 space-y-1.5 ${isLight ? "border-slate-200" : "border-white/10"}`}
					>
						{FIXED_SHORTCUTS.map((fixed) => (
							<div key={fixed.i18nKey} className="flex items-center justify-between">
								<span className={isLight ? "text-slate-600" : "text-slate-400"}>
									{t(`fixedActions.${fixed.i18nKey}`, { defaultValue: fixed.label })}
								</span>
								<kbd
									className={`px-1.5 py-0.5 rounded-md font-mono font-bold border ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/10 border-white/10"}`}
									style={{ color: activeAccent.hex }}
								>
									{isMac
										? fixed.display
												.replace(/Ctrl/g, "⌘")
												.replace(/Shift/g, "⇧")
												.replace(/Alt/g, "⌥")
										: fixed.display}
								</kbd>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
