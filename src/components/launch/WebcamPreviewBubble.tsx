import { useState, useEffect, useRef } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebcamPreviewBubbleProps {
	stream: MediaStream | null;
	enabled: boolean;
	isLight?: boolean;
}

export function WebcamPreviewBubble({ stream, enabled, isLight = false }: WebcamPreviewBubbleProps) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [isMirrored, setIsMirrored] = useState(true);
	const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 24 });
	const [isDragging, setIsDragging] = useState(false);
	const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

	useEffect(() => {
		const videoEl = videoRef.current;
		if (!videoEl) return;

		if (stream && enabled) {
			videoEl.srcObject = stream;
			videoEl.play().catch(() => {
				// Autoplay handle
			});
		} else {
			videoEl.srcObject = null;
		}
	}, [stream, enabled]);

	if (!enabled) return null;

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
		dragStartRef.current = {
			x: e.clientX,
			y: e.clientY,
			posX: position.x,
			posY: position.y,
		};
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging || !dragStartRef.current) return;
		const dx = e.clientX - dragStartRef.current.x;
		const dy = e.clientY - dragStartRef.current.y;
		setPosition({
			x: Math.max(12, dragStartRef.current.posX + dx),
			y: Math.max(12, dragStartRef.current.posY + dy),
		});
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		setIsDragging(false);
		dragStartRef.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
	};

	return (
		<div
			data-hud-interactive="true"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			className={cn(
				"fixed z-50 group flex items-center justify-center rounded-full border-2 overflow-hidden shadow-2xl transition-shadow cursor-grab active:cursor-grabbing select-none",
				isLight
					? "border-emerald-500 bg-slate-900/90 shadow-emerald-500/20"
					: "border-emerald-400 bg-black/90 shadow-emerald-400/30",
				isDragging && "scale-105 shadow-2xl",
			)}
			style={{
				left: `${position.x}px`,
				bottom: `${position.y}px`,
				width: "148px",
				height: "148px",
			}}
		>
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className={cn(
					"w-full h-full object-cover rounded-full pointer-events-none transition-transform duration-200",
					isMirrored && "-scale-x-100",
				)}
			/>

			{!stream && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white/70 p-2 text-center">
					<Camera className="w-6 h-6 mb-1 text-emerald-400 animate-pulse" />
					<span className="text-[10px] font-bold">Connecting Camera...</span>
				</div>
			)}

			{/* Corner live indicator dot */}
			<div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/20">
				<div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
				<div className="w-2 h-2 rounded-full bg-emerald-500 absolute" />
				<span className="text-[9px] font-bold text-white uppercase tracking-wider pl-2">LIVE</span>
			</div>

			{/* Controls overlay on hover */}
			<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setIsMirrored(!isMirrored);
					}}
					title="Flip Mirror"
					className="pointer-events-auto p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-colors"
				>
					<RotateCcw className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
