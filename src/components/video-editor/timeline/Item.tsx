import type { Span } from "dnd-timeline";
import { useItem } from "dnd-timeline";
import { Gauge, Layers, MessageSquare, MousePointer2, Scissors, ZoomIn } from "lucide-react";
import { useMemo } from "react";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import glassStyles from "./ItemGlass.module.css";

interface ItemProps {
	id: string;
	span: Span;
	rowId: string;
	children: React.ReactNode;
	isSelected?: boolean;
	isOverlapping?: boolean;
	onSelect?: () => void;
	zoomDepth?: number;
	zoomCustomScale?: number;
	speedValue?: number;
	isAutoFocus?: boolean;
	variant?: "zoom" | "trim" | "annotation" | "speed" | "blur";
	easeInMs?: number;
	easeOutMs?: number;
	holdStartMs?: number;
	holdEndMs?: number;
}

// Map zoom depth to multiplier labels
const ZOOM_LABELS: Record<number, string> = {
	1: "1.25×",
	2: "1.5×",
	3: "1.8×",
	4: "2.2×",
	5: "3.5×",
	6: "5×",
};

function formatMs(ms: number): string {
	const totalSeconds = ms / 1000;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes > 0) {
		return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
	}
	return `${seconds.toFixed(1)}s`;
}

