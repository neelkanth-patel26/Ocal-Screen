import { useState, useEffect, useRef, forwardRef } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebcamPreviewBubbleProps {
	stream: MediaStream | null;
	enabled: boolean;
	isLight?: boolean;
}

export const WebcamPreviewBubble = forwardRef<HTMLDivElement, WebcamPreviewBubbleProps>(
	({ stream, enabled, isLight = false }, ref) => {
		const videoRef = useRef<HTMLVideoElement | null>(null);
		const [isMirrored, setIsMirrored] = useState(true);

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

		return (
			<div
				ref={ref}
				data-hud-interactive="true"
				className={cn(
					"fixed bottom-[68px] left-1/2 -translate-x-1/2 z-50 flex flex-col rounded-2xl border overflow-hidden shadow-2xl transition-all select-none animate-in fade-in-0 zoom-in-95 duration-200",
					isLight
						? "border-slate-300 bg-slate-900/95 text-white shadow-slate-900/50"
						: "border-white/20 bg-black/95 text-white shadow-black/90",
				)}
				style={{
					width: "215px",
					height: "132px",
				}}
			>
				{/* Top Header Bar */}
				<div className="flex items-center justify-between px-2.5 py-1 bg-black/60 backdrop-blur-md border-b border-white/10 text-[10px] font-bold shrink-0">
					<div className="flex items-center gap-1.5">
						<div className="relative flex items-center justify-center">
							<div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
							<div className="w-2 h-2 rounded-full bg-emerald-500 absolute" />
						</div>
						<span className="text-emerald-400 font-extrabold uppercase tracking-wider text-[9px]">
							CAMERA LIVE
						</span>
					</div>

					<button
						type="button"
						onClick={() => setIsMirrored(!isMirrored)}
						title="Flip Mirror"
						className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
					>
						<RotateCcw className="w-3 h-3" />
					</button>
				</div>

				{/* Video Element */}
				<div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
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
			</div>
		);
	},
);

WebcamPreviewBubble.displayName = "WebcamPreviewBubble";
