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
import { AddCustomFontDialog } from "./AddCustomFontDialog";
import type { TitlePreset } from "./FilmoraMediaLibrary";
import { FontSelector } from "./FontSelector";
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
		text: "SAMPLE TITLE",
		styleName: "Pure floating headline without black background",
		color: "#ffffff",
		bg: "transparent",
		fontSize: 34,
		fontFamily: '"Plus Jakarta Sans", sans-serif',
		fontWeight: "bold",
		textShadow: "0 2px 10px rgba(0,0,0,0.85)",
		textAnimation: "pop",
		category: "titles",
	},
	{
		id: "bold-header",
		title: "Bold Modern Title (Backdrop)",
		text: "SAMPLE TITLE",
		styleName: "High impact bold headline with dark backdrop",
		color: "#ffffff",
		bg: "rgba(0,0,0,0.85)",
		fontSize: 32,
		fontFamily: '"Plus Jakarta Sans", sans-serif',
		fontWeight: "bold",
		borderRadius: "8px",
		padding: "0.25em 0.75em",
		border: "1px solid rgba(255,255,255,0.2)",
		boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
		textAnimation: "pop",
		category: "titles",
	},
	{
		id: "cyberpunk",
		title: "Cyberpunk Neon",
		text: "SAMPLE TITLE",
		styleName: "Glowing cyan & magenta neon typography",
		color: "#22d3ee",
		bg: "transparent",
		fontSize: 28,
		fontFamily: '"Space Grotesk", sans-serif',
		fontWeight: "bold",
		letterSpacing: "0.12em",
		textShadow: "0 0 8px #06b6d4, 0 0 16px rgba(6,182,212,0.6)",
		textAnimation: "pulse",
		category: "titles",
	},
	{
		id: "cinematic-gold",
		title: "Cinematic Chapter",
		text: "Sample Title",
		styleName: "Luxury serif gold title for chapters",
		color: "#fbbf24",
		bg: "transparent",
		fontSize: 28,
		fontFamily: "Georgia, serif",
		fontWeight: "bold",
		fontStyle: "italic",
		letterSpacing: "0.14em",
		textShadow: "0 2px 10px rgba(245,158,11,0.5)",
		textAnimation: "fade",
		category: "titles",
	},
	{
		id: "subtitle-clean",
		title: "Minimal Subtitle",
		text: "Sample Title",
		styleName: "Crisp white caption with soft backdrop",
		color: "#ffffff",
		bg: "rgba(0,0,0,0.8)",
		fontSize: 20,
		fontFamily: "Inter, sans-serif",
		fontWeight: "normal",
		borderRadius: "6px",
		padding: "0.2em 0.65em",
		textAnimation: "fade",
		category: "subtitles",
	},
	{
		id: "subtitle-transparent",
		title: "Floating Subtitle",
		text: "Sample Title",
		styleName: "Transparent caption with shadow outline",
		color: "#ffffff",
		bg: "transparent",
		fontSize: 22,
		fontFamily: "Inter, sans-serif",
		fontWeight: "normal",
		textShadow: "0 2px 8px rgba(0,0,0,0.95)",
		textAnimation: "fade",
		category: "subtitles",
	},
	{
		id: "lower-third",
		title: "Lower Third Clean",
		text: "SAMPLE TITLE • HOST",
		styleName: "Broadcaster speaker badge with accent line",
		color: "#f8fafc",
		bg: "rgba(15,23,42,0.92)",
		fontSize: 18,
		fontFamily: '"Plus Jakarta Sans", sans-serif',
		fontWeight: "bold",
		borderRadius: "6px",
		padding: "0.25em 0.75em",
		border: "1px solid rgba(99,102,241,0.5)",
		boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
		textAnimation: "slide-left",
		category: "subtitles",
	},
	{
		id: "glitch-pulse",
		title: "Glitch Alert Callout",
		text: "• SAMPLE TITLE",
		styleName: "Attention grabbing glowing alert badge",
		color: "#fb7185",
		bg: "rgba(225,29,72,0.25)",
		fontSize: 20,
		fontFamily: '"Plus Jakarta Sans", sans-serif',
		fontWeight: "bold",
		borderRadius: "9999px",
		padding: "0.25em 0.85em",
		border: "1px solid rgba(251,113,133,0.4)",
		boxShadow: "0 0 12px rgba(244,63,94,0.3)",
		textAnimation: "pulse",
		category: "badges",
	},
	{
		id: "karaoke-pop",
		title: "Pop Sticker Badge",
		text: "SAMPLE TITLE!",
		styleName: "Vibrant yellow sticker with solid drop shadow",
		color: "#000000",
		bg: "#facc15",
		fontSize: 22,
		fontFamily: '"Plus Jakarta Sans", sans-serif',
		fontWeight: "bold",
		borderRadius: "6px",
		padding: "0.25em 0.75em",
		boxShadow: "3px 3px 0px #000000",
		textAnimation: "pop",
		category: "badges",
	},
	{
		id: "minimal-tag",
		title: "Modern Violet Tag",
		text: "✦ SAMPLE TITLE",
		styleName: "Sleek frosted pill badge with purple glow",
		color: "#d8b4fe",
		bg: "rgba(147,51,234,0.25)",
		fontSize: 18,
		fontFamily: '"Plus Jakarta Sans", sans-serif',
		fontWeight: "bold",
		borderRadius: "9999px",
		padding: "0.25em 0.85em",
		border: "1px solid rgba(192,132,252,0.4)",
		boxShadow: "0 0 14px rgba(168,85,247,0.35)",
		textAnimation: "rise",
		category: "badges",
	},
	{
		id: "gaming-victory",
		title: "Arcade Gaming Banner",
		text: "SAMPLE TITLE!",
		styleName: "Esports neon green champion banner",
		color: "#4ade80",
		bg: "transparent",
		fontSize: 28,
		fontFamily: '"Bebas Neue", sans-serif',
		fontWeight: "bold",
		letterSpacing: "0.12em",
		textShadow: "0 0 10px #10b981, 0 0 20px rgba(16,185,129,0.5)",
		textAnimation: "pop",
		category: "titles",
	},
	{
		id: "social-watermark",
		title: "Social Handle Badge",
		text: "@sampletitle • follow",
		styleName: "Frosted glass capsule watermark",
		color: "#ffffff",
		bg: "rgba(15,23,42,0.85)",
		fontSize: 16,
		fontFamily: '"Plus Jakarta Sans", sans-serif',
		fontWeight: "normal",
		borderRadius: "9999px",
		padding: "0.25em 0.85em",
		border: "1px solid rgba(255,255,255,0.25)",
		boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
		textAnimation: "fade",
		category: "subtitles",
	},
];

