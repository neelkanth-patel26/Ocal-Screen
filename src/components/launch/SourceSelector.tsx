import { LayoutGrid, List, Search, X } from "lucide-react";
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
				className={`h-full flex items-center justify-center ${styles.glassContainer}`}
				style={{ minHeight: "100vh" }}
			>
				<OcalLoader text={t("sourceSelector.loading")} />
			</div>
		);
	}

	if (hasNoSources) {
		return (
			<div
				className={`h-full flex items-center justify-center ${styles.glassContainer}`}
				style={{ minHeight: "100vh" }}
			>
				<div className="max-w-[320px] px-6 text-center">
					<h2 className="text-sm font-semibold text-white">{t("sourceSelector.emptyTitle")}</h2>
					<p className="mt-2 text-xs leading-5 text-zinc-400">
						{loadFailed
							? t("sourceSelector.loadFailedDescription")
							: t("sourceSelector.emptyDescription")}
					</p>
					<Button
						onClick={() => void fetchSources()}
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						className="mt-4 h-8 rounded-full px-5 text-[11px] font-extrabold transition-transform duration-150 hover:opacity-90 active:scale-95 cursor-pointer"
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
					style={isSelected ? { borderColor: activeAccent.hex } : undefined}
					className={`flex items-center justify-between p-2 rounded-xl border ${
						isSelected
							? "border-2 bg-[#161616]"
							: "border-[#252525] bg-[#141414] hover:bg-[#1a1a1a] hover:border-[#383838]"
					} transition-all cursor-pointer`}
					onClick={() => handleSourceSelect(source)}
				>
					<div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
						{source.appIcon && (
							<img src={source.appIcon} alt="" className="w-5 h-5 flex-shrink-0" />
						)}
						<span className="text-xs font-semibold text-[#e8e8e8] truncate">{source.name}</span>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						{source.thumbnail && (
							<img
								src={source.thumbnail}
								alt=""
								className="w-16 h-10 object-cover rounded-lg border border-[#252525] bg-black"
							/>
						)}
						{isSelected && (
							<div
								className={styles.checkBadge}
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								<MdCheck size={13} style={{ color: activeAccent.textHex }} />
							</div>
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
				style={isSelected ? { borderColor: activeAccent.hex } : undefined}
				className={`${styles.sourceCard} ${isSelected ? styles.selected : ""} p-2`}
				onClick={() => handleSourceSelect(source)}
			>
				<div className="relative mb-2 overflow-hidden rounded-xl border border-[#252525] bg-black">
					<img
						src={source.thumbnail || ""}
						alt={source.name}
						className="w-full aspect-video object-cover"
					/>
					{isSelected && (
						<div className="absolute right-2 top-2">
							<div
								className={styles.checkBadge}
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								<MdCheck size={13} style={{ color: activeAccent.textHex }} />
							</div>
						</div>
					)}
				</div>
				<div className="flex items-center gap-1.5 px-1 pb-0.5">
					{source.appIcon && (
						<img src={source.appIcon} alt="" className={`${styles.icon} flex-shrink-0`} />
					)}
					<div className={`${styles.name} truncate`}>{source.name}</div>
				</div>
			</div>
		);
	};

	return (
		<div
			className={`min-h-screen flex flex-col transition-colors duration-200 ${
				isLight ? "bg-[#f4f4f5] text-[#18181b]" : "bg-[#0c0c0c] text-[#e8e8e8]"
			}`}
		>
			<div className="flex-1 flex flex-col w-full px-4 pt-3">
				<Tabs
					defaultValue={screenSources.length === 0 ? "windows" : "screens"}
					onValueChange={(val) => setActiveTab(val as "screens" | "windows")}
					className="flex-1 flex flex-col"
				>
					<div className="flex items-center justify-between gap-2 mb-2">
						<TabsList
							className={`grid h-9 grid-cols-2 rounded-full border p-1 w-[220px] ${
								isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
							}`}
						>
							<TabsTrigger
								value="screens"
								style={
									activeTab === "screens"
										? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
										: undefined
								}
								className="rounded-full py-1 text-xs font-semibold text-[#888888] transition-all data-[state=active]:font-extrabold shadow-none"
							>
								{t("sourceSelector.screens", { count: String(screenSources.length) })}
							</TabsTrigger>
							<TabsTrigger
								value="windows"
								style={
									activeTab === "windows"
										? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
										: undefined
								}
								className="rounded-full py-1 text-xs font-semibold text-[#888888] transition-all data-[state=active]:font-extrabold shadow-none"
							>
								{t("sourceSelector.windows", { count: String(windowSources.length) })}
							</TabsTrigger>
						</TabsList>

						{/* Layout Options (Grid / List toggle) */}
						<div
							className={`flex items-center gap-1 rounded-full border p-0.5 ${
								isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
							}`}
						>
							<button
								type="button"
								onClick={() => setLayoutMode("grid")}
								style={layoutMode === "grid" ? { color: activeAccent.hex } : undefined}
								className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
									layoutMode === "grid"
										? isLight
											? "bg-[#e4e4e7]"
											: "bg-[#252525]"
										: "text-[#666666] hover:text-white"
								}`}
								title="Grid View"
							>
								<LayoutGrid size={14} />
							</button>
							<button
								type="button"
								onClick={() => setLayoutMode("list")}
								style={layoutMode === "list" ? { color: activeAccent.hex } : undefined}
								className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
									layoutMode === "list"
										? isLight
											? "bg-[#e4e4e7]"
											: "bg-[#252525]"
										: "text-[#666666] hover:text-white"
								}`}
								title="List View"
							>
								<List size={14} />
							</button>
						</div>
					</div>

					{/* Search input bar */}
					<div className="relative mb-2.5">
						<Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search sources..."
							className={`w-full h-8 pl-8 pr-7 text-xs rounded-full border outline-none transition-colors ${
								isLight
									? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b] placeholder-[#888888] focus:border-[#18181b]"
									: "bg-[#141414] border-[#252525] text-[#e8e8e8] placeholder-[#666666] focus:border-[#383838]"
							}`}
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#18181b]"
							>
								<X size={12} />
							</button>
						)}
					</div>

					<div className="flex-1 min-h-0">
						<TabsContent value="screens" className="h-full mt-0">
							<div
								className={`${
									layoutMode === "grid"
										? "grid grid-cols-2 gap-3 auto-rows-min"
										: "flex flex-col gap-2"
								} h-[242px] overflow-y-auto pr-1.5 pt-0.5 ${styles.sourceGridScroll}`}
							>
								{filteredScreenSources.map(renderSourceCard)}
							</div>
						</TabsContent>
						<TabsContent value="windows" className="h-full mt-0">
							<div
								className={`${
									layoutMode === "grid"
										? "grid grid-cols-2 gap-3 auto-rows-min"
										: "flex flex-col gap-2"
								} h-[242px] overflow-y-auto pr-1.5 pt-0.5 ${styles.sourceGridScroll}`}
							>
								{filteredWindowSources.map(renderSourceCard)}
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</div>
			<div
				className={`flex justify-center gap-3 border-t p-3 rounded-b-[20px] ${
					isLight ? "bg-[#ffffff] border-[#e4e4e7]" : "bg-[#0c0c0c] border-[#252525]"
				}`}
			>
				<Button
					data-testid="source-selector-cancel-button"
					variant="ghost"
					onClick={() => window.close()}
					className={`h-8 rounded-full px-5 text-xs font-semibold border active:scale-95 cursor-pointer ${
						isLight
							? "border-[#e4e4e7] bg-[#f4f4f5] text-[#18181b] hover:bg-[#e4e4e7]"
							: "border-[#252525] bg-[#141414] text-[#888888] hover:text-white hover:bg-[#202020]"
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
							? { backgroundColor: activeAccent.hex, color: activeAccent.textHex }
							: undefined
					}
					className="h-8 rounded-full px-6 text-xs font-extrabold transition-transform duration-150 active:scale-95 disabled:bg-[#252525] disabled:text-[#666666] disabled:opacity-50 hover:opacity-90 cursor-pointer"
				>
					{tc("actions.share")}
				</Button>
			</div>
		</div>
	);
}
