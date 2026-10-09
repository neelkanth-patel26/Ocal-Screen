import type { Span } from "dnd-timeline";
import { useItem } from "dnd-timeline";
import {
	AlertTriangle,
	Captions,
	Gauge,
	Layers,
	MessageSquare,
	MousePointer2,
	Music,
	Scissors,
	ZoomIn,
} from "lucide-react";
import { useMemo } from "react";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

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
	colorMark?: string | null;
	variant?:
		| "zoom"
		| "trim"
		| "annotation"
		| "speed"
		| "blur"
		| "subtitle"
		| "video-layer"
		| "audio"
		| "gap";
	easeInMs?: number;
	easeOutMs?: number;
	holdStartMs?: number;
	holdEndMs?: number;
	onContextMenu?: (e: React.MouseEvent) => void;
}

function getContrastTextColor(hexColor: string): string {
	const hex = hexColor.replace("#", "");
	if (hex.length === 6) {
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		return yiq >= 160 ? "#09090b" : "#ffffff";
	}
	return "#ffffff";
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
	onContextMenu,
	zoomDepth = 1,
	zoomCustomScale,
	speedValue: _speedValue,
	isAutoFocus = false,
	colorMark,
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
	const isSubtitle = variant === "subtitle";
	const isVideoLayer = variant === "video-layer";
	const isAudio = variant === "audio";
	const isGap = variant === "gap";

	const solidStyles = useMemo(() => {
		if (colorMark && !isGap) {
			const textColor = getContrastTextColor(colorMark);
			const isDarkText = textColor === "#09090b";
			return {
				containerClass: isDarkText ? "text-zinc-950 font-medium" : "text-white font-medium",
				customStyle: {
					backgroundColor: colorMark,
					borderColor: `${colorMark}ee`,
					color: textColor,
				},
				capColor: textColor,
				iconBg: isDarkText ? "bg-black/15" : "bg-black/25",
				iconColor: textColor,
				textColor,
				metaColor: isDarkText ? "rgba(9, 9, 11, 0.75)" : "rgba(255, 255, 255, 0.85)",
			};
		}
		if (isGap) {
			return {
				containerClass:
					"bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border-dashed border-amber-500/70",
				customStyle: {
					backgroundImage:
						"repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.08) 0, rgba(245, 158, 11, 0.08) 10px, transparent 10px, transparent 20px)",
				},
				capColor: "#f59e0b",
				iconBg: "bg-amber-500/20",
				iconColor: "#f59e0b",
				textColor: "#fef3c7",
				metaColor: "rgba(254, 243, 199, 0.75)",
			};
		}
		if (isZoom) {
			return {
				containerClass: "text-white border",
				customStyle: {
					backgroundColor: activeAccent.hex,
					borderColor: `${activeAccent.hex}cc`,
					color: activeAccent.textHex,
				},
				capColor: activeAccent.textHex,
				iconBg: "bg-black/20",
				iconColor: activeAccent.textHex,
				textColor: activeAccent.textHex,
				metaColor: `${activeAccent.textHex}cc`,
			};
		}
		if (isTrim) {
			return {
				containerClass: "bg-rose-600 hover:bg-rose-500 text-white border-rose-700",
				customStyle: {},
				capColor: "#ffffff",
				iconBg: "bg-black/25",
				iconColor: "#ffffff",
				textColor: "#ffffff",
				metaColor: "rgba(255, 255, 255, 0.8)",
			};
		}
		if (isSubtitle) {
			return {
				containerClass: "bg-[#d4f933] hover:bg-[#ddfa55] text-[#09090b] font-bold border-[#b2d918]",
				customStyle: {},
				capColor: "#09090b",
				iconBg: "bg-black/15",
				iconColor: "#09090b",
				textColor: "#09090b",
				metaColor: "rgba(9, 9, 11, 0.75)",
			};
		}
		if (isVideoLayer) {
			return {
				containerClass: "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-700",
				customStyle: {},
				capColor: "#ffffff",
				iconBg: "bg-black/25",
				iconColor: "#ffffff",
				textColor: "#ffffff",
				metaColor: "rgba(255, 255, 255, 0.8)",
			};
		}
		if (isAnnotation) {
			return {
				containerClass: "bg-amber-600 hover:bg-amber-500 text-white border-amber-700",
				customStyle: {},
				capColor: "#ffffff",
				iconBg: "bg-black/25",
				iconColor: "#ffffff",
				textColor: "#ffffff",
				metaColor: "rgba(255, 255, 255, 0.8)",
			};
		}
		if (isSpeed) {
			return {
				containerClass: "bg-purple-600 hover:bg-purple-500 text-white border-purple-700",
				customStyle: {},
				capColor: "#ffffff",
				iconBg: "bg-black/25",
				iconColor: "#ffffff",
				textColor: "#ffffff",
				metaColor: "rgba(255, 255, 255, 0.8)",
			};
		}
		if (isBlur) {
			return {
				containerClass: "bg-sky-600 hover:bg-sky-500 text-white border-sky-700",
				customStyle: {},
				capColor: "#ffffff",
				iconBg: "bg-black/25",
				iconColor: "#ffffff",
				textColor: "#ffffff",
				metaColor: "rgba(255, 255, 255, 0.8)",
			};
		}
		if (isAudio) {
			return {
				containerClass: "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700",
				customStyle: {
					backgroundColor: "#059669",
					borderColor: "#047857",
				},
				capColor: "#ffffff",
				iconBg: "bg-black/25",
				iconColor: "#ffffff",
				textColor: "#ffffff",
				metaColor: "rgba(255, 255, 255, 0.8)",
			};
		}
		return {
			containerClass: "bg-slate-700 hover:bg-slate-600 text-white border-slate-800",
			customStyle: {},
			capColor: "#ffffff",
			iconBg: "bg-black/25",
			iconColor: "#ffffff",
			textColor: "#ffffff",
			metaColor: "rgba(255, 255, 255, 0.8)",
		};
	}, [
		isZoom,
		isTrim,
		isSubtitle,
		isVideoLayer,
		isAnnotation,
		isSpeed,
		isBlur,
		isAudio,
		isGap,
		activeAccent,
		colorMark,
	]);

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
						"w-full h-full overflow-hidden flex items-center justify-between cursor-grab active:cursor-grabbing relative rounded-xl transition-all",
						solidStyles.containerClass,
						isSelected
							? "ring-2 ring-inset ring-cyan-400 border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.35)] z-20"
							: "border border-black/25 hover:border-white/30",
						isOverlapping && "border-amber-400",
					)}
					style={{
						height: 36,
						minWidth: 28,
						...solidStyles.customStyle,
					}}
					onClick={(event) => {
						event.stopPropagation();
						onSelect?.();
					}}
					onContextMenu={(event) => {
						event.preventDefault();
						event.stopPropagation();
						onContextMenu?.(event);
					}}
				>
					{/* Video Filmstrip Background Pattern */}
					{isVideoLayer && (
						<div className="absolute inset-0 flex items-center justify-between opacity-15 pointer-events-none overflow-hidden">
							<div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_36px,rgba(255,255,255,0.2)_36px,rgba(255,255,255,0.2)_38px)]" />
						</div>
					)}

					{/* Gap Striped Warning Background Pattern */}
					{isGap && (
						<div className="absolute inset-0 flex items-center justify-between opacity-30 pointer-events-none overflow-hidden">
							<div className="w-full h-full bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.25)_0,rgba(245,158,11,0.25)_10px,transparent_10px,transparent_20px)]" />
						</div>
					)}

					{/* Audio Waveform Amplitude Lines */}
					{isAudio && (
						<div className="absolute inset-0 flex items-center justify-between opacity-35 px-2 pointer-events-none overflow-hidden">
							<div className="w-full h-4 flex items-end justify-between gap-[2px]">
								{[
									35, 60, 90, 75, 40, 85, 100, 70, 50, 80, 95, 60, 45, 70, 90, 80, 55, 30, 65, 85,
									70, 40,
								].map((h, i) => (
									<div
										key={i}
										className="flex-1 bg-white rounded-t-[1px]"
										style={{ height: `${h}%` }}
									/>
								))}
							</div>
						</div>
					)}
					{/* Overlapping Pill Badge Inside Item */}
					{isOverlapping && (
						<div
							className={cn(
								"absolute top-1 right-2 z-40 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border cursor-help select-none",
								isLight
									? "bg-amber-400 text-amber-950 border-amber-500"
									: "bg-amber-500 text-amber-950 border-amber-300",
							)}
							title="Overlapping: this item collides with another active region on this track"
						>
							<Layers className="w-2.5 h-2.5 shrink-0" />
							<span>Overlap</span>
						</div>
					)}

					{/* Left Resizer Handle (Filmora Bracket Trim Grip) */}
					<div
						className={cn(
							"absolute top-0 bottom-0 left-0 w-3.5 flex items-center justify-center cursor-ew-resize select-none pointer-events-auto z-30 transition-opacity bg-black/20 hover:bg-black/40 rounded-l-xl",
							isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
						)}
						title="Trim Start (Drag edge)"
					>
						<div className="flex items-center gap-[1px]">
							<div className="w-[1.5px] h-3.5 bg-white/90 rounded-full" />
							<div className="w-[1.5px] h-2 bg-white/60 rounded-full" />
						</div>
					</div>

					{/* Right Resizer Handle (Filmora Bracket Trim Grip) */}
					<div
						className={cn(
							"absolute top-0 bottom-0 right-0 w-3.5 flex items-center justify-center cursor-ew-resize select-none pointer-events-auto z-30 transition-opacity bg-black/20 hover:bg-black/40 rounded-r-xl",
							isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
						)}
						title="Trim End (Drag edge)"
					>
						<div className="flex items-center gap-[1px]">
							<div className="w-[1.5px] h-2 bg-white/60 rounded-full" />
							<div className="w-[1.5px] h-3.5 bg-white/90 rounded-full" />
						</div>
					</div>

					{/* Zoom Item Content with Ease-in, Hold, and Ease-out */}
					{isZoom && zoomRampLayout ? (
						<div className="w-full h-full flex items-center relative overflow-hidden select-none pointer-events-none">
							{/* Ease In Ramp */}
							{zoomRampLayout.easeInPct > 0 && (
								<div
									style={{
										width: `${zoomRampLayout.easeInPct}%`,
									}}
									className="h-full flex items-center justify-center border-r border-black/15 bg-black/10 relative overflow-hidden shrink-0 transition-all"
									title={`Ease In: ${(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s`}
								>
									<svg
										className="absolute inset-0 w-full h-full opacity-40"
										preserveAspectRatio="none"
										viewBox="0 0 100 100"
									>
										<path d="M 0 100 Q 50 100 100 0 L 100 100 Z" fill="rgba(0,0,0,0.15)" />
										<path
											d="M 0 100 Q 50 100 100 0"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										/>
									</svg>
									{zoomRampLayout.easeInPct >= 20 && (
										<span
											className="relative z-10 text-[8.5px] font-mono font-bold whitespace-nowrap"
											style={{ color: solidStyles.metaColor }}
										>
											{(zoomRampLayout.easeInDuration / 1000).toFixed(1)}s
										</span>
									)}
								</div>
							)}

							{/* Active Hold Region */}
							<div
								style={{
									width: `${zoomRampLayout.holdPct}%`,
								}}
								className="h-full flex flex-col items-center justify-center font-extrabold px-1 relative border-x border-black/20 shrink-0 min-w-[32px] bg-black/20"
								title={`Hold: ${formatMs(holdStartMs!)} – ${formatMs(holdEndMs!)}`}
							>
								<div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/30 text-white">
									<ZoomIn className="w-3 h-3 shrink-0" style={{ color: solidStyles.textColor }} />
									<span
										className="text-[11px] font-black tracking-tight whitespace-nowrap"
										style={{ color: solidStyles.textColor }}
									>
										{zoomCustomScale != null
											? `${zoomCustomScale.toFixed(2)}×`
											: ZOOM_LABELS[zoomDepth] || `${zoomDepth}×`}
									</span>
									{isAutoFocus && (
										<MousePointer2
											className="w-2.5 h-2.5 shrink-0 opacity-90"
											style={{ color: solidStyles.textColor }}
											aria-label="Cursor-follow"
										/>
									)}
								</div>
								{zoomRampLayout.holdPct >= 25 && (
									<span
										className="text-[8px] font-mono font-bold leading-none mt-0.5 whitespace-nowrap"
										style={{ color: solidStyles.metaColor }}
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
									}}
									className="h-full flex items-center justify-center border-l border-black/15 bg-black/10 relative overflow-hidden shrink-0 transition-all"
									title={`Ease Out: ${(zoomRampLayout.easeOutDuration / 1000).toFixed(1)}s`}
								>
									<svg
										className="absolute inset-0 w-full h-full opacity-40"
										preserveAspectRatio="none"
										viewBox="0 0 100 100"
									>
										<path d="M 0 0 Q 50 100 100 100 L 0 100 Z" fill="rgba(0,0,0,0.15)" />
										<path
											d="M 0 0 Q 50 100 100 100"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										/>
									</svg>
									{zoomRampLayout.easeOutPct >= 20 && (
										<span
											className="relative z-10 text-[8.5px] font-mono font-bold whitespace-nowrap"
											style={{ color: solidStyles.metaColor }}
										>
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
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<Scissors className="w-3 h-3 text-white" />
									</div>
								)}
								{isSubtitle && (
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<Captions className="w-3 h-3 text-[#09090b]" />
									</div>
								)}
								{isVideoLayer && (
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<Layers className="w-3 h-3 text-white" />
									</div>
								)}
								{isAnnotation && (
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<MessageSquare className="w-3 h-3 text-white" />
									</div>
								)}
								{isSpeed && (
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<Gauge className="w-3 h-3 text-white" />
									</div>
								)}
								{isBlur && (
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<svg
											className="w-3 h-3 text-white"
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
								{isAudio && (
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<Music className="w-3 h-3 text-white" />
									</div>
								)}
								{isGap && (
									<div
										className={cn(
											"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
											solidStyles.iconBg,
										)}
									>
										<AlertTriangle className="w-3 h-3 text-amber-400" />
									</div>
								)}
								{isAudio && (
									<div className="flex items-center gap-[2px] opacity-40 h-3 overflow-hidden shrink-0 select-none pointer-events-none">
										{[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 65, 35, 75, 85, 40, 90, 60].map(
											(h, i) => (
												<div
													key={i}
													className="w-[2px] bg-white rounded-full"
													style={{ height: `${h}%` }}
												/>
											),
										)}
									</div>
								)}
								<span
									className="text-xs font-bold truncate tracking-tight"
									style={{ color: solidStyles.textColor }}
								>
									{children}
								</span>
							</div>
							<span
								className="text-[9px] font-mono font-semibold ml-2 shrink-0"
								style={{ color: solidStyles.metaColor }}
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
