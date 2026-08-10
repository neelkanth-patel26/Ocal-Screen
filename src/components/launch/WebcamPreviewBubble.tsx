import { useState, useEffect, useRef, forwardRef } from "react";
import { Camera, Move, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebcamPreviewBubbleProps {
	stream: MediaStream | null;
	enabled: boolean;
	isLight?: boolean;
}

const STORAGE_KEY = "ocal_cam_preview_pos";

export const WebcamPreviewBubble = forwardRef<HTMLDivElement, WebcamPreviewBubbleProps>(
	({ stream, enabled, isLight = false }, ref) => {
		const videoRef = useRef<HTMLVideoElement | null>(null);
		const [isMirrored, setIsMirrored] = useState(true);

		// Position state: absolute screen coordinates (px)
		const [position, setPosition] = useState<{ x: number; y: number }>(() => {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (typeof parsed.x === "number" && typeof parsed.y === "number") {
						return parsed;
					}
				}
			} catch {
				// Fallback to default position
			}
			return { x: 30, y: Math.max(40, (window.innerHeight || 800) - 220) };
		});

		const [isDragging, setIsDragging] = useState(false);
		const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

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
			setIsDragging(true);
			dragStartRef.current = {
				startX: e.clientX,
				startY: e.clientY,
				initX: position.x,
				initY: position.y,
			};
			e.currentTarget.setPointerCapture(e.pointerId);
		};

		const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
			if (!isDragging || !dragStartRef.current) return;
			const dx = e.clientX - dragStartRef.current.startX;
			const dy = e.clientY - dragStartRef.current.startY;

			const maxX = Math.max(10, (window.innerWidth || 1200) - 230);
			const maxY = Math.max(10, (window.innerHeight || 800) - 170);

			const newX = Math.min(maxX, Math.max(10, dragStartRef.current.initX + dx));
			const newY = Math.min(maxY, Math.max(10, dragStartRef.current.initY + dy));

			setPosition({ x: newX, y: newY });
		};

		const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
			if (!isDragging) return;
			setIsDragging(false);
			dragStartRef.current = null;
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId);
			}
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
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
					"fixed z-50 flex flex-col rounded-2xl border overflow-hidden shadow-2xl transition-shadow select-none animate-in fade-in-0 zoom-in-95 duration-200 cursor-grab active:cursor-grabbing group",
					isLight
						? "border-slate-300 bg-white/95 text-slate-900 shadow-slate-400/30"
						: "border-white/20 bg-[#0c0c0e]/95 text-white shadow-black/90",
					isDragging && "scale-[1.02] shadow-2xl border-emerald-500",
				)}
				style={
					{
						WebkitAppRegion: "no-drag",
						left: `${position.x}px`,
						top: `${position.y}px`,
						width: "220px",
					} as React.CSSProperties
				}
			>
				{/* Top Header Bar */}
				<div
					className={cn(
						"flex items-center justify-between px-2.5 py-1.5 border-b text-[10px] font-bold shrink-0 transition-colors",
						isLight
							? "bg-slate-100/90 border-slate-200 text-slate-800"
							: "bg-black/70 border-white/10 text-white",
					)}
				>
					<div className="flex items-center gap-1.5">
						<div className="relative flex items-center justify-center">
							<div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
							<div className="w-2 h-2 rounded-full bg-emerald-500 absolute" />
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
						<Move className={cn("w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity")} />
						<button
							type="button"
							onClick={() => setIsMirrored(!isMirrored)}
							title="Flip Mirror"
							className={cn(
								"p-1 rounded transition-colors cursor-pointer",
								isLight ? "hover:bg-slate-200 text-slate-700" : "hover:bg-white/20 text-white/80",
							)}
						>
							<RotateCcw className="w-3 h-3" />
						</button>
					</div>
				</div>

				{/* Video Container */}
				<div className="relative w-full h-[124px] bg-black overflow-hidden flex items-center justify-center">
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
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white/70 p-2 text-center">
							<Camera className="w-5 h-5 mb-1 text-emerald-400 animate-pulse" />
							<span className="text-[10px] font-bold">Connecting Camera...</span>
						</div>
					)}
				</div>

				{/* Bottom Editing Info Note */}
				<div
					className={cn(
						"px-2.5 py-1 text-[9.5px] font-semibold border-t flex items-center gap-1.5 transition-colors",
						isLight
							? "bg-slate-50 border-slate-200 text-slate-600"
							: "bg-white/5 border-white/10 text-white/70",
					)}
				>
					<Sparkles className="w-3 h-3 shrink-0 text-amber-400" />
					<span className="truncate">Can edit layout & mask in editor</span>
				</div>
			</div>
		);
	},
);

WebcamPreviewBubble.displayName = "WebcamPreviewBubble";
