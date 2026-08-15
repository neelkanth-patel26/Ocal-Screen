import { Camera, Circle, Eye, EyeOff, Layers, Plus, Square, Trash2 } from "lucide-react";
import { useState } from "react";
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
				<div className="flex items-center gap-2.5">
					<div
						className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
						style={{
							backgroundColor: `${activeAccent.hex}14`,
							borderColor: `${activeAccent.hex}28`,
						}}
					>
						<Layers className="w-4 h-4" style={{ color: activeAccent.hex }} />
					</div>
					<div>
						<span
							className={cn(
								"font-extrabold text-xs tracking-tight",
								isLight ? "text-slate-800" : "text-slate-100",
							)}
						>
							Video Layers & Cam
						</span>
						<div className="text-[10px] text-zinc-400 font-medium">
							Multi-track camera & overlays
						</div>
					</div>
				</div>
				<Button
					onClick={onAddLayer}
					size="sm"
					className="h-7 text-[11px] gap-1.5 rounded-full font-bold cursor-pointer active:scale-95 transition-all shadow-xs"
					style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
				>
					<Plus className="w-3.5 h-3.5" />
					Add Layer
				</Button>
			</div>

			{/* Layers list */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span
						className={cn(
							"text-[10px] font-bold uppercase tracking-wider",
							isLight ? "text-slate-500" : "text-slate-400",
						)}
					>
						Active Layers ({videoLayers.length})
					</span>
				</div>
				<div className="space-y-1.5">
					{videoLayers.map((layer) => {
						const isSelected = layer.id === selectedLayerId;
						return (
							<div
								key={layer.id}
								onClick={() => setSelectedLayerId(layer.id)}
								style={{
									borderColor: isSelected ? activeAccent.hex : undefined,
									backgroundColor: isSelected
										? isLight
											? `${activeAccent.hex}10`
											: `${activeAccent.hex}16`
										: undefined,
								}}
								className={cn(
									"flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer transition-all duration-200",
									isSelected
										? "shadow-sm scale-[1.01]"
										: isLight
											? "bg-white/90 border-slate-200 hover:border-slate-300"
											: "bg-white/[0.04] border-white/[0.08] hover:border-white/[0.14]",
								)}
							>
								<div className="flex items-center gap-2.5 overflow-hidden">
									<div
										className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
										style={{
											backgroundColor: layer.enabled
												? `${activeAccent.hex}20`
												: isLight
													? "#f4f4f5"
													: "rgba(255,255,255,0.06)",
											borderColor: layer.enabled ? `${activeAccent.hex}35` : "transparent",
										}}
									>
										<Camera
											className="w-3.5 h-3.5"
											style={{ color: layer.enabled ? activeAccent.hex : "#71717a" }}
										/>
									</div>
									<span
										className={cn(
											"font-bold truncate text-xs",
											isLight ? "text-slate-800" : "text-slate-200",
										)}
									>
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
										title={layer.enabled ? "Hide Layer" : "Show Layer"}
										className={cn(
											"p-1.5 rounded-lg transition-colors cursor-pointer",
											layer.enabled
												? isLight
													? "bg-slate-100 hover:bg-slate-200 text-slate-800"
													: "bg-white/10 hover:bg-white/20 text-white"
												: "text-zinc-500 hover:text-zinc-300",
										)}
									>
										{layer.enabled ? (
											<Eye className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
										) : (
											<EyeOff className="w-3.5 h-3.5" />
										)}
									</button>
									{videoLayers.length > 1 && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onDeleteLayer(layer.id);
											}}
											title="Delete Layer"
											className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
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
						"p-4 rounded-2xl border space-y-4 shadow-xs",
						isLight ? "bg-white/90 border-slate-200" : "bg-white/[0.04] border-white/[0.08]",
					)}
				>
					<div className="flex items-center justify-between pb-1">
						<span
							className={cn(
								"font-extrabold text-xs tracking-tight",
								isLight ? "text-slate-800" : "text-slate-100",
							)}
						>
							Layer Settings: {selectedLayer.name}
						</span>
					</div>

					{/* Shape Mask */}
					<div className="space-y-2">
						<span
							className={cn(
								"text-[10px] font-bold uppercase tracking-wider",
								isLight ? "text-slate-500" : "text-slate-400",
							)}
						>
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
											"flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] font-bold transition-all cursor-pointer",
											isActive
												? "scale-[1.02] shadow-sm"
												: isLight
													? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
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
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span
								className={cn("text-xs font-bold", isLight ? "text-slate-700" : "text-slate-200")}
							>
								Opacity
							</span>
							<span
								className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border transition-colors"
								style={{
									backgroundColor: `${activeAccent.hex}18`,
									borderColor: `${activeAccent.hex}30`,
									color: activeAccent.hex,
								}}
							>
								{Math.round((selectedLayer.opacity ?? 1.0) * 100)}%
							</span>
						</div>
						<Slider
							value={[Math.round((selectedLayer.opacity ?? 1.0) * 100)]}
							min={10}
							max={100}
							step={1}
							accentColor={activeAccent.hex}
							onValueChange={([val]) => onUpdateLayer(selectedLayer.id, { opacity: val / 100 })}
							className="w-full cursor-pointer"
						/>
					</div>

					<div className={cn("h-[1px] w-full", isLight ? "bg-slate-100" : "bg-white/[0.06]")} />

					{/* Position Presets */}
					<div className="space-y-2">
						<span
							className={cn(
								"text-[10px] font-bold uppercase tracking-wider",
								isLight ? "text-slate-500" : "text-slate-400",
							)}
						>
							Position Presets
						</span>
						<div className="grid grid-cols-3 gap-1.5">
							{POSITION_PRESETS.map((pos) => {
								const isCurrent = selectedLayer.x === pos.x && selectedLayer.y === pos.y;
								return (
									<button
										key={pos.label}
										type="button"
										onClick={() => onUpdateLayer(selectedLayer.id, { x: pos.x, y: pos.y })}
										style={{
											borderColor: isCurrent ? activeAccent.hex : undefined,
											backgroundColor: isCurrent ? `${activeAccent.hex}18` : undefined,
											color: isCurrent ? activeAccent.hex : undefined,
										}}
										className={cn(
											"py-2 px-2 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center",
											isCurrent
												? "shadow-2xs font-extrabold"
												: isLight
													? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
													: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
										)}
									>
										{pos.label}
									</button>
								);
							})}
						</div>
					</div>

					<div className={cn("h-[1px] w-full", isLight ? "bg-slate-100" : "bg-white/[0.06]")} />

					{/* Border & Glow */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span
								className={cn("text-xs font-bold", isLight ? "text-slate-700" : "text-slate-200")}
							>
								Shadow Glow
							</span>
							<Switch
								checked={selectedLayer.shadowGlow ?? true}
								onCheckedChange={(checked) =>
									onUpdateLayer(selectedLayer.id, { shadowGlow: checked })
								}
								accentColor={activeAccent.hex}
								className="cursor-pointer"
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span
									className={cn("text-xs font-bold", isLight ? "text-slate-700" : "text-slate-200")}
								>
									Border Width
								</span>
								<span
									className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border transition-colors"
									style={{
										backgroundColor: `${activeAccent.hex}18`,
										borderColor: `${activeAccent.hex}30`,
										color: activeAccent.hex,
									}}
								>
									{selectedLayer.borderWidth ?? 3}px
								</span>
							</div>
							<Slider
								value={[selectedLayer.borderWidth ?? 3]}
								min={0}
								max={12}
								step={1}
								accentColor={activeAccent.hex}
								onValueChange={([val]) => onUpdateLayer(selectedLayer.id, { borderWidth: val })}
								className="w-full cursor-pointer"
							/>
						</div>

						<div className="flex items-center justify-between pt-1">
							<span
								className={cn("text-xs font-bold", isLight ? "text-slate-700" : "text-slate-200")}
							>
								Border Color
							</span>
							<div className="flex items-center gap-2">
								<span className="text-[10px] font-mono text-zinc-400 uppercase">
									{selectedLayer.borderColor || activeAccent.hex}
								</span>
								<input
									type="color"
									value={selectedLayer.borderColor || activeAccent.hex}
									onChange={(e) => onUpdateLayer(selectedLayer.id, { borderColor: e.target.value })}
									className="w-7 h-7 rounded-xl cursor-pointer border border-white/20 bg-transparent p-0.5 overflow-hidden transition-transform hover:scale-110"
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
