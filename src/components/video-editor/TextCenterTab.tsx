import {
	AlertCircle,
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Check,
	Heading,
	Italic,
	LayoutGrid,
	List,
	MessageSquare,
	Plus,
	Search,
	Sparkles,
	Tag,
	Trash2,
	Type,
	Underline,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TitlePreset } from "./FilmoraMediaLibrary";
import type { AnnotationRegion, AnnotationTextAnimation } from "./types";

export interface TextCenterTabProps {
	currentTime?: number;
	duration?: number;
	onSelectTitlePreset?: (preset: TitlePreset) => void;
	onAddAnnotationWithText?: (text: string) => void;
	selectedAnnotation?: AnnotationRegion | null;
	onAnnotationContentChange?: (id: string, content: string) => void;
	onAnnotationStyleChange?: (id: string, style: Partial<AnnotationRegion["style"]>) => void;
	onAnnotationDelete?: (id: string) => void;
	isLight: boolean;
	activeAccent: { hex: string; textHex: string };
}

const FONT_OPTIONS = [
	{ label: "Inter", value: "Inter" },
	{ label: "Plus Jakarta Sans", value: '"Plus Jakarta Sans", sans-serif' },
	{ label: "Space Grotesk", value: '"Space Grotesk", sans-serif' },
	{ label: "DM Sans", value: '"DM Sans", sans-serif' },
	{ label: "Sora", value: "Sora, sans-serif" },
	{ label: "Bebas Neue", value: '"Bebas Neue", sans-serif' },
	{ label: "Oswald", value: "Oswald, sans-serif" },
	{ label: "Georgia (Serif)", value: "Georgia, serif" },
	{ label: "Courier (Mono)", value: "Courier New, monospace" },
	{ label: "Caveat (Handwritten)", value: "Caveat, cursive" },
];

const QUICK_TEXT_COLORS = [
	{ label: "White", value: "#ffffff" },
	{ label: "Cyan", value: "#22d3ee" },
	{ label: "Yellow", value: "#facc15" },
	{ label: "Gold", value: "#fbbf24" },
	{ label: "Rose", value: "#fb7185" },
	{ label: "Green", value: "#4ade80" },
	{ label: "Violet", value: "#c084fc" },
	{ label: "Black", value: "#000000" },
];

