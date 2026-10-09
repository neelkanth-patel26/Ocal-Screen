import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useScopedT } from "@/contexts/I18nContext";
import { getBlurOverlayColor } from "@/lib/blurEffects";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import {
	type AnnotationRegion,
	type BlurColor,
	type BlurData,
	type BlurShape,
	DEFAULT_BLUR_BLOCK_SIZE,
	DEFAULT_BLUR_DATA,
	MAX_BLUR_BLOCK_SIZE,
	MIN_BLUR_BLOCK_SIZE,
} from "./types";

interface BlurSettingsPanelProps {
	blurRegion: AnnotationRegion;
	onBlurDataChange: (blurData: BlurData) => void;
	onBlurDataCommit?: () => void;
	onDelete: () => void;
	isLight?: boolean;
	activeAccent?: { hex: string; textHex: string };
}

export function BlurSettingsPanel({
	blurRegion,
	onBlurDataChange,
	onBlurDataCommit,
	onDelete,
	isLight: isLightProp,
	activeAccent: activeAccentProp,
}: BlurSettingsPanelProps) {
	const t = useScopedT("settings");
	const prefs = loadUserPreferences();
	const activeAccent =
		activeAccentProp || ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = isLightProp !== undefined ? isLightProp : prefs.theme === "light";

	const blurShapeOptions: Array<{ value: BlurShape; labelKey: string }> = [
		{ value: "rectangle", labelKey: "blurShapeRectangle" },
		{ value: "oval", labelKey: "blurShapeOval" },
	];
	const blurColorOptions: Array<{ value: BlurColor; labelKey: string }> = [
		{ value: "white", labelKey: "blurColorWhite" },
		{ value: "black", labelKey: "blurColorBlack" },
	];

	return (
		<div
			className={cn(
				"min-w-0 p-4 flex flex-col h-full overflow-y-auto custom-scrollbar transition-colors",
				isLight ? "bg-white text-slate-800" : "bg-[#09090c] text-slate-200",
			)}
		>
			<div className="mb-3">
				{/* Shape */}
				<div className="mb-4">
					<label
						className={cn(
							"text-xs font-bold mb-2 block",
							isLight ? "text-slate-700" : "text-slate-200",
						)}
					>
						{t("annotation.blurShape")}
					</label>
					<div className="grid grid-cols-2 gap-2">
						{blurShapeOptions.map((shape) => {
							const activeShape = blurRegion.blurData?.shape ?? DEFAULT_BLUR_DATA.shape;
							const isActive = activeShape === shape.value;
							return (
								<button
									key={shape.value}
									onClick={() => {
										const nextBlurData: BlurData = {
											...DEFAULT_BLUR_DATA,
											...blurRegion.blurData,
											type: "mosaic",
											shape: shape.value,
										};
										onBlurDataChange(nextBlurData);
										requestAnimationFrame(() => {
											onBlurDataCommit?.();
										});
									}}
									style={
										isActive
											? {
													backgroundColor: activeAccent.hex,
													borderColor: activeAccent.hex,
													color: activeAccent.textHex,
												}
											: undefined
									}
									className={cn(
										"h-12 rounded-xl border flex items-center justify-center transition-all p-2 gap-2 cursor-pointer font-bold",
										isActive
											? "shadow-md scale-[1.02]"
											: isLight
												? "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-2xs"
												: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300",
									)}
								>
									{shape.value === "rectangle" && (
										<div
											className={cn(
												"w-8 h-5 border-2 rounded-md",
												isActive
													? "border-white"
													: isLight
														? "border-slate-400"
														: "border-slate-500",
											)}
										/>
									)}
									{shape.value === "oval" && (
										<div
											className={cn(
												"w-8 h-5 border-2 rounded-full",
												isActive
													? "border-white"
													: isLight
														? "border-slate-400"
														: "border-slate-500",
											)}
										/>
									)}
									<span className="text-xs leading-none font-bold">
										{t(`annotation.${shape.labelKey}`)}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Color */}
				<div className="mt-4">
					<label
						className={cn(
							"text-xs font-bold mb-2 block",
							isLight ? "text-slate-700" : "text-slate-200",
						)}
					>
						{t("annotation.blurColor")}
					</label>
					<div className="grid grid-cols-2 gap-2">
						{blurColorOptions.map((option) => {
							const activeColor = blurRegion.blurData?.color ?? DEFAULT_BLUR_DATA.color;
							const isActive = activeColor === option.value;
							return (
								<button
									key={option.value}
									onClick={() => {
										const nextBlurData: BlurData = {
											...DEFAULT_BLUR_DATA,
											...blurRegion.blurData,
											type: "mosaic",
											color: option.value,
										};
										onBlurDataChange(nextBlurData);
										requestAnimationFrame(() => {
											onBlurDataCommit?.();
										});
									}}
									style={
										isActive
											? {
													backgroundColor: activeAccent.hex,
													borderColor: activeAccent.hex,
													color: activeAccent.textHex,
												}
											: undefined
									}
									className={cn(
										"h-10 rounded-xl border flex items-center gap-2 px-3 transition-all cursor-pointer font-bold",
										isActive
											? "shadow-md scale-[1.02]"
											: isLight
												? "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-2xs"
												: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300",
									)}
								>
									<div
										className="w-4 h-4 rounded-full border border-black/15 shadow-xs"
										style={{
											backgroundColor: getBlurOverlayColor({
												...DEFAULT_BLUR_DATA,
												...blurRegion.blurData,
												color: option.value,
											}),
										}}
									/>
									<span className="text-xs">{t(`annotation.${option.labelKey}`)}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Block Size */}
				<div
					className={cn(
						"mt-4 p-3 rounded-2xl border",
						isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10",
					)}
				>
					<div className="flex items-center justify-between mb-2">
						<span
							className={cn("text-xs font-bold", isLight ? "text-slate-700" : "text-slate-200")}
						>
							{t("annotation.mosaicBlockSize")}
						</span>
						<span className="text-[10px] text-indigo-400 font-mono font-bold">
							{Math.round(blurRegion.blurData?.blockSize ?? DEFAULT_BLUR_BLOCK_SIZE)}
							px
						</span>
					</div>
					<Slider
						value={[blurRegion.blurData?.blockSize ?? DEFAULT_BLUR_BLOCK_SIZE]}
						onValueChange={(values) => {
							onBlurDataChange({
								...DEFAULT_BLUR_DATA,
								...blurRegion.blurData,
								type: "mosaic",
								blockSize: values[0],
							});
						}}
						onValueCommit={() => onBlurDataCommit?.()}
						min={MIN_BLUR_BLOCK_SIZE}
						max={MAX_BLUR_BLOCK_SIZE}
						step={1}
						className="w-full"
					/>
				</div>

				<Button
					onClick={onDelete}
					variant="destructive"
					size="sm"
					className="w-full gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all mt-4 font-bold text-xs h-9 cursor-pointer"
				>
					<Trash2 className="w-4 h-4" />
					{t("annotation.deleteAnnotation")}
				</Button>
			</div>
		</div>
	);
}
