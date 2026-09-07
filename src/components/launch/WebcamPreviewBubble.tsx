import { Camera, Circle, FlipHorizontal, Square, X } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

interface WebcamPreviewBubbleProps {
	stream: MediaStream | null;
	enabled: boolean;
	isLight?: boolean;
	onDraggingChange?: (isDragging: boolean) => void;
	onClose?: () => void;
}

type BubbleShape = "rounded" | "circle";
type BubbleSize = "sm" | "md" | "lg";

const STORAGE_KEY_POS = "ocal_cam_preview_pos";
const STORAGE_KEY_SHAPE = "ocal_cam_preview_shape";
const STORAGE_KEY_SIZE = "ocal_cam_preview_size";
const STORAGE_KEY_MIRROR = "ocal_cam_preview_mirror";

function loadSavedPosition(): { x: number; y: number } {
	try {
		const saved = localStorage.getItem(STORAGE_KEY_POS);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (typeof parsed.x === "number" && typeof parsed.y === "number") {
				return parsed;
			}
		}
	} catch {
		// Fallback
	}
	return { x: 32, y: Math.max(40, (window.innerHeight || 800) - 260) };
}

function loadSavedShape(): BubbleShape {
	try {
		const saved = localStorage.getItem(STORAGE_KEY_SHAPE);
		if (saved === "rounded" || saved === "circle") return saved;
	} catch {
		// Fallback
	}
	return "rounded";
}

function loadSavedSize(): BubbleSize {
	try {
		const saved = localStorage.getItem(STORAGE_KEY_SIZE);
		if (saved === "sm" || saved === "md" || saved === "lg") return saved;
	} catch {
		// Fallback
	}
	return "md";
}

function loadSavedMirror(): boolean {
	try {
		const saved = localStorage.getItem(STORAGE_KEY_MIRROR);
		if (saved !== null) return JSON.parse(saved);
	} catch {
		// Fallback
	}
	return true;
}

