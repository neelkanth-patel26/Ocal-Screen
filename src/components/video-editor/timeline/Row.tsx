import type { RowDefinition } from "dnd-timeline";
import { useRow, useTimelineContext } from "dnd-timeline";
import { Plus } from "lucide-react";
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
	background,
	label,
	icon,
	accentColorHex,
	shortcutKey,
	onAddClick,
}: RowProps) {
	const { setNodeRef, rowStyle } = useRow({ id });
	const { sidebarWidth } = useTimelineContext();

	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = prefs.theme === "light";

	const effectiveColor = accentColorHex || activeAccent.hex;
	const leftOffset = label ? sidebarWidth : 0;

	return (
		<div
			className={cn(
				"relative w-full overflow-hidden transition-colors border-b flex items-center min-h-[42px]",
				isLight
					? "bg-[#f8f8f9] border-[#e4e4e7] hover:bg-[#f1f1f3]"
					: "bg-[#0d0e12] border-white/[0.06] hover:bg-[#121318]",
			)}
		>
			{background}

			{/* Left Track Header Badge */}
			{label && (
				<button
					type="button"
					onClick={onAddClick}
					title={`Add ${label} (${shortcutKey || "+"})`}
					className={cn(
						"absolute top-0 bottom-0 left-0 z-30 flex items-center justify-between px-2.5 border-r select-none transition-colors cursor-pointer group/badge",
						isLight
							? "bg-white border-[#e4e4e7] hover:bg-[#f4f4f5]"
							: "bg-[#090a0c] border-white/[0.08] hover:bg-[#14151a]",
					)}
					style={{ width: sidebarWidth }}
				>
					<div className="flex items-center gap-1.5 min-w-0">
						{icon && <span style={{ color: effectiveColor }} className="shrink-0">{icon}</span>}
						<span className={cn("text-[11px] font-bold tracking-tight truncate", isLight ? "text-[#18181b]" : "text-slate-200")}>
							{label}
						</span>
					</div>
					<div
						className="w-4 h-4 rounded-md flex items-center justify-center transition-all opacity-60 group-hover/badge:opacity-100 shrink-0"
						style={{ backgroundColor: `${effectiveColor}20`, color: effectiveColor }}
					>
						<Plus className="w-3 h-3" />
					</div>
				</button>
			)}

			{/* Track Lane Clip Container */}
			<div
				ref={setNodeRef}
				style={{
					...rowStyle,
					position: "relative",
					marginLeft: leftOffset,
					width: `calc(100% - ${leftOffset}px)`,
					height: "100%",
					minHeight: 42,
				}}
				className="relative z-10 h-full flex-1"
			>
				{children}
			</div>
		</div>
	);
}
