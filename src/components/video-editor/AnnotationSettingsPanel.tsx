import Block from "@uiw/react-color-block";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	ArrowRight,
	Bold,
	ChevronDown,
	Copy,
	Image as ImageIcon,
	Italic,
	Trash2,
	Type,
	Underline,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useScopedT } from "@/contexts/I18nContext";
import { normalizeTextAnimation, TEXT_ANIMATION_OPTIONS } from "@/lib/annotationTextAnimation";
import { type CustomFont, getCustomFonts } from "@/lib/customFonts";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";
import ColorPicker from "../ui/color-picker";
import { AddCustomFontDialog } from "./AddCustomFontDialog";
import { getArrowComponent } from "./ArrowSvgs";
import {
	type AnnotationRegion,
	type AnnotationType,
	type ArrowDirection,
	type FigureData,
} from "./types";

interface AnnotationSettingsPanelProps {
	annotation: AnnotationRegion;
	onContentChange: (content: string) => void;
	onTypeChange: (type: AnnotationType) => void;
	onStyleChange: (style: Partial<AnnotationRegion["style"]>) => void;
	onFigureDataChange?: (figureData: FigureData) => void;
	onDuplicate?: () => void;
	onDelete: () => void;
	isLight?: boolean;
	activeAccent?: { hex: string; textHex: string };
}

const FONT_FAMILIES: Array<
	| { value: string; labelKey: string; name?: never }
	| { value: string; labelKey?: never; name: string }
