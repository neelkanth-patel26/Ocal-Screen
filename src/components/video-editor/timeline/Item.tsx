import type { Span } from "dnd-timeline";
import { useItem } from "dnd-timeline";
import { Gauge, MessageSquare, MousePointer2, Scissors, Zap, ZoomIn } from "lucide-react";
import { useMemo } from "react";
import { useScopedT } from "@/contexts/I18nContext";
import { loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import glassStyles from "./ItemGlass.module.css";

interface ItemProps {
	id: string;
	span: Span;
	rowId: string;
	children: React.ReactNode;
	isSelected?: boolean;
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
	onSelect,
	zoomDepth = 1,
	zoomCustomScale,
	speedValue,
	isAutoFocus = false,
	variant = "zoom",
	easeInMs: _easeInMs = 1000,
	easeOutMs: _easeOutMs = 1000,
	holdStartMs,
	holdEndMs,
	children,
}: ItemProps) {
	const t = useScopedT("timeline");
	const prefs = loadUserPreferences();
	const isLight = prefs.theme === "light";

	const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({
		id,
		span,
		data: { rowId },
	});

	const isZoom = variant === "zoom";
	const isTrim = variant === "trim";
	const isSpeed = variant === "speed";

	const glassClass = isZoom
		? glassStyles.glassGreen
		: isTrim
			? glassStyles.glassRed
			: isSpeed
				? glassStyles.glassAmber
				: glassStyles.glassYellow;

	const endCapColor = isZoom ? "#34B27B" : isTrim ? "#ef4444" : isSpeed ? "#d97706" : "#B4A046";

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

	const MIN_ITEM_PX = 6;
	const safeItemStyle = { ...itemStyle, minWidth: MIN_ITEM_PX };

	return (
		<div
			ref={setNodeRef}
			style={safeItemStyle}
			{...listeners}
			{...attributes}
			onPointerDownCapture={() => onSelect?.()}
			className="group"
		>
			<div style={{ ...itemContentStyle, minWidth: 24 }}>
				<div
					className={cn(
						isZoom
							? isLight
								? "bg-[#ecfdf5] border border-emerald-400 rounded-lg shadow-sm hover:border-emerald-600"
								: "bg-[#0b0f0d]/90 border border-[#34b27b]/50 rounded-lg shadow-xl hover:border-[#34b27b]"
							: glassClass,
						"w-full h-full overflow-hidden flex items-center justify-between cursor-grab active:cursor-grabbing relative backdrop-blur-md",
						isSelected &&
							(isLight
								? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-white shadow-emerald-500/20"
								: "ring-2 ring-[#34b27b] ring-offset-1 ring-offset-black shadow-emerald-500/30"),
					)}
					style={{ height: 34, color: isLight ? "#064e3b" : "#fff", minWidth: 24 }}
					onClick={(event) => {
						event.stopPropagation();
						onSelect?.();
					}}
				>
					{/* Left Resizer Cap */}
					<div
						className={cn(glassStyles.zoomEndCap, glassStyles.left)}
						style={{
							cursor: "col-resize",
							pointerEvents: "auto",
							width: 5,
							opacity: 0.9,
							background: endCapColor,
						}}
						title="Resize start (Ease-in)"
					/>

					{/* Right Resizer Cap */}
					<div
						className={cn(glassStyles.zoomEndCap, glassStyles.right)}
						style={{
							cursor: "col-resize",
							pointerEvents: "auto",
							width: 5,
							opacity: 0.9,
							background: endCapColor,
						}}
						title="Resize end (Ease-out)"
					/>

					{/* Custom Visual Easing Ramps for Zoom */}
					{isZoom && zoomRampLayout ? (
						<div className="w-full h-full flex items-center relative overflow-hidden select-none pointer-events-none">
							{/* Ease In Ramp */}
							{zoomRampLayout.easeInPct > 0 && (
								<div
									style={{ width: `${zoomRampLayout.easeInPct}%` }}
									className={cn(
										"h-full flex items-center justify-center border-r relative overflow-hidden shrink-0",
										isLight
											? "bg-gradient-to-r from-emerald-100/40 via-emerald-100/70 to-emerald-200/80 border-emerald-300"
											: "bg-gradient-to-r from-[#34b27b]/5 via-[#34b27b]/15 to-[#34b27b]/35 border-[#34b27b]/30",
									)}
									title={`Ease In: ${(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s`}
								>
									<svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
										<path d="M 0 100 Q 50 100 100 0 L 100 100 Z" fill={isLight ? "rgba(5, 150, 105, 0.12)" : "rgba(52, 178, 123, 0.15)"} />
										<path d="M 0 100 Q 50 100 100 0" fill="none" stroke={isLight ? "#059669" : "#34b27b"} strokeWidth="2.5" />
									</svg>
									<div
										className={cn(
											"relative z-10 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold flex items-center gap-1 shadow-2xs backdrop-blur-xs",
											isLight
												? "bg-white border border-emerald-400 text-emerald-800"
												: "bg-[#34b27b]/20 border border-[#34b27b]/40 text-emerald-300",
										)}
									>
										<Zap className={cn("w-2.5 h-2.5 shrink-0", isLight ? "text-emerald-600" : "text-emerald-400")} />
										<span>In {(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s</span>
									</div>
								</div>
							)}

							{/* Active Hold Region */}
							<div
								style={{ width: `${zoomRampLayout.holdPct}%` }}
								className={cn(
									"h-full flex flex-col items-center justify-center font-extrabold px-2 relative border-x shadow-md shrink-0 min-w-[34px]",
									isLight
										? "bg-gradient-to-r from-emerald-600 via-[#059669] to-emerald-600 text-white border-emerald-500 shadow-emerald-600/20"
										: "bg-gradient-to-r from-emerald-600 via-[#21916a] to-emerald-600 text-white border-emerald-400/50 shadow-emerald-500/20",
								)}
								title={`Hold: ${formatMs(holdStartMs!)} – ${formatMs(holdEndMs!)}`}
							>
								<div className="flex items-center gap-1">
									<ZoomIn className="w-3.5 h-3.5 shrink-0 text-white drop-shadow-xs" />
									<span className="text-[11px] font-black tracking-tight whitespace-nowrap text-white drop-shadow-xs">
										{zoomCustomScale != null
											? `${zoomCustomScale.toFixed(2)}×`
											: ZOOM_LABELS[zoomDepth] || `${zoomDepth}×`}
									</span>
									{isAutoFocus && (
										<MousePointer2
											className="w-3 h-3 shrink-0 opacity-90 text-amber-300 drop-shadow-xs"
											aria-label="Cursor-follow"
										/>
									)}
								</div>
								<span className="text-[8px] opacity-90 font-mono font-bold leading-none whitespace-nowrap text-emerald-100">
									{formatMs(holdStartMs!)} – {formatMs(holdEndMs!)}
								</span>
							</div>

							{/* Ease Out Ramp */}
							{zoomRampLayout.easeOutPct > 0 && (
								<div
									style={{ width: `${zoomRampLayout.easeOutPct}%` }}
									className={cn(
										"h-full flex items-center justify-center border-l relative overflow-hidden shrink-0",
										isLight
											? "bg-gradient-to-r from-emerald-200/80 via-emerald-100/70 to-emerald-100/40 border-emerald-300"
											: "bg-gradient-to-r from-[#34b27b]/35 via-[#34b27b]/15 to-[#34b27b]/5 border-[#34b27b]/30",
									)}
									title={`Ease Out: ${(zoomRampLayout.easeOutDuration / 1000).toFixed(1)}s`}
								>
									<svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
										<path d="M 0 0 Q 50 0 100 100 L 0 100 Z" fill={isLight ? "rgba(5, 150, 105, 0.12)" : "rgba(52, 178, 123, 0.15)"} />
										<path d="M 0 0 Q 50 0 100 100" fill="none" stroke={isLight ? "#059669" : "#34b27b"} strokeWidth="2.5" />
									</svg>
									<div
										className={cn(
											"relative z-10 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold flex items-center gap-1 shadow-2xs backdrop-blur-xs",
											isLight
												? "bg-white border border-emerald-400 text-emerald-800"
												: "bg-[#34b27b]/20 border border-[#34b27b]/40 text-emerald-300",
										)}
									>
										<span>Out {(zoomRampLayout.easeOutDuration / 1000).toFixed(1)}s</span>
										<Zap className={cn("w-2.5 h-2.5 shrink-0", isLight ? "text-emerald-600" : "text-emerald-400")} />
									</div>
								</div>
							)}
						</div>
					) : (
						/* Standard Non-Zoom Content */
						<div
							className={cn(
								"relative z-10 flex min-w-0 flex-col items-center justify-center select-none overflow-hidden px-3",
								isLight ? "text-slate-800" : "text-white/90",
							)}
						>
							<div className="flex items-center gap-1.5">
								{isTrim ? (
									<>
										<Scissors className="w-3.5 h-3.5 shrink-0" />
										<span className="text-[11px] font-semibold whitespace-nowrap">
											{t("labels.trim")}
										</span>
									</>
								) : isSpeed ? (
									<>
										<Gauge className="w-3.5 h-3.5 shrink-0" />
										<span className="text-[11px] font-semibold whitespace-nowrap">
											{speedValue !== undefined ? `${speedValue}×` : t("labels.speed")}
										</span>
									</>
								) : (
									<>
										<MessageSquare className="w-3.5 h-3.5 shrink-0" />
										<span className="text-[11px] font-semibold truncate whitespace-nowrap">
											{children}
										</span>
									</>
								)}
							</div>
							<span
								className={`text-[9px] tabular-nums tracking-tight whitespace-nowrap transition-opacity ${
									isSelected ? "opacity-75 font-bold" : "opacity-0 group-hover:opacity-60"
								}`}
							>
								{timeLabel}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
