import type { Span } from "dnd-timeline";
import { useItem, useTimelineContext } from "dnd-timeline";
import { Gauge, MessageSquare, Scissors, ZoomIn } from "lucide-react";
import { useMemo } from "react";
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
	zoomInDurationMs?: number;
	zoomOutDurationMs?: number;
	speedValue?: number;
	variant?: "zoom" | "trim" | "annotation" | "speed";
	onZoomDurationChange?: (id: string, zoomIn: number, zoomOut: number) => void;
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
	zoomInDurationMs,
	zoomOutDurationMs,
	speedValue,
	variant = "zoom",
	children,
	onZoomDurationChange,
}: ItemProps) {
	const { pixelsToValue } = useTimelineContext();
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

	const endCapColor = isZoom ? "#21916A" : isTrim ? "#ef4444" : isSpeed ? "#d97706" : "#B4A046";

	const timeLabel = useMemo(
		() => `${formatMs(span.start)} – ${formatMs(span.end)}`,
		[span.start, span.end],
	);

	// Minimum clickable width on the outer wrapper.
	// Kept small (6px) so items visually distinguish their real positions;
	// users should zoom in to interact with sub-second items precisely.
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
						glassClass,
						"w-full h-full overflow-hidden flex items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing relative",
						isSelected && glassStyles.selected,
					)}
					style={{ height: 40, color: "#fff", minWidth: 24 }}
					onClick={(event) => {
						event.stopPropagation();
						onSelect?.();
					}}
				>
					{isZoom && (
						<>
							{/* Transition In Marker */}
							<div
								className="absolute top-0 bottom-0 left-0 bg-white/10 border-r border-white/20 pointer-events-none"
								style={{
									width: `${((zoomInDurationMs ?? 1522.575) / (span.end - span.start)) * 100}%`,
								}}
							/>
							{/* Draggable handle for Transition In */}
							<div
								className="absolute top-0 bottom-0 w-2 cursor-col-resize z-20 group-hover:bg-white/5 transition-colors"
								style={{
									left: `${((zoomInDurationMs ?? 1522.575) / (span.end - span.start)) * 100}%`,
									transform: "translateX(-50%)",
								}}
								onPointerDown={(e) => {
									e.stopPropagation();
									e.preventDefault();
									const target = e.currentTarget;
									target.setPointerCapture(e.pointerId);

									const onPointerMove = (moveEvent: PointerEvent) => {
										const deltaPx = moveEvent.clientX - e.clientX;
										const deltaMs = pixelsToValue(deltaPx);
										const newDuration = Math.max(
											0,
											Math.min(
												(zoomInDurationMs ?? 1522.575) + deltaMs,
												span.end - span.start - (zoomOutDurationMs ?? 1015.05),
											),
										);
										onZoomDurationChange?.(id, newDuration, zoomOutDurationMs ?? 1015.05);
									};

									const onPointerUp = () => {
										target.releasePointerCapture(e.pointerId);
										window.removeEventListener("pointermove", onPointerMove);
										window.removeEventListener("pointerup", onPointerUp);
									};

									window.addEventListener("pointermove", onPointerMove);
									window.addEventListener("pointerup", onPointerUp);
								}}
							/>
							{/* Transition Out Marker */}
							<div
								className="absolute top-0 bottom-0 right-0 bg-white/10 border-l border-white/20 pointer-events-none"
								style={{
									width: `${((zoomOutDurationMs ?? 1015.05) / (span.end - span.start)) * 100}%`,
								}}
							/>
							{/* Draggable handle for Transition Out */}
							<div
								className="absolute top-0 bottom-0 w-2 cursor-col-resize z-20 group-hover:bg-white/5 transition-colors"
								style={{
									right: `${((zoomOutDurationMs ?? 1015.05) / (span.end - span.start)) * 100}%`,
									transform: "translateX(50%)",
								}}
								onPointerDown={(e) => {
									e.stopPropagation();
									e.preventDefault();
									const target = e.currentTarget;
									target.setPointerCapture(e.pointerId);

									const onPointerMove = (moveEvent: PointerEvent) => {
										const deltaPx = e.clientX - moveEvent.clientX; // Inverted because right-anchored
										const deltaMs = pixelsToValue(deltaPx);
										const newDuration = Math.max(
											0,
											Math.min(
												(zoomOutDurationMs ?? 1015.05) + deltaMs,
												span.end - span.start - (zoomInDurationMs ?? 1522.575),
											),
										);
										onZoomDurationChange?.(id, zoomInDurationMs ?? 1522.575, newDuration);
									};

									const onPointerUp = () => {
										target.releasePointerCapture(e.pointerId);
										window.removeEventListener("pointermove", onPointerMove);
										window.removeEventListener("pointerup", onPointerUp);
									};

									window.addEventListener("pointermove", onPointerMove);
									window.addEventListener("pointerup", onPointerUp);
								}}
							/>
						</>
					)}
					<div
						className={cn(glassStyles.zoomEndCap, glassStyles.left)}
						style={{
							cursor: "col-resize",
							pointerEvents: "auto",
							width: 8,
							opacity: 0.9,
							background: endCapColor,
						}}
						title="Resize left"
					/>
					<div
						className={cn(glassStyles.zoomEndCap, glassStyles.right)}
						style={{
							cursor: "col-resize",
							pointerEvents: "auto",
							width: 8,
							opacity: 0.9,
							background: endCapColor,
						}}
						title="Resize right"
					/>
					{/* Content */}
					<div className="relative z-10 flex flex-col items-center justify-center text-white/90 opacity-80 group-hover:opacity-100 transition-opacity select-none overflow-hidden">
						<div className="flex items-center gap-1.5">
							{isZoom ? (
								<>
									<ZoomIn className="w-3.5 h-3.5 shrink-0" />
									<span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
										{ZOOM_LABELS[zoomDepth] || `${zoomDepth}×`}
									</span>
								</>
							) : isTrim ? (
								<>
									<Scissors className="w-3.5 h-3.5 shrink-0" />
									<span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
										Trim
									</span>
								</>
							) : isSpeed ? (
								<>
									<Gauge className="w-3.5 h-3.5 shrink-0" />
									<span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
										{speedValue !== undefined ? `${speedValue}×` : "Speed"}
									</span>
								</>
							) : (
								<>
									<MessageSquare className="w-3.5 h-3.5 shrink-0" />
									<span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
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
				</div>
			</div>
		</div>
	);
}