/**
 * Returns the exact text rendered for a preset given the user's preview input.
 * Ensures 100% synchronization between what is shown in the gallery card and what gets inserted.
 */
export function getPresetRenderedText(preset: TitlePreset, previewText?: string): string {
	const raw = (previewText && previewText.trim()) || "Sample Title";
	switch (preset.id) {
		case "bold-float":
		case "bold-header":
		case "cyberpunk":
			return raw.toUpperCase();
		case "cinematic-gold":
		case "subtitle-clean":
		case "subtitle-transparent":
			return raw;
		case "lower-third":
			return `${raw.toUpperCase()} • HOST`;
		case "glitch-pulse":
			return `• ${raw.toUpperCase()}`;
		case "karaoke-pop":
		case "gaming-victory":
			return `${raw.toUpperCase()}!`;
		case "minimal-tag":
			return `✦ ${raw.toUpperCase()}`;
		case "social-watermark": {
			const cleanHandle = raw.toLowerCase().replace(/[^a-z0-9_]/gi, "") || "sampletitle";
			return `@${cleanHandle} • follow`;
		}
		default:
			return raw;
	}
}

function getPresetCategoryBadgeClass(category?: string, isLight?: boolean) {
	switch (category) {
		case "titles":
			return isLight
				? "bg-indigo-50 text-indigo-700 border-indigo-200"
				: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
		case "subtitles":
			return isLight
				? "bg-cyan-50 text-cyan-700 border-cyan-200"
				: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
		case "badges":
			return isLight
				? "bg-purple-50 text-purple-700 border-purple-200"
				: "bg-purple-500/15 text-purple-300 border-purple-500/30";
		default:
			return isLight
				? "bg-slate-100 text-slate-700 border-slate-200"
				: "bg-white/10 text-slate-300 border-white/10";
	}
}