export const TEXT_PRESETS: TitlePreset[] = [
	{
		id: "bold-float",
		title: "Clean Floating Title",
		text: "FLOATING TITLE",
		styleName: "Pure floating headline without black background",
		color: "#ffffff",
		bg: "transparent",
		fontSize: 34,
		fontWeight: "bold",
		textAnimation: "pop",
		category: "titles",
	},
	{
		id: "bold-header",
		title: "Bold Modern Title (Backdrop)",
		text: "MODERN TITLE",
		styleName: "High impact bold headline with dark backdrop",
		color: "#ffffff",
		bg: "rgba(0,0,0,0.8)",
		fontSize: 32,
		fontWeight: "bold",
		textAnimation: "pop",
		category: "titles",
	},
	{
		id: "cyberpunk",
		title: "Cyberpunk Neon",
		text: "CYBERPUNK",
		styleName: "Glowing cyan & magenta neon typography",
		color: "#22d3ee",
		bg: "transparent",
		fontSize: 28,
		fontWeight: "bold",
		textAnimation: "pulse",
		category: "titles",
	},
	{
		id: "cinematic-gold",
		title: "Cinematic Chapter",
		text: "CHAPTER I",
		styleName: "Luxury serif gold title for chapters",
		color: "#fbbf24",
		bg: "transparent",
		fontSize: 26,
		fontWeight: "bold",
		textAnimation: "fade",
		category: "titles",
	},
	{
		id: "subtitle-clean",
		title: "Minimal Subtitle",
		text: "Clean Subtitle Text",
		styleName: "Crisp white caption with soft backdrop",
		color: "#ffffff",
		bg: "rgba(0,0,0,0.75)",
		fontSize: 20,
		fontWeight: "normal",
		textAnimation: "fade",
		category: "subtitles",
	},
	{
		id: "subtitle-transparent",
		title: "Floating Subtitle",
		text: "Floating Caption",
		styleName: "Transparent caption with shadow outline",
		color: "#ffffff",
		bg: "transparent",
		fontSize: 22,
		fontWeight: "normal",
		textAnimation: "fade",
		category: "subtitles",
	},
	{
		id: "lower-third",
		title: "Lower Third Clean",
		text: "SPEAKER • HOST",
		styleName: "Broadcaster speaker badge with accent line",
		color: "#f8fafc",
		bg: "rgba(15,23,42,0.9)",
		fontSize: 18,
		fontWeight: "bold",
		textAnimation: "slide-left",
		category: "subtitles",
	},
	{
		id: "glitch-pulse",
		title: "Glitch Alert Callout",
		text: "BREAKING NEWS",
		styleName: "Attention grabbing glowing alert badge",
		color: "#fb7185",
		bg: "rgba(225,29,72,0.25)",
		fontSize: 22,
		fontWeight: "bold",
		textAnimation: "pulse",
		category: "badges",
	},
	{
		id: "karaoke-pop",
		title: "Pop Sticker Badge",
		text: "WATCH THIS!",
		styleName: "Vibrant yellow sticker with solid drop shadow",
		color: "#000000",
		bg: "#facc15",
		fontSize: 24,
		fontWeight: "bold",
		textAnimation: "pop",
		category: "badges",
	},
	{
		id: "minimal-tag",
		title: "Modern Violet Tag",
		text: "✦ FEATURED",
		styleName: "Sleek frosted pill badge with purple glow",
		color: "#d8b4fe",
		bg: "rgba(147,51,234,0.25)",
		fontSize: 18,
		fontWeight: "bold",
		textAnimation: "rise",
		category: "badges",
	},
	{
		id: "gaming-victory",
		title: "Arcade Gaming Banner",
		text: "VICTORY!",
		styleName: "Esports neon green champion banner",
		color: "#4ade80",
		bg: "transparent",
		fontSize: 28,
		fontWeight: "bold",
		textAnimation: "pop",
		category: "titles",
	},
	{
		id: "social-watermark",
		title: "Social Handle Badge",
		text: "@creator • Follow",
		styleName: "Frosted glass capsule watermark",
		color: "#ffffff",
		bg: "rgba(255,255,255,0.15)",
		fontSize: 16,
		fontWeight: "normal",
		textAnimation: "fade",
		category: "subtitles",
	},
];

/**
 * Visual canvas preview thumbnail for each text style.
 * Uses a dark simulated video frame to ensure all colors (white, neon, gold, yellow)
 * look high contrast, vivid, and realistic in both dark and light modes.
 */
