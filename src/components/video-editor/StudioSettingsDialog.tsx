import {
	Check,
	CheckCircle2,
	Layout,
	Moon,
	Palette,
	Settings,
	Sliders,
	Sun,
	User,
	X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ACCENT_COLOR_MAP, type AccentColor, saveUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

interface StudioSettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	themeMode: "dark" | "light";
	onThemeModeChange: (mode: "dark" | "light") => void;
	accentColor: AccentColor;
	onAccentColorChange: (color: AccentColor) => void;
	userName: string;
	onUserNameChange: (name: string) => void;
	trayLayout?: "horizontal" | "vertical";
	onTrayLayoutChange?: (layout: "horizontal" | "vertical") => void;
}

export function StudioSettingsDialog({
	isOpen,
	onClose,
	themeMode,
	onThemeModeChange,
	accentColor,
	onAccentColorChange,
	userName,
	onUserNameChange,
	trayLayout = "horizontal",
	onTrayLayoutChange,
}: StudioSettingsDialogProps) {
	const isLight = themeMode === "light";
	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;

	const handleThemeToggle = (mode: "dark" | "light") => {
		onThemeModeChange(mode);
		saveUserPreferences({ theme: mode });
	};

	const handleAccentSelect = (color: AccentColor) => {
		onAccentColorChange(color);
		saveUserPreferences({ accentColor: color });
	};

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		onUserNameChange(newName);
		saveUserPreferences({ userName: newName });
	};

	const handleLayoutChange = (layout: "horizontal" | "vertical") => {
		if (onTrayLayoutChange) {
			onTrayLayoutChange(layout);
			saveUserPreferences({ trayLayout: layout });
		}
	};

	const initials =
		userName
			.trim()
			.split(/\s+/)
			.map((part) => part[0])
			.filter(Boolean)
			.join("")
			.toUpperCase()
			.slice(0, 2) || "U";

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className={cn(
					"max-w-[430px] max-h-[88vh] flex flex-col rounded-[28px] border p-0 overflow-hidden backdrop-blur-3xl transition-all duration-300 gap-0 shadow-2xl relative [&>button:last-child]:hidden",
					isLight
						? "bg-white/95 border-zinc-200/80 text-zinc-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.9)]"
						: "bg-[#0d0e12]/95 border-white/10 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
				)}
			>
				{/* Top ambient glow matching active accent */}
				<div
					className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500"
					style={{ backgroundColor: activeAccent.hex }}
				/>

				{/* Header with Hero Icon & Vertically Aligned Close Button */}
				<div className="flex items-center justify-between gap-3.5 px-6 pt-6 pb-2 relative z-10">
					<div className="flex items-center gap-3.5 min-w-0 flex-1">
						<div
							className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-lg"
							style={{
								backgroundColor: `${activeAccent.hex}18`,
								borderColor: `${activeAccent.hex}40`,
								color: activeAccent.hex,
							}}
						>
							<Settings className="w-6 h-6" style={{ color: activeAccent.hex }} />
						</div>
						<div className="min-w-0 flex-1 flex flex-col justify-center">
							<DialogTitle
								className={cn(
									"text-base font-extrabold tracking-tight truncate leading-tight",
									isLight ? "text-[#18181b]" : "text-white",
								)}
							>
								Studio Settings
							</DialogTitle>
							<p
								className={cn(
									"text-xs font-medium truncate mt-1 leading-tight",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								Preferences, profile & layout options
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className={cn(
							"w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 self-center",
							isLight
								? "border-[#e4e4e7] text-slate-500 hover:text-slate-900 hover:bg-[#f4f4f5]"
								: "border-white/10 text-slate-400 hover:text-white hover:bg-white/10",
						)}
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Scrollable Body */}
				<div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-3 pb-5 space-y-4 relative z-10">
					{/* 1. User Profile Section */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span
								className={cn(
									"text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5",
									isLight ? "text-zinc-500" : "text-zinc-400",
								)}
							>
								<User size={12} style={{ color: activeAccent.hex }} />
								<span>User Profile</span>
							</span>
						</div>

						<div
							className={cn(
								"flex items-center gap-3.5 p-3 rounded-2xl border transition-colors shadow-xs backdrop-blur-sm",
								isLight
									? "bg-zinc-50/70 border-zinc-200/80"
									: "bg-white/[0.025] border-white/[0.07]",
							)}
						>
							<div
								className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-xs shrink-0 select-none shadow-sm transition-transform hover:scale-105"
								style={{
									backgroundColor: activeAccent.hex,
									color: activeAccent.textHex,
									boxShadow: `0 3px 12px ${activeAccent.hex}35`,
								}}
							>
								{initials}
							</div>
							<div className="flex-1 min-w-0">
								<label
									htmlFor="settings-username-input"
									className={cn(
										"block text-[10.5px] font-semibold mb-1",
										isLight ? "text-zinc-500" : "text-zinc-400",
									)}
								>
									Display Name
								</label>
								<input
									id="settings-username-input"
									type="text"
									value={userName}
									onChange={handleNameChange}
									placeholder="Enter your name..."
									className={cn(
										"w-full h-8.5 px-3 rounded-xl border text-xs font-semibold outline-none transition-all",
										isLight
											? "border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
											: "border-white/[0.08] bg-black/40 text-zinc-100 placeholder:text-zinc-500 focus:border-white/20 focus:ring-2 focus:ring-white/5",
									)}
								/>
							</div>
						</div>
					</div>

					{/* 2. Theme Mode Section */}
					<div className="space-y-2">
						<span
							className={cn(
								"text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							<Sun size={12} style={{ color: activeAccent.hex }} />
							<span>Appearance Theme</span>
						</span>

						<div
							className={cn(
								"grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl border backdrop-blur-sm",
								isLight
									? "bg-zinc-100/80 border-zinc-200/80"
									: "bg-white/[0.025] border-white/[0.07]",
							)}
						>
							<button
								type="button"
								onClick={() => handleThemeToggle("dark")}
								className={cn(
									"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border",
									themeMode === "dark"
										? isLight
											? "bg-white border-zinc-200 text-zinc-900 font-extrabold shadow-xs"
											: "bg-white/12 border-white/10 text-white font-extrabold shadow-sm"
										: isLight
											? "border-transparent text-zinc-500 hover:text-zinc-900"
											: "border-transparent text-zinc-400 hover:text-white",
								)}
							>
								<Moon size={14} />
								<span>Dark Mode</span>
							</button>

							<button
								type="button"
								onClick={() => handleThemeToggle("light")}
								className={cn(
									"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border",
									themeMode === "light"
										? isLight
											? "bg-white border-zinc-200 text-zinc-900 font-extrabold shadow-xs"
											: "bg-white/12 border-white/10 text-white font-extrabold shadow-sm"
										: isLight
											? "border-transparent text-zinc-500 hover:text-zinc-900"
											: "border-transparent text-zinc-400 hover:text-white",
								)}
							>
								<Sun size={14} />
								<span>Light Mode</span>
							</button>
						</div>
					</div>

					{/* 3. Accent Color Section */}
					<div className="space-y-2">
						<span
							className={cn(
								"text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5",
								isLight ? "text-zinc-500" : "text-zinc-400",
							)}
						>
							<Palette size={12} style={{ color: activeAccent.hex }} />
							<span>Accent Color</span>
						</span>

						<div className="grid grid-cols-6 gap-2.5 pt-0.5">
							{(Object.keys(ACCENT_COLOR_MAP) as AccentColor[]).map((colKey) => {
								const colData = ACCENT_COLOR_MAP[colKey];
								const isSelected = accentColor === colKey;
								return (
									<button
										key={colKey}
										type="button"
										onClick={() => handleAccentSelect(colKey)}
										title={colData.label}
										className={cn(
											"h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer relative shadow-sm",
											isSelected
												? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0d12] scale-105 shadow-md"
												: "hover:scale-105 opacity-80 hover:opacity-100",
										)}
										style={{
											backgroundColor: colData.hex,
											boxShadow: isSelected ? `0 4px 16px ${colData.hex}60` : undefined,
										}}
									>
										{isSelected && (
											<Check size={16} strokeWidth={3} style={{ color: colData.textHex }} />
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* 4. HUD Control Layout Section */}
					{onTrayLayoutChange && (
						<div className="space-y-2">
							<span
								className={cn(
									"text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5",
									isLight ? "text-zinc-500" : "text-zinc-400",
								)}
							>
								<Layout size={12} style={{ color: activeAccent.hex }} />
								<span>Recorder HUD Layout</span>
							</span>

							<div
								className={cn(
									"grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl border backdrop-blur-sm",
									isLight
										? "bg-zinc-100/80 border-zinc-200/80"
										: "bg-white/[0.025] border-white/[0.07]",
								)}
							>
								<button
									type="button"
									onClick={() => handleLayoutChange("horizontal")}
									className={cn(
										"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border",
										trayLayout === "horizontal"
											? isLight
												? "bg-white border-zinc-200 text-zinc-900 font-extrabold shadow-xs"
												: "bg-white/12 border-white/10 text-white font-extrabold shadow-sm"
											: isLight
												? "border-transparent text-zinc-500 hover:text-zinc-900"
												: "border-transparent text-zinc-400 hover:text-white",
									)}
								>
									<Sliders size={13} />
									<span>Horizontal Bar</span>
								</button>

								<button
									type="button"
									onClick={() => handleLayoutChange("vertical")}
									className={cn(
										"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border",
										trayLayout === "vertical"
											? isLight
												? "bg-white border-zinc-200 text-zinc-900 font-extrabold shadow-xs"
												: "bg-white/12 border-white/10 text-white font-extrabold shadow-sm"
											: isLight
												? "border-transparent text-zinc-500 hover:text-zinc-900"
												: "border-transparent text-zinc-400 hover:text-white",
									)}
								>
									<Layout size={13} />
									<span>Vertical Tray</span>
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Done Action Button */}
				<div
					className={cn(
						"px-6 py-4 border-t flex justify-end gap-2 shrink-0 relative z-10",
						isLight ? "border-zinc-200/80 bg-zinc-50/50" : "border-white/[0.06] bg-white/[0.015]",
					)}
				>
					<button
						type="button"
						onClick={onClose}
						style={{
							backgroundColor: activeAccent.hex,
							color: activeAccent.textHex,
							boxShadow: `0 4px 16px ${activeAccent.hex}40`,
						}}
						className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-extrabold text-xs tracking-wide transition-all cursor-pointer hover:opacity-95 hover:scale-[1.02] active:scale-95 border-0"
					>
						<CheckCircle2 size={14} />
						<span>Done</span>
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
