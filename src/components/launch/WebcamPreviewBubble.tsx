import { Camera, Move, RotateCcw, Sparkles } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface WebcamPreviewBubbleProps {
	stream: MediaStream | null;
	enabled: boolean;
	isLight?: boolean;
	onDraggingChange?: (isDragging: boolean) => void;
}

const STORAGE_KEY = "ocal_cam_preview_pos";

function loadSavedPosition(): { x: number; y: number } {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (typeof parsed.x === "number" && typeof parsed.y === "number") {
				return parsed;
			}
		}
	} catch {
		// Fallback
	}
	return { x: 30, y: Math.max(40, (window.innerHeight || 800) - 220) };
}

export const WebcamPreviewBubble = forwardRef<HTMLDivElement, WebcamPreviewBubbleProps>(
	({ stream, enabled, isLight = false, onDraggingChange }, ref) => {
		const videoRef = useRef<HTMLVideoElement | null>(null);
		const [isMirrored, setIsMirrored] = useState(true);

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

		useEffect(() => {
			const videoEl = videoRef.current;
			if (!videoEl) return;

			if (stream && enabled) {
				videoEl.srcObject = stream;
				videoEl.play().catch(() => {});
			} else {
				videoEl.srcObject = null;
			}
		}, [stream, enabled]);

		if (!enabled) return null;

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

			const maxX = Math.max(10, (window.innerWidth || 1200) - 240);
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
				localStorage.setItem(STORAGE_KEY, JSON.stringify(positionRef.current));
			} catch {
				// Ignore storage error
			}
		};

		return (
			<div
				ref={ref}
				data-hud-interactive="true"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				className={cn(
					"fixed z-50 flex flex-col rounded-2xl border overflow-hidden select-none animate-in fade-in-0 zoom-in-95 duration-200 cursor-grab active:cursor-grabbing group",
					isLight
						? "border-slate-300 bg-white/95 text-slate-900"
						: "border-white/20 bg-[#0c0c0e]/95 text-white",
					isDragging && "scale-[1.02] border-emerald-500/70",
				)}
				style={
					{
						WebkitAppRegion: "no-drag",
						left: `${position.x}px`,
						top: `${position.y}px`,
						width: "224px",
					} as React.CSSProperties
				}
			>
				{/* Header bar */}
				<div
					className={cn(
						"flex items-center justify-between px-3 py-2 border-b text-[10px] font-bold shrink-0 transition-colors",
						isLight
							? "bg-slate-100/90 border-slate-200 text-slate-800"
							: "bg-black/70 border-white/10 text-white",
					)}
				>
					<div className="flex items-center gap-1.5">
						{/* Live indicator */}
						<div className="relative flex items-center justify-center w-4 h-4">
							<div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
							<div className="w-2 h-2 rounded-full bg-emerald-500" />
						</div>
						<span
							className={cn(
								"font-extrabold uppercase tracking-wider text-[9px]",
								isLight ? "text-emerald-700" : "text-emerald-400",
							)}
						>
							CAMERA LIVE
						</span>
					</div>

					<div className="flex items-center gap-1">
						<Move
							className={cn(
								"w-3.5 h-3.5 opacity-40 group-hover:opacity-80 transition-opacity",
								isLight ? "text-slate-500" : "text-white/60",
							)}
						/>
						<button
							type="button"
							onClick={() => setIsMirrored(!isMirrored)}
							title="Flip mirror"
							className={cn(
								"p-1 rounded-lg transition-colors cursor-pointer",
								isLight ? "hover:bg-slate-200 text-slate-700" : "hover:bg-white/20 text-white/80",
							)}
						>
							<RotateCcw className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				{/* Video area — 16:9 aspect */}
				<div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: "16/9" }}>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						className={cn(
							"w-full h-full object-cover transition-transform duration-200",
							isMirrored && "-scale-x-100",
						)}
					/>

					{!stream && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white/70 p-2 text-center gap-1.5">
							<Camera className="w-6 h-6 text-emerald-400 animate-pulse" />
							<span className="text-[10px] font-bold">Connecting camera…</span>
						</div>
					)}
				</div>

				{/* Footer note */}
				<div
					className={cn(
						"px-2.5 py-1.5 text-[9.5px] font-semibold border-t flex items-center gap-1.5 transition-colors",
						isLight
							? "bg-slate-50 border-slate-200 text-slate-500"
							: "bg-white/5 border-white/10 text-white/60",
					)}
				>
					<Sparkles className="w-3 h-3 shrink-0 text-amber-400" />
					<span className="truncate">Layout & mask editable in editor</span>
				</div>
			</div>
		);
	},
);

WebcamPreviewBubble.displayName = "WebcamPreviewBubble";
