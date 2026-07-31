import type { Range, Span } from "dnd-timeline";
import { useTimelineContext } from "dnd-timeline";
import {
	Captions,
	Check,
	ChevronDown,
	Gauge,
	MessageSquare,
	Plus,
	ScanEye,
	Scissors,
	WandSparkles,
	Sparkles,
	ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { useAudioPeaks } from "@/hooks/useAudioPeaks";
import { matchesShortcut } from "@/lib/shortcuts";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS, type AspectRatio, getAspectRatioLabel } from "@/utils/aspectRatioUtils";
import { formatShortcut } from "@/utils/platformUtils";
import { BLUR_REGIONS_ENABLED } from "../featureFlags";
import type { AnnotationRegion, SpeedRegion, TrimRegion, ZoomRegion } from "../types";
import BackgroundWaveform from "./BackgroundWaveform";
import Item from "./Item";
import KeyframeMarkers from "./KeyframeMarkers";
import Row from "./Row";
import TimelineWrapper from "./TimelineWrapper";

const ZOOM_ROW_ID = "row-zoom";
const TRIM_ROW_ID = "row-trim";
const ANNOTATION_ROW_ID = "row-annotation";
const BLUR_ROW_ID = "row-blur";
const SPEED_ROW_ID = "row-speed";
const FALLBACK_RANGE_MS = 1000;
const TARGET_MARKER_COUNT = 12;

interface TimelineEditorProps {
	videoDuration: number;
	hasVideoSource?: boolean;
	currentTime: number;
	onSeek?: (time: number) => void;
	zoomRegions: ZoomRegion[];
	onZoomAdded: (span: Span) => void;
	/** Magic-wand auto-zoom toggle state + handler. */
	autoZoomEnabled?: boolean;
	onToggleAutoZoom?: (enabled: boolean) => void;
	onGenerateAIZooms?: () => void;
	/** Global Auto-Focus toggle state + handler. */
	autoFocusAll?: boolean;
	onToggleAutoFocusAll?: (on: boolean) => void;
	onZoomSpanChange: (id: string, span: Span) => void;
	onZoomDelete: (id: string) => void;
	selectedZoomId: string | null;
	onSelectZoom: (id: string | null) => void;
	trimRegions?: TrimRegion[];
	onTrimAdded?: (span: Span) => void;
	onTrimSpanChange?: (id: string, span: Span) => void;
	onTrimDelete?: (id: string) => void;
	selectedTrimId?: string | null;
	onSelectTrim?: (id: string | null) => void;
	annotationRegions?: AnnotationRegion[];
	onAnnotationAdded?: (span: Span) => void;
	onAnnotationSpanChange?: (id: string, span: Span) => void;
	onAnnotationDelete?: (id: string) => void;
	selectedAnnotationId?: string | null;
	onSelectAnnotation?: (id: string | null) => void;
	blurRegions?: AnnotationRegion[];
	onBlurAdded?: (span: Span) => void;
	onBlurSpanChange?: (id: string, span: Span) => void;
	onBlurDelete?: (id: string) => void;
	selectedBlurId?: string | null;
	onSelectBlur?: (id: string | null) => void;
	speedRegions?: SpeedRegion[];
	onSpeedAdded?: (span: Span) => void;
	onSpeedSpanChange?: (id: string, span: Span) => void;
	onSpeedDelete?: (id: string) => void;
	selectedSpeedId?: string | null;
	onSelectSpeed?: (id: string | null) => void;
	aspectRatio: AspectRatio;
	onAspectRatioChange: (aspectRatio: AspectRatio) => void;
	videoUrl?: string;
	showTrimWaveform?: boolean;
	/** Opens the auto-captions flow. When omitted, the captions button is hidden. */
	onGenerateCaptions?: () => void;
	isGeneratingCaptions?: boolean;
	/** Localized label for the auto-captions button (lives in the `editor` namespace). */
	captionsLabel?: string;
}

interface TimelineScaleConfig {
	minItemDurationMs: number;
	defaultItemDurationMs: number;
	minVisibleRangeMs: number;
}

interface TimelineRenderItem {
	id: string;
	rowId: string;
	span: Span;
	label: string;
	zoomDepth?: number;
	zoomCustomScale?: number;
	speedValue?: number;
	isAutoFocus?: boolean;
	variant: "zoom" | "trim" | "annotation" | "speed" | "blur";
	easeInMs?: number;
	easeOutMs?: number;
	holdStartMs?: number;
	holdEndMs?: number;
}

const SCALE_CANDIDATES = [
	{ intervalSeconds: 0.05, gridSeconds: 0.01 },
	{ intervalSeconds: 0.1, gridSeconds: 0.02 },
	{ intervalSeconds: 0.25, gridSeconds: 0.05 },
	{ intervalSeconds: 0.5, gridSeconds: 0.1 },
	{ intervalSeconds: 1, gridSeconds: 0.25 },
	{ intervalSeconds: 2, gridSeconds: 0.5 },
	{ intervalSeconds: 5, gridSeconds: 1 },
	{ intervalSeconds: 10, gridSeconds: 2 },
	{ intervalSeconds: 15, gridSeconds: 3 },
	{ intervalSeconds: 30, gridSeconds: 5 },
	{ intervalSeconds: 60, gridSeconds: 10 },
	{ intervalSeconds: 120, gridSeconds: 20 },
	{ intervalSeconds: 300, gridSeconds: 30 },
	{ intervalSeconds: 600, gridSeconds: 60 },
	{ intervalSeconds: 900, gridSeconds: 120 },
	{ intervalSeconds: 1800, gridSeconds: 180 },
	{ intervalSeconds: 3600, gridSeconds: 300 },
];

/**
 * Picks the best axis interval for the currently visible time range, so marker
 * density stays meaningful regardless of video length.
 */
function calculateAxisScale(visibleRangeMs: number): { intervalMs: number; gridMs: number } {
	const visibleSeconds = visibleRangeMs / 1000;
	const candidate =
		SCALE_CANDIDATES.find((c) => {
			if (visibleSeconds <= 0) return true;
			return visibleSeconds / c.intervalSeconds <= TARGET_MARKER_COUNT;
		}) ?? SCALE_CANDIDATES[SCALE_CANDIDATES.length - 1];
	return {
		intervalMs: Math.round(candidate.intervalSeconds * 1000),
		gridMs: Math.round(candidate.gridSeconds * 1000),
	};
}

function calculateTimelineScale(durationSeconds: number): TimelineScaleConfig {
	const totalMs = Math.max(0, Math.round(durationSeconds * 1000));

	// 100ms, precise enough to cut but still grabbable.
	const minItemDurationMs = 100;

	// 5% of duration, clamped to 1-30s.
	const defaultItemDurationMs =
		totalMs > 0
			? Math.max(minItemDurationMs, Math.min(Math.round(totalMs * 0.05), 30000))
			: Math.max(minItemDurationMs, 1000);

	// 300ms, enough to view 0.1s items comfortably. Axis markers adapt via
	// calculateAxisScale, so there's no cap on zoom-in.
	const minVisibleRangeMs = 300;

	return {
		minItemDurationMs,
		defaultItemDurationMs,
		minVisibleRangeMs,
	};
}

function createInitialRange(totalMs: number): Range {
	if (totalMs > 0) {
		return { start: 0, end: totalMs };
	}

	return { start: 0, end: FALLBACK_RANGE_MS };
}

function clampVisibleRange(candidate: Range, totalMs: number): Range {
	if (totalMs <= 0) {
		return candidate;
	}

	const span = Math.max(candidate.end - candidate.start, 1);

	if (span >= totalMs) {
		return { start: 0, end: totalMs };
	}

	const start = Math.max(0, Math.min(candidate.start, totalMs - span));
	return { start, end: start + span };
}

function normalizeWheelDelta(delta: number, deltaMode: number, pageSizePx: number): number {
	if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
		return delta * 16;
	}

	if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
		return delta * pageSizePx;
	}

	return delta;
}

