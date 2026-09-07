import type { Span } from "dnd-timeline";
import {
	Check,
	ChevronDown,
	Columns2,
	FolderOpen,
	Languages,
	LayoutGrid,
	Moon,
	Rows3,
	Save,
	Settings,
	Sun,
	Video,
} from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { INITIAL_EDITOR_STATE, useEditorHistory } from "@/hooks/useEditorHistory";
import { getAvailableLocales, getLocaleName } from "@/i18n/loader";
import {
	captionSegmentsToAnnotationRegions,
	extractMono16kFromVideoUrl,
	MAX_CAPTION_AUDIO_SEC,
	reconcileAutoCaptionTimelineGaps,
	shiftTrimRegionsMsForCaptionBuffer,
	transcribeMono16kToSegments,
	trimLeadingSilenceMono16k,
} from "@/lib/captioning";
import { hasNativeCursorRecordingData } from "@/lib/cursor/nativeCursor";
import {
	calculateEffectiveSourceDimensions,
	calculateMp4ExportSettings,
	calculateOutputDimensions,
	type ExportFormat,
	type ExportProgress,
	type ExportQuality,
	type ExportSettings,
	GIF_SIZE_PRESETS,
	GifExporter,
	type GifFrameRate,
	type GifSizePreset,
	VideoExporter,
} from "@/lib/exporter";
import { computeFrameStepTime } from "@/lib/frameStep";
import type { CursorCaptureMode, ProjectMedia } from "@/lib/recordingSession";
import { matchesShortcut } from "@/lib/shortcuts";
import {
	ACCENT_COLOR_MAP,
	type AccentColor,
	getExportFolder,
	getProjectFolder,
	loadUserPreferences,
	parentDirectoryOf,
	saveUserPreferences,
} from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import { BackgroundLoadError } from "@/lib/wallpaper";
import { nativeBridgeClient, useCursorRecordingData, useCursorTelemetry } from "@/native";
import {
	getAspectRatioValue,
	getNativeAspectRatioValue,
	isPortraitAspectRatio,
} from "@/utils/aspectRatioUtils";
import { EditorEmptyState } from "./EditorEmptyState";
import { ExportDialog } from "./ExportDialog";
import {
	DEFAULT_CURSOR_SETTINGS,
	DEFAULT_EXPORT_SETTINGS,
	DEFAULT_GIF_SETTINGS,
	DEFAULT_SOURCE_DIMENSIONS,
} from "./editorDefaults";
import PlaybackControls from "./PlaybackControls";
import {
	createProjectData,
	createProjectSnapshot,
	deriveNextId,
	fromFileUrl,
	hasProjectUnsavedChanges,
	normalizeProjectEditor,
	resolveProjectMedia,
	toFileUrl,
	validateProjectData,
} from "./projectPersistence";
import { SettingsPanel } from "./SettingsPanel";
import { StudioSettingsDialog } from "./StudioSettingsDialog";
import TimelineEditor from "./timeline/TimelineEditor";
import { buildAutoZoomSuggestions, isClickInteractionType } from "./timeline/zoomSuggestionUtils";
import {
	type AnnotationRegion,
	type BlurData,
	COLOR_FILTER_PRESETS,
	type ColorFilterPreset,
	clampFocusToDepth,
	DEFAULT_ANNOTATION_POSITION,
	DEFAULT_ANNOTATION_SIZE,
	DEFAULT_ANNOTATION_STYLE,
	DEFAULT_BLUR_DATA,
	DEFAULT_FIGURE_DATA,
	DEFAULT_PLAYBACK_SPEED,
	DEFAULT_ZOOM_DEPTH,
	type FigureData,
	type PlaybackSpeed,
	type Rotation3DPreset,
	type SpeedRegion,
	type TrimRegion,
	ZOOM_DEPTH_SCALES,
	type ZoomDepth,
	type ZoomFocus,
	type ZoomFocusMode,
	type ZoomRegion,
} from "./types";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import VideoPlayback, { VideoPlaybackRef } from "./VideoPlayback";

/** Single Sonner slot so auto-caption phases update in place instead of stacking. */
const AUTO_CAPTION_PROGRESS_TOAST_ID = "auto-caption-progress";

interface ExportDiagnostics {
	formatLabel: "GIF" | "Video";
	reason?: string;
	sourcePath?: string | null;
	width?: number;
	height?: number;
	frameRate?: number;
	codec?: string;
	bitrate?: number;
}

function getFileNameForDiagnostics(filePath?: string | null) {
	if (!filePath) return "unknown";

	try {
		const url = new URL(filePath);
		if (url.protocol === "file:") {
			return decodeURIComponent(url.pathname).split(/[\\/]/).pop() || filePath;
		}
	} catch {
		// Treat non-URL values as filesystem paths.
	}

	return filePath.split(/[\\/]/).pop() || filePath;
}

function buildExportDiagnosticMessage(diagnostics: ExportDiagnostics) {
	const details = [
		diagnostics.reason ? `Reason: ${diagnostics.reason}` : null,
		`Source: ${getFileNameForDiagnostics(diagnostics.sourcePath)}`,
		diagnostics.width && diagnostics.height
			? `Output: ${diagnostics.width}x${diagnostics.height}${
					diagnostics.frameRate ? ` @ ${diagnostics.frameRate} fps` : ""
				}`
			: null,
		diagnostics.codec ? `Codec: ${diagnostics.codec}` : null,
		diagnostics.bitrate ? `Bitrate: ${Math.round(diagnostics.bitrate / 1_000_000)} Mbps` : null,
		`VideoEncoder: ${"VideoEncoder" in window ? "available" : "unavailable"}`,
	].filter(Boolean);

	return `${diagnostics.formatLabel} export failed\n${details.join("\n")}`;
}

function buildSaveDiagnosticMessage(formatLabel: "GIF" | "Video", reason?: string) {
	return `${formatLabel} export save failed${reason ? `\nReason: ${reason}` : ""}`;
}

