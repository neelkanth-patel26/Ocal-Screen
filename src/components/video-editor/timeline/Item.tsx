import type { Span } from "dnd-timeline";
import { useItem } from "dnd-timeline";
import { Gauge, MessageSquare, MousePointer2, Scissors, Zap, ZoomIn } from "lucide-react";
import { useMemo } from "react";
import { useScopedT } from "@/contexts/I18nContext";
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
							? "bg-[#0b0f0d]/90 border border-[#34b27b]/40 rounded-2xl shadow-xl hover:border-[#34b27b]/80"
							: glassClass,
						"w-full h-full overflow-hidden flex items-center justify-between cursor-grab active:cursor-grabbing relative backdrop-blur-md",
						isSelected && "ring-2 ring-[#34b27b] ring-offset-1 ring-offset-black shadow-emerald-500/30",
					)}
					style={{ height: 34, color: "#fff", minWidth: 24 }}
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
							width: 6,
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
							width: 6,
							opacity: 0.9,
							background: endCapColor,
						}}
						title="Resize end (Ease-out)"
					/>

					{/* Custom Visual Easing Ramps for Zoom */}
					{isZoom && zoomRampLayout ? (
						<div className="w-full h-full flex items-center relative overflow-hidden select-none pointer-events-none px-1">
							{/* Ease In Ramp */}
							{zoomRampLayout.easeInPct > 0 && (
								<div
									style={{ width: `${zoomRampLayout.easeInPct}%` }}
									className="h-full flex items-center justify-center bg-gradient-to-r from-[#34b27b]/5 via-[#34b27b]/15 to-[#34b27b]/35 border-r border-[#34b27b]/30 relative overflow-hidden shrink-0"
									title={`Ease In: ${(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s`}
								>
									<svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
										<path d="M 0 100 Q 50 100 100 0 L 100 100 Z" fill="rgba(52, 178, 123, 0.15)" />
										<path d="M 0 100 Q 50 100 100 0" fill="none" stroke="#34b27b" strokeWidth="2.5" />
									</svg>
									<div className="relative z-10 px-1.5 py-0.5 rounded-full bg-[#34b27b]/20 border border-[#34b27b]/40 text-[9px] font-mono font-bold text-emerald-300 flex items-center gap-1 shadow-2xs backdrop-blur-xs">
										<Zap className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
										<span>In {(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s</span>
									</div>
								</div>
							)}

							{/* Active Hold Region */}
							<div
								style={{ width: `${zoomRampLayout.holdPct}%` }}
								className="h-full flex flex-col items-center justify-center bg-gradient-to-r from-emerald-600 via-[#21916a] to-emerald-600 text-white font-extrabold px-2 relative border-x border-emerald-400/50 shadow-md shadow-emerald-500/20 shrink-0 min-w-[34px]"
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
									className="h-full flex items-center justify-center bg-gradient-to-r from-[#34b27b]/35 via-[#34b27b]/15 to-[#34b27b]/5 border-l border-[#34b27b]/30 relative overflow-hidden shrink-0"
									title={`Ease Out: ${(zoomRampLayout.easeOutDuration / 1000).toFixed(1)}s`}
								>
									<svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
										<path d="M 0 0 Q 50 0 100 100 L 0 100 Z" fill="rgba(52, 178, 123, 0.15)" />
										<path d="M 0 0 Q 50 0 100 100" fill="none" stroke="#34b27b" strokeWidth="2.5" />
									</svg>
									<div className="relative z-10 px-1.5 py-0.5 rounded-full bg-[#34b27b]/20 border border-[#34b27b]/40 text-[9px] font-mono font-bold text-emerald-300 flex items-center gap-1 shadow-2xs backdrop-blur-xs">
										<span>Out {(zoomRampLayout.easeOutDuration / 1000).toFixed(1)}s</span>
										<Zap className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
									</div>
								</div>
							)}
						</div>
					) : (
						/* Standard Non-Zoom Content */
						<div className="relative z-10 flex min-w-0 flex-col items-center justify-center text-white/90 opacity-85 group-hover:opacity-100 transition-opacity select-none overflow-hidden px-3">
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
									isSelected ? "opacity-60" : "opacity-0 group-hover:opacity-40"
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
