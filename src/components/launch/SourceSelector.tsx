import { LayoutGrid, List, Monitor, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MdCheck } from "react-icons/md";
import { useScopedT } from "@/contexts/I18nContext";
import { ACCENT_COLOR_MAP, type AccentColor, loadUserPreferences } from "@/lib/userPreferences";
import { Button } from "../ui/button";
import { OcalLoader } from "../ui/ocal-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import styles from "./SourceSelector.module.css";

interface DesktopSource {
	id: string;
	name: string;
	thumbnail: string | null;
	display_id: string;
	appIcon: string | null;
}

export function SourceSelector() {
	const t = useScopedT("launch");
	const tc = useScopedT("common");
	const [sources, setSources] = useState<DesktopSource[]>([]);
	const [selectedSource, setSelectedSource] = useState<DesktopSource | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadFailed, setLoadFailed] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
	const [activeTab, setActiveTab] = useState<"screens" | "windows">("screens");

	const [themeMode, setThemeMode] = useState<"dark" | "light">(
		() => loadUserPreferences().theme || "dark",
	);
	const [accentColor, setAccentColor] = useState<AccentColor>(
		() => loadUserPreferences().accentColor || "lime",
	);
	const isLight = themeMode === "light";
	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;

	useEffect(() => {
		const syncPrefs = () => {
			const prefs = loadUserPreferences();
			setThemeMode(prefs.theme || "dark");
			setAccentColor(prefs.accentColor || "lime");
		};
		window.addEventListener("storage", syncPrefs);
		const timer = setInterval(syncPrefs, 400);
		return () => {
			window.removeEventListener("storage", syncPrefs);
			clearInterval(timer);
		};
	}, []);

	const fetchSources = useCallback(async () => {
		setLoading(true);
		setLoadFailed(false);
		try {
			const rawSources = await window.electronAPI.getSources({
				types: ["screen", "window"],
				thumbnailSize: { width: 320, height: 180 },
				fetchWindowIcons: true,
			});
			setSources(
				rawSources.map((source) => ({
					id: source.id,
					name: source.name || "Untitled Window",
					thumbnail: source.thumbnail,
					display_id: source.display_id,
					appIcon: source.appIcon,
				})),
			);
			setSelectedSource((current) =>
				current && rawSources.some((source) => source.id === current.id) ? current : null,
			);
		} catch (error) {
			console.error("Error loading sources:", error);
			setSources([]);
			setSelectedSource(null);
			setLoadFailed(true);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchSources();
	}, [fetchSources]);

	// Exclude only internal overlay windows (__ocal_*) and exact app window
	const screenSources = sources.filter((s) => s.id.startsWith("screen:"));
	const windowSources = sources.filter((s) => {
		if (!s.id.startsWith("window:")) return false;
		const name = s.name.trim();
		const lower = name.toLowerCase();
		if (name.startsWith("__ocal_")) return false;
		if (lower === "ocal screen" || lower === "openscreen" || lower === "ocal-screen") return false;
		return true;
	});

	const filterByQuery = (list: DesktopSource[]) => {
		if (!searchQuery.trim()) return list;
		const q = searchQuery.toLowerCase().trim();
		return list.filter((s) => s.name.toLowerCase().includes(q));
	};

	const filteredScreenSources = filterByQuery(screenSources);
	const filteredWindowSources = filterByQuery(windowSources);

	const hasNoSources = !loading && sources.length === 0;

	const handleSourceSelect = (source: DesktopSource) => setSelectedSource(source);
	const handleShare = async () => {
		if (selectedSource) await window.electronAPI.selectSource(selectedSource);
	};

	if (loading) {
		return (
			<div
				className={`h-full flex items-center justify-center ${isLight ? styles.glassContainerLight : styles.glassContainer}`}
				style={{ minHeight: "100vh" }}
			>
				<OcalLoader text={t("sourceSelector.loading")} />
			</div>
		);
	}

	if (hasNoSources) {
		return (
			<div
				className={`h-full flex items-center justify-center p-6 ${isLight ? styles.glassContainerLight : styles.glassContainer}`}
				style={{ minHeight: "100vh" }}
			>
				<div className="max-w-[340px] text-center flex flex-col items-center">
					<div
						className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/5 text-zinc-400"}`}
					>
						<Monitor size={24} />
					</div>
					<h2 className={`text-sm font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>
						{t("sourceSelector.emptyTitle")}
					</h2>
					<p
						className={`mt-2 text-xs leading-relaxed ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
					>
						{loadFailed
							? t("sourceSelector.loadFailedDescription")
							: t("sourceSelector.emptyDescription")}
					</p>
					<Button
						onClick={() => void fetchSources()}
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						className="mt-4 h-8 rounded-full px-5 text-[11px] font-extrabold transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer shadow-md"
					>
						{tc("actions.reload")}
					</Button>
				</div>
			</div>
		);
	}

	const renderSourceCard = (source: DesktopSource) => {
		const isSelected = selectedSource?.id === source.id;
		const sourceKind = source.id.startsWith("screen:") ? "screen" : "window";

		if (layoutMode === "list") {
			return (
				<div
					key={source.id}
					data-testid="source-selector-card"
					data-source-kind={sourceKind}
					style={
						isSelected
							? {
									borderColor: activeAccent.hex,
									boxShadow: `0 0 16px ${activeAccent.hex}30`,
								}
							: undefined
					}
					className={`group flex items-center justify-between p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
						isSelected
							? isLight
								? "border-2 bg-zinc-100/90"
								: "border-2 bg-white/[0.08]"
							: isLight
								? "border-zinc-200/80 bg-white hover:bg-zinc-50 hover:border-zinc-300"
								: "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15"
					}`}
					onClick={() => handleSourceSelect(source)}
					onDoubleClick={handleShare}
				>
					<div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
						{source.appIcon ? (
							<img src={source.appIcon} alt="" className="w-5 h-5 flex-shrink-0 rounded-md" />
						) : (
							<div
								className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/10 text-zinc-300"}`}
							>
								<Monitor size={12} />
							</div>
						)}
						<span
							className={`text-xs font-semibold truncate ${isLight ? "text-zinc-900" : "text-zinc-100"}`}
						>
							{source.name}
						</span>
					</div>

					<div className="flex items-center gap-2.5 flex-shrink-0">
						{source.thumbnail && (
							<img
								src={source.thumbnail}
								alt=""
								className="w-16 h-10 object-cover rounded-lg border border-black/20 bg-black/80 shadow-xs"
							/>
						)}
						{isSelected ? (
							<div
								className={styles.checkBadge}
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								<MdCheck size={13} style={{ color: activeAccent.textHex }} />
							</div>
						) : (
							<div className="w-[22px] h-[22px]" />
						)}
					</div>
				</div>
			);
		}

		return (
			<div
				key={source.id}
				data-testid="source-selector-card"
				data-source-kind={sourceKind}
				style={
					isSelected
						? {
								borderColor: activeAccent.hex,
								boxShadow: `0 0 20px ${activeAccent.hex}35`,
							}
						: undefined
				}
				className={`group ${isLight ? styles.sourceCardLight : styles.sourceCard} ${
					isSelected ? (isLight ? styles.selectedLight : styles.selected) : ""
				} p-2.5`}
				onClick={() => handleSourceSelect(source)}
				onDoubleClick={handleShare}
			>
				<div className="relative mb-2 overflow-hidden rounded-xl border border-white/[0.08] bg-black/90 aspect-video flex items-center justify-center">
					{source.thumbnail ? (
						<img
							src={source.thumbnail}
							alt={source.name}
							className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
						/>
					) : (
						<Monitor size={32} className="text-zinc-600 animate-pulse" />
					)}
					{isSelected && (
						<div className="absolute right-2 top-2 animate-in zoom-in-75 duration-150">
							<div
								className={styles.checkBadge}
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								<MdCheck size={13} style={{ color: activeAccent.textHex }} />
							</div>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2 px-1">
					{source.appIcon ? (
						<img src={source.appIcon} alt="" className="w-4 h-4 rounded shrink-0" />
					) : (
						<Monitor
							size={13}
							className={`shrink-0 ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
						/>
					)}
					<div
						className={`truncate text-xs font-semibold ${isLight ? "text-zinc-800" : "text-zinc-100"}`}
					>
						{source.name}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div
			className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
				isLight ? "bg-[#f8f9fa] text-zinc-900" : "bg-[#0b0c10] text-zinc-100"
			}`}
		>
			<div className="flex-1 flex flex-col w-full px-4 pt-3.5 pb-2">
				<Tabs
					defaultValue={screenSources.length === 0 ? "windows" : "screens"}
					onValueChange={(val) => setActiveTab(val as "screens" | "windows")}
					className="flex-1 flex flex-col"
				>
					{/* Header Controls: Segmented Tabs + Layout Switcher */}
					<div className="flex items-center justify-between gap-3 mb-3">
						<TabsList
							className={`grid h-8 grid-cols-2 rounded-full border p-0.5 w-[220px] ${
								isLight ? "bg-zinc-200/70 border-zinc-200" : "bg-white/[0.05] border-white/[0.08]"
							}`}
						>
							<TabsTrigger
								value="screens"
								style={
									activeTab === "screens"
										? {
												backgroundColor: activeAccent.hex,
												color: activeAccent.textHex,
												boxShadow: `0 0 10px ${activeAccent.hex}40`,
											}
										: undefined
								}
								className="rounded-full py-1 text-xs font-bold transition-all duration-150 text-zinc-400 data-[state=active]:text-black"
							>
								{t("sourceSelector.screens", { count: String(screenSources.length) })}
							</TabsTrigger>
							<TabsTrigger
								value="windows"
								style={
									activeTab === "windows"
										? {
												backgroundColor: activeAccent.hex,
												color: activeAccent.textHex,
												boxShadow: `0 0 10px ${activeAccent.hex}40`,
											}
										: undefined
								}
								className="rounded-full py-1 text-xs font-bold transition-all duration-150 text-zinc-400 data-[state=active]:text-black"
							>
								{t("sourceSelector.windows", { count: String(windowSources.length) })}
							</TabsTrigger>
						</TabsList>

						{/* Layout Toggle (Grid / List) */}
						<div
							className={`flex items-center gap-0.5 rounded-full border p-0.5 ${
								isLight ? "bg-zinc-200/70 border-zinc-200" : "bg-white/[0.05] border-white/[0.08]"
							}`}
						>
							<button
								type="button"
								onClick={() => setLayoutMode("grid")}
								className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 ${
									layoutMode === "grid"
										? isLight
											? "bg-white text-zinc-900 shadow-xs font-bold"
											: "bg-white/15 text-white shadow-xs font-bold"
										: isLight
											? "text-zinc-500 hover:text-zinc-900"
											: "text-zinc-400 hover:text-white"
								}`}
								title="Grid View"
							>
								<LayoutGrid size={14} />
							</button>
							<button
								type="button"
								onClick={() => setLayoutMode("list")}
								className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 ${
									layoutMode === "list"
										? isLight
											? "bg-white text-zinc-900 shadow-xs font-bold"
											: "bg-white/15 text-white shadow-xs font-bold"
										: isLight
											? "text-zinc-500 hover:text-zinc-900"
											: "text-zinc-400 hover:text-white"
								}`}
								title="List View"
							>
								<List size={14} />
							</button>
						</div>
					</div>

					{/* Search input bar */}
					<div className="relative mb-3">
						<Search
							size={13}
							className={`absolute left-3 top-1/2 -translate-y-1/2 ${
								isLight ? "text-zinc-400" : "text-zinc-400"
							}`}
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search screens or windows..."
							className={`w-full h-8 pl-8 pr-7 text-xs rounded-full border outline-none transition-all duration-150 ${
								isLight
									? "bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
									: "bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder-zinc-500 focus:border-white/20 focus:bg-white/[0.07] focus:ring-2 focus:ring-white/5"
							}`}
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full ${
									isLight ? "text-zinc-400 hover:text-zinc-800" : "text-zinc-400 hover:text-white"
								}`}
							>
								<X size={12} />
							</button>
						)}
					</div>

					{/* Content Panels */}
					<div className="flex-1 min-h-0">
						<TabsContent value="screens" className="h-full mt-0">
							{filteredScreenSources.length === 0 ? (
								<div className="h-[235px] flex flex-col items-center justify-center text-center p-4">
									<p className={`text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
										No screens found matching &quot;{searchQuery}&quot;
									</p>
								</div>
							) : (
								<div
									className={`${
										layoutMode === "grid"
											? "grid grid-cols-2 gap-3 auto-rows-min"
											: "flex flex-col gap-2"
									} h-[235px] overflow-y-auto pr-1.5 pt-0.5 ${
										isLight ? styles.sourceGridScrollLight : styles.sourceGridScroll
									}`}
								>
									{filteredScreenSources.map(renderSourceCard)}
								</div>
							)}
						</TabsContent>

						<TabsContent value="windows" className="h-full mt-0">
							{filteredWindowSources.length === 0 ? (
								<div className="h-[235px] flex flex-col items-center justify-center text-center p-4">
									<p className={`text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
										No windows found matching &quot;{searchQuery}&quot;
									</p>
								</div>
							) : (
								<div
									className={`${
										layoutMode === "grid"
											? "grid grid-cols-2 gap-3 auto-rows-min"
											: "flex flex-col gap-2"
									} h-[235px] overflow-y-auto pr-1.5 pt-0.5 ${
										isLight ? styles.sourceGridScrollLight : styles.sourceGridScroll
									}`}
								>
									{filteredWindowSources.map(renderSourceCard)}
								</div>
							)}
						</TabsContent>
					</div>
				</Tabs>
			</div>

			{/* Floating Actions Footer */}
			<div
				className={`flex items-center justify-end gap-2.5 border-t px-4 py-3 ${
					isLight
						? "bg-white/80 border-zinc-200/80 backdrop-blur-md"
						: "bg-[#0e0f14]/80 border-white/[0.08] backdrop-blur-md"
				}`}
			>
				<Button
					data-testid="source-selector-cancel-button"
					variant="ghost"
					onClick={() => window.close()}
					className={`h-8 rounded-full px-4 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
						isLight
							? "border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
							: "border border-white/[0.08] bg-white/[0.05] text-zinc-300 hover:bg-white/10 hover:text-white"
					}`}
				>
					{tc("actions.cancel")}
				</Button>

				<Button
					data-testid="source-selector-share-button"
					onClick={handleShare}
					disabled={!selectedSource}
					style={
						selectedSource
							? {
									backgroundColor: activeAccent.hex,
									color: activeAccent.textHex,
									boxShadow: `0 0 14px ${activeAccent.hex}50`,
								}
							: undefined
					}
					className="h-8 rounded-full px-5 text-xs font-bold transition-all duration-150 active:scale-95 disabled:bg-white/[0.05] disabled:text-zinc-600 disabled:border disabled:border-white/5 disabled:opacity-40 hover:opacity-90 cursor-pointer"
				>
					{tc("actions.share")}
				</Button>
			</div>
		</div>
	);
}