function formatTimeLabel(milliseconds: number, intervalMs: number) {
	const totalSeconds = milliseconds / 1000;
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const fractionalDigits = intervalMs < 250 ? 2 : intervalMs < 1000 ? 1 : 0;

	if (hours > 0) {
		const minutesString = minutes.toString().padStart(2, "0");
		const secondsString = Math.floor(seconds).toString().padStart(2, "0");
		return `${hours}:${minutesString}:${secondsString}`;
	}

	if (fractionalDigits > 0) {
		const secondsWithFraction = seconds.toFixed(fractionalDigits);
		const [wholeSeconds, fraction] = secondsWithFraction.split(".");
		return `${minutes}:${wholeSeconds.padStart(2, "0")}.${fraction}`;
	}

	return `${minutes}:${Math.floor(seconds).toString().padStart(2, "0")}`;
}

function formatPlayheadTime(ms: number): string {
	const s = ms / 1000;
	const min = Math.floor(s / 60);
	const sec = s % 60;
	if (min > 0) return `${min}:${sec.toFixed(1).padStart(4, "0")}`;
	return `${sec.toFixed(1)}s`;
}

function shouldStartTimelineScrub(target: EventTarget | null, timelineElement: HTMLElement) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	for (let element: HTMLElement | null = target; element && element !== timelineElement; ) {
		const className = element.className;
		const classText = typeof className === "string" ? className : "";

		if (
			classText.split(/\s+/).includes("group") ||
			classText.includes("cursor-grab") ||
			classText.includes("cursor-grabbing") ||
			classText.includes("cursor-ew-resize") ||
			element.style.cursor === "col-resize"
		) {
			return false;
		}

		element = element.parentElement;
	}

	return true;
}

function PlaybackCursor({
	currentTimeMs,
	videoDurationMs,
	onSeek,
	onRangeChange,
	timelineRef,
	keyframes = [],
}: {
	currentTimeMs: number;
	videoDurationMs: number;
	onSeek?: (time: number) => void;
	onRangeChange?: (updater: (previous: Range) => Range) => void;
	timelineRef: React.RefObject<HTMLDivElement>;
	keyframes?: { id: string; time: number }[];
}) {
	const { sidebarWidth, direction, range, valueToPixels, pixelsToValue } = useTimelineContext();
	const sideProperty = direction === "rtl" ? "right" : "left";
	const [isDragging, setIsDragging] = useState(false);
	const [dragPreviewTimeMs, setDragPreviewTimeMs] = useState<number | null>(null);

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			if (!timelineRef.current || !onSeek) return;

			const rect = timelineRef.current.getBoundingClientRect();
			const clickX = e.clientX - rect.left - sidebarWidth;
			const contentWidth = Math.max(rect.width - sidebarWidth, 1);

			// Allow dragging past the edges, but clamp the value
			const relativeMs = pixelsToValue(clickX);
			let absoluteMs = Math.max(0, Math.min(range.start + relativeMs, videoDurationMs));

			// Snap to a keyframe within 150ms
			const snapThresholdMs = 150;
			const nearbyKeyframe = keyframes.find(
				(kf) =>
					Math.abs(kf.time - absoluteMs) <= snapThresholdMs &&
					kf.time >= range.start &&
					kf.time <= range.end,
			);

			if (nearbyKeyframe) {
				absoluteMs = nearbyKeyframe.time;
			}

			setDragPreviewTimeMs(absoluteMs);

			const visibleMs = range.end - range.start;
			if (onRangeChange && visibleMs > 0 && videoDurationMs > visibleMs) {
				const msPerPixel = visibleMs / contentWidth;
				const overflowLeftPx = Math.max(0, -clickX);
				const overflowRightPx = Math.max(0, clickX - contentWidth);

				if (overflowLeftPx > 0 && range.start > 0) {
					const shiftMs = overflowLeftPx * msPerPixel;
					onRangeChange((previous) => {
						const nextRange = clampVisibleRange(
							{
								start: previous.start - shiftMs,
								end: previous.end - shiftMs,
							},
							videoDurationMs,
						);
						return nextRange.start === previous.start && nextRange.end === previous.end
							? previous
							: nextRange;
					});
				} else if (overflowRightPx > 0 && range.end < videoDurationMs) {
					const shiftMs = overflowRightPx * msPerPixel;
					onRangeChange((previous) => {
						const nextRange = clampVisibleRange(
							{
								start: previous.start + shiftMs,
								end: previous.end + shiftMs,
							},
							videoDurationMs,
						);
						return nextRange.start === previous.start && nextRange.end === previous.end
							? previous
							: nextRange;
					});
				}
			}

			onSeek(absoluteMs / 1000);
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			setDragPreviewTimeMs(null);
			document.body.style.cursor = "";
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		document.body.style.cursor = "ew-resize";

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "";
		};
	}, [
		isDragging,
		onSeek,
		onRangeChange,
		timelineRef,
		sidebarWidth,
		range.start,
		range.end,
		videoDurationMs,
		pixelsToValue,
		keyframes,
	]);

	const displayTimeMs =
		isDragging && dragPreviewTimeMs !== null ? dragPreviewTimeMs : currentTimeMs;

	if (videoDurationMs <= 0 || displayTimeMs < 0) {
		return null;
	}

	const clampedTime = Math.min(displayTimeMs, videoDurationMs);

	if (clampedTime < range.start || clampedTime > range.end) {
		return null;
	}

	const offset = valueToPixels(clampedTime - range.start);

	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;

	return (
		<div
			className="absolute top-0 bottom-0 z-50 group/cursor"
			style={{
				[sideProperty === "right" ? "marginRight" : "marginLeft"]: `${sidebarWidth - 1}px`,
				pointerEvents: "none",
			}}
		>
			<div
				className="absolute top-0 bottom-0 w-[2px] cursor-ew-resize pointer-events-auto transition-shadow"
				style={{
					[sideProperty]: `${offset}px`,
					backgroundColor: activeAccent.hex,
					boxShadow: `0 0 14px ${activeAccent.hex}`,
				}}
				onMouseDown={(e) => {
					e.stopPropagation();
					setDragPreviewTimeMs(currentTimeMs);
					setIsDragging(true);
				}}
			>
				<div
					className="absolute -top-2 left-1/2 -translate-x-1/2 hover:scale-110 transition-transform"
					style={{ width: "20px", height: "20px" }}
				>
					<div
						className="w-4 h-4 mx-auto mt-[2px] rotate-45 rounded-[5px] shadow-lg border border-white/30"
						style={{
							backgroundColor: activeAccent.hex,
							boxShadow: `0 0 10px ${activeAccent.hex}80`,
						}}
					/>
				</div>
				{isDragging && (
					<div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white/90 font-medium tabular-nums whitespace-nowrap border border-white/10 shadow-lg pointer-events-none">
						{formatPlayheadTime(clampedTime)}
					</div>
				)}
			</div>
		</div>
	);
}

