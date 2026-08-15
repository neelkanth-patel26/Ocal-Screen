import { Check, ChevronDown, Clapperboard, Columns3, Languages, Rows3 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BsPauseCircle, BsPlayCircle, BsRecordCircle } from "react-icons/bs";
import { FaRegStopCircle } from "react-icons/fa";
import { FaFolderOpen } from "react-icons/fa6";
import { FiMinus, FiMoon, FiSun, FiX } from "react-icons/fi";
import {
	MdCancel,
	MdMic,
	MdMicOff,
	MdMonitor,
	MdMouse,
	MdRestartAlt,
	MdVideocam,
	MdVideocamOff,
	MdVideoFile,
	MdVolumeOff,
	MdVolumeUp,
} from "react-icons/md";
import { RxDragHandleDots2 } from "react-icons/rx";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { getAvailableLocales, getLocaleName } from "@/i18n/loader";
import {
	ACCENT_COLOR_MAP,
	type AccentColor,
	loadUserPreferences,
	saveUserPreferences,
} from "@/lib/userPreferences";
import { nativeBridgeClient } from "@/native";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { AudioLevelMeter } from "../ui/audio-level-meter";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import styles from "./LaunchWindow.module.css";
import { openSourceSelectorWithPermissionRetry } from "./openSourceSelectorFlow";
import { WebcamPreviewBubble } from "./WebcamPreviewBubble";

const ICON_SIZE = 18;

// Vertical tray gap (px): bar's `bottom-5` (20px) plus an 8px gap.
const HUD_DEVICE_POPUP_GAP = 28;
// Horizontal layout: mirrors the `bottom-[68px]` class on the popup element.
const HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM = 68;

const ICON_CONFIG = {
	drag: { icon: RxDragHandleDots2, size: 16 },
	monitor: { icon: MdMonitor, size: 16 },
	volumeOn: { icon: MdVolumeUp, size: 16 },
	volumeOff: { icon: MdVolumeOff, size: 16 },
	micOn: { icon: MdMic, size: 16 },
	micOff: { icon: MdMicOff, size: 16 },
	webcamOn: { icon: MdVideocam, size: 16 },
	webcamOff: { icon: MdVideocamOff, size: 16 },
	cursor: { icon: MdMouse, size: 16 },
	pause: { icon: BsPauseCircle, size: 16 },
	resume: { icon: BsPlayCircle, size: 16 },
	stop: { icon: FaRegStopCircle, size: 15 },
	restart: { icon: MdRestartAlt, size: 16 },
	cancel: { icon: MdCancel, size: 16 },
	record: { icon: BsRecordCircle, size: 16 },
	videoFile: { icon: MdVideoFile, size: 16 },
	folder: { icon: FaFolderOpen, size: 16 },
	sun: { icon: FiSun, size: 15 },
	moon: { icon: FiMoon, size: 15 },
	minimize: { icon: FiMinus, size: 15 },
	close: { icon: FiX, size: 15 },
} as const;

type IconName = keyof typeof ICON_CONFIG;

/** Renders the configured icon for a HUD control. */
function getIcon(name: IconName, className?: string) {
	const { icon: Icon, size } = ICON_CONFIG[name];
	return <Icon size={size} className={className} />;
}

const hudAuxIconBtnClasses =
	"flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed";