function TextPreviewThumbnail({
	preset,
	layout = "grid",
}: {
	preset: TitlePreset;
	layout?: "grid" | "list";
}) {
	const renderContent = () => {
		switch (preset.id) {
			case "bold-float":
				return (
					<div className="text-center px-2">
						<span className="font-black text-[12px] sm:text-[13px] tracking-tight text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
							FLOATING TITLE
						</span>
					</div>
				);

			case "bold-header":
				return (
					<div className="text-center px-2">
						<span className="font-black text-[12px] sm:text-[13px] tracking-tight text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
							MODERN TITLE
						</span>
					</div>
				);

			case "cyberpunk":
				return (
					<div className="text-center px-2">
						<span className="font-mono font-black text-[11px] sm:text-[12px] text-cyan-300 tracking-widest uppercase drop-shadow-[0_0_8px_#06b6d4] drop-shadow-[0_0_16px_#ec4899]">
							CYBERPUNK
						</span>
					</div>
				);

			case "cinematic-gold":
				return (
					<div className="text-center px-2">
						<div className="font-serif italic font-bold text-[11px] text-amber-300 tracking-[0.25em] drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
							CHAPTER I
						</div>
						<div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mx-auto mt-0.5" />
					</div>
				);

			case "subtitle-clean":
				return (
					<div className="w-full px-2 flex justify-center">
						<div className="bg-black/85 backdrop-blur-xs border border-white/20 px-2 py-0.5 rounded-md text-[10px] font-medium text-white shadow-md text-center truncate max-w-full">
							Clean subtitle caption
						</div>
					</div>
				);

			case "subtitle-transparent":
				return (
					<div className="w-full px-2 flex justify-center">
						<span className="text-[11px] font-medium text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center truncate max-w-full">
							Floating Caption
						</span>
					</div>
				);

			case "lower-third":
				return (
					<div className="w-full px-2 flex justify-start">
						<div className="flex items-center gap-1.5 bg-slate-900/95 border-l-[3px] border-indigo-400 px-2 py-0.5 rounded-r shadow-md max-w-full truncate">
							<span className="text-[9px] font-black text-white truncate">ALEX MORGAN</span>
							<span className="text-[8px] text-indigo-300 truncate font-semibold">• Host</span>
						</div>
					</div>
				);

			case "glitch-pulse":
				return (
					<div className="flex items-center gap-1.5 bg-rose-500/25 border border-rose-500/70 px-2.5 py-0.5 rounded-full text-[10px] font-black text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]">
						<span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
						<span className="tracking-wider">ALERT</span>
					</div>
				);

			case "karaoke-pop":
				return (
					<div className="bg-yellow-400 text-black font-black text-[10px] uppercase px-2 py-0.5 rounded shadow-[2px_2px_0px_#000] -rotate-2 transform tracking-wide">
						WATCH THIS!
					</div>
				);

			case "minimal-tag":
				return (
					<div className="bg-purple-500/25 border border-purple-400/60 text-purple-200 font-bold text-[9px] px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.3)]">
						✦ FEATURED
					</div>
				);

			case "gaming-victory":
				return (
					<div className="font-black text-[11px] text-emerald-400 tracking-wider drop-shadow-[0_0_8px_#10b981] uppercase">
						VICTORY!
					</div>
				);

			case "social-watermark":
				return (
					<div className="flex items-center gap-1 bg-white/15 backdrop-blur-xs border border-white/25 text-white font-medium text-[9px] px-2.5 py-0.5 rounded-full shadow-xs">
						<span>@creator</span>
						<span className="text-white/70">• follow</span>
					</div>
				);

			default:
				return (
					<div
						className="px-2 py-0.5 rounded font-bold text-[10px] text-center truncate max-w-[90%]"
						style={{
							color: preset.color || "#ffffff",
							backgroundColor: preset.bg || "transparent",
						}}
					>
						{preset.text || preset.title}
					</div>
				);
		}
	};

	const categoryBadge = preset.category?.toUpperCase() || "STYLE";

	return (
		<div
			className={cn(
				"relative rounded-xl overflow-hidden bg-gradient-to-br from-[#070b14] via-[#0d1322] to-[#1e1b4b] border border-white/10 flex items-center justify-center p-2 select-none group-hover:border-indigo-400/50 transition-all shadow-inner shrink-0",
				layout === "list" ? "w-28 h-16" : "w-full aspect-[16/10]",
			)}
		>
			{/* Subtle simulated video frame watermark & scanline */}
			<div className="absolute top-1 right-1.5 text-[8px] font-extrabold uppercase px-1 rounded bg-black/60 text-white/50 border border-white/10 tracking-wider">
				{categoryBadge}
			</div>

			{/* Center rendered typography */}
			{renderContent()}
		</div>
	);
}