function TimelineAxis({
	videoDurationMs,
	currentTimeMs,
}: {
	videoDurationMs: number;
	currentTimeMs: number;
}) {
	const { sidebarWidth, direction, range, valueToPixels } = useTimelineContext();
	const sideProperty = direction === "rtl" ? "right" : "left";
	const axisPrefs = loadUserPreferences();
	const axisIsLight = axisPrefs.theme === "light";

	const { intervalMs } = useMemo(
		() => calculateAxisScale(range.end - range.start),
		[range.end, range.start],
	);

	const markers = useMemo(() => {
		if (intervalMs <= 0) {
			return { markers: [], minorTicks: [] };
		}

		const maxTime = videoDurationMs > 0 ? videoDurationMs : range.end;
		const visibleStart = Math.max(0, Math.min(range.start, maxTime));
		const visibleEnd = Math.min(range.end, maxTime);
		const markerTimes = new Set<number>();

		const firstMarker = Math.ceil(visibleStart / intervalMs) * intervalMs;

		for (let time = firstMarker; time <= maxTime; time += intervalMs) {
			if (time >= visibleStart && time <= visibleEnd) {
				markerTimes.add(Math.round(time));
			}
		}

		if (visibleStart <= maxTime) {
			markerTimes.add(Math.round(visibleStart));
		}

		if (videoDurationMs > 0) {
			markerTimes.add(Math.round(videoDurationMs));
		}

		const sorted = Array.from(markerTimes)
			.filter((time) => time <= maxTime)
			.sort((a, b) => a - b);

		// 4 minor ticks between major intervals
		const minorTicks = [];
		const minorInterval = intervalMs / 5;

		for (let time = firstMarker; time <= maxTime; time += minorInterval) {
			if (time >= visibleStart && time <= visibleEnd) {
				const isMajor = Math.abs(time % intervalMs) < 1;
				if (!isMajor) {
					minorTicks.push(time);
				}
			}
		}

		return {
			markers: sorted.map((time) => ({
				time,
				label: formatTimeLabel(time, intervalMs),
			})),
			minorTicks,
		};
	}, [intervalMs, range.end, range.start, videoDurationMs]);

	return (
		<div
			className={`h-9 border-b relative overflow-hidden select-none ${axisIsLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#0c0d10] border-white/[0.07]"}`}
			style={{
				[sideProperty === "right" ? "marginRight" : "marginLeft"]: `${sidebarWidth}px`,
			}}
		>
			{/* Minor Ticks */}
			{markers.minorTicks.map((time) => {
				const offset = valueToPixels(time - range.start);
				return (
					<div
						key={`minor-${time}`}
						className={`absolute bottom-0 h-1.5 w-[1px] ${axisIsLight ? "bg-slate-300/40" : "bg-white/[0.07]"}`}
						style={{ [sideProperty]: `${offset}px` }}
					/>
				);
			})}

			{/* Major Markers */}
			{markers.markers.map((marker) => {
				const offset = valueToPixels(marker.time - range.start);
				const markerStyle: React.CSSProperties = {
					position: "absolute",
					bottom: 0,
					height: "100%",
					display: "flex",
					flexDirection: "row",
					alignItems: "flex-end",
					[sideProperty]: `${offset}px`,
				};

				return (
					<div key={marker.time} style={markerStyle}>
						<div className="flex flex-col items-center pb-1">
							<div className={`h-2.5 w-[1px] mb-1 ${axisIsLight ? "bg-slate-400/40" : "bg-white/20"}`} />
							<span
								className={cn(
									"text-[10px] font-medium tabular-nums tracking-tight",
									marker.time === currentTimeMs ? "text-[#34B27B]" : "text-slate-500",
								)}
							>
								{marker.label}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function Timeline({
	items,
	videoDurationMs,
	currentTimeMs,
	onSeek,
	onRangeChange,
	onSelectZoom,
	onSelectTrim,
	onSelectAnnotation,
	onSelectBlur,
	onSelectSpeed,
	selectedZoomId,
	selectedTrimId,
	selectedAnnotationId,
	selectedBlurId,
	selectedSpeedId,
	keyframes = [],
	videoUrl,
	showTrimWaveform = false,
	onAddZoom,
	onAddTrim,
	onAddAnnotation,
	onAddBlur,
	onAddSpeed,
}: {
	items: TimelineRenderItem[];
	videoDurationMs: number;
	currentTimeMs: number;
	onSeek?: (time: number) => void;
	onRangeChange?: (updater: (previous: Range) => Range) => void;
	onSelectZoom?: (id: string | null) => void;
	onSelectTrim?: (id: string | null) => void;
	onSelectAnnotation?: (id: string | null) => void;
	onSelectBlur?: (id: string | null) => void;
	onSelectSpeed?: (id: string | null) => void;
	selectedZoomId: string | null;
	selectedTrimId?: string | null;
	selectedAnnotationId?: string | null;
	selectedBlurId?: string | null;
	selectedSpeedId?: string | null;
	keyframes?: { id: string; time: number }[];
	videoUrl?: string;
	showTrimWaveform?: boolean;
	onAddZoom?: () => void;
	onAddTrim?: () => void;
	onAddAnnotation?: () => void;
	onAddBlur?: () => void;
	onAddSpeed?: () => void;
}) {
	const t = useScopedT("timeline");
	const prefs = loadUserPreferences();
	const isLight = prefs.theme === "light";
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const { setTimelineRef, style, sidebarWidth, range, pixelsToValue } = useTimelineContext();
	const localTimelineRef = useRef<HTMLDivElement | null>(null);
	const isScrubbingTimelineRef = useRef(false);
	const scrubPointerIdRef = useRef<number | null>(null);
	const peaks = useAudioPeaks(showTrimWaveform ? videoUrl : undefined);

	const setRefs = useCallback(
		(node: HTMLDivElement | null) => {
			setTimelineRef(node);
			localTimelineRef.current = node;
		},
		[setTimelineRef],
	);

	const seekTimelineAtClientX = useCallback(
		(timelineElement: HTMLDivElement, clientX: number) => {
			if (!onSeek || videoDurationMs <= 0) return false;

			const rect = timelineElement.getBoundingClientRect();
			const clickX = clientX - rect.left - sidebarWidth;

			if (clickX < 0) return false;

			const relativeMs = pixelsToValue(clickX);
			const absoluteMs = Math.max(0, Math.min(range.start + relativeMs, videoDurationMs));

			onSeek(absoluteMs / 1000);
			return true;
		},
		[onSeek, videoDurationMs, sidebarWidth, pixelsToValue, range.start],
	);

	const clearTimelineSelection = useCallback(() => {
		onSelectZoom?.(null);
		onSelectTrim?.(null);
		onSelectAnnotation?.(null);
		onSelectBlur?.(null);
		onSelectSpeed?.(null);
	}, [onSelectZoom, onSelectTrim, onSelectAnnotation, onSelectBlur, onSelectSpeed]);

	const handleTimelineClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// Items stop propagation, so this only fires on empty space
			clearTimelineSelection();
			seekTimelineAtClientX(e.currentTarget, e.clientX);
		},
		[clearTimelineSelection, seekTimelineAtClientX],
	);

	const handleTimelinePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) {
				return;
			}

			if (!shouldStartTimelineScrub(e.target, e.currentTarget)) {
				return;
			}

			if (!seekTimelineAtClientX(e.currentTarget, e.clientX)) {
				return;
			}

			clearTimelineSelection();
			isScrubbingTimelineRef.current = true;
			scrubPointerIdRef.current = e.pointerId;
			e.currentTarget.setPointerCapture(e.pointerId);
			e.preventDefault();
		},
		[clearTimelineSelection, seekTimelineAtClientX],
	);

	const handleTimelinePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!isScrubbingTimelineRef.current || scrubPointerIdRef.current !== e.pointerId) {
				return;
			}

			seekTimelineAtClientX(e.currentTarget, e.clientX);
			e.preventDefault();
		},
		[seekTimelineAtClientX],
	);

	const stopTimelineScrub = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!isScrubbingTimelineRef.current || scrubPointerIdRef.current !== e.pointerId) {
			return;
		}

		isScrubbingTimelineRef.current = false;
		scrubPointerIdRef.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
	}, []);

	const handleTimelinePointerLeave = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (isScrubbingTimelineRef.current && scrubPointerIdRef.current === e.pointerId) {
				seekTimelineAtClientX(e.currentTarget, e.clientX);
			}
		},
		[seekTimelineAtClientX],
	);

	const handleTimelineLostPointerCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (scrubPointerIdRef.current === e.pointerId) {
			isScrubbingTimelineRef.current = false;
			scrubPointerIdRef.current = null;
		}
	}, []);

	const handleTimelineWheel = useCallback(
		(event: React.WheelEvent<HTMLDivElement>) => {
			if (!onRangeChange || event.ctrlKey || event.metaKey || videoDurationMs <= 0) {
				return;
			}

			const visibleMs = range.end - range.start;
			if (visibleMs <= 0 || videoDurationMs <= visibleMs) {
				return;
			}

			const dominantDelta =
				Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
			if (dominantDelta === 0) {
				return;
			}

			event.preventDefault();

			const pageWidthPx = Math.max(event.currentTarget.clientWidth - sidebarWidth, 1);
			const normalizedDeltaPx = normalizeWheelDelta(dominantDelta, event.deltaMode, pageWidthPx);
			const shiftMs = pixelsToValue(normalizedDeltaPx);

			onRangeChange((previous) => {
				const nextRange = clampVisibleRange(
					{
						start: previous.start + shiftMs,
						end: previous.end + shiftMs,
					},
					videoDurationMs,
				);

				return nextRange.start === previous.start && nextRange.end === previous.end
					? previous
					: nextRange;
			});
		},
		[onRangeChange, videoDurationMs, range.end, range.start, sidebarWidth, pixelsToValue],
	);

	const zoomItems = items.filter((item) => item.rowId === ZOOM_ROW_ID);
	const trimItems = items.filter((item) => item.rowId === TRIM_ROW_ID);
	const annotationItems = items.filter((item) => item.rowId === ANNOTATION_ROW_ID);
	const blurItems = items.filter((item) => item.rowId === BLUR_ROW_ID);
	const speedItems = items.filter((item) => item.rowId === SPEED_ROW_ID);

	return (
		<div
			ref={setRefs}
			style={{ ...style, touchAction: "none" }}
			className={cn(
				"select-none min-h-[190px] relative cursor-pointer group transition-colors",
				isLight ? "bg-white" : "bg-[#0b0c0f]"
			)}
			onClick={handleTimelineClick}
			onPointerDown={handleTimelinePointerDown}
			onPointerMove={handleTimelinePointerMove}
			onPointerUp={stopTimelineScrub}
			onPointerCancel={stopTimelineScrub}
			onPointerLeave={handleTimelinePointerLeave}
			onLostPointerCapture={handleTimelineLostPointerCapture}
			onWheel={handleTimelineWheel}
		>
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px)] bg-[length:24px_100%] pointer-events-none" />
			{/* Top-Left Corner Header above Track Labels */}
			<div
				className={cn(
					"absolute top-0 left-0 h-9 border-b border-r flex items-center px-3 text-[10px] font-bold uppercase tracking-wider select-none z-20 transition-colors",
					isLight ? "bg-[#f4f4f5] border-[#e4e4e7] text-slate-500" : "bg-[#0c0d10] border-white/[0.07] text-slate-400"
				)}
				style={{ width: `${sidebarWidth}px` }}
			>
				<span>Tracks</span>
			</div>
			<TimelineAxis videoDurationMs={videoDurationMs} currentTimeMs={currentTimeMs} />
			<PlaybackCursor
				currentTimeMs={currentTimeMs}
				videoDurationMs={videoDurationMs}
				onSeek={onSeek}
				onRangeChange={onRangeChange}
				timelineRef={localTimelineRef}
				keyframes={keyframes}
			/>

			<Row
				id={ZOOM_ROW_ID}
				isEmpty={zoomItems.length === 0}
				hint={t("hints.pressZoom")}
				label="Zoom"
				icon={<ZoomIn className="w-3.5 h-3.5" />}
				shortcutKey="Z"
				accentColorHex={activeAccent.hex}
				onAddClick={onAddZoom}
			>
				{zoomItems.map((item) => (
					<Item
						id={item.id}
						key={item.id}
						rowId={item.rowId}
						span={item.span}
						isSelected={item.id === selectedZoomId}
						onSelect={() => onSelectZoom?.(item.id)}
						zoomDepth={item.zoomDepth}
						zoomCustomScale={item.zoomCustomScale}
						isAutoFocus={item.isAutoFocus}
						variant="zoom"
						easeInMs={item.easeInMs}
						easeOutMs={item.easeOutMs}
						holdStartMs={item.holdStartMs}
						holdEndMs={item.holdEndMs}
					>
						{item.label}
					</Item>
				))}
			</Row>

			<Row
				id={TRIM_ROW_ID}
				isEmpty={trimItems.length === 0}
				hint={t("hints.pressTrim")}
				label="Trim"
				icon={<Scissors className="w-3.5 h-3.5" />}
				shortcutKey="T"
				accentColorHex="#ef4444"
				onAddClick={onAddTrim}
				background={
					showTrimWaveform ? (
						<BackgroundWaveform
							peaks={peaks}
							videoDurationMs={videoDurationMs}
							topInset={3}
							bottomInset={3}
						/>
					) : undefined
				}
			>
				{trimItems.map((item) => (
					<Item
						id={item.id}
						key={item.id}
						rowId={item.rowId}
						span={item.span}
						isSelected={item.id === selectedTrimId}
						onSelect={() => onSelectTrim?.(item.id)}
						variant="trim"
					>
						{item.label}
					</Item>
				))}
			</Row>

			<Row
				id={ANNOTATION_ROW_ID}
				isEmpty={annotationItems.length === 0}
				hint={t("hints.pressAnnotation")}
				label="Text"
				icon={<MessageSquare className="w-3.5 h-3.5" />}
				shortcutKey="A"
				accentColorHex="#f59e0b"
				onAddClick={onAddAnnotation}
			>
				{annotationItems.map((item) => (
					<Item
						id={item.id}
						key={item.id}
						rowId={item.rowId}
						span={item.span}
						isSelected={item.id === selectedAnnotationId}
						onSelect={() => onSelectAnnotation?.(item.id)}
						variant="annotation"
					>
						{item.label}
					</Item>
				))}
			</Row>

			{BLUR_REGIONS_ENABLED && (
				<Row
					id={BLUR_ROW_ID}
					isEmpty={blurItems.length === 0}
					hint={t("hints.pressBlur")}
					label="Blur"
					icon={
						<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="8" cy="12" r="3" />
							<circle cx="16" cy="12" r="3" />
							<path d="M6 6h12M6 18h12" />
						</svg>
					}
					shortcutKey="B"
					accentColorHex="#38bdf8"
					onAddClick={onAddBlur}
				>
					{blurItems.map((item) => (
						<Item
							id={item.id}
							key={item.id}
							rowId={item.rowId}
							span={item.span}
							isSelected={item.id === selectedBlurId}
							onSelect={() => onSelectBlur?.(item.id)}
							variant={item.variant}
						>
							{item.label}
						</Item>
					))}
				</Row>
			)}

			<Row
				id={SPEED_ROW_ID}
				isEmpty={speedItems.length === 0}
				hint={t("hints.pressSpeed")}
				label="Speed"
				icon={<Gauge className="w-3.5 h-3.5" />}
				shortcutKey="S"
				accentColorHex="#f97316"
				onAddClick={onAddSpeed}
			>
				{speedItems.map((item) => (
					<Item
						id={item.id}
						key={item.id}
						rowId={item.rowId}
						span={item.span}
						isSelected={item.id === selectedSpeedId}
						onSelect={() => onSelectSpeed?.(item.id)}
						variant="speed"
						speedValue={item.speedValue}
					>
						{item.label}
					</Item>
				))}
			</Row>
		</div>
	);
}