/** Launches the floating recording HUD and its recorder controls. */
export function LaunchWindow() {
	const t = useScopedT("launch");
	const availableLocales = getAvailableLocales();
	const {
		locale,
		setLocale,
		systemLocaleSuggestion,
		acceptSystemLocaleSuggestion,
		dismissSystemLocaleSuggestion,
		resolveSystemLocaleSuggestion,
	} = useI18n();
	const suggestedLanguageName = systemLocaleSuggestion ? getLocaleName(systemLocaleSuggestion) : "";
	const activeLanguageLabel = getLocaleName(locale).split(/\s+/)[0] || locale.toUpperCase();

	const {
		recording,
		paused,
		elapsedSeconds,
		toggleRecording,
		togglePaused,
		canPauseRecording,
		restartRecording,
		cancelRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		setMicrophoneDeviceName,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
		webcamStream,
		webcamDeviceId,
		setWebcamDeviceId,
		setWebcamDeviceName,
		cursorCaptureMode,
		setCursorCaptureMode,
	} = useScreenRecorder();

	const [isMicHovered, setIsMicHovered] = useState(false);
	const [isMicFocused, setIsMicFocused] = useState(false);
	const micLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const micExpanded = isMicHovered || isMicFocused;

	const [isWebcamHovered, setIsWebcamHovered] = useState(false);
	const [isWebcamFocused, setIsWebcamFocused] = useState(false);
	const webcamLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const webcamExpanded = isWebcamHovered || isWebcamFocused;

	const handleMicEnter = useCallback(() => {
		if (micLeaveTimeoutRef.current) {
			clearTimeout(micLeaveTimeoutRef.current);
			micLeaveTimeoutRef.current = null;
		}
		setIsMicHovered(true);
	}, []);

	const handleMicLeave = useCallback(() => {
		if (micLeaveTimeoutRef.current) {
			clearTimeout(micLeaveTimeoutRef.current);
		}
		micLeaveTimeoutRef.current = setTimeout(() => {
			setIsMicHovered(false);
			micLeaveTimeoutRef.current = null;
		}, 600);
	}, []);

	const handleWebcamEnter = useCallback(() => {
		if (webcamLeaveTimeoutRef.current) {
			clearTimeout(webcamLeaveTimeoutRef.current);
			webcamLeaveTimeoutRef.current = null;
		}
		setIsWebcamHovered(true);
	}, []);

	const handleWebcamLeave = useCallback(() => {
		if (webcamLeaveTimeoutRef.current) {
			clearTimeout(webcamLeaveTimeoutRef.current);
		}
		webcamLeaveTimeoutRef.current = setTimeout(() => {
			setIsWebcamHovered(false);
			webcamLeaveTimeoutRef.current = null;
		}, 600);
	}, []);

	useEffect(() => {
		return () => {
			if (micLeaveTimeoutRef.current) clearTimeout(micLeaveTimeoutRef.current);
			if (webcamLeaveTimeoutRef.current) clearTimeout(webcamLeaveTimeoutRef.current);
		};
	}, []);

	const showMicControls = microphoneEnabled && !recording && micExpanded;
	const showWebcamControls = webcamEnabled && !recording && webcamExpanded;
	const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
	const [trayLayout, setTrayLayout] = useState<"horizontal" | "vertical">(
		() => loadUserPreferences().trayLayout,
	);
	const [themeMode, setThemeMode] = useState<"dark" | "light">(
		() => loadUserPreferences().theme || "dark",
	);
	const [accentColor, setAccentColor] = useState<AccentColor>(
		() => loadUserPreferences().accentColor || "lime",
	);
	const isLight = themeMode === "light";
	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;

	const toggleTheme = () => {
		const nextTheme = themeMode === "dark" ? "light" : "dark";
		setThemeMode(nextTheme);
		saveUserPreferences({ theme: nextTheme });
	};

	useEffect(() => {
		const syncPrefs = () => {
			const prefs = loadUserPreferences();
			setTrayLayout(prefs.trayLayout);
			setThemeMode(prefs.theme || "dark");
			setAccentColor(prefs.accentColor || "lime");
		};
		window.addEventListener("storage", syncPrefs);
		const timer = setInterval(syncPrefs, 400);
		return () => {
			window.removeEventListener("storage", syncPrefs);
			clearInterval(timer);
		};
	}, []);

	useEffect(() => {
		if (themeMode === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [themeMode]);

	const iconBtnClasses = isLight
		? "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.06] active:scale-95"
		: "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95";

	const [supportsCursorModeToggle, setSupportsCursorModeToggle] = useState(false);
	const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
	const languageMenuPanelRef = useRef<HTMLDivElement | null>(null);
	const hudBarRef = useRef<HTMLDivElement | null>(null);
	const deviceSelectorRef = useRef<HTMLDivElement | null>(null);
	const webcamBubbleRef = useRef<HTMLDivElement | null>(null);
	// Measured bar height, anchors the popups above the tall vertical tray so they don't overlap it.
	const [hudBarHeight, setHudBarHeight] = useState(0);
	const [languageMenuStyle, setLanguageMenuStyle] = useState<{
		right: number;
		top?: number;
		bottom?: number;
		maxHeight: number;
	}>({
		right: 12,
		bottom: 64,
		maxHeight: 240,
	});

	const {
		devices: micDevices,
		selectedDeviceId: selectedMicId,
		setSelectedDeviceId: setSelectedMicId,
	} = useMicrophoneDevices(microphoneEnabled);
	const {
		devices: cameraDevices,
		selectedDeviceId: selectedCameraId,
		setSelectedDeviceId: setSelectedCameraId,
		isLoading: isCameraDevicesLoading,
		error: cameraDevicesError,
	} = useCameraDevices(webcamEnabled);

	const selectedMicLabel =
		micDevices.find((d) => d.deviceId === (microphoneDeviceId || selectedMicId))?.label ||
		t("audio.defaultMicrophone");
	const selectedCameraDevice = cameraDevices.find(
		(d) => d.deviceId === (webcamDeviceId || selectedCameraId),
	);
	const selectedCameraLabel = isCameraDevicesLoading
		? t("webcam.searching")
		: cameraDevicesError
			? t("webcam.unavailable")
			: cameraDevices.length === 0
				? t("webcam.noneFound")
				: selectedCameraDevice?.label || t("webcam.defaultCamera");

	const { level } = useAudioLevelMeter({
		enabled: showMicControls,
		deviceId: microphoneDeviceId,
	});

	useEffect(() => {
		if (selectedMicId && selectedMicId !== "default") {
			setMicrophoneDeviceId(selectedMicId);
			setMicrophoneDeviceName(micDevices.find((d) => d.deviceId === selectedMicId)?.label);
		}
	}, [selectedMicId, micDevices, setMicrophoneDeviceId, setMicrophoneDeviceName]);

	useEffect(() => {
		if (selectedCameraId) {
			setWebcamDeviceId(selectedCameraId);
			setWebcamDeviceName(cameraDevices.find((d) => d.deviceId === selectedCameraId)?.label);
		}
	}, [selectedCameraId, cameraDevices, setWebcamDeviceId, setWebcamDeviceName]);

	useEffect(() => {
		let cancelled = false;
		nativeBridgeClient.system
			.getPlatform()
			.then((platform) => {
				if (!cancelled) {
					setSupportsCursorModeToggle(platform === "win32" || platform === "darwin");
				}
			})
			.catch(() => {
				if (!cancelled) {
					setSupportsCursorModeToggle(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return;
		}

		void requestCameraAccess().catch((error) => {
			console.warn("Failed to trigger camera access request during development:", error);
		});
	}, []);

	useEffect(() => {
		if (!isLanguageMenuOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			const clickedTrigger = languageTriggerRef.current?.contains(target);
			const clickedMenu = languageMenuPanelRef.current?.contains(target);
			if (!clickedTrigger && !clickedMenu) {
				setIsLanguageMenuOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsLanguageMenuOpen(false);
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleEscape);

		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isLanguageMenuOpen]);

	useEffect(() => {
		if (!isLanguageMenuOpen || !languageTriggerRef.current) return;

		const updatePosition = () => {
			if (!languageTriggerRef.current) return;
			const rect = languageTriggerRef.current.getBoundingClientRect();
			const gap = 8;
			const viewportPadding = 12;

			const spaceAbove = rect.top - gap - viewportPadding;
			const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;

			// Prefer placing above if there is enough space (>= 140px) or spaceAbove >= spaceBelow
			const placeAbove = spaceAbove >= 140 || spaceAbove >= spaceBelow;
			const maxHeight = Math.min(260, Math.max(100, placeAbove ? spaceAbove : spaceBelow));
			const right = Math.max(viewportPadding, window.innerWidth - rect.right);

			if (placeAbove) {
				const bottom = Math.max(viewportPadding, window.innerHeight - rect.top + gap);
				setLanguageMenuStyle({
					right,
					bottom,
					top: undefined,
					maxHeight,
				});
			} else {
				const top = Math.max(viewportPadding, rect.bottom + gap);
				setLanguageMenuStyle({
					right,
					top,
					bottom: undefined,
					maxHeight,
				});
			}
		};

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [isLanguageMenuOpen]);

	useEffect(() => {
		if (!isLanguageMenuOpen || !languageMenuPanelRef.current) return;
		const id = requestAnimationFrame(() => {
			if (languageMenuPanelRef.current) {
				languageMenuPanelRef.current.scrollTop = 0;
			}
		});
		return () => cancelAnimationFrame(id);
	}, [isLanguageMenuOpen]);

	// Resize the overlay window to fit content, else the taller vertical tray gets clipped
	// and scrolls. Measure from the window's bottom-centre (the anchor the main process
	// preserves) so fixed bottom/centre offsets keep this stable and it doesn't oscillate.
	const lastHudSizeRef = useRef({ width: 0, height: 0 });
	const measureHudSize = useCallback(() => {
		const barEl = hudBarRef.current;
		if (!barEl || !window.electronAPI?.setHudOverlaySize) return;

		// Breathing room so the drop shadow isn't clipped.
		const SIDE_MARGIN = 24;
		const TOP_MARGIN = 24;
		const MIN_WIDTH = 220;

		const viewportHeight = window.innerHeight;
		const centerX = window.innerWidth / 2;

		let topFromBottom = viewportHeight - barEl.getBoundingClientRect().bottom + barEl.scrollHeight;
		let halfWidth = barEl.scrollWidth / 2;

		if (deviceSelectorRef.current) {
			const rect = deviceSelectorRef.current.getBoundingClientRect();
			if (rect.width !== 0 || rect.height !== 0) {
				const popupBottomOffset =
					trayLayout === "vertical"
						? barEl.scrollHeight + HUD_DEVICE_POPUP_GAP
						: HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM;
				topFromBottom = Math.max(topFromBottom, popupBottomOffset + rect.height);
				halfWidth = Math.max(halfWidth, rect.width / 2);
			}
		}

		if (webcamBubbleRef.current) {
			const rect = webcamBubbleRef.current.getBoundingClientRect();
			if (rect.width !== 0 || rect.height !== 0) {
				const popupBottomOffset =
					trayLayout === "vertical"
						? barEl.scrollHeight + HUD_DEVICE_POPUP_GAP
						: HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM;
				topFromBottom = Math.max(topFromBottom, popupBottomOffset + rect.height + 12);
				halfWidth = Math.max(halfWidth, rect.width / 2);
			}
		}

		if (languageMenuPanelRef.current) {
			const rect = languageMenuPanelRef.current.getBoundingClientRect();
			halfWidth = Math.max(halfWidth, centerX - rect.left, rect.right - centerX);
			const menuHeight = rect.height || 220;
			const barBottomOffset = viewportHeight - barEl.getBoundingClientRect().bottom;
			topFromBottom = Math.max(
				topFromBottom,
				barBottomOffset + barEl.scrollHeight + menuHeight + 20,
			);
		}

		setHudBarHeight((prev) => {
			const next = Math.round(barEl.scrollHeight);
			return Math.abs(prev - next) > 1 ? next : prev;
		});

		const width = Math.max(MIN_WIDTH, Math.ceil(halfWidth * 2) + SIDE_MARGIN);
		const height = Math.ceil(topFromBottom) + TOP_MARGIN;
		if (width === lastHudSizeRef.current.width && height === lastHudSizeRef.current.height) {
			return;
		}
		lastHudSizeRef.current = { width, height };
		window.electronAPI.setHudOverlaySize(width, height);
	}, [trayLayout]);

	const hudResizeObserverRef = useRef<ResizeObserver | null>(null);
	useEffect(() => {
		const observer = new ResizeObserver(() => measureHudSize());
		hudResizeObserverRef.current = observer;
		if (hudBarRef.current) observer.observe(hudBarRef.current);
		if (deviceSelectorRef.current) observer.observe(deviceSelectorRef.current);
		if (webcamBubbleRef.current) observer.observe(webcamBubbleRef.current);
		measureHudSize();
		return () => {
			observer.disconnect();
			hudResizeObserverRef.current = null;
		};
	}, [measureHudSize]);

	const observeHudElement = useCallback(
		<T extends HTMLElement>(el: T | null, ref: React.MutableRefObject<T | null>) => {
			const observer = hudResizeObserverRef.current;
			if (ref.current && observer) observer.unobserve(ref.current);
			ref.current = el;
			if (el && observer) observer.observe(el);
			measureHudSize();
		},
		[measureHudSize],
	);
	const setHudBarEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, hudBarRef),
		[observeHudElement],
	);
	const setDeviceSelectorEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, deviceSelectorRef),
		[observeHudElement],
	);
	const setWebcamBubbleEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, webcamBubbleRef),
		[observeHudElement],
	);
	const setLanguageMenuPanelEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, languageMenuPanelRef),
		[observeHudElement],
	);

	const hudMouseEventsEnabledRef = useRef<boolean | undefined>(undefined);
	const setHudMouseEventsEnabled = useCallback((enabled: boolean) => {
		if (hudMouseEventsEnabledRef.current === enabled) {
			return;
		}
		hudMouseEventsEnabledRef.current = enabled;
		window.electronAPI?.setHudOverlayIgnoreMouseEvents?.(!enabled);
	}, []);

	const isLanguageMenuOpenRef = useRef(isLanguageMenuOpen);
	isLanguageMenuOpenRef.current = isLanguageMenuOpen;

	useEffect(() => {
		setHudMouseEventsEnabled(false);

		const handleGlobalMouseMove = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			const isDraggingAny = isDraggingHudRef.current || isDraggingBubbleRef.current;
			const isInteractive =
				isLanguageMenuOpenRef.current ||
				isDraggingAny ||
				Boolean(target?.closest("[data-hud-interactive='true']"));
			setHudMouseEventsEnabled(isInteractive);
		};

		const handleGlobalMouseLeave = (event: MouseEvent) => {
			if (!event.relatedTarget) {
				const isDraggingAny = isDraggingHudRef.current || isDraggingBubbleRef.current;
				if (!isLanguageMenuOpenRef.current && !isDraggingAny) {
					setHudMouseEventsEnabled(false);
				}
			}
		};

		const handleBlur = () => {
			const isDraggingAny = isDraggingHudRef.current || isDraggingBubbleRef.current;
			if (!isLanguageMenuOpenRef.current && !isDraggingAny) {
				setHudMouseEventsEnabled(false);
			}
		};

		window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
		document.addEventListener("mouseleave", handleGlobalMouseLeave);
		window.addEventListener("blur", handleBlur);

		return () => {
			window.removeEventListener("mousemove", handleGlobalMouseMove);
			document.removeEventListener("mouseleave", handleGlobalMouseLeave);
			window.removeEventListener("blur", handleBlur);
			window.electronAPI?.setHudOverlayIgnoreMouseEvents?.(false);
		};
	}, [setHudMouseEventsEnabled]);

	useEffect(() => {
		setHudMouseEventsEnabled(isLanguageMenuOpen);
	}, [isLanguageMenuOpen, setHudMouseEventsEnabled]);

	const [selectedSource, setSelectedSource] = useState("Screen");
	const [hasSelectedSource, setHasSelectedSource] = useState(false);
	const [, setRecordPointerDownCount] = useState(0);

	useEffect(() => {
		const checkSelectedSource = async () => {
			if (window.electronAPI) {
				const source = await window.electronAPI.getSelectedSource();
				if (source) {
					setSelectedSource(source.name);
					setHasSelectedSource(true);
				} else {
					setSelectedSource("Screen");
					setHasSelectedSource(false);
				}
			}
		};

		checkSelectedSource();

		const interval = setInterval(checkSelectedSource, 500);
		return () => clearInterval(interval);
	}, []);

	const openSourceSelector = async () => {
		if (window.electronAPI) {
			await openSourceSelectorWithPermissionRetry({
				openSourceSelector: () => window.electronAPI.openSourceSelector(),
				requestScreenAccess: () => window.electronAPI.requestScreenAccess(),
			});
		}
	};

	const sendHudOverlayHide = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayHide) {
			window.electronAPI.hudOverlayHide();
		}
	};
	const sendHudOverlayClose = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayClose) {
			window.electronAPI.hudOverlayClose();
		}
	};
	/** Switches the HUD between horizontal and vertical tray layouts. */
	const toggleTrayLayout = () => {
		const nextLayout = trayLayout === "horizontal" ? "vertical" : "horizontal";
		setTrayLayout(nextLayout);
		saveUserPreferences({ trayLayout: nextLayout });
	};

	const toggleMicrophone = () => {
		if (!recording) {
			setMicrophoneEnabled(!microphoneEnabled);
		}
	};
	const HUD_OFFSET_STORAGE_KEY = "ocal_hud_drag_offset";
	const [hudOffset, setHudOffset] = useState<{ x: number; y: number }>(() => {
		try {
			const saved = localStorage.getItem("ocal_hud_drag_offset");
			if (saved) {
				const parsed = JSON.parse(saved);
				if (typeof parsed.x === "number" && typeof parsed.y === "number") {
					return parsed;
				}
			}
		} catch {
			// Fallback
		}
		return { x: 0, y: 0 };
	});
	const hudOffsetRef = useRef(hudOffset);
	hudOffsetRef.current = hudOffset;

	const isDraggingHudRef = useRef(false);
	const isDraggingBubbleRef = useRef(false);
	const dragStartPointerRef = useRef<{
		startX: number;
		startY: number;
		initX: number;
		initY: number;
	} | null>(null);

	const handleHudDragPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setHudMouseEventsEnabled(true);
		isDraggingHudRef.current = true;
		dragStartPointerRef.current = {
			startX: event.clientX,
			startY: event.clientY,
			initX: hudOffsetRef.current.x,
			initY: hudOffsetRef.current.y,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handleHudDragPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingHudRef.current || !dragStartPointerRef.current) return;
		const dx = event.clientX - dragStartPointerRef.current.startX;
		const dy = event.clientY - dragStartPointerRef.current.startY;

		const nextX = dragStartPointerRef.current.initX + dx;
		const nextY = dragStartPointerRef.current.initY + dy;

		const barEl = hudBarRef.current;
		let clampedX = nextX;
		let clampedY = nextY;

		if (barEl) {
			const halfWidth = barEl.offsetWidth / 2;
			const barHeight = barEl.offsetHeight;
			const vw = window.innerWidth || 1920;
			const vh = window.innerHeight || 1080;

			const minX = -(vw / 2 - halfWidth - 10);
			const maxX = vw / 2 - halfWidth - 10;
			clampedX = Math.min(maxX, Math.max(minX, nextX));

			const minY = -(vh - 20 - barHeight - 10);
			const maxY = 10;
			clampedY = Math.min(maxY, Math.max(minY, nextY));
		}

		hudOffsetRef.current = { x: clampedX, y: clampedY };
		setHudOffset({ x: clampedX, y: clampedY });
	};

	const handleHudDragPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingHudRef.current) return;
		isDraggingHudRef.current = false;
		dragStartPointerRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		try {
			localStorage.setItem(HUD_OFFSET_STORAGE_KEY, JSON.stringify(hudOffsetRef.current));
		} catch {
			// ignore storage error
		}
	};

	return (
		<div
			className={`h-full w-full min-w-0 max-w-full overflow-x-hidden overflow-y-hidden bg-transparent ${styles.electronNoDrag}`}
			style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
			onPointerMove={(event) => {
				const target = event.target as HTMLElement | null;
				const isDraggingAny = isDraggingHudRef.current || isDraggingBubbleRef.current;
				const shouldCapture =
					isLanguageMenuOpen ||
					isDraggingAny ||
					Boolean(target?.closest("[data-hud-interactive='true']"));
				setHudMouseEventsEnabled(shouldCapture);
			}}
			onPointerLeave={() => {
				const isDraggingAny = isDraggingHudRef.current || isDraggingBubbleRef.current;
				if (!isLanguageMenuOpen && !isDraggingAny) {
					setHudMouseEventsEnabled(false);
				}
			}}
		>
			<WebcamPreviewBubble
				ref={setWebcamBubbleEl}
				stream={webcamStream}
				enabled={webcamEnabled}
				isLight={isLight}
				onDraggingChange={(isDragging) => {
					isDraggingBubbleRef.current = isDragging;
					if (isDragging) {
						setHudMouseEventsEnabled(true);
					}
				}}
			/>

			{systemLocaleSuggestion && (
				<div
					data-hud-interactive="true"
					className={`fixed top-8 left-1/2 z-30 w-[calc(100vw-1rem)] max-w-[520px] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#0e0f14]/95 p-4 shadow-2xl backdrop-blur-2xl text-white animate-in fade-in-0 zoom-in-95 duration-200 ${styles.electronNoDrag}`}
				>
					<div className="text-[13px] font-semibold text-white">
						{t("systemLanguagePrompt.title")}
					</div>
					<div className="mt-1 text-[11px] leading-relaxed text-zinc-300">
						{t("systemLanguagePrompt.description", {
							language: suggestedLanguageName,
						})}
					</div>
					<div className="mt-3 flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={dismissSystemLocaleSuggestion}
							className="h-7 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
						>
							{t("systemLanguagePrompt.keepDefault")}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={acceptSystemLocaleSuggestion}
							className="h-7 text-xs bg-white text-[#10121b] font-medium hover:bg-white/90"
						>
							{t("systemLanguagePrompt.switch", {
								language: suggestedLanguageName,
							})}
						</Button>
					</div>
				</div>
			)}

			{/* Device selectors popup */}
			{(showMicControls || showWebcamControls) && (
				<div
					ref={setDeviceSelectorEl}
					data-hud-interactive="true"
					className={`fixed left-1/2 flex items-center gap-2 animate-mic-panel-in ${trayLayout === "vertical" ? "" : "bottom-[68px]"} ${styles.electronNoDrag}`}
					style={{
						transform: `translate(calc(-50% + ${hudOffset.x}px), ${hudOffset.y}px)`,
						...(trayLayout === "vertical"
							? { bottom: hudBarHeight + HUD_DEVICE_POPUP_GAP }
							: undefined),
					}}
				>
					{/* Mic selector */}
					{showMicControls && (
						<div
							className={`flex h-9 items-center gap-2 overflow-hidden rounded-full border ${
								isLight
									? "border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur-xl"
									: "border-white/12 bg-[#0e0f14]/95 text-white backdrop-blur-2xl"
							} px-3 py-1.5 transition-all duration-300 ${!micExpanded ? "opacity-75 grayscale-[0.3]" : "opacity-100"}`}
							onMouseEnter={handleMicEnter}
							onMouseLeave={handleMicLeave}
							onFocus={() => {
								if (micLeaveTimeoutRef.current) clearTimeout(micLeaveTimeoutRef.current);
								setIsMicFocused(true);
							}}
							onBlur={() => {
								setIsMicFocused(false);
								handleMicLeave();
							}}
							style={{
								width: micExpanded ? "240px" : "140px",
								transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
							}}
						>
							<div className="relative flex-1 min-w-0">
								{!micExpanded && (
									<div
										className={`text-[10px] font-semibold truncate ${isLight ? "text-zinc-700" : "text-zinc-300"}`}
									>
										{selectedMicLabel}
									</div>
								)}
								<select
									value={microphoneDeviceId || selectedMicId}
									onFocus={() => {
										if (micLeaveTimeoutRef.current) clearTimeout(micLeaveTimeoutRef.current);
										setIsMicFocused(true);
									}}
									onBlur={() => {
										setIsMicFocused(false);
										handleMicLeave();
									}}
									onChange={(e) => {
										const selectedDevice = micDevices.find((d) => d.deviceId === e.target.value);
										setSelectedMicId(e.target.value);
										setMicrophoneDeviceId(e.target.value);
										setMicrophoneDeviceName(selectedDevice?.label);
									}}
									className={`w-full appearance-none text-[11px] rounded-lg pl-2 pr-6 py-1 border outline-none transition-colors cursor-pointer ${
										isLight
											? "bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-200"
											: "bg-white/5 text-white border-white/10 hover:bg-white/10"
									} ${!micExpanded ? "sr-only" : ""}`}
								>
									{micDevices.map((device) => (
										<option
											key={device.deviceId}
											value={device.deviceId}
											className={isLight ? "bg-white text-zinc-900" : "bg-[#181920] text-white"}
										>
											{device.label}
										</option>
									))}
								</select>
								{micExpanded && (
									<ChevronDown
										size={12}
										className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
									/>
								)}
							</div>
							<AudioLevelMeter
								level={level}
								className={`${micExpanded ? "w-16" : "w-8"} h-2 transition-all duration-300`}
							/>
						</div>
					)}

					{/* Webcam selector */}
					{showWebcamControls && (
						<div
							className={`flex h-9 items-center gap-2 overflow-hidden rounded-full border ${
								isLight
									? "border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur-xl"
									: "border-white/12 bg-[#0e0f14]/95 text-white backdrop-blur-2xl"
							} px-3 py-1.5 transition-all duration-300 ${!webcamExpanded ? "opacity-75 grayscale-[0.3]" : "opacity-100"}`}
							onMouseEnter={handleWebcamEnter}
							onMouseLeave={handleWebcamLeave}
							onFocus={() => {
								if (webcamLeaveTimeoutRef.current) clearTimeout(webcamLeaveTimeoutRef.current);
								setIsWebcamFocused(true);
							}}
							onBlur={() => {
								setIsWebcamFocused(false);
								handleWebcamLeave();
							}}
							style={{
								width: webcamExpanded ? "240px" : "140px",
								transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
							}}
						>
							<div className="relative flex-1 min-w-0">
								{!webcamExpanded && (
									<div
										className={`text-[10px] font-semibold truncate ${isLight ? "text-zinc-700" : "text-zinc-300"}`}
									>
										{selectedCameraLabel}
									</div>
								)}
								{webcamExpanded &&
									(isCameraDevicesLoading ? (
										<span
											className={`text-[10px] italic ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
										>
											{t("webcam.searching")}
										</span>
									) : cameraDevicesError ? (
										<span
											className={`text-[10px] italic ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
										>
											{t("webcam.unavailable")}
										</span>
									) : cameraDevices.length === 0 ? (
										<span
											className={`text-[10px] italic ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
										>
											{t("webcam.noneFound")}
										</span>
									) : (
										<>
											<select
												value={webcamDeviceId || selectedCameraId}
												onFocus={() => {
													if (webcamLeaveTimeoutRef.current)
														clearTimeout(webcamLeaveTimeoutRef.current);
													setIsWebcamFocused(true);
												}}
												onBlur={() => {
													setIsWebcamFocused(false);
													handleWebcamLeave();
												}}
												onChange={(e) => {
													const device = cameraDevices.find(
														(item) => item.deviceId === e.target.value,
													);
													setSelectedCameraId(e.target.value);
													setWebcamDeviceId(e.target.value);
													setWebcamDeviceName(device?.label);
												}}
												className={`w-full appearance-none text-[11px] rounded-lg pl-2 pr-6 py-1 border outline-none transition-colors cursor-pointer ${
													isLight
														? "bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-200"
														: "bg-white/5 text-white border-white/10 hover:bg-white/10"
												}`}
											>
												{cameraDevices.map((device) => (
													<option
														key={device.deviceId}
														value={device.deviceId}
														className={
															isLight ? "bg-white text-zinc-900" : "bg-[#181920] text-white"
														}
													>
														{device.label}
													</option>
												))}
											</select>
											<ChevronDown
												size={12}
												className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
											/>
										</>
									))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Floating HUD Bar */}
			<div
				ref={setHudBarEl}
				data-hud-interactive="true"
				data-tray-layout={trayLayout}
				className={`fixed bottom-5 left-1/2 flex rounded-full transition-colors duration-150 select-none ${styles.noScrollbar} ${
					isLight ? styles.hudBarLight : styles.hudBarDark
				} ${
					trayLayout === "vertical"
						? "max-h-[calc(100vh-2.5rem)] flex-col items-center gap-2 overflow-y-auto px-2 py-3 w-[54px]"
						: "items-center gap-2.5 px-3 py-1.5"
				}`}
				style={{
					transform: `translate(calc(-50% + ${hudOffset.x}px), ${hudOffset.y}px)`,
				}}
				onPointerEnter={() => setHudMouseEventsEnabled(true)}
				onPointerDown={() => setHudMouseEventsEnabled(true)}
				onMouseEnter={() => setHudMouseEventsEnabled(true)}
				onMouseLeave={() => {
					if (!isLanguageMenuOpen && !isDraggingHudRef.current) {
						setHudMouseEventsEnabled(false);
					}
				}}
			>
				{/* Brand Logo & Pill */}
				{trayLayout === "vertical" ? (
					<div className="flex flex-col items-center gap-1 pt-0.5 pb-0.5">
						<span
							className={`text-[11px] font-black tracking-tight leading-none ${isLight ? "text-zinc-900" : "text-white"}`}
						>
							ocal
						</span>
						<span
							className="rounded-full px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider leading-none"
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						>
							REC
						</span>
					</div>
				) : (
					<div className="flex items-center gap-1.5 pl-0.5">
						<span
							className={`text-[13px] font-extrabold tracking-tight ${isLight ? "text-zinc-950" : "text-white"}`}
						>
							ocal
						</span>
						<span
							className="rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider transition-all duration-200"
							style={{
								backgroundColor: activeAccent.hex,
								color: activeAccent.textHex,
							}}
						>
							SCREEN
						</span>
					</div>
				)}

				{/* Drag Handle */}
				<div
					className={`flex ${trayLayout === "vertical" ? "h-3.5 w-full my-0.5" : "h-7 w-4"} cursor-grab items-center justify-center opacity-40 hover:opacity-100 transition-opacity active:cursor-grabbing ${styles.electronNoDrag}`}
					onPointerDown={handleHudDragPointerDown}
					onPointerMove={handleHudDragPointerMove}
					onPointerUp={handleHudDragPointerEnd}
					onPointerCancel={handleHudDragPointerEnd}
					title={t("tooltips.dragHUD") || "Drag toolbar"}
				>
					{trayLayout === "vertical" ? (
						<div className="w-4 h-1 rounded-full bg-current opacity-60" />
					) : (
						<div className="flex gap-0.5 items-center">
							<div
								className={`w-1 h-3.5 rounded-full ${isLight ? "bg-black/40" : "bg-white/40"}`}
							/>
							<div
								className={`w-1 h-3.5 rounded-full ${isLight ? "bg-black/40" : "bg-white/40"}`}
							/>
						</div>
					)}
				</div>

				{/* Layout Switcher */}
				<Tooltip
					content={
						trayLayout === "horizontal"
							? t("tooltips.useVerticalTray")
							: t("tooltips.useHorizontalTray")
					}
				>
					<button
						data-testid="launch-tray-layout-button"
						type="button"
						aria-label={
							trayLayout === "horizontal"
								? t("tooltips.useVerticalTray")
								: t("tooltips.useHorizontalTray")
						}
						aria-pressed={trayLayout === "vertical"}
						className={`${iconBtnClasses} ${styles.electronNoDrag}`}
						onClick={toggleTrayLayout}
					>
						{trayLayout === "horizontal" ? (
							<Columns3 size={ICON_SIZE} className={isLight ? "text-zinc-600" : "text-zinc-400"} />
						) : (
							<Rows3 size={ICON_SIZE} className={isLight ? "text-zinc-600" : "text-zinc-400"} />
						)}
					</button>
				</Tooltip>

				{/* Source selector */}
				<button
					data-testid="launch-source-selector-button"
					className={`${
						isLight
							? "bg-zinc-100 hover:bg-zinc-200/80 active:bg-zinc-300 text-zinc-900 border border-zinc-200/80"
							: "bg-white/[0.06] hover:bg-white/[0.11] active:bg-white/[0.16] text-zinc-200 hover:text-white border border-white/[0.08]"
					} flex items-center gap-1.5 rounded-full transition-all duration-150 active:scale-95 ${
						trayLayout === "vertical" ? "w-8 h-8 justify-center p-0" : "h-7 px-2.5"
					} ${styles.electronNoDrag}`}
					onClick={openSourceSelector}
					disabled={recording}
					title={selectedSource}
					aria-label={selectedSource}
				>
					{getIcon("monitor", isLight ? "text-zinc-800" : "text-zinc-200")}
					<span
						className={`${trayLayout === "vertical" ? "sr-only" : "max-w-[84px]"} truncate text-[11px] font-medium tracking-tight`}
					>
						{selectedSource}
					</span>
				</button>

				{/* Media controls capsule */}
				<div
					className={`flex items-center rounded-full border ${
						isLight ? "border-black/[0.06] bg-black/[0.04]" : "border-white/[0.08] bg-black/40"
					} ${trayLayout === "vertical" ? "flex-col gap-1 p-1" : "gap-0.5 p-0.5"} ${styles.electronNoDrag}`}
				>
					<button
						data-testid="launch-system-audio-button"
						className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer active:scale-95 ${
							systemAudioEnabled
								? isLight
									? "bg-zinc-900 text-white font-bold"
									: "bg-white text-zinc-950 font-bold"
								: isLight
									? "text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.06]"
									: "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
						}`}
						onClick={() => !recording && setSystemAudioEnabled(!systemAudioEnabled)}
						disabled={recording}
						title={
							systemAudioEnabled ? t("audio.disableSystemAudio") : t("audio.enableSystemAudio")
						}
					>
						{getIcon("volumeOn")}
					</button>

					<button
						data-testid="launch-microphone-button"
						className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer active:scale-95 ${
							microphoneEnabled
								? isLight
									? "bg-zinc-900 text-white font-bold"
									: "bg-white text-zinc-950 font-bold"
								: isLight
									? "text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.06]"
									: "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
						}`}
						onMouseEnter={handleMicEnter}
						onMouseLeave={handleMicLeave}
						onClick={toggleMicrophone}
						disabled={recording}
						title={microphoneEnabled ? t("audio.disableMicrophone") : t("audio.enableMicrophone")}
						onPointerDown={() => {
							setRecordPointerDownCount((count) => count + 1);
						}}
					>
						{getIcon(microphoneEnabled ? "micOn" : "micOff")}
					</button>

					<button
						data-testid="launch-webcam-button"
						className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer active:scale-95 ${
							webcamEnabled
								? isLight
									? "bg-zinc-900 text-white font-bold"
									: "bg-white text-zinc-950 font-bold"
								: isLight
									? "text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.06]"
									: "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
						}`}
						onMouseEnter={handleWebcamEnter}
						onMouseLeave={handleWebcamLeave}
						onClick={async () => {
							await setWebcamEnabled(!webcamEnabled);
						}}
						disabled={recording}
						title={webcamEnabled ? t("webcam.disableWebcam") : t("webcam.enableWebcam")}
					>
						{getIcon(webcamEnabled ? "webcamOn" : "webcamOff")}
					</button>

					{supportsCursorModeToggle && (
						<button
							data-testid="launch-cursor-mode-button"
							className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer active:scale-95 ${
								cursorCaptureMode === "editable-overlay"
									? isLight
										? "font-bold"
										: "bg-white/20"
									: isLight
										? "text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.06]"
										: "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
							}`}
							style={
								cursorCaptureMode === "editable-overlay"
									? isLight
										? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
										: { color: activeAccent.hex }
									: undefined
							}
							onClick={() =>
								!recording &&
								setCursorCaptureMode(
									cursorCaptureMode === "editable-overlay" ? "system" : "editable-overlay",
								)
							}
							disabled={recording}
							title={
								cursorCaptureMode === "editable-overlay"
									? t("cursor.useSystemCursor")
									: t("cursor.useEditableCursor")
							}
						>
							{getIcon("cursor")}
						</button>
					)}
				</div>

				{/* Record / Stop Button */}
				<button
					data-testid="launch-record-button"
					className={`flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
						trayLayout === "vertical" ? "w-8 h-8 p-0" : "px-3 py-1 min-h-[30px]"
					} ${styles.electronNoDrag} ${
						recording
							? paused
								? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
								: "bg-red-500/25 text-red-300 border border-red-500/50"
							: hasSelectedSource
								? isLight
									? "bg-red-500 hover:bg-red-600 text-white border border-red-600/40"
									: "bg-gradient-to-r from-red-500/30 to-red-600/20 hover:from-red-500/40 hover:to-red-600/30 text-red-300 hover:text-red-200 border border-red-500/40"
								: "bg-white/5 text-zinc-500 border border-white/5 cursor-not-allowed"
					}`}
					onClick={toggleRecording}
					disabled={!hasSelectedSource && !recording}
					style={{ flex: "0 0 auto" }}
				>
					<div
						className={`flex items-center justify-center ${recording && trayLayout !== "vertical" ? "gap-2" : ""}`}
					>
						{recording ? (
							getIcon("stop", paused ? "text-amber-300" : "text-red-300")
						) : (
							<div className="flex items-center gap-1.5">
								<div
									className={`w-2.5 h-2.5 rounded-full transition-all ${
										hasSelectedSource
											? isLight
												? "bg-white animate-pulse"
												: "bg-red-400"
											: "bg-zinc-600"
									}`}
								/>
								{trayLayout !== "vertical" && (
									<span
										className={`text-[11px] font-bold tracking-tight ${isLight ? "text-white" : "text-zinc-100"}`}
									>
										REC
									</span>
								)}
							</div>
						)}
						{recording && trayLayout !== "vertical" && (
							<span
								className={`${paused ? "text-amber-300" : "text-red-300"} inline-block min-w-[36px] text-left text-xs font-mono font-bold tabular-nums`}
							>
								{formatTimePadded(elapsedSeconds)}
							</span>
						)}
					</div>
				</button>

				{/* Active Recording Secondary Controls */}
				{recording && (
					<div
						className={`flex items-center gap-1 ${trayLayout === "vertical" ? "flex-col gap-1" : ""} ${styles.electronNoDrag}`}
					>
						{canPauseRecording && (
							<Tooltip
								content={paused ? t("tooltips.resumeRecording") : t("tooltips.pauseRecording")}
							>
								<button className={hudAuxIconBtnClasses} onClick={togglePaused}>
									{getIcon(
										paused ? "resume" : "pause",
										paused ? "text-amber-400" : "text-white/75",
									)}
								</button>
							</Tooltip>
						)}
						<Tooltip content={t("tooltips.restartRecording")}>
							<button className={hudAuxIconBtnClasses} onClick={restartRecording}>
								{getIcon("restart", "text-white/75")}
							</button>
						</Tooltip>
						<Tooltip content={t("tooltips.cancelRecording")}>
							<button className={hudAuxIconBtnClasses} onClick={cancelRecording}>
								{getIcon("cancel", "text-white/75")}
							</button>
						</Tooltip>
					</div>
				)}

				{/* Studio Editor Button */}
				{!recording && (
					<Tooltip content={t("tooltips.openStudio")}>
						<button
							data-testid="launch-open-studio-button"
							className={`${iconBtnClasses} ${styles.electronNoDrag}`}
							onClick={() => window.electronAPI.switchToEditor()}
						>
							<Clapperboard
								size={ICON_SIZE}
								className={isLight ? "text-zinc-600" : "text-zinc-400"}
							/>
						</button>
					</Tooltip>
				)}

				{/* Right Utilities Divider */}
				<div
					className={`${
						trayLayout === "vertical"
							? isLight
								? "w-6 h-[1px] bg-black/10 my-1"
								: "w-6 h-[1px] bg-white/10 my-1"
							: isLight
								? "h-4 w-[1px] bg-black/10 mx-0.5"
								: "h-4 w-[1px] bg-white/10 mx-0.5"
					} shrink-0`}
				/>

				{/* Right Utilities Section */}
				<div
					className={`flex items-center gap-1.5 ${trayLayout === "vertical" ? "flex-col" : ""} ${styles.electronNoDrag}`}
				>
					{/* Theme Toggle */}
					<Tooltip content={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}>
						<button
							type="button"
							aria-label="Toggle theme"
							className={`${iconBtnClasses} ${styles.electronNoDrag}`}
							onClick={toggleTheme}
						>
							{getIcon(isLight ? "moon" : "sun")}
						</button>
					</Tooltip>

					{/* Language Selector */}
					<div className={`${styles.languageMenuContainer} ${styles.electronNoDrag}`}>
						<button
							ref={languageTriggerRef}
							type="button"
							aria-label={t("language")}
							aria-expanded={isLanguageMenuOpen}
							aria-haspopup="menu"
							onClick={() => setIsLanguageMenuOpen((open) => !open)}
							title={activeLanguageLabel}
							className={`flex h-7 items-center rounded-full border transition-all duration-150 active:scale-95 ${
								isLight
									? "border-zinc-200/80 bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
									: "border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 hover:text-white"
							} ${
								trayLayout === "vertical" ? "w-7 justify-center px-0" : "gap-1.5 px-2.5"
							} ${styles.electronNoDrag}`}
						>
							<Languages size={13} className={isLight ? "text-zinc-600" : "text-zinc-400"} />
							<span
								className={`${trayLayout === "vertical" ? "sr-only" : "max-w-[48px]"} truncate text-[10.5px] font-semibold`}
							>
								{activeLanguageLabel}
							</span>
						</button>
					</div>

					{isLanguageMenuOpen
						? createPortal(
								<div
									ref={setLanguageMenuPanelEl}
									data-hud-interactive="true"
									role="menu"
									className={`${isLight ? styles.languageMenuPanelLight : styles.languageMenuPanel} ${styles.languageMenuScroll} ${styles.electronNoDrag}`}
									style={
										{
											WebkitAppRegion: "no-drag",
											pointerEvents: "auto",
											right: `${languageMenuStyle.right}px`,
											top:
												languageMenuStyle.top !== undefined ? `${languageMenuStyle.top}px` : "auto",
											bottom:
												languageMenuStyle.bottom !== undefined
													? `${languageMenuStyle.bottom}px`
													: "auto",
											maxHeight: `${languageMenuStyle.maxHeight}px`,
										} as React.CSSProperties
									}
									onPointerDown={(event) => event.stopPropagation()}
									onPointerEnter={() => setHudMouseEventsEnabled(true)}
									onPointerMove={() => setHudMouseEventsEnabled(true)}
									onWheel={(event) => {
										setHudMouseEventsEnabled(true);
										event.stopPropagation();
									}}
								>
									{availableLocales.map((loc) => (
										<button
											key={loc}
											type="button"
											role="menuitemradio"
											aria-checked={loc === locale}
											onClick={() => {
												setLocale(loc);
												resolveSystemLocaleSuggestion();
												setIsLanguageMenuOpen(false);
											}}
											className={`${isLight ? styles.languageMenuItemLight : styles.languageMenuItem} ${loc === locale ? (isLight ? styles.languageMenuItemActiveLight : styles.languageMenuItemActive) : ""}`}
										>
											<span className="truncate">{getLocaleName(loc)}</span>
											{loc === locale ? (
												<Check
													size={12}
													className={isLight ? "text-black font-bold" : "text-[#e8ff47]"}
												/>
											) : null}
										</button>
									))}
								</div>,
								document.body,
							)
						: null}

					{/* Window controls (Minimize / Close) */}
					<div
						className={`flex items-center gap-0.5 ${trayLayout === "vertical" ? "flex-col" : ""}`}
					>
						<button
							className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
								isLight
									? "text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.06]"
									: "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
							}`}
							title={t("tooltips.hideHUD")}
							onClick={sendHudOverlayHide}
						>
							{getIcon("minimize")}
						</button>
						<button
							className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
								isLight
									? "text-zinc-500 hover:text-red-600 hover:bg-red-500/10"
									: "text-zinc-400 hover:text-red-400 hover:bg-red-500/20"
							}`}
							title={t("tooltips.closeApp")}
							onClick={sendHudOverlayClose}
						>
							{getIcon("close")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
