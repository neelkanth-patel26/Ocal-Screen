import type { Range, Span } from "dnd-timeline";
import { useTimelineContext } from "dnd-timeline";
import {
	AlertTriangle,
	Captions,
	Check,
	ChevronDown,
	Film,
	Gauge,
	Layers,
	Maximize2,
	MessageSquare,
	Minus,
	Music,
	Plus,
	Redo2,
	ScanEye,
	Scissors,
	Sparkles,
	Trash2,
	Undo2,
	WandSparkles,
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
import { Slider } from "@/components/ui/slider";
import { useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { useAudioPeaks } from "@/hooks/useAudioPeaks";
import { matchesShortcut } from "@/lib/shortcuts";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS, type AspectRatio, getAspectRatioLabel } from "@/utils/aspectRatioUtils";
import { BLUR_REGIONS_ENABLED } from "../featureFlags";
import { toFileUrl } from "../projectPersistence";
import type {
	AnnotationRegion,
	PlaybackSpeed,
	SpeedRegion,
	TrimRegion,
	VideoLayerTrack,
	ZoomRegion,
} from "../types";
import BackgroundWaveform from "./BackgroundWaveform";
import {
	type ClipType,
	type ContextMenuPosition,
	FilmoraClipContextMenu,
} from "./FilmoraClipContextMenu";
import Item from "./Item";
import KeyframeMarkers from "./KeyframeMarkers";
import Row from "./Row";
import TimelineWrapper from "./TimelineWrapper";

const MAIN_VIDEO_ROW_ID = "row-main-video";
const MAIN_AUDIO_ROW_ID = "row-main-audio";
const ZOOM_ROW_ID = "row-zoom";
const TRIM_ROW_ID = "row-trim";
const SUBTITLE_ROW_ID = "row-subtitles";
const ANNOTATION_ROW_ID = "row-annotation";
const BLUR_ROW_ID = "row-blur";
const SPEED_ROW_ID = "row-speed";
const FALLBACK_RANGE_MS = 1000;
const TARGET_MARKER_COUNT = 12;
const DEFAULT_SIDEBAR_WIDTH = 190;
const MIN_SIDEBAR_WIDTH = 110;
const MAX_SIDEBAR_WIDTH = 380;
const SIDEBAR_STORAGE_KEY = "ocal_timeline_sidebar_width";

function formatTimecode(ms: number): string {
	const safeMs = Math.max(0, Math.round(ms));
	const totalFrames = Math.floor((safeMs / 1000) * 30);
	const frames = totalFrames % 30;
	const totalSeconds = Math.floor(safeMs / 1000);
	const seconds = totalSeconds % 60;
	const totalMinutes = Math.floor(totalSeconds / 60);
	const minutes = totalMinutes % 60;
	const hours = Math.floor(totalMinutes / 60);
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}

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
	videoLayers?: VideoLayerTrack[];
	onAddVideoLayer?: (customLayer?: Partial<VideoLayerTrack>) => void;
	onSelectVideoLayer?: (id: string | null) => void;
	selectedVideoLayerId?: string | null;
	onUpdateVideoLayer?: (id: string, updates: Partial<VideoLayerTrack>) => void;
	onSplitAtPlayhead?: () => void;
	onSplitAllAtPlayhead?: () => void;
	onUndo?: () => void;
	onRedo?: () => void;
	canUndo?: boolean;
	canRedo?: boolean;
	mainVideoSplitPoints?: number[];
	onUpdateMainVideoSplitPoints?: (points: number[]) => void;
	mainAudioSplitPoints?: number[];
	onUpdateMainAudioSplitPoints?: (points: number[]) => void;
	trackVisibility?: Record<string, boolean>;
	onToggleTrackVisibility?: (trackId: string) => void;
	trackMuted?: Record<string, boolean>;
	onToggleTrackMute?: (trackId: string) => void;
	trackLocked?: Record<string, boolean>;
	onToggleTrackLock?: (trackId: string) => void;
	selectedAudioId?: string | null;
	onSelectAudio?: (id: string | null) => void;
	audioTrackName?: string | null;
	onDeleteAudio?: () => void;
	onCropAndZoom?: () => void;
	onAdjustAudio?: () => void;
	onSelectAudioPreset?: (preset: any) => void;
	onKeepBlankScreen?: (trimId: string) => void;
	clipColorMarks?: Record<string, string>;
	onClipColorChange?: (clipId: string, color: string | null) => void;
	onSetClipSpeed?: (span: Span, speed: PlaybackSpeed) => void;
	onDeleteVideoLayer?: (layerId: string) => void;
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
	variant:
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
	trimId?: string;
	colorMark?: string | null;
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

	if (
		target.closest?.("[data-context-menu]") ||
		target.closest?.(".filmora-context-menu") ||
		target.closest?.("[role='separator']") ||
		target.closest?.("[data-sidebar-resizer]") ||
		target.closest?.(".cursor-col-resize")
	) {
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
			classText.includes("cursor-col-resize") ||
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
	onSplitAtPlayhead,
	onSplitAllAtPlayhead,
}: {
	currentTimeMs: number;
	videoDurationMs: number;
	onSeek?: (time: number) => void;
	onRangeChange?: (updater: (previous: Range) => Range) => void;
	timelineRef: React.RefObject<HTMLDivElement>;
	keyframes?: { id: string; time: number }[];
	onSplitAtPlayhead?: () => void;
	onSplitAllAtPlayhead?: () => void;
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
	const isLight = prefs.theme === "light";

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

				{/* Quick-Split Scissor Button Mounted on Playhead Needle */}
				{onSplitAtPlayhead && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							if (e.shiftKey && onSplitAllAtPlayhead) {
								onSplitAllAtPlayhead();
							} else {
								onSplitAtPlayhead();
							}
						}}
						onMouseDown={(e) => e.stopPropagation()}
						className={cn(
							"absolute top-[37px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full",
							"flex items-center justify-center transition-all duration-200 cursor-pointer z-50 group/scissor",
							"shadow-[0_2px_10px_rgba(0,0,0,0.15)] backdrop-blur-md border",
							"hover:scale-115 active:scale-95",
							isLight ? "bg-white/95 text-slate-700" : "bg-[#141622]/95 text-slate-200",
						)}
						style={{
							borderColor: `${activeAccent.hex}60`,
							color: activeAccent.hex,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = activeAccent.hex;
							e.currentTarget.style.color = activeAccent.textHex || "#ffffff";
							e.currentTarget.style.borderColor = activeAccent.hex;
							e.currentTarget.style.boxShadow = `0 0 14px ${activeAccent.hex}80`;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = "";
							e.currentTarget.style.color = activeAccent.hex;
							e.currentTarget.style.borderColor = `${activeAccent.hex}60`;
							e.currentTarget.style.boxShadow = "";
						}}
						title="Split clip at playhead (Ctrl+B / Shift+Click: Split All)"
					>
						<Scissors className="w-3 h-3 stroke-[2.2] transition-colors" />
						<span
							className={cn(
								"absolute left-1/2 -translate-x-1/2 top-7 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight whitespace-nowrap opacity-0 group-hover/scissor:opacity-100 transition-opacity pointer-events-none shadow-xl border z-[60]",
								isLight
									? "bg-slate-900 text-white border-slate-700"
									: "bg-black/90 text-white border-white/15",
							)}
						>
							Split (Ctrl+B)
						</span>
					</button>
				)}
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
	const activeAccent = ACCENT_COLOR_MAP[axisPrefs.accentColor] || ACCENT_COLOR_MAP.lime;

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
							<div
								className={`h-2.5 w-[1px] mb-1 ${axisIsLight ? "bg-slate-400/40" : "bg-white/20"}`}
							/>
							<span
								className={cn(
									"text-[10px] font-semibold tabular-nums tracking-tight",
									marker.time === currentTimeMs ? "font-bold" : "text-slate-500",
								)}
								style={{ color: marker.time === currentTimeMs ? activeAccent.hex : undefined }}
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
	selectedVideoLayerId,
	selectedMainClipId,
	onSelectMainClip,
	onSplitAtPlayhead,
	onSplitAllAtPlayhead,
	onMoveClipToNewLayer,
	trackVisibility = {},
	onToggleTrackVisibility,
	trackMuted = {},
	onToggleTrackMute,
	trackLocked = {},
	onToggleTrackLock,
	keyframes = [],
	videoUrl,
	showTrimWaveform = false,
	onAddZoom,
	onAddTrim,
	onAddSubtitle,
	onAddVideoLayer,
	onAddAnnotation,
	onAddBlur,
	onAddSpeed,
	onSelectVideoLayer,
	videoLayers = [],
	selectedAudioId,
	onSelectAudio,
	audioTrackName: _audioTrackName,
	onDeleteAudio,
	onCropAndZoom,
	onAdjustAudio,
	onDeleteMainClip,
	onSelectAudioPreset,
	selectedGapId,
	onSelectGap,
	clipColorMarks,
	onClipColorChange,
	onSetClipSpeed,
	onDuplicateClip,
	onTrimStartToPlayhead,
	onTrimEndToPlayhead,
	onSplitClip,
	onDeleteClipById,
	speedRegions = [],
	onSpeedAdded,
	onSpeedDelete,
	onSidebarWidthChange,
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
	onSelectVideoLayer?: (id: string | null) => void;
	selectedZoomId: string | null;
	selectedTrimId?: string | null;
	selectedAnnotationId?: string | null;
	selectedBlurId?: string | null;
	selectedSpeedId?: string | null;
	selectedVideoLayerId?: string | null;
	selectedMainClipId?: string | null;
	onSelectMainClip?: (id: string | null) => void;
	selectedGapId?: string | null;
	onSelectGap?: (id: string | null) => void;
	onSplitAtPlayhead?: () => void;
	onSplitAllAtPlayhead?: () => void;
	onMoveClipToNewLayer?: (clipId: string) => void;
	trackVisibility?: Record<string, boolean>;
	onToggleTrackVisibility?: (trackId: string) => void;
	trackMuted?: Record<string, boolean>;
	onToggleTrackMute?: (trackId: string) => void;
	trackLocked?: Record<string, boolean>;
	onToggleTrackLock?: (trackId: string) => void;
	keyframes?: { id: string; time: number }[];
	videoUrl?: string;
	showTrimWaveform?: boolean;
	onAddZoom?: () => void;
	onAddTrim?: () => void;
	onAddSubtitle?: () => void;
	onAddVideoLayer?: (customLayer?: Partial<VideoLayerTrack>) => void;
	onAddAnnotation?: () => void;
	onAddBlur?: () => void;
	onAddSpeed?: () => void;
	videoLayers?: VideoLayerTrack[];
	selectedAudioId?: string | null;
	onSelectAudio?: (id: string | null) => void;
	audioTrackName?: string | null;
	onDeleteAudio?: () => void;
	onCropAndZoom?: () => void;
	onAdjustAudio?: () => void;
	onDeleteMainClip?: () => void;
	onSelectAudioPreset?: (preset: any) => void;
	clipColorMarks?: Record<string, string>;
	onClipColorChange?: (clipId: string, color: string | null) => void;
	onSetClipSpeed?: (span: Span, speed: PlaybackSpeed) => void;
	onDuplicateClip?: (clipId: string) => void;
	onTrimStartToPlayhead?: (clipId: string) => void;
	onTrimEndToPlayhead?: (clipId: string) => void;
	onSplitClip?: (clipId: string, clickTimeMs?: number) => void;
	onDeleteClipById?: (clipId: string, clipType: ClipType) => void;
	speedRegions?: SpeedRegion[];
	onSpeedAdded?: (span: Span) => void;
	onSpeedDelete?: (id: string) => void;
	onSidebarWidthChange?: (newWidth: number) => void;
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

	const [isDraggingResizer, setIsDraggingResizer] = useState(false);
	const isResizingSidebarRef = useRef(false);
	const resizeStartXRef = useRef(0);
	const startWidthRef = useRef(sidebarWidth);

	useEffect(() => {
		if (isDraggingResizer) {
			const prevCursor = document.body.style.cursor;
			const prevSelect = document.body.style.userSelect;
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
			return () => {
				document.body.style.cursor = prevCursor;
				document.body.style.userSelect = prevSelect;
			};
		}
	}, [isDraggingResizer]);

	const handleResizerPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!onSidebarWidthChange || (e.pointerType === "mouse" && e.button !== 0)) return;
			e.stopPropagation();
			e.preventDefault();
			isResizingSidebarRef.current = true;
			resizeStartXRef.current = e.clientX;
			startWidthRef.current = sidebarWidth;
			e.currentTarget.setPointerCapture(e.pointerId);
			setIsDraggingResizer(true);
		},
		[onSidebarWidthChange, sidebarWidth],
	);

	const handleResizerPointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!isResizingSidebarRef.current) return;
			e.stopPropagation();
			e.preventDefault();
			const deltaX = e.clientX - resizeStartXRef.current;
			onSidebarWidthChange?.(startWidthRef.current + deltaX);
		},
		[onSidebarWidthChange],
	);

	const handleResizerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!isResizingSidebarRef.current) return;
		isResizingSidebarRef.current = false;
		setIsDraggingResizer(false);
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
	}, []);

	const handleResizerPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		isResizingSidebarRef.current = false;
		setIsDraggingResizer(false);
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
	}, []);

	const handleResizerDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			e.preventDefault();
			onSidebarWidthChange?.(DEFAULT_SIDEBAR_WIDTH);
		},
		[onSidebarWidthChange],
	);

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
			if (
				(e.target as HTMLElement)?.closest?.(
					"[data-context-menu], .filmora-context-menu, [role='separator'], [data-sidebar-resizer], .cursor-col-resize",
				)
			) {
				return;
			}
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

	const [contextMenu, setContextMenu] = useState<{
		position: ContextMenuPosition;
		clipType: ClipType;
		clipId: string;
		clickTimeMs?: number;
	} | null>(null);

	const handleSpeedChangeForClip = useCallback(
		(clipId: string, speed: number) => {
			const clip = items.find((c) => c.id === clipId);
			if (!clip) return;
			if (onSetClipSpeed) {
				onSetClipSpeed(clip.span, speed as PlaybackSpeed);
			} else {
				if (speed === 1) {
					const overlapping = (speedRegions || []).find(
						(r) => !(r.endMs <= clip.span.start || r.startMs >= clip.span.end),
					);
					if (overlapping && onSpeedDelete) {
						onSpeedDelete(overlapping.id);
					}
				} else if (onSpeedAdded) {
					onSpeedAdded({ start: clip.span.start, end: clip.span.end });
				}
			}
			toast.success(`Speed set to ${speed}x`);
		},
		[items, onSetClipSpeed, speedRegions, onSpeedDelete, onSpeedAdded],
	);

	const currentSpeedForClip = useMemo(() => {
		if (!contextMenu?.clipId) return 1;
		const clip = items.find((c) => c.id === contextMenu.clipId);
		if (!clip) return 1;
		const matched = (speedRegions || []).find(
			(r) => !(r.endMs <= clip.span.start || r.startMs >= clip.span.end),
		);
		return matched ? matched.speed : 1;
	}, [contextMenu?.clipId, items, speedRegions]);

	const currentColorMarkForClip = useMemo(() => {
		if (!contextMenu?.clipId) return null;
		return clipColorMarks?.[contextMenu.clipId] ?? null;
	}, [contextMenu?.clipId, clipColorMarks]);

	const [isDragOverTimeline, setIsDragOverTimeline] = useState(false);

	const handleTimelineDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		if (
			e.dataTransfer.types.includes("application/ocal-media") ||
			e.dataTransfer.types.includes("Files")
		) {
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
			setIsDragOverTimeline(true);
		}
	}, []);

	const handleTimelineDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setIsDragOverTimeline(false);
		}
	}, []);

	const handleTimelineDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragOverTimeline(false);

			const rect = e.currentTarget.getBoundingClientRect();
			const dropX = e.clientX - rect.left - sidebarWidth;
			const targetMs =
				dropX > 0
					? Math.max(
							0,
							Math.min(
								range.start + pixelsToValue(dropX),
								videoDurationMs > 0 ? videoDurationMs : 999999,
							),
						)
					: currentTimeMs;

			const rawMedia = e.dataTransfer.getData("application/ocal-media");
			if (rawMedia) {
				try {
					const data = JSON.parse(rawMedia);
					if (data.type === "audio") {
						const resolvedUrl = data.url
							? toFileUrl(data.url)
							: data.path
								? toFileUrl(data.path)
								: "";
						onSelectAudioPreset?.({
							id: data.id || `audio-${Date.now()}`,
							title: data.name,
							url: resolvedUrl,
							path: data.path,
							duration: data.duration,
						});
						toast.success(`Added ${data.name} to Audio 1`);
					} else if (data.type === "title") {
						onAddAnnotation?.();
						toast.success(`Added ${data.name} text layer`);
					} else {
						// Video or Image asset
						const durMs = data.duration ? Math.round(data.duration * 1000) : 5000;
						onAddVideoLayer?.({
							name: data.name,
							type: data.type === "image" ? "overlay-video" : "pip",
							src: data.url || data.path,
							startMs: targetMs,
							endMs:
								videoDurationMs > 0
									? Math.min(videoDurationMs, targetMs + durMs)
									: targetMs + durMs,
						});
						toast.success(`Added ${data.name} to video layer`);
					}
					return;
				} catch (err) {
					console.error("Failed to parse dropped media data:", err);
				}
			}

			// Dropping files directly from OS filesystem (Explorer / Finder / Desktop)
			if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				const file = e.dataTransfer.files[0];
				const isAudio =
					file.type.startsWith("audio/") || /\.(mp3|wav|aac|m4a|ogg|flac|m4r)$/i.test(file.name);
				const isVideo =
					file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi|wmv)$/i.test(file.name);
				const isImage =
					file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|svg|bmp)$/i.test(file.name);

				const rawFilePath = (file as unknown as { path?: string }).path;
				const fileUrl = rawFilePath ? toFileUrl(rawFilePath) : URL.createObjectURL(file);

				if (isAudio) {
					onSelectAudioPreset?.({
						id: `audio-${Date.now()}`,
						title: file.name,
						name: file.name,
						url: fileUrl,
						path: rawFilePath,
					});
					toast.success(`Added ${file.name} to Audio 1`);
				} else if (isVideo || isImage) {
					onAddVideoLayer?.({
						name: file.name,
						type: isImage ? "overlay-video" : "pip",
						src: fileUrl,
						startMs: targetMs,
						endMs:
							videoDurationMs > 0 ? Math.min(videoDurationMs, targetMs + 5000) : targetMs + 5000,
					});
					toast.success(`Added ${file.name} to video layer`);
				}
			}
		},
		[
			sidebarWidth,
			range.start,
			pixelsToValue,
			videoDurationMs,
			currentTimeMs,
			onSelectAudioPreset,
			onAddAnnotation,
			onAddVideoLayer,
		],
	);

	const mainVideoItems = items.filter((item) => item.rowId === MAIN_VIDEO_ROW_ID);
	const mainAudioItems = items.filter((item) => item.rowId === MAIN_AUDIO_ROW_ID);
	const zoomItems = items.filter((item) => item.rowId === ZOOM_ROW_ID);
	const trimItems = items.filter((item) => item.rowId === TRIM_ROW_ID);
	const subtitleItems = items.filter((item) => item.rowId === SUBTITLE_ROW_ID);
	const annotationItems = items.filter((item) => item.rowId === ANNOTATION_ROW_ID);
	const blurItems = items.filter((item) => item.rowId === BLUR_ROW_ID);
	const speedItems = items.filter((item) => item.rowId === SPEED_ROW_ID);

	// Hide unused tracks when they have 0 items and are not actively selected
	const showZoomRow = zoomItems.length > 0 || selectedZoomId !== null;
	const showTrimRow = false;
	const showSubtitleRow = subtitleItems.length > 0;
	const showAnnotationRow = annotationItems.length > 0 || selectedAnnotationId !== null;
	const showBlurRow = blurItems.length > 0 || selectedBlurId !== null;
	const showSpeedRow = speedItems.length > 0 || selectedSpeedId !== null;

	// Overlap detection per track
	const subtitleOverlapMap = useMemo(() => {
		const map: Record<string, boolean> = {};
		for (let i = 0; i < subtitleItems.length; i++) {
			for (let j = i + 1; j < subtitleItems.length; j++) {
				const a = subtitleItems[i];
				const b = subtitleItems[j];
				if (Math.max(a.span.start, b.span.start) < Math.min(a.span.end, b.span.end)) {
					map[a.id] = true;
					map[b.id] = true;
				}
			}
		}
		return map;
	}, [subtitleItems]);

	const zoomOverlapMap = useMemo(() => {
		const map: Record<string, boolean> = {};
		for (let i = 0; i < zoomItems.length; i++) {
			for (let j = i + 1; j < zoomItems.length; j++) {
				const a = zoomItems[i];
				const b = zoomItems[j];
				const startA = a.holdStartMs ?? a.span.start;
				const endA = a.holdEndMs ?? a.span.end;
				const startB = b.holdStartMs ?? b.span.start;
				const endB = b.holdEndMs ?? b.span.end;
				if (Math.max(startA, startB) < Math.min(endA, endB)) {
					map[a.id] = true;
					map[b.id] = true;
				}
			}
		}
		return map;
	}, [zoomItems]);

	const trimOverlapMap = useMemo(() => {
		const map: Record<string, boolean> = {};
		for (let i = 0; i < trimItems.length; i++) {
			for (let j = i + 1; j < trimItems.length; j++) {
				const a = trimItems[i];
				const b = trimItems[j];
				if (Math.max(a.span.start, b.span.start) < Math.min(a.span.end, b.span.end)) {
					map[a.id] = true;
					map[b.id] = true;
				}
			}
		}
		return map;
	}, [trimItems]);

	const annotationOverlapMap = useMemo(() => {
		const map: Record<string, boolean> = {};
		for (let i = 0; i < annotationItems.length; i++) {
			for (let j = i + 1; j < annotationItems.length; j++) {
				const a = annotationItems[i];
				const b = annotationItems[j];
				if (Math.max(a.span.start, b.span.start) < Math.min(a.span.end, b.span.end)) {
					map[a.id] = true;
					map[b.id] = true;
				}
			}
		}
		return map;
	}, [annotationItems]);

	const blurOverlapMap = useMemo(() => {
		const map: Record<string, boolean> = {};
		for (let i = 0; i < blurItems.length; i++) {
			for (let j = i + 1; j < blurItems.length; j++) {
				const a = blurItems[i];
				const b = blurItems[j];
				if (Math.max(a.span.start, b.span.start) < Math.min(a.span.end, b.span.end)) {
					map[a.id] = true;
					map[b.id] = true;
				}
			}
		}
		return map;
	}, [blurItems]);

	const speedOverlapMap = useMemo(() => {
		const map: Record<string, boolean> = {};
		for (let i = 0; i < speedItems.length; i++) {
			for (let j = i + 1; j < speedItems.length; j++) {
				const a = speedItems[i];
				const b = speedItems[j];
				if (Math.max(a.span.start, b.span.start) < Math.min(a.span.end, b.span.end)) {
					map[a.id] = true;
					map[b.id] = true;
				}
			}
		}
		return map;
	}, [speedItems]);

	return (
		<div
			ref={setRefs}
			style={{ ...style, touchAction: "none" }}
			className={cn(
				"select-none min-h-[190px] relative cursor-pointer group transition-colors",
				isLight ? "bg-white" : "bg-[#0b0c0f]",
			)}
			onClick={handleTimelineClick}
			onPointerDown={handleTimelinePointerDown}
			onPointerMove={handleTimelinePointerMove}
			onPointerUp={stopTimelineScrub}
			onPointerCancel={stopTimelineScrub}
			onPointerLeave={handleTimelinePointerLeave}
			onLostPointerCapture={handleTimelineLostPointerCapture}
			onWheel={handleTimelineWheel}
			onDragOver={handleTimelineDragOver}
			onDragLeave={handleTimelineDragLeave}
			onDrop={handleTimelineDrop}
		>
			{isDragOverTimeline && (
				<div className="absolute inset-0 z-30 bg-primary/10 border-2 border-dashed border-primary pointer-events-none flex items-center justify-center backdrop-blur-[1px]">
					<span className="bg-background/90 text-primary font-semibold text-xs px-3 py-1.5 rounded-full shadow-lg border border-primary/30">
						Drop to add clip to timeline
					</span>
				</div>
			)}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px)] bg-[length:24px_100%] pointer-events-none" />
			{/* Top-Left Corner Header above Track Labels */}
			<div
				className={cn(
					"absolute top-0 left-0 h-9 border-b border-r flex items-center px-3 text-[10px] font-bold uppercase tracking-wider select-none z-20 transition-colors",
					isLight
						? "bg-[#f4f4f5] border-[#e4e4e7] text-slate-500"
						: "bg-[#0c0d10] border-white/[0.07] text-slate-400",
				)}
				style={{ width: `${sidebarWidth}px` }}
			>
				<span>Tracks</span>
			</div>

			{/* Resizable Divider Handle between Track Headers and Timeline Lanes */}
			<div
				role="separator"
				data-sidebar-resizer="true"
				aria-orientation="vertical"
				title="Drag to resize track headers (Double-click to reset)"
				onPointerDown={handleResizerPointerDown}
				onPointerMove={handleResizerPointerMove}
				onPointerUp={handleResizerPointerUp}
				onPointerCancel={handleResizerPointerCancel}
				onDoubleClick={handleResizerDoubleClick}
				className="absolute top-0 bottom-0 z-40 w-3 -ml-1.5 cursor-col-resize select-none flex items-center justify-center group/resizer"
				style={{ left: `${sidebarWidth}px`, touchAction: "none" }}
			>
				<div
					className={cn(
						"w-[2px] h-full transition-colors pointer-events-none",
						isDraggingResizer
							? "shadow-sm"
							: isLight
								? "bg-transparent group-hover/resizer:bg-slate-400/80"
								: "bg-transparent group-hover/resizer:bg-white/40",
					)}
					style={{
						backgroundColor: isDraggingResizer ? activeAccent.hex : undefined,
					}}
				/>
			</div>
			<TimelineAxis videoDurationMs={videoDurationMs} currentTimeMs={currentTimeMs} />
			<PlaybackCursor
				currentTimeMs={currentTimeMs}
				videoDurationMs={videoDurationMs}
				onSeek={onSeek}
				onRangeChange={onRangeChange}
				timelineRef={localTimelineRef}
				keyframes={keyframes}
				onSplitAtPlayhead={onSplitAtPlayhead}
				onSplitAllAtPlayhead={onSplitAllAtPlayhead}
			/>

			{/* Main Video Track (primary anchor of timeline, split clips & direct trimming) */}
			{videoDurationMs > 0 && (
				<Row
					id={MAIN_VIDEO_ROW_ID}
					isEmpty={mainVideoItems.length === 0}
					hint="Main video track - Drag edges to trim, or split at playhead"
					label="Main Video"
					icon={<Film className="w-3.5 h-3.5 text-blue-400" />}
					shortcutKey="V1"
					accentColorHex="#3b82f6"
					isVisible={trackVisibility[MAIN_VIDEO_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(MAIN_VIDEO_ROW_ID)}
					isLocked={trackLocked[MAIN_VIDEO_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(MAIN_VIDEO_ROW_ID)}
					isMuted={trackMuted[MAIN_VIDEO_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(MAIN_VIDEO_ROW_ID)}
				>
					{mainVideoItems.map((item) => {
						const isGapItem = item.variant === "gap";
						const isSelected = isGapItem
							? item.id === selectedGapId
							: item.id === selectedMainClipId;
						return (
							<Item
								id={item.id}
								key={item.id}
								rowId={item.rowId}
								span={item.span}
								isSelected={isSelected}
								isOverlapping={false}
								colorMark={item.colorMark ?? clipColorMarks?.[item.id]}
								onSelect={() => {
									if (isGapItem) {
										onSelectAudio?.(null);
										onSelectMainClip?.(null);
										onSelectGap?.(item.id);
									} else {
										onSelectAudio?.(null);
										onSelectGap?.(null);
										onSelectMainClip?.(item.id);
									}
								}}
								variant={item.variant}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									if (isGapItem) {
										onSelectAudio?.(null);
										onSelectMainClip?.(null);
										onSelectGap?.(item.id);
									} else {
										onSelectAudio?.(null);
										onSelectGap?.(null);
										onSelectMainClip?.(item.id);
										const rect = localTimelineRef.current?.getBoundingClientRect();
										const clickX = rect ? e.clientX - rect.left - sidebarWidth : 0;
										const relativeMs = clickX > 0 ? pixelsToValue(clickX) : 0;
										const clickTimeMs = Math.round(Math.max(0, range.start + relativeMs));
										setContextMenu({
											position: { x: e.clientX, y: e.clientY },
											clipType: "video",
											clipId: item.id,
											clickTimeMs,
										});
									}
								}}
							>
								{item.label}
							</Item>
						);
					})}
				</Row>
			)}

			{/* Main Audio Track (Filmora Audio 1 with Emerald Green Waveform) */}
			{videoDurationMs > 0 && (
				<Row
					id={MAIN_AUDIO_ROW_ID}
					isEmpty={mainAudioItems.length === 0}
					hint="Audio track 1 - Adjust volume, equalizer, balance, and vocal enhance"
					label="Audio 1"
					icon={<Music className="w-3.5 h-3.5 text-emerald-400" />}
					shortcutKey="A1"
					accentColorHex="#10b981"
					isVisible={trackVisibility[MAIN_AUDIO_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(MAIN_AUDIO_ROW_ID)}
					isLocked={trackLocked[MAIN_AUDIO_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(MAIN_AUDIO_ROW_ID)}
					isMuted={trackMuted[MAIN_AUDIO_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(MAIN_AUDIO_ROW_ID)}
				>
					{mainAudioItems.length === 0 ? (
						<div className="h-full flex items-center px-4 text-[11px] font-medium text-emerald-400/50 italic select-none">
							+ Drop audio here or click "+ Add" on audio in Media Bin
						</div>
					) : (
						mainAudioItems.map((item) => (
							<Item
								id={item.id}
								key={item.id}
								rowId={item.rowId}
								span={item.span}
								isSelected={item.id === selectedAudioId}
								isOverlapping={false}
								colorMark={item.colorMark ?? clipColorMarks?.[item.id]}
								onSelect={() => {
									onSelectMainClip?.(null);
									onSelectAudio?.(item.id);
								}}
								variant="audio"
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onSelectMainClip?.(null);
									onSelectAudio?.(item.id);
									const rect = localTimelineRef.current?.getBoundingClientRect();
									const clickX = rect ? e.clientX - rect.left - sidebarWidth : 0;
									const relativeMs = clickX > 0 ? pixelsToValue(clickX) : 0;
									const clickTimeMs = Math.round(Math.max(0, range.start + relativeMs));
									setContextMenu({
										position: { x: e.clientX, y: e.clientY },
										clipType: "audio",
										clipId: item.id,
										clickTimeMs,
									});
								}}
							>
								{item.label}
							</Item>
						))
					)}
				</Row>
			)}

			{/* Secondary Video Layers / Tracks (each layer has its own lane without collision) */}
			{videoLayers.map((layer, index) => {
				const rowId = `row-video-${layer.id}`;
				const layerItems = items.filter((item) => item.rowId === rowId);
				return (
					<Row
						id={rowId}
						key={layer.id}
						isEmpty={layerItems.length === 0}
						label={
							layer.name && !layer.name.startsWith("Camera / Video Layer")
								? layer.name
								: `Video Track ${index + 2}`
						}
						icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
						shortcutKey={`V${index + 2}`}
						accentColorHex="#06b6d4"
						onAddClick={() => onAddVideoLayer?.()}
						isVisible={trackVisibility[rowId] !== false}
						onToggleVisible={() => onToggleTrackVisibility?.(rowId)}
						isLocked={trackLocked[rowId] === true}
						onToggleLock={() => onToggleTrackLock?.(rowId)}
						isMuted={trackMuted[rowId] === true}
						onToggleMute={() => onToggleTrackMute?.(rowId)}
					>
						{layerItems.map((item) => (
							<Item
								id={item.id}
								key={item.id}
								rowId={item.rowId}
								span={item.span}
								isSelected={item.id === selectedVideoLayerId}
								isOverlapping={false}
								colorMark={item.colorMark ?? clipColorMarks?.[item.id]}
								onSelect={() => onSelectVideoLayer?.(item.id)}
								variant="video-layer"
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onSelectVideoLayer?.(item.id);
									const rect = localTimelineRef.current?.getBoundingClientRect();
									const clickX = rect ? e.clientX - rect.left - sidebarWidth : 0;
									const relativeMs = clickX > 0 ? pixelsToValue(clickX) : 0;
									const clickTimeMs = Math.round(Math.max(0, range.start + relativeMs));
									setContextMenu({
										position: { x: e.clientX, y: e.clientY },
										clipType: "layer",
										clipId: item.id,
										clickTimeMs,
									});
								}}
							>
								{item.label}
							</Item>
						))}
					</Row>
				);
			})}

			{/* Zoom Track (hidden when not in use) */}
			{showZoomRow && (
				<Row
					id={ZOOM_ROW_ID}
					isEmpty={zoomItems.length === 0}
					hint={t("hints.pressZoom")}
					label="Zoom"
					icon={<ZoomIn className="w-3.5 h-3.5" />}
					shortcutKey="Z"
					accentColorHex={activeAccent.hex}
					onAddClick={onAddZoom}
					isVisible={trackVisibility[ZOOM_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(ZOOM_ROW_ID)}
					isLocked={trackLocked[ZOOM_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(ZOOM_ROW_ID)}
					isMuted={trackMuted[ZOOM_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(ZOOM_ROW_ID)}
				>
					{zoomItems.map((item) => (
						<Item
							id={item.id}
							key={item.id}
							rowId={item.rowId}
							span={item.span}
							isSelected={item.id === selectedZoomId}
							isOverlapping={!!zoomOverlapMap[item.id]}
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
			)}

			{/* Trim Track (hidden when not in use) */}
			{showTrimRow && (
				<Row
					id={TRIM_ROW_ID}
					isEmpty={trimItems.length === 0}
					hint={t("hints.pressTrim")}
					label="Trim"
					icon={<Scissors className="w-3.5 h-3.5" />}
					shortcutKey="T"
					accentColorHex="#ef4444"
					onAddClick={onAddTrim}
					isVisible={trackVisibility[TRIM_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(TRIM_ROW_ID)}
					isLocked={trackLocked[TRIM_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(TRIM_ROW_ID)}
					isMuted={trackMuted[TRIM_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(TRIM_ROW_ID)}
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
							isOverlapping={!!trimOverlapMap[item.id]}
							onSelect={() => onSelectTrim?.(item.id)}
							variant="trim"
						>
							{item.label}
						</Item>
					))}
				</Row>
			)}

			{/* Subtitles Track (hidden when not in use) */}
			{showSubtitleRow && (
				<Row
					id={SUBTITLE_ROW_ID}
					isEmpty={subtitleItems.length === 0}
					hint="Generate smart AI speech-to-text subtitles"
					label="Subtitles"
					icon={<Captions className="w-3.5 h-3.5" />}
					shortcutKey="C"
					accentColorHex="#d4f933"
					onAddClick={onAddSubtitle}
					isVisible={trackVisibility[SUBTITLE_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(SUBTITLE_ROW_ID)}
					isLocked={trackLocked[SUBTITLE_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(SUBTITLE_ROW_ID)}
					isMuted={trackMuted[SUBTITLE_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(SUBTITLE_ROW_ID)}
				>
					{subtitleItems.map((item) => (
						<Item
							id={item.id}
							key={item.id}
							rowId={item.rowId}
							span={item.span}
							isSelected={item.id === selectedAnnotationId}
							isOverlapping={!!subtitleOverlapMap[item.id]}
							onSelect={() => onSelectAnnotation?.(item.id)}
							variant="subtitle"
						>
							{item.label}
						</Item>
					))}
				</Row>
			)}

			{/* Text Track (hidden when not in use) */}
			{showAnnotationRow && (
				<Row
					id={ANNOTATION_ROW_ID}
					isEmpty={annotationItems.length === 0}
					hint={t("hints.pressAnnotation")}
					label="Text"
					icon={<MessageSquare className="w-3.5 h-3.5" />}
					shortcutKey="A"
					accentColorHex="#f59e0b"
					onAddClick={onAddAnnotation}
					isVisible={trackVisibility[ANNOTATION_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(ANNOTATION_ROW_ID)}
					isLocked={trackLocked[ANNOTATION_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(ANNOTATION_ROW_ID)}
					isMuted={trackMuted[ANNOTATION_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(ANNOTATION_ROW_ID)}
				>
					{annotationItems.map((item) => (
						<Item
							id={item.id}
							key={item.id}
							rowId={item.rowId}
							span={item.span}
							isSelected={item.id === selectedAnnotationId}
							isOverlapping={!!annotationOverlapMap[item.id]}
							onSelect={() => onSelectAnnotation?.(item.id)}
							variant="annotation"
						>
							{item.label}
						</Item>
					))}
				</Row>
			)}

			{/* Blur Track (hidden when not in use) */}
			{BLUR_REGIONS_ENABLED && showBlurRow && (
				<Row
					id={BLUR_ROW_ID}
					isEmpty={blurItems.length === 0}
					hint={t("hints.pressBlur")}
					label="Blur"
					icon={
						<svg
							className="w-3.5 h-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<circle cx="8" cy="12" r="3" />
							<circle cx="16" cy="12" r="3" />
							<path d="M6 6h12M6 18h12" />
						</svg>
					}
					shortcutKey="B"
					accentColorHex="#38bdf8"
					onAddClick={onAddBlur}
					isVisible={trackVisibility[BLUR_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(BLUR_ROW_ID)}
					isLocked={trackLocked[BLUR_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(BLUR_ROW_ID)}
					isMuted={trackMuted[BLUR_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(BLUR_ROW_ID)}
				>
					{blurItems.map((item) => (
						<Item
							id={item.id}
							key={item.id}
							rowId={item.rowId}
							span={item.span}
							isSelected={item.id === selectedBlurId}
							isOverlapping={!!blurOverlapMap[item.id]}
							onSelect={() => onSelectBlur?.(item.id)}
							variant={item.variant}
						>
							{item.label}
						</Item>
					))}
				</Row>
			)}

			{/* Speed Track (hidden when not in use) */}
			{showSpeedRow && (
				<Row
					id={SPEED_ROW_ID}
					isEmpty={speedItems.length === 0}
					hint={t("hints.pressSpeed")}
					label="Speed"
					icon={<Gauge className="w-3.5 h-3.5" />}
					shortcutKey="S"
					accentColorHex="#a855f7"
					onAddClick={onAddSpeed}
					isVisible={trackVisibility[SPEED_ROW_ID] !== false}
					onToggleVisible={() => onToggleTrackVisibility?.(SPEED_ROW_ID)}
					isLocked={trackLocked[SPEED_ROW_ID] === true}
					onToggleLock={() => onToggleTrackLock?.(SPEED_ROW_ID)}
					isMuted={trackMuted[SPEED_ROW_ID] === true}
					onToggleMute={() => onToggleTrackMute?.(SPEED_ROW_ID)}
				>
					{speedItems.map((item) => (
						<Item
							id={item.id}
							key={item.id}
							rowId={item.rowId}
							span={item.span}
							isSelected={item.id === selectedSpeedId}
							isOverlapping={!!speedOverlapMap[item.id]}
							onSelect={() => onSelectSpeed?.(item.id)}
							variant="speed"
							speedValue={item.speedValue}
						>
							{item.label}
						</Item>
					))}
				</Row>
			)}

			<FilmoraClipContextMenu
				position={contextMenu?.position ?? null}
				clipType={contextMenu?.clipType ?? "video"}
				clipId={contextMenu?.clipId ?? ""}
				onClose={() => setContextMenu(null)}
				onSplit={() => {
					if (contextMenu?.clipId && onSplitClip) {
						onSplitClip(contextMenu.clipId, contextMenu.clickTimeMs);
					} else {
						onSplitAtPlayhead?.();
					}
					setContextMenu(null);
				}}
				onSplitAll={() => {
					onSplitAllAtPlayhead?.();
					setContextMenu(null);
				}}
				onMoveToNewLayer={() => {
					if (contextMenu?.clipId) {
						onMoveClipToNewLayer?.(contextMenu.clipId);
					}
					setContextMenu(null);
				}}
				onDelete={() => {
					if (contextMenu) {
						if (onDeleteClipById) {
							onDeleteClipById(contextMenu.clipId, contextMenu.clipType);
						} else if (contextMenu.clipType === "audio") {
							onDeleteAudio?.();
						} else {
							onDeleteMainClip?.();
						}
					}
					setContextMenu(null);
				}}
				onDuplicate={() => {
					if (contextMenu?.clipId) {
						onDuplicateClip?.(contextMenu.clipId);
					}
					setContextMenu(null);
				}}
				onTrimStartToPlayhead={() => {
					if (contextMenu?.clipId) {
						onTrimStartToPlayhead?.(contextMenu.clipId);
					}
					setContextMenu(null);
				}}
				onTrimEndToPlayhead={() => {
					if (contextMenu?.clipId) {
						onTrimEndToPlayhead?.(contextMenu.clipId);
					}
					setContextMenu(null);
				}}
				onSpeedChange={(speed) => {
					if (contextMenu?.clipId) {
						handleSpeedChangeForClip(contextMenu.clipId, speed);
					}
				}}
				onColorMarkChange={(color) => {
					if (contextMenu?.clipId && onClipColorChange) {
						onClipColorChange(contextMenu.clipId, color);
					}
				}}
				currentSpeed={currentSpeedForClip}
				currentColorMark={currentColorMarkForClip}
				onCropAndZoom={() => {
					onCropAndZoom?.();
					setContextMenu(null);
				}}
				onAdjustAudio={() => {
					onAdjustAudio?.();
					setContextMenu(null);
				}}
				onMuteToggle={() => {
					onToggleTrackMute?.(MAIN_AUDIO_ROW_ID);
					setContextMenu(null);
				}}
				onGenerateCaptions={() => {
					onAddSubtitle?.();
					setContextMenu(null);
				}}
			/>
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
	videoLayers = [],
	onAddVideoLayer,
	onSelectVideoLayer,
	selectedVideoLayerId,
	onUpdateVideoLayer,
	onSplitAtPlayhead,
	onSplitAllAtPlayhead,
	onUndo,
	onRedo,
	canUndo = false,
	canRedo = false,
	mainVideoSplitPoints = [],
	onUpdateMainVideoSplitPoints,
	mainAudioSplitPoints = [],
	onUpdateMainAudioSplitPoints,
	trackVisibility = {},
	onToggleTrackVisibility,
	trackMuted = {},
	onToggleTrackMute,
	trackLocked = {},
	onToggleTrackLock,
	selectedAudioId,
	onSelectAudio,
	audioTrackName,
	onDeleteAudio,
	onCropAndZoom,
	onAdjustAudio,
	onSelectAudioPreset,
	onKeepBlankScreen,
	clipColorMarks = {},
	onClipColorChange,
	onSetClipSpeed,
	onDeleteVideoLayer,
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
	const [selectedMainClipId, setSelectedMainClipId] = useState<string | null>(null);
	const [selectedGapId, setSelectedGapId] = useState<string | null>(null);

	const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
		try {
			const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
			if (saved) {
				const parsed = parseInt(saved, 10);
				if (!Number.isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
					return parsed;
				}
			}
		} catch {
			// ignore
		}
		return DEFAULT_SIDEBAR_WIDTH;
	});

	const handleSidebarWidthChange = useCallback((newWidth: number) => {
		const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.round(newWidth)));
		setSidebarWidth(clamped);
		try {
			localStorage.setItem(SIDEBAR_STORAGE_KEY, clamped.toString());
		} catch {
			// ignore
		}
	}, []);

	const handleSelectMainClip = useCallback(
		(id: string | null) => {
			setSelectedMainClipId(id);
			if (id) {
				setSelectedGapId(null);
				onSelectZoom(null);
				onSelectTrim?.(null);
				onSelectAnnotation?.(null);
				onSelectBlur?.(null);
				onSelectSpeed?.(null);
				onSelectVideoLayer?.(null);
			}
		},
		[
			onSelectZoom,
			onSelectTrim,
			onSelectAnnotation,
			onSelectBlur,
			onSelectSpeed,
			onSelectVideoLayer,
		],
	);

	const handleSelectGap = useCallback(
		(id: string | null) => {
			setSelectedGapId(id);
			if (id) {
				setSelectedMainClipId(null);
				onSelectZoom(null);
				onSelectTrim?.(null);
				onSelectAnnotation?.(null);
				onSelectBlur?.(null);
				onSelectSpeed?.(null);
				onSelectVideoLayer?.(null);
				onSelectAudio?.(null);
			}
		},
		[
			onSelectZoom,
			onSelectTrim,
			onSelectAnnotation,
			onSelectBlur,
			onSelectSpeed,
			onSelectVideoLayer,
			onSelectAudio,
		],
	);

	const selectedGapTrim = useMemo(() => {
		if (!selectedGapId) return null;
		const trimId = selectedGapId.startsWith("gap-")
			? selectedGapId.replace("gap-", "")
			: selectedGapId;
		return trimRegions.find((r) => r.id === trimId) || null;
	}, [selectedGapId, trimRegions]);
	const timelineContainerRef = useRef<HTMLDivElement>(null);
	const { shortcuts: keyShortcuts, isMac } = useShortcuts();

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
	}, [totalMs, safeMinDurationMs, onZoomSpanChange, onSpeedSpanChange]);

	const hasOverlap = useCallback(
		(newSpan: Span, excludeId?: string): boolean => {
			const isZoomItem = zoomRegions.some((r) => r.id === excludeId);
			const isTrimItem = trimRegions.some((r) => r.id === excludeId);
			const isAnnotationItem = annotationRegions.some((r) => r.id === excludeId);
			const isBlurItem = blurRegions.some((r) => r.id === excludeId);
			const isSpeedItem = speedRegions.some((r) => r.id === excludeId);
			const isVideoLayerItem = videoLayers.some((l) => l.id === excludeId);
			const isMainVideoItem = excludeId?.startsWith("main-video-clip-");

			if (isAnnotationItem || isBlurItem || isVideoLayerItem || isMainVideoItem) {
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
		[zoomRegions, trimRegions, annotationRegions, blurRegions, speedRegions, videoLayers],
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

	const handleSplitAtPlayhead = useCallback(() => {
		if (onSplitAtPlayhead) {
			onSplitAtPlayhead();
			return;
		}
		if (selectedVideoLayerId) {
			const layer = videoLayers.find((l) => l.id === selectedVideoLayerId);
			if (layer) {
				const start = layer.startMs || 0;
				const end = layer.endMs || totalMs || 10000;
				if (currentTimeMs > start + 100 && currentTimeMs < end - 100) {
					onUpdateVideoLayer?.(layer.id, { endMs: currentTimeMs });
					return;
				}
			}
		}
		if (selectedAudioId && onUpdateMainAudioSplitPoints && totalMs > 0) {
			const playheadMs = Math.round(currentTimeMs);
			if (playheadMs > 100 && playheadMs < totalMs - 100) {
				const existing = mainAudioSplitPoints || [];
				if (!existing.some((p) => Math.abs(p - playheadMs) < 100)) {
					onUpdateMainAudioSplitPoints([...existing, playheadMs].sort((a, b) => a - b));
				}
			}
			return;
		}
		if (onUpdateMainVideoSplitPoints && totalMs > 0) {
			const playheadMs = Math.round(currentTimeMs);
			if (playheadMs > 100 && playheadMs < totalMs - 100) {
				const existing = mainVideoSplitPoints || [];
				if (!existing.some((p) => Math.abs(p - playheadMs) < 100)) {
					onUpdateMainVideoSplitPoints([...existing, playheadMs].sort((a, b) => a - b));
				}
			}
		}
	}, [
		onSplitAtPlayhead,
		selectedVideoLayerId,
		selectedAudioId,
		videoLayers,
		currentTimeMs,
		totalMs,
		onUpdateVideoLayer,
		onUpdateMainAudioSplitPoints,
		mainAudioSplitPoints,
		onUpdateMainVideoSplitPoints,
		mainVideoSplitPoints,
	]);

	const handleSplitAllAtPlayheadAction = useCallback(() => {
		if (onSplitAllAtPlayhead) {
			onSplitAllAtPlayhead();
			return;
		}
		handleSplitAtPlayhead();
	}, [onSplitAllAtPlayhead, handleSplitAtPlayhead]);

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

	const clampedRange = useMemo<Range>(() => {
		if (totalMs === 0) {
			return range;
		}

		return {
			start: Math.max(0, Math.min(range.start, totalMs)),
			end: Math.min(range.end, totalMs),
		};
	}, [range, totalMs]);

	const sortedTrims = useMemo(() => {
		return [...trimRegions]
			.map((r) => ({
				...r,
				startMs: Math.max(0, Math.min(r.startMs, totalMs)),
				endMs: Math.max(0, Math.min(r.endMs, totalMs)),
			}))
			.filter((r) => r.endMs > r.startMs)
			.sort((a, b) => a.startMs - b.startMs);
	}, [trimRegions, totalMs]);

	// Filmora Seamless Main Video Clips (active video segments subdivided by split points)
	const mainVideoClips = useMemo<TimelineRenderItem[]>(() => {
		if (totalMs === 0) return [];

		// 1. Calculate active un-trimmed ranges
		const activeRanges: { start: number; end: number }[] = [];
		if (sortedTrims.length === 0) {
			activeRanges.push({ start: 0, end: totalMs });
		} else {
			let currentStart = 0;
			for (let i = 0; i < sortedTrims.length; i++) {
				const trim = sortedTrims[i];
				if (trim.startMs > currentStart + 50) {
					activeRanges.push({ start: currentStart, end: trim.startMs });
				}
				currentStart = Math.max(currentStart, trim.endMs);
			}
			if (currentStart < totalMs - 50) {
				activeRanges.push({ start: currentStart, end: totalMs });
			}
		}

		// 2. Subdivide active segments by mainVideoSplitPoints (Filmora Razor cuts)
		const validSplitPoints = [...mainVideoSplitPoints]
			.map((p) => Math.round(p))
			.filter((p) => p > 50 && p < totalMs - 50)
			.sort((a, b) => a - b);

		const clips: TimelineRenderItem[] = [];
		let clipIndex = 1;

		for (const seg of activeRanges) {
			const splitsInRange = validSplitPoints.filter((p) => p > seg.start + 50 && p < seg.end - 50);

			if (splitsInRange.length === 0) {
				const id = `main-video-clip-${clipIndex}`;
				clips.push({
					id,
					rowId: MAIN_VIDEO_ROW_ID,
					span: { start: seg.start, end: seg.end },
					label:
						activeRanges.length === 1 && validSplitPoints.length === 0
							? "Main Video"
							: `Main Video (Part ${clipIndex})`,
					variant: "video-layer",
					colorMark: clipColorMarks?.[id],
				});
				clipIndex++;
			} else {
				let segStart = seg.start;
				for (const split of splitsInRange) {
					const id = `main-video-clip-${clipIndex}`;
					clips.push({
						id,
						rowId: MAIN_VIDEO_ROW_ID,
						span: { start: segStart, end: split },
						label: `Main Video (Part ${clipIndex})`,
						variant: "video-layer",
						colorMark: clipColorMarks?.[id],
					});
					clipIndex++;
					segStart = split;
				}
				const id = `main-video-clip-${clipIndex}`;
				clips.push({
					id,
					rowId: MAIN_VIDEO_ROW_ID,
					span: { start: segStart, end: seg.end },
					label: `Main Video (Part ${clipIndex})`,
					variant: "video-layer",
					colorMark: clipColorMarks?.[id],
				});
				clipIndex++;
			}
		}

		// 3. Render gap clips for empty spaces / trim regions so editor can see mistakes & choose whether to keep or close
		for (const trim of sortedTrims) {
			const durSec = ((trim.endMs - trim.startMs) / 1000).toFixed(1);
			const isKept = Boolean(trim.keepBlankScreen);
			clips.push({
				id: `gap-${trim.id}`,
				rowId: MAIN_VIDEO_ROW_ID,
				span: { start: trim.startMs, end: trim.endMs },
				label: isKept
					? `⬛ Blank Screen (${durSec}s) — Deliberate Pause`
					: `⚠️ Blank Screen (${durSec}s) — Editing Mistake`,
				variant: "gap",
				trimId: trim.id,
			});
		}

		return clips;
	}, [totalMs, sortedTrims, mainVideoSplitPoints, clipColorMarks]);

	const mainAudioClips = useMemo(() => {
		if (!audioTrackName || totalMs === 0) return [];

		const validAudioSplits = [...(mainAudioSplitPoints || [])]
			.map((p) => Math.round(p))
			.filter((p) => p > 50 && p < totalMs - 50)
			.sort((a, b) => a - b);

		if (validAudioSplits.length === 0) {
			const id = "main-audio-clip-1";
			return [
				{
					id,
					rowId: MAIN_AUDIO_ROW_ID,
					span: { start: 0, end: totalMs },
					label: audioTrackName,
					variant: "audio" as const,
					colorMark: clipColorMarks?.[id],
				},
			];
		}

		const clips: TimelineRenderItem[] = [];
		let segStart = 0;
		for (let i = 0; i < validAudioSplits.length; i++) {
			const split = validAudioSplits[i];
			const id = `main-audio-clip-${i + 1}`;
			clips.push({
				id,
				rowId: MAIN_AUDIO_ROW_ID,
				span: { start: segStart, end: split },
				label: `${audioTrackName} (Part ${i + 1})`,
				variant: "audio" as const,
				colorMark: clipColorMarks?.[id],
			});
			segStart = split;
		}
		const lastId = `main-audio-clip-${validAudioSplits.length + 1}`;
		clips.push({
			id: lastId,
			rowId: MAIN_AUDIO_ROW_ID,
			span: { start: segStart, end: totalMs },
			label: `${audioTrackName} (Part ${validAudioSplits.length + 1})`,
			variant: "audio" as const,
			colorMark: clipColorMarks?.[lastId],
		});

		return clips;
	}, [totalMs, audioTrackName, mainAudioSplitPoints, clipColorMarks]);

	const deleteSelectedMainClip = useCallback(() => {
		if (!selectedMainClipId) return;
		const clip = mainVideoClips.find((c) => c.id === selectedMainClipId);
		if (!clip) return;
		const { start, end } = clip.span;
		onTrimAdded?.({ start: Math.round(start), end: Math.round(end), source: "clip-cut" } as any);
		if (onUpdateMainVideoSplitPoints && mainVideoSplitPoints.length > 0) {
			const updated = mainVideoSplitPoints.filter((sp) => sp < start + 50 || sp > end - 50);
			onUpdateMainVideoSplitPoints(updated);
		}
		setSelectedMainClipId(null);
		toast.success("Deleted video clip");
	}, [
		selectedMainClipId,
		mainVideoClips,
		onTrimAdded,
		onUpdateMainVideoSplitPoints,
		mainVideoSplitPoints,
	]);

	const handleMoveClipToNewLayer = useCallback(
		(clipId: string, customSpan?: Span) => {
			const clip = mainVideoClips.find((c) => c.id === clipId);
			if (!clip) return;
			const start = customSpan ? customSpan.start : clip.span.start;
			const end = customSpan ? customSpan.end : clip.span.end;

			onAddVideoLayer?.({
				name: `Video Track ${videoLayers.length + 2}`,
				src: videoUrl,
				startMs: Math.max(0, Math.round(start)),
				endMs: Math.max(Math.round(start) + 100, Math.round(end)),
				type: "overlay-video",
				x: 0,
				y: 0,
				width: 100,
				height: 100,
				borderWidth: 0,
				shadowGlow: false,
			});

			onTrimAdded?.({
				start: Math.round(clip.span.start),
				end: Math.round(clip.span.end),
				source: "clip-cut",
			} as any);
			if (onUpdateMainVideoSplitPoints && mainVideoSplitPoints.length > 0) {
				const updated = mainVideoSplitPoints.filter(
					(sp) => sp < clip.span.start + 50 || sp > clip.span.end - 50,
				);
				onUpdateMainVideoSplitPoints(updated);
			}

			setSelectedMainClipId(null);
			toast.success("Moved split clip to new video layer");
		},
		[
			mainVideoClips,
			videoLayers.length,
			videoUrl,
			onAddVideoLayer,
			onTrimAdded,
			onUpdateMainVideoSplitPoints,
			mainVideoSplitPoints,
		],
	);

	const handleDuplicateClip = useCallback(
		(clipId: string) => {
			const layer = videoLayers.find((l) => l.id === clipId);
			if (layer) {
				const duration = (layer.endMs ?? 5000) - (layer.startMs ?? 0);
				const newStart = Math.min(totalMs - 500, (layer.startMs ?? 0) + 1000);
				const newEnd = Math.min(totalMs, newStart + duration);
				onAddVideoLayer?.({
					...layer,
					name: `${layer.name || "Track"} (Copy)`,
					startMs: newStart,
					endMs: newEnd,
				});
				toast.success("Duplicated layer to new video track");
				return;
			}

			const videoClip = mainVideoClips.find((c) => c.id === clipId);
			if (videoClip) {
				onAddVideoLayer?.({
					name: `${videoClip.label} (Layer)`,
					src: videoUrl,
					startMs: Math.max(0, Math.round(videoClip.span.start)),
					endMs: Math.max(Math.round(videoClip.span.start) + 100, Math.round(videoClip.span.end)),
					type: "overlay-video",
					x: 0,
					y: 0,
					width: 100,
					height: 100,
					borderWidth: 0,
					shadowGlow: false,
				});
				toast.success("Duplicated clip to new video track");
				return;
			}

			toast.info("Clip duplicated");
		},
		[videoLayers, totalMs, onAddVideoLayer, mainVideoClips, videoUrl],
	);

	const handleTrimStartToPlayhead = useCallback(
		(clipId: string) => {
			const layer = videoLayers.find((l) => l.id === clipId);
			if (layer) {
				if (currentTimeMs > (layer.startMs ?? 0) && currentTimeMs < (layer.endMs ?? totalMs)) {
					onUpdateVideoLayer?.(clipId, { startMs: currentTimeMs });
					toast.success("Trimmed start to playhead");
				} else {
					toast.warning("Playhead is outside of this clip");
				}
				return;
			}

			const videoClip = mainVideoClips.find((c) => c.id === clipId);
			if (videoClip) {
				if (currentTimeMs > videoClip.span.start && currentTimeMs < videoClip.span.end) {
					onTrimAdded?.({
						start: Math.round(videoClip.span.start),
						end: Math.round(currentTimeMs),
						source: "clip-cut",
					} as any);
					toast.success("Trimmed start to playhead");
				} else {
					toast.warning("Playhead is outside of this clip");
				}
				return;
			}
		},
		[videoLayers, currentTimeMs, totalMs, onUpdateVideoLayer, mainVideoClips, onTrimAdded],
	);

	const handleTrimEndToPlayhead = useCallback(
		(clipId: string) => {
			const layer = videoLayers.find((l) => l.id === clipId);
			if (layer) {
				if (currentTimeMs > (layer.startMs ?? 0) && currentTimeMs < (layer.endMs ?? totalMs)) {
					onUpdateVideoLayer?.(clipId, { endMs: currentTimeMs });
					toast.success("Trimmed end to playhead");
				} else {
					toast.warning("Playhead is outside of this clip");
				}
				return;
			}

			const videoClip = mainVideoClips.find((c) => c.id === clipId);
			if (videoClip) {
				if (currentTimeMs > videoClip.span.start && currentTimeMs < videoClip.span.end) {
					onTrimAdded?.({
						start: Math.round(currentTimeMs),
						end: Math.round(videoClip.span.end),
						source: "clip-cut",
					} as any);
					toast.success("Trimmed end to playhead");
				} else {
					toast.warning("Playhead is outside of this clip");
				}
				return;
			}
		},
		[videoLayers, currentTimeMs, totalMs, onUpdateVideoLayer, mainVideoClips, onTrimAdded],
	);

	const handleSplitClip = useCallback(
		(clipId: string, clickTimeMs?: number) => {
			const splitTargetTime = clickTimeMs && clickTimeMs > 0 ? clickTimeMs : currentTimeMs;
			if (splitTargetTime <= 50 || splitTargetTime >= totalMs - 50) {
				toast.warning("Cannot split at video boundary");
				return;
			}

			const layer = videoLayers.find((l) => l.id === clipId);
			if (layer && layer.startMs !== undefined && layer.endMs !== undefined) {
				if (splitTargetTime > layer.startMs + 50 && splitTargetTime < layer.endMs - 50) {
					onUpdateVideoLayer?.(clipId, { endMs: splitTargetTime });
					onAddVideoLayer?.({
						...layer,
						startMs: splitTargetTime,
						endMs: layer.endMs,
					});
					toast.success("Layer split at playhead/cursor");
					return;
				}
			}

			if (clipId.startsWith("main-audio-clip")) {
				if (onUpdateMainAudioSplitPoints) {
					const nextSplits = Array.from(
						new Set([...(mainAudioSplitPoints || []), Math.round(splitTargetTime)]),
					).sort((a, b) => a - b);
					onUpdateMainAudioSplitPoints(nextSplits);
					toast.success("Audio split at playhead/cursor");
					return;
				}
			}

			if (onUpdateMainVideoSplitPoints) {
				const nextSplits = Array.from(
					new Set([...mainVideoSplitPoints, Math.round(splitTargetTime)]),
				).sort((a, b) => a - b);
				onUpdateMainVideoSplitPoints(nextSplits);
				toast.success("Clip split at playhead/cursor");
			} else {
				onSplitAtPlayhead?.();
			}
		},
		[
			currentTimeMs,
			totalMs,
			videoLayers,
			onUpdateVideoLayer,
			onAddVideoLayer,
			onUpdateMainAudioSplitPoints,
			mainAudioSplitPoints,
			onUpdateMainVideoSplitPoints,
			mainVideoSplitPoints,
			onSplitAtPlayhead,
		],
	);

	const handleDeleteClipById = useCallback(
		(clipId: string, clipType: ClipType) => {
			if (clipType === "layer") {
				onDeleteVideoLayer?.(clipId);
				toast.success("Deleted layer");
				return;
			}

			if (clipType === "audio") {
				const match = clipId.match(/^main-audio-clip-(\d+)$/);
				if (
					match &&
					onUpdateMainAudioSplitPoints &&
					mainAudioSplitPoints &&
					mainAudioSplitPoints.length > 0
				) {
					const clipIdx = parseInt(match[1], 10);
					const splitIndexToRemove = clipIdx > 1 ? clipIdx - 2 : 0;
					const updated = mainAudioSplitPoints.filter((_, idx) => idx !== splitIndexToRemove);
					onUpdateMainAudioSplitPoints(updated);
					if (selectedAudioId === clipId) onSelectAudio?.(null);
					toast.success("Merged audio split");
				} else {
					onDeleteAudio?.();
				}
				return;
			}

			const clip = mainVideoClips.find((c) => c.id === clipId);
			if (clip) {
				const { start, end } = clip.span;
				onTrimAdded?.({
					start: Math.round(start),
					end: Math.round(end),
					source: "clip-cut",
				} as any);
				if (onUpdateMainVideoSplitPoints && mainVideoSplitPoints.length > 0) {
					const updated = mainVideoSplitPoints.filter((sp) => sp < start + 50 || sp > end - 50);
					onUpdateMainVideoSplitPoints(updated);
				}
				if (selectedMainClipId === clipId) setSelectedMainClipId(null);
				toast.success("Deleted video clip");
			}
		},
		[
			onDeleteVideoLayer,
			onUpdateMainAudioSplitPoints,
			mainAudioSplitPoints,
			selectedAudioId,
			onSelectAudio,
			onDeleteAudio,
			mainVideoClips,
			onTrimAdded,
			onUpdateMainVideoSplitPoints,
			mainVideoSplitPoints,
			selectedMainClipId,
		],
	);

	const handleDeleteSelected = useCallback(() => {
		if (selectedMainClipId) {
			deleteSelectedMainClip();
		} else if (selectedGapId) {
			const trimId = selectedGapId.startsWith("gap-")
				? selectedGapId.replace("gap-", "")
				: selectedGapId;
			onTrimDelete?.(trimId);
			setSelectedGapId(null);
			toast.success("Gap closed! Main video joined.");
		} else if (selectedAudioId) {
			const match = selectedAudioId.match(/^main-audio-clip-(\d+)$/);
			if (
				match &&
				onUpdateMainAudioSplitPoints &&
				mainAudioSplitPoints &&
				mainAudioSplitPoints.length > 0
			) {
				const clipIdx = parseInt(match[1], 10);
				const splitIndexToRemove = clipIdx > 1 ? clipIdx - 2 : 0;
				const updated = mainAudioSplitPoints.filter((_, idx) => idx !== splitIndexToRemove);
				onUpdateMainAudioSplitPoints(updated);
				onSelectAudio?.(null);
				toast.success("Merged audio split");
			} else {
				onDeleteAudio?.();
			}
		} else if (selectedKeyframeId) {
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
	}, [
		selectedMainClipId,
		deleteSelectedMainClip,
		selectedGapId,
		onTrimDelete,
		selectedAudioId,
		onSelectAudio,
		onDeleteAudio,
		onUpdateMainAudioSplitPoints,
		mainAudioSplitPoints,
		selectedKeyframeId,
		deleteSelectedKeyframe,
		selectedZoomId,
		deleteSelectedZoom,
		selectedTrimId,
		deleteSelectedTrim,
		selectedAnnotationId,
		deleteSelectedAnnotation,
		selectedBlurId,
		deleteSelectedBlur,
		selectedSpeedId,
		deleteSelectedSpeed,
	]);

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
				const curTimeMs = Math.round(currentTime * 1000);
				const overlapping = annotationRegions
					.filter((a) => curTimeMs >= a.startMs && curTimeMs <= a.endMs)
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
			// Filmora Split shortcut: Ctrl+B / Cmd+B (Split Selected) or Ctrl+Shift+B (Split All)
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
				e.preventDefault();
				if (e.shiftKey) {
					handleSplitAllAtPlayheadAction();
				} else {
					handleSplitAtPlayhead();
				}
			}
			// Fit to timeline shortcut: Shift+Z
			if (e.shiftKey && e.key.toLowerCase() === "z") {
				e.preventDefault();
				setRange({ start: 0, end: totalMs });
			}
			// Delete key or Ctrl+D / Cmd+D
			if (
				e.key === "Delete" ||
				e.key === "Backspace" ||
				matchesShortcut(e, keyShortcuts.deleteSelected, isMac)
			) {
				handleDeleteSelected();
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
		handleSplitAtPlayhead,
		handleDeleteSelected,
		selectedAnnotationId,
		annotationRegions,
		currentTime,
		totalMs,
		onSelectAnnotation,
		keyShortcuts,
		isMac,
	]);

	const hasAnySelection = Boolean(
		selectedMainClipId ||
			selectedAudioId ||
			selectedKeyframeId ||
			selectedZoomId ||
			selectedTrimId ||
			selectedAnnotationId ||
			selectedBlurId ||
			selectedSpeedId ||
			selectedVideoLayerId,
	);

	// Filmora Timeline Zoom Handlers
	const handleZoomIn = useCallback(() => {
		const currentSpan = range.end - range.start;
		const newSpan = Math.max(timelineScale.minVisibleRangeMs, currentSpan * 0.75);
		const center = currentTimeMs;
		const newStart = Math.max(0, Math.min(center - newSpan / 2, totalMs - newSpan));
		setRange({ start: newStart, end: newStart + newSpan });
	}, [range.end, range.start, timelineScale.minVisibleRangeMs, currentTimeMs, totalMs]);

	const handleZoomOut = useCallback(() => {
		const currentSpan = range.end - range.start;
		const newSpan = Math.min(totalMs, currentSpan * 1.35);
		const center = currentTimeMs;
		const newStart = Math.max(0, Math.min(center - newSpan / 2, totalMs - newSpan));
		setRange({ start: newStart, end: Math.min(totalMs, newStart + newSpan) });
	}, [range.end, range.start, currentTimeMs, totalMs]);

	const handleFitTimeline = useCallback(() => {
		setRange({ start: 0, end: totalMs });
	}, [totalMs]);

	const zoomSliderValue = useMemo(() => {
		const visibleSpan = range.end - range.start;
		if (totalMs <= 0 || visibleSpan <= 0) return 0;
		const ratio =
			1 -
			(visibleSpan - timelineScale.minVisibleRangeMs) /
				Math.max(1, totalMs - timelineScale.minVisibleRangeMs);
		return Math.max(0, Math.min(100, Math.round(ratio * 100)));
	}, [range.end, range.start, totalMs, timelineScale.minVisibleRangeMs]);

	const handleZoomSliderChange = useCallback(
		([value]: number[]) => {
			const factor = 1 - value / 100;
			const newSpan =
				timelineScale.minVisibleRangeMs + factor * (totalMs - timelineScale.minVisibleRangeMs);
			const center = currentTimeMs;
			const newStart = Math.max(0, Math.min(center - newSpan / 2, totalMs - newSpan));
			setRange({ start: newStart, end: Math.min(totalMs, newStart + newSpan) });
		},
		[timelineScale.minVisibleRangeMs, totalMs, currentTimeMs],
	);

	const handleMainClipSpanChange = useCallback(
		(id: string, span: Span) => {
			const match = id.match(/^main-video-clip-(\d+)$/);
			if (!match || !onUpdateMainVideoSplitPoints) return;
			const clipIdx = parseInt(match[1], 10);

			// Move only the split-point boundaries on either side of this clip.
			// Do NOT touch trim regions — that was causing every other clip to shift.
			const sortedSplits = [...mainVideoSplitPoints]
				.map((p) => Math.round(p))
				.sort((a, b) => a - b);

			const newStart = Math.max(0, Math.round(span.start));
			const newEnd = Math.min(totalMs, Math.round(span.end));

			// Clip 1 → split boundaries: [none left] | sortedSplits[0] | ...
			// Clip 2 → sortedSplits[0] | sortedSplits[1] | ...
			// leftSplitIdx  = clipIdx - 2  (the split to the left of this clip)
			// rightSplitIdx = clipIdx - 1  (the split to the right of this clip)
			const leftSplitIdx = clipIdx - 2;
			const rightSplitIdx = clipIdx - 1;

			const updatedSplits = [...sortedSplits];

			// Shift the left boundary (exists only when clip > 1)
			if (leftSplitIdx >= 0) {
				const hardMin = leftSplitIdx > 0 ? updatedSplits[leftSplitIdx - 1] + 100 : 100;
				const hardMax =
					rightSplitIdx < updatedSplits.length ? updatedSplits[rightSplitIdx] - 100 : totalMs - 100;
				updatedSplits[leftSplitIdx] = Math.max(hardMin, Math.min(hardMax, newStart));
			}

			// Shift the right boundary (exists only when clip < last)
			if (rightSplitIdx < updatedSplits.length) {
				const hardMin = leftSplitIdx >= 0 ? updatedSplits[leftSplitIdx] + 100 : 100;
				const hardMax =
					rightSplitIdx + 1 < updatedSplits.length
						? updatedSplits[rightSplitIdx + 1] - 100
						: totalMs - 100;
				updatedSplits[rightSplitIdx] = Math.max(hardMin, Math.min(hardMax, newEnd));
			}

			onUpdateMainVideoSplitPoints(updatedSplits.sort((a, b) => a - b));
		},
		[mainVideoSplitPoints, totalMs, onUpdateMainVideoSplitPoints],
	);

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

		// Trims are cutouts handled under the hood; no red trim items are rendered on the timeline
		const trims: TimelineRenderItem[] = [];

		const subtitles: TimelineRenderItem[] = [];
		const annotations: TimelineRenderItem[] = [];

		for (const region of annotationRegions) {
			if (region.annotationSource === "auto-caption") {
				const preview = region.content.trim() || t("labels.emptyText");
				subtitles.push({
					id: region.id,
					rowId: SUBTITLE_ROW_ID,
					span: { start: region.startMs, end: region.endMs },
					label: preview.length > 25 ? `${preview.substring(0, 25)}...` : preview,
					variant: "subtitle",
				});
			} else {
				let label: string;
				if (region.type === "text") {
					const preview = region.content.trim() || t("labels.emptyText");
					label = preview.length > 20 ? `${preview.substring(0, 20)}...` : preview;
				} else if (region.type === "image") {
					label = t("labels.imageItem");
				} else {
					label = t("labels.annotationItem");
				}
				annotations.push({
					id: region.id,
					rowId: ANNOTATION_ROW_ID,
					span: { start: region.startMs, end: region.endMs },
					label,
					variant: "annotation",
				});
			}
		}

		const blurs: TimelineRenderItem[] = blurRegions.map((region, index) => ({
			id: region.id,
			rowId: BLUR_ROW_ID,
			span: { start: region.startMs, end: region.endMs },
			label: t("labels.blurItem", { index: String(index + 1) }),
			variant: "blur",
		}));

		const layers: TimelineRenderItem[] = videoLayers
			.filter(
				(layer) =>
					layer.startMs !== undefined && layer.endMs !== undefined && layer.endMs > layer.startMs,
			)
			.map((layer, index) => ({
				id: layer.id,
				rowId: `row-video-${layer.id}`,
				span: { start: layer.startMs!, end: layer.endMs! },
				label:
					layer.name && !layer.name.startsWith("Camera / Video Layer")
						? layer.name
						: `Video Track ${index + 2}`,
				variant: "video-layer",
				colorMark: clipColorMarks?.[layer.id],
			}));

		const speeds: TimelineRenderItem[] = speedRegions.map((region, index) => ({
			id: region.id,
			rowId: SPEED_ROW_ID,
			span: { start: region.startMs, end: region.endMs },
			label: t("labels.speedItem", { index: String(index + 1) }),
			speedValue: region.speed,
			variant: "speed",
		}));

		return [
			...mainVideoClips,
			...mainAudioClips,
			...zooms,
			...trims,
			...subtitles,
			...annotations,
			...blurs,
			...layers,
			...speeds,
		];
	}, [
		mainVideoClips,
		mainAudioClips,
		zoomRegions,
		trimRegions,
		annotationRegions,
		blurRegions,
		videoLayers,
		speedRegions,
		clipColorMarks,
		totalMs,
		t,
	]);

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
		(id: string, span: Span, targetRowId?: string, verticalDelta?: number) => {
			if (id.startsWith("gap-")) {
				const trimId = id.replace("gap-", "");
				onTrimSpanChange?.(trimId, span);
			} else if (zoomRegions.some((r) => r.id === id)) {
				onZoomSpanChange(id, span);
			} else if (trimRegions.some((r) => r.id === id)) {
				onTrimSpanChange?.(id, span);
			} else if (speedRegions.some((r) => r.id === id)) {
				onSpeedSpanChange?.(id, span);
			} else if (annotationRegions.some((r) => r.id === id)) {
				onAnnotationSpanChange?.(id, span);
			} else if (blurRegions.some((r) => r.id === id)) {
				onBlurSpanChange?.(id, span);
			} else if (videoLayers.some((l) => l.id === id)) {
				if (
					targetRowId &&
					targetRowId.startsWith("row-video-") &&
					targetRowId !== `row-video-${id}`
				) {
					const targetLayerId = targetRowId.replace("row-video-", "");
					const currentLayer = videoLayers.find((l) => l.id === id);
					onUpdateVideoLayer?.(targetLayerId, {
						src: currentLayer?.src || videoUrl,
						startMs: Math.max(0, Math.round(span.start)),
						endMs: Math.max(Math.round(span.start) + 100, Math.round(span.end)),
					});
					onUpdateVideoLayer?.(id, { startMs: undefined, endMs: undefined });
					toast.success("Moved clip to video track");
				} else {
					onUpdateVideoLayer?.(id, {
						startMs: Math.max(0, Math.round(span.start)),
						endMs: Math.max(Math.round(span.start) + 100, Math.round(span.end)),
					});
				}
			} else if (id.startsWith("main-video-clip-")) {
				const isVerticalMove =
					(targetRowId && targetRowId !== MAIN_VIDEO_ROW_ID) ||
					(verticalDelta !== undefined && Math.abs(verticalDelta) > 20);

				if (targetRowId && targetRowId.startsWith("row-video-")) {
					const targetLayerId = targetRowId.replace("row-video-", "");
					onUpdateVideoLayer?.(targetLayerId, {
						src: videoUrl,
						startMs: Math.max(0, Math.round(span.start)),
						endMs: Math.max(Math.round(span.start) + 100, Math.round(span.end)),
					});
					const clip = mainVideoClips.find((c) => c.id === id);
					if (clip) {
						onTrimAdded?.({
							start: Math.round(clip.span.start),
							end: Math.round(clip.span.end),
							source: "clip-cut",
						} as any);
						if (onUpdateMainVideoSplitPoints && mainVideoSplitPoints.length > 0) {
							const updated = mainVideoSplitPoints.filter(
								(sp) => sp < clip.span.start + 50 || sp > clip.span.end - 50,
							);
							onUpdateMainVideoSplitPoints(updated);
						}
					}
					setSelectedMainClipId(null);
					toast.success("Moved split clip to video layer");
				} else if (isVerticalMove) {
					handleMoveClipToNewLayer(id, span);
				} else {
					handleMainClipSpanChange(id, span);
				}
			} else if (id.startsWith("main-audio-clip-")) {
				// Audio clips are independent from video — update audio split points only.
				// Find the clip index from its id (e.g. "main-audio-clip-3" → index 2)
				const match = id.match(/^main-audio-clip-(\d+)$/);
				if (!match || !onUpdateMainAudioSplitPoints) return;

				const clipIdx = parseInt(match[1], 10);
				const clipDuration = span.end - span.start;

				// We need to compute what the new audio split points should be
				// based on where this clip was moved to.
				// Strategy: the clip's new start position becomes a boundary.
				// We rebuild the split points by removing the old boundaries around
				// this clip and inserting a new one at span.start (if not at edge).
				const sortedAudioSplits = [...mainAudioSplitPoints]
					.map((p) => Math.round(p))
					.sort((a, b) => a - b);

				// The clip at clipIdx is bounded by sortedAudioSplits[clipIdx-2] and sortedAudioSplits[clipIdx-1]
				// Remove those old split points and add new ones based on new position.
				const newStart = Math.max(0, Math.round(span.start));
				const newEnd = Math.min(totalMs, Math.round(span.end));

				// Build new splits: remove the split point that used to be at the start of this clip
				// and the one at its end, then add new ones.
				const prevSplitBoundary = clipIdx > 1 ? sortedAudioSplits[clipIdx - 2] : 0;
				const nextSplitBoundary =
					clipIdx - 1 < sortedAudioSplits.length ? sortedAudioSplits[clipIdx - 1] : totalMs;

				// Only insert new split points if this clip isn't at the very beginning or end
				const updatedSplits = sortedAudioSplits.filter(
					(p) => p !== prevSplitBoundary && p !== nextSplitBoundary,
				);

				if (newStart > 50) updatedSplits.push(newStart);
				if (newEnd < totalMs - 50) updatedSplits.push(newEnd);

				onUpdateMainAudioSplitPoints(updatedSplits.sort((a, b) => a - b));
				// Suppress unused variable warning for clipDuration
				void clipDuration;
			}
		},
		[
			zoomRegions,
			trimRegions,
			speedRegions,
			annotationRegions,
			blurRegions,
			videoLayers,
			onZoomSpanChange,
			onTrimSpanChange,
			onSpeedSpanChange,
			onAnnotationSpanChange,
			onBlurSpanChange,
			onUpdateVideoLayer,
			handleMainClipSpanChange,
			handleMoveClipToNewLayer,
			mainAudioSplitPoints,
			onUpdateMainAudioSplitPoints,
			totalMs,
		],
	);

	if (!videoDuration || videoDuration === 0) {
		if (hasVideoSource) {
			// Video is loading — show spinner
			return (
				<div
					className={`flex-1 flex flex-col items-center justify-center gap-3 ${isLight ? "bg-[#f8f9fa]" : "bg-[#09090b]"}`}
				>
					<div className="relative w-9 h-9">
						<div className="absolute inset-0 rounded-full border-2 border-white/10" />
						<div className="absolute inset-0 rounded-full border-2 border-t-[#e8ff47] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
					</div>
					<p className="text-xs font-medium text-slate-400">Loading Timeline…</p>
				</div>
			);
		}
		return (
			<div
				className={`flex-1 flex flex-col items-center justify-center gap-3 rounded-lg ${isLight ? "bg-[#f8f9fa]" : "bg-[#09090b]"}`}
			>
				<div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
					<Plus className="w-6 h-6 text-slate-600" />
				</div>
				<div className="text-center">
					<p className="text-sm font-medium text-slate-300">No Video Loaded</p>
					<p className="text-xs text-slate-500 mt-1">Drag and drop a video to start editing</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isLight ? "bg-[#f8f9fa] border-t border-[#e4e4e7]" : "bg-[#09090b]"}`}
		>
			<div
				className={`flex items-center justify-between gap-3 px-3 py-1.5 border-b backdrop-blur-xl ${isLight ? "bg-white/95 border-[#e4e4e7]" : "bg-[#0b0c10]/95 border-white/[0.08]"}`}
			>
				{/* Left Side: Filmora Action Suite & Effect Clusters */}
				<div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					{/* Wondershare Filmora Core Actions: Undo, Redo, Delete, Split */}
					<div
						className={`flex items-center gap-0.5 rounded-2xl border p-0.5 shadow-2xs ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/[0.04] border-white/[0.08]"}`}
					>
						<Button
							onClick={onUndo}
							disabled={!canUndo}
							variant="ghost"
							size="sm"
							className={`h-7 w-7 p-0 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-30 ${isLight ? "text-slate-700 hover:text-slate-950 hover:bg-white shadow-2xs" : "text-slate-300 hover:text-white hover:bg-white/10 shadow-2xs"}`}
							title="Undo (Ctrl+Z)"
						>
							<Undo2 className="w-3.5 h-3.5" />
						</Button>
						<Button
							onClick={onRedo}
							disabled={!canRedo}
							variant="ghost"
							size="sm"
							className={`h-7 w-7 p-0 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-30 ${isLight ? "text-slate-700 hover:text-slate-950 hover:bg-white shadow-2xs" : "text-slate-300 hover:text-white hover:bg-white/10 shadow-2xs"}`}
							title="Redo (Ctrl+Y)"
						>
							<Redo2 className="w-3.5 h-3.5" />
						</Button>
						<Button
							onClick={handleDeleteSelected}
							disabled={!hasAnySelection}
							variant="ghost"
							size="sm"
							className={cn(
								"h-7 w-7 p-0 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-25",
								hasAnySelection
									? isLight
										? "text-red-600 hover:bg-red-50 hover:text-red-700"
										: "text-red-400 hover:text-red-300 hover:bg-white/10"
									: isLight
										? "text-slate-400"
										: "text-slate-500",
							)}
							title="Delete selected item or clip (Del / Backspace)"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</Button>
						<div className="flex items-center">
							<Button
								onClick={handleSplitAtPlayhead}
								variant="ghost"
								size="sm"
								className={`h-7 px-2 rounded-l-xl rounded-r-none transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95 ${isLight ? "text-slate-700 hover:text-slate-950 hover:bg-white" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
								title="Split clip at playhead (Ctrl+B)"
							>
								<Scissors
									className={`w-3.5 h-3.5 ${isLight ? "text-blue-600" : "text-blue-400"}`}
								/>
								<span>Split</span>
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className={`h-7 px-1 rounded-r-xl rounded-l-none border-l transition-all cursor-pointer ${isLight ? "border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-white" : "border-white/10 text-slate-400 hover:text-white hover:bg-white/10"}`}
										title="Split options"
									>
										<ChevronDown className="w-3 h-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="start"
									className={`w-48 z-[9999] rounded-xl border p-1 shadow-2xl ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#14151f] border-[#2d3042] text-zinc-100"}`}
								>
									<DropdownMenuItem
										onClick={handleSplitAtPlayhead}
										className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${isLight ? "hover:bg-slate-100" : "hover:bg-[#25283a] text-zinc-200 hover:text-white"}`}
									>
										<div className="flex items-center gap-2">
											<Scissors className="w-3.5 h-3.5 text-cyan-400" />
											<span>Split Clip</span>
										</div>
										<span className="text-[10px] text-zinc-400 font-mono">Ctrl+B</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={handleSplitAllAtPlayheadAction}
										className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${isLight ? "hover:bg-slate-100" : "hover:bg-[#25283a] text-zinc-200 hover:text-white"}`}
									>
										<div className="flex items-center gap-2">
											<Scissors className="w-3.5 h-3.5 text-blue-400" />
											<span>Split All Tracks</span>
										</div>
										<span className="text-[10px] text-zinc-400 font-mono">Ctrl+Shift+B</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					<div className={`h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

					{/* Zoom & Camera cluster */}
					<div
						className={`flex items-center gap-0.5 rounded-2xl border p-0.5 shadow-2xs ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/[0.03] border-white/[0.08]"}`}
					>
						<Button
							onClick={handleAddZoom}
							variant="ghost"
							size="sm"
							className={`h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95 ${isLight ? "text-slate-700 hover:text-slate-950 hover:bg-white shadow-2xs" : "text-slate-200 hover:text-white hover:bg-white/10 shadow-2xs"}`}
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
								"h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95",
								autoZoomEnabled
									? isLight
										? "bg-white text-slate-900 shadow-xs border border-[#e4e4e7]"
										: "bg-white/15 text-white shadow-xs border border-white/15"
									: isLight
										? "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
										: "text-slate-400 hover:text-white hover:bg-white/10",
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
								"h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95",
								isLight
									? "text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs"
									: "text-slate-300 hover:text-white hover:bg-white/10 shadow-2xs",
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
								"h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95",
								autoFocusAll
									? isLight
										? "bg-white text-slate-900 shadow-xs border border-[#e4e4e7]"
										: "bg-white/15 text-white shadow-xs border border-white/15"
									: isLight
										? "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
										: "text-slate-400 hover:text-white hover:bg-white/10",
							)}
							title={autoFocusAll ? t("buttons.autoFocusAllOn") : t("buttons.autoFocusAllOff")}
						>
							<ScanEye className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
							<span>Focus</span>
						</Button>
					</div>

					<div className={`h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-white/10"}`} />

					{/* Timeline clip tools cluster */}
					<div
						className={`flex items-center gap-0.5 rounded-2xl border p-0.5 shadow-2xs ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/[0.03] border-white/[0.08]"}`}
					>
						<Button
							onClick={handleAddAnnotation}
							variant="ghost"
							size="sm"
							className={`h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95 ${isLight ? "text-slate-600 hover:text-amber-700 hover:bg-amber-50" : "text-slate-300 hover:text-amber-300 hover:bg-amber-500/10"}`}
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
								className={`h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95 ${isLight ? "text-slate-600 hover:text-sky-600 hover:bg-sky-50" : "text-slate-300 hover:text-sky-300 hover:bg-sky-500/10"}`}
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
							className={`h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95 ${isLight ? "text-slate-600 hover:text-purple-600 hover:bg-purple-50" : "text-slate-300 hover:text-purple-400 hover:bg-purple-500/10"}`}
							title={t("buttons.addSpeed")}
						>
							<Gauge className="w-3.5 h-3.5 text-purple-400" />
							<span>Speed</span>
						</Button>
						{onAddVideoLayer && (
							<Button
								onClick={() => onAddVideoLayer?.()}
								variant="ghost"
								size="sm"
								className={`h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95 ${isLight ? "text-slate-600 hover:text-cyan-700 hover:bg-cyan-50" : "text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10"}`}
								title="Add Video Track / Layer"
							>
								<Layers className="w-3.5 h-3.5 text-cyan-400" />
								<span>+ Video</span>
							</Button>
						)}
						{onGenerateCaptions && (
							<Button
								onClick={onGenerateCaptions}
								disabled={isGeneratingCaptions || !videoUrl}
								variant="ghost"
								size="sm"
								className={`h-7 px-2.5 rounded-xl transition-all text-xs font-bold gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 ${isLight ? "text-slate-600 hover:text-lime-700 hover:bg-lime-50" : "text-slate-300 hover:text-lime-300 hover:bg-lime-500/10"}`}
								title={captionsLabel}
							>
								<Captions className="w-3.5 h-3.5 text-lime-500" />
								<span>Captions</span>
							</Button>
						)}
					</div>
				</div>

				{/* Center: Wondershare Filmora High-Precision Digital Timecode Display */}
				<div
					className={cn(
						"hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold tabular-nums tracking-wider border shadow-inner select-none shrink-0",
						isLight
							? "bg-slate-100 text-slate-800 border-slate-200"
							: "bg-[#050608] text-cyan-400 border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]",
					)}
					title="Current Playhead / Total Duration (HH:MM:SS:FF)"
				>
					<span>{formatTimecode(currentTimeMs)}</span>
					<span className={isLight ? "text-slate-400" : "text-white/30"}>/</span>
					<span className={isLight ? "text-slate-500" : "text-slate-400"}>
						{formatTimecode(totalMs)}
					</span>
				</div>

				{/* Right Side: Aspect Ratio & Filmora Zoom Controls */}
				<div className="flex items-center gap-2 shrink-0">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className={`h-7 px-3 rounded-full text-xs font-bold transition-all gap-1.5 cursor-pointer border ${isLight ? "text-slate-700 hover:text-slate-900 bg-white hover:bg-[#f4f4f5] border-[#e4e4e7]" : "text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border-white/10"}`}
							>
								<span>{getAspectRatioLabel(aspectRatio)}</span>
								<ChevronDown className="w-3 h-3 text-slate-400" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className={`rounded-2xl p-1.5 shadow-2xl border ${isLight ? "bg-white border-[#e4e4e7]" : "bg-[#101116] border-white/10"}`}
						>
							{ASPECT_RATIOS.map((ratio) => (
								<DropdownMenuItem
									key={ratio}
									onClick={() => onAspectRatioChange(ratio)}
									className={`text-xs font-bold rounded-xl cursor-pointer flex items-center justify-between gap-3 px-3 py-2 ${isLight ? "text-slate-700 hover:text-slate-950 hover:bg-[#f4f4f5]" : "text-slate-300 hover:text-white hover:bg-white/10"}`}
								>
									<span>{getAspectRatioLabel(ratio)}</span>
									{aspectRatio === ratio && (
										<Check className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Filmora Timeline Zoom Suite (Out, Slider, In, Fit) */}
					<div
						className={`flex items-center gap-1.5 rounded-2xl border px-2 py-0.5 shadow-2xs ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/[0.03] border-white/[0.08]"}`}
					>
						<Button
							onClick={handleZoomOut}
							variant="ghost"
							size="sm"
							className={`h-6 w-6 p-0 rounded-lg cursor-pointer ${isLight ? "text-slate-600 hover:text-slate-950 hover:bg-white" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
							title="Zoom Out (-)"
						>
							<Minus className="w-3 h-3" />
						</Button>
						<div className="w-16 hidden lg:block">
							<Slider
								min={0}
								max={100}
								step={1}
								value={[zoomSliderValue]}
								onValueChange={handleZoomSliderChange}
								accentColor={activeAccent.hex}
							/>
						</div>
						<Button
							onClick={handleZoomIn}
							variant="ghost"
							size="sm"
							className={`h-6 w-6 p-0 rounded-lg cursor-pointer ${isLight ? "text-slate-600 hover:text-slate-950 hover:bg-white" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
							title="Zoom In (+)"
						>
							<Plus className="w-3 h-3" />
						</Button>
						<Button
							onClick={handleFitTimeline}
							variant="ghost"
							size="sm"
							className={`h-6 w-6 p-0 rounded-lg cursor-pointer ${isLight ? "text-slate-600 hover:text-slate-950 hover:bg-white" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
							title="Fit to Timeline (Shift+Z)"
						>
							<Maximize2 className="w-3 h-3" />
						</Button>
					</div>
				</div>
			</div>
			<div
				ref={timelineContainerRef}
				className={`flex-1 min-h-0 overflow-auto custom-scrollbar relative ${isLight ? "bg-[#ffffff]" : "bg-[#09090b]"}`}
				onClick={() => {
					setSelectedKeyframeId(null);
					handleSelectMainClip(null);
				}}
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
					sidebarWidth={sidebarWidth}
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
						selectedMainClipId={selectedMainClipId}
						onSelectMainClip={handleSelectMainClip}
						selectedGapId={selectedGapId}
						onSelectGap={handleSelectGap}
						onSplitAtPlayhead={handleSplitAtPlayhead}
						onSplitAllAtPlayhead={handleSplitAllAtPlayheadAction}
						onMoveClipToNewLayer={handleMoveClipToNewLayer}
						trackVisibility={trackVisibility}
						onToggleTrackVisibility={onToggleTrackVisibility}
						trackMuted={trackMuted}
						onToggleTrackMute={onToggleTrackMute}
						trackLocked={trackLocked}
						onToggleTrackLock={onToggleTrackLock}
						keyframes={keyframes}
						videoUrl={videoUrl}
						showTrimWaveform={showTrimWaveform}
						onAddZoom={handleAddZoom}
						onAddTrim={handleAddTrim}
						onAddSubtitle={onGenerateCaptions}
						onAddVideoLayer={onAddVideoLayer}
						onAddAnnotation={handleAddAnnotation}
						onAddBlur={handleAddBlur}
						onAddSpeed={handleAddSpeed}
						onSelectVideoLayer={onSelectVideoLayer}
						selectedVideoLayerId={selectedVideoLayerId}
						videoLayers={videoLayers}
						selectedAudioId={selectedAudioId}
						onSelectAudio={onSelectAudio}
						audioTrackName={audioTrackName}
						onDeleteAudio={onDeleteAudio}
						onCropAndZoom={onCropAndZoom}
						onAdjustAudio={onAdjustAudio}
						onDeleteMainClip={deleteSelectedMainClip}
						onSelectAudioPreset={onSelectAudioPreset}
						clipColorMarks={clipColorMarks}
						onClipColorChange={onClipColorChange}
						onSetClipSpeed={onSetClipSpeed}
						onDuplicateClip={handleDuplicateClip}
						onTrimStartToPlayhead={handleTrimStartToPlayhead}
						onTrimEndToPlayhead={handleTrimEndToPlayhead}
						onSplitClip={handleSplitClip}
						onDeleteClipById={handleDeleteClipById}
						speedRegions={speedRegions}
						onSpeedAdded={onSpeedAdded}
						onSpeedDelete={onSpeedDelete}
						onSidebarWidthChange={handleSidebarWidthChange}
					/>
				</TimelineWrapper>
			</div>

			{/* Gap / Editing Mistake Modal */}
			{selectedGapTrim && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
					onClick={() => setSelectedGapId(null)}
				>
					<div
						className="bg-zinc-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1">
							<AlertTriangle className="w-6 h-6" />
						</div>
						<h3 className="text-base font-bold text-zinc-100">Timeline Gap — Editing Mistake?</h3>
						<p className="text-xs text-zinc-400 mt-2 leading-relaxed">
							There is a {((selectedGapTrim.endMs - selectedGapTrim.startMs) / 1000).toFixed(1)}s
							gap ({formatTimecode(selectedGapTrim.startMs)} –{" "}
							{formatTimecode(selectedGapTrim.endMs)}) on the main video track. During playback,
							this will show as a blank screen.
						</p>
						<div className="flex gap-3 w-full mt-5">
							<button
								type="button"
								onClick={() => {
									onTrimDelete?.(selectedGapTrim.id);
									setSelectedGapId(null);
									toast.success("Gap closed! Main video joined.");
								}}
								className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
							>
								<Scissors className="w-3.5 h-3.5" />
								Close Gap (Fix Mistake)
							</button>
							<button
								type="button"
								onClick={() => {
									onKeepBlankScreen?.(selectedGapTrim.id);
									setSelectedGapId(null);
								}}
								className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer"
							>
								Keep Blank Screen
							</button>
						</div>
						<div className="mt-4 pt-3 border-t border-zinc-800 w-full text-[11px] text-zinc-400 italic select-none">
							Ocal Screen is not responsible for editing gaps or timeline mistakes.
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