/**
 * Visual canvas preview thumbnail for each text style.
 * Uses theme-adaptive surfaces (light theme friendly) and renders
 * consistent sample text across all styles for harmonious comparison.
 */
function TextPreviewThumbnail({
	preset,
	sampleText = "Sample Title",
	layout = "grid",
	isLight = false,
}: {
	preset: TitlePreset;
	sampleText?: string;
	layout?: "grid" | "list";
	isLight?: boolean;
}) {
	const displayText = getPresetRenderedText(preset, sampleText);

	const renderContent = () => {
		switch (preset.id) {
			case "bold-float":
				return (
					<div className="text-center px-2 truncate max-w-full">
						<span
							className={cn(
								"font-black tracking-tight uppercase truncate block",
								layout === "list" ? "text-[12px] sm:text-[13px]" : "text-[13px] sm:text-[14px]",
								isLight ? "text-slate-900" : "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]",
							)}
							style={{ fontFamily: preset.fontFamily }}
						>
							{displayText}
						</span>
					</div>
				);

			case "bold-header":
				return (
					<div className="text-center px-1.5 truncate max-w-full">
						<span
							className={cn(
								"font-black tracking-tight uppercase truncate inline-block px-2.5 py-0.5 rounded-lg border",
								layout === "list" ? "text-[11px] sm:text-[12px]" : "text-[12px] sm:text-[13px]",
								isLight
									? "bg-slate-900 text-white border-slate-700 shadow-xs"
									: "bg-black/90 text-white border-white/20 shadow-md",
							)}
							style={{ fontFamily: preset.fontFamily }}
						>
							{displayText}
						</span>
					</div>
				);

			case "cyberpunk":
				return (
					<div className="text-center px-2 truncate max-w-full">
						<span
							className={cn(
								"font-black tracking-widest uppercase truncate block",
								layout === "list" ? "text-[11px] sm:text-[12px]" : "text-[12px] sm:text-[13px]",
								isLight
									? "text-cyan-600 drop-shadow-[0_0_8px_rgba(6,182,212,0.35)]"
									: "text-cyan-300 drop-shadow-[0_0_8px_#06b6d4] drop-shadow-[0_0_16px_#ec4899]",
							)}
							style={{ fontFamily: preset.fontFamily }}
						>
							{displayText}
						</span>
					</div>
				);

			case "cinematic-gold":
				return (
					<div className="text-center px-2 truncate max-w-full">
						<div
							className={cn(
								"italic font-bold tracking-[0.14em] truncate",
								layout === "list" ? "text-[11px] sm:text-[12px]" : "text-[12px] sm:text-[13px]",
								isLight
									? "text-amber-600 drop-shadow-[0_1px_3px_rgba(217,119,6,0.25)]"
									: "text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]",
							)}
							style={{ fontFamily: preset.fontFamily }}
						>
							{displayText}
						</div>
						<div
							className={cn(
								"w-10 h-[1px] mx-auto mt-0.5",
								isLight
									? "bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
									: "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent",
							)}
						/>
					</div>
				);

			case "subtitle-clean":
				return (
					<div className="w-full px-2 flex justify-center truncate">
						<div
							className={cn(
								"px-2.5 py-0.5 rounded-md text-[10px] font-medium truncate max-w-full border",
								isLight
									? "bg-slate-800 text-white border-slate-700 shadow-xs"
									: "bg-black/85 text-white border-white/20 shadow-md",
							)}
							style={{ fontFamily: preset.fontFamily }}
						>
							{displayText}
						</div>
					</div>
				);

			case "subtitle-transparent":
				return (
					<div className="w-full px-2 flex justify-center truncate">
						<span
							className={cn(
								"text-[11px] font-medium text-center truncate max-w-full",
								isLight ? "text-slate-800" : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]",
							)}
							style={{ fontFamily: preset.fontFamily }}
						>
							{displayText}
						</span>
					</div>
				);

			case "lower-third":
				return (
					<div className="w-full px-2 flex justify-start truncate">
						<div
							className={cn(
								"flex items-center gap-1.5 border-l-[3px] border-indigo-500 px-2.5 py-0.5 rounded-r shadow-xs max-w-full truncate",
								isLight
									? "bg-slate-900 text-white"
									: "bg-slate-900/95 text-white border-r border-y border-white/10",
							)}
							style={{ fontFamily: preset.fontFamily }}
						>
							<span className="text-[9.5px] font-black truncate">{displayText}</span>
						</div>
					</div>
				);

			case "glitch-pulse":
				return (
					<div
						className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black truncate border shadow-xs bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300"
						style={{ fontFamily: preset.fontFamily }}
					>
						<span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
						<span className="tracking-wider truncate">{displayText}</span>
					</div>
				);

			case "karaoke-pop":
				return (
					<div
						className="bg-yellow-400 text-black font-black text-[10px] uppercase px-2.5 py-0.5 rounded shadow-[2px_2px_0px_#000000] -rotate-1 transform tracking-wide truncate max-w-full"
						style={{ fontFamily: preset.fontFamily }}
					>
						{displayText}
					</div>
				);

			case "minimal-tag":
				return (
					<div
						className="bg-purple-500/15 border border-purple-500/40 text-purple-700 dark:text-purple-200 font-bold text-[9.5px] px-2.5 py-0.5 rounded-full shadow-xs truncate max-w-full"
						style={{ fontFamily: preset.fontFamily }}
					>
						{displayText}
					</div>
				);

			case "gaming-victory":
				return (
					<div
						className={cn(
							"font-black tracking-wider uppercase truncate max-w-full",
							layout === "list" ? "text-[12px]" : "text-[13px]",
							isLight
								? "text-emerald-600 drop-shadow-[0_1px_4px_rgba(16,185,129,0.3)]"
								: "text-emerald-400 drop-shadow-[0_0_8px_#10b981]",
						)}
						style={{ fontFamily: preset.fontFamily }}
					>
						{displayText}
					</div>
				);

			case "social-watermark":
				return (
					<div
						className={cn(
							"flex items-center gap-1 font-medium text-[9.5px] px-2.5 py-0.5 rounded-full border shadow-2xs truncate max-w-full",
							isLight
								? "bg-slate-900/90 border-slate-700 text-white shadow-xs"
								: "bg-slate-900/90 border-white/20 text-white backdrop-blur-xs",
						)}
						style={{ fontFamily: preset.fontFamily }}
					>
						<span className="truncate">{displayText}</span>
					</div>
				);

			default:
				return (
					<div
						className="px-2 py-0.5 rounded font-bold text-[10px] text-center truncate max-w-[90%]"
						style={{
							color: preset.color || (isLight ? "#0f172a" : "#ffffff"),
							backgroundColor: preset.bg || "transparent",
							fontFamily: preset.fontFamily,
						}}
					>
						{displayText}
					</div>
				);
		}
	};

	return (
		<div
			className={cn(
				"relative rounded-xl overflow-hidden flex items-center justify-center p-2 select-none transition-all shadow-inner shrink-0 border",
				layout === "list" ? "w-36 h-14" : "w-full aspect-[16/10]",
				isLight
					? "bg-slate-100/90 border-slate-200/90 text-slate-800 group-hover:border-indigo-300 group-hover:bg-slate-100"
					: "bg-[#101423] border-white/10 text-white group-hover:border-indigo-400/50 group-hover:bg-white/[0.05]",
			)}
		>
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
	const [previewSampleText, setPreviewSampleText] = useState("Sample Title");
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

		// Compute the exact text presented in the gallery card so what you see is what you get
		const textToInsert = getPresetRenderedText(preset, previewSampleText);

		const presetWithText: TitlePreset = {
			...preset,
			text: textToInsert,
		};

		if (onSelectTitlePreset) {
			onSelectTitlePreset(presetWithText);
		} else if (onAddAnnotationWithText) {
			onAddAnnotationWithText(textToInsert);
		}
	};

	const handleQuickAdd = (type: "title" | "subtitle" | "lowerThird" | "callout") => {
		const configMap = {
			title: {
				text: "Big Modern Title",
				color: "#ffffff",
				bg: "transparent",
				fontSize: 34,
				fontFamily: '"Plus Jakarta Sans", sans-serif',
				fontWeight: "bold" as const,
				textAnimation: "pop" as const,
				textShadow: "0 2px 10px rgba(0,0,0,0.85)",
			},
			subtitle: {
				text: "Add your subtitle text here",
				color: "#ffffff",
				bg: "rgba(0,0,0,0.8)",
				fontSize: 22,
				fontFamily: "Inter, sans-serif",
				fontWeight: "normal" as const,
				borderRadius: "6px",
				padding: "0.2em 0.65em",
				textAnimation: "fade" as const,
			},
			lowerThird: {
				text: "PRESENTER NAME • HOST",
				color: "#f8fafc",
				bg: "rgba(15,23,42,0.92)",
				fontSize: 18,
				fontFamily: '"Plus Jakarta Sans", sans-serif',
				fontWeight: "bold" as const,
				borderRadius: "6px",
				padding: "0.25em 0.75em",
				border: "1px solid rgba(99,102,241,0.5)",
				boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
				textAnimation: "slide-left" as const,
			},
			callout: {
				text: "• ALERT: WATCH THIS",
				color: "#fb7185",
				bg: "rgba(225,29,72,0.25)",
				fontSize: 20,
				fontFamily: '"Plus Jakarta Sans", sans-serif',
				fontWeight: "bold" as const,
				borderRadius: "9999px",
				padding: "0.25em 0.85em",
				border: "1px solid rgba(251,113,133,0.4)",
				boxShadow: "0 0 12px rgba(244,63,94,0.3)",
				textAnimation: "pulse" as const,
			},
		};
		const conf = configMap[type];
		if (onSelectTitlePreset) {
			onSelectTitlePreset({
				id: `quick-${type}-${Date.now()}`,
				title: conf.text,
				styleName: "Quick Style",
				...conf,
			});
		} else if (onAddAnnotationWithText) {
			onAddAnnotationWithText(conf.text);
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
					<div className="flex items-center gap-2">
						<AddCustomFontDialog
							isLight={isLight}
							trigger={
								<button
									type="button"
									className="text-[10px] font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
								>
									<Plus className="w-3 h-3" />
									Font Studio
								</button>
							}
						/>
						<span className="text-[10px] text-slate-400 font-semibold">• 1-Click Insert</span>
					</div>
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
							{/* Font Family Selector */}
							<div className="space-y-1">
								<span className="text-[10px] font-bold text-slate-400 block">Font Family:</span>
								<FontSelector
									value={selectedAnnotation.style?.fontFamily || "Inter"}
									onValueChange={(fontVal) =>
										onAnnotationStyleChange?.(selectedAnnotation.id, {
											fontFamily: fontVal,
										})
									}
									isLight={isLight}
									size="sm"
								/>
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
			<div className="space-y-2.5">
				<div className="flex items-center justify-between">
					<span
						className={cn(
							"text-[11px] font-extrabold uppercase tracking-wider",
							isLight ? "text-slate-600" : "text-slate-400",
						)}
					>
						Titles & Text Styles Gallery
					</span>
					<div className="flex items-center gap-2">
						<AddCustomFontDialog
							isLight={isLight}
							trigger={
								<button
									type="button"
									className="text-[10px] font-extrabold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
								>
									<Plus className="w-3 h-3" />
									Install Fonts
								</button>
							}
						/>
						<span
							className="text-[10px] font-semibold font-mono"
							style={{ color: activeAccent.hex }}
						>
							{filteredPresets.length} Styles
						</span>
					</div>
				</div>

				{/* Live Sample Text Preview Bar: Makes all styles display uniform preview text */}
				<div
					className={cn(
						"px-3 py-2 rounded-xl border flex items-center gap-2.5 transition-all shadow-2xs",
						isLight
							? "bg-slate-50/90 border-slate-200/90 text-slate-800"
							: "bg-white/[0.03] border-white/10 text-slate-200",
					)}
				>
					<div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
						<Type className="w-3.5 h-3.5 text-indigo-500" />
						<span>Preview Text:</span>
					</div>
					<input
						type="text"
						value={previewSampleText}
						onChange={(e) => setPreviewSampleText(e.target.value)}
						placeholder="Type custom text to preview in all styles..."
						className={cn(
							"flex-1 h-7 px-2.5 text-xs rounded-lg border outline-none font-medium transition-all",
							isLight
								? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 shadow-2xs"
								: "bg-black/30 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400",
						)}
					/>
					{previewSampleText !== "Sample Title" && (
						<button
							type="button"
							onClick={() => setPreviewSampleText("Sample Title")}
							className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
							title="Reset sample text"
						>
							Reset
						</button>
					)}
				</div>

				{/* Empty State */}
				{filteredPresets.length === 0 ? (
					<div className="text-center py-8 text-xs text-slate-400">
						No text styles found matching "{searchQuery}"
					</div>
				) : viewMode === "grid" ? (
					/* 2-Column Visual Card Grid */
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
												? "bg-white border-slate-200/90 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5"
												: "bg-white/[0.03] border-white/[0.08] hover:border-indigo-400 hover:bg-white/[0.06] hover:shadow-md hover:-translate-y-0.5",
									)}
								>
									{/* Visual Theme Canvas Thumbnail */}
									<div className="relative">
										<TextPreviewThumbnail
											preset={preset}
											sampleText={previewSampleText || "Sample Title"}
											layout="grid"
											isLight={isLight}
										/>

										{/* Quick Hover Overlay with Insert Pill */}
										<div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 backdrop-blur-[2px]">
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

									{/* Card Footer with Title & Category */}
									<div className="p-2.5 space-y-1">
										<div className="flex items-center justify-between gap-1">
											<span
												className={cn(
													"text-xs font-bold truncate group-hover:text-indigo-500 transition-colors",
													isLight ? "text-slate-900" : "text-slate-100",
												)}
											>
												{preset.title}
											</span>
											<span
												className={cn(
													"px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider border shrink-0",
													getPresetCategoryBadgeClass(preset.category, isLight),
												)}
											>
												{preset.category}
											</span>
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
									onClick={() => handleInsertPreset(preset)}
									className={cn(
										"p-2.5 rounded-2xl border flex items-center justify-between gap-3.5 transition-all duration-150 group shadow-2xs cursor-pointer",
										isJustInserted
											? "ring-2 ring-emerald-500 border-emerald-500"
											: isLight
												? "bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs"
												: "bg-white/[0.03] border-white/[0.08] hover:border-indigo-400/50 hover:bg-white/[0.05]",
									)}
								>
									<div className="flex items-center gap-3.5 min-w-0 flex-1">
										{/* Theme-Matched Canvas Thumbnail */}
										<TextPreviewThumbnail
											preset={preset}
											sampleText={previewSampleText || "Sample Title"}
											layout="list"
											isLight={isLight}
										/>

										<div className="min-w-0 flex-1 space-y-0.5">
											<div className="flex items-center gap-2">
												<span
													className={cn(
														"text-xs font-bold truncate group-hover:text-indigo-500 transition-colors",
														isLight ? "text-slate-900" : "text-slate-100",
													)}
												>
													{preset.title}
												</span>
												<span
													className={cn(
														"px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider border shrink-0",
														getPresetCategoryBadgeClass(preset.category, isLight),
													)}
												>
													{preset.category}
												</span>
											</div>
											<div className="text-[10px] text-slate-400 line-clamp-1">
												{preset.styleName}
											</div>
											<div className="flex items-center gap-2 text-[9.5px] text-slate-400 pt-0.5">
												<span className="flex items-center gap-1">
													<Sparkles className="w-2.5 h-2.5 text-indigo-400" />
													{preset.textAnimation || "pop"}
												</span>
												<span>•</span>
												<span>{preset.fontSize}px</span>
											</div>
										</div>
									</div>

									{/* Insert Button */}
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={(e) => {
											e.stopPropagation();
											handleInsertPreset(preset);
										}}
										className={cn(
											"h-8 px-3.5 text-xs font-bold rounded-xl shrink-0 transition-all cursor-pointer border shadow-2xs",
											isJustInserted
												? "border-emerald-500 bg-emerald-500 text-white"
												: isLight
													? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
													: "border-white/10 bg-white/5 text-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600",
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
