import {
	Check,
	Copy,
	Crop,
	Gauge,
	Languages,
	Layers,
	Palette,
	RotateCcw,
	Scissors,
	Sliders,
	Trash2,
	VolumeX,
	Wand2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

export interface ContextMenuPosition {
	x: number;
	y: number;
}

export type ClipType = "video" | "audio" | "layer" | "generic";

export const COLOR_MARKS = [
	{ name: "Red", color: "#ef4444" },
	{ name: "Orange", color: "#f97316" },
	{ name: "Amber", color: "#f59e0b" },
	{ name: "Emerald", color: "#10b981" },
	{ name: "Cyan", color: "#06b6d4" },
	{ name: "Blue", color: "#3b82f6" },
	{ name: "Indigo", color: "#6366f1" },
	{ name: "Purple", color: "#a855f7" },
	{ name: "Pink", color: "#ec4899" },
	{ name: "Slate", color: "#64748b" },
];

interface FilmoraClipContextMenuProps {
	position: ContextMenuPosition | null;
	clipType: ClipType;
	clipId: string;
	currentSpeed?: number;
	currentColorMark?: string | null;
	onClose: () => void;
	onSplit?: () => void;
	onSplitAll?: () => void;
	onMoveToNewLayer?: () => void;
	onDelete?: () => void;
	onAdjustAudio?: () => void;
	onCropAndZoom?: () => void;
	onSpeedChange?: (speed: number) => void;
	onColorMarkChange?: (color: string | null) => void;
	onTrimStartToPlayhead?: () => void;
	onTrimEndToPlayhead?: () => void;
	onMuteToggle?: () => void;
	onGenerateCaptions?: () => void;
	onDuplicate?: () => void;
}

export function FilmoraClipContextMenu({
	position,
	clipType,
	clipId: _clipId,
	currentSpeed = 1,
	currentColorMark = null,
	onClose,
	onSplit,
	onSplitAll,
	onMoveToNewLayer,
	onDelete,
	onAdjustAudio,
	onCropAndZoom,
	onSpeedChange,
	onColorMarkChange,
	onTrimStartToPlayhead,
	onTrimEndToPlayhead,
	onMuteToggle,
	onGenerateCaptions,
	onDuplicate,
}: FilmoraClipContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const colorInputRef = useRef<HTMLInputElement>(null);
	const prefs = loadUserPreferences();
	const isLight = prefs.theme === "light";

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		window.addEventListener("mousedown", handleClickOutside);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("mousedown", handleClickOutside);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose]);

	if (!position) return null;

	// Clamp to viewport
	const menuWidth = 275;
	const menuHeight = clipType === "audio" ? 440 : 540;
	const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 12);
	const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 12);

	const isPresetColor = COLOR_MARKS.some(
		(m) => m.color.toLowerCase() === currentColorMark?.toLowerCase(),
	);

	const content = (
		<div
			ref={menuRef}
			data-context-menu="true"
			style={{
				left: `${Math.max(12, adjustedX)}px`,
				top: `${Math.max(12, adjustedY)}px`,
			}}
			className={cn(
				"filmora-context-menu fixed z-[99999] w-[275px] rounded-2xl py-2 text-[12px] select-none font-sans overflow-hidden border backdrop-blur-2xl transition-all shadow-[0_24px_54px_rgba(0,0,0,0.85)]",
				isLight
					? "bg-white/95 border-zinc-200/90 text-zinc-900 shadow-xl"
					: "bg-[#0c0d12]/95 border-white/10 text-zinc-100 shadow-2xl shadow-black/95",
			)}
			onMouseDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			onMouseUp={(e) => e.stopPropagation()}
			onPointerUp={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
		>
			{/* Duplicate & Delete */}
			<div className="px-1.5 space-y-0.5">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDuplicate?.();
						onClose();
					}}
					className={cn(
						"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer group",
						isLight
							? "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950"
							: "hover:bg-white/10 text-zinc-200 hover:text-white",
					)}
				>
					<div className="flex items-center gap-2">
						<Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
						<span>Duplicate</span>
					</div>
					<span
						className={cn(
							"text-[10px] font-mono px-1.5 py-0.5 rounded border",
							isLight
								? "bg-zinc-100 border-zinc-200 text-zinc-500"
								: "bg-white/5 border-white/10 text-zinc-400",
						)}
					>
						Ctrl+D
					</span>
				</button>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDelete?.();
						onClose();
					}}
					className={cn(
						"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer group",
						isLight
							? "hover:bg-rose-50 text-rose-600 hover:text-rose-700"
							: "hover:bg-rose-500/20 text-rose-400 hover:text-rose-300",
					)}
				>
					<div className="flex items-center gap-2">
						<Trash2 className="w-3.5 h-3.5 text-rose-400" />
						<span>Delete Clip</span>
					</div>
					<span
						className={cn(
							"text-[10px] font-mono px-1.5 py-0.5 rounded border",
							isLight
								? "bg-rose-100/50 border-rose-200 text-rose-600"
								: "bg-rose-950/40 border-rose-800/40 text-rose-300",
						)}
					>
						Del
					</span>
				</button>
			</div>

			<div className={cn("h-[1px] my-1", isLight ? "bg-zinc-200/80" : "bg-white/[0.08]")} />

			{/* Split & Trimming */}
			<div className="px-1.5 space-y-0.5">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onSplit?.();
						onClose();
					}}
					className={cn(
						"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
						isLight
							? "hover:bg-cyan-50 text-cyan-700 hover:text-cyan-800"
							: "hover:bg-cyan-500/15 text-cyan-300 hover:text-cyan-200",
					)}
				>
					<div className="flex items-center gap-2">
						<Scissors className="w-3.5 h-3.5 text-cyan-400" />
						<span>Split Clip</span>
					</div>
					<span
						className={cn(
							"text-[10px] font-mono px-1.5 py-0.5 rounded border",
							isLight
								? "bg-cyan-100/50 border-cyan-200 text-cyan-700"
								: "bg-cyan-950/40 border-cyan-800/40 text-cyan-300",
						)}
					>
						Ctrl+B
					</span>
				</button>

				{onSplitAll && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onSplitAll();
							onClose();
						}}
						className={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
							isLight
								? "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950"
								: "hover:bg-white/10 text-zinc-200 hover:text-white",
						)}
					>
						<div className="flex items-center gap-2">
							<Scissors className="w-3.5 h-3.5 text-blue-400" />
							<span>Split All Tracks</span>
						</div>
						<span
							className={cn(
								"text-[10px] font-mono px-1.5 py-0.5 rounded border",
								isLight
									? "bg-zinc-100 border-zinc-200 text-zinc-500"
									: "bg-white/5 border-white/10 text-zinc-400",
							)}
						>
							Ctrl+Shift+B
						</span>
					</button>
				)}

				{clipType === "video" && onMoveToNewLayer && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onMoveToNewLayer();
							onClose();
						}}
						className={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
							isLight
								? "hover:bg-purple-50 text-purple-700 hover:text-purple-900"
								: "hover:bg-purple-500/15 text-purple-300 hover:text-purple-200",
						)}
					>
						<div className="flex items-center gap-2">
							<Layers className="w-3.5 h-3.5 text-purple-400" />
							<span>Move to New Video Layer</span>
						</div>
					</button>
				)}

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onTrimStartToPlayhead?.();
						onClose();
					}}
					className={cn(
						"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
						isLight
							? "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950"
							: "hover:bg-white/10 text-zinc-300 hover:text-white",
					)}
				>
					<span>Trim Start to Playhead</span>
					<span
						className={cn(
							"text-[10px] font-mono px-1.5 py-0.5 rounded border",
							isLight
								? "bg-zinc-100 border-zinc-200 text-zinc-500"
								: "bg-white/5 border-white/10 text-zinc-400",
						)}
					>
						Alt+[
					</span>
				</button>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onTrimEndToPlayhead?.();
						onClose();
					}}
					className={cn(
						"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
						isLight
							? "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950"
							: "hover:bg-white/10 text-zinc-300 hover:text-white",
					)}
				>
					<span>Trim End to Playhead</span>
					<span
						className={cn(
							"text-[10px] font-mono px-1.5 py-0.5 rounded border",
							isLight
								? "bg-zinc-100 border-zinc-200 text-zinc-500"
								: "bg-white/5 border-white/10 text-zinc-400",
						)}
					>
						Alt+]
					</span>
				</button>
			</div>

			<div className={cn("h-[1px] my-1", isLight ? "bg-zinc-200/80" : "bg-white/[0.08]")} />

			{/* Video Specific or Audio Specific Actions */}
			{clipType === "audio" ? (
				<div className="px-1.5 space-y-0.5">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onAdjustAudio?.();
							onClose();
						}}
						className={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
							isLight
								? "hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800"
								: "hover:bg-emerald-500/15 text-emerald-300 hover:text-emerald-200",
						)}
					>
						<div className="flex items-center gap-2">
							<Sliders className="w-3.5 h-3.5 text-emerald-400" />
							<span>Adjust Audio</span>
						</div>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onGenerateCaptions?.();
							onClose();
						}}
						className={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
							isLight
								? "hover:bg-yellow-50 text-amber-700 hover:text-amber-800"
								: "hover:bg-white/10 text-zinc-200 hover:text-white",
						)}
					>
						<div className="flex items-center gap-2">
							<Languages className="w-3.5 h-3.5 text-amber-400" />
							<span>Speech-to-Text Subtitles</span>
						</div>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onMuteToggle?.();
							onClose();
						}}
						className={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
							isLight
								? "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950"
								: "hover:bg-white/10 text-zinc-200 hover:text-white",
						)}
					>
						<div className="flex items-center gap-2">
							<VolumeX className="w-3.5 h-3.5 text-zinc-400" />
							<span>Mute / Unmute Track</span>
						</div>
						<span
							className={cn(
								"text-[10px] font-mono px-1.5 py-0.5 rounded border",
								isLight
									? "bg-zinc-100 border-zinc-200 text-zinc-500"
									: "bg-white/5 border-white/10 text-zinc-400",
							)}
						>
							Ctrl+Shift+M
						</span>
					</button>
				</div>
			) : (
				<div className="px-1.5 space-y-0.5">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onCropAndZoom?.();
							onClose();
						}}
						className={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
							isLight
								? "hover:bg-cyan-50 text-cyan-700 hover:text-cyan-800"
								: "hover:bg-white/10 text-zinc-200 hover:text-white",
						)}
					>
						<div className="flex items-center gap-2">
							<Crop className="w-3.5 h-3.5 text-cyan-400" />
							<span>Crop and Zoom</span>
						</div>
						<span
							className={cn(
								"text-[10px] font-mono px-1.5 py-0.5 rounded border",
								isLight
									? "bg-zinc-100 border-zinc-200 text-zinc-500"
									: "bg-white/5 border-white/10 text-zinc-400",
							)}
						>
							Alt+C
						</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onGenerateCaptions?.();
							onClose();
						}}
						className={cn(
							"w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors font-medium cursor-pointer",
							isLight
								? "hover:bg-cyan-50 text-cyan-700 hover:text-cyan-800"
								: "hover:bg-white/10 text-zinc-200 hover:text-white",
						)}
					>
						<div className="flex items-center gap-2">
							<Wand2 className="w-3.5 h-3.5 text-cyan-400" />
							<span>Speech-to-Text Subtitles</span>
						</div>
					</button>
				</div>
			)}

			<div className={cn("h-[1px] my-1", isLight ? "bg-zinc-200/80" : "bg-white/[0.08]")} />

			{/* Speed Presets */}
			<div className="px-2.5 py-1.5">
				<div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
					<span
						className={cn("flex items-center gap-1.5", isLight ? "text-zinc-600" : "text-zinc-400")}
					>
						<Gauge className="w-3.5 h-3.5 text-purple-400" />
						<span>Playback Speed</span>
					</span>
					{currentSpeed && currentSpeed !== 1 && (
						<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
							{currentSpeed}x Active
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5">
					{[0.5, 1, 1.5, 2].map((s) => {
						const isSelected = Math.abs((currentSpeed ?? 1) - s) < 0.01;
						return (
							<button
								key={s}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSpeedChange?.(s);
									onClose();
								}}
								className={cn(
									"flex-1 py-1 rounded-lg text-center font-mono text-[11px] font-semibold transition-all cursor-pointer border",
									isSelected
										? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20"
										: isLight
											? "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 border-zinc-200"
											: "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10",
								)}
							>
								{s}x
							</button>
						);
					})}
				</div>
			</div>

			<div className={cn("h-[1px] my-1", isLight ? "bg-zinc-200/80" : "bg-white/[0.08]")} />

			{/* Color Mark Palette */}
			<div className="px-2.5 py-1.5">
				<div className="flex items-center justify-between text-[11px] mb-2 font-medium">
					<span
						className={cn("flex items-center gap-1.5", isLight ? "text-zinc-600" : "text-zinc-400")}
					>
						<Palette className="w-3.5 h-3.5 text-cyan-400" />
						<span>Color Mark (Timeline Clip)</span>
					</span>
					{currentColorMark && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onColorMarkChange?.(null);
								onClose();
							}}
							title="Reset to default track color"
							className={cn(
								"flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer",
								isLight ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-white",
							)}
						>
							<RotateCcw className="w-2.5 h-2.5" />
							<span>Reset</span>
						</button>
					)}
				</div>

				<div className="flex items-center justify-between gap-1">
					{COLOR_MARKS.map((m) => {
						const isSelected = currentColorMark?.toLowerCase() === m.color.toLowerCase();
						return (
							<button
								key={m.name}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onColorMarkChange?.(m.color);
									onClose();
								}}
								className={cn(
									"relative w-4 h-4 rounded-full transition-all hover:scale-125 border shadow-xs cursor-pointer flex items-center justify-center shrink-0",
									isSelected
										? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0d12] scale-110 border-white"
										: "border-black/20 hover:border-white/50",
								)}
								style={{ backgroundColor: m.color }}
								title={m.name}
							>
								{isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
							</button>
						);
					})}

					{/* Custom Color Picker Input */}
					<div className="relative shrink-0">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								colorInputRef.current?.click();
							}}
							title="Pick custom color"
							className={cn(
								"w-4 h-4 rounded-full border flex items-center justify-center transition-all hover:scale-125 cursor-pointer overflow-hidden",
								!isPresetColor && currentColorMark
									? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0d12] scale-110 border-white"
									: "border-white/30 hover:border-white",
							)}
							style={{
								background:
									!isPresetColor && currentColorMark
										? currentColorMark
										: "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
							}}
						>
							{!isPresetColor && currentColorMark && (
								<Check className="w-2 h-2 text-white stroke-[3]" />
							)}
						</button>
						<input
							ref={colorInputRef}
							type="color"
							value={currentColorMark || "#06b6d4"}
							onChange={(e) => {
								onColorMarkChange?.(e.target.value);
								onClose();
							}}
							className="sr-only"
							tabIndex={-1}
						/>
					</div>
				</div>
			</div>
		</div>
	);

	return createPortal(content, document.body);
}