export const WebcamPreviewBubble = forwardRef<HTMLDivElement, WebcamPreviewBubbleProps>(
	({ stream, enabled, isLight = false, onDraggingChange, onClose }, ref) => {
		const videoRef = useRef<HTMLVideoElement | null>(null);
		const [isMirrored, setIsMirrored] = useState<boolean>(loadSavedMirror);
		const [shape, setShape] = useState<BubbleShape>(loadSavedShape);
		const [size, setSize] = useState<BubbleSize>(loadSavedSize);

		const [position, setPosition] = useState<{ x: number; y: number }>(loadSavedPosition);
		const positionRef = useRef(position);
		positionRef.current = position;

		const isDraggingRef = useRef(false);
		const [isDragging, setIsDragging] = useState(false);
		const dragStartRef = useRef<{
			startX: number;
			startY: number;
			initX: number;
			initY: number;
		} | null>(null);

		const prefs = loadUserPreferences();
		const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;

		useEffect(() => {
			const videoEl = videoRef.current;
			if (!videoEl) return;

			if (stream && enabled) {
				videoEl.srcObject = stream;
				videoEl.play().catch(() => {
					/* playback might be aborted if unmounted */
				});
			} else {
				videoEl.srcObject = null;
			}
		}, [stream, enabled]);

		if (!enabled) return null;

		const handleToggleMirror = (e: React.MouseEvent) => {
			e.stopPropagation();
			const next = !isMirrored;
			setIsMirrored(next);
			try {
				localStorage.setItem(STORAGE_KEY_MIRROR, JSON.stringify(next));
			} catch {
				// Ignore
			}
		};

		const handleToggleShape = (e: React.MouseEvent) => {
			e.stopPropagation();
			const next = shape === "rounded" ? "circle" : "rounded";
			setShape(next);
			try {
				localStorage.setItem(STORAGE_KEY_SHAPE, next);
			} catch {
				// Ignore
			}
		};

		const handleCycleSize = (e: React.MouseEvent) => {
			e.stopPropagation();
			const next: BubbleSize = size === "sm" ? "md" : size === "md" ? "lg" : "sm";
			setSize(next);
			try {
				localStorage.setItem(STORAGE_KEY_SIZE, next);
			} catch {
				// Ignore
			}
		};

		const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
			if ((e.target as HTMLElement).closest("button")) return;
			e.preventDefault();
			e.stopPropagation();
			if (window.electronAPI?.setHudOverlayIgnoreMouseEvents) {
				window.electronAPI.setHudOverlayIgnoreMouseEvents(false);
			}
			isDraggingRef.current = true;
			setIsDragging(true);
			onDraggingChange?.(true);
			dragStartRef.current = {
				startX: e.clientX,
				startY: e.clientY,
				initX: positionRef.current.x,
				initY: positionRef.current.y,
			};
			e.currentTarget.setPointerCapture(e.pointerId);
		};

		const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
			if (!isDraggingRef.current || !dragStartRef.current) return;
			const dx = e.clientX - dragStartRef.current.startX;
			const dy = e.clientY - dragStartRef.current.startY;

			const maxX = Math.max(10, (window.innerWidth || 1200) - 220);
			const maxY = Math.max(10, (window.innerHeight || 800) - 180);

			const newX = Math.min(maxX, Math.max(10, dragStartRef.current.initX + dx));
			const newY = Math.min(maxY, Math.max(10, dragStartRef.current.initY + dy));

			positionRef.current = { x: newX, y: newY };
			setPosition({ x: newX, y: newY });
		};

		const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
			if (!isDraggingRef.current) return;
			isDraggingRef.current = false;
			setIsDragging(false);
			onDraggingChange?.(false);
			dragStartRef.current = null;
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId);
			}
			try {
				localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(positionRef.current));
			} catch {
				// Ignore storage error
			}
		};

		// Dimensions based on shape and size
		const getDimensions = () => {
			if (shape === "circle") {
				switch (size) {
					case "sm":
						return { width: 140, height: 140 };
					case "lg":
						return { width: 240, height: 240 };
					case "md":
					default:
						return { width: 190, height: 190 };
				}
			} else {
				switch (size) {
					case "sm":
						return { width: 190, height: 107 }; // 16:9
					case "lg":
						return { width: 320, height: 180 };
					case "md":
					default:
						return { width: 250, height: 141 };
				}
			}
		};

		const dims = getDimensions();

		return (
			<div
				ref={ref}
				data-hud-interactive="true"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				className={cn(
					"fixed z-50 overflow-hidden select-none cursor-grab active:cursor-grabbing group transition-all duration-200 backdrop-blur-xl",
					shape === "circle" ? "rounded-full aspect-square" : "rounded-2xl",
					isLight
						? "bg-white/90 border border-black/10 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.18)]"
						: "bg-[#0b0c10]/95 border border-white/15 shadow-[0_20px_48px_-10px_rgba(0,0,0,0.85)]",
					isDragging && "scale-[1.03] ring-2",
				)}
				style={
					{
						WebkitAppRegion: "no-drag",
						left: `${position.x}px`,
						top: `${position.y}px`,
						width: `${dims.width}px`,
						height: `${dims.height}px`,
						borderColor: isDragging ? activeAccent.hex : undefined,
					} as React.CSSProperties
				}
			>
				{/* Full-bleed video frame */}
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className={cn(
						"w-full h-full object-cover transition-transform duration-200 pointer-events-none select-none",
						isMirrored && "-scale-x-100",
					)}
				/>

				{/* Connecting camera state */}
				{!stream && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 text-white/80 p-3 text-center gap-1.5 pointer-events-none">
						<Camera className="w-5 h-5 text-emerald-400 animate-pulse" />
						<span className="text-[10px] font-semibold tracking-tight">Connecting camera…</span>
					</div>
				)}

				{/* Floating Header Chip (Hover Overlay) */}
				<div
					className={cn(
						"absolute inset-x-2 top-2 flex items-center justify-between pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100",
						shape === "circle" ? "px-2" : "px-0.5",
					)}
				>
					{/* Live Indicator Pill */}
					<div
						className={cn(
							"flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md shadow-md pointer-events-auto",
							isLight
								? "bg-white/90 border border-black/10 text-zinc-900"
								: "bg-black/70 border border-white/15 text-white",
						)}
					>
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
						</span>
						<span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-500">
							LIVE
						</span>
					</div>

					{/* Floating Controls Cluster */}
					<div
						className={cn(
							"flex items-center gap-1 p-0.5 rounded-full backdrop-blur-md shadow-md pointer-events-auto",
							isLight
								? "bg-white/90 border border-black/10 text-zinc-800"
								: "bg-black/70 border border-white/15 text-white",
						)}
					>
						{/* Mirror toggle */}
						<button
							type="button"
							onClick={handleToggleMirror}
							title="Flip mirror"
							className={cn(
								"p-1 rounded-full transition-all duration-150 cursor-pointer active:scale-95",
								isLight ? "hover:bg-black/10 text-zinc-700" : "hover:bg-white/20 text-white/90",
							)}
						>
							<FlipHorizontal size={12} />
						</button>

						{/* Shape toggle */}
						<button
							type="button"
							onClick={handleToggleShape}
							title={shape === "circle" ? "Switch to Rounded" : "Switch to Circle"}
							className={cn(
								"p-1 rounded-full transition-all duration-150 cursor-pointer active:scale-95",
								isLight ? "hover:bg-black/10 text-zinc-700" : "hover:bg-white/20 text-white/90",
							)}
						>
							{shape === "circle" ? <Square size={12} /> : <Circle size={12} />}
						</button>

						{/* Size cycle */}
						<button
							type="button"
							onClick={handleCycleSize}
							title={`Size: ${size.toUpperCase()} (Click to change)`}
							className={cn(
								"px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase transition-all duration-150 cursor-pointer active:scale-95",
								isLight ? "hover:bg-black/10 text-zinc-700" : "hover:bg-white/20 text-white/90",
							)}
						>
							{size}
						</button>

						{/* Close button */}
						{onClose && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onClose();
								}}
								title="Hide preview"
								className={cn(
									"p-1 rounded-full transition-all duration-150 cursor-pointer active:scale-95",
									isLight
										? "hover:bg-red-500/10 hover:text-red-600 text-zinc-700"
										: "hover:bg-red-500/20 hover:text-red-400 text-white/90",
								)}
							>
								<X size={12} />
							</button>
						)}
					</div>
				</div>
			</div>
		);
	},
);

WebcamPreviewBubble.displayName = "WebcamPreviewBubble";
