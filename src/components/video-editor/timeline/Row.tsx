import type { RowDefinition } from "dnd-timeline";
import { useRow, useTimelineContext } from "dnd-timeline";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

interface RowProps extends RowDefinition {
	children: React.ReactNode;
	hint?: string;
	isEmpty?: boolean;
	background?: React.ReactNode;
	label?: string;
	icon?: React.ReactNode;
	accentColorHex?: string;
	shortcutKey?: string;
	onAddClick?: () => void;
}

export default function Row({
	id,
	children,
	hint,
	isEmpty,
	background,
	label,
	icon,
	accentColorHex,
	shortcutKey,
	onAddClick,
}: RowProps) {
	const { setNodeRef, rowWrapperStyle, rowStyle } = useRow({ id });
	const { sidebarWidth } = useTimelineContext();

	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = prefs.theme === "light";

	const effectiveColor = accentColorHex || activeAccent.hex;

	return (
		<div
			className={cn(
				"relative overflow-hidden transition-colors border-b",
				isLight
					? "bg-[#f8f8f9] border-[#e4e4e7] hover:bg-[#f1f1f3]"
					: "bg-[#0d0e12] border-white/[0.06] hover:bg-[#121318]",
			)}
			style={{ ...rowWrapperStyle, minHeight: 42 }}
		>
			{background}

			{/* Left Track Badge Header */}
			{label && (
				<div
					className={cn(
						"absolute top-0 bottom-0 left-0 z-20 flex items-center gap-1.5 px-3 border-r select-none pointer-events-none",
						isLight ? "bg-[#ffffff]/90 border-[#e4e4e7]" : "bg-[#090a0c]/90 border-white/[0.08]",
					)}
					style={{ width: sidebarWidth }}
				>
					{icon && <span style={{ color: effectiveColor }}>{icon}</span>}
					<span className={cn("text-[11px] font-bold tracking-tight", isLight ? "text-[#18181b]" : "text-slate-200")}>
						{label}
					</span>
				</div>
			)}

			{/* Empty Track Guidance Pill */}
			{isEmpty && hint && (
				<div
					className="absolute inset-0 flex items-center justify-center pointer-events-auto select-none z-10"
					style={{ paddingLeft: label ? sidebarWidth : 0 }}
				>
					<button
						type="button"
						onClick={onAddClick}
						className={cn(
							"group flex items-center gap-2 px-3 py-1 rounded-full border border-dashed transition-all cursor-pointer shadow-2xs active:scale-95",
							isLight
								? "border-slate-300 bg-white/80 text-slate-500 hover:border-slate-400 hover:text-black hover:bg-white"
								: "border-white/15 bg-white/[0.03] text-slate-400 hover:border-white/30 hover:text-white hover:bg-white/[0.07]",
						)}
					>
						{shortcutKey && (
							<kbd
								className="px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono border transition-colors shadow-xs"
								style={{
									backgroundColor: `${effectiveColor}20`,
									color: effectiveColor,
									borderColor: `${effectiveColor}40`,
								}}
							>
								{shortcutKey}
							</kbd>
						)}
						<span className="text-[11px] font-medium tracking-tight">{hint}</span>
					</button>
				</div>
			)}

			<div ref={setNodeRef} style={rowStyle} className="h-full">
				{children}
			</div>
		</div>
	);
}