const CAPTION_WORD_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export default function VideoEditor() {
	const isWin =
		typeof window !== "undefined" && window.navigator?.platform?.toLowerCase().includes("win");

	const [themeMode, setThemeMode] = useState<"dark" | "light">(() => loadUserPreferences().theme);
	const [accentColor, setAccentColor] = useState<AccentColor>(
		() => loadUserPreferences().accentColor,
	);
	const [userName, setUserName] = useState<string>(() => loadUserPreferences().userName);
	const [showAccentPicker, setShowAccentPicker] = useState(false);
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);

	const isLight = themeMode === "light";
	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;

	useEffect(() => {
		if (isLight) {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.documentElement.setAttribute("data-theme", "light");
		} else {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.documentElement.setAttribute("data-theme", "dark");
		}
	}, [isLight]);

	const toggleThemeMode = () => {
		const next = themeMode === "dark" ? "light" : "dark";
		setThemeMode(next);
		saveUserPreferences({ theme: next });
	};

	const selectAccentColor = (color: AccentColor) => {
		setAccentColor(color);
		saveUserPreferences({ accentColor: color });
		setShowAccentPicker(false);
	};

	const {
		state: editorState,
		pushState,
		updateState,
		commitState,
		undo,
		redo,
		resetState,
	} = useEditorHistory(INITIAL_EDITOR_STATE);

	const {
		zoomRegions,
		autoZoomEnabled,
		autoFocusAll,
		trimRegions,
		speedRegions,
		annotationRegions,
		cropRegion,
		wallpaper,
		shadowIntensity,
		showBlur,
		showTrimWaveform,
		motionBlurAmount,
		borderRadius,
		padding,
		aspectRatio,
		webcamLayoutPreset,
		webcamMaskShape,
		webcamMirrored,
		webcamReactiveZoom,
		webcamSizePreset,
		webcamPosition,
		videoLayers,
		colorFilterPreset,
		brightness,
		contrast,
		saturation,
		vignette,
		cursorSpotlight,
		cursorSpotlightRadius,
		clickRipple,
	} = editorState;

	const handleAddVideoLayer = useCallback(() => {
		const newLayerId = `layer-video-${Date.now()}`;
		const newLayer: import("./types").VideoLayerTrack = {
			id: newLayerId,
			name: `Camera / Video Layer ${videoLayers.length + 1}`,
			type: "live-cam",
			enabled: true,
			opacity: 1.0,
			x: 10 + ((videoLayers.length * 15) % 60),
			y: 10 + ((videoLayers.length * 15) % 60),
			width: 25,
			height: 25,
			zIndex: videoLayers.length + 5,
			maskShape: "rounded",
			borderWidth: 3,
			borderColor: "#3b82f6",
			shadowGlow: true,
			volume: 1.0,
			muted: false,
			startMs: 0,
		};
		updateState({ videoLayers: [...videoLayers, newLayer] });
		toast.success(`Added ${newLayer.name}`);
	}, [videoLayers, updateState]);

	const handleUpdateVideoLayer = useCallback(
		(id: string, updates: Partial<import("./types").VideoLayerTrack>) => {
			const updated = videoLayers.map((layer) =>
				layer.id === id ? { ...layer, ...updates } : layer,
			);
			updateState({ videoLayers: updated });
		},
		[videoLayers, updateState],
	);

	const handleDeleteVideoLayer = useCallback(
		(id: string) => {
			const updated = videoLayers.filter((layer) => layer.id !== id);
			updateState({ videoLayers: updated });
			toast.info("Video layer removed");
		},
		[videoLayers, updateState],
	);

	// Non-undoable state
	const [videoPath, setVideoPath] = useState<string | null>(null);
	const [videoSourcePath, setVideoSourcePath] = useState<string | null>(null);
	const [webcamVideoPath, setWebcamVideoPath] = useState<string | null>(null);
	const [webcamVideoSourcePath, setWebcamVideoSourcePath] = useState<string | null>(null);
	const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const currentTimeRef = useRef(currentTime);
	currentTimeRef.current = currentTime;
	const durationRef = useRef(duration);
	durationRef.current = duration;
	const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
	const [isPreviewingZoom, setIsPreviewingZoom] = useState(false);
	const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
	const [selectedSpeedId, setSelectedSpeedId] = useState<string | null>(null);
	const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
	const [selectedBlurId, setSelectedBlurId] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
	const [exportError, setExportError] = useState<string | null>(null);
	const [showExportDialog, setShowExportDialog] = useState(false);
	const [showNewRecordingDialog, setShowNewRecordingDialog] = useState(false);
	const [exportQuality, setExportQuality] = useState<ExportQuality>(
		DEFAULT_EXPORT_SETTINGS.quality,
	);
	const [exportFormat, setExportFormat] = useState<ExportFormat>(DEFAULT_EXPORT_SETTINGS.format);
	const [gifFrameRate, setGifFrameRate] = useState<GifFrameRate>(DEFAULT_GIF_SETTINGS.frameRate);
	const [gifLoop, setGifLoop] = useState(DEFAULT_GIF_SETTINGS.loop);
	const [gifSizePreset, setGifSizePreset] = useState<GifSizePreset>(
		DEFAULT_GIF_SETTINGS.sizePreset,
	);
	const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
	const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
	const [unsavedExport, setUnsavedExport] = useState<{
		arrayBuffer: ArrayBuffer;
		fileName: string;
		format: string;
	} | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [layoutMode, setLayoutMode] = useState<"auto" | "portrait-pro" | "landscape-stack">("auto");
	const isPortrait = isPortraitAspectRatio(aspectRatio);
	const effectiveIsPortraitLayout =
		layoutMode === "portrait-pro" ? true : layoutMode === "landscape-stack" ? false : isPortrait;
	const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false);
	// Unsaved-changes confirmation for New Project / Load Project.
	// The window-close flow uses showCloseConfirmDialog above.
	const [confirmDialogVariant, setConfirmDialogVariant] = useState<
		"newProject" | "loadProject" | null
	>(null);
	const playerContainerRef = useRef<HTMLDivElement | null>(null);
	const cursorTelemetrySourcePath = videoSourcePath ?? (videoPath ? fromFileUrl(videoPath) : null);
	const { samples: cursorTelemetry, error: cursorTelemetryError } =
		useCursorTelemetry(cursorTelemetrySourcePath);
	const { data: cursorRecordingData, error: cursorRecordingDataError } =
		useCursorRecordingData(cursorTelemetrySourcePath);
	const cursorClickTimestamps = useMemo<number[]>(() => {
		const recordingClicks =
			cursorRecordingData?.samples
				.filter((sample) => isClickInteractionType(sample))
				.map((sample) => sample.timeMs) ?? [];
		if (recordingClicks.length > 0) {
			return recordingClicks;
		}

		return cursorTelemetry
			.filter((sample) => isClickInteractionType(sample))
			.map((sample) => sample.timeMs);
	}, [cursorRecordingData, cursorTelemetry]);

	// Cursor & motion blur visual settings (non-undoable preferences)
	const [showCursor, setShowCursor] = useState(DEFAULT_CURSOR_SETTINGS.show);
	const [cursorSize, setCursorSize] = useState(DEFAULT_CURSOR_SETTINGS.size);
	const [cursorSmoothing, setCursorSmoothing] = useState(DEFAULT_CURSOR_SETTINGS.smoothing);
	const [cursorMotionBlur, setCursorMotionBlur] = useState(DEFAULT_CURSOR_SETTINGS.motionBlur);
	const [cursorClickBounce, setCursorClickBounce] = useState(DEFAULT_CURSOR_SETTINGS.clickBounce);
	const [cursorClipToBounds, setCursorClipToBounds] = useState(
		DEFAULT_CURSOR_SETTINGS.clipToBounds,
	);
	const [cursorTheme, setCursorTheme] = useState(DEFAULT_CURSOR_SETTINGS.theme);
	const [recordingCursorCaptureMode, setRecordingCursorCaptureMode] =
		useState<CursorCaptureMode | null>(null);

	const videoPlaybackRef = useRef<VideoPlaybackRef>(null);

	const nextZoomIdRef = useRef(1);
	const nextTrimIdRef = useRef(1);
	const nextSpeedIdRef = useRef(1);

	const { shortcuts, isMac } = useShortcuts();
	// Windows recordings include captured cursor assets. macOS hides the system
	// cursor in ScreenCaptureKit and renders telemetry samples with OpenScreen's
	// default arrow asset for the editable overlay.
	const hasEditableCursorRecording =
		hasNativeCursorRecordingData(cursorRecordingData) && recordingCursorCaptureMode !== "system";
	const effectiveShowCursor = showCursor && hasEditableCursorRecording;
	const showCursorSettings = hasEditableCursorRecording;
	const { locale, setLocale, t: rawT } = useI18n();
	const t = useScopedT("editor");
	const ts = useScopedT("settings");
	const availableLocales = getAvailableLocales();

	const nextAnnotationIdRef = useRef(1);
	const nextAnnotationZIndexRef = useRef(1);
	const isAutoCaptioningRef = useRef(false);
	const [isAutoCaptioning, setIsAutoCaptioning] = useState(false);
	const [showAutoCaptionsDialog, setShowAutoCaptionsDialog] = useState(false);
	const [captionWordsMin, setCaptionWordsMin] = useState(2);
	const [captionWordsMax, setCaptionWordsMax] = useState(7);
	const exporterRef = useRef<VideoExporter | null>(null);

	const annotationOnlyRegions = useMemo(
		() => annotationRegions.filter((region) => region.type !== "blur"),
		[annotationRegions],
	);
	const blurRegions = useMemo(
		() => annotationRegions.filter((region) => region.type === "blur"),
		[annotationRegions],
	);

	const currentProjectMedia = useMemo<ProjectMedia | null>(() => {
		const screenVideoPath = videoSourcePath ?? (videoPath ? fromFileUrl(videoPath) : null);
		if (!screenVideoPath) {
			return null;
		}

		const webcamSourcePath =
			webcamVideoSourcePath ?? (webcamVideoPath ? fromFileUrl(webcamVideoPath) : null);
		return {
			screenVideoPath,
			...(webcamSourcePath ? { webcamVideoPath: webcamSourcePath } : {}),
			...(recordingCursorCaptureMode ? { cursorCaptureMode: recordingCursorCaptureMode } : {}),
		};
	}, [
		videoPath,
		videoSourcePath,
		webcamVideoPath,
		webcamVideoSourcePath,
		recordingCursorCaptureMode,
	]);

	const applyLoadedProject = useCallback(
		async (candidate: unknown, path?: string | null) => {
			if (!validateProjectData(candidate)) {
				return false;
			}

			const project = candidate;
			const projectMedia = resolveProjectMedia(project);
			if (!projectMedia) {
				return false;
			}
			const sourcePath = projectMedia.screenVideoPath;
			const webcamSourcePath = projectMedia.webcamVideoPath ?? null;
			const projectCursorCaptureMode = projectMedia.cursorCaptureMode ?? null;
			const normalizedEditor = normalizeProjectEditor(project.editor);
			const inferredDurationMs = Math.max(
				0,
				...normalizedEditor.zoomRegions.map((region) => region.endMs),
				...normalizedEditor.trimRegions.map((region) => region.endMs),
				...normalizedEditor.speedRegions.map((region) => region.endMs),
				...normalizedEditor.annotationRegions.map((region) => region.endMs),
			);

			try {
				videoPlaybackRef.current?.pause();
			} catch {
				// no-op
			}
			setIsPlaying(false);
			setCurrentTime(0);
			setDuration(inferredDurationMs > 0 ? inferredDurationMs / 1000 : 0);

			setError(null);
			setVideoSourcePath(sourcePath);
			setVideoPath(toFileUrl(sourcePath));
			setWebcamVideoSourcePath(webcamSourcePath);
			setWebcamVideoPath(webcamSourcePath ? toFileUrl(webcamSourcePath) : null);
			setRecordingCursorCaptureMode(projectCursorCaptureMode);
			setCurrentProjectPath(path ?? null);

			// A loaded project keeps its zooms exactly as saved, so never auto-suggest
			// over it (even if it has zero zooms because the user deleted them all).
			autoProcessedSourceRef.current = sourcePath;

			pushState({
				wallpaper: normalizedEditor.wallpaper,
				shadowIntensity: normalizedEditor.shadowIntensity,
				showBlur: normalizedEditor.showBlur,
				showTrimWaveform: normalizedEditor.showTrimWaveform,
				motionBlurAmount: normalizedEditor.motionBlurAmount,
				borderRadius: normalizedEditor.borderRadius,
				padding: normalizedEditor.padding,
				cropRegion: normalizedEditor.cropRegion,
				zoomRegions: normalizedEditor.zoomRegions,
				autoZoomEnabled: normalizedEditor.autoZoomEnabled,
				autoFocusAll: normalizedEditor.autoFocusAll,
				trimRegions: normalizedEditor.trimRegions,
				speedRegions: normalizedEditor.speedRegions,
				annotationRegions: normalizedEditor.annotationRegions,
				aspectRatio: normalizedEditor.aspectRatio,
				webcamLayoutPreset: normalizedEditor.webcamLayoutPreset,
				webcamMaskShape: normalizedEditor.webcamMaskShape,
				webcamMirrored: normalizedEditor.webcamMirrored,
				webcamReactiveZoom: normalizedEditor.webcamReactiveZoom,
				webcamSizePreset: normalizedEditor.webcamSizePreset,
				webcamPosition: normalizedEditor.webcamPosition,
			});
			setExportQuality(normalizedEditor.exportQuality);
			setExportFormat(normalizedEditor.exportFormat);
			setGifFrameRate(normalizedEditor.gifFrameRate);
			setGifLoop(normalizedEditor.gifLoop);
			setGifSizePreset(normalizedEditor.gifSizePreset);
			setCursorTheme(normalizedEditor.cursorTheme);

			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);
			setSelectedBlurId(null);

			nextZoomIdRef.current = deriveNextId(
				"zoom",
				normalizedEditor.zoomRegions.map((region) => region.id),
			);
			nextTrimIdRef.current = deriveNextId(
				"trim",
				normalizedEditor.trimRegions.map((region) => region.id),
			);
			nextSpeedIdRef.current = deriveNextId(
				"speed",
				normalizedEditor.speedRegions.map((region) => region.id),
			);
			nextAnnotationIdRef.current = deriveNextId(
				"annotation",
				normalizedEditor.annotationRegions.map((region) => region.id),
			);
			nextAnnotationZIndexRef.current =
				normalizedEditor.annotationRegions.reduce(
					(max, region) => Math.max(max, region.zIndex),
					0,
				) + 1;

			setLastSavedSnapshot(
				createProjectSnapshot(
					{
						screenVideoPath: sourcePath,
						...(webcamSourcePath ? { webcamVideoPath: webcamSourcePath } : {}),
						...(projectCursorCaptureMode ? { cursorCaptureMode: projectCursorCaptureMode } : {}),
					},
					normalizedEditor,
				),
			);
			return true;
		},
		[pushState],
	);

	const currentProjectSnapshot = useMemo(() => {
		if (!currentProjectMedia) {
			return null;
		}
		return createProjectSnapshot(currentProjectMedia, {
			wallpaper,
			shadowIntensity,
			showBlur,
			showTrimWaveform,
			motionBlurAmount,
			borderRadius,
			padding,
			cropRegion,
			zoomRegions,
			autoZoomEnabled,
			autoFocusAll,
			trimRegions,
			speedRegions,
			annotationRegions,
			aspectRatio,
			webcamLayoutPreset,
			webcamMaskShape,
			webcamMirrored,
			webcamReactiveZoom,
			webcamSizePreset,
			webcamPosition,
			exportQuality,
			exportFormat,
			gifFrameRate,
			gifLoop,
			gifSizePreset,
			cursorTheme,
			colorFilterPreset,
			brightness,
			contrast,
			saturation,
			vignette,
			cursorSpotlight,
			cursorSpotlightRadius,
			clickRipple,
		});
	}, [
		currentProjectMedia,
		cursorTheme,
		wallpaper,
		shadowIntensity,
		showBlur,
		showTrimWaveform,
		motionBlurAmount,
		borderRadius,
		padding,
		cropRegion,
		zoomRegions,
		autoZoomEnabled,
		autoFocusAll,
		trimRegions,
		speedRegions,
		annotationRegions,
		aspectRatio,
		webcamLayoutPreset,
		webcamMaskShape,
		webcamMirrored,
		webcamReactiveZoom,
		webcamSizePreset,
		webcamPosition,
		exportQuality,
		exportFormat,
		gifFrameRate,
		gifLoop,
		gifSizePreset,
		colorFilterPreset,
		brightness,
		contrast,
		saturation,
		vignette,
		cursorSpotlight,
		cursorSpotlightRadius,
		clickRipple,
	]);

	const hasUnsavedChanges = hasProjectUnsavedChanges(currentProjectSnapshot, lastSavedSnapshot);

	useEffect(() => {
		async function loadInitialData() {
			try {
				const currentProjectResult = await nativeBridgeClient.project.loadCurrentProjectFile();
				if (currentProjectResult.success && currentProjectResult.project) {
					const restored = await applyLoadedProject(
						currentProjectResult.project,
						currentProjectResult.path ?? null,
					);
					if (restored) {
						return;
					}
				}

				const currentSessionResult = await window.electronAPI.getCurrentRecordingSession();
				if (currentSessionResult.success && currentSessionResult.session) {
					const session = currentSessionResult.session;
					const sourcePath = fromFileUrl(session.screenVideoPath);
					const webcamSourcePath = session.webcamVideoPath
						? fromFileUrl(session.webcamVideoPath)
						: null;
					setVideoSourcePath(sourcePath);
					setVideoPath(toFileUrl(sourcePath));
					setWebcamVideoSourcePath(webcamSourcePath);
					setWebcamVideoPath(webcamSourcePath ? toFileUrl(webcamSourcePath) : null);
					setRecordingCursorCaptureMode(session.cursorCaptureMode ?? null);
					setCurrentProjectPath(null);
					setLastSavedSnapshot(
						createProjectSnapshot(
							{
								screenVideoPath: sourcePath,
								...(webcamSourcePath ? { webcamVideoPath: webcamSourcePath } : {}),
								...(session.cursorCaptureMode
									? { cursorCaptureMode: session.cursorCaptureMode }
									: {}),
							},
							INITIAL_EDITOR_STATE,
						),
					);
					return;
				}

				const result = await nativeBridgeClient.project.getCurrentVideoPath();
				if (result.success && result.path) {
					setVideoSourcePath(result.path);
					setVideoPath(toFileUrl(result.path));
					setRecordingCursorCaptureMode(null);
					setCurrentProjectPath(null);
					setLastSavedSnapshot(
						createProjectSnapshot({ screenVideoPath: result.path }, INITIAL_EDITOR_STATE),
					);
				}
				// No video/project/session, so leave videoPath null and let the
				// EditorEmptyState dashboard render instead of an error screen.
			} catch (err) {
				setError("Error loading video: " + String(err));
			} finally {
				setLoading(false);
			}
		}

		loadInitialData();
	}, [applyLoadedProject]);

	// Avoid overwriting saved prefs with defaults before they've loaded.
	const [prefsHydrated, setPrefsHydrated] = useState(false);

	// Load persisted user preferences on mount (intentionally runs once)
	useEffect(() => {
		const prefs = loadUserPreferences();
		updateState({
			padding: prefs.padding,
			aspectRatio: prefs.aspectRatio,
		});
		setExportQuality(prefs.exportQuality);
		setExportFormat(prefs.exportFormat);
		setPrefsHydrated(true);
	}, [updateState]);

	// Auto-save user preferences when settings change
	useEffect(() => {
		if (!prefsHydrated) return;
		saveUserPreferences({ padding, aspectRatio, exportQuality, exportFormat });
	}, [prefsHydrated, padding, aspectRatio, exportQuality, exportFormat]);

	const saveProject = useCallback(
		async (forceSaveAs: boolean) => {
			if (!videoPath) {
				toast.error(t("errors.noVideoLoaded"));
				return false;
			}

			if (!currentProjectMedia) {
				toast.error(t("errors.unableToDetermineSourcePath"));
				return false;
			}

			const editorState = {
				wallpaper,
				shadowIntensity,
				showBlur,
				showTrimWaveform,
				motionBlurAmount,
				borderRadius,
				padding,
				cropRegion,
				zoomRegions,
				autoZoomEnabled,
				autoFocusAll,
				trimRegions,
				speedRegions,
				annotationRegions,
				aspectRatio,
				webcamLayoutPreset,
				webcamMaskShape,
				webcamMirrored,
				webcamReactiveZoom,
				webcamSizePreset,
				webcamPosition,
				exportQuality,
				exportFormat,
				gifFrameRate,
				gifLoop,
				gifSizePreset,
				cursorTheme,
				colorFilterPreset,
				brightness,
				contrast,
				saturation,
				vignette,
				cursorSpotlight,
				cursorSpotlightRadius,
				clickRipple,
			};
			const projectData = createProjectData(currentProjectMedia, editorState);

			const fileNameBase =
				currentProjectMedia.screenVideoPath
					.split(/[\\/]/)
					.pop()
					?.replace(/\.[^.]+$/, "") || `project-${Date.now()}`;
			// Normalize the same way as currentProjectSnapshot so the post-save
			// baseline compares equal and hasUnsavedChanges clears.
			const projectSnapshot = createProjectSnapshot(currentProjectMedia, editorState);
			const result = await nativeBridgeClient.project.saveProjectFile(
				projectData,
				fileNameBase,
				forceSaveAs ? undefined : (currentProjectPath ?? undefined),
			);

			if (result.canceled) {
				toast.info(t("project.saveCanceled"));
				return false;
			}

			if (!result.success) {
				toast.error(result.message || t("project.failedToSave"));
				return false;
			}

			if (result.path) {
				setCurrentProjectPath(result.path);
			}
			setLastSavedSnapshot(projectSnapshot);

			toast.success(t("project.savedTo", { path: result.path ?? "" }));
			return true;
		},
		[
			currentProjectMedia,
			currentProjectPath,
			wallpaper,
			shadowIntensity,
			showBlur,
			showTrimWaveform,
			motionBlurAmount,
			borderRadius,
			padding,
			cropRegion,
			zoomRegions,
			autoZoomEnabled,
			autoFocusAll,
			trimRegions,
			speedRegions,
			annotationRegions,
			aspectRatio,
			webcamLayoutPreset,
			webcamMaskShape,
			webcamMirrored,
			webcamReactiveZoom,
			webcamSizePreset,
			webcamPosition,
			exportQuality,
			exportFormat,
			gifFrameRate,
			gifLoop,
			gifSizePreset,
			cursorTheme,
			colorFilterPreset,
			brightness,
			contrast,
			saturation,
			vignette,
			cursorSpotlight,
			cursorSpotlightRadius,
			clickRipple,
			videoPath,
			t,
		],
	);

	useEffect(() => {
		window.electronAPI.setHasUnsavedChanges(hasUnsavedChanges);
	}, [hasUnsavedChanges]);

	useEffect(() => {
		const cleanup = window.electronAPI.onRequestSaveBeforeClose(async () => {
			return saveProject(false);
		});
		return () => cleanup();
	}, [saveProject]);

	useEffect(() => {
		const cleanup = window.electronAPI.onRequestCloseConfirm(() => {
			setShowCloseConfirmDialog(true);
		});
		return () => cleanup();
	}, []);

	const handleCloseConfirmSave = useCallback(() => {
		setShowCloseConfirmDialog(false);
		window.electronAPI.sendCloseConfirmResponse("save");
	}, []);

	const handleCloseConfirmDiscard = useCallback(() => {
		setShowCloseConfirmDialog(false);
		window.electronAPI.sendCloseConfirmResponse("discard");
	}, []);

	const handleCloseConfirmCancel = useCallback(() => {
		setShowCloseConfirmDialog(false);
		window.electronAPI.sendCloseConfirmResponse("cancel");
	}, []);

	const handleSaveProject = useCallback(async () => {
		await saveProject(false);
	}, [saveProject]);

	const handleSaveProjectAs = useCallback(async () => {
		await saveProject(true);
	}, [saveProject]);

	const handleNewRecordingConfirm = useCallback(async () => {
		const result = await window.electronAPI.startNewRecording();
		if (result.success) {
			setShowNewRecordingDialog(false);
		} else {
			console.error("Failed to start new recording:", result.error);
			setError("Failed to start new recording: " + (result.error || "Unknown error"));
		}
	}, []);

	const doLoadProject = useCallback(async () => {
		const result = await nativeBridgeClient.project.loadProjectFile(getProjectFolder());

		if (result.canceled) {
			return;
		}

		if (!result.success) {
			toast.error(result.message || t("project.failedToLoad"));
			return;
		}

		const restored = await applyLoadedProject(result.project, result.path ?? null);
		if (!restored) {
			toast.error(t("project.invalidFormat"));
			return;
		}

		if (result.path) {
			const folder = parentDirectoryOf(result.path);
			if (folder) {
				saveUserPreferences({ projectFolder: folder });
			}
		}

		toast.success(t("project.loadedFrom", { path: result.path ?? "" }));
	}, [applyLoadedProject, t]);

	const handleLoadProject = useCallback(async () => {
		if (hasUnsavedChanges) {
			setConfirmDialogVariant("loadProject");
			return;
		}
		await doLoadProject();
	}, [hasUnsavedChanges, doLoadProject]);

	const handleLoadProjectConfirmSave = useCallback(async () => {
		setConfirmDialogVariant(null);
		const saved = await saveProject(false);
		if (saved) {
			await doLoadProject();
		}
	}, [saveProject, doLoadProject]);

	const handleLoadProjectConfirmDiscard = useCallback(async () => {
		setConfirmDialogVariant(null);
		await doLoadProject();
	}, [doLoadProject]);

	// New Project: clear all media/project/editor state back to the empty
	// Studio dashboard. Prompts to save first when there are unsaved changes.
	const doNewProject = useCallback(async () => {
		await nativeBridgeClient.project.clearCurrentVideoPath();
		setVideoPath(null);
		setVideoSourcePath(null);
		setWebcamVideoPath(null);
		setWebcamVideoSourcePath(null);
		setCurrentProjectPath(null);
		setLastSavedSnapshot(null);
		// Reset undoable editor state + undo/redo history to a clean slate.
		resetState();
		// Reset non-undoable selection state.
		setSelectedZoomId(null);
		setSelectedTrimId(null);
		setSelectedSpeedId(null);
		setSelectedAnnotationId(null);
		setSelectedBlurId(null);
		// Reset playback.
		setCurrentTime(0);
		setIsPlaying(false);
		// Reset cursor preferences to defaults.
		setShowCursor(DEFAULT_CURSOR_SETTINGS.show);
		setCursorSize(DEFAULT_CURSOR_SETTINGS.size);
		setCursorSmoothing(DEFAULT_CURSOR_SETTINGS.smoothing);
		setCursorMotionBlur(DEFAULT_CURSOR_SETTINGS.motionBlur);
		setCursorClickBounce(DEFAULT_CURSOR_SETTINGS.clickBounce);
		setCursorClipToBounds(DEFAULT_CURSOR_SETTINGS.clipToBounds);
		setCursorTheme(DEFAULT_CURSOR_SETTINGS.theme);
		// Reset region ID counters.
		nextZoomIdRef.current = 1;
		nextTrimIdRef.current = 1;
		nextSpeedIdRef.current = 1;
		nextAnnotationIdRef.current = 1;
		nextAnnotationZIndexRef.current = 1;
	}, [resetState]);

	const handleNewProject = useCallback(async () => {
		if (hasUnsavedChanges) {
			setConfirmDialogVariant("newProject");
			return;
		}
		await doNewProject();
	}, [hasUnsavedChanges, doNewProject]);

	const handleNewProjectConfirmSave = useCallback(async () => {
		setConfirmDialogVariant(null);
		const saved = await saveProject(false);
		if (saved) {
			await doNewProject();
		}
	}, [saveProject, doNewProject]);

	const handleNewProjectConfirmDiscard = useCallback(async () => {
		setConfirmDialogVariant(null);
		await doNewProject();
	}, [doNewProject]);

	useEffect(() => {
		const removeNewProjectListener = window.electronAPI.onMenuNewProject(handleNewProject);
		const removeLoadListener = window.electronAPI.onMenuLoadProject(handleLoadProject);
		const removeSaveListener = window.electronAPI.onMenuSaveProject(handleSaveProject);
		const removeSaveAsListener = window.electronAPI.onMenuSaveProjectAs(handleSaveProjectAs);

		return () => {
			removeNewProjectListener?.();
			removeLoadListener?.();
			removeSaveListener?.();
			removeSaveAsListener?.();
		};
	}, [handleNewProject, handleLoadProject, handleSaveProject, handleSaveProjectAs]);

	useEffect(() => {
		if (cursorTelemetryError) {
			console.warn("Unable to load cursor telemetry:", cursorTelemetryError);
		}
	}, [cursorTelemetryError]);

	useEffect(() => {
		if (cursorRecordingDataError) {
			console.warn("Unable to load cursor recording data:", cursorRecordingDataError);
		}
	}, [cursorRecordingDataError]);

	function togglePlayPause() {
		const playback = videoPlaybackRef.current;
		const video = playback?.video;
		if (!playback || !video) return;

		if (isPlaying) {
			playback.pause();
		} else {
			playback.play().catch((err) => console.error("Video play failed:", err));
		}
	}

	const toggleFullscreen = useCallback(() => {
		setIsFullscreen((prev) => !prev);
	}, []);

	useEffect(() => {
		if (!isFullscreen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsFullscreen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isFullscreen]);

	function handleSeek(time: number) {
		setCurrentTime(time);
		const video = videoPlaybackRef.current?.video;
		if (!video) return;
		video.currentTime = time;
	}

	const handleSelectZoom = useCallback((id: string | null) => {
		setSelectedZoomId(id);
		if (id) {
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);
			setSelectedBlurId(null);
		}
	}, []);

	const handleSelectTrim = useCallback((id: string | null) => {
		setSelectedTrimId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);
			setSelectedBlurId(null);
		}
	}, []);

	const handleSelectAnnotation = useCallback((id: string | null) => {
		setSelectedAnnotationId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedBlurId(null);
		}
	}, []);

	const handleSelectBlur = useCallback((id: string | null) => {
		setSelectedBlurId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
			setSelectedSpeedId(null);
		}
	}, []);

	const handleZoomAdded = useCallback(
		(span: Span) => {
			const id = `zoom-${nextZoomIdRef.current++}`;
			const newRegion: ZoomRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				depth: DEFAULT_ZOOM_DEPTH,
				customScale: ZOOM_DEPTH_SCALES[DEFAULT_ZOOM_DEPTH],
				focus: { cx: 0.5, cy: 0.5 },
				// Auto-Focus on means new zooms follow the cursor too.
				focusMode: autoFocusAll ? "auto" : undefined,
				source: "manual",
			};
			pushState((prev) => ({ zoomRegions: [...prev.zoomRegions, newRegion] }));
			setSelectedZoomId(id);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);
			setSelectedBlurId(null);
		},
		[pushState, autoFocusAll],
	);

	// Builds fresh "auto" zoom regions from cursor telemetry without overlapping
	// existing ones. Used by both the on-load auto-suggest pass and the wand toggle.
	const buildAutoZoomRegions = useCallback(
		(existingRegions: ZoomRegion[]): ZoomRegion[] => {
			const effectiveDuration =
				duration > 0
					? duration
					: videoPlaybackRef.current?.video?.duration &&
							Number.isFinite(videoPlaybackRef.current.video.duration)
						? videoPlaybackRef.current.video.duration
						: 10;
			const totalMs = Math.round(effectiveDuration * 1000);
			const suggestions = buildAutoZoomSuggestions({
				cursorTelemetry,
				cursorClickTimestamps,
				totalMs,
				existingRegions,
				defaultDurationMs: Math.max(2800, Math.round(totalMs * 0.08)),
			});
			return suggestions.map((suggestion) => {
				const scale = suggestion.customScale ?? ZOOM_DEPTH_SCALES[DEFAULT_ZOOM_DEPTH];
				const depth = scale >= 1.8 ? 3 : scale >= 1.45 ? 2 : 1;
				return {
					id: `zoom-${nextZoomIdRef.current++}`,
					startMs: Math.round(suggestion.span.start),
					endMs: Math.round(suggestion.span.end),
					depth,
					customScale: scale,
					focus: clampFocusToDepth(suggestion.focus, depth),
					focusMode: autoFocusAll ? ("auto" as const) : undefined,
					source: "auto" as const,
				};
			});
		},
		[cursorTelemetry, cursorClickTimestamps, duration, autoFocusAll],
	);

	// Auto-suggest zooms once per fresh recording (no existing zooms, telemetry
	// Auto-suggest zooms once per fresh recording or imported video.
	// NOTE: cursor telemetry loads asynchronously — only mark the source as
	// processed once we have actual cursor data so the effect retries until data
	// is ready, preventing empty suggestion sets when data arrives late.
	const autoProcessedSourceRef = useRef<string | null>(null);
	useEffect(() => {
		if (!autoZoomEnabled || duration <= 0) return;
		const sourceKey = cursorTelemetrySourcePath || videoPath || "current-source";
		if (autoProcessedSourceRef.current === sourceKey) return;
		if (zoomRegions.length > 0) {
			autoProcessedSourceRef.current = sourceKey;
			return;
		}
		// If cursor data hasn't loaded yet, wait — don't mark as processed.
		const hasCursorData = cursorTelemetry.length > 0 || cursorClickTimestamps.length > 0;
		if (!hasCursorData) return;
		const newRegions = buildAutoZoomRegions([]);
		autoProcessedSourceRef.current = sourceKey;
		if (newRegions.length === 0) return;
		pushState((prev) => ({ zoomRegions: [...prev.zoomRegions, ...newRegions] }));
		toast.success("AI Auto-Zoom Generated", {
			description: `Placed ${newRegions.length} smart zoom region${newRegions.length > 1 ? "s" : ""} on timeline`,
		});
	}, [
		autoZoomEnabled,
		cursorTelemetrySourcePath,
		videoPath,
		duration,
		zoomRegions,
		buildAutoZoomRegions,
		cursorTelemetry,
		cursorClickTimestamps,
		pushState,
	]);

	// Direct manual trigger to generate AI click-zooms on timeline
	const handleGenerateAIZooms = useCallback(() => {
		const newRegions = buildAutoZoomRegions([]);
		if (newRegions.length > 0) {
			pushState((prev) => ({
				autoZoomEnabled: true,
				zoomRegions: [...prev.zoomRegions.filter((r) => r.source !== "auto"), ...newRegions],
			}));
			toast.success("AI Auto-Zoom Generated", {
				description: `Placed ${newRegions.length} click-zoom region${newRegions.length > 1 ? "s" : ""} on timeline`,
			});
		} else {
			toast.info("Auto-Zoom", {
				description: "No click events or zoom candidates found.",
			});
		}
	}, [buildAutoZoomRegions, pushState]);

	// Wand toggle: ON regenerates suggestions; OFF removes auto zooms.
	const handleToggleAutoZoom = useCallback(
		(enabled: boolean) => {
			if (enabled) {
				const sourceKey = cursorTelemetrySourcePath || videoPath || "current-source";
				autoProcessedSourceRef.current = sourceKey;
				const newRegions = buildAutoZoomRegions(zoomRegions);
				if (newRegions.length > 0) {
					pushState((prev) => ({
						autoZoomEnabled: true,
						zoomRegions: [...prev.zoomRegions, ...newRegions],
					}));
					toast.success("AI Auto-Zoom Enabled", {
						description: `Placed ${newRegions.length} click-zoom region${newRegions.length > 1 ? "s" : ""} on timeline`,
					});
				} else {
					pushState(() => ({ autoZoomEnabled: true }));
					toast.info("AI Auto-Zoom", {
						description: "Auto-zoom mode enabled.",
					});
				}
			} else {
				pushState((prev) => ({
					autoZoomEnabled: false,
					zoomRegions: prev.zoomRegions.filter((region) => region.source !== "auto"),
				}));
				toast.info("AI Auto-Zoom", {
					description: "Auto-zoom mode disabled.",
				});
			}
		},
		[pushState, buildAutoZoomRegions, cursorTelemetrySourcePath, videoPath, zoomRegions],
	);

	// Flip every zoom between auto (cursor-follow) and manual at once.
	const handleToggleAutoFocusAll = useCallback(
		(on: boolean) => {
			pushState((prev) => ({
				autoFocusAll: on,
				zoomRegions: prev.zoomRegions.map((region) => ({
					...region,
					focusMode: on ? "auto" : "manual",
				})),
			}));
		},
		[pushState],
	);

	const handleTrimAdded = useCallback(
		(span: Span) => {
			const id = `trim-${nextTrimIdRef.current++}`;
			const newRegion: TrimRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
			};
			pushState((prev) => ({ trimRegions: [...prev.trimRegions, newRegion] }));
			setSelectedTrimId(id);
			setSelectedZoomId(null);
			setSelectedSpeedId(null);
			setSelectedAnnotationId(null);
			setSelectedBlurId(null);
		},
		[pushState],
	);

	const handleZoomSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) => {
					if (region.id !== id) return region;
					const easeInMs = region.easeInMs ?? 1000;
					const easeOutMs = region.easeOutMs ?? 1000;
					const newHoldStart = Math.max(0, Math.round(span.start + easeInMs));
					const newHoldEnd = Math.max(newHoldStart + 100, Math.round(span.end - easeOutMs));
					return {
						...region,
						startMs: newHoldStart,
						endMs: newHoldEnd,
						source: "manual",
					};
				}),
			}));
		},
		[pushState],
	);

	const handleTrimSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				trimRegions: prev.trimRegions.map((region) =>
					region.id === id
						? {
								...region,
								startMs: Math.round(span.start),
								endMs: Math.round(span.end),
							}
						: region,
				),
			}));
		},
		[pushState],
	);

	// Focus drag: updateState for live preview, commitState on pointer-up.
	const handleZoomFocusChange = useCallback(
		(id: string, focus: ZoomFocus) => {
			updateState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === id
						? { ...region, focus: clampFocusToDepth(focus, region.depth), source: "manual" }
						: region,
				),
			}));
		},
		[updateState],
	);

	const handleZoomDepthChange = useCallback(
		(depth: ZoomDepth) => {
			if (!selectedZoomId) return;
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === selectedZoomId
						? {
								...region,
								depth,
								customScale: ZOOM_DEPTH_SCALES[depth],
								focus: clampFocusToDepth(region.focus, depth),
								source: "manual",
							}
						: region,
				),
			}));
		},
		[selectedZoomId, pushState],
	);

	const handleZoomCustomScaleChange = useCallback(
		(scale: number) => {
			if (!selectedZoomId) return;
			const rounded = Math.round(scale * 100) / 100;
			if (!Number.isFinite(rounded)) return;
			updateState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === selectedZoomId
						? { ...region, customScale: rounded, source: "manual" }
						: region,
				),
			}));
		},
		[selectedZoomId, updateState],
	);

	const handleZoomCustomScaleCommit = useCallback(() => {
		commitState();
	}, [commitState]);

	const handleZoomFocusModeChange = useCallback(
		(focusMode: ZoomFocusMode) => {
			if (!selectedZoomId) return;
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) =>
					region.id === selectedZoomId ? { ...region, focusMode, source: "manual" } : region,
				),
			}));
		},
		[selectedZoomId, pushState],
	);

	const handleZoomDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.filter((r) => r.id !== id),
			}));
			if (selectedZoomId === id) {
				setSelectedZoomId(null);
			}
		},
		[selectedZoomId, pushState],
	);

	const handleZoomRotationPresetChange = useCallback(
		(preset: Rotation3DPreset | null) => {
			if (!selectedZoomId) return;
			pushState((prev) => ({
				zoomRegions: prev.zoomRegions.map((region) => {
					if (region.id !== selectedZoomId) return region;
					if (preset === null) {
						const { rotationPreset: _p, ...rest } = region;
						return { ...rest, source: "manual" };
					}
					return { ...region, rotationPreset: preset, source: "manual" };
				}),
			}));
		},
		[selectedZoomId, pushState],
	);

	const handleTrimDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({
				trimRegions: prev.trimRegions.filter((r) => r.id !== id),
			}));
			if (selectedTrimId === id) {
				setSelectedTrimId(null);
			}
		},
		[selectedTrimId, pushState],
	);

	const handleSelectSpeed = useCallback((id: string | null) => {
		setSelectedSpeedId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
			setSelectedBlurId(null);
		}
	}, []);

	const handleSpeedAdded = useCallback(
		(span: Span) => {
			const id = `speed-${nextSpeedIdRef.current++}`;
			const newRegion: SpeedRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				speed: DEFAULT_PLAYBACK_SPEED,
			};
			pushState((prev) => ({
				speedRegions: [...prev.speedRegions, newRegion],
			}));
			setSelectedSpeedId(id);
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedAnnotationId(null);
			setSelectedBlurId(null);
		},
		[pushState],
	);

	const handleSpeedSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => ({
				speedRegions: prev.speedRegions.map((region) =>
					region.id === id
						? {
								...region,
								startMs: Math.round(span.start),
								endMs: Math.round(span.end),
							}
						: region,
				),
			}));
		},
		[pushState],
	);

	const handleSpeedDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({
				speedRegions: prev.speedRegions.filter((region) => region.id !== id),
			}));
			if (selectedSpeedId === id) {
				setSelectedSpeedId(null);
			}
		},
		[selectedSpeedId, pushState],
	);

	const handleSpeedChange = useCallback(
		(speed: PlaybackSpeed) => {
			if (!selectedSpeedId) return;
			pushState((prev) => ({
				speedRegions: prev.speedRegions.map((region) =>
					region.id === selectedSpeedId ? { ...region, speed } : region,
				),
			}));
		},
		[selectedSpeedId, pushState],
	);

	const handleAnnotationAdded = useCallback(
		(span: Span) => {
			const id = `annotation-${nextAnnotationIdRef.current++}`;
			const zIndex = nextAnnotationZIndexRef.current++;
			const newRegion: AnnotationRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				type: "text",
				content: "Enter text...",
				position: { ...DEFAULT_ANNOTATION_POSITION },
				size: { ...DEFAULT_ANNOTATION_SIZE },
				style: { ...DEFAULT_ANNOTATION_STYLE },
				zIndex,
			};
			pushState((prev) => ({
				annotationRegions: [...prev.annotationRegions, newRegion],
			}));
			setSelectedAnnotationId(id);
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedBlurId(null);
		},
		[pushState],
	);

	const handleBlurAdded = useCallback(
		(span: Span) => {
			const id = `annotation-${nextAnnotationIdRef.current++}`;
			const zIndex = nextAnnotationZIndexRef.current++;
			const newRegion: AnnotationRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				type: "blur",
				content: "",
				position: { ...DEFAULT_ANNOTATION_POSITION },
				size: { ...DEFAULT_ANNOTATION_SIZE },
				style: { ...DEFAULT_ANNOTATION_STYLE },
				zIndex,
				blurData: { ...DEFAULT_BLUR_DATA },
			};
			pushState((prev) => ({
				annotationRegions: [...prev.annotationRegions, newRegion],
			}));
			setSelectedBlurId(id);
			setSelectedAnnotationId(null);
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
		},
		[pushState],
	);

	const handleAnnotationSpanChange = useCallback(
		(id: string, span: Span) => {
			pushState((prev) => {
				const editedAutoCaption =
					prev.annotationRegions.find((region) => region.id === id)?.annotationSource ===
					"auto-caption";
				const next = prev.annotationRegions.map((region) =>
					region.id === id
						? {
								...region,
								startMs: Math.round(span.start),
								endMs: Math.round(span.end),
							}
						: region,
				);
				return {
					annotationRegions: editedAutoCaption ? reconcileAutoCaptionTimelineGaps(next) : next,
				};
			});
		},
		[pushState],
	);

	const handleAnnotationDuplicate = useCallback(
		(id: string) => {
			const duplicateId = `annotation-${nextAnnotationIdRef.current++}`;
			const duplicateZIndex = nextAnnotationZIndexRef.current++;
			pushState((prev) => {
				const source = prev.annotationRegions.find((region) => region.id === id);
				if (!source) return {};

				const { annotationSource: _stripCaptionLink, ...sourceWithoutCaptionLink } = source;

				const duplicate: AnnotationRegion = {
					...sourceWithoutCaptionLink,
					id: duplicateId,
					zIndex: duplicateZIndex,
					position: { x: source.position.x + 4, y: source.position.y + 4 },
					size: { ...source.size },
					style: { ...source.style },
					figureData: source.figureData ? { ...source.figureData } : undefined,
				};

				return { annotationRegions: [...prev.annotationRegions, duplicate] };
			});
			setSelectedAnnotationId(duplicateId);
			setSelectedZoomId(null);
			setSelectedTrimId(null);
			setSelectedSpeedId(null);
			setSelectedBlurId(null);
		},
		[pushState],
	);

	const handleAnnotationDelete = useCallback(
		(id: string) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.filter((r) => r.id !== id),
			}));
			if (selectedAnnotationId === id) {
				setSelectedAnnotationId(null);
			}
			if (selectedBlurId === id) {
				setSelectedBlurId(null);
			}
		},
		[selectedAnnotationId, selectedBlurId, pushState],
	);

	const handleAnnotationContentChange = useCallback(
		(id: string, content: string) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) => {
					if (region.id !== id) return region;
					if (region.type === "text") {
						return { ...region, content, textContent: content };
					} else if (region.type === "image") {
						return { ...region, content, imageContent: content };
					}
					return { ...region, content };
				}),
			}));
		},
		[pushState],
	);

	const handleAnnotationTypeChange = useCallback(
		(id: string, type: AnnotationRegion["type"]) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) => {
					if (region.id !== id) return region;
					const updatedRegion = { ...region, type };
					if (type === "text") {
						updatedRegion.content = region.textContent || "Enter text...";
					} else if (type === "image") {
						updatedRegion.content = region.imageContent || "";
					} else if (type === "figure") {
						updatedRegion.content = "";
						if (!region.figureData) {
							updatedRegion.figureData = { ...DEFAULT_FIGURE_DATA };
						}
					} else if (type === "blur") {
						updatedRegion.content = "";
						if (!region.blurData) {
							updatedRegion.blurData = { ...DEFAULT_BLUR_DATA };
						}
					}
					return updatedRegion;
				}),
			}));

			if (type === "blur" && selectedAnnotationId === id) {
				setSelectedAnnotationId(null);
				setSelectedBlurId(id);
				setSelectedSpeedId(null);
			} else if (type !== "blur" && selectedBlurId === id) {
				setSelectedBlurId(null);
				setSelectedAnnotationId(id);
			}
		},
		[pushState, selectedAnnotationId, selectedBlurId],
	);

	const handleColorFilterPresetChange = useCallback(
		(preset: ColorFilterPreset) => {
			const config = COLOR_FILTER_PRESETS.find((p) => p.id === preset);
			if (config) {
				pushState({
					colorFilterPreset: preset,
					brightness: config.brightness,
					contrast: config.contrast,
					saturation: config.saturation,
					vignette: config.vignette,
				});
			} else {
				pushState({ colorFilterPreset: preset });
			}
		},
		[pushState],
	);

	const handleAnnotationStyleChange = useCallback(
		(id: string, style: Partial<AnnotationRegion["style"]>) => {
			pushState((prev) => {
				const touched = prev.annotationRegions.find((r) => r.id === id);
				const syncAutoCaptions = touched?.annotationSource === "auto-caption";
				return {
					annotationRegions: prev.annotationRegions.map((region) => {
						if (syncAutoCaptions && region.annotationSource === "auto-caption") {
							return { ...region, style: { ...region.style, ...style } };
						}
						return region.id === id ? { ...region, style: { ...region.style, ...style } } : region;
					}),
				};
			});
		},
		[pushState],
	);

	const handleAnnotationFigureDataChange = useCallback(
		(id: string, figureData: FigureData) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id ? { ...region, figureData } : region,
				),
			}));
		},
		[pushState],
	);

	const handleBlurDataPreviewChange = useCallback(
		(id: string, blurData: BlurData) => {
			updateState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id
						? {
								...region,
								blurData,
								// Freehand drawing area is the full video surface.
								...(blurData.shape === "freehand"
									? {
											position: { x: 0, y: 0 },
											size: { width: 100, height: 100 },
										}
									: {}),
							}
						: region,
				),
			}));
		},
		[updateState],
	);

	const handleBlurDataPanelChange = useCallback(
		(id: string, blurData: BlurData) => {
			pushState((prev) => ({
				annotationRegions: prev.annotationRegions.map((region) =>
					region.id === id
						? {
								...region,
								blurData,
								...(blurData.shape === "freehand"
									? {
											position: { x: 0, y: 0 },
											size: { width: 100, height: 100 },
										}
									: {}),
							}
						: region,
				),
			}));
		},
		[pushState],
	);

	const handleAnnotationPositionChange = useCallback(
		(id: string, position: { x: number; y: number }) => {
			pushState((prev) => {
				const moved = prev.annotationRegions.find((r) => r.id === id);
				const syncAutoCaptions = moved?.annotationSource === "auto-caption";
				return {
					annotationRegions: prev.annotationRegions.map((region) => {
						if (syncAutoCaptions && region.annotationSource === "auto-caption") {
							return { ...region, position };
						}
						return region.id === id ? { ...region, position } : region;
					}),
				};
			});
		},
		[pushState],
	);

	const handleAnnotationSizeChange = useCallback(
		(id: string, size: { width: number; height: number }) => {
			pushState((prev) => {
				const resized = prev.annotationRegions.find((r) => r.id === id);
				const syncAutoCaptions = resized?.annotationSource === "auto-caption";
				return {
					annotationRegions: prev.annotationRegions.map((region) => {
						if (syncAutoCaptions && region.annotationSource === "auto-caption") {
							return { ...region, size };
						}
						return region.id === id ? { ...region, size } : region;
					}),
				};
			});
		},
		[pushState],
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const mod = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();

			if (mod && key === "z" && !e.shiftKey) {
				e.preventDefault();
				e.stopPropagation();
				undo();
				return;
			}
			if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
				e.preventDefault();
				e.stopPropagation();
				redo();
				return;
			}

			// Frame-step navigation (arrow keys, no modifiers)
			if (
				(e.key === "ArrowLeft" || e.key === "ArrowRight") &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.shiftKey &&
				!e.altKey
			) {
				const target = e.target;
				if (
					target instanceof HTMLInputElement ||
					target instanceof HTMLTextAreaElement ||
					target instanceof HTMLSelectElement ||
					(target instanceof HTMLElement &&
						(target.isContentEditable ||
							target.closest('[role="separator"], [role="slider"], [role="spinbutton"]')))
				) {
					return;
				}
				e.preventDefault();
				const video = videoPlaybackRef.current?.video;
				if (!video) {
					return;
				}
				const direction = e.key === "ArrowLeft" ? "backward" : "forward";
				const newTime = computeFrameStepTime(
					video.currentTime,
					Number.isFinite(video.duration) ? video.duration : durationRef.current,
					direction,
				);
				video.currentTime = newTime;
				return;
			}

			const isInput =
				e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

			if (e.key === "Tab" && !isInput) {
				e.preventDefault();
			}

			if (matchesShortcut(e, shortcuts.playPause, isMac)) {
				// Let space pass through inside inputs/textareas.
				if (isInput) {
					return;
				}
				e.preventDefault();
				const playback = videoPlaybackRef.current;
				if (playback?.video) {
					playback.video.paused ? playback.play().catch(console.error) : playback.pause();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
	}, [undo, redo, shortcuts, isMac]);

	useEffect(() => {
		if (selectedZoomId && !zoomRegions.some((region) => region.id === selectedZoomId)) {
			setSelectedZoomId(null);
		}
	}, [selectedZoomId, zoomRegions]);

	useEffect(() => {
		if (selectedTrimId && !trimRegions.some((region) => region.id === selectedTrimId)) {
			setSelectedTrimId(null);
		}
	}, [selectedTrimId, trimRegions]);

	useEffect(() => {
		if (
			selectedAnnotationId &&
			!annotationOnlyRegions.some((region) => region.id === selectedAnnotationId)
		) {
			setSelectedAnnotationId(null);
		}
		if (selectedBlurId && !blurRegions.some((region) => region.id === selectedBlurId)) {
			setSelectedBlurId(null);
		}
	}, [selectedAnnotationId, selectedBlurId, annotationOnlyRegions, blurRegions]);

	useEffect(() => {
		if (selectedSpeedId && !speedRegions.some((region) => region.id === selectedSpeedId)) {
			setSelectedSpeedId(null);
		}
	}, [selectedSpeedId, speedRegions]);

	const handleShowExportedFile = useCallback(async (filePath: string) => {
		try {
			const result = await window.electronAPI.revealInFolder(filePath);
			if (!result.success) {
				const errorMessage = result.error || result.message || "Failed to reveal item in folder.";
				console.error("Failed to reveal in folder:", errorMessage);
				toast.error(errorMessage);
			}
		} catch (error) {
			const errorMessage = String(error);
			console.error("Error calling revealInFolder IPC:", errorMessage);
			toast.error(`Error revealing in folder: ${errorMessage}`);
		}
	}, []);

	const handleExportSaved = useCallback(
		(formatLabel: "GIF" | "Video", filePath: string) => {
			setExportedFilePath(filePath);
			const folder = parentDirectoryOf(filePath);
			if (folder) {
				saveUserPreferences({ exportFolder: folder });
			}
			toast.success(
				t("export.exportedSuccessfully", {
					format: formatLabel,
				}),
				{
					description: filePath,
					action: {
						label: rawT("common.actions.showInFolder"),
						onClick: () => {
							void handleShowExportedFile(filePath);
						},
					},
				},
			);
		},
		[handleShowExportedFile, t, rawT],
	);

	const handleSaveUnsavedExport = useCallback(async () => {
		if (!unsavedExport) return;
		try {
			const pickResult = await window.electronAPI.pickExportSavePath(
				unsavedExport.fileName,
				getExportFolder(),
			);
			if (pickResult.canceled || !pickResult.success || !pickResult.path) {
				toast.info("Export canceled");
				return;
			}
			const saveResult = await window.electronAPI.writeExportToPath(
				unsavedExport.arrayBuffer,
				pickResult.path,
			);
			if (saveResult.success && saveResult.path) {
				setUnsavedExport(null);
				handleExportSaved(unsavedExport.format === "gif" ? "GIF" : "Video", saveResult.path);
			} else {
				toast.error(
					buildSaveDiagnosticMessage(
						unsavedExport.format === "gif" ? "GIF" : "Video",
						saveResult.message || "Failed to save export",
					),
				);
			}
		} catch (error) {
			console.error("Error saving unsaved export:", error);
			toast.error(
				buildSaveDiagnosticMessage(
					unsavedExport.format === "gif" ? "GIF" : "Video",
					error instanceof Error ? error.message : "Failed to save exported video",
				),
			);
		}
	}, [unsavedExport, handleExportSaved]);

	const handleExport = useCallback(
		async (settings: ExportSettings) => {
			if (!videoPath) {
				toast.error("No video loaded");
				return;
			}

			const video = videoPlaybackRef.current?.video;
			if (!video) {
				toast.error("Video not ready");
				return;
			}

			// Pick the save path before exporting, otherwise the save dialog can end up
			// hidden behind other windows after a long-running export.
			const isGifFormat = settings.format === "gif";
			const targetFileName = `export-${Date.now()}.${isGifFormat ? "gif" : "mp4"}`;
			const pickResult = await window.electronAPI.pickExportSavePath(
				targetFileName,
				getExportFolder(),
			);
			if (pickResult.canceled || !pickResult.success || !pickResult.path) {
				setShowExportDialog(false);
				return;
			}
			const targetPath = pickResult.path;

			setIsExporting(true);
			setExportProgress(null);
			setExportError(null);
			setExportedFilePath(null);

			try {
				const wasPlaying = isPlaying;
				if (wasPlaying) {
					videoPlaybackRef.current?.pause();
				}

				const sourceWidth = video.videoWidth || DEFAULT_SOURCE_DIMENSIONS.width;
				const sourceHeight = video.videoHeight || DEFAULT_SOURCE_DIMENSIONS.height;
				const effectiveSourceDimensions = calculateEffectiveSourceDimensions(
					sourceWidth,
					sourceHeight,
					cropRegion,
				);
				const aspectRatioValue =
					aspectRatio === "native"
						? getNativeAspectRatioValue(sourceWidth, sourceHeight, cropRegion)
						: getAspectRatioValue(aspectRatio);

				// Preview container dimensions, used for scaling.
				const playbackRef = videoPlaybackRef.current;
				const containerElement = playbackRef?.containerRef?.current;
				const previewWidth = containerElement?.clientWidth || DEFAULT_SOURCE_DIMENSIONS.width;
				const previewHeight = containerElement?.clientHeight || DEFAULT_SOURCE_DIMENSIONS.height;

				if (settings.format === "gif" && settings.gifConfig) {
					// GIF Export
					const gifExporter = new GifExporter({
						videoUrl: videoPath,
						webcamVideoUrl: webcamVideoPath || undefined,
						width: settings.gifConfig.width,
						height: settings.gifConfig.height,
						frameRate: settings.gifConfig.frameRate,
						loop: settings.gifConfig.loop,
						sizePreset: settings.gifConfig.sizePreset,
						wallpaper,
						zoomRegions,
						trimRegions,
						speedRegions,
						showShadow: shadowIntensity > 0,
						shadowIntensity,
						showBlur,
						motionBlurAmount,
						borderRadius,
						padding,
						videoPadding: padding,
						cropRegion,
						cursorRecordingData,
						cursorScale: effectiveShowCursor ? cursorSize : 0,
						cursorSmoothing,
						cursorMotionBlur,
						cursorClickBounce,
						cursorClipToBounds,
						cursorTheme,
						annotationRegions,
						webcamLayoutPreset,
						webcamMaskShape,
						webcamMirrored,
						webcamReactiveZoom,
						webcamSizePreset,
						webcamPosition,
						previewWidth,
						previewHeight,
						cursorTelemetry,
						cursorClickTimestamps,
						colorFilterPreset,
						brightness,
						contrast,
						saturation,
						vignette,
						cursorSpotlight,
						cursorSpotlightRadius,
						clickRipple,
						onProgress: (progress: ExportProgress) => {
							setExportProgress(progress);
						},
					});

					exporterRef.current = gifExporter as unknown as VideoExporter;
					const result = await gifExporter.export();

					if (result.success && result.blob) {
						const arrayBuffer = await result.blob.arrayBuffer();

						if (result.warnings) {
							for (const warning of result.warnings) {
								toast.warning(warning);
							}
						}

						const saveResult = await window.electronAPI.writeExportToPath(arrayBuffer, targetPath);

						if (saveResult.success && saveResult.path) {
							setUnsavedExport(null);
							handleExportSaved("GIF", saveResult.path);
						} else {
							setUnsavedExport({ arrayBuffer, fileName: targetFileName, format: "gif" });
							const message = buildSaveDiagnosticMessage(
								"GIF",
								saveResult.message || "Failed to save GIF",
							);
							setExportError(message);
							toast.error(message);
						}
					} else {
						const message = buildExportDiagnosticMessage({
							formatLabel: "GIF",
							reason: result.error || "GIF export failed",
							sourcePath: videoSourcePath ?? videoPath,
							width: settings.gifConfig.width,
							height: settings.gifConfig.height,
							frameRate: settings.gifConfig.frameRate,
						});
						setExportError(message);
						toast.error(message);
					}
				} else {
					// MP4 Export
					const quality = settings.quality || exportQuality;
					const {
						width: exportWidth,
						height: exportHeight,
						bitrate,
					} = calculateMp4ExportSettings({
						quality,
						sourceWidth: effectiveSourceDimensions.width,
						sourceHeight: effectiveSourceDimensions.height,
						aspectRatioValue,
					});

					const exporter = new VideoExporter({
						videoUrl: videoPath,
						webcamVideoUrl: webcamVideoPath || undefined,
						width: exportWidth,
						height: exportHeight,
						frameRate: 60,
						bitrate,
						codec: "avc1.640033",
						wallpaper,
						zoomRegions,
						trimRegions,
						speedRegions,
						showShadow: shadowIntensity > 0,
						shadowIntensity,
						showBlur,
						motionBlurAmount,
						borderRadius,
						padding,
						cropRegion,
						cursorRecordingData,
						cursorScale: effectiveShowCursor ? cursorSize : 0,
						cursorSmoothing,
						cursorMotionBlur,
						cursorClickBounce,
						cursorClipToBounds,
						cursorTheme,
						annotationRegions,
						webcamLayoutPreset,
						webcamMaskShape,
						webcamMirrored,
						webcamReactiveZoom,
						webcamSizePreset,
						webcamPosition,
						previewWidth,
						previewHeight,
						cursorTelemetry,
						cursorClickTimestamps,
						colorFilterPreset,
						brightness,
						contrast,
						saturation,
						vignette,
						cursorSpotlight,
						cursorSpotlightRadius,
						clickRipple,
						onProgress: (progress: ExportProgress) => {
							setExportProgress(progress);
						},
					});

					exporterRef.current = exporter;
					const result = await exporter.export();

					if (result.success && result.blob) {
						const arrayBuffer = await result.blob.arrayBuffer();

						if (result.warnings) {
							for (const warning of result.warnings) {
								toast.warning(warning);
							}
						}

						const saveResult = await window.electronAPI.writeExportToPath(arrayBuffer, targetPath);

						if (saveResult.success && saveResult.path) {
							setUnsavedExport(null);
							handleExportSaved("Video", saveResult.path);
						} else {
							setUnsavedExport({ arrayBuffer, fileName: targetFileName, format: "mp4" });
							const message = buildSaveDiagnosticMessage(
								"Video",
								saveResult.message || "Failed to save video",
							);
							setExportError(message);
							toast.error(message);
						}
					} else {
						const message = buildExportDiagnosticMessage({
							formatLabel: "Video",
							reason: result.error || "Export failed",
							sourcePath: videoSourcePath ?? videoPath,
							width: exportWidth,
							height: exportHeight,
							frameRate: 60,
							codec: "avc1.640033",
							bitrate,
						});
						setExportError(message);
						toast.error(message);
					}
				}

				if (wasPlaying) {
					videoPlaybackRef.current?.play();
				}
			} catch (error) {
				console.error("Export error:", error);
				if (error instanceof BackgroundLoadError) {
					const message = t("errors.exportBackgroundLoadFailed", { url: error.displayUrl });
					setExportError(message);
					toast.error(message);
				} else {
					const errorMessage = error instanceof Error ? error.message : "Unknown error";
					const message = buildExportDiagnosticMessage({
						formatLabel: settings.format === "gif" ? "GIF" : "Video",
						reason: errorMessage,
						sourcePath: videoSourcePath ?? videoPath,
					});
					setExportError(message);
					toast.error(t("errors.exportFailedWithError", { error: message }));
				}
			} finally {
				setIsExporting(false);
				exporterRef.current = null;
				// Reset so the next export can reopen the dialog (second export
				// otherwise wouldn't show the save dialog).
				setShowExportDialog(false);
				setExportProgress(null);
			}
		},
		[
			videoPath,
			videoSourcePath,
			webcamVideoPath,
			wallpaper,
			zoomRegions,
			trimRegions,
			speedRegions,
			shadowIntensity,
			showBlur,
			motionBlurAmount,
			borderRadius,
			padding,
			cropRegion,
			cursorRecordingData,
			annotationRegions,
			isPlaying,
			aspectRatio,
			webcamLayoutPreset,
			webcamMaskShape,
			webcamMirrored,
			webcamReactiveZoom,
			webcamSizePreset,
			webcamPosition,
			exportQuality,
			handleExportSaved,
			cursorTelemetry,
			cursorClickTimestamps,
			effectiveShowCursor,
			cursorSize,
			cursorSmoothing,
			cursorMotionBlur,
			cursorClickBounce,
			cursorClipToBounds,
			cursorTheme,
			colorFilterPreset,
			brightness,
			contrast,
			saturation,
			vignette,
			cursorSpotlight,
			cursorSpotlightRadius,
			clickRipple,
			t,
		],
	);

	const handleOpenExportDialog = useCallback(() => {
		if (!videoPath) {
			toast.error("No video loaded");
			return;
		}

		const video = videoPlaybackRef.current?.video;
		if (!video) {
			toast.error("Video not ready");
			return;
		}

		// Build export settings from current state
		const sourceWidth = video.videoWidth || DEFAULT_SOURCE_DIMENSIONS.width;
		const sourceHeight = video.videoHeight || DEFAULT_SOURCE_DIMENSIONS.height;
		const effectiveSourceDimensions = calculateEffectiveSourceDimensions(
			sourceWidth,
			sourceHeight,
			cropRegion,
		);
		const aspectRatioValue =
			aspectRatio === "native"
				? getNativeAspectRatioValue(sourceWidth, sourceHeight, cropRegion)
				: getAspectRatioValue(aspectRatio);
		const gifDimensions = calculateOutputDimensions(
			effectiveSourceDimensions.width,
			effectiveSourceDimensions.height,
			gifSizePreset,
			GIF_SIZE_PRESETS,
			aspectRatioValue,
		);

		const settings: ExportSettings = {
			format: exportFormat,
			quality: exportFormat === "mp4" ? exportQuality : undefined,
			gifConfig:
				exportFormat === "gif"
					? {
							frameRate: gifFrameRate,
							loop: gifLoop,
							sizePreset: gifSizePreset,
							width: gifDimensions.width,
							height: gifDimensions.height,
						}
					: undefined,
		};

		setShowExportDialog(true);
		setExportError(null);
		setExportedFilePath(null);

		// Start export immediately
		handleExport(settings);
	}, [
		videoPath,
		exportFormat,
		exportQuality,
		gifFrameRate,
		gifLoop,
		gifSizePreset,
		aspectRatio,
		cropRegion,
		handleExport,
	]);

	const handleCancelExport = useCallback(() => {
		if (exporterRef.current) {
			exporterRef.current.cancel();
			toast.info("Export canceled");
			setShowExportDialog(false);
			setIsExporting(false);
			setExportProgress(null);
			setExportError(null);
			setExportedFilePath(null);
		}
	}, []);

	const generateAutoCaptions = useCallback(
		async (minWords: number, maxWords: number) => {
			if (!videoPath) {
				toast.error(t("errors.noVideoLoaded"));
				return;
			}
			if (isAutoCaptioningRef.current) {
				toast.error(t("autoCaptions.busy"));
				return;
			}
			const minW = Math.max(1, Math.min(minWords, maxWords));
			const maxW = Math.max(minW, maxWords);

			isAutoCaptioningRef.current = true;
			setIsAutoCaptioning(true);
			toast.loading(t("autoCaptions.generating"), { id: AUTO_CAPTION_PROGRESS_TOAST_ID });
			try {
				const { samples, truncated, durationSec } = await extractMono16kFromVideoUrl(videoPath);
				if (!Number.isFinite(durationSec) || durationSec <= 0 || samples.length < 800) {
					toast.dismiss(AUTO_CAPTION_PROGRESS_TOAST_ID);
					toast.error(t("autoCaptions.noAudio"));
					return;
				}

				const { samples: speechSamples, trimSec } = trimLeadingSilenceMono16k(samples);
				if (speechSamples.length < 800) {
					toast.dismiss(AUTO_CAPTION_PROGRESS_TOAST_ID);
					toast.error(t("autoCaptions.noAudio"));
					return;
				}

				const trimMs = Math.round(trimSec * 1000);
				const trimRegionsForTranscribe = shiftTrimRegionsMsForCaptionBuffer(trimRegions, trimMs);

				const transcribeOptions = {
					onStatus: (phase: "model" | "transcribe") => {
						if (phase === "model") {
							toast.loading(t("autoCaptions.loadingModel"), {
								id: AUTO_CAPTION_PROGRESS_TOAST_ID,
							});
						} else {
							toast.loading(t("autoCaptions.transcribing"), {
								id: AUTO_CAPTION_PROGRESS_TOAST_ID,
							});
						}
					},
				};

				let { segments: segmentsRaw, granularity } = await transcribeMono16kToSegments(
					speechSamples,
					{
						trimRegions: trimRegionsForTranscribe,
						...transcribeOptions,
					},
				);
				let transcribedFromTrimmedBuffer = true;

				// Leading-silence trimming can return empty even when the full source has
				// speech. Retry once against the untrimmed buffer before giving up.
				if (segmentsRaw.length === 0 && trimSec > 0) {
					({ segments: segmentsRaw, granularity } = await transcribeMono16kToSegments(samples, {
						trimRegions,
						...transcribeOptions,
					}));
					transcribedFromTrimmedBuffer = false;
				}

				const segments =
					transcribedFromTrimmedBuffer && trimSec > 0
						? segmentsRaw.map((s) => ({
								...s,
								startSec: s.startSec + trimSec,
								endSec: s.endSec + trimSec,
							}))
						: segmentsRaw;

				let { regions, nextNumericId, nextZIndex } = captionSegmentsToAnnotationRegions(
					segments,
					nextAnnotationIdRef.current,
					nextAnnotationZIndexRef.current,
					{
						minWordsPerCaption: minW,
						maxWordsPerCaption: maxW,
						timestampGranularity: granularity,
					},
				);

				if (regions.length === 0 && segments.length > 0) {
					({ regions, nextNumericId, nextZIndex } = captionSegmentsToAnnotationRegions(
						segments,
						nextAnnotationIdRef.current,
						nextAnnotationZIndexRef.current,
						{
							minWordsPerCaption: 1,
							maxWordsPerCaption: Number.MAX_SAFE_INTEGER,
							timestampGranularity: granularity,
						},
					));
				}

				if (regions.length === 0) {
					toast.dismiss(AUTO_CAPTION_PROGRESS_TOAST_ID);
					toast.info(t("autoCaptions.noneHeard"));
					return;
				}

				pushState((prev) => ({ annotationRegions: [...prev.annotationRegions, ...regions] }));
				nextAnnotationIdRef.current = nextNumericId;
				nextAnnotationZIndexRef.current = nextZIndex;

				toast.dismiss(AUTO_CAPTION_PROGRESS_TOAST_ID);
				const minutesTrunc = String(Math.round(MAX_CAPTION_AUDIO_SEC / 60));
				if (truncated) {
					toast.success(t("autoCaptions.done", { count: String(regions.length) }), {
						description: t("autoCaptions.truncated", { minutes: minutesTrunc }),
					});
				} else {
					toast.success(t("autoCaptions.done", { count: String(regions.length) }));
				}
			} catch (e) {
				console.error(e);
				toast.dismiss(AUTO_CAPTION_PROGRESS_TOAST_ID);
				const detail = e instanceof Error ? e.message : String(e);
				toast.error(t("autoCaptions.failed"), { description: detail });
			} finally {
				isAutoCaptioningRef.current = false;
				setIsAutoCaptioning(false);
			}
		},
		[videoPath, trimRegions, pushState, t],
	);

	const handleSaveDiagnostic = useCallback(async () => {
		const result = await window.electronAPI.saveDiagnostic({
			error: exportError ?? "Manual diagnostic export",
			projectState: editorState,
			logs: [],
		});
		if (result.success) {
			toast.success("Diagnostic file saved");
		} else if (!result.canceled) {
			toast.error("Failed to save diagnostic file");
		}
	}, [exportError, editorState]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="text-foreground">{t("loadingVideo")}</div>
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="text-destructive">{error}</div>
					<button
						type="button"
						onClick={handleLoadProject}
						className="px-4 py-2 rounded-full bg-[#e8ff47] hover:bg-[#d9ff00] text-black text-xs font-extrabold cursor-pointer active:scale-95 transition-all"
					>
						{ts("project.load")}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`flex flex-col h-screen overflow-hidden selection:bg-white/20 transition-colors duration-200 ${
				isLight ? "bg-[#f8f9fa] text-slate-900" : "bg-[#09090b] text-slate-200"
			}`}
		>
			<Dialog open={showNewRecordingDialog} onOpenChange={setShowNewRecordingDialog}>
				<DialogContent
					className={`sm:max-w-[425px] rounded-3xl p-6 gap-0 shadow-2xl transition-colors duration-200 ${
						isLight
							? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
							: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
					}`}
					style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
				>
					<DialogHeader className="mb-4">
						<DialogTitle
							className={`text-base font-extrabold leading-tight ${isLight ? "text-[#18181b]" : "text-[#e8e8e8]"}`}
						>
							{t("newRecording.title")}
						</DialogTitle>
						<DialogDescription className="text-xs text-[#888888] leading-relaxed">
							{t("newRecording.description")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex gap-2 sm:justify-end mt-4">
						<button
							type="button"
							onClick={() => setShowNewRecordingDialog(false)}
							className={`px-4 py-2 rounded-full font-bold text-xs transition-all cursor-pointer outline-none ${
								isLight
									? "bg-[#f4f4f5] hover:bg-[#e4e4e7] border border-[#e4e4e7] text-[#18181b]"
									: "bg-[#141414] hover:bg-[#202020] border border-[#252525] text-[#e8e8e8]"
							}`}
						>
							{t("newRecording.cancel")}
						</button>
						<button
							type="button"
							onClick={handleNewRecordingConfirm}
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							className="px-5 py-2 rounded-full text-xs font-extrabold cursor-pointer active:scale-95 transition-all hover:opacity-90 shadow-md outline-none"
						>
							{t("newRecording.confirm")}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={showAutoCaptionsDialog} onOpenChange={setShowAutoCaptionsDialog}>
				<DialogContent
					className={`sm:max-w-md rounded-3xl p-6 gap-0 shadow-2xl transition-colors duration-200 ${
						isLight
							? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
							: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
					}`}
					style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
				>
					<DialogHeader className="mb-4">
						<DialogTitle
							className={`text-base font-extrabold leading-tight ${isLight ? "text-[#18181b]" : "text-[#e8e8e8]"}`}
						>
							{t("autoCaptions.dialogTitle")}
						</DialogTitle>
						<DialogDescription className="text-xs text-[#888888] leading-relaxed">
							{t("autoCaptions.dialogDescription")}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="grid gap-2">
							<Label htmlFor="caption-min-words" className="text-xs font-semibold">
								{t("autoCaptions.minWords")}
							</Label>
							<Select
								value={String(captionWordsMin)}
								onValueChange={(v) => {
									const n = Number.parseInt(v, 10);
									setCaptionWordsMin(n);
									if (n > captionWordsMax) setCaptionWordsMax(n);
								}}
							>
								<SelectTrigger
									id="caption-min-words"
									className={`h-9 text-xs rounded-xl ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]" : "bg-[#141414] border-[#252525] text-[#e8e8e8]"}`}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent
									className={
										isLight
											? "bg-white border-[#e4e4e7] text-[#18181b]"
											: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
									}
								>
									{CAPTION_WORD_CHOICES.map((n) => (
										<SelectItem key={`min-${n}`} value={String(n)}>
											{t("autoCaptions.wordsCount", { count: String(n) })}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="caption-max-words" className="text-xs font-semibold">
								{t("autoCaptions.maxWords")}
							</Label>
							<Select
								value={String(captionWordsMax)}
								onValueChange={(v) => {
									const n = Number.parseInt(v, 10);
									setCaptionWordsMax(n);
									if (n < captionWordsMin) setCaptionWordsMin(n);
								}}
							>
								<SelectTrigger
									id="caption-max-words"
									className={`h-9 text-xs rounded-xl ${isLight ? "bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]" : "bg-[#141414] border-[#252525] text-[#e8e8e8]"}`}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent
									className={
										isLight
											? "bg-white border-[#e4e4e7] text-[#18181b]"
											: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
									}
								>
									{CAPTION_WORD_CHOICES.map((n) => (
										<SelectItem key={`max-${n}`} value={String(n)}>
											{t("autoCaptions.wordsCount", { count: String(n) })}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter className="gap-2 sm:gap-0 mt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowAutoCaptionsDialog(false)}
							className={`rounded-full px-4 text-xs font-semibold ${isLight ? "border-[#e4e4e7] bg-[#f4f4f5] text-[#18181b] hover:bg-[#e4e4e7]" : "border-[#252525] bg-[#141414] text-[#e8e8e8] hover:bg-[#202020]"}`}
						>
							{t("autoCaptions.dialogCancel")}
						</Button>
						<Button
							type="button"
							disabled={isAutoCaptioning}
							onClick={() => {
								setShowAutoCaptionsDialog(false);
								void generateAutoCaptions(captionWordsMin, captionWordsMax);
							}}
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							className="font-extrabold rounded-full px-5 cursor-pointer active:scale-95 transition-all hover:opacity-90 shadow-md"
						>
							{t("autoCaptions.generate")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div
				className={`h-11 flex-shrink-0 border-b flex items-center justify-between px-3.5 z-50 backdrop-blur-xl transition-colors duration-200 select-none ${
					isLight
						? "bg-white/80 border-zinc-200 text-zinc-900"
						: "bg-[#090a0e]/85 border-white/[0.07] text-zinc-100"
				}`}
				style={{ WebkitAppRegion: "drag" } as CSSProperties}
			>
				{/* Brand Lockup (Left) */}
				<div
					className={`flex items-center gap-2.5 ${isMac ? "ml-16" : "ml-0.5"}`}
					style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
				>
					<div className="flex items-center gap-2">
						<div
							className="flex h-6 w-6 items-center justify-center rounded-lg shadow-sm"
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						>
							<Video size={13} className="stroke-[2.5]" />
						</div>
						<div className="flex items-center gap-1.5">
							<span
								className={`text-xs font-black tracking-tight ${
									isLight ? "text-zinc-950" : "text-white"
								}`}
							>
								ocal screen
							</span>
							<span
								className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md border ${
									isLight
										? "bg-zinc-100 border-zinc-200 text-zinc-600"
										: "bg-white/[0.06] border-white/[0.08] text-zinc-400"
								}`}
							>
								STUDIO
							</span>
						</div>
					</div>

					{/* Active Project Breadcrumb when video is loaded */}
					{videoPath && (
						<div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
							<span
								className={`text-xs font-semibold truncate max-w-[220px] ${
									isLight ? "text-zinc-600" : "text-zinc-400"
								}`}
								title={currentProjectPath || videoSourcePath || ""}
							>
								{(currentProjectPath || videoSourcePath || "").split(/[\\/]/).pop()}
							</span>
						</div>
					)}
				</div>

				{/* Actions & Controls (Right) */}
				<div
					className={`flex items-center gap-2 ${isWin ? "mr-36" : ""}`}
					style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
				>
					{/* Quick Project Actions Group */}
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setShowNewRecordingDialog(true)}
							title={t("newRecording.title") || "Return to Recorder"}
							className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
								isLight
									? "border-zinc-200 bg-zinc-100/80 hover:bg-zinc-200 text-zinc-900"
									: "border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white"
							}`}
						>
							<Video size={12} style={{ color: activeAccent.hex }} />
							<span className="hidden sm:inline">Recorder</span>
						</button>

						<button
							type="button"
							onClick={handleLoadProject}
							title={ts("project.load") || "Load Project"}
							className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
								isLight
									? "border-zinc-200 bg-zinc-100/80 hover:bg-zinc-200 text-zinc-900"
									: "border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white"
							}`}
						>
							<FolderOpen size={12} />
							<span className="hidden sm:inline">Open</span>
						</button>

						{videoPath && (
							<button
								type="button"
								onClick={handleSaveProject}
								title={ts("project.save") || "Save Project"}
								className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
									isLight
										? "border-zinc-200 bg-zinc-100/80 hover:bg-zinc-200 text-zinc-900"
										: "border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white"
								}`}
							>
								<Save size={12} />
								<span>Save</span>
							</button>
						)}
					</div>

					{/* Layout Switcher (Visible only when video is loaded) */}
					{videoPath && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									title={`Layout Mode: ${
										layoutMode === "auto"
											? `Auto (${effectiveIsPortraitLayout ? "Portrait Pro" : "Standard"})`
											: layoutMode === "portrait-pro"
												? "Portrait Pro (Max View)"
												: "Standard"
									}`}
									className={cn(
										"flex h-7 items-center gap-1.5 px-2 rounded-lg border transition-all cursor-pointer text-xs font-semibold outline-none",
										effectiveIsPortraitLayout
											? isLight
												? "border-amber-300 bg-amber-50 text-amber-900"
												: "border-amber-500/30 bg-amber-500/10 text-amber-300"
											: isLight
												? "border-zinc-200 bg-zinc-100/80 text-zinc-900 hover:bg-zinc-200"
												: "border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]",
									)}
								>
									{effectiveIsPortraitLayout ? (
										<Columns2 size={12} style={{ color: activeAccent.hex }} />
									) : (
										<Rows3 size={12} style={{ color: activeAccent.hex }} />
									)}
									<span className="text-[11px] font-bold">
										{layoutMode === "auto"
											? effectiveIsPortraitLayout
												? "Portrait"
												: "Standard"
											: layoutMode === "portrait-pro"
												? "Portrait"
												: "Standard"}
									</span>
									<ChevronDown size={10} className="opacity-60" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className={cn(
									"min-w-[210px] rounded-2xl p-1.5 border z-50 transition-all",
									isLight
										? "bg-white border-zinc-200 text-zinc-900"
										: "bg-[#0e0f14] border-white/10 text-zinc-100",
								)}
							>
								<DropdownMenuItem
									onClick={() => setLayoutMode("auto")}
									className={cn(
										"flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all my-0.5",
										layoutMode === "auto" &&
											(isLight ? "bg-zinc-100 font-bold" : "bg-white/10 font-bold"),
									)}
								>
									<div className="flex items-center gap-2">
										<LayoutGrid size={13} style={{ color: activeAccent.hex }} />
										<span>Auto ({isPortrait ? "Portrait Pro" : "Standard"})</span>
									</div>
									{layoutMode === "auto" && <Check size={13} style={{ color: activeAccent.hex }} />}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setLayoutMode("portrait-pro")}
									className={cn(
										"flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all my-0.5",
										layoutMode === "portrait-pro" &&
											(isLight ? "bg-zinc-100 font-bold" : "bg-white/10 font-bold"),
									)}
								>
									<div className="flex items-center gap-2">
										<Columns2 size={13} style={{ color: activeAccent.hex }} />
										<span>Portrait Pro (Max View)</span>
									</div>
									{layoutMode === "portrait-pro" && (
										<Check size={13} style={{ color: activeAccent.hex }} />
									)}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setLayoutMode("landscape-stack")}
									className={cn(
										"flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all my-0.5",
										layoutMode === "landscape-stack" &&
											(isLight ? "bg-zinc-100 font-bold" : "bg-white/10 font-bold"),
									)}
								>
									<div className="flex items-center gap-2">
										<Rows3 size={13} style={{ color: activeAccent.hex }} />
										<span>Standard Stacked</span>
									</div>
									{layoutMode === "landscape-stack" && (
										<Check size={13} style={{ color: activeAccent.hex }} />
									)}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}

					{/* Divider */}
					<div className={`h-4 w-[1px] ${isLight ? "bg-zinc-200" : "bg-white/10"}`} />

					{/* Unified Utility Controls Group */}
					<div
						className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
							isLight ? "border-zinc-200 bg-zinc-100/80" : "border-white/[0.08] bg-black/30"
						}`}
					>
						{/* Theme Mode Toggle (Sun / Moon) */}
						<button
							type="button"
							onClick={toggleThemeMode}
							title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
							className={`flex h-6.5 w-6.5 items-center justify-center rounded-md transition-all cursor-pointer ${
								isLight
									? "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
									: "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
							}`}
						>
							{isLight ? <Moon size={12} /> : <Sun size={12} style={{ color: activeAccent.hex }} />}
						</button>

						{/* Accent Color Picker Popover */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setShowAccentPicker((prev) => !prev)}
								title="Select Accent Color"
								className={`flex h-6.5 items-center gap-1.5 px-2 rounded-md transition-all cursor-pointer ${
									isLight
										? "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
										: "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
								}`}
							>
								<div
									className="h-2 w-2 rounded-full"
									style={{ backgroundColor: activeAccent.hex }}
								/>
								<span className="text-[9.5px] font-bold uppercase tracking-wider">
									{accentColor}
								</span>
							</button>

							{showAccentPicker && (
								<div
									className={`absolute right-0 top-8 z-50 flex items-center gap-1.5 p-2 rounded-2xl border shadow-xl ${
										isLight ? "bg-white border-zinc-200" : "bg-[#0e0f14] border-white/10"
									}`}
								>
									{(Object.keys(ACCENT_COLOR_MAP) as AccentColor[]).map((colKey) => {
										const colData = ACCENT_COLOR_MAP[colKey];
										const isSelected = accentColor === colKey;
										return (
											<button
												key={colKey}
												type="button"
												onClick={() => selectAccentColor(colKey)}
												title={colData.label}
												className={`h-5.5 w-5.5 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
													isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0c0c]" : ""
												}`}
												style={{ backgroundColor: colData.hex }}
											>
												{isSelected && <Check size={10} style={{ color: colData.textHex }} />}
											</button>
										);
									})}
								</div>
							)}
						</div>

						{/* Settings Button */}
						<button
							type="button"
							onClick={() => setShowSettingsDialog(true)}
							title="Studio Settings"
							className={`flex h-6.5 w-6.5 items-center justify-center rounded-md transition-all cursor-pointer ${
								isLight
									? "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
									: "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
							}`}
						>
							<Settings size={12} />
						</button>
					</div>

					{/* User Profile Badge */}
					<div
						className={`flex h-7 items-center gap-1.5 px-2 rounded-lg border transition-all ${
							isLight
								? "border-zinc-200 bg-zinc-100/80 text-zinc-900"
								: "border-white/[0.08] bg-white/[0.04] text-zinc-200"
						}`}
					>
						<div
							className="flex h-4 w-4 items-center justify-center rounded-full font-black text-[8.5px]"
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						>
							{userName[0]?.toUpperCase() || "U"}
						</div>
						<span className="text-[11px] font-bold truncate max-w-[70px]">{userName}</span>
					</div>

					{/* Language Selector Custom Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className={cn(
									"flex items-center gap-1 h-7 px-2 rounded-lg border transition-all text-[11px] font-semibold cursor-pointer outline-none active:scale-95",
									isLight
										? "border-zinc-200 bg-zinc-100/80 text-zinc-900 hover:bg-zinc-200"
										: "border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white",
								)}
							>
								<Languages size={12} className="text-zinc-400" />
								<span>{getLocaleName(locale)}</span>
								<ChevronDown size={10} className="opacity-60" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className={cn(
								"min-w-[180px] max-h-[290px] overflow-y-auto custom-scrollbar rounded-2xl p-1.5 border z-50 backdrop-blur-3xl shadow-2xl transition-all",
								isLight
									? "bg-white/95 border-zinc-200/80 text-zinc-900 shadow-zinc-900/10"
									: "bg-[#0c0d12]/95 border-white/10 text-zinc-100 shadow-2xl shadow-black/80",
							)}
						>
							{availableLocales.map((loc) => {
								const isSelected = loc === locale;
								return (
									<DropdownMenuItem
										key={loc}
										onClick={() => setLocale(loc)}
										className={cn(
											"flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all my-0.5",
											isSelected
												? isLight
													? "bg-zinc-100 font-bold"
													: "bg-white/10 font-bold"
												: isLight
													? "hover:bg-zinc-50"
													: "hover:bg-white/5",
										)}
										style={{ color: isSelected ? activeAccent.hex : undefined }}
									>
										<span>{getLocaleName(loc)}</span>
										{isSelected && <Check size={12} style={{ color: activeAccent.hex }} />}
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Empty state shown when no video is loaded */}
			{!videoPath && (
				<div className="flex-1 min-h-0 relative">
					<EditorEmptyState
						themeMode={themeMode}
						accentColor={accentColor}
						userName={userName}
						onVideoImported={(path) => {
							setVideoPath(toFileUrl(path));
							setVideoSourcePath(path);
							setWebcamVideoPath(null);
							setWebcamVideoSourcePath(null);
						}}
						onProjectOpened={async (project, path) => {
							const restored = await applyLoadedProject(project, path);
							if (!restored) {
								toast.error(t("project.invalidFormat"));
							}
						}}
						onStartRecording={() => {
							window.electronAPI.startNewRecording();
						}}
					/>
				</div>
			)}

			{videoPath && (
				<div className="editor-workspace flex-1 min-h-0 relative">
					{effectiveIsPortraitLayout ? (
						/* Portrait Pro Mode: Left Full-Height Maximized Video Preview, Right Stacked Inspector & Timeline */
						<PanelGroup direction="horizontal" className="gap-3 min-h-0">
							{/* Left: Full Height 9:16 Portrait Preview Deck (Maximum Viewable Height) */}
							<Panel defaultSize={42} minSize={26} maxSize={65} className="min-w-[300px]">
								<div
									ref={playerContainerRef}
									className={
										isFullscreen
											? "fixed inset-0 z-[99999] w-full h-full flex flex-col items-center justify-center bg-[#09090b]"
											: `editor-preview-panel w-full h-full flex flex-col items-center justify-between overflow-hidden relative transition-colors ${
													isLight ? "bg-[#f4f4f5]" : "bg-[#08080a]"
												}`
									}
								>
									{/* Video preview: takes maximum vertical space */}
									<div className="w-full min-h-0 flex justify-center items-center flex-1 p-3 md:p-4">
										<div
											className="relative flex justify-center items-center w-auto h-full max-w-full box-border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-white/10"
											style={{
												aspectRatio:
													aspectRatio === "native"
														? getNativeAspectRatioValue(
																videoPlaybackRef.current?.video?.videoWidth ||
																	DEFAULT_SOURCE_DIMENSIONS.width,
																videoPlaybackRef.current?.video?.videoHeight ||
																	DEFAULT_SOURCE_DIMENSIONS.height,
																cropRegion,
															)
														: getAspectRatioValue(aspectRatio),
											}}
										>
											<VideoPlayback
												key={`${videoPath || "no-video"}:${webcamVideoPath || "no-webcam"}`}
												aspectRatio={aspectRatio}
												ref={videoPlaybackRef}
												videoPath={videoPath || ""}
												webcamVideoPath={webcamVideoPath || undefined}
												webcamLayoutPreset={webcamLayoutPreset}
												webcamMaskShape={webcamMaskShape}
												webcamMirrored={webcamMirrored}
												webcamReactiveZoom={webcamReactiveZoom}
												webcamSizePreset={webcamSizePreset}
												webcamPosition={webcamPosition}
												onWebcamPositionChange={(pos) => updateState({ webcamPosition: pos })}
												onWebcamPositionDragEnd={commitState}
												onDurationChange={setDuration}
												onTimeUpdate={setCurrentTime}
												currentTime={currentTime}
												onPlayStateChange={setIsPlaying}
												onError={setError}
												wallpaper={wallpaper}
												zoomRegions={zoomRegions}
												selectedZoomId={selectedZoomId}
												onSelectZoom={handleSelectZoom}
												onZoomFocusChange={handleZoomFocusChange}
												onZoomFocusDragEnd={commitState}
												isPlaying={isPlaying}
												showShadow={shadowIntensity > 0}
												shadowIntensity={shadowIntensity}
												showBlur={showBlur}
												motionBlurAmount={motionBlurAmount}
												borderRadius={borderRadius}
												padding={padding}
												cropRegion={cropRegion}
												cursorRecordingData={cursorRecordingData}
												trimRegions={trimRegions}
												speedRegions={speedRegions}
												annotationRegions={annotationOnlyRegions}
												selectedAnnotationId={selectedAnnotationId}
												onSelectAnnotation={handleSelectAnnotation}
												onAnnotationPositionChange={handleAnnotationPositionChange}
												onAnnotationSizeChange={handleAnnotationSizeChange}
												blurRegions={blurRegions}
												selectedBlurId={selectedBlurId}
												onSelectBlur={handleSelectBlur}
												onBlurPositionChange={handleAnnotationPositionChange}
												onBlurSizeChange={handleAnnotationSizeChange}
												onBlurDataChange={handleBlurDataPreviewChange}
												onBlurDataCommit={commitState}
												cursorTelemetry={cursorTelemetry}
												cursorClickTimestamps={cursorClickTimestamps}
												showCursor={effectiveShowCursor}
												cursorSize={cursorSize}
												cursorSmoothing={cursorSmoothing}
												cursorMotionBlur={cursorMotionBlur}
												cursorClickBounce={cursorClickBounce}
												cursorClipToBounds={cursorClipToBounds}
												cursorTheme={cursorTheme}
												colorFilterPreset={colorFilterPreset}
												brightness={brightness}
												contrast={contrast}
												saturation={saturation}
												vignette={vignette}
												cursorSpotlight={cursorSpotlight}
												cursorSpotlightRadius={cursorSpotlightRadius}
												clickRipple={clickRipple}
												isPreviewingZoom={isPreviewingZoom}
											/>
										</div>
									</div>

									{/* Playback controls */}
									<div className="w-full flex justify-center items-center h-14 flex-shrink-0 px-4 py-2 border-t border-white/[0.06]">
										<div className="w-full max-w-[600px]">
											<PlaybackControls
												isPlaying={isPlaying}
												currentTime={currentTime}
												duration={duration}
												isFullscreen={isFullscreen}
												onToggleFullscreen={toggleFullscreen}
												onTogglePlayPause={togglePlayPause}
												onSeek={handleSeek}
											/>
										</div>
									</div>
								</div>
							</Panel>

							<PanelResizeHandle className="group cursor-col-resize px-1 flex items-center justify-center">
								<div
									className="w-1 h-12 bg-white/20 rounded-full transition-all group-hover:scale-y-125"
									style={{ backgroundColor: isLight ? "rgba(0,0,0,0.15)" : undefined }}
								/>
							</PanelResizeHandle>

							{/* Right: Stacked Settings Inspector & Timeline */}
							<Panel defaultSize={58} minSize={35} className="min-w-[380px]">
								<PanelGroup direction="vertical" className="gap-3 min-h-0">
									{/* Top Right: Settings & Inspector Panel */}
									<Panel defaultSize={52} minSize={28} maxSize={72} className="min-h-[220px]">
										<div className="editor-inspector-shell min-w-0 h-full overflow-hidden">
											<SettingsPanel
												selected={wallpaper}
												onWallpaperChange={(w) => pushState({ wallpaper: w })}
												selectedZoomDepth={
													selectedZoomId
														? zoomRegions.find((z) => z.id === selectedZoomId)?.depth
														: null
												}
												onZoomDepthChange={(depth) =>
													selectedZoomId && handleZoomDepthChange(depth)
												}
												selectedZoomCustomScale={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.customScale ??
															null)
														: null
												}
												onZoomCustomScaleChange={handleZoomCustomScaleChange}
												onZoomCustomScaleCommit={handleZoomCustomScaleCommit}
												onZoomPreviewStart={() => setIsPreviewingZoom(true)}
												onZoomPreviewEnd={() => setIsPreviewingZoom(false)}
												selectedZoomFocusMode={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.focusMode ??
															"manual")
														: null
												}
												onZoomFocusModeChange={(mode) =>
													selectedZoomId && handleZoomFocusModeChange(mode)
												}
												focusModeLocked={autoFocusAll}
												selectedZoomFocus={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.focus ?? null)
														: null
												}
												onZoomFocusCoordinateChange={(focus) =>
													selectedZoomId && handleZoomFocusChange(selectedZoomId, focus)
												}
												onZoomFocusCoordinateCommit={commitState}
												hasCursorTelemetry={cursorTelemetry.length > 0}
												selectedZoomId={selectedZoomId}
												onZoomDelete={handleZoomDelete}
												selectedZoomRotationPreset={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.rotationPreset ??
															null)
														: null
												}
												onZoomRotationPresetChange={handleZoomRotationPresetChange}
												selectedTrimId={selectedTrimId}
												onTrimDelete={handleTrimDelete}
												shadowIntensity={shadowIntensity}
												onShadowChange={(v) => updateState({ shadowIntensity: v })}
												onShadowCommit={commitState}
												showBlur={showBlur}
												onBlurChange={(v) => pushState({ showBlur: v })}
												showTrimWaveform={showTrimWaveform}
												onTrimWaveformChange={(v) => pushState({ showTrimWaveform: v })}
												motionBlurAmount={motionBlurAmount}
												onMotionBlurChange={(v) => updateState({ motionBlurAmount: v })}
												onMotionBlurCommit={commitState}
												borderRadius={borderRadius}
												onBorderRadiusChange={(v) => updateState({ borderRadius: v })}
												onBorderRadiusCommit={commitState}
												padding={padding}
												onPaddingChange={(v) => updateState({ padding: v })}
												onPaddingCommit={commitState}
												cropRegion={cropRegion}
												onCropChange={(r) => pushState({ cropRegion: r })}
												colorFilterPreset={colorFilterPreset}
												onColorFilterPresetChange={handleColorFilterPresetChange}
												brightness={brightness}
												onBrightnessChange={(v) => updateState({ brightness: v })}
												onBrightnessCommit={commitState}
												contrast={contrast}
												onContrastChange={(v) => updateState({ contrast: v })}
												onContrastCommit={commitState}
												saturation={saturation}
												onSaturationChange={(v) => updateState({ saturation: v })}
												onSaturationCommit={commitState}
												vignette={vignette}
												onVignetteChange={(v) => updateState({ vignette: v })}
												onVignetteCommit={commitState}
												cursorSpotlight={cursorSpotlight}
												onCursorSpotlightChange={(v) => pushState({ cursorSpotlight: v })}
												cursorSpotlightRadius={cursorSpotlightRadius}
												onCursorSpotlightRadiusChange={(v) =>
													updateState({ cursorSpotlightRadius: v })
												}
												onCursorSpotlightRadiusCommit={commitState}
												clickRipple={clickRipple}
												onClickRippleChange={(v) => pushState({ clickRipple: v })}
												aspectRatio={aspectRatio}
												hasWebcam={Boolean(webcamVideoPath)}
												webcamLayoutPreset={webcamLayoutPreset}
												onWebcamLayoutPresetChange={(preset) =>
													pushState({
														webcamLayoutPreset: preset,
														webcamPosition: preset === "picture-in-picture" ? webcamPosition : null,
													})
												}
												webcamMaskShape={webcamMaskShape}
												onWebcamMaskShapeChange={(shape) => pushState({ webcamMaskShape: shape })}
												webcamMirrored={webcamMirrored}
												webcamReactiveZoom={webcamReactiveZoom}
												onWebcamMirroredChange={(mirrored) =>
													pushState({ webcamMirrored: mirrored })
												}
												onWebcamReactiveZoomChange={(reactive) =>
													pushState({ webcamReactiveZoom: reactive })
												}
												webcamSizePreset={webcamSizePreset}
												onWebcamSizePresetChange={(v) => updateState({ webcamSizePreset: v })}
												onWebcamSizePresetCommit={commitState}
												videoElement={videoPlaybackRef.current?.video || null}
												exportQuality={exportQuality}
												onExportQualityChange={setExportQuality}
												exportFormat={exportFormat}
												onExportFormatChange={setExportFormat}
												gifFrameRate={gifFrameRate}
												onGifFrameRateChange={setGifFrameRate}
												gifLoop={gifLoop}
												onGifLoopChange={setGifLoop}
												gifSizePreset={gifSizePreset}
												onGifSizePresetChange={setGifSizePreset}
												gifOutputDimensions={calculateOutputDimensions(
													calculateEffectiveSourceDimensions(
														videoPlaybackRef.current?.video?.videoWidth ||
															DEFAULT_SOURCE_DIMENSIONS.width,
														videoPlaybackRef.current?.video?.videoHeight ||
															DEFAULT_SOURCE_DIMENSIONS.height,
														cropRegion,
													).width,
													calculateEffectiveSourceDimensions(
														videoPlaybackRef.current?.video?.videoWidth ||
															DEFAULT_SOURCE_DIMENSIONS.width,
														videoPlaybackRef.current?.video?.videoHeight ||
															DEFAULT_SOURCE_DIMENSIONS.height,
														cropRegion,
													).height,
													gifSizePreset,
													GIF_SIZE_PRESETS,
													aspectRatio === "native"
														? getNativeAspectRatioValue(
																videoPlaybackRef.current?.video?.videoWidth ||
																	DEFAULT_SOURCE_DIMENSIONS.width,
																videoPlaybackRef.current?.video?.videoHeight ||
																	DEFAULT_SOURCE_DIMENSIONS.height,
																cropRegion,
															)
														: getAspectRatioValue(aspectRatio),
												)}
												onExport={handleOpenExportDialog}
												onExportPanelOpen={() => {
													setSelectedZoomId(null);
													setSelectedTrimId(null);
													setSelectedSpeedId(null);
												}}
												selectedAnnotationId={selectedAnnotationId}
												annotationRegions={annotationOnlyRegions}
												onAnnotationContentChange={handleAnnotationContentChange}
												onAnnotationTypeChange={handleAnnotationTypeChange}
												onAnnotationStyleChange={handleAnnotationStyleChange}
												onAnnotationFigureDataChange={handleAnnotationFigureDataChange}
												onAnnotationDuplicate={handleAnnotationDuplicate}
												onAnnotationDelete={handleAnnotationDelete}
												selectedBlurId={selectedBlurId}
												blurRegions={blurRegions}
												onBlurDataChange={handleBlurDataPanelChange}
												onBlurDataCommit={commitState}
												onBlurDelete={handleAnnotationDelete}
												selectedSpeedId={selectedSpeedId}
												selectedSpeedValue={
													selectedSpeedId
														? (speedRegions.find((r) => r.id === selectedSpeedId)?.speed ?? null)
														: null
												}
												onSpeedChange={handleSpeedChange}
												onSpeedDelete={handleSpeedDelete}
												unsavedExport={unsavedExport}
												onSaveUnsavedExport={handleSaveUnsavedExport}
												onSaveDiagnostic={handleSaveDiagnostic}
												showCursor={showCursor}
												onShowCursorChange={setShowCursor}
												cursorSize={cursorSize}
												onCursorSizeChange={setCursorSize}
												cursorSmoothing={cursorSmoothing}
												onCursorSmoothingChange={setCursorSmoothing}
												cursorMotionBlur={cursorMotionBlur}
												onCursorMotionBlurChange={setCursorMotionBlur}
												cursorClickBounce={cursorClickBounce}
												onCursorClickBounceChange={setCursorClickBounce}
												cursorClipToBounds={cursorClipToBounds}
												onCursorClipToBoundsChange={setCursorClipToBounds}
												cursorTheme={cursorTheme}
												onCursorThemeChange={setCursorTheme}
												hasCursorData={
													cursorTelemetry.length > 0 ||
													hasNativeCursorRecordingData(cursorRecordingData)
												}
												showCursorSettings={showCursorSettings}
												videoLayers={videoLayers}
												onAddVideoLayer={handleAddVideoLayer}
												onUpdateVideoLayer={handleUpdateVideoLayer}
												onDeleteVideoLayer={handleDeleteVideoLayer}
											/>
										</div>
									</Panel>

									<PanelResizeHandle className="editor-resize-handle group cursor-row-resize py-1 flex items-center justify-center">
										<div
											className="w-12 h-1 bg-white/20 rounded-full transition-all group-hover:scale-x-125"
											style={{ backgroundColor: isLight ? "rgba(0,0,0,0.15)" : undefined }}
										/>
									</PanelResizeHandle>

									{/* Bottom Right: Timeline Editor & Tracks */}
									<Panel defaultSize={48} minSize={28} className="min-h-[220px]">
										<div className="editor-timeline-panel h-full overflow-hidden flex flex-col">
											<TimelineEditor
												videoDuration={duration}
												currentTime={currentTime}
												onSeek={handleSeek}
												zoomRegions={zoomRegions}
												onZoomAdded={handleZoomAdded}
												autoZoomEnabled={autoZoomEnabled}
												onToggleAutoZoom={handleToggleAutoZoom}
												onGenerateAIZooms={handleGenerateAIZooms}
												autoFocusAll={autoFocusAll}
												onToggleAutoFocusAll={handleToggleAutoFocusAll}
												onZoomSpanChange={handleZoomSpanChange}
												onZoomDelete={handleZoomDelete}
												selectedZoomId={selectedZoomId}
												onSelectZoom={handleSelectZoom}
												trimRegions={trimRegions}
												onTrimAdded={handleTrimAdded}
												onTrimSpanChange={handleTrimSpanChange}
												onTrimDelete={handleTrimDelete}
												selectedTrimId={selectedTrimId}
												onSelectTrim={handleSelectTrim}
												speedRegions={speedRegions}
												onSpeedAdded={handleSpeedAdded}
												onSpeedSpanChange={handleSpeedSpanChange}
												onSpeedDelete={handleSpeedDelete}
												selectedSpeedId={selectedSpeedId}
												onSelectSpeed={handleSelectSpeed}
												annotationRegions={annotationOnlyRegions}
												onAnnotationAdded={handleAnnotationAdded}
												onAnnotationSpanChange={handleAnnotationSpanChange}
												onAnnotationDelete={handleAnnotationDelete}
												selectedAnnotationId={selectedAnnotationId}
												onSelectAnnotation={handleSelectAnnotation}
												blurRegions={blurRegions}
												onBlurAdded={handleBlurAdded}
												onBlurSpanChange={handleAnnotationSpanChange}
												onBlurDelete={handleAnnotationDelete}
												selectedBlurId={selectedBlurId}
												onSelectBlur={handleSelectBlur}
												aspectRatio={aspectRatio}
												onAspectRatioChange={(ar) =>
													pushState({
														aspectRatio: ar,
														webcamLayoutPreset:
															(isPortraitAspectRatio(ar) && webcamLayoutPreset === "dual-frame") ||
															(!isPortraitAspectRatio(ar) &&
																webcamLayoutPreset === "vertical-stack")
																? "picture-in-picture"
																: webcamLayoutPreset,
													})
												}
												videoUrl={videoPath ?? undefined}
												showTrimWaveform={showTrimWaveform}
												captionsLabel={t("autoCaptions.button")}
												isGeneratingCaptions={isAutoCaptioning}
												onGenerateCaptions={() => {
													if (!videoPath) {
														toast.error(t("errors.noVideoLoaded"));
														return;
													}
													if (isAutoCaptioningRef.current) {
														toast.error(t("autoCaptions.busy"));
														return;
													}
													setShowAutoCaptionsDialog(true);
												}}
											/>
										</div>
									</Panel>
								</PanelGroup>
							</Panel>
						</PanelGroup>
					) : (
						/* Standard Landscape Mode */
						<PanelGroup direction="vertical" className="gap-3 min-h-0">
							{/* Top section: preview and contextual settings with horizontal resizable splitter */}
							<Panel defaultSize={67} maxSize={78} minSize={44} className="min-h-[280px]">
								<PanelGroup direction="horizontal" className="gap-2.5 min-h-0 h-full">
									{/* Left: Video Preview Panel */}
									<Panel defaultSize={71} minSize={45} maxSize={82} className="min-w-[340px]">
										<div className="editor-preview-zone min-w-0 h-full">
											<div
												ref={playerContainerRef}
												className={
													isFullscreen
														? "fixed inset-0 z-[99999] w-full h-full flex flex-col items-center justify-center bg-[#09090b]"
														: `editor-preview-panel w-full h-full flex flex-col items-center justify-center overflow-hidden relative transition-colors ${
																isLight ? "bg-[#f4f4f5]" : "bg-[#08080a]"
															}`
												}
											>
												{/* Video preview */}
												<div className="w-full min-h-0 flex justify-center items-center flex-auto p-4 md:p-6">
													<div
														className="relative flex justify-center items-center w-auto h-full max-w-full box-border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-white/10"
														style={{
															aspectRatio:
																aspectRatio === "native"
																	? getNativeAspectRatioValue(
																			videoPlaybackRef.current?.video?.videoWidth ||
																				DEFAULT_SOURCE_DIMENSIONS.width,
																			videoPlaybackRef.current?.video?.videoHeight ||
																				DEFAULT_SOURCE_DIMENSIONS.height,
																			cropRegion,
																		)
																	: getAspectRatioValue(aspectRatio),
														}}
													>
														<VideoPlayback
															key={`${videoPath || "no-video"}:${webcamVideoPath || "no-webcam"}`}
															aspectRatio={aspectRatio}
															ref={videoPlaybackRef}
															videoPath={videoPath || ""}
															webcamVideoPath={webcamVideoPath || undefined}
															webcamLayoutPreset={webcamLayoutPreset}
															webcamMaskShape={webcamMaskShape}
															webcamMirrored={webcamMirrored}
															webcamReactiveZoom={webcamReactiveZoom}
															webcamSizePreset={webcamSizePreset}
															webcamPosition={webcamPosition}
															onWebcamPositionChange={(pos) => updateState({ webcamPosition: pos })}
															onWebcamPositionDragEnd={commitState}
															onDurationChange={setDuration}
															onTimeUpdate={setCurrentTime}
															currentTime={currentTime}
															onPlayStateChange={setIsPlaying}
															onError={setError}
															wallpaper={wallpaper}
															zoomRegions={zoomRegions}
															selectedZoomId={selectedZoomId}
															onSelectZoom={handleSelectZoom}
															onZoomFocusChange={handleZoomFocusChange}
															onZoomFocusDragEnd={commitState}
															isPlaying={isPlaying}
															showShadow={shadowIntensity > 0}
															shadowIntensity={shadowIntensity}
															showBlur={showBlur}
															motionBlurAmount={motionBlurAmount}
															borderRadius={borderRadius}
															padding={padding}
															cropRegion={cropRegion}
															cursorRecordingData={cursorRecordingData}
															trimRegions={trimRegions}
															speedRegions={speedRegions}
															annotationRegions={annotationOnlyRegions}
															selectedAnnotationId={selectedAnnotationId}
															onSelectAnnotation={handleSelectAnnotation}
															onAnnotationPositionChange={handleAnnotationPositionChange}
															onAnnotationSizeChange={handleAnnotationSizeChange}
															blurRegions={blurRegions}
															selectedBlurId={selectedBlurId}
															onSelectBlur={handleSelectBlur}
															onBlurPositionChange={handleAnnotationPositionChange}
															onBlurSizeChange={handleAnnotationSizeChange}
															onBlurDataChange={handleBlurDataPreviewChange}
															onBlurDataCommit={commitState}
															cursorTelemetry={cursorTelemetry}
															cursorClickTimestamps={cursorClickTimestamps}
															showCursor={effectiveShowCursor}
															cursorSize={cursorSize}
															cursorSmoothing={cursorSmoothing}
															cursorMotionBlur={cursorMotionBlur}
															cursorClickBounce={cursorClickBounce}
															cursorClipToBounds={cursorClipToBounds}
															cursorTheme={cursorTheme}
															colorFilterPreset={colorFilterPreset}
															brightness={brightness}
															contrast={contrast}
															saturation={saturation}
															vignette={vignette}
															cursorSpotlight={cursorSpotlight}
															cursorSpotlightRadius={cursorSpotlightRadius}
															clickRipple={clickRipple}
															isPreviewingZoom={isPreviewingZoom}
														/>
													</div>
												</div>
												{/* Playback controls */}
												<div className="w-full flex justify-center items-center h-14 flex-shrink-0 px-4 py-2">
													<div className="w-full max-w-[760px]">
														<PlaybackControls
															isPlaying={isPlaying}
															currentTime={currentTime}
															duration={duration}
															isFullscreen={isFullscreen}
															onToggleFullscreen={toggleFullscreen}
															onTogglePlayPause={togglePlayPause}
															onSeek={handleSeek}
														/>
													</div>
												</div>
											</div>
										</div>
									</Panel>

									{/* Draggable Horizontal Splitter Handle */}
									<PanelResizeHandle className="editor-resize-handle-col group cursor-col-resize px-0.5 flex items-center justify-center">
										<div
											className="w-1 h-12 bg-white/20 rounded-full transition-all group-hover:scale-y-125"
											style={{ backgroundColor: isLight ? "rgba(0,0,0,0.15)" : undefined }}
										/>
									</PanelResizeHandle>

									{/* Right: Resizable Settings / Inspector Panel */}
									<Panel defaultSize={29} minSize={20} maxSize={55} className="min-w-[300px]">
										<div className="editor-settings-rail min-w-0 h-full">
											<SettingsPanel
												selected={wallpaper}
												onWallpaperChange={(w) => pushState({ wallpaper: w })}
												selectedZoomDepth={
													selectedZoomId
														? zoomRegions.find((z) => z.id === selectedZoomId)?.depth
														: null
												}
												onZoomDepthChange={(depth) =>
													selectedZoomId && handleZoomDepthChange(depth)
												}
												selectedZoomCustomScale={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.customScale ??
															null)
														: null
												}
												onZoomCustomScaleChange={handleZoomCustomScaleChange}
												onZoomCustomScaleCommit={handleZoomCustomScaleCommit}
												onZoomPreviewStart={() => setIsPreviewingZoom(true)}
												onZoomPreviewEnd={() => setIsPreviewingZoom(false)}
												selectedZoomFocusMode={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.focusMode ??
															"manual")
														: null
												}
												onZoomFocusModeChange={(mode) =>
													selectedZoomId && handleZoomFocusModeChange(mode)
												}
												focusModeLocked={autoFocusAll}
												selectedZoomFocus={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.focus ?? null)
														: null
												}
												onZoomFocusCoordinateChange={(focus) =>
													selectedZoomId && handleZoomFocusChange(selectedZoomId, focus)
												}
												onZoomFocusCoordinateCommit={commitState}
												hasCursorTelemetry={cursorTelemetry.length > 0}
												selectedZoomId={selectedZoomId}
												onZoomDelete={handleZoomDelete}
												selectedZoomRotationPreset={
													selectedZoomId
														? (zoomRegions.find((z) => z.id === selectedZoomId)?.rotationPreset ??
															null)
														: null
												}
												onZoomRotationPresetChange={handleZoomRotationPresetChange}
												selectedTrimId={selectedTrimId}
												onTrimDelete={handleTrimDelete}
												shadowIntensity={shadowIntensity}
												onShadowChange={(v) => updateState({ shadowIntensity: v })}
												onShadowCommit={commitState}
												showBlur={showBlur}
												onBlurChange={(v) => pushState({ showBlur: v })}
												showTrimWaveform={showTrimWaveform}
												onTrimWaveformChange={(v) => pushState({ showTrimWaveform: v })}
												motionBlurAmount={motionBlurAmount}
												onMotionBlurChange={(v) => updateState({ motionBlurAmount: v })}
												onMotionBlurCommit={commitState}
												borderRadius={borderRadius}
												onBorderRadiusChange={(v) => updateState({ borderRadius: v })}
												onBorderRadiusCommit={commitState}
												padding={padding}
												onPaddingChange={(v) => updateState({ padding: v })}
												onPaddingCommit={commitState}
												cropRegion={cropRegion}
												onCropChange={(r) => pushState({ cropRegion: r })}
												colorFilterPreset={colorFilterPreset}
												onColorFilterPresetChange={handleColorFilterPresetChange}
												brightness={brightness}
												onBrightnessChange={(v) => updateState({ brightness: v })}
												onBrightnessCommit={commitState}
												contrast={contrast}
												onContrastChange={(v) => updateState({ contrast: v })}
												onContrastCommit={commitState}
												saturation={saturation}
												onSaturationChange={(v) => updateState({ saturation: v })}
												onSaturationCommit={commitState}
												vignette={vignette}
												onVignetteChange={(v) => updateState({ vignette: v })}
												onVignetteCommit={commitState}
												cursorSpotlight={cursorSpotlight}
												onCursorSpotlightChange={(v) => pushState({ cursorSpotlight: v })}
												cursorSpotlightRadius={cursorSpotlightRadius}
												onCursorSpotlightRadiusChange={(v) =>
													updateState({ cursorSpotlightRadius: v })
												}
												onCursorSpotlightRadiusCommit={commitState}
												clickRipple={clickRipple}
												onClickRippleChange={(v) => pushState({ clickRipple: v })}
												aspectRatio={aspectRatio}
												hasWebcam={Boolean(webcamVideoPath)}
												webcamLayoutPreset={webcamLayoutPreset}
												onWebcamLayoutPresetChange={(preset) =>
													pushState({
														webcamLayoutPreset: preset,
														webcamPosition: preset === "picture-in-picture" ? webcamPosition : null,
													})
												}
												webcamMaskShape={webcamMaskShape}
												onWebcamMaskShapeChange={(shape) => pushState({ webcamMaskShape: shape })}
												webcamMirrored={webcamMirrored}
												webcamReactiveZoom={webcamReactiveZoom}
												onWebcamMirroredChange={(mirrored) =>
													pushState({ webcamMirrored: mirrored })
												}
												onWebcamReactiveZoomChange={(reactive) =>
													pushState({ webcamReactiveZoom: reactive })
												}
												webcamSizePreset={webcamSizePreset}
												onWebcamSizePresetChange={(v) => updateState({ webcamSizePreset: v })}
												onWebcamSizePresetCommit={commitState}
												videoElement={videoPlaybackRef.current?.video || null}
												exportQuality={exportQuality}
												onExportQualityChange={setExportQuality}
												exportFormat={exportFormat}
												onExportFormatChange={setExportFormat}
												gifFrameRate={gifFrameRate}
												onGifFrameRateChange={setGifFrameRate}
												gifLoop={gifLoop}
												onGifLoopChange={setGifLoop}
												gifSizePreset={gifSizePreset}
												onGifSizePresetChange={setGifSizePreset}
												gifOutputDimensions={calculateOutputDimensions(
													calculateEffectiveSourceDimensions(
														videoPlaybackRef.current?.video?.videoWidth ||
															DEFAULT_SOURCE_DIMENSIONS.width,
														videoPlaybackRef.current?.video?.videoHeight ||
															DEFAULT_SOURCE_DIMENSIONS.height,
														cropRegion,
													).width,
													calculateEffectiveSourceDimensions(
														videoPlaybackRef.current?.video?.videoWidth ||
															DEFAULT_SOURCE_DIMENSIONS.width,
														videoPlaybackRef.current?.video?.videoHeight ||
															DEFAULT_SOURCE_DIMENSIONS.height,
														cropRegion,
													).height,
													gifSizePreset,
													GIF_SIZE_PRESETS,
													aspectRatio === "native"
														? getNativeAspectRatioValue(
																videoPlaybackRef.current?.video?.videoWidth ||
																	DEFAULT_SOURCE_DIMENSIONS.width,
																videoPlaybackRef.current?.video?.videoHeight ||
																	DEFAULT_SOURCE_DIMENSIONS.height,
																cropRegion,
															)
														: getAspectRatioValue(aspectRatio),
												)}
												onExport={handleOpenExportDialog}
												onExportPanelOpen={() => {
													setSelectedZoomId(null);
													setSelectedTrimId(null);
													setSelectedSpeedId(null);
												}}
												selectedAnnotationId={selectedAnnotationId}
												annotationRegions={annotationOnlyRegions}
												onAnnotationContentChange={handleAnnotationContentChange}
												onAnnotationTypeChange={handleAnnotationTypeChange}
												onAnnotationStyleChange={handleAnnotationStyleChange}
												onAnnotationFigureDataChange={handleAnnotationFigureDataChange}
												onAnnotationDuplicate={handleAnnotationDuplicate}
												onAnnotationDelete={handleAnnotationDelete}
												selectedBlurId={selectedBlurId}
												blurRegions={blurRegions}
												onBlurDataChange={handleBlurDataPanelChange}
												onBlurDataCommit={commitState}
												onBlurDelete={handleAnnotationDelete}
												selectedSpeedId={selectedSpeedId}
												selectedSpeedValue={
													selectedSpeedId
														? (speedRegions.find((r) => r.id === selectedSpeedId)?.speed ?? null)
														: null
												}
												onSpeedChange={handleSpeedChange}
												onSpeedDelete={handleSpeedDelete}
												unsavedExport={unsavedExport}
												onSaveUnsavedExport={handleSaveUnsavedExport}
												onSaveDiagnostic={handleSaveDiagnostic}
												showCursor={showCursor}
												onShowCursorChange={setShowCursor}
												cursorSize={cursorSize}
												onCursorSizeChange={setCursorSize}
												cursorSmoothing={cursorSmoothing}
												onCursorSmoothingChange={setCursorSmoothing}
												cursorMotionBlur={cursorMotionBlur}
												onCursorMotionBlurChange={setCursorMotionBlur}
												cursorClickBounce={cursorClickBounce}
												onCursorClickBounceChange={setCursorClickBounce}
												cursorClipToBounds={cursorClipToBounds}
												onCursorClipToBoundsChange={setCursorClipToBounds}
												cursorTheme={cursorTheme}
												onCursorThemeChange={setCursorTheme}
												hasCursorData={
													cursorTelemetry.length > 0 ||
													hasNativeCursorRecordingData(cursorRecordingData)
												}
												showCursorSettings={showCursorSettings}
												videoLayers={videoLayers}
												onAddVideoLayer={handleAddVideoLayer}
												onUpdateVideoLayer={handleUpdateVideoLayer}
												onDeleteVideoLayer={handleDeleteVideoLayer}
											/>
										</div>
									</Panel>
								</PanelGroup>
							</Panel>

							<PanelResizeHandle className="editor-resize-handle group cursor-row-resize py-1 flex items-center justify-center">
								<div
									className="w-12 h-1 bg-white/20 rounded-full transition-all group-hover:scale-x-125"
									style={{ backgroundColor: isLight ? "rgba(0,0,0,0.15)" : undefined }}
								/>
							</PanelResizeHandle>

							{/* Full-width timeline */}
							<Panel defaultSize={33} maxSize={54} minSize={24} className="min-h-[210px]">
								<div className="editor-timeline-panel h-full overflow-hidden flex flex-col">
									<TimelineEditor
										videoDuration={duration}
										currentTime={currentTime}
										onSeek={handleSeek}
										zoomRegions={zoomRegions}
										onZoomAdded={handleZoomAdded}
										autoZoomEnabled={autoZoomEnabled}
										onToggleAutoZoom={handleToggleAutoZoom}
										onGenerateAIZooms={handleGenerateAIZooms}
										autoFocusAll={autoFocusAll}
										onToggleAutoFocusAll={handleToggleAutoFocusAll}
										onZoomSpanChange={handleZoomSpanChange}
										onZoomDelete={handleZoomDelete}
										selectedZoomId={selectedZoomId}
										onSelectZoom={handleSelectZoom}
										trimRegions={trimRegions}
										onTrimAdded={handleTrimAdded}
										onTrimSpanChange={handleTrimSpanChange}
										onTrimDelete={handleTrimDelete}
										selectedTrimId={selectedTrimId}
										onSelectTrim={handleSelectTrim}
										speedRegions={speedRegions}
										onSpeedAdded={handleSpeedAdded}
										onSpeedSpanChange={handleSpeedSpanChange}
										onSpeedDelete={handleSpeedDelete}
										selectedSpeedId={selectedSpeedId}
										onSelectSpeed={handleSelectSpeed}
										annotationRegions={annotationOnlyRegions}
										onAnnotationAdded={handleAnnotationAdded}
										onAnnotationSpanChange={handleAnnotationSpanChange}
										onAnnotationDelete={handleAnnotationDelete}
										selectedAnnotationId={selectedAnnotationId}
										onSelectAnnotation={handleSelectAnnotation}
										blurRegions={blurRegions}
										onBlurAdded={handleBlurAdded}
										onBlurSpanChange={handleAnnotationSpanChange}
										onBlurDelete={handleAnnotationDelete}
										selectedBlurId={selectedBlurId}
										onSelectBlur={handleSelectBlur}
										aspectRatio={aspectRatio}
										onAspectRatioChange={(ar) =>
											pushState({
												aspectRatio: ar,
												webcamLayoutPreset:
													(isPortraitAspectRatio(ar) && webcamLayoutPreset === "dual-frame") ||
													(!isPortraitAspectRatio(ar) && webcamLayoutPreset === "vertical-stack")
														? "picture-in-picture"
														: webcamLayoutPreset,
											})
										}
										videoUrl={videoPath ?? undefined}
										showTrimWaveform={showTrimWaveform}
										captionsLabel={t("autoCaptions.button")}
										isGeneratingCaptions={isAutoCaptioning}
										onGenerateCaptions={() => {
											if (!videoPath) {
												toast.error(t("errors.noVideoLoaded"));
												return;
											}
											if (isAutoCaptioningRef.current) {
												toast.error(t("autoCaptions.busy"));
												return;
											}
											setShowAutoCaptionsDialog(true);
										}}
									/>
								</div>
							</Panel>
						</PanelGroup>
					)}
				</div>
			)}

			<ExportDialog
				isOpen={showExportDialog}
				onClose={() => setShowExportDialog(false)}
				progress={exportProgress}
				isExporting={isExporting}
				error={exportError}
				onCancel={handleCancelExport}
				exportFormat={exportFormat}
				exportedFilePath={exportedFilePath || undefined}
				onShowInFolder={
					exportedFilePath ? () => void handleShowExportedFile(exportedFilePath) : undefined
				}
				accentColor={accentColor}
				themeMode={themeMode}
			/>

			<UnsavedChangesDialog
				isOpen={showCloseConfirmDialog}
				accentColor={accentColor}
				themeMode={themeMode}
				onSaveAndClose={handleCloseConfirmSave}
				onDiscardAndClose={handleCloseConfirmDiscard}
				onCancel={handleCloseConfirmCancel}
			/>

			<UnsavedChangesDialog
				isOpen={confirmDialogVariant !== null}
				variant={confirmDialogVariant ?? "newProject"}
				accentColor={accentColor}
				themeMode={themeMode}
				onSaveAndClose={
					confirmDialogVariant === "loadProject"
						? handleLoadProjectConfirmSave
						: handleNewProjectConfirmSave
				}
				onDiscardAndClose={
					confirmDialogVariant === "loadProject"
						? handleLoadProjectConfirmDiscard
						: handleNewProjectConfirmDiscard
				}
				onCancel={() => setConfirmDialogVariant(null)}
			/>

			<StudioSettingsDialog
				isOpen={showSettingsDialog}
				onClose={() => setShowSettingsDialog(false)}
				themeMode={themeMode}
				onThemeModeChange={setThemeMode}
				accentColor={accentColor}
				onAccentColorChange={setAccentColor}
				userName={userName}
				onUserNameChange={setUserName}
			/>
		</div>
	);
}
