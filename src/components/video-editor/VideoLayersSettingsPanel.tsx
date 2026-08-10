import { useState } from "react";
import { Camera, Circle, Eye, EyeOff, Layers, Plus, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { VideoLayerMask, VideoLayerTrack } from "./types";

interface VideoLayersSettingsPanelProps {
	videoLayers: VideoLayerTrack[];
	isLight: boolean;
	activeAccent: { hex: string; textHex: string };
	onAddLayer: () => void;
	onUpdateLayer: (id: string, updates: Partial<VideoLayerTrack>) => void;
	onDeleteLayer: (id: string) => void;
}

const POSITION_PRESETS = [
	{ label: "Top-Left", x: 5, y: 5 },
	{ label: "Top-Right", x: 70, y: 5 },
	{ label: "Bottom-Left", x: 5, y: 70 },
	{ label: "Bottom-Right", x: 70, y: 70 },
	{ label: "Center", x: 37, y: 37 },
];

const MASK_SHAPES: Array<{ id: VideoLayerMask; label: string; icon: any }> = [
	{ id: "circle", label: "Circle", icon: Circle },
	{ id: "rounded", label: "Rounded", icon: Square },
	{ id: "rectangle", label: "Rect", icon: Square },
	{ id: "square", label: "Square", icon: Square },
];

export function VideoLayersSettingsPanel({
	videoLayers,
	isLight,
	activeAccent,
	onAddLayer,
	onUpdateLayer,
	onDeleteLayer,
}: VideoLayersSettingsPanelProps) {
	const [selectedLayerId, setSelectedLayerId] = useState<string>(
		videoLayers[0]?.id || "layer-live-cam-default",
	);

	const selectedLayer = videoLayers.find((l) => l.id === selectedLayerId) || videoLayers[0];

	return (
		<div className="space-y-4 text-xs">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Layers className="w-4 h-4" style={{ color: activeAccent.hex }} />
					<span className={cn("font-bold text-sm", isLight ? "text-slate-800" : "text-slate-100")}>
						Video Layers & Cam
					</span>
				</div>
				<Button
					onClick={onAddLayer}
					size="sm"
					className="h-7 text-[11px] gap-1.5 rounded-xl font-bold cursor-pointer"
					style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
				>
					<Plus className="w-3 h-3" />
					Add Layer
				</Button>
			</div>

			{/* Layers list */}
			<div className="space-y-1.5">
				<span className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>
					Active Video Layers ({videoLayers.length})
				</span>
				<div className="space-y-1">
					{videoLayers.map((layer) => {
						const isSelected = layer.id === selectedLayerId;
						return (
							<div
								key={layer.id}
								onClick={() => setSelectedLayerId(layer.id)}
								className={cn(
									"flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all",
									isSelected
										? isLight
											? "bg-slate-100 border-slate-300 shadow-sm"
											: "bg-white/10 border-white/20 shadow-sm"
										: isLight
											? "bg-white border-slate-200 hover:bg-slate-50"
											: "bg-white/5 border-white/10 hover:bg-white/10",
								)}
							>
								<div className="flex items-center gap-2 overflow-hidden">
									<Camera className="w-3.5 h-3.5 shrink-0" style={{ color: layer.enabled ? activeAccent.hex : "#94a3b8" }} />
									<span className={cn("font-semibold truncate", isLight ? "text-slate-800" : "text-slate-200")}>
										{layer.name}
									</span>
								</div>

								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onUpdateLayer(layer.id, { enabled: !layer.enabled });
										}}
										className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
									>
										{layer.enabled ? (
											<Eye className="w-3.5 h-3.5 text-emerald-500" />
										) : (
											<EyeOff className="w-3.5 h-3.5 text-slate-400" />
										)}
									</button>
									{videoLayers.length > 1 && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onDeleteLayer(layer.id);
											}}
											className="p-1 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Selected layer configuration */}
			{selectedLayer && (
				<div
					className={cn(
						"p-3 rounded-2xl border space-y-3",
						isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10",
					)}
				>
					<div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
						<span className={cn("font-bold text-xs", isLight ? "text-slate-800" : "text-slate-200")}>
							Layer Settings: {selectedLayer.name}
						</span>
					</div>

					{/* Shape Mask */}
					<div className="space-y-1.5">
						<span className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>
							Mask Shape
						</span>
						<div className="grid grid-cols-4 gap-1.5">
							{MASK_SHAPES.map((shape) => {
								const isActive = (selectedLayer.maskShape || "circle") === shape.id;
								return (
									<button
										key={shape.id}
										type="button"
										onClick={() => onUpdateLayer(selectedLayer.id, { maskShape: shape.id })}
										className={cn(
											"flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] font-semibold transition-all cursor-pointer",
											isActive
												? "scale-[1.03] shadow-sm"
												: isLight
													? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
													: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
										)}
										style={{
											backgroundColor: isActive ? activeAccent.hex : undefined,
											color: isActive ? activeAccent.textHex : undefined,
											borderColor: isActive ? activeAccent.hex : undefined,
										}}
									>
										<span>{shape.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Opacity */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-[11px]">
							<span className={cn("font-medium", isLight ? "text-slate-600" : "text-slate-400")}>
								Opacity
							</span>
							<span className="font-bold tabular-nums">
								{Math.round((selectedLayer.opacity ?? 1.0) * 100)}%
							</span>
						</div>
						<Slider
							value={[Math.round((selectedLayer.opacity ?? 1.0) * 100)]}
							min={10}
							max={100}
							step={1}
							onValueChange={([val]) => onUpdateLayer(selectedLayer.id, { opacity: val / 100 })}
						/>
					</div>

					{/* Position Presets */}
					<div className="space-y-1.5">
						<span className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>
							Position Presets
						</span>
						<div className="grid grid-cols-3 gap-1.5">
							{POSITION_PRESETS.map((pos) => (
								<button
									key={pos.label}
									type="button"
									onClick={() => onUpdateLayer(selectedLayer.id, { x: pos.x, y: pos.y })}
									className={cn(
										"py-1.5 px-2 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center",
										isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
									)}
								>
									{pos.label}
								</button>
							))}
						</div>
					</div>

					{/* Border & Glow */}
					<div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/5">
						<div className="flex items-center justify-between">
							<span className={cn("font-medium text-[11px]", isLight ? "text-slate-600" : "text-slate-400")}>
								Shadow Glow
							</span>
							<Switch
								checked={selectedLayer.shadowGlow ?? true}
								onCheckedChange={(checked) => onUpdateLayer(selectedLayer.id, { shadowGlow: checked })}
							/>
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center justify-between text-[11px]">
								<span className={cn("font-medium", isLight ? "text-slate-600" : "text-slate-400")}>
									Border Width
								</span>
								<span className="font-bold tabular-nums">{selectedLayer.borderWidth ?? 3}px</span>
							</div>
							<Slider
								value={[selectedLayer.borderWidth ?? 3]}
								min={0}
								max={12}
								step={1}
								onValueChange={([val]) => onUpdateLayer(selectedLayer.id, { borderWidth: val })}
							/>
						</div>

						<div className="flex items-center justify-between pt-1">
							<span className={cn("font-medium text-[11px]", isLight ? "text-slate-600" : "text-slate-400")}>
								Border Color
							</span>
							<input
								type="color"
								value={selectedLayer.borderColor || activeAccent.hex}
								onChange={(e) => onUpdateLayer(selectedLayer.id, { borderColor: e.target.value })}
								className="w-7 h-7 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0.5 overflow-hidden"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
