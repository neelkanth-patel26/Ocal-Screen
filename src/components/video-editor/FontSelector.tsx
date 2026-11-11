import {
	Check,
	ChevronDown,
	FolderPlus,
	Plus,
	Search,
	Sparkles,
	Trash2,
	Type,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { removeCustomFont, useCustomFonts } from "@/lib/customFonts";
import {
	BUILTIN_FONTS,
	cleanFontFamily,
	FONT_CATEGORIES,
	type FontCategory,
	type FontDefinition,
	normalizeFontKey,
} from "@/lib/fontCatalog";
import { cn } from "@/lib/utils";
import { AddCustomFontDialog } from "./AddCustomFontDialog";

export interface FontSelectorProps {
	value?: string;
	onValueChange: (fontFamily: string) => void;
	isLight?: boolean;
	className?: string;
	size?: "sm" | "default";
	label?: string;
	showLabel?: boolean;
}

export function FontSelector({
	value = "Inter",
	onValueChange,
	isLight = false,
	className,
	size = "default",
	label = "Font Family",
	showLabel = false,
}: FontSelectorProps) {
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<FontCategory | "all">("all");

	const customFonts = useCustomFonts();

	// Normalizer for active value
	const activeCleanKey = normalizeFontKey(value);

	// Combine built-in fonts and custom fonts
	const allFonts = useMemo(() => {
		const customDefs: FontDefinition[] = customFonts.map((cf) => ({
			value: cf.fontFamily,
			name: cf.name,
			category: "custom" as FontCategory,
			previewText: "Custom typography • The quick brown fox",
		}));

		return [...customDefs, ...BUILTIN_FONTS];
	}, [customFonts]);

	// Find active font definition for trigger display
	const activeFont = useMemo(() => {
		// Exact or normalized match
		const found = allFonts.find((f) => normalizeFontKey(f.value) === activeCleanKey);
		if (found) return found;

		// Fallback for custom family name
		return {
			value,
			name: cleanFontFamily(value) || "Inter",
			category: "sans" as FontCategory,
			previewText: "The quick brown fox",
		};
	}, [allFonts, activeCleanKey, value]);

	// Filtered fonts based on search & category
	const filteredFonts = useMemo(() => {
		return allFonts.filter((font) => {
			if (selectedCategory !== "all") {
				if (selectedCategory === "custom") {
					if (font.category !== "custom") return false;
				} else if (font.category !== selectedCategory) {
					return false;
				}
			}

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				font.name.toLowerCase().includes(q) ||
				font.category.toLowerCase().includes(q) ||
				cleanFontFamily(font.value).toLowerCase().includes(q)
			);
		});
	}, [allFonts, selectedCategory, searchQuery]);

	const handleSelect = (fontVal: string) => {
		onValueChange(fontVal);
		setOpen(false);
	};

	const handleDeleteCustom = (e: React.MouseEvent, fontId: string, fontName: string) => {
		e.stopPropagation();
		removeCustomFont(fontId);
		toast.success(`Removed font "${fontName}"`);
	};

	const getCategoryBadgeClass = (category: FontCategory) => {
		switch (category) {
			case "display":
				return "bg-amber-500/15 text-amber-400 border-amber-500/30";
			case "serif":
				return "bg-purple-500/15 text-purple-400 border-purple-500/30";
			case "monospace":
				return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
			case "handwriting":
				return "bg-rose-500/15 text-rose-400 border-rose-500/30";
			case "custom":
				return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
			default:
				return "bg-blue-500/15 text-blue-400 border-blue-500/30";
		}
	};

	return (
		<div className="space-y-1">
			{showLabel && (
				<div className="flex items-center justify-between">
					<label
						className={cn(
							"text-[10px] font-bold uppercase tracking-wider block",
							isLight ? "text-slate-600" : "text-slate-400",
						)}
					>
						{label}
					</label>
					{customFonts.length > 0 && (
						<span className="text-[10px] text-indigo-400 font-bold">
							+{customFonts.length} Custom
						</span>
					)}
				</div>
			)}

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							"w-full rounded-xl border flex items-center justify-between gap-2 px-3 transition-all cursor-pointer select-none text-left shadow-2xs group outline-none",
							size === "sm" ? "h-8 text-xs" : "h-9 text-xs",
							isLight
								? "bg-white border-slate-200 text-slate-900 hover:border-indigo-400 hover:bg-slate-50/50"
								: "bg-white/[0.04] border-white/10 text-white hover:border-indigo-400/50 hover:bg-white/[0.07]",
							className,
						)}
					>
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<Type className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
							{/* Font family name rendered in that actual font! */}
							<span
								style={{ fontFamily: activeFont.value }}
								className="font-bold truncate text-[13px] tracking-wide"
							>
								{activeFont.name}
							</span>
							<span
								className={cn(
									"px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 hidden sm:inline-block",
									getCategoryBadgeClass(activeFont.category),
								)}
							>
								{activeFont.category}
							</span>
						</div>

						<ChevronDown
							className={cn(
								"w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200",
								open && "rotate-180",
							)}
						/>
					</button>
				</PopoverTrigger>

				<PopoverContent
					align="start"
					sideOffset={6}
					className={cn(
						"w-[340px] sm:w-[380px] p-0 rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[460px] z-[120]",
						isLight
							? "bg-white border-slate-200 text-slate-900"
							: "bg-[#0f1322] border-white/10 text-slate-100",
					)}
				>
					{/* Top Action Header */}
					<div
						className={cn(
							"p-3 border-b flex items-center justify-between gap-2 shrink-0",
							isLight ? "bg-slate-50/80 border-slate-200" : "bg-white/[0.02] border-white/10",
						)}
					>
						<div className="flex items-center gap-1.5 min-w-0">
							<Type className="w-4 h-4 text-indigo-400" />
							<span className="text-xs font-extrabold uppercase tracking-wider">Typography</span>
							<span className="text-[10px] text-slate-400 font-bold font-mono">
								({filteredFonts.length})
							</span>
						</div>

						{/* Quick Import Font Button */}
						<AddCustomFontDialog
							isLight={isLight}
							onFontAdded={(font) => {
								handleSelect(font.fontFamily);
							}}
							trigger={
								<Button
									type="button"
									size="sm"
									variant="outline"
									className={cn(
										"h-7 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer gap-1 shadow-2xs",
										isLight
											? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white"
											: "border-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-600 hover:text-white",
									)}
								>
									<Plus className="w-3 h-3 stroke-[2.5]" />
									Import / Add Fonts
								</Button>
							}
						/>
					</div>

					{/* Search Box */}
					<div className="p-2.5 pb-2 shrink-0">
						<div className="relative">
							<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search fonts (e.g. bebas, serif, gaming)..."
								className={cn(
									"w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border outline-none transition-all",
									isLight
										? "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-400"
										: "bg-white/[0.04] border-white/10 text-white placeholder-slate-500 focus:bg-white/[0.07] focus:border-indigo-400",
								)}
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>

						{/* Category Pills */}
						<div className="flex items-center gap-1 overflow-x-auto pt-2 pb-0.5 custom-scrollbar">
							{FONT_CATEGORIES.map((cat) => {
								const isActive = selectedCategory === cat.id;
								return (
									<button
										key={cat.id}
										type="button"
										onClick={() => setSelectedCategory(cat.id)}
										className={cn(
											"px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0",
											isActive
												? "bg-indigo-600 border-indigo-600 text-white shadow-2xs font-extrabold"
												: isLight
													? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
													: "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10",
										)}
									>
										{cat.label}
										{cat.id === "custom" && customFonts.length > 0 && (
											<span className="ml-1 px-1 rounded-full bg-white/20 text-[9px]">
												{customFonts.length}
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Fonts List with Rich Typography Previews */}
					<div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
						{filteredFonts.length === 0 ? (
							<div className="py-8 text-center text-xs text-slate-400 space-y-2">
								<Type className="w-6 h-6 mx-auto opacity-50" />
								<div>No fonts matching "{searchQuery}"</div>
							</div>
						) : (
							filteredFonts.map((font) => {
								const isSelected = normalizeFontKey(font.value) === activeCleanKey;
								const customFontObj =
									font.category === "custom"
										? customFonts.find(
												(cf) =>
													normalizeFontKey(cf.fontFamily) === normalizeFontKey(font.value) ||
													cf.name === font.name,
											)
										: null;

								return (
									<div
										key={font.value}
										onClick={() => handleSelect(font.value)}
										className={cn(
											"px-2.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group relative",
											isSelected
												? isLight
													? "bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-2xs"
													: "bg-indigo-600/20 border-indigo-500/50 text-white shadow-2xs"
												: isLight
													? "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-800"
													: "bg-transparent border-transparent hover:border-white/10 hover:bg-white/[0.04] text-slate-200",
										)}
									>
										<div className="min-w-0 flex-1">
											{/* Font Name rendered in actual font typeface */}
											<div className="flex items-center gap-1.5">
												<span
													style={{ fontFamily: font.value }}
													className="text-[14px] font-bold tracking-wide truncate"
												>
													{font.name}
												</span>
												<span
													className={cn(
														"px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase tracking-wider border",
														getCategoryBadgeClass(font.category),
													)}
												>
													{font.category}
												</span>
											</div>

											{/* Live Typography Specimen Preview */}
											<div
												style={{ fontFamily: font.value }}
												className={cn(
													"text-[12px] truncate mt-0.5",
													isSelected
														? isLight
															? "text-indigo-800"
															: "text-indigo-200"
														: "text-slate-400 group-hover:text-slate-300",
												)}
											>
												{font.previewText || "Aa Bb The quick brown fox 123"}
											</div>
										</div>

										{/* Right Actions: Selected Checkmark or Delete for custom */}
										<div className="flex items-center gap-1 shrink-0">
											{customFontObj && (
												<button
													type="button"
													onClick={(e) =>
														handleDeleteCustom(e, customFontObj.id, customFontObj.name)
													}
													className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
													title="Delete custom font"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											)}

											{isSelected && (
												<div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
													<Check className="w-3 h-3 stroke-[3]" />
												</div>
											)}
										</div>
									</div>
								);
							})
						)}
					</div>

					{/* Bottom Footer: Fast Action to open Font Studio */}
					<div
						className={cn(
							"p-2.5 border-t shrink-0 flex items-center justify-between",
							isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/10",
						)}
					>
						<span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
							<Sparkles className="w-3 h-3 text-indigo-400" />
							Custom fonts persist across sessions
						</span>

						<AddCustomFontDialog
							isLight={isLight}
							onFontAdded={(font) => {
								handleSelect(font.fontFamily);
							}}
							trigger={
								<button
									type="button"
									className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
								>
									<FolderPlus className="w-3.5 h-3.5" />
									Manage Fonts
								</button>
							}
						/>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
