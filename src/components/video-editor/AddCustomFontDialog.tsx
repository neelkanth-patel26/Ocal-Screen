import {
	Check,
	Download,
	ExternalLink,
	FolderDown,
	Globe,
	Loader2,
	Plus,
	Search,
	Sparkles,
	Trash2,
	Type,
	UploadCloud,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	addCustomFont,
	buildGoogleFontImportUrl,
	type CustomFont,
	generateFontId,
	isValidGoogleFontsUrl,
	parseFontFamilyFromImport,
	readFontFile,
	removeCustomFont,
	useCustomFonts,
} from "@/lib/customFonts";
import { CURATED_GOOGLE_FONTS, type CuratedFont, type FontCategory } from "@/lib/fontCatalog";
import { cn } from "@/lib/utils";

interface AddCustomFontDialogProps {
	onFontAdded?: (font: CustomFont) => void;
	isLight?: boolean;
	trigger?: React.ReactNode;
	defaultTab?: "curated" | "local" | "google" | "installed";
}

export function AddCustomFontDialog({
	onFontAdded,
	isLight,
	trigger,
	defaultTab = "curated",
}: AddCustomFontDialogProps) {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<string>(defaultTab);

	// Curated store state
	const [curatedSearch, setCuratedSearch] = useState("");
	const [curatedCategory, setCuratedCategory] = useState<FontCategory | "all">("all");
	const [installingId, setInstallingId] = useState<string | null>(null);

	// Google Fonts input state
	const [googleInput, setGoogleInput] = useState("");
	const [customName, setCustomName] = useState("");
	const [loadingGoogle, setLoadingGoogle] = useState(false);

	// Local file import state
	const [localFile, setLocalFile] = useState<File | null>(null);
	const [localFontData, setLocalFontData] = useState<{
		dataUrl: string;
		format: "truetype" | "opentype" | "woff" | "woff2";
		name: string;
	} | null>(null);
	const [localFontName, setLocalFontName] = useState("");
	const [localPreviewText, setLocalPreviewText] = useState(
		"The quick brown fox jumps over the lazy dog 123",
	);
	const [loadingLocal, setLoadingLocal] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const customFonts = useCustomFonts();

	// Installed font family lookup set
	const installedFamilies = useMemo(() => {
		return new Set(
			customFonts.map((f) => f.fontFamily.replace(/['"]/g, "").split(",")[0].trim().toLowerCase()),
		);
	}, [customFonts]);

	// Filter curated fonts
	const filteredCurated = useMemo(() => {
		return CURATED_GOOGLE_FONTS.filter((font) => {
			if (curatedCategory !== "all" && font.category !== curatedCategory) {
				return false;
			}
			if (!curatedSearch.trim()) return true;
			const q = curatedSearch.toLowerCase();
			return (
				font.name.toLowerCase().includes(q) ||
				font.description.toLowerCase().includes(q) ||
				font.tags.some((t) => t.toLowerCase().includes(q))
			);
		});
	}, [curatedCategory, curatedSearch]);

	// 1-Click install curated font
	const handleInstallCurated = async (curated: CuratedFont) => {
		setInstallingId(curated.id);
		try {
			const newFont: CustomFont = {
				id: generateFontId(curated.name),
				name: curated.name,
				fontFamily: curated.name,
				importUrl: curated.importUrl,
				category: curated.category,
				source: "curated",
				createdAt: Date.now(),
			};

			await addCustomFont(newFont);
			toast.success(`Installed font "${curated.name}"!`);
			if (onFontAdded) {
				onFontAdded(newFont);
			}
		} catch (error) {
			console.error("Failed to install curated font:", error);
			toast.error(`Failed to install "${curated.name}"`);
		} finally {
			setInstallingId(null);
		}
	};

	// Local file selection
	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		const file = files[0];
		await processFontFile(file);
	};

	const processFontFile = async (file: File) => {
		try {
			setLoadingLocal(true);
			const parsed = await readFontFile(file);
			setLocalFile(file);
			setLocalFontData(parsed);
			setLocalFontName(parsed.name);

			// Pre-inject temporary test style so live preview works immediately
			const tempStyleId = "temp-local-font-preview";
			let tempEl = document.getElementById(tempStyleId);
			if (!tempEl) {
				tempEl = document.createElement("style");
				tempEl.id = tempStyleId;
				document.head.appendChild(tempEl);
			}
			tempEl.textContent = `@font-face {
				font-family: '${parsed.name}';
				src: url('${parsed.dataUrl}') format('${parsed.format}');
			}`;
		} catch (error) {
			console.error("Failed to process font file:", error);
			const msg = error instanceof Error ? error.message : "Failed to load font file";
			toast.error(msg);
		} finally {
			setLoadingLocal(false);
		}
	};

	// Save local font
	const handleSaveLocalFont = async () => {
		if (!localFontData || !localFontName.trim()) {
			toast.error("Please provide a valid font file and name");
			return;
		}

		setLoadingLocal(true);
		try {
			const newFont: CustomFont = {
				id: generateFontId(localFontName),
				name: localFontName.trim(),
				fontFamily: localFontName.trim(),
				dataUrl: localFontData.dataUrl,
				format: localFontData.format,
				category: "custom",
				source: "local",
				createdAt: Date.now(),
			};

			await addCustomFont(newFont);
			toast.success(`Installed local font "${localFontName}"!`);
			if (onFontAdded) {
				onFontAdded(newFont);
			}

			// Reset form
			setLocalFile(null);
			setLocalFontData(null);
			setLocalFontName("");
		} catch (error) {
			console.error("Failed to save local font:", error);
			toast.error("Failed to save local font");
		} finally {
			setLoadingLocal(false);
		}
	};

	// Handle Google Font by name or import URL
	const handleAddGoogleFont = async () => {
		const input = googleInput.trim();
		if (!input) {
			toast.error("Please enter a Google Font name or URL");
			return;
		}

		setLoadingGoogle(true);
		try {
			let familyName = "";
			let importUrl = "";

			if (isValidGoogleFontsUrl(input)) {
				const extracted = parseFontFamilyFromImport(input);
				if (!extracted) {
					throw new Error("Could not extract font family from URL");
				}
				familyName = extracted;
				importUrl = input.match(/url\(['"]?(.*?)['"]?\)/)?.[1] || input;
			} else {
				// User typed plain name e.g. "Work Sans"
				familyName = input;
				importUrl = buildGoogleFontImportUrl(input);
			}

			const displayName = customName.trim() || familyName;
			const newFont: CustomFont = {
				id: generateFontId(displayName),
				name: displayName,
				fontFamily: familyName,
				importUrl,
				source: "google",
				category: "custom",
				createdAt: Date.now(),
			};

			await addCustomFont(newFont);
			toast.success(`Font "${displayName}" added successfully!`);
			if (onFontAdded) {
				onFontAdded(newFont);
			}

			setGoogleInput("");
			setCustomName("");
		} catch (error) {
			console.error("Failed to add Google font:", error);
			const msg = error instanceof Error ? error.message : "Failed to load Google Font";
			toast.error(msg);
		} finally {
			setLoadingGoogle(false);
		}
	};

	const handleDeleteFont = (font: CustomFont) => {
		removeCustomFont(font.id);
		toast.success(`Removed font "${font.name}"`);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button
						variant="outline"
						size="sm"
						className={cn(
							"w-full h-9 text-xs rounded-xl border transition-all cursor-pointer font-bold",
							isLight
								? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs hover:border-slate-300"
								: "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10",
						)}
					>
						<Plus className="w-3.5 h-3.5 mr-1" />
						Install / Import Fonts
					</Button>
				)}
			</DialogTrigger>

			<DialogContent
				className={cn(
					"sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden border rounded-2xl shadow-2xl",
					isLight
						? "bg-white border-slate-200 text-slate-900"
						: "bg-[#0d111c] border-white/10 text-slate-100",
				)}
			>
				{/* Header */}
				<div
					className={cn(
						"p-5 pb-3 border-b flex items-start justify-between shrink-0",
						isLight ? "border-slate-200 bg-slate-50/60" : "border-white/10 bg-white/[0.02]",
					)}
				>
					<div>
						<DialogHeader>
							<div className="flex items-center gap-2">
								<div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
									<Type className="w-4 h-4" />
								</div>
								<DialogTitle
									className={cn(
										"text-base font-extrabold tracking-tight",
										isLight ? "text-slate-900" : "text-white",
									)}
								>
									Font Studio & Library
								</DialogTitle>
							</div>
							<DialogDescription
								className={cn("text-xs mt-1", isLight ? "text-slate-500" : "text-slate-400")}
							>
								Install popular video creator fonts, import local font files, or connect any Google
								Font.
							</DialogDescription>
						</DialogHeader>
					</div>
				</div>

				{/* Main Tabs */}
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex-1 flex flex-col overflow-hidden"
				>
					<div
						className={cn("px-5 pt-3 border-b", isLight ? "border-slate-200" : "border-white/10")}
					>
						<TabsList
							className={cn(
								"p-1 h-9 rounded-xl border grid grid-cols-4 gap-1",
								isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.04] border-white/10",
							)}
						>
							<TabsTrigger
								value="curated"
								className="text-xs font-bold rounded-lg cursor-pointer gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
							>
								<Sparkles className="w-3.5 h-3.5" />
								1-Click Library
							</TabsTrigger>
							<TabsTrigger
								value="local"
								className="text-xs font-bold rounded-lg cursor-pointer gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
							>
								<UploadCloud className="w-3.5 h-3.5" />
								Local File
							</TabsTrigger>
							<TabsTrigger
								value="google"
								className="text-xs font-bold rounded-lg cursor-pointer gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
							>
								<Globe className="w-3.5 h-3.5" />
								Google Fonts
							</TabsTrigger>
							<TabsTrigger
								value="installed"
								className="text-xs font-bold rounded-lg cursor-pointer gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
							>
								<FolderDown className="w-3.5 h-3.5" />
								Installed ({customFonts.length})
							</TabsTrigger>
						</TabsList>
					</div>

					<div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
						{/* Tab 1: 1-Click Curated Font Store */}
						<TabsContent value="curated" className="m-0 space-y-4">
							{/* Filter and Search Bar */}
							<div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
								<div className="relative flex-1">
									<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
									<Input
										placeholder="Search fonts (e.g. bold, gaming, neon, comic)..."
										value={curatedSearch}
										onChange={(e) => setCuratedSearch(e.target.value)}
										className={cn(
											"h-8 text-xs pl-8.5 rounded-xl border",
											isLight
												? "bg-white border-slate-200 text-slate-900"
												: "bg-white/5 border-white/10 text-white",
										)}
									/>
								</div>

								{/* Category Pills */}
								<div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
									{[
										{ id: "all", label: "All" },
										{ id: "display", label: "Display & Bold" },
										{ id: "sans", label: "Sans" },
										{ id: "serif", label: "Serif" },
										{ id: "handwriting", label: "Script" },
									].map((cat) => (
										<button
											key={cat.id}
											type="button"
											onClick={() => setCuratedCategory(cat.id as FontCategory | "all")}
											className={cn(
												"px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap",
												curatedCategory === cat.id
													? "bg-indigo-500 border-indigo-500 text-white"
													: isLight
														? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
														: "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10",
											)}
										>
											{cat.label}
										</button>
									))}
								</div>
							</div>

							{/* Curated Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{filteredCurated.map((font) => {
									const isInstalled = installedFamilies.has(
										font.name.replace(/['"]/g, "").toLowerCase(),
									);
									const isBusy = installingId === font.id;

									return (
										<div
											key={font.id}
											className={cn(
												"p-3 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all group",
												isLight
													? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
													: "bg-white/[0.03] border-white/10 hover:border-indigo-400/40 hover:bg-white/[0.05]",
											)}
										>
											{/* Header: Title and category */}
											<div className="flex items-start justify-between gap-2">
												<div>
													<div
														className={cn(
															"text-sm font-bold tracking-tight",
															isLight ? "text-slate-900" : "text-white",
														)}
													>
														{font.name}
													</div>
													<div className="text-[10px] text-slate-400 line-clamp-1">
														{font.description}
													</div>
												</div>
												<span
													className={cn(
														"px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0",
														isLight
															? "bg-indigo-50 text-indigo-600 border border-indigo-200"
															: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
													)}
												>
													{font.category}
												</span>
											</div>

											{/* Visual Typography Specimen Box */}
											<div
												className={cn(
													"py-3 px-3 rounded-xl border flex items-center justify-center text-center overflow-hidden min-h-[58px]",
													isLight
														? "bg-slate-50 border-slate-100 text-slate-800"
														: "bg-black/30 border-white/5 text-slate-200",
												)}
											>
												<span
													style={{ fontFamily: font.fontFamily }}
													className="text-base tracking-wide truncate max-w-full font-semibold"
												>
													{font.previewText}
												</span>
											</div>

											{/* Action Button */}
											<div className="flex items-center justify-between pt-1">
												<span className="text-[10px] font-mono text-slate-400">Google Fonts</span>

												{isInstalled ? (
													<div className="flex items-center gap-1 text-emerald-500 text-xs font-bold px-2 py-1">
														<Check className="w-3.5 h-3.5 stroke-[3]" />
														Installed
													</div>
												) : (
													<Button
														type="button"
														size="sm"
														disabled={isBusy}
														onClick={() => handleInstallCurated(font)}
														className="h-7 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all shadow-xs"
													>
														{isBusy ? (
															<>
																<Loader2 className="w-3 h-3 mr-1 animate-spin" />
																Installing...
															</>
														) : (
															<>
																<Download className="w-3 h-3 mr-1" />
																Install Font
															</>
														)}
													</Button>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</TabsContent>

						{/* Tab 2: Local Font File Import */}
						<TabsContent value="local" className="m-0 space-y-4">
							<div
								onDragOver={(e) => e.preventDefault()}
								onDrop={(e) => {
									e.preventDefault();
									if (e.dataTransfer.files && e.dataTransfer.files[0]) {
										processFontFile(e.dataTransfer.files[0]);
									}
								}}
								onClick={() => fileInputRef.current?.click()}
								className={cn(
									"p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all",
									localFile
										? "border-emerald-500 bg-emerald-500/5"
										: isLight
											? "border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/60"
											: "border-white/15 hover:border-indigo-400/50 bg-white/[0.02] hover:bg-white/[0.04]",
								)}
							>
								<input
									type="file"
									ref={fileInputRef}
									accept=".ttf,.otf,.woff,.woff2"
									onChange={handleFileSelect}
									className="hidden"
								/>
								<div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-3">
									<UploadCloud className="w-6 h-6" />
								</div>
								<div className="text-sm font-extrabold text-slate-100">
									{localFile ? localFile.name : "Click or Drag & Drop Font File here"}
								</div>
								<p className="text-xs text-slate-400 mt-1 max-w-md">
									Supports standard desktop and web font formats: <strong>.ttf</strong>,{" "}
									<strong>.otf</strong>, <strong>.woff</strong>, <strong>.woff2</strong>
								</p>
							</div>

							{/* Local Font Customization & Live Testing */}
							{localFontData && (
								<div
									className={cn(
										"p-4 rounded-2xl border space-y-4",
										isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10",
									)}
								>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<Label className="text-xs font-bold text-slate-300">
												Font Name (Family):
											</Label>
											<Input
												value={localFontName}
												onChange={(e) => setLocalFontName(e.target.value)}
												placeholder="Font Display Name"
												className={cn(
													"h-8 text-xs rounded-xl",
													isLight ? "bg-white border-slate-200" : "bg-black/30 border-white/10",
												)}
											/>
										</div>

										<div className="space-y-1.5">
											<Label className="text-xs font-bold text-slate-300">Detected Format:</Label>
											<div className="h-8 px-3 rounded-xl border border-white/10 flex items-center font-mono text-xs text-indigo-400 font-bold bg-white/5 uppercase">
												{localFontData.format}
											</div>
										</div>
									</div>

									{/* Live interactive typing preview */}
									<div className="space-y-1.5">
										<div className="flex items-center justify-between">
											<Label className="text-xs font-bold text-slate-300">
												Live Typography Test:
											</Label>
											<span className="text-[10px] text-slate-400">Type below to test</span>
										</div>
										<Input
											value={localPreviewText}
											onChange={(e) => setLocalPreviewText(e.target.value)}
											style={{ fontFamily: localFontName }}
											className={cn(
												"h-12 text-base px-3 rounded-xl font-medium",
												isLight ? "bg-white text-slate-900" : "bg-black/50 text-white",
											)}
										/>
									</div>

									<div className="flex justify-end gap-2 pt-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												setLocalFile(null);
												setLocalFontData(null);
												setLocalFontName("");
											}}
											className="rounded-xl h-8 text-xs font-bold cursor-pointer"
										>
											Clear
										</Button>
										<Button
											type="button"
											size="sm"
											disabled={loadingLocal || !localFontName.trim()}
											onClick={handleSaveLocalFont}
											className="rounded-xl h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
										>
											{loadingLocal ? (
												<>
													<Loader2 className="w-3 h-3 mr-1 animate-spin" />
													Installing...
												</>
											) : (
												<>
													<Plus className="w-3.5 h-3.5 mr-1" />
													Install Font to Library
												</>
											)}
										</Button>
									</div>
								</div>
							)}
						</TabsContent>

						{/* Tab 3: Google Fonts custom name or URL */}
						<TabsContent value="google" className="m-0 space-y-4">
							<div
								className={cn(
									"p-4 rounded-2xl border space-y-3.5",
									isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10",
								)}
							>
								<div className="flex items-center justify-between">
									<Label className="text-xs font-bold text-slate-200">
										Google Font Family or @import URL:
									</Label>
									<a
										href="https://fonts.google.com"
										target="_blank"
										rel="noreferrer"
										className="text-[11px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
									>
										Browse Google Fonts <ExternalLink className="w-3 h-3" />
									</a>
								</div>

								<Input
									value={googleInput}
									onChange={(e) => setGoogleInput(e.target.value)}
									placeholder='Enter name e.g. "Work Sans", "Lobster", or paste Google Fonts URL'
									className={cn(
										"text-xs h-9 rounded-xl",
										isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10",
									)}
								/>

								<div className="space-y-1.5">
									<Label className="text-xs font-bold text-slate-300">
										Display Label (Optional):
									</Label>
									<Input
										value={customName}
										onChange={(e) => setCustomName(e.target.value)}
										placeholder="Custom display name (leave empty to use original font name)"
										className={cn(
											"text-xs h-8 rounded-xl",
											isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10",
										)}
									/>
								</div>

								<div className="flex justify-end pt-2">
									<Button
										type="button"
										size="sm"
										disabled={loadingGoogle || !googleInput.trim()}
										onClick={handleAddGoogleFont}
										className="rounded-xl h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
									>
										{loadingGoogle ? (
											<>
												<Loader2 className="w-3 h-3 mr-1 animate-spin" />
												Loading Font...
											</>
										) : (
											<>
												<Plus className="w-3.5 h-3.5 mr-1" />
												Add Google Font
											</>
										)}
									</Button>
								</div>
							</div>
						</TabsContent>

						{/* Tab 4: My Installed Custom Fonts */}
						<TabsContent value="installed" className="m-0 space-y-3">
							{customFonts.length === 0 ? (
								<div className="text-center py-12 text-slate-400 space-y-2">
									<Type className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
									<div className="text-sm font-bold text-slate-300">
										No Custom Fonts Installed Yet
									</div>
									<p className="text-xs max-w-sm mx-auto text-slate-500">
										Pick any font from the 1-Click Library, upload your own .ttf/.otf file, or
										connect a Google Font.
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{customFonts.map((font) => (
										<div
											key={font.id}
											className={cn(
												"p-3 rounded-2xl border flex items-center justify-between gap-3 group transition-all",
												isLight
													? "bg-white border-slate-200 hover:border-slate-300"
													: "bg-white/[0.03] border-white/10 hover:border-white/20",
											)}
										>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span
														style={{ fontFamily: font.fontFamily }}
														className="text-base font-bold text-slate-100 truncate"
													>
														{font.name}
													</span>
													<span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10">
														{font.source === "local"
															? "Local File"
															: font.source === "curated"
																? "Library"
																: "Google Font"}
													</span>
												</div>
												<div
													style={{ fontFamily: font.fontFamily }}
													className="text-xs text-slate-400 mt-1 truncate"
												>
													The quick brown fox jumps over the lazy dog 123
												</div>
											</div>

											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleDeleteFont(font)}
												className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
												title="Remove font"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}

// Named alias for convenience
export const FontManagerDialog = AddCustomFontDialog;
