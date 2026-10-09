import { useEffect, useRef, useState } from "react";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { type AspectRatio } from "@/utils/aspectRatioUtils";
import { DEFAULT_SOURCE_DIMENSIONS } from "./editorDefaults";

export interface CropRegion {
	x: number; // 0-1 normalized
	y: number; // 0-1 normalized
	width: number; // 0-1 normalized
	height: number; // 0-1 normalized
}

interface CropControlProps {
	videoElement: HTMLVideoElement | null;
	cropRegion: CropRegion;
	onCropChange: (region: CropRegion) => void;
	aspectRatio: AspectRatio;
}

type DragHandle =
	| "top"
	| "right"
	| "bottom"
	| "left"
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right"
	| "move"
	| null;

export function CropControl({ videoElement, cropRegion, onCropChange }: CropControlProps) {
	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState<DragHandle>(null);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [initialCrop, setInitialCrop] = useState<CropRegion>(cropRegion);

	useEffect(() => {
		if (!videoElement || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) return;

		canvas.width = videoElement.videoWidth || DEFAULT_SOURCE_DIMENSIONS.width;
		canvas.height = videoElement.videoHeight || DEFAULT_SOURCE_DIMENSIONS.height;

		const draw = () => {
			if (videoElement.readyState >= 2) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
			}
			requestAnimationFrame(draw);
		};

		const rafId = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(rafId);
	}, [videoElement]);

	const getContainerRect = () => {
		return (
			containerRef.current?.getBoundingClientRect() || { width: 0, height: 0, left: 0, top: 0 }
		);
	};

	const handlePointerDown = (e: React.PointerEvent, handle: DragHandle) => {
		e.stopPropagation();
		e.preventDefault();
		setIsDragging(handle);
		const rect = getContainerRect();
		setDragStart({
			x: (e.clientX - rect.left) / rect.width,
			y: (e.clientY - rect.top) / rect.height,
		});
		setInitialCrop(cropRegion);

		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!isDragging) return;

		const rect = getContainerRect();
		const currentX = (e.clientX - rect.left) / rect.width;
		const currentY = (e.clientY - rect.top) / rect.height;
		const deltaX = currentX - dragStart.x;
		const deltaY = currentY - dragStart.y;

		let newCrop = { ...initialCrop };

		switch (isDragging) {
			case "top": {
				const newY = Math.max(0, initialCrop.y + deltaY);
				const bottom = initialCrop.y + initialCrop.height;
				newCrop.y = Math.min(newY, bottom - 0.05);
				newCrop.height = bottom - newCrop.y;
				break;
			}
			case "bottom":
				newCrop.height = Math.max(0.05, Math.min(initialCrop.height + deltaY, 1 - initialCrop.y));
				break;
			case "left": {
				const newX = Math.max(0, initialCrop.x + deltaX);
				const right = initialCrop.x + initialCrop.width;
				newCrop.x = Math.min(newX, right - 0.05);
				newCrop.width = right - newCrop.x;
				break;
			}
			case "right":
				newCrop.width = Math.max(0.05, Math.min(initialCrop.width + deltaX, 1 - initialCrop.x));
				break;
			case "top-left": {
				const newX = Math.max(0, initialCrop.x + deltaX);
				const right = initialCrop.x + initialCrop.width;
				newCrop.x = Math.min(newX, right - 0.05);
				newCrop.width = right - newCrop.x;

				const newY = Math.max(0, initialCrop.y + deltaY);
				const bottom = initialCrop.y + initialCrop.height;
				newCrop.y = Math.min(newY, bottom - 0.05);
				newCrop.height = bottom - newCrop.y;
				break;
			}
			case "top-right": {
				newCrop.width = Math.max(0.05, Math.min(initialCrop.width + deltaX, 1 - initialCrop.x));
				const newY = Math.max(0, initialCrop.y + deltaY);
				const bottom = initialCrop.y + initialCrop.height;
				newCrop.y = Math.min(newY, bottom - 0.05);
				newCrop.height = bottom - newCrop.y;
				break;
			}
			case "bottom-left": {
				const newX = Math.max(0, initialCrop.x + deltaX);
				const right = initialCrop.x + initialCrop.width;
				newCrop.x = Math.min(newX, right - 0.05);
				newCrop.width = right - newCrop.x;
				newCrop.height = Math.max(0.05, Math.min(initialCrop.height + deltaY, 1 - initialCrop.y));
				break;
			}
			case "bottom-right": {
				newCrop.width = Math.max(0.05, Math.min(initialCrop.width + deltaX, 1 - initialCrop.x));
				newCrop.height = Math.max(0.05, Math.min(initialCrop.height + deltaY, 1 - initialCrop.y));
				break;
			}
			case "move": {
				const newX = Math.max(0, Math.min(initialCrop.x + deltaX, 1 - initialCrop.width));
				const newY = Math.max(0, Math.min(initialCrop.y + deltaY, 1 - initialCrop.height));
				newCrop.x = newX;
				newCrop.y = newY;
				break;
			}
		}

		onCropChange(newCrop);
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (!isDragging) return;
		setIsDragging(null);
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			// ignore
		}
	};

	const cropPixelX = cropRegion.x * 100;
	const cropPixelY = cropRegion.y * 100;
	const cropPixelWidth = cropRegion.width * 100;
	const cropPixelHeight = cropRegion.height * 100;

	return (
		<div className="flex flex-col items-center select-none">
			<div
				ref={containerRef}
				className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black cursor-crosshair touch-none"
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			>
				{/* Background Video Rendering */}
				<canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" />

				{/* Dark Mask Overlay Outside Crop Box */}
				<div className="absolute inset-0 pointer-events-none">
					<svg className="w-full h-full">
						<defs>
							<mask id="filmoraCropMask">
								<rect width="100%" height="100%" fill="white" />
								<rect
									x={`${cropPixelX}%`}
									y={`${cropPixelY}%`}
									width={`${cropPixelWidth}%`}
									height={`${cropPixelHeight}%`}
									fill="black"
								/>
							</mask>
						</defs>
						<rect
							width="100%"
							height="100%"
							fill="black"
							fillOpacity="0.65"
							mask="url(#filmoraCropMask)"
						/>
					</svg>
				</div>

				{/* Rule of Thirds Grid Lines inside Crop Box */}
				<div
					className="absolute pointer-events-none border"
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY}%`,
						width: `${cropPixelWidth}%`,
						height: `${cropPixelHeight}%`,
						borderColor: activeAccent.hex,
						boxShadow: `0 0 0 1px ${activeAccent.hex}40, inset 0 0 20px rgba(0,0,0,0.4)`,
					}}
				>
					{/* Horizontal rule-of-thirds lines */}
					<div
						className="absolute left-0 right-0 h-px pointer-events-none"
						style={{ top: "33.33%", backgroundColor: "rgba(255,255,255,0.25)" }}
					/>
					<div
						className="absolute left-0 right-0 h-px pointer-events-none"
						style={{ top: "66.66%", backgroundColor: "rgba(255,255,255,0.25)" }}
					/>
					{/* Vertical rule-of-thirds lines */}
					<div
						className="absolute top-0 bottom-0 w-px pointer-events-none"
						style={{ left: "33.33%", backgroundColor: "rgba(255,255,255,0.25)" }}
					/>
					<div
						className="absolute top-0 bottom-0 w-px pointer-events-none"
						style={{ left: "66.66%", backgroundColor: "rgba(255,255,255,0.25)" }}
					/>
				</div>

				{/* Center Move Handle */}
				<div
					className="absolute z-10 pointer-events-auto cursor-move flex items-center justify-center group"
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY}%`,
						width: `${cropPixelWidth}%`,
						height: `${cropPixelHeight}%`,
					}}
					onPointerDown={(e) => handlePointerDown(e, "move")}
				>
					<div
						className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg"
						style={{ color: activeAccent.hex }}
					>
						<span className="text-[10px] font-bold">✥</span>
					</div>
				</div>

				{/* 4 Edge Resize Strips */}
				<div
					className="absolute h-2 cursor-ns-resize z-20 pointer-events-auto"
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY}%`,
						width: `${cropPixelWidth}%`,
						transform: "translateY(-50%)",
					}}
					onPointerDown={(e) => handlePointerDown(e, "top")}
				/>
				<div
					className="absolute h-2 cursor-ns-resize z-20 pointer-events-auto"
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY + cropPixelHeight}%`,
						width: `${cropPixelWidth}%`,
						transform: "translateY(-50%)",
					}}
					onPointerDown={(e) => handlePointerDown(e, "bottom")}
				/>
				<div
					className="absolute w-2 cursor-ew-resize z-20 pointer-events-auto"
					style={{
						left: `${cropPixelX}%`,
						top: `${cropPixelY}%`,
						height: `${cropPixelHeight}%`,
						transform: "translateX(-50%)",
					}}
					onPointerDown={(e) => handlePointerDown(e, "left")}
				/>
				<div
					className="absolute w-2 cursor-ew-resize z-20 pointer-events-auto"
					style={{
						left: `${cropPixelX + cropPixelWidth}%`,
						top: `${cropPixelY}%`,
						height: `${cropPixelHeight}%`,
						transform: "translateX(-50%)",
					}}
					onPointerDown={(e) => handlePointerDown(e, "right")}
				/>

				{/* 4 Corner L-Handles (Filmora style) */}
				<div
					className="absolute w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
					style={{ left: `${cropPixelX}%`, top: `${cropPixelY}%` }}
					onPointerDown={(e) => handlePointerDown(e, "top-left")}
				>
					<div
						className="w-3 h-3 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
						style={{ backgroundColor: activeAccent.hex }}
					/>
				</div>

				<div
					className="absolute w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
					style={{ left: `${cropPixelX + cropPixelWidth}%`, top: `${cropPixelY}%` }}
					onPointerDown={(e) => handlePointerDown(e, "top-right")}
				>
					<div
						className="w-3 h-3 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
						style={{ backgroundColor: activeAccent.hex }}
					/>
				</div>

				<div
					className="absolute w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
					style={{ left: `${cropPixelX}%`, top: `${cropPixelY + cropPixelHeight}%` }}
					onPointerDown={(e) => handlePointerDown(e, "bottom-left")}
				>
					<div
						className="w-3 h-3 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
						style={{ backgroundColor: activeAccent.hex }}
					/>
				</div>

				<div
					className="absolute w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
					style={{
						left: `${cropPixelX + cropPixelWidth}%`,
						top: `${cropPixelY + cropPixelHeight}%`,
					}}
					onPointerDown={(e) => handlePointerDown(e, "bottom-right")}
				>
					<div
						className="w-3 h-3 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
						style={{ backgroundColor: activeAccent.hex }}
					/>
				</div>
			</div>
		</div>
	);
}