export function TextCenterTab({
	onSelectTitlePreset,
	onAddAnnotationWithText,
	selectedAnnotation,
	onAnnotationContentChange,
	onAnnotationStyleChange,
	onAnnotationDelete,
	isLight,
	activeAccent,
}: TextCenterTabProps) {
	const [activeCategory, setActiveCategory] = useState<"all" | "titles" | "subtitles" | "badges">(
		"all",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [justInsertedId, setJustInsertedId] = useState<string | null>(null);

	const filteredPresets = useMemo(() => {
		return TEXT_PRESETS.filter((preset) => {
			if (activeCategory === "titles") {
				if (preset.category !== "titles") return false;
			} else if (activeCategory === "subtitles") {
				if (preset.category !== "subtitles") return false;
			} else if (activeCategory === "badges") {
				if (preset.category !== "badges") return false;
			}

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				preset.title.toLowerCase().includes(q) ||
				preset.styleName.toLowerCase().includes(q) ||
				preset.text.toLowerCase().includes(q)
			);
		});
	}, [activeCategory, searchQuery]);

	const handleInsertPreset = (preset: TitlePreset) => {
		setJustInsertedId(preset.id);
		setTimeout(() => setJustInsertedId(null), 1500);

		if (onSelectTitlePreset) {
			onSelectTitlePreset(preset);
		} else if (onAddAnnotationWithText) {
			onAddAnnotationWithText(preset.title);
		}
	};

	const handleQuickAdd = (type: "title" | "subtitle" | "lowerThird" | "callout") => {
		const textMap = {
			title: "Big Modern Title",
			subtitle: "Add your subtitle text here",
			lowerThird: "Presenter Name • Title",
			callout: "PRO TIP: Click here",
		};
		const text = textMap[type];
		if (onSelectTitlePreset) {
			onSelectTitlePreset({
				id: `quick-${type}-${Date.now()}`,
				title: text,
				text,
				styleName: "Quick Style",
				color: "#ffffff",
				// Clean transparent background by default for titles & subtitles
				bg:
					type === "lowerThird"
						? "rgba(15,23,42,0.9)"
						: type === "callout"
							? "rgba(225,29,72,0.25)"
							: "transparent",
				fontSize: type === "title" ? 34 : type === "subtitle" ? 22 : 24,
				fontWeight: "bold",
				textAnimation: "pop",
			});
		} else if (onAddAnnotationWithText) {
			onAddAnnotationWithText(text);
		}
	};

	const currentFontSize = selectedAnnotation?.style?.fontSize || 32;
	const currentBg = selectedAnnotation?.style?.backgroundColor || "transparent";
	const hasBackground = Boolean(currentBg && currentBg !== "transparent");

	return (
		<div className="space-y-4">
			{/* Quick Text Action Buttons Row */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span
						className={cn(
							"text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5",
							isLight ? "text-slate-600" : "text-slate-400",
						)}
					>
						<Sparkles className="w-3 h-3 text-indigo-400" />
						Quick Text Creators
					</span>
					<span className="text-[10px] text-slate-400 font-semibold">1-Click Insert</span>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => handleQuickAdd("title")}
						className={cn(
							"h-9 rounded-xl font-bold text-xs gap-1.5 justify-start cursor-pointer border transition-all active:scale-95 shadow-2xs",
							isLight
								? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-300"
								: "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white hover:border-indigo-400/40",
						)}
					>
						<div className="w-5 h-5 rounded-md bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
							<Heading className="w-3.5 h-3.5" />
						</div>
						<span className="truncate">+ Title (Floating)</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => handleQuickAdd("subtitle")}
						className={cn(
							"h-9 rounded-xl font-bold text-xs gap-1.5 justify-start cursor-pointer border transition-all active:scale-95 shadow-2xs",
							isLight
								? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-cyan-300"
								: "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white hover:border-cyan-400/40",
						)}
					>
						<div className="w-5 h-5 rounded-md bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
							<MessageSquare className="w-3.5 h-3.5" />
						</div>
						<span className="truncate">+ Subtitle Text</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => handleQuickAdd("lowerThird")}
						className={cn(
							"h-9 rounded-xl font-bold text-xs gap-1.5 justify-start cursor-pointer border transition-all active:scale-95 shadow-2xs",
							isLight
								? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-300"
								: "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white hover:border-emerald-400/40",
						)}
					>
						<div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
							<Tag className="w-3.5 h-3.5" />
						</div>
						<span className="truncate">+ Lower Third</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => handleQuickAdd("callout")}
						className={cn(
							"h-9 rounded-xl font-bold text-xs gap-1.5 justify-start cursor-pointer border transition-all active:scale-95 shadow-2xs",
							isLight
								? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-rose-300"
								: "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white hover:border-rose-400/40",
						)}
					>
						<div className="w-5 h-5 rounded-md bg-rose-500/15 flex items-center justify-center text-rose-400 shrink-0">
							<AlertCircle className="w-3.5 h-3.5" />
						</div>
						<span className="truncate">+ Callout Badge</span>
					</Button>
				</div>
			</div>

			{/* Selected Annotation Quick Editor Card */}
			{selectedAnnotation && (
				<div
					className={cn(
						"p-3.5 rounded-2xl border space-y-3.5 shadow-xs transition-all",
						isLight ? "bg-indigo-50/70 border-indigo-200" : "bg-indigo-500/10 border-indigo-500/30",
					)}
				>
					{/* Header with Title, 1-Click Remove BG button and Delete */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5 min-w-0">
							<Type className="w-4 h-4 text-indigo-400 shrink-0" />
							<span
								className={cn(
									"text-xs font-bold uppercase tracking-wider truncate",
									isLight ? "text-indigo-950" : "text-indigo-200",
								)}
							>
								Selected Text Style
							</span>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							{/* Quick Remove Black BG button */}
							{hasBackground && (
								<button
									type="button"
									onClick={() =>
										onAnnotationStyleChange?.(selectedAnnotation.id, {
											backgroundColor: "transparent",
										})
									}
									className="px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all bg-rose-500/15 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30 flex items-center gap-1"
									title="Remove black / color background"
								>
									<X className="w-3 h-3" />
									Remove BG
								</button>
							)}

							{onAnnotationDelete && (
								<button
									type="button"
									onClick={() => onAnnotationDelete(selectedAnnotation.id)}
									className="text-slate-400 hover:text-rose-400 p-1 rounded cursor-pointer transition-colors"
									title="Delete this text"
								>
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							)}
						</div>
					</div>

					{/* Textarea Content */}
					<div className="space-y-1">
						<textarea
							rows={2}
							value={selectedAnnotation.content}
							onChange={(e) => onAnnotationContentChange?.(selectedAnnotation.id, e.target.value)}
							placeholder="Type your text content here..."
							className={cn(
								"w-full p-2.5 text-xs rounded-xl border outline-none resize-none transition-all font-sans",
								isLight
									? "bg-white border-slate-200 text-slate-900 focus:border-indigo-400 shadow-2xs"
									: "bg-black/40 border-white/10 text-white focus:border-indigo-400",
							)}
						/>
					</div>

					{/* Font Family (Style) & Font Size Stepper */}
					<div className="space-y-2">
						<div className="grid grid-cols-2 gap-2">
							{/* Font Family Dropdown */}
							<div className="space-y-1">
								<span className="text-[10px] font-bold text-slate-400 block">Font Family:</span>
								<select
									value={selectedAnnotation.style?.fontFamily || "Inter"}
									onChange={(e) =>
										onAnnotationStyleChange?.(selectedAnnotation.id, {
											fontFamily: e.target.value,
										})
									}
									className={cn(
										"w-full h-8 px-2 text-xs font-semibold rounded-xl border outline-none cursor-pointer",
										isLight
											? "bg-white border-slate-200 text-slate-800"
											: "bg-white/5 border-white/10 text-slate-200",
									)}
								>
									{FONT_OPTIONS.map((font) => (
										<option key={font.value} value={font.value} className="bg-slate-900 text-white">
											{font.label}
										</option>
									))}
								</select>
							</div>

							{/* Font Size Stepper */}
							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-bold text-slate-400">Font Size:</span>
									<span className="text-[10px] font-mono font-bold text-indigo-400">
										{currentFontSize}px
									</span>
								</div>
								<div className="flex items-center gap-1 h-8">
									<button
										type="button"
										onClick={() =>
											onAnnotationStyleChange?.(selectedAnnotation.id, {
												fontSize: Math.max(12, currentFontSize - 4),
											})
										}
										className={cn(
											"w-8 h-8 rounded-xl border font-black text-sm flex items-center justify-center cursor-pointer transition-all",
											isLight
												? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
												: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
										)}
									>
										-
									</button>
									<div
										className={cn(
											"flex-1 h-8 rounded-xl border flex items-center justify-center font-mono font-bold text-xs",
											isLight
												? "bg-white border-slate-200 text-slate-800"
												: "bg-white/5 border-white/10 text-white",
										)}
									>
										{currentFontSize}
									</div>
									<button
										type="button"
										onClick={() =>
											onAnnotationStyleChange?.(selectedAnnotation.id, {
												fontSize: Math.min(140, currentFontSize + 4),
											})
										}
										className={cn(
											"w-8 h-8 rounded-xl border font-black text-sm flex items-center justify-center cursor-pointer transition-all",
											isLight
												? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
												: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
										)}
									>
										+
									</button>
								</div>
							</div>
						</div>

						{/* Quick Size Preset Chips */}
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-[10px] font-bold text-slate-400">Presets:</span>
							{[
								{ label: "18", size: 18 },
								{ label: "24", size: 24 },
								{ label: "32", size: 32 },
								{ label: "44", size: 44 },
								{ label: "60", size: 60 },
							].map((p) => (
								<button
									key={p.label}
									type="button"
									onClick={() =>
										onAnnotationStyleChange?.(selectedAnnotation.id, {
											fontSize: p.size,
										})
									}
									className={cn(
										"px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
										currentFontSize === p.size
											? "border-indigo-400 bg-indigo-500 text-white"
											: isLight
												? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
												: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
									)}
								>
									{p.label}
								</button>
							))}
						</div>
					</div>

					{/* Background Control: 1-Click Transparent vs Color Backdrops */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-bold text-slate-400">Background:</span>
							<span
								className={cn(
									"text-[10px] font-bold font-mono",
									!hasBackground ? "text-emerald-500" : "text-amber-400",
								)}
							>
								{!hasBackground ? "No Background (Transparent)" : "Color Fill Active"}
							</span>
						</div>

						<div className="grid grid-cols-3 gap-1.5">
							{/* Option 1: Transparent / None */}
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										backgroundColor: "transparent",
									})
								}
								className={cn(
									"h-7 rounded-xl border text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all",
									!hasBackground
										? "border-emerald-500 bg-emerald-500 text-white shadow-2xs"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
							>
								<X className="w-3 h-3" />
								Transparent
							</button>

							{/* Option 2: Dark Backdrop (80%) */}
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										backgroundColor: "rgba(0,0,0,0.8)",
									})
								}
								className={cn(
									"h-7 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all",
									currentBg === "rgba(0,0,0,0.8)" || currentBg === "#000000"
										? "border-indigo-400 bg-indigo-500 text-white shadow-2xs"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
							>
								<div className="w-2.5 h-2.5 rounded-full bg-black border border-white/40" />
								Dark Box
							</button>

							{/* Option 3: Accent Backdrop */}
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										backgroundColor: `${activeAccent.hex}30`,
									})
								}
								className={cn(
									"h-7 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all",
									currentBg === `${activeAccent.hex}30`
										? "border-indigo-400 bg-indigo-500 text-white shadow-2xs"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
							>
								<div
									className="w-2.5 h-2.5 rounded-full"
									style={{ backgroundColor: activeAccent.hex }}
								/>
								Accent Tint
							</button>
						</div>
					</div>

					{/* Quick Text Color Palette Swatches */}
					<div className="space-y-1.5">
						<span className="text-[10px] font-bold text-slate-400 block">Text Color:</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{QUICK_TEXT_COLORS.map((c) => {
								const isSelected = selectedAnnotation.style?.color === c.value;
								return (
									<button
										key={c.value}
										type="button"
										onClick={() =>
											onAnnotationStyleChange?.(selectedAnnotation.id, {
												color: c.value,
											})
										}
										className={cn(
											"w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer relative",
											isSelected
												? "scale-110 ring-2 ring-indigo-400 shadow-sm"
												: "hover:scale-105 border-white/20",
										)}
										style={{ backgroundColor: c.value }}
										title={c.label}
									>
										{isSelected && (
											<Check
												className={cn(
													"w-3 h-3 stroke-[3]",
													c.value === "#ffffff" ? "text-black" : "text-white",
												)}
											/>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Formatting (Bold / Italic / Alignment) & Animation */}
					<div className="grid grid-cols-2 gap-2 pt-1">
						{/* Bold & Italic & Align */}
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										fontWeight: selectedAnnotation.style?.fontWeight === "bold" ? "normal" : "bold",
									})
								}
								className={cn(
									"w-7 h-7 rounded-lg border text-xs font-black flex items-center justify-center cursor-pointer transition-all",
									selectedAnnotation.style?.fontWeight === "bold"
										? "bg-indigo-500 border-indigo-500 text-white"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
								title="Toggle Bold"
							>
								<Bold className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										fontStyle:
											selectedAnnotation.style?.fontStyle === "italic" ? "normal" : "italic",
									})
								}
								className={cn(
									"w-7 h-7 rounded-lg border text-xs font-black flex items-center justify-center cursor-pointer transition-all",
									selectedAnnotation.style?.fontStyle === "italic"
										? "bg-indigo-500 border-indigo-500 text-white"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
								title="Toggle Italic"
							>
								<Italic className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										textDecoration:
											selectedAnnotation.style?.textDecoration === "underline"
												? "none"
												: "underline",
									})
								}
								className={cn(
									"w-7 h-7 rounded-lg border text-xs font-black flex items-center justify-center cursor-pointer transition-all",
									selectedAnnotation.style?.textDecoration === "underline"
										? "bg-indigo-500 border-indigo-500 text-white"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
								title="Toggle Underline"
							>
								<Underline className="w-3.5 h-3.5" />
							</button>

							<div className="w-[1px] h-5 bg-slate-300 dark:bg-white/10 mx-0.5" />

							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										textAlign: "left",
									})
								}
								className={cn(
									"w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all",
									selectedAnnotation.style?.textAlign === "left"
										? "bg-indigo-500 border-indigo-500 text-white"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
								title="Align Left"
							>
								<AlignLeft className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										textAlign: "center",
									})
								}
								className={cn(
									"w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all",
									selectedAnnotation.style?.textAlign === "center" ||
										!selectedAnnotation.style?.textAlign
										? "bg-indigo-500 border-indigo-500 text-white"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
								title="Align Center"
							>
								<AlignCenter className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={() =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										textAlign: "right",
									})
								}
								className={cn(
									"w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all",
									selectedAnnotation.style?.textAlign === "right"
										? "bg-indigo-500 border-indigo-500 text-white"
										: isLight
											? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
											: "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
								)}
								title="Align Right"
							>
								<AlignRight className="w-3.5 h-3.5" />
							</button>
						</div>

						{/* Animation selector */}
						<div>
							<select
								value={selectedAnnotation.style?.textAnimation || "none"}
								onChange={(e) =>
									onAnnotationStyleChange?.(selectedAnnotation.id, {
										textAnimation: e.target.value as AnnotationTextAnimation,
									})
								}
								className={cn(
									"w-full h-7 px-2 text-[11px] font-semibold rounded-xl border outline-none cursor-pointer",
									isLight
										? "bg-white border-slate-200 text-slate-800"
										: "bg-white/5 border-white/10 text-slate-200",
								)}
							>
								<option value="none" className="bg-slate-900 text-white">
									No Animation
								</option>
								<option value="pop" className="bg-slate-900 text-white">
									Pop Animation
								</option>
								<option value="fade" className="bg-slate-900 text-white">
									Fade Animation
								</option>
								<option value="rise" className="bg-slate-900 text-white">
									Rise Animation
								</option>
								<option value="slide-left" className="bg-slate-900 text-white">
									Slide In
								</option>
								<option value="pulse" className="bg-slate-900 text-white">
									Pulse Animation
								</option>
								<option value="typewriter" className="bg-slate-900 text-white">
									Typewriter
								</option>
							</select>
						</div>
					</div>
				</div>
			)}

			{/* Category Selector Pills */}
			<div
				className={cn(
					"flex items-center gap-1 p-1 rounded-xl border",
					isLight ? "bg-slate-100/90 border-[#e4e4e7]" : "bg-white/[0.04] border-white/[0.06]",
				)}
			>
				{[
					{ id: "all", label: "All Styles" },
					{ id: "titles", label: "Titles" },
					{ id: "subtitles", label: "Subtitles" },
					{ id: "badges", label: "Badges" },
				].map((tab) => {
					const isActive = activeCategory === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveCategory(tab.id as "all" | "titles" | "subtitles" | "badges")}
							className={cn(
								"flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer",
								isActive
									? isLight
										? "bg-white text-slate-900 shadow-2xs font-extrabold"
										: "bg-white/10 text-white shadow-2xs font-extrabold"
									: "text-slate-400 hover:text-slate-200",
							)}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Search Box & View Mode Toggle */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search titles, neon, subtitles, badges..."
						className={cn(
							"w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border transition-all outline-none",
							isLight
								? "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
								: "bg-white/[0.03] border-white/10 text-white placeholder-slate-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20",
						)}
					/>
				</div>

				{/* Grid vs List View Mode Toggle */}
				<div
					className={cn(
						"flex items-center p-0.5 rounded-xl border shrink-0",
						isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.04] border-white/10",
					)}
				>
					<button
						type="button"
						onClick={() => setViewMode("grid")}
						title="Visual Grid View"
						className={cn(
							"p-1.5 rounded-lg transition-all cursor-pointer",
							viewMode === "grid"
								? isLight
									? "bg-white text-indigo-600 shadow-2xs"
									: "bg-white/10 text-indigo-400 shadow-2xs"
								: "text-slate-400 hover:text-slate-200",
						)}
					>
						<LayoutGrid className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => setViewMode("list")}
						title="Detailed List View"
						className={cn(
							"p-1.5 rounded-lg transition-all cursor-pointer",
							viewMode === "list"
								? isLight
									? "bg-white text-indigo-600 shadow-2xs"
									: "bg-white/10 text-indigo-400 shadow-2xs"
								: "text-slate-400 hover:text-slate-200",
						)}
					>
						<List className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{/* Presets Gallery Header */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span
						className={cn(
							"text-[11px] font-extrabold uppercase tracking-wider",
							isLight ? "text-slate-600" : "text-slate-400",
						)}
					>
						Titles & Text Styles Gallery
					</span>
					<span className="text-[10px] font-semibold font-mono" style={{ color: activeAccent.hex }}>
						{filteredPresets.length} Styles
					</span>
				</div>

				{/* Empty State */}
				{filteredPresets.length === 0 ? (
					<div className="text-center py-8 text-xs text-slate-400">
						No text styles found matching "{searchQuery}"
					</div>
				) : viewMode === "grid" ? (
					/* 2-Column Visual Card Grid (CapCut / Canva Style) */
					<div className="grid grid-cols-2 gap-2.5">
						{filteredPresets.map((preset) => {
							const isJustInserted = justInsertedId === preset.id;
							return (
								<div
									key={preset.id}
									onClick={() => handleInsertPreset(preset)}
									style={
										isJustInserted
											? {
													borderColor: activeAccent.hex,
													boxShadow: `0 0 14px ${activeAccent.hex}50`,
												}
											: undefined
									}
									className={cn(
										"rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden group shadow-2xs flex flex-col justify-between",
										isJustInserted
											? "ring-2 scale-[0.98]"
											: isLight
												? "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5"
												: "bg-white/[0.03] border-white/[0.08] hover:border-indigo-400 hover:bg-white/[0.06] hover:shadow-md hover:-translate-y-0.5",
									)}
								>
									{/* Visual Video Canvas Thumbnail */}
									<div className="relative">
										<TextPreviewThumbnail preset={preset} layout="grid" />

										{/* Quick Hover Overlay with Insert Pill */}
										<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 backdrop-blur-[2px]">
											<div className="px-3 py-1.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-lg bg-indigo-600 text-white transform scale-90 group-hover:scale-100 transition-transform">
												{isJustInserted ? (
													<>
														<Check className="w-3 h-3 stroke-[3]" />
														Added!
													</>
												) : (
													<>
														<Plus className="w-3 h-3" />
														Insert
													</>
												)}
											</div>
										</div>
									</div>

									{/* Card Footer with Title & Style info */}
									<div className="p-2.5 space-y-0.5">
										<div
											className={cn(
												"text-xs font-bold truncate group-hover:text-indigo-400 transition-colors",
												isLight ? "text-slate-800" : "text-slate-100",
											)}
										>
											{preset.title}
										</div>
										<div className="text-[10px] text-slate-400 truncate leading-tight">
											{preset.styleName}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					/* Detailed Horizontal Card List View */
					<div className="grid grid-cols-1 gap-2.5">
						{filteredPresets.map((preset) => {
							const isJustInserted = justInsertedId === preset.id;
							return (
								<div
									key={preset.id}
									className={cn(
										"p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-150 group shadow-2xs",
										isJustInserted
											? "ring-2 ring-indigo-500"
											: isLight
												? "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xs"
												: "bg-white/[0.03] border-white/[0.08] hover:border-indigo-400 hover:bg-white/[0.05]",
									)}
								>
									<div className="flex items-center gap-3 min-w-0 flex-1">
										{/* Widescreen 16:9 Canvas Thumbnail */}
										<TextPreviewThumbnail preset={preset} layout="list" />

										<div className="min-w-0 flex-1">
											<div
												className={cn(
													"text-xs font-bold truncate flex items-center gap-1.5",
													isLight ? "text-slate-800" : "text-slate-100",
												)}
											>
												<span className="truncate">{preset.title}</span>
											</div>
											<div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
												{preset.styleName}
											</div>
										</div>
									</div>

									{/* Insert Button */}
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => handleInsertPreset(preset)}
										className={cn(
											"h-8 px-3 text-xs font-bold rounded-xl shrink-0 transition-all cursor-pointer border",
											isJustInserted
												? "border-emerald-500 bg-emerald-500 text-white"
												: isLight
													? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
													: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white",
										)}
									>
										{isJustInserted ? (
											<>
												<Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
												Added
											</>
										) : (
											<>
												<Plus className="w-3.5 h-3.5 mr-1" />
												Insert
											</>
										)}
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
