import { Bug, Calendar, Palette, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { CHANGELOG_DATA, type VersionRelease } from "@/data/changelog";
import { cn } from "@/lib/utils";

interface WhatsNewSectionProps {
	isLight: boolean;
	accentHex: string;
	accentTextHex?: string;
	initialVersion?: string;
}

const CATEGORY_ICON_MAP = {
	sparkles: Sparkles,
	bug: Bug,
	palette: Palette,
	zap: Zap,
};

const CATEGORY_COLOR_MAP = {
	emerald: {
		light: "bg-emerald-50 text-emerald-700 border-emerald-200",
		dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
		dot: "bg-emerald-500",
	},
	rose: {
		light: "bg-rose-50 text-rose-700 border-rose-200",
		dark: "bg-rose-500/10 text-rose-400 border-rose-500/25",
		dot: "bg-rose-500",
	},
	sky: {
		light: "bg-sky-50 text-sky-700 border-sky-200",
		dark: "bg-sky-500/10 text-sky-400 border-sky-500/25",
		dot: "bg-sky-500",
	},
	amber: {
		light: "bg-amber-50 text-amber-800 border-amber-200",
		dark: "bg-amber-500/10 text-amber-300 border-amber-500/25",
		dot: "bg-amber-500",
	},
};

export function WhatsNewSection({ isLight, accentHex, initialVersion }: WhatsNewSectionProps) {
	const cleanInitial = (initialVersion || "").replace(/^v/i, "");
	const [selectedVersion, setSelectedVersion] = useState<string>(
		CHANGELOG_DATA.find((r) => r.version.replace(/^v/i, "") === cleanInitial)?.version ||
			CHANGELOG_DATA[0].version,
	);
	const [activeFilter, setActiveFilter] = useState<string>("all");

	const release: VersionRelease =
		CHANGELOG_DATA.find(
			(r) =>
				r.version === selectedVersion ||
				r.version.replace(/^v/i, "") === selectedVersion.replace(/^v/i, ""),
		) || CHANGELOG_DATA[0];

	// Filter categories if a specific filter is active
	const filteredCategories = release.categories.filter((cat) => {
		if (activeFilter === "all") return true;
		if (activeFilter === "feature") return cat.name.toLowerCase().includes("feature");
		if (activeFilter === "fix") return cat.name.toLowerCase().includes("fix");
		if (activeFilter === "ui")
			return cat.name.toLowerCase().includes("ui") || cat.name.toLowerCase().includes("polish");
		if (activeFilter === "perf")
			return cat.name.toLowerCase().includes("perf") || cat.name.toLowerCase().includes("engine");
		return true;
	});

	const totalChanges = release.categories.reduce((sum, cat) => sum + cat.items.length, 0);

	return (
		<div className="flex flex-col gap-3.5 px-5 pb-5 select-none">
			{/* Version Switcher Bar */}
			<div className="flex items-center justify-between gap-2 pt-1">
				<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
					{CHANGELOG_DATA.map((rel) => {
						const isSelected = rel.version === selectedVersion;
						return (
							<button
								key={rel.version}
								type="button"
								onClick={() => {
									setSelectedVersion(rel.version);
									setActiveFilter("all");
								}}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border shadow-2xs shrink-0 active:scale-95",
									isSelected
										? isLight
											? "bg-zinc-900 text-white border-zinc-900"
											: "bg-white text-zinc-950 border-white font-black"
										: isLight
											? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-950"
											: "bg-[#181b26] hover:bg-[#202433] border-[#282d3e] text-zinc-400 hover:text-white",
								)}
							>
								<span>v{rel.version}</span>
								{rel.isCurrent && (
									<span
										className={cn(
											"text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider",
											isSelected
												? isLight
													? "bg-white/20 text-white"
													: "bg-black/15 text-zinc-950"
												: isLight
													? "bg-emerald-100 text-emerald-800"
													: "bg-emerald-500/20 text-emerald-400",
										)}
									>
										Latest
									</span>
								)}
							</button>
						);
					})}
				</div>

				<div
					className={cn(
						"hidden sm:flex items-center gap-1 text-[10.5px] font-medium shrink-0",
						isLight ? "text-zinc-500" : "text-zinc-400",
					)}
				>
					<Calendar className="w-3 h-3" />
					<span>{release.date}</span>
				</div>
			</div>

			{/* Version Banner Card */}
			<div
				className={cn(
					"p-3.5 rounded-2xl border relative overflow-hidden transition-colors shadow-xs",
					isLight ? "bg-zinc-50/80 border-zinc-200" : "bg-[#141722] border-[#232736]",
				)}
			>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span
								className="text-xs font-black tracking-tight px-2 py-0.5 rounded-md"
								style={{
									backgroundColor: `${accentHex}20`,
									color: isLight ? "#0f172a" : "#ffffff",
									border: `1px solid ${accentHex}40`,
								}}
							>
								v{release.version}
							</span>
							<h3
								className={cn(
									"text-xs sm:text-[13px] font-bold tracking-tight",
									isLight ? "text-zinc-900" : "text-white",
								)}
							>
								{release.title}
							</h3>
						</div>
						<span
							className={cn(
								"text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
								isLight
									? "bg-white text-zinc-600 border-zinc-200"
									: "bg-[#181b26] text-zinc-300 border-[#282d3e]",
							)}
						>
							{totalChanges} updates
						</span>
					</div>
					<p
						className={cn(
							"text-[11px] leading-relaxed mt-0.5",
							isLight ? "text-zinc-500" : "text-zinc-400",
						)}
					>
						{release.tagline}
					</p>
				</div>

				{/* Quick Filter Tags */}
				<div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-dashed border-white/10 dark:border-white/10">
					{[
						{ id: "all", label: "All" },
						{ id: "feature", label: "Features" },
						{ id: "fix", label: "Bug Fixes" },
						{ id: "ui", label: "UI Polish" },
						{ id: "perf", label: "Engine" },
					].map((filter) => {
						const isFilterActive = activeFilter === filter.id;
						return (
							<button
								key={filter.id}
								type="button"
								onClick={() => setActiveFilter(filter.id)}
								className={cn(
									"flex-1 text-center text-[10.5px] font-semibold py-1 rounded-full border transition-all cursor-pointer active:scale-95",
									isFilterActive
										? isLight
											? "bg-zinc-800 text-white border-zinc-800"
											: "bg-[#282d3e] text-white border-zinc-500 shadow-xs"
										: isLight
											? "bg-white/80 hover:bg-zinc-100 border-zinc-200 text-zinc-600"
											: "bg-[#181b26] hover:bg-[#202433] border-[#282d3e] text-zinc-400 hover:text-zinc-200",
								)}
							>
								{filter.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Categorized Changes List */}
			<div className="flex flex-col gap-3">
				{filteredCategories.map((category) => {
					const IconComponent = CATEGORY_ICON_MAP[category.icon] || Sparkles;
					const colorScheme = CATEGORY_COLOR_MAP[category.badgeColor] || CATEGORY_COLOR_MAP.emerald;

					return (
						<div
							key={category.name}
							className={cn(
								"rounded-2xl border overflow-hidden shadow-xs transition-colors",
								isLight ? "bg-white border-zinc-200/90" : "bg-[#12141d] border-[#232736]",
							)}
						>
							{/* Category Header */}
							<div
								className={cn(
									"flex items-center justify-between px-3.5 py-2 border-b",
									isLight ? "bg-zinc-50/70 border-zinc-200/70" : "bg-[#161924] border-[#232736]",
								)}
							>
								<div className="flex items-center gap-2">
									<div
										className={cn(
											"w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 text-xs",
											isLight ? colorScheme.light : colorScheme.dark,
										)}
									>
										<IconComponent className="w-3 h-3" />
									</div>
									<h4
										className={cn(
											"text-xs font-bold tracking-tight",
											isLight ? "text-zinc-900" : "text-white",
										)}
									>
										{category.name}
									</h4>
								</div>
								<span
									className={cn(
										"text-[9.5px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider border",
										isLight ? colorScheme.light : colorScheme.dark,
									)}
								>
									{category.items.length} {category.items.length === 1 ? "item" : "items"}
								</span>
							</div>

							{/* Category Items */}
							<div className="divide-y divide-zinc-200/60 dark:divide-white/[0.05]">
								{category.items.map((item, idx) => (
									<div
										key={idx}
										className={cn(
											"flex items-start gap-2.5 p-3 transition-colors",
											isLight ? "hover:bg-zinc-50/70" : "hover:bg-white/[0.02]",
										)}
									>
										<div className="mt-1 shrink-0">
											<span className={cn("block w-1.5 h-1.5 rounded-full", colorScheme.dot)} />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-0.5">
												<span
													className={cn(
														"text-xs font-bold leading-tight",
														isLight ? "text-zinc-900" : "text-zinc-100",
													)}
												>
													{item.title}
												</span>
											</div>
											<p
												className={cn(
													"text-[11px] leading-relaxed font-normal",
													isLight ? "text-zinc-500" : "text-zinc-400",
												)}
											>
												{item.description}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