export default function Item({
	id,
	span,
	rowId,
	isSelected = false,
	isOverlapping = false,
	onSelect,
	zoomDepth = 1,
	zoomCustomScale,
	speedValue: _speedValue,
	isAutoFocus = false,
	variant = "zoom",
	easeInMs: _easeInMs = 1000,
	easeOutMs: _easeOutMs = 1000,
	holdStartMs,
	holdEndMs,
	children,
}: ItemProps) {
	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = prefs.theme === "light";

	const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({
		id,
		span,
		data: { rowId },
	});

	const isZoom = variant === "zoom";
	const isTrim = variant === "trim";
	const isSpeed = variant === "speed";
	const isAnnotation = variant === "annotation";
	const isBlur = variant === "blur";

	const endCapColor = isZoom
		? activeAccent.hex
		: isTrim
			? "#ef4444"
			: isSpeed
				? "#a855f7"
				: isBlur
					? "#38bdf8"
					: "#f59e0b";

	const timeLabel = useMemo(
		() => `${formatMs(span.start)} – ${formatMs(span.end)}`,
		[span.start, span.end],
	);

	// Calculate percentage widths for zoom ease-in, hold, and ease-out
	const zoomRampLayout = useMemo(() => {
		if (!isZoom || holdStartMs == null || holdEndMs == null) return null;

		const totalSpanMs = Math.max(1, span.end - span.start);
		const easeInDuration = Math.max(0, holdStartMs - span.start);
		const holdDuration = Math.max(0, holdEndMs - holdStartMs);
		const easeOutDuration = Math.max(0, span.end - holdEndMs);

		const easeInPct = (easeInDuration / totalSpanMs) * 100;
		const holdPct = (holdDuration / totalSpanMs) * 100;
		const easeOutPct = (easeOutDuration / totalSpanMs) * 100;

		return {
			easeInDuration,
			holdDuration,
			easeOutDuration,
			easeInPct,
			holdPct,
			easeOutPct,
		};
	}, [isZoom, span.start, span.end, holdStartMs, holdEndMs]);

	const MIN_ITEM_PX = 8;
	const safeItemStyle = { ...itemStyle, minWidth: MIN_ITEM_PX };

	return (
		<div
			ref={setNodeRef}
			style={safeItemStyle}
			{...listeners}
			{...attributes}
			onPointerDownCapture={() => onSelect?.()}
			className="group select-none"
		>
			<div style={{ ...itemContentStyle, minWidth: 28 }} className="relative h-full">
				<div
					className={cn(
						"w-full h-full overflow-hidden flex items-center justify-between cursor-grab active:cursor-grabbing relative backdrop-blur-md rounded-xl transition-all border",
						isZoom
							? isLight
								? "bg-white/95 border-slate-200 shadow-xs hover:border-slate-400"
								: "bg-[#0d0e14]/90 border-white/15 shadow-xl hover:border-white/25"
							: isTrim
								? isLight
									? "bg-red-50/90 border-red-200 text-red-900"
									: "bg-red-950/40 border-red-500/40 text-red-200 shadow-lg shadow-red-950/20"
								: isSpeed
									? isLight
										? "bg-purple-50/90 border-purple-200 text-purple-900"
										: "bg-purple-950/40 border-purple-500/40 text-purple-200 shadow-lg shadow-purple-950/20"
									: isBlur
										? isLight
											? "bg-sky-50/90 border-sky-200 text-sky-900"
											: "bg-sky-950/40 border-sky-500/40 text-sky-200 shadow-lg shadow-sky-950/20"
										: isLight
											? "bg-amber-50/90 border-amber-200 text-amber-900"
											: "bg-amber-950/40 border-amber-500/40 text-amber-200 shadow-lg shadow-amber-950/20",
						isSelected &&
							(isLight
								? "ring-2 ring-offset-1 ring-offset-white ring-slate-900"
								: "ring-2 ring-offset-1 ring-offset-black ring-white/90"),
						isOverlapping && "border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
					)}
					style={{
						height: 36,
						minWidth: 28,
						borderColor: isSelected ? activeAccent.hex : undefined,
						boxShadow: isSelected
							? `0 0 0 1px ${activeAccent.hex}, 0 0 0 3px ${activeAccent.hex}25, 0 8px 22px rgba(0,0,0,0.3)`
							: undefined,
					}}
					onClick={(event) => {
						event.stopPropagation();
						onSelect?.();
					}}
				>
					{/* Overlapping Pill Badge Inside Item */}
					{isOverlapping && (
						<div
							className={cn(
								"absolute top-1 right-2 z-40 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm border backdrop-blur-md cursor-help select-none",
								isLight
									? "bg-amber-400 text-amber-950 border-amber-500/60 shadow-amber-500/20"
									: "bg-amber-500/90 text-amber-950 border-amber-300 shadow-amber-500/30",
							)}
							title="Overlapping: this item collides with another active region on this track"
						>
							<Layers className="w-2.5 h-2.5 shrink-0" />
							<span>Overlap</span>
						</div>
					)}

					{/* Left Resizer Cap */}
					<div
						className={cn(glassStyles.zoomEndCap, glassStyles.left)}
						style={{
							cursor: "col-resize",
							pointerEvents: "auto",
							width: 5,
							opacity: 0.85,
							background: endCapColor,
						}}
						title="Resize start"
					/>

					{/* Right Resizer Cap */}
					<div
						className={cn(glassStyles.zoomEndCap, glassStyles.right)}
						style={{
							cursor: "col-resize",
							pointerEvents: "auto",
							width: 5,
							opacity: 0.85,
							background: endCapColor,
						}}
						title="Resize end"
					/>

					{/* Zoom Item Content with Ease-in, Hold, and Ease-out */}
					{isZoom && zoomRampLayout ? (
						<div className="w-full h-full flex items-center relative overflow-hidden select-none pointer-events-none">
							{/* Ease In Ramp */}
							{zoomRampLayout.easeInPct > 0 && (
								<div
									style={{
										width: `${zoomRampLayout.easeInPct}%`,
										background: `linear-gradient(to right, ${activeAccent.hex}05, ${activeAccent.hex}18)`,
										borderColor: `${activeAccent.hex}25`,
									}}
									className="h-full flex items-center justify-center border-r relative overflow-hidden shrink-0 transition-all"
									title={`Ease In: ${(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s`}
								>
									<svg
										className="absolute inset-0 w-full h-full opacity-50"
										preserveAspectRatio="none"
										viewBox="0 0 100 100"
									>
										<path d="M 0 100 Q 50 100 100 0 L 100 100 Z" fill={`${activeAccent.hex}08`} />
										<path
											d="M 0 100 Q 50 100 100 0"
											fill="none"
											stroke={activeAccent.hex}
											strokeWidth="1.5"
										/>
									</svg>
									{zoomRampLayout.easeInPct >= 20 && (
										<span className="relative z-10 text-[8.5px] font-mono font-bold opacity-60 whitespace-nowrap text-slate-300">
											{(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s
										</span>
									)}
								</div>
							)}

							{/* Active Hold Region */}
							<div
								style={{
									width: `${zoomRampLayout.holdPct}%`,
									backgroundColor: `${activeAccent.hex}15`,
									borderColor: `${activeAccent.hex}40`,
								}}
								className="h-full flex flex-col items-center justify-center font-extrabold px-1 relative border-x shrink-0 min-w-[32px]"
								title={`Hold: ${formatMs(holdStartMs!)} – ${formatMs(holdEndMs!)}`}
							>
								<div
									className="flex items-center gap-1 px-2 py-0.5 rounded-lg shadow-sm"
									style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
								>
									<ZoomIn className="w-3 h-3 shrink-0" style={{ color: activeAccent.textHex }} />
									<span
										className="text-[11px] font-black tracking-tight whitespace-nowrap"
										style={{ color: activeAccent.textHex }}
									>
										{zoomCustomScale != null
											? `${zoomCustomScale.toFixed(2)}×`
											: ZOOM_LABELS[zoomDepth] || `${zoomDepth}×`}
									</span>
									{isAutoFocus && (
										<MousePointer2
											className="w-2.5 h-2.5 shrink-0 opacity-90 drop-shadow-xs"
											style={{ color: activeAccent.textHex }}
											aria-label="Cursor-follow"
										/>
									)}
								</div>
								{zoomRampLayout.holdPct >= 25 && (
									<span
										className={cn(
											"text-[8px] font-mono font-bold leading-none mt-0.5 whitespace-nowrap",
											isLight ? "text-slate-600" : "text-slate-400",
										)}
									>
										{formatMs(holdStartMs!)} – {formatMs(holdEndMs!)}
									</span>
								)}
							</div>

							{/* Ease Out Ramp */}
							{zoomRampLayout.easeOutPct > 0 && (
								<div
									style={{
										width: `${zoomRampLayout.easeOutPct}%`,
										background: `linear-gradient(to right, ${activeAccent.hex}18, ${activeAccent.hex}05)`,
										borderColor: `${activeAccent.hex}25`,
									}}
									className="h-full flex items-center justify-center border-l relative overflow-hidden shrink-0 transition-all"
									title={`Ease Out: ${(zoomRampLayout.easeOutDuration / 1000).toFixed(1)}s`}
								>
									<svg
										className="absolute inset-0 w-full h-full opacity-50"
										preserveAspectRatio="none"
										viewBox="0 0 100 100"
									>
										<path d="M 0 0 Q 50 100 100 100 L 0 100 Z" fill={`${activeAccent.hex}08`} />
										<path
											d="M 0 0 Q 50 100 100 100"
											fill="none"
											stroke={activeAccent.hex}
											strokeWidth="1.5"
										/>
									</svg>
									{zoomRampLayout.easeOutPct >= 20 && (
										<span className="relative z-10 text-[8.5px] font-mono font-bold opacity-60 whitespace-nowrap text-slate-300">
											{(zoomRampLayout.easeOutDuration / 1000).toFixed(1)}s
										</span>
									)}
								</div>
							)}
						</div>
					) : (
						<div className="flex items-center justify-between px-3 w-full min-w-0">
							<div className="flex items-center gap-2 min-w-0">
								{isTrim && (
									<div className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center shrink-0">
										<Scissors className="w-3 h-3 text-red-400" />
									</div>
								)}
								{isAnnotation && (
									<div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0">
										<MessageSquare className="w-3 h-3 text-amber-300" />
									</div>
								)}
								{isSpeed && (
									<div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center shrink-0">
										<Gauge className="w-3 h-3 text-purple-300" />
									</div>
								)}
								{isBlur && (
									<div className="w-5 h-5 rounded-md bg-sky-500/20 flex items-center justify-center shrink-0">
										<svg
											className="w-3 h-3 text-sky-300"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<circle cx="8" cy="12" r="3" />
											<circle cx="16" cy="12" r="3" />
											<path d="M6 6h12M6 18h12" />
										</svg>
									</div>
								)}
								<span className="text-xs font-bold truncate tracking-tight">{children}</span>
							</div>
							<span className="text-[9px] font-mono font-semibold opacity-70 ml-2 shrink-0">
								{timeLabel}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