export default function TimelineEditor({
	videoDuration,
	hasVideoSource = false,
	currentTime,
	onSeek,
	zoomRegions,
	onZoomAdded,
	autoZoomEnabled = true,
	onToggleAutoZoom,
	onGenerateAIZooms,
	autoFocusAll = false,
	onToggleAutoFocusAll,
	onZoomSpanChange,
	onZoomDelete,
	selectedZoomId,
	onSelectZoom,
	trimRegions = [],
	onTrimAdded,
	onTrimSpanChange,
	onTrimDelete,
	selectedTrimId,
	onSelectTrim,
	annotationRegions = [],
	onAnnotationAdded,
	onAnnotationSpanChange,
	onAnnotationDelete,
	selectedAnnotationId,
	onSelectAnnotation,
	blurRegions = [],
	onBlurAdded,
	onBlurSpanChange,
	onBlurDelete,
	selectedBlurId,
	onSelectBlur,
	speedRegions = [],
	onSpeedAdded,
	onSpeedSpanChange,
	onSpeedDelete,
	selectedSpeedId,
	onSelectSpeed,
	aspectRatio,
	onAspectRatioChange,
	videoUrl,
	showTrimWaveform = false,
	onGenerateCaptions,
	isGeneratingCaptions = false,
	captionsLabel,
}: TimelineEditorProps) {
	const t = useScopedT("timeline");
	const prefs = loadUserPreferences();
	const isLight = prefs.theme === "light";
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const totalMs = useMemo(() => Math.max(0, Math.round(videoDuration * 1000)), [videoDuration]);
	const currentTimeMs = useMemo(() => Math.round(currentTime * 1000), [currentTime]);
	const timelineScale = useMemo(() => calculateTimelineScale(videoDuration), [videoDuration]);
	const safeMinDurationMs = useMemo(
		() =>
			totalMs > 0
				? Math.min(timelineScale.minItemDurationMs, totalMs)
				: timelineScale.minItemDurationMs,
		[timelineScale.minItemDurationMs, totalMs],
	);

	const [range, setRange] = useState<Range>(() => createInitialRange(totalMs));
	const [keyframes, setKeyframes] = useState<{ id: string; time: number }[]>([]);
	const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
	const [scrollLabels, setScrollLabels] = useState({
		pan: "Scroll",
		zoom: "Ctrl + Scroll",
	});
	const timelineContainerRef = useRef<HTMLDivElement>(null);
	const { shortcuts: keyShortcuts, isMac } = useShortcuts();

	useEffect(() => {
		formatShortcut(["mod", "Scroll"]).then((zoom) => {
			setScrollLabels({ pan: "Scroll", zoom });
		});
	}, []);

	const addKeyframe = useCallback(() => {
		if (totalMs === 0) return;
		const time = Math.max(0, Math.min(currentTimeMs, totalMs));
		if (keyframes.some((kf) => Math.abs(kf.time - time) < 1)) return;
		setKeyframes((prev) => [...prev, { id: uuidv4(), time }]);
	}, [currentTimeMs, totalMs, keyframes]);

	const deleteSelectedKeyframe = useCallback(() => {
		if (!selectedKeyframeId) return;
		setKeyframes((prev) => prev.filter((kf) => kf.id !== selectedKeyframeId));
		setSelectedKeyframeId(null);
	}, [selectedKeyframeId]);

	const handleKeyframeMove = useCallback(
		(id: string, newTime: number) => {
			setKeyframes((prev) =>
				prev.map((kf) =>
					kf.id === id ? { ...kf, time: Math.max(0, Math.min(newTime, totalMs)) } : kf,
				),
			);
		},
		[totalMs],
	);

	const deleteSelectedZoom = useCallback(() => {
		if (!selectedZoomId) return;
		onZoomDelete(selectedZoomId);
		onSelectZoom(null);
	}, [selectedZoomId, onZoomDelete, onSelectZoom]);

	const deleteSelectedTrim = useCallback(() => {
		if (!selectedTrimId || !onTrimDelete || !onSelectTrim) return;
		onTrimDelete(selectedTrimId);
		onSelectTrim(null);
	}, [selectedTrimId, onTrimDelete, onSelectTrim]);

	const deleteSelectedAnnotation = useCallback(() => {
		if (!selectedAnnotationId || !onAnnotationDelete || !onSelectAnnotation) return;
		onAnnotationDelete(selectedAnnotationId);
		onSelectAnnotation(null);
	}, [selectedAnnotationId, onAnnotationDelete, onSelectAnnotation]);

	const deleteSelectedBlur = useCallback(() => {
		if (!selectedBlurId || !onBlurDelete || !onSelectBlur) return;
		onBlurDelete(selectedBlurId);
		onSelectBlur(null);
	}, [selectedBlurId, onBlurDelete, onSelectBlur]);

	const deleteSelectedSpeed = useCallback(() => {
		if (!selectedSpeedId || !onSpeedDelete || !onSelectSpeed) return;
		onSpeedDelete(selectedSpeedId);
		onSelectSpeed(null);
	}, [selectedSpeedId, onSpeedDelete, onSelectSpeed]);

	useEffect(() => {
		setRange(createInitialRange(totalMs));
	}, [totalMs]);

	// Normalize regions only when timeline bounds change. Reading via refs avoids a
	// dependency loop that would re-fire on every drag and race dnd-timeline's state.
	const zoomRegionsRef = useRef(zoomRegions);
	const trimRegionsRef = useRef(trimRegions);
	const speedRegionsRef = useRef(speedRegions);
	zoomRegionsRef.current = zoomRegions;
	trimRegionsRef.current = trimRegions;
	speedRegionsRef.current = speedRegions;

	useEffect(() => {
		if (totalMs === 0 || safeMinDurationMs <= 0) {
			return;
		}

		zoomRegionsRef.current.forEach((region) => {
			const clampedStart = Math.max(0, Math.min(region.startMs, totalMs));
			const minEnd = clampedStart + safeMinDurationMs;
			const clampedEnd = Math.min(totalMs, Math.max(minEnd, region.endMs));
			const normalizedStart = Math.max(0, Math.min(clampedStart, totalMs - safeMinDurationMs));
			const normalizedEnd = Math.max(minEnd, Math.min(clampedEnd, totalMs));

			if (normalizedStart !== region.startMs || normalizedEnd !== region.endMs) {
				onZoomSpanChange(region.id, { start: normalizedStart, end: normalizedEnd });
			}
		});

		trimRegionsRef.current.forEach((region) => {
			const clampedStart = Math.max(0, Math.min(region.startMs, totalMs));
			const minEnd = clampedStart + safeMinDurationMs;
			const clampedEnd = Math.min(totalMs, Math.max(minEnd, region.endMs));
			const normalizedStart = Math.max(0, Math.min(clampedStart, totalMs - safeMinDurationMs));
			const normalizedEnd = Math.max(minEnd, Math.min(clampedEnd, totalMs));

			if (normalizedStart !== region.startMs || normalizedEnd !== region.endMs) {
				onTrimSpanChange?.(region.id, { start: normalizedStart, end: normalizedEnd });
			}
		});

		speedRegionsRef.current.forEach((region) => {
			const clampedStart = Math.max(0, Math.min(region.startMs, totalMs));
			const minEnd = clampedStart + safeMinDurationMs;
			const clampedEnd = Math.min(totalMs, Math.max(minEnd, region.endMs));
			const normalizedStart = Math.max(0, Math.min(clampedStart, totalMs - safeMinDurationMs));
			const normalizedEnd = Math.max(minEnd, Math.min(clampedEnd, totalMs));

			if (normalizedStart !== region.startMs || normalizedEnd !== region.endMs) {
				onSpeedSpanChange?.(region.id, { start: normalizedStart, end: normalizedEnd });
			}
		});
	}, [totalMs, safeMinDurationMs, onZoomSpanChange, onTrimSpanChange, onSpeedSpanChange]);

	const hasOverlap = useCallback(
		(newSpan: Span, excludeId?: string): boolean => {
			const isZoomItem = zoomRegions.some((r) => r.id === excludeId);
			const isTrimItem = trimRegions.some((r) => r.id === excludeId);
			const isAnnotationItem = annotationRegions.some((r) => r.id === excludeId);
			const isBlurItem = blurRegions.some((r) => r.id === excludeId);
			const isSpeedItem = speedRegions.some((r) => r.id === excludeId);

			if (isAnnotationItem || isBlurItem) {
				return false;
			}

			const checkOverlap = (regions: (ZoomRegion | TrimRegion | SpeedRegion)[]) => {
				return regions.some((region) => {
					if (region.id === excludeId) return false;
					// True intersection, adjacency is allowed
					return newSpan.end > region.startMs && newSpan.start < region.endMs;
				});
			};

			if (isZoomItem) {
				return checkOverlap(zoomRegions);
			}

			if (isTrimItem) {
				return checkOverlap(trimRegions);
			}

			if (isSpeedItem) {
				return checkOverlap(speedRegions);
			}

			return false;
		},
		[zoomRegions, trimRegions, annotationRegions, blurRegions, speedRegions],
	);

	// 5% of the timeline or 1000ms, whichever is larger, so it's wide enough to grab.
	const defaultRegionDurationMs = useMemo(
		() => Math.max(1000, Math.round(totalMs * 0.05)),
		[totalMs],
	);

	const handleAddZoom = useCallback(() => {
		if (!videoDuration || videoDuration === 0 || totalMs === 0) {
			return;
		}

		const defaultDuration = Math.min(defaultRegionDurationMs, totalMs);
		if (defaultDuration <= 0) {
			return;
		}

		const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
		const sorted = [...zoomRegions].sort((a, b) => a.startMs - b.startMs);
		const nextRegion = sorted.find((region) => region.startMs > startPos);
		const gapToNext = nextRegion ? nextRegion.startMs - startPos : totalMs - startPos;

		const isOverlapping = sorted.some(
			(region) => startPos >= region.startMs && startPos < region.endMs,
		);
		if (isOverlapping || gapToNext <= 0) {
			toast.error(t("errors.cannotPlaceZoom"), {
				description: t("errors.zoomExistsAtLocation"),
			});
			return;
		}

		const actualDuration = Math.min(defaultRegionDurationMs, gapToNext);
		onZoomAdded({ start: startPos, end: startPos + actualDuration });
	}, [videoDuration, totalMs, currentTimeMs, zoomRegions, onZoomAdded, defaultRegionDurationMs, t]);

	const handleAddTrim = useCallback(() => {
		if (!videoDuration || videoDuration === 0 || totalMs === 0 || !onTrimAdded) {
			return;
		}

		const defaultDuration = Math.min(defaultRegionDurationMs, totalMs);
		if (defaultDuration <= 0) {
			return;
		}

		const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
		const sorted = [...trimRegions].sort((a, b) => a.startMs - b.startMs);
		const nextRegion = sorted.find((region) => region.startMs > startPos);
		const gapToNext = nextRegion ? nextRegion.startMs - startPos : totalMs - startPos;

		const isOverlapping = sorted.some(
			(region) => startPos >= region.startMs && startPos < region.endMs,
		);
		if (isOverlapping || gapToNext <= 0) {
			toast.error(t("errors.cannotPlaceTrim"), {
				description: t("errors.trimExistsAtLocation"),
			});
			return;
		}

		const actualDuration = Math.min(defaultRegionDurationMs, gapToNext);
		onTrimAdded({ start: startPos, end: startPos + actualDuration });
	}, [videoDuration, totalMs, currentTimeMs, trimRegions, onTrimAdded, defaultRegionDurationMs, t]);

	const handleAddSpeed = useCallback(() => {
		if (!videoDuration || videoDuration === 0 || totalMs === 0 || !onSpeedAdded) {
			return;
		}

		const defaultDuration = Math.min(defaultRegionDurationMs, totalMs);
		if (defaultDuration <= 0) {
			return;
		}

		const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
		const sorted = [...speedRegions].sort((a, b) => a.startMs - b.startMs);
		const nextRegion = sorted.find((region) => region.startMs > startPos);
		const gapToNext = nextRegion ? nextRegion.startMs - startPos : totalMs - startPos;

		const isOverlapping = sorted.some(
			(region) => startPos >= region.startMs && startPos < region.endMs,
		);
		if (isOverlapping || gapToNext <= 0) {
			toast.error(t("errors.cannotPlaceSpeed"), {
				description: t("errors.speedExistsAtLocation"),
			});
			return;
		}

		const actualDuration = Math.min(defaultRegionDurationMs, gapToNext);
		onSpeedAdded({ start: startPos, end: startPos + actualDuration });
	}, [
		videoDuration,
		totalMs,
		currentTimeMs,
		speedRegions,
		onSpeedAdded,
		defaultRegionDurationMs,
		t,
	]);

	const handleAddAnnotation = useCallback(() => {
		if (!videoDuration || videoDuration === 0 || totalMs === 0 || !onAnnotationAdded) {
			return;
		}

		const defaultDuration = Math.min(defaultRegionDurationMs, totalMs);
		if (defaultDuration <= 0) {
			return;
		}

		// Multiple annotations can exist at the same timestamp
		const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
		const endPos = Math.min(startPos + defaultDuration, totalMs);

		onAnnotationAdded({ start: startPos, end: endPos });
	}, [videoDuration, totalMs, currentTimeMs, onAnnotationAdded, defaultRegionDurationMs]);

	const handleAddBlur = useCallback(() => {
		if (!videoDuration || videoDuration === 0 || totalMs === 0 || !onBlurAdded) {
			return;
		}

		const defaultDuration = Math.min(defaultRegionDurationMs, totalMs);
		if (defaultDuration <= 0) {
			return;
		}

		const startPos = Math.max(0, Math.min(currentTimeMs, totalMs));
		const endPos = Math.min(startPos + defaultDuration, totalMs);
		onBlurAdded({ start: startPos, end: endPos });
	}, [videoDuration, totalMs, currentTimeMs, onBlurAdded, defaultRegionDurationMs]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			if (matchesShortcut(e, keyShortcuts.addKeyframe, isMac)) {
				addKeyframe();
			}
			if (matchesShortcut(e, keyShortcuts.addZoom, isMac)) {
				handleAddZoom();
			}
			if (matchesShortcut(e, keyShortcuts.addTrim, isMac)) {
				handleAddTrim();
			}
			if (matchesShortcut(e, keyShortcuts.addAnnotation, isMac)) {
				handleAddAnnotation();
			}
			if (BLUR_REGIONS_ENABLED && matchesShortcut(e, keyShortcuts.addBlur, isMac)) {
				handleAddBlur();
			}
			if (matchesShortcut(e, keyShortcuts.addSpeed, isMac)) {
				handleAddSpeed();
			}

			// Tab cycles through overlapping annotations at the current time
			if (e.key === "Tab" && annotationRegions.length > 0) {
				const currentTimeMs = Math.round(currentTime * 1000);
				const overlapping = annotationRegions
					.filter((a) => currentTimeMs >= a.startMs && currentTimeMs <= a.endMs)
					.sort((a, b) => a.zIndex - b.zIndex);

				if (overlapping.length > 0) {
					e.preventDefault();

					if (!selectedAnnotationId || !overlapping.some((a) => a.id === selectedAnnotationId)) {
						onSelectAnnotation?.(overlapping[0].id);
					} else {
						const currentIndex = overlapping.findIndex((a) => a.id === selectedAnnotationId);
						const nextIndex = e.shiftKey
							? (currentIndex - 1 + overlapping.length) % overlapping.length // Shift+Tab steps backward
							: (currentIndex + 1) % overlapping.length;
						onSelectAnnotation?.(overlapping[nextIndex].id);
					}
				}
			}
			// Delete key or Ctrl+D / Cmd+D
			if (
				e.key === "Delete" ||
				e.key === "Backspace" ||
				matchesShortcut(e, keyShortcuts.deleteSelected, isMac)
			) {
				if (selectedKeyframeId) {
					deleteSelectedKeyframe();
				} else if (selectedZoomId) {
					deleteSelectedZoom();
				} else if (selectedTrimId) {
					deleteSelectedTrim();
				} else if (selectedAnnotationId) {
					deleteSelectedAnnotation();
				} else if (selectedBlurId) {
					deleteSelectedBlur();
				} else if (selectedSpeedId) {
					deleteSelectedSpeed();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		addKeyframe,
		handleAddZoom,
		handleAddTrim,
		handleAddAnnotation,
		handleAddBlur,
		handleAddSpeed,
		deleteSelectedKeyframe,
		deleteSelectedZoom,
		deleteSelectedTrim,
		deleteSelectedAnnotation,
		deleteSelectedBlur,
		deleteSelectedSpeed,
		selectedKeyframeId,
		selectedZoomId,
		selectedTrimId,
		selectedAnnotationId,
		selectedBlurId,
		selectedSpeedId,
		annotationRegions,
		currentTime,
		onSelectAnnotation,
		keyShortcuts,
		isMac,
	]);

	const clampedRange = useMemo<Range>(() => {
		if (totalMs === 0) {
			return range;
		}

		return {
			start: Math.max(0, Math.min(range.start, totalMs)),
			end: Math.min(range.end, totalMs),
		};
	}, [range, totalMs]);

	const timelineItems = useMemo<TimelineRenderItem[]>(() => {
		const zooms: TimelineRenderItem[] = zoomRegions.map((region, index) => {
			const easeInMs = region.easeInMs ?? 1000;
			const easeOutMs = region.easeOutMs ?? 1000;
			const fullStart = Math.max(0, region.startMs - easeInMs);
			const fullEnd = region.endMs + easeOutMs;
			return {
				id: region.id,
				rowId: ZOOM_ROW_ID,
				span: { start: fullStart, end: fullEnd },
				label: t("labels.zoomItem", { index: String(index + 1) }),
				zoomDepth: region.depth,
				zoomCustomScale: region.customScale,
				isAutoFocus: region.focusMode === "auto",
				variant: "zoom",
				easeInMs,
				easeOutMs,
				holdStartMs: region.startMs,
				holdEndMs: region.endMs,
			};
		});

		const trims: TimelineRenderItem[] = trimRegions.map((region, index) => ({
			id: region.id,
			rowId: TRIM_ROW_ID,
			span: { start: region.startMs, end: region.endMs },
			label: t("labels.trimItem", { index: String(index + 1) }),
			variant: "trim",
		}));

		const annotations: TimelineRenderItem[] = annotationRegions.map((region) => {
			let label: string;

			if (region.type === "text") {
				const preview = region.content.trim() || t("labels.emptyText");
				label = preview.length > 20 ? `${preview.substring(0, 20)}...` : preview;
			} else if (region.type === "image") {
				label = t("labels.imageItem");
			} else {
				label = t("labels.annotationItem");
			}

			return {
				id: region.id,
				rowId: ANNOTATION_ROW_ID,
				span: { start: region.startMs, end: region.endMs },
				label,
				variant: "annotation",
			};
		});

		const blurs: TimelineRenderItem[] = blurRegions.map((region, index) => ({
			id: region.id,
			rowId: BLUR_ROW_ID,
			span: { start: region.startMs, end: region.endMs },
			label: t("labels.blurItem", { index: String(index + 1) }),
			variant: "blur",
		}));

		const speeds: TimelineRenderItem[] = speedRegions.map((region, index) => ({
			id: region.id,
			rowId: SPEED_ROW_ID,
			span: { start: region.startMs, end: region.endMs },
			label: t("labels.speedItem", { index: String(index + 1) }),
			speedValue: region.speed,
			variant: "speed",
		}));

		return [...zooms, ...trims, ...annotations, ...blurs, ...speeds];
	}, [zoomRegions, trimRegions, annotationRegions, blurRegions, speedRegions, t]);

	// Spans that participate in overlap resolution (clampToNeighbours). Annotation
	// and blur are excluded since they may overlap and shouldn't constrain a drag.
	const allRegionSpans = useMemo(() => {
		const zooms = zoomRegions.map((r) => ({ id: r.id, start: r.startMs, end: r.endMs }));
		const trims = trimRegions.map((r) => ({ id: r.id, start: r.startMs, end: r.endMs }));
		const speeds = speedRegions.map((r) => ({ id: r.id, start: r.startMs, end: r.endMs }));
		return [...zooms, ...trims, ...speeds];
	}, [zoomRegions, trimRegions, speedRegions]);

	// Snap targets whose edges pull during a snap but don't push anyone away.
	const softSnapSpans = useMemo(() => {
		const annotations = annotationRegions.map((r) => ({
			id: r.id,
			start: r.startMs,
			end: r.endMs,
		}));
		const blurs = blurRegions.map((r) => ({ id: r.id, start: r.startMs, end: r.endMs }));
		return [...annotations, ...blurs];
	}, [annotationRegions, blurRegions]);

	const keyframeTimesMs = useMemo(() => keyframes.map((kf) => kf.time), [keyframes]);

	const handleItemSpanChange = useCallback(
		(id: string, span: Span) => {
			if (zoomRegions.some((r) => r.id === id)) {
				onZoomSpanChange(id, span);
			} else if (trimRegions.some((r) => r.id === id)) {
				onTrimSpanChange?.(id, span);
			} else if (speedRegions.some((r) => r.id === id)) {
				onSpeedSpanChange?.(id, span);
			} else if (annotationRegions.some((r) => r.id === id)) {
				onAnnotationSpanChange?.(id, span);
			} else if (blurRegions.some((r) => r.id === id)) {
				onBlurSpanChange?.(id, span);
			}
		},
		[
			zoomRegions,
			trimRegions,
			speedRegions,
			annotationRegions,
			blurRegions,
			onZoomSpanChange,
			onTrimSpanChange,
			onSpeedSpanChange,
			onAnnotationSpanChange,
			onBlurSpanChange,
		],
	);

	if (!videoDuration || videoDuration === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center rounded-lg bg-[#09090b] gap-3">
				<div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
					<Plus className="w-6 h-6 text-slate-600" />
				</div>
				<div className="text-center">
					<p className="text-sm font-medium text-slate-300">
						{hasVideoSource ? "Loading Timeline" : "No Video Loaded"}
					</p>
					<p className="text-xs text-slate-500 mt-1">
						{hasVideoSource
							? "Video opened, waiting for duration metadata"
							: "Drag and drop a video to start editing"}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isLight ? "bg-[#f8f9fa] border-t border-[#e4e4e7]" : "bg-[#09090b]"}`}>
			<div className={`flex items-center justify-between gap-3 px-4 py-2 border-b backdrop-blur-md ${isLight ? "bg-white border-[#e4e4e7]" : "bg-[#09090c]/90 border-white/[0.08]"}`}>
				<div className={`flex items-center gap-1.5 rounded-full border p-1 shadow-inner ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-black/40 border-white/10"}`}>
					<Button
						onClick={handleAddZoom}
						variant="ghost"
						size="sm"
						className={`h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
						title={t("buttons.addZoom")}
					>
						<ZoomIn className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
						<span>Zoom</span>
					</Button>
					<Button
						onClick={() => onToggleAutoZoom?.(!autoZoomEnabled)}
						variant="ghost"
						size="sm"
						aria-pressed={autoZoomEnabled}
						className={cn(
							"h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer",
							autoZoomEnabled
								? (isLight ? "bg-slate-200 text-slate-900 shadow-xs" : "bg-white/15 text-white shadow-xs")
								: (isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200" : "text-slate-400 hover:text-white hover:bg-white/10"),
						)}
						title={autoZoomEnabled ? t("buttons.autoZoomOn") : t("buttons.autoZoomOff")}
					>
						<WandSparkles className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
						<span>Auto</span>
					</Button>
					<Button
						onClick={() => {
							onToggleAutoZoom?.(true);
							onGenerateAIZooms?.();
						}}
						variant="ghost"
						size="sm"
						className={cn(
							"h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer",
							isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200" : "text-slate-300 hover:text-white hover:bg-white/10"
						)}
						title="Auto-generate AI zoom regions from click events and telemetry"
					>
						<Sparkles className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
						<span>AI Zoom</span>
					</Button>
					<Button
						onClick={() => onToggleAutoFocusAll?.(!autoFocusAll)}
						variant="ghost"
						size="sm"
						aria-pressed={autoFocusAll}
						className={cn(
							"h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer",
							autoFocusAll
								? (isLight ? "bg-slate-200 text-slate-900 shadow-xs" : "bg-white/15 text-white shadow-xs")
								: (isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200" : "text-slate-400 hover:text-white hover:bg-white/10"),
						)}
						title={autoFocusAll ? t("buttons.autoFocusAllOn") : t("buttons.autoFocusAllOff")}
					>
						<ScanEye className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
						<span>Focus</span>
					</Button>
					<div className={`w-[1px] h-4 mx-0.5 ${isLight ? "bg-slate-300" : "bg-white/10"}`} />
					<Button
						onClick={handleAddTrim}
						variant="ghost"
						size="sm"
						className={`h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer ${isLight ? "text-slate-600 hover:text-red-600 hover:bg-red-50" : "text-slate-300 hover:text-red-400 hover:bg-red-500/10"}`}
						title={t("buttons.addTrim")}
					>
						<Scissors className="w-3.5 h-3.5 text-red-400" />
						<span>Trim</span>
					</Button>
					<Button
						onClick={handleAddAnnotation}
						variant="ghost"
						size="sm"
						className={`h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer ${isLight ? "text-slate-600 hover:text-amber-700 hover:bg-amber-50" : "text-slate-300 hover:text-amber-300 hover:bg-amber-500/10"}`}
						title={t("buttons.addAnnotation")}
					>
						<MessageSquare className="w-3.5 h-3.5 text-amber-300" />
						<span>Text</span>
					</Button>
					{BLUR_REGIONS_ENABLED && (
						<Button
							onClick={handleAddBlur}
							variant="ghost"
							size="sm"
							className={`h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer ${isLight ? "text-slate-600 hover:text-sky-600 hover:bg-sky-50" : "text-slate-300 hover:text-sky-300 hover:bg-sky-500/10"}`}
							title={t("buttons.addBlur")}
						>
							<svg
								className="w-3.5 h-3.5 text-sky-300"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="8" cy="12" r="3" />
								<circle cx="16" cy="12" r="3" />
								<path d="M6 6h12M6 18h12" />
							</svg>
							<span>Blur</span>
						</Button>
					)}
					<Button
						onClick={handleAddSpeed}
						variant="ghost"
						size="sm"
						className={`h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer ${isLight ? "text-slate-600 hover:text-orange-600 hover:bg-orange-50" : "text-slate-300 hover:text-orange-400 hover:bg-orange-500/10"}`}
						title={t("buttons.addSpeed")}
					>
						<Gauge className="w-3.5 h-3.5 text-orange-400" />
						<span>Speed</span>
					</Button>
					{onGenerateCaptions && (
						<Button
							onClick={onGenerateCaptions}
							disabled={isGeneratingCaptions || !videoUrl}
							variant="ghost"
							size="sm"
							className={`h-7 px-2.5 rounded-full transition-all text-[11px] font-semibold gap-1.5 cursor-pointer disabled:opacity-40 ${isLight ? "text-slate-600 hover:text-purple-700 hover:bg-purple-50" : "text-slate-300 hover:text-purple-300 hover:bg-purple-500/10"}`}
							title={captionsLabel}
						>
							<Captions className="w-3.5 h-3.5 text-purple-300" />
							<span>Captions</span>
						</Button>
					)}
				</div>

				<div className="flex items-center gap-3">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className={`h-7 px-3 rounded-full text-xs font-semibold transition-all gap-1.5 cursor-pointer border ${isLight ? "text-slate-600 hover:text-slate-900 bg-white hover:bg-[#f4f4f5] border-[#e4e4e7]" : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10"}`}
							>
								<span>{getAspectRatioLabel(aspectRatio)}</span>
								<ChevronDown className="w-3 h-3 text-slate-400" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className={`rounded-xl p-1 shadow-2xl ${isLight ? "bg-white border-[#e4e4e7]" : "bg-[#141417] border-white/10"}`}>
							{ASPECT_RATIOS.map((ratio) => (
								<DropdownMenuItem
									key={ratio}
									onClick={() => onAspectRatioChange(ratio)}
									className={`text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-between gap-3 px-3 py-1.5 ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-[#f4f4f5]" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
								>
									<span>{getAspectRatioLabel(ratio)}</span>
									{aspectRatio === ratio && <Check className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<div className={`hidden lg:flex items-center gap-2.5 text-[10px] font-medium rounded-full px-3 py-1 border ${isLight ? "text-slate-500 bg-white border-[#e4e4e7]" : "text-slate-400 bg-black/40 border-white/10"}`}>
						<span className="flex items-center gap-1">
							<kbd className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold border ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/10 border-white/10"}`} style={{ color: activeAccent.hex }}>
								{scrollLabels.pan}
							</kbd>
							<span>{t("labels.pan")}</span>
						</span>
						<span className={isLight ? "text-slate-400" : "text-slate-600"}>•</span>
						<span className="flex items-center gap-1">
							<kbd className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold border ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/10 border-white/10"}`} style={{ color: activeAccent.hex }}>
								{scrollLabels.zoom}
							</kbd>
							<span>{t("labels.zoom")}</span>
						</span>
					</div>
				</div>
			</div>
			<div
				ref={timelineContainerRef}
				className={`flex-1 min-h-0 overflow-auto custom-scrollbar relative ${isLight ? "bg-[#ffffff]" : "bg-[#09090b]"}`}
				onClick={() => setSelectedKeyframeId(null)}
			>
				<TimelineWrapper
					range={clampedRange}
					videoDuration={videoDuration}
					hasOverlap={hasOverlap}
					onRangeChange={setRange}
					minItemDurationMs={timelineScale.minItemDurationMs}
					minVisibleRangeMs={timelineScale.minVisibleRangeMs}
					onItemSpanChange={handleItemSpanChange}
					allRegionSpans={allRegionSpans}
					softSnapSpans={softSnapSpans}
					currentTimeMs={currentTimeMs}
					keyframeTimesMs={keyframeTimesMs}
				>
					<KeyframeMarkers
						keyframes={keyframes}
						selectedKeyframeId={selectedKeyframeId}
						setSelectedKeyframeId={setSelectedKeyframeId}
						onKeyframeMove={handleKeyframeMove}
						videoDurationMs={totalMs}
						timelineRef={timelineContainerRef}
					/>
					<Timeline
						items={timelineItems}
						videoDurationMs={totalMs}
						currentTimeMs={currentTimeMs}
						onSeek={onSeek}
						onRangeChange={setRange}
						onSelectZoom={onSelectZoom}
						onSelectTrim={onSelectTrim}
						onSelectAnnotation={onSelectAnnotation}
						onSelectBlur={onSelectBlur}
						onSelectSpeed={onSelectSpeed}
						selectedZoomId={selectedZoomId}
						selectedTrimId={selectedTrimId}
						selectedAnnotationId={selectedAnnotationId}
						selectedBlurId={selectedBlurId}
						selectedSpeedId={selectedSpeedId}
						keyframes={keyframes}
						videoUrl={videoUrl}
						showTrimWaveform={showTrimWaveform}
						onAddZoom={handleAddZoom}
						onAddTrim={handleAddTrim}
						onAddAnnotation={handleAddAnnotation}
						onAddBlur={handleAddBlur}
						onAddSpeed={handleAddSpeed}
					/>
				</TimelineWrapper>
			</div>
		</div>
	);
}