> = [
	{ value: "Inter", name: "Inter" },
	{ value: "system-ui, -apple-system, sans-serif", labelKey: "classic" },
	{ value: "Georgia, serif", labelKey: "editor" },
	{ value: "Impact, Arial Black, sans-serif", labelKey: "strong" },
	{ value: "Courier New, monospace", labelKey: "typewriter" },
	{ value: "Brush Script MT, cursive", labelKey: "deco" },
	{ value: "Arial, sans-serif", labelKey: "simple" },
	{ value: "Verdana, sans-serif", labelKey: "modern" },
	{ value: "Trebuchet MS, sans-serif", labelKey: "clean" },
	{ value: '"Plus Jakarta Sans", sans-serif', name: "Plus Jakarta Sans" },
	{ value: '"Space Grotesk", sans-serif', name: "Space Grotesk" },
	{ value: '"DM Sans", sans-serif', name: "DM Sans" },
	{ value: "Sora, sans-serif", name: "Sora" },
	{ value: "Manrope, sans-serif", name: "Manrope" },
	{ value: '"IBM Plex Sans", sans-serif', name: "IBM Plex Sans" },
	{ value: '"Playfair Display", Georgia, serif', name: "Playfair Display" },
	{ value: "Merriweather, Georgia, serif", name: "Merriweather" },
	{ value: "Lora, Georgia, serif", name: "Lora" },
	{ value: '"IBM Plex Mono", monospace', name: "IBM Plex Mono" },
	{ value: '"Fira Code", monospace', name: "Fira Code" },
	{ value: '"Bebas Neue", sans-serif', name: "Bebas Neue" },
	{ value: "Oswald, sans-serif", name: "Oswald" },
	{ value: "Caveat, cursive", name: "Caveat" },
	{ value: '"Permanent Marker", cursive', name: "Permanent Marker" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128];

export function AnnotationSettingsPanel({
	annotation,
	onContentChange,
	onTypeChange,
	onStyleChange,
	onFigureDataChange,
	onDuplicate,
	onDelete,
	isLight: isLightProp,
	activeAccent: activeAccentProp,
}: AnnotationSettingsPanelProps) {
	const t = useScopedT("settings");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
	const fontStyleLabels: Record<string, string> = {
		classic: t("fontStyles.classic"),
		editor: t("fontStyles.editor"),
		strong: t("fontStyles.strong"),
		typewriter: t("fontStyles.typewriter"),
		deco: t("fontStyles.deco"),
		simple: t("fontStyles.simple"),
		modern: t("fontStyles.modern"),
		clean: t("fontStyles.clean"),
	};
	const getFontLabel = (font: (typeof FONT_FAMILIES)[number]) =>
		font.labelKey ? fontStyleLabels[font.labelKey] : font.name;

	useEffect(() => {
		setCustomFonts(getCustomFonts());
	}, []);

	const colorPalette = [
		"#FF0000", // Red
		"#FFD700", // Yellow/Gold
		"#00FF00", // Green
		"#FFFFFF", // White
		"#0000FF", // Blue
		"#FF6B00", // Orange
		"#9B59B6", // Purple
		"#E91E63", // Pink
		"#00BCD4", // Cyan
		"#FF5722", // Deep Orange
		"#8BC34A", // Light Green
		"#FFC107", // Amber
		"#34B27B", // Brand Green
		"#000000", // Black
		"#607D8B", // Blue Grey
		"#795548", // Brown
	];

	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		const file = files[0];

		const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
		if (!validTypes.includes(file.type)) {
			toast.error(t("annotation.invalidImageType"), {
				description: t("annotation.imageFormatsOnly"),
			});
			event.target.value = "";
			return;
		}

		const reader = new FileReader();

		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			if (dataUrl) {
				onContentChange(dataUrl);
				toast.success(t("annotation.imageUploadSuccess"));
			}
		};

		reader.onerror = () => {
			toast.error(t("annotation.failedImageUpload"), {
				description: "There was an error reading the file.",
			});
		};

		reader.readAsDataURL(file);
		event.target.value = "";
	};

	const prefs = loadUserPreferences();
	const activeAccent =
		activeAccentProp || ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = isLightProp !== undefined ? isLightProp : prefs.theme === "light";

	// Safely retrieve text animation titles without raw key leak
	const textAnimationTitle = t("textAnimation.title") || "Text Animation";
	const selectAnimationPlaceholder = t("textAnimation.selectAnimation") || "Select animation";

	return (
		<div
			className={cn(
				"min-w-0 p-4 flex flex-col h-full overflow-y-auto custom-scrollbar transition-colors",
				isLight ? "bg-white text-slate-800" : "bg-[#09090c] text-slate-200",
			)}
		>
			<div className="mb-3">
				{/* Header */}
				<div className="mb-4">
					<span
						className={cn(
							"text-[10px] font-extrabold uppercase tracking-[0.18em]",
							isLight ? "text-slate-500" : "text-slate-400",
						)}
					>
						{t("annotation.active")}
					</span>
					<div
						className={cn(
							"mt-1 text-lg font-extrabold tracking-tight",
							isLight ? "text-slate-900" : "text-white",
						)}
					>
						{t("annotation.title")}
					</div>
				</div>

				{/* Type Selector */}
				<Tabs
					value={annotation.type}
					onValueChange={(value) => onTypeChange(value as AnnotationType)}
					className="mb-4"
				>
					<TabsList
						className={cn(
							"mb-4 p-1 w-full grid grid-cols-3 h-10 rounded-xl border transition-colors",
							isLight ? "bg-slate-100/90 border-slate-200" : "bg-white/[0.04] border-white/[0.08]",
						)}
					>
						<TabsTrigger
							value="text"
							style={
								annotation.type === "text"
									? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
									: undefined
							}
							className={cn(
								"rounded-lg transition-all gap-1.5 text-xs font-bold cursor-pointer",
								annotation.type !== "text" &&
									(isLight
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-white"),
							)}
						>
							<Type className="w-4 h-4" />
							{t("annotation.typeText")}
						</TabsTrigger>
						<TabsTrigger
							value="image"
							style={
								annotation.type === "image"
									? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
									: undefined
							}
							className={cn(
								"rounded-lg transition-all gap-1.5 text-xs font-bold cursor-pointer",
								annotation.type !== "image" &&
									(isLight
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-white"),
							)}
						>
							<ImageIcon className="w-4 h-4" />
							{t("annotation.typeImage")}
						</TabsTrigger>
						<TabsTrigger
							value="figure"
							style={
								annotation.type === "figure"
									? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
									: undefined
							}
							className={cn(
								"rounded-lg transition-all gap-1.5 text-xs font-bold cursor-pointer",
								annotation.type !== "figure" &&
									(isLight
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-white"),
							)}
						>
							<ArrowRight className="w-4 h-4" />
							{t("annotation.typeArrow")}
						</TabsTrigger>
					</TabsList>

					{/* Text Content */}
					<TabsContent value="text" className="mt-0 space-y-4">
						<div>
							<label
								className={cn(
									"text-xs font-bold mb-1.5 block",
									isLight ? "text-slate-700" : "text-slate-200",
								)}
							>
								{t("annotation.textContent")}
							</label>
							<textarea
								value={annotation.textContent || annotation.content}
								onChange={(e) => onContentChange(e.target.value)}
								placeholder={t("annotation.textPlaceholder")}
								rows={4}
								className={cn(
									"w-full px-3 py-2 text-xs rounded-xl outline-none transition-all resize-none border font-sans",
									isLight
										? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 shadow-2xs"
										: "bg-white/[0.04] border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20",
								)}
							/>
						</div>

						{/* Styling Controls */}
						<div className="space-y-4">
							{/* Font Family & Size */}
							<div className="grid grid-cols-2 gap-2.5">
								<div>
									<label
										className={cn(
											"text-xs font-bold mb-1.5 block",
											isLight ? "text-slate-700" : "text-slate-200",
										)}
									>
										{t("annotation.fontStyle")}
									</label>
									<Select
										value={annotation.style.fontFamily}
										onValueChange={(value) => onStyleChange({ fontFamily: value })}
									>
										<SelectTrigger
											className={cn(
												"w-full h-9 text-xs rounded-xl border transition-all cursor-pointer font-medium",
												isLight
													? "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs"
													: "bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]",
											)}
										>
											<SelectValue placeholder={t("annotation.selectStyle")} />
										</SelectTrigger>
										<SelectContent
											className={cn(
												"border max-h-[300px] rounded-xl shadow-xl",
												isLight
													? "bg-white border-slate-200 text-slate-800"
													: "bg-[#141824] border-white/10 text-slate-200",
											)}
										>
											{FONT_FAMILIES.map((font) => (
												<SelectItem
													key={font.value}
													value={font.value}
													style={{ fontFamily: font.value }}
												>
													{getFontLabel(font)}
												</SelectItem>
											))}
											{customFonts.length > 0 && (
												<>
													<div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
														{t("annotation.customFonts")}
													</div>
													{customFonts.map((font) => (
														<SelectItem
															key={font.id}
															value={font.fontFamily}
															style={{ fontFamily: font.fontFamily }}
														>
															{font.name}
														</SelectItem>
													))}
												</>
											)}
										</SelectContent>
									</Select>
								</div>
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label
											className={cn(
												"text-xs font-bold block",
												isLight ? "text-slate-700" : "text-slate-200",
											)}
										>
											{t("annotation.size")}
										</label>
										<div className="flex items-center gap-1">
											<button
												type="button"
												onClick={() =>
													onStyleChange({
														fontSize: Math.max(10, (annotation.style.fontSize || 32) - 4),
													})
												}
												className={cn(
													"w-5 h-5 rounded-md border text-[11px] font-bold flex items-center justify-center cursor-pointer transition-all",
													isLight
														? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
														: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
												)}
												title="Decrease size"
											>
												-
											</button>
											<span className="text-[10px] font-mono font-bold text-indigo-400 min-w-7 text-center">
												{annotation.style.fontSize}px
											</span>
											<button
												type="button"
												onClick={() =>
													onStyleChange({
														fontSize: Math.min(160, (annotation.style.fontSize || 32) + 4),
													})
												}
												className={cn(
													"w-5 h-5 rounded-md border text-[11px] font-bold flex items-center justify-center cursor-pointer transition-all",
													isLight
														? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
														: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
												)}
												title="Increase size"
											>
												+
											</button>
										</div>
									</div>
									<Select
										value={annotation.style.fontSize.toString()}
										onValueChange={(value) => onStyleChange({ fontSize: parseInt(value) })}
									>
										<SelectTrigger
											className={cn(
												"w-full h-9 text-xs rounded-xl border transition-all cursor-pointer font-medium",
												isLight
													? "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs"
													: "bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]",
											)}
										>
											<SelectValue placeholder={t("annotation.size")} />
										</SelectTrigger>
										<SelectContent
											className={cn(
												"border max-h-[220px] rounded-xl shadow-xl",
												isLight
													? "bg-white border-slate-200 text-slate-800"
													: "bg-[#141824] border-white/10 text-slate-200",
											)}
										>
											{FONT_SIZES.map((size) => (
												<SelectItem key={size} value={size.toString()}>
													{size}px
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Add Custom Font Button */}
							<div>
								<AddCustomFontDialog
									isLight={isLight}
									onFontAdded={(font) => {
										setCustomFonts(getCustomFonts());
										onStyleChange({ fontFamily: font.fontFamily });
									}}
								/>
							</div>

							{/* Text Animation */}
							<div>
								<label
									className={cn(
										"text-xs font-bold mb-1.5 block",
										isLight ? "text-slate-700" : "text-slate-200",
									)}
								>
									{textAnimationTitle}
								</label>
								<Select
									value={normalizeTextAnimation(annotation.style.textAnimation)}
									onValueChange={(value) =>
										onStyleChange({ textAnimation: normalizeTextAnimation(value) })
									}
								>
									<SelectTrigger
										className={cn(
											"w-full h-9 text-xs rounded-xl border transition-all cursor-pointer font-medium",
											isLight
												? "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs"
												: "bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]",
										)}
									>
										<SelectValue placeholder={selectAnimationPlaceholder} />
									</SelectTrigger>
									<SelectContent
										className={cn(
											"border max-h-[240px] rounded-xl shadow-xl",
											isLight
												? "bg-white border-slate-200 text-slate-800"
												: "bg-[#141824] border-white/10 text-slate-200",
										)}
									>
										{TEXT_ANIMATION_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{t(option.translationKey)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Formatting Toggles */}
							<div className="flex items-center justify-between gap-2">
								<ToggleGroup
									type="multiple"
									className={cn(
										"justify-start p-1 rounded-xl border gap-1",
										isLight ? "bg-slate-100/90 border-slate-200" : "bg-white/5 border-white/5",
									)}
								>
									<ToggleGroupItem
										value="bold"
										aria-label="Toggle bold"
										data-state={annotation.style.fontWeight === "bold" ? "on" : "off"}
										onClick={() =>
											onStyleChange({
												fontWeight: annotation.style.fontWeight === "bold" ? "normal" : "bold",
											})
										}
										style={
											annotation.style.fontWeight === "bold"
												? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
												: undefined
										}
										className={cn(
											"h-8 w-8 rounded-lg transition-all cursor-pointer",
											annotation.style.fontWeight !== "bold" &&
												(isLight
													? "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
													: "text-slate-400 hover:bg-white/10 hover:text-white"),
										)}
									>
										<Bold className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="italic"
										aria-label="Toggle italic"
										data-state={annotation.style.fontStyle === "italic" ? "on" : "off"}
										onClick={() =>
											onStyleChange({
												fontStyle: annotation.style.fontStyle === "italic" ? "normal" : "italic",
											})
										}
										style={
											annotation.style.fontStyle === "italic"
												? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
												: undefined
										}
										className={cn(
											"h-8 w-8 rounded-lg transition-all cursor-pointer",
											annotation.style.fontStyle !== "italic" &&
												(isLight
													? "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
													: "text-slate-400 hover:bg-white/10 hover:text-white"),
										)}
									>
										<Italic className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="underline"
										aria-label="Toggle underline"
										data-state={annotation.style.textDecoration === "underline" ? "on" : "off"}
										onClick={() =>
											onStyleChange({
												textDecoration:
													annotation.style.textDecoration === "underline" ? "none" : "underline",
											})
										}
										style={
											annotation.style.textDecoration === "underline"
												? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
												: undefined
										}
										className={cn(
											"h-8 w-8 rounded-lg transition-all cursor-pointer",
											annotation.style.textDecoration !== "underline" &&
												(isLight
													? "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
													: "text-slate-400 hover:bg-white/10 hover:text-white"),
										)}
									>
										<Underline className="h-4 w-4" />
									</ToggleGroupItem>
								</ToggleGroup>

								<ToggleGroup
									type="single"
									value={annotation.style.textAlign}
									className={cn(
										"justify-start p-1 rounded-xl border gap-1",
										isLight ? "bg-slate-100/90 border-slate-200" : "bg-white/5 border-white/5",
									)}
								>
									<ToggleGroupItem
										value="left"
										aria-label="Align left"
										onClick={() => onStyleChange({ textAlign: "left" })}
										style={
											annotation.style.textAlign === "left"
												? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
												: undefined
										}
										className={cn(
											"h-8 w-8 rounded-lg transition-all cursor-pointer",
											annotation.style.textAlign !== "left" &&
												(isLight
													? "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
													: "text-slate-400 hover:bg-white/10 hover:text-white"),
										)}
									>
										<AlignLeft className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="center"
										aria-label="Align center"
										onClick={() => onStyleChange({ textAlign: "center" })}
										style={
											annotation.style.textAlign === "center"
												? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
												: undefined
										}
										className={cn(
											"h-8 w-8 rounded-lg transition-all cursor-pointer",
											annotation.style.textAlign !== "center" &&
												(isLight
													? "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
													: "text-slate-400 hover:bg-white/10 hover:text-white"),
										)}
									>
										<AlignCenter className="h-4 w-4" />
									</ToggleGroupItem>
									<ToggleGroupItem
										value="right"
										aria-label="Align right"
										onClick={() => onStyleChange({ textAlign: "right" })}
										style={
											annotation.style.textAlign === "right"
												? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
												: undefined
										}
										className={cn(
											"h-8 w-8 rounded-lg transition-all cursor-pointer",
											annotation.style.textAlign !== "right" &&
												(isLight
													? "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
													: "text-slate-400 hover:bg-white/10 hover:text-white"),
										)}
									>
										<AlignRight className="h-4 w-4" />
									</ToggleGroupItem>
								</ToggleGroup>
							</div>

							{/* Colors */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className={cn(
											"text-xs font-bold mb-1.5 block",
											isLight ? "text-slate-700" : "text-slate-200",
										)}
									>
										{t("annotation.textColor")}
									</label>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													"w-full h-9 justify-start gap-2 px-2.5 rounded-xl border transition-all cursor-pointer font-medium",
													isLight
														? "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
														: "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200",
												)}
											>
												<div
													className="w-4 h-4 rounded-full border border-black/15 shrink-0"
													style={{ backgroundColor: annotation.style.color }}
												/>
												<span
													className={cn(
														"text-xs font-mono truncate flex-1 text-left",
														isLight ? "text-slate-800" : "text-slate-200",
													)}
												>
													{annotation.style.color}
												</span>
												<ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											side="top"
											className={cn(
												"w-[260px] p-3 rounded-2xl shadow-xl border",
												isLight
													? "bg-white border-slate-200 text-slate-900"
													: "bg-[#141824] border-white/10 text-slate-200",
											)}
										>
											<ColorPicker
												selectedColor={annotation.style.color}
												colorPalette={colorPalette}
												activeAccentHex={activeAccent.hex}
												isLight={isLight}
												translations={{
													colorWheel: t("annotation.colorWheel"),
													colorPalette: t("annotation.colorPalette"),
												}}
												onUpdateColor={(color) => {
													onStyleChange({ color: color });
												}}
											/>
										</PopoverContent>
									</Popover>
								</div>
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<label
											className={cn(
												"text-xs font-bold block",
												isLight ? "text-slate-700" : "text-slate-200",
											)}
										>
											{t("annotation.background")}
										</label>
										{annotation.style.backgroundColor &&
											annotation.style.backgroundColor !== "transparent" && (
												<button
													type="button"
													onClick={() => onStyleChange({ backgroundColor: "transparent" })}
													className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
													title="Remove black / color background"
												>
													✕ Remove BG
												</button>
											)}
									</div>
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => onStyleChange({ backgroundColor: "transparent" })}
											className={cn(
												"h-9 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0",
												annotation.style.backgroundColor === "transparent" ||
													!annotation.style.backgroundColor
													? isLight
														? "bg-indigo-50 border-indigo-400 text-indigo-700 ring-1 ring-indigo-400"
														: "bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500"
													: isLight
														? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
														: "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10",
											)}
										>
											None
										</button>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"flex-1 h-9 justify-start gap-2 px-2.5 rounded-xl border transition-all cursor-pointer font-medium min-w-0",
														annotation.style.backgroundColor &&
															annotation.style.backgroundColor !== "transparent"
															? isLight
																? "bg-indigo-50/50 border-indigo-300 text-slate-800"
																: "bg-indigo-500/10 border-indigo-500/40 text-slate-200"
															: isLight
																? "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
																: "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200",
													)}
												>
													<div className="w-4 h-4 rounded-full border border-black/15 shrink-0 relative overflow-hidden">
														<div className="absolute inset-0 checkerboard-bg opacity-50" />
														<div
															className="absolute inset-0"
															style={{
																backgroundColor:
																	annotation.style.backgroundColor === "transparent"
																		? "transparent"
																		: annotation.style.backgroundColor || "#000000",
															}}
														/>
													</div>
													<span
														className={cn(
															"text-xs truncate flex-1 text-left",
															isLight ? "text-slate-800" : "text-slate-200",
														)}
													>
														{annotation.style.backgroundColor === "transparent" ||
														!annotation.style.backgroundColor
															? "Set Color"
															: t("annotation.color")}
													</span>
													<ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
												</Button>
											</PopoverTrigger>
											<PopoverContent
												side="top"
												className={cn(
													"w-[260px] p-3 rounded-2xl shadow-xl border",
													isLight
														? "bg-white border-slate-200 text-slate-900"
														: "bg-[#141824] border-white/10 text-slate-200",
												)}
											>
												<ColorPicker
													selectedColor={annotation.style.backgroundColor}
													colorPalette={colorPalette}
													activeAccentHex={activeAccent.hex}
													isLight={isLight}
													translations={{
														colorWheel: t("annotation.colorWheel"),
														colorPalette: t("annotation.colorPalette"),
														clearBackground: t("annotation.clearBackground"),
													}}
													clearBackgroundOption={true}
													onUpdateColor={(color) => {
														onStyleChange({ backgroundColor: color });
													}}
												/>
											</PopoverContent>
										</Popover>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>

					{/* Image Upload */}
					<TabsContent value="image" className="mt-0 space-y-4">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleImageUpload}
							accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
							className="hidden"
						/>
						<Button
							onClick={() => fileInputRef.current?.click()}
							variant="outline"
							className={cn(
								"w-full gap-2 rounded-xl border border-dashed transition-all py-8 cursor-pointer font-bold text-xs",
								isLight
									? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 shadow-2xs"
									: "bg-white/5 border-white/15 text-slate-200 hover:bg-white/10 hover:border-indigo-400",
							)}
						>
							<Upload className="w-5 h-5" />
							{t("annotation.uploadImage")}
						</Button>

						{annotation.content && annotation.content.startsWith("data:image") && (
							<div
								className={cn(
									"rounded-xl border overflow-hidden p-2",
									isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10",
								)}
							>
								<img
									src={annotation.content}
									alt="Uploaded annotation"
									className="w-full h-auto rounded-lg"
								/>
							</div>
						)}

						<p
							className={cn(
								"text-xs text-center leading-relaxed",
								isLight ? "text-slate-500" : "text-slate-400",
							)}
						>
							{t("annotation.supportedFormats")}
						</p>
					</TabsContent>

					{/* Figure / Arrow */}
					<TabsContent value="figure" className="mt-0 space-y-4">
						<div>
							<label
								className={cn(
									"text-xs font-bold mb-2.5 block",
									isLight ? "text-slate-700" : "text-slate-200",
								)}
							>
								{t("annotation.arrowDirection")}
							</label>
							<div className="grid grid-cols-4 gap-2">
								{(
									[
										"up",
										"down",
										"left",
										"right",
										"up-right",
										"up-left",
										"down-right",
										"down-left",
									] as ArrowDirection[]
								).map((direction) => {
									const ArrowComponent = getArrowComponent(direction);
									const isSelected = annotation.figureData?.arrowDirection === direction;
									return (
										<button
											key={direction}
											onClick={() => {
												const newFigureData: FigureData = {
													...annotation.figureData!,
													arrowDirection: direction,
												};
												onFigureDataChange?.(newFigureData);
											}}
											className={cn(
												"h-14 rounded-xl border flex items-center justify-center transition-all p-2 cursor-pointer",
												isSelected
													? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
													: isLight
														? "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 shadow-2xs"
														: "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400",
											)}
										>
											<ArrowComponent
												color={isSelected ? "#ffffff" : isLight ? "#475569" : "#94a3b8"}
												strokeWidth={3}
											/>
										</button>
									);
								})}
							</div>
						</div>

						<div>
							<label
								className={cn(
									"text-xs font-bold mb-2 block",
									isLight ? "text-slate-700" : "text-slate-200",
								)}
							>
								{t("annotation.strokeWidth", {
									width: String(annotation.figureData?.strokeWidth || 4),
								})}
							</label>
							<Slider
								value={[annotation.figureData?.strokeWidth || 4]}
								onValueChange={([value]) => {
									const newFigureData: FigureData = {
										...annotation.figureData!,
										strokeWidth: value,
									};
									onFigureDataChange?.(newFigureData);
								}}
								min={1}
								max={6}
								step={1}
								className="w-full"
							/>
						</div>

						<div>
							<label
								className={cn(
									"text-xs font-bold mb-1.5 block",
									isLight ? "text-slate-700" : "text-slate-200",
								)}
							>
								{t("annotation.arrowColor")}
							</label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											"w-full h-9 justify-start gap-2 px-2.5 rounded-xl border transition-all cursor-pointer font-medium",
											isLight
												? "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs"
												: "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200",
										)}
									>
										<div
											className="w-4 h-4 rounded-full border border-black/15 shrink-0"
											style={{ backgroundColor: annotation.figureData?.color || "#34B27B" }}
										/>
										<span
											className={cn(
												"text-xs font-mono truncate flex-1 text-left",
												isLight ? "text-slate-800" : "text-slate-200",
											)}
										>
											{annotation.figureData?.color || "#34B27B"}
										</span>
										<ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className={cn(
										"w-[260px] p-3 rounded-2xl shadow-xl border",
										isLight
											? "bg-white border-slate-200 text-slate-900"
											: "bg-[#141824] border-white/10 text-slate-200",
									)}
								>
									<Block
										color={annotation.figureData?.color || "#34B27B"}
										colors={colorPalette}
										onChange={(color) => {
											const newFigureData: FigureData = {
												...annotation.figureData!,
												color: color.hex,
											};
											onFigureDataChange?.(newFigureData);
										}}
										style={{
											borderRadius: "8px",
										}}
									/>
								</PopoverContent>
							</Popover>
						</div>
					</TabsContent>
				</Tabs>

				{/* Action Buttons */}
				<div className="mt-4 grid grid-cols-2 gap-2">
					<Button
						onClick={() => onDuplicate?.()}
						variant="outline"
						size="sm"
						disabled={!onDuplicate}
						className={cn(
							"w-full gap-2 rounded-xl transition-all font-bold text-xs h-9 cursor-pointer border",
							isLight
								? "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
								: "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 hover:border-white/20",
						)}
					>
						<Copy className="w-4 h-4" />
						Duplicate
					</Button>

					<Button
						onClick={onDelete}
						variant="destructive"
						size="sm"
						className="w-full gap-2 rounded-xl transition-all font-bold text-xs h-9 cursor-pointer border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white"
					>
						<Trash2 className="w-4 h-4" />
						{t("annotation.deleteAnnotation")}
					</Button>
				</div>
			</div>
		</div>
	);
}
