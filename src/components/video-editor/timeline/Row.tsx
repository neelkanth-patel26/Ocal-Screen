import type { RowDefinition } from "dnd-timeline";
import { useRow, useTimelineContext } from "dnd-timeline";
import { Eye, EyeOff, Lock, Plus, Unlock, Volume2, VolumeX } from "lucide-react";
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
	isVisible?: boolean;
	onToggleVisible?: () => void;
	isLocked?: boolean;
	onToggleLock?: () => void;
	isMuted?: boolean;
	onToggleMute?: () => void;
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
	isVisible = true,
	onToggleVisible,
	isLocked = false,
	onToggleLock,
	isMuted = false,
	onToggleMute,
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
					: "bg-[#0c0d11] border-[#1a1b22] hover:bg-[#101118]",
				!isVisible && "opacity-40",
				isLocked && "pointer-events-none select-none",
			)}
		>
			{background}

			{/* Left Track Header (Filmora Style) */}
			{label && (
				<div
					className={cn(
						"absolute top-0 bottom-0 left-0 z-30 flex items-center justify-between px-2.5 border-r select-none transition-all group/badge",
						isLight
							? "bg-white border-[#e4e4e7] hover:bg-[#f4f4f5]"
							: "bg-[#0c0d12] border-[#1a1b22] hover:bg-[#13151e]",
					)}
					style={{ width: sidebarWidth }}
				>
					{/* Track Icon & Label */}
					<button
						type="button"
						onClick={onAddClick}
						title={`Track: ${label} (${shortcutKey || "+"})`}
						className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer group-hover/badge:opacity-95"
					>
						<div
							className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
							style={{ backgroundColor: `${effectiveColor}18`, color: effectiveColor }}
						>
							{icon}
						</div>
						<span
							className={cn(
								"text-xs font-bold tracking-tight truncate",
								isLight ? "text-slate-800" : "text-slate-200",
							)}
						>
							{label}
						</span>
					</button>

					{/* Track Controls: Eye (Hide/Show), Lock, Mute, Add */}
					<div className="flex items-center gap-1 shrink-0 ml-1">
						{onToggleVisible && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onToggleVisible();
								}}
								title={isVisible ? "Hide track" : "Show track"}
								className={cn(
									"p-1 rounded transition-colors cursor-pointer",
									isVisible
										? "text-slate-400 hover:text-white hover:bg-white/10"
										: "text-amber-400 bg-amber-500/10",
								)}
							>
								{isVisible ? (
									<Eye className="w-3 h-3" />
								) : (
									<EyeOff className="w-3 h-3 text-amber-400" />
								)}
							</button>
						)}

						{onToggleLock && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onToggleLock();
								}}
								title={isLocked ? "Unlock track" : "Lock track"}
								className={cn(
									"p-1 rounded transition-colors cursor-pointer",
									isLocked
										? "text-red-400 bg-red-500/10"
										: "text-slate-400 hover:text-white hover:bg-white/10",
								)}
							>
								{isLocked ? (
									<Lock className="w-3 h-3 text-red-400" />
								) : (
									<Unlock className="w-3 h-3" />
								)}
							</button>
						)}

						{onToggleMute && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onToggleMute();
								}}
								title={isMuted ? "Unmute track" : "Mute track"}
								className={cn(
									"p-1 rounded transition-colors cursor-pointer",
									isMuted
										? "text-red-400 bg-red-500/10"
										: "text-slate-400 hover:text-white hover:bg-white/10",
								)}
							>
								{isMuted ? (
									<VolumeX className="w-3 h-3 text-red-400" />
								) : (
									<Volume2 className="w-3 h-3" />
								)}
							</button>
						)}

						{onAddClick && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onAddClick();
								}}
								title={`Add item to ${label}`}
								className="w-4 h-4 rounded-md flex items-center justify-center transition-all opacity-50 hover:opacity-100 cursor-pointer"
								style={{ backgroundColor: `${effectiveColor}25`, color: effectiveColor }}
							>
								<Plus className="w-2.5 h-2.5" />
							</button>
						)}
					</div>
				</div>
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
