import {
	Check,
	Layout,
	Moon,
	Palette,
	Settings,
	Sliders,
	Sparkles,
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
					"max-w-[460px] max-h-[90vh] flex flex-col rounded-2xl border p-0 overflow-hidden backdrop-blur-3xl transition-all duration-300 gap-0 shadow-2xl relative [&>button:last-child]:hidden",
					isLight
						? "bg-white border-slate-200 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)]"
						: "bg-[#0d0f17] border-white/10 text-slate-100 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]",
				)}
			>
				{/* Header with Studio Emblem & Clean Close Button */}
				<div className="flex items-center justify-between px-5 pt-5 pb-3.5 relative z-10">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div
							className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-xs relative overflow-hidden"
							style={{
								backgroundColor: `${activeAccent.hex}18`,
								borderColor: `${activeAccent.hex}35`,
							}}
						>
							<Settings
								className="w-5 h-5 transition-transform duration-500 hover:rotate-90"
								style={{ color: activeAccent.hex }}
							/>
						</div>
						<div className="min-w-0 flex-1">
							<DialogTitle
								className={cn(
									"text-base font-bold tracking-tight truncate leading-tight",
									isLight ? "text-slate-900" : "text-white",
								)}
							>
								Studio Settings
							</DialogTitle>
							<p
								className={cn(
									"text-xs font-medium truncate mt-0.5 leading-tight",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								Personalize your workspace, theme & controls
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className={cn(
							"w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0",
							isLight
								? "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
								: "border-white/10 text-slate-400 hover:text-white hover:bg-white/10",
						)}
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Solid Hairline Divider */}
				<div className={cn("h-px w-full", isLight ? "bg-slate-200" : "bg-white/[0.08]")} />

				{/* Scrollable Body */}
				<div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 relative z-10">
					{/* 1. User Profile Section */}
					<div className="space-y-2">
						<div className="flex items-center gap-1.5">
							<User className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
							<span
								className={cn(
									"text-[11px] font-bold uppercase tracking-wider",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								User Profile
							</span>
						</div>

						<div
							className={cn(
								"flex items-center gap-3 p-3 rounded-2xl border transition-colors shadow-xs backdrop-blur-sm",
								isLight
									? "bg-slate-50/80 border-slate-200"
									: "bg-white/[0.025] border-white/[0.08]",
							)}
						>
							<div
								className="flex h-11 w-11 items-center justify-center rounded-xl font-black text-sm shrink-0 select-none shadow-xs relative overflow-hidden transition-transform hover:scale-105"
								style={{
									backgroundColor: activeAccent.hex,
									color: activeAccent.textHex,
								}}
							>
								{initials}
								<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d0f17] shadow-xs" />
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between mb-1">
									<label
										htmlFor="settings-username-input"
										className={cn(
											"text-[11px] font-semibold leading-none",
											isLight ? "text-slate-600" : "text-slate-300",
										)}
									>
										Display Name
									</label>
									<span
										className={cn(
											"text-[10px] font-medium px-1.5 py-0.5 rounded",
											isLight
												? "bg-slate-200/60 text-slate-500"
												: "bg-white/5 text-slate-400 border border-white/5",
										)}
									>
										Local Workspace
									</span>
								</div>
								<input
									id="settings-username-input"
									type="text"
									value={userName}
									onChange={handleNameChange}
									placeholder="Enter your name..."
									className={cn(
										"w-full h-8.5 px-3 rounded-xl border text-xs font-semibold outline-none transition-all",
										isLight
											? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
											: "border-white/10 bg-black/40 text-slate-100 placeholder:text-slate-500 focus:border-white/25 focus:ring-1 focus:ring-white/10",
									)}
								/>
							</div>
						</div>
					</div>

					{/* 2. Appearance Theme Section with Visual Previews */}
					<div className="space-y-2">
						<div className="flex items-center gap-1.5">
							<Sun className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
							<span
								className={cn(
									"text-[11px] font-bold uppercase tracking-wider",
									isLight ? "text-slate-500" : "text-slate-400",
								)}
							>
								Appearance Theme
							</span>
						</div>

						<div className="grid grid-cols-2 gap-2.5">
							{/* Dark Mode Card */}
							<button
								type="button"
								onClick={() => handleThemeToggle("dark")}
								className={cn(
									"p-2.5 rounded-2xl border transition-all cursor-pointer relative group text-left shadow-xs flex flex-col gap-2",
									themeMode === "dark"
										? "ring-2 ring-offset-2 ring-offset-[#0d0f17] border-white/20 bg-white/[0.06]"
										: isLight
											? "border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300 opacity-80 hover:opacity-100"
											: "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] opacity-80 hover:opacity-100",
								)}
								style={
									themeMode === "dark"
										? {
												borderColor: activeAccent.hex,
												boxShadow: `0 0 16px ${activeAccent.hex}25`,
											}
										: undefined
								}
							>
								{/* Mini Window Preview */}
								<div className="w-full h-12 rounded-xl bg-[#090a0f] border border-white/10 p-1.5 flex flex-col justify-between overflow-hidden shadow-inner relative">
									<div className="flex items-center gap-1">
										<div className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
										<div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
										<div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
									</div>
									<div className="flex items-center gap-1.5">
										<div
											className="w-8 h-1.5 rounded-full"
											style={{ backgroundColor: activeAccent.hex }}
										/>
										<div className="w-4 h-1.5 rounded-full bg-white/20" />
									</div>
								</div>

								<div className="flex items-center justify-between px-0.5">
									<div className="flex items-center gap-1.5">
										<Moon className="w-3.5 h-3.5 text-indigo-400" />
										<span className="text-xs font-bold text-white">Dark Mode</span>
									</div>
									{themeMode === "dark" && (
										<div
											className="w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
											style={{
												backgroundColor: activeAccent.hex,
												color: activeAccent.textHex,
											}}
										>
											<Check className="w-2.5 h-2.5 stroke-[3]" />
										</div>
									)}
								</div>
							</button>

							{/* Light Mode Card */}
							<button
								type="button"
								onClick={() => handleThemeToggle("light")}
								className={cn(
									"p-2.5 rounded-2xl border transition-all cursor-pointer relative group text-left shadow-xs flex flex-col gap-2",
									themeMode === "light"
										? "ring-2 ring-offset-2 ring-offset-[#0d0f17] border-white/20 bg-white/[0.06]"
										: isLight
											? "border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300 opacity-80 hover:opacity-100"
											: "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] opacity-80 hover:opacity-100",
								)}
								style={
									themeMode === "light"
										? {
												borderColor: activeAccent.hex,
												boxShadow: `0 0 16px ${activeAccent.hex}25`,
											}
										: undefined
								}
							>
								{/* Mini Window Preview */}
								<div className="w-full h-12 rounded-xl bg-slate-100 border border-slate-300 p-1.5 flex flex-col justify-between overflow-hidden shadow-inner relative">
									<div className="flex items-center gap-1">
										<div className="w-1.5 h-1.5 rounded-full bg-red-400" />
										<div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
										<div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
									</div>
									<div className="flex items-center gap-1.5">
										<div
											className="w-8 h-1.5 rounded-full"
											style={{ backgroundColor: activeAccent.hex }}
										/>
										<div className="w-4 h-1.5 rounded-full bg-slate-300" />
									</div>
								</div>

								<div className="flex items-center justify-between px-0.5">
									<div className="flex items-center gap-1.5">
										<Sun className="w-3.5 h-3.5 text-amber-400" />
										<span
											className={cn("text-xs font-bold", isLight ? "text-slate-900" : "text-white")}
										>
											Light Mode
										</span>
									</div>
									{themeMode === "light" && (
										<div
											className="w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
											style={{
												backgroundColor: activeAccent.hex,
												color: activeAccent.textHex,
											}}
										>
											<Check className="w-2.5 h-2.5 stroke-[3]" />
										</div>
									)}
								</div>
							</button>
						</div>
					</div>

					{/* 3. Accent Color Section with Specular Gems */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5">
								<Palette className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
								<span
									className={cn(
										"text-[11px] font-bold uppercase tracking-wider",
										isLight ? "text-slate-500" : "text-slate-400",
									)}
								>
									Accent Color
								</span>
							</div>
							<span className="text-[11px] font-mono font-bold" style={{ color: activeAccent.hex }}>
								{activeAccent.hex.toUpperCase()}
							</span>
						</div>

						<div className="grid grid-cols-6 gap-2 pt-0.5">
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
											"h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer relative shadow-sm overflow-hidden border border-black/10 dark:border-white/10 group",
											isSelected
												? "ring-2 ring-white/90 ring-offset-2 ring-offset-[#0d0f17] scale-105 shadow-md z-10"
												: "hover:scale-105 opacity-85 hover:opacity-100",
										)}
										style={{
											backgroundColor: colData.hex,
										}}
									>
										{isSelected && (
											<Check
												className="w-4 h-4 stroke-[3] drop-shadow-md z-10"
												style={{ color: colData.textHex }}
											/>
										)}
									</button>
								);
							})}
						</div>

						{/* Selected Color Label Pill */}
						<div
							className={cn(
								"flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs",
								isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.025] border-white/[0.06]",
							)}
						>
							<div className="flex items-center gap-2">
								<div
									className="w-2.5 h-2.5 rounded-full shadow-xs"
									style={{ backgroundColor: activeAccent.hex }}
								/>
								<span className="text-slate-400 font-medium">Selected Theme:</span>
								<span className={cn("font-bold", isLight ? "text-slate-900" : "text-white")}>
									{activeAccent.label}
								</span>
							</div>
							<span className="text-[10.5px] font-semibold text-slate-400">Live Preview</span>
						</div>
					</div>

					{/* 4. HUD Control Layout Section */}
					{onTrayLayoutChange && (
						<div className="space-y-2">
							<div className="flex items-center gap-1.5">
								<Layout className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />
								<span
									className={cn(
										"text-[11px] font-bold uppercase tracking-wider",
										isLight ? "text-slate-500" : "text-slate-400",
									)}
								>
									Recorder HUD Layout
								</span>
							</div>

							<div
								className={cn(
									"grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl border backdrop-blur-sm",
									isLight
										? "bg-slate-100 border-slate-200"
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
												? "bg-white border-slate-200 text-slate-900 shadow-xs"
												: "bg-white/12 border-white/10 text-white shadow-sm"
											: isLight
												? "border-transparent text-slate-500 hover:text-slate-900"
												: "border-transparent text-slate-400 hover:text-white",
									)}
								>
									<Sliders className="w-3.5 h-3.5" />
									<span>Horizontal Bar</span>
								</button>

								<button
									type="button"
									onClick={() => handleLayoutChange("vertical")}
									className={cn(
										"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border",
										trayLayout === "vertical"
											? isLight
												? "bg-white border-slate-200 text-slate-900 shadow-xs"
												: "bg-white/12 border-white/10 text-white shadow-sm"
											: isLight
												? "border-transparent text-slate-500 hover:text-slate-900"
												: "border-transparent text-slate-400 hover:text-white",
									)}
								>
									<Layout className="w-3.5 h-3.5" />
									<span>Vertical Tray</span>
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Footer Bar */}
				<div
					className={cn(
						"px-5 py-3.5 border-t flex items-center justify-between shrink-0 relative z-10",
						isLight ? "border-slate-200 bg-slate-50/60" : "border-white/[0.06] bg-white/[0.02]",
					)}
				>
					<div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
						<Sparkles className="w-3 h-3 text-slate-500" />
						<span>Ocal Screen Studio</span>
						<span className="text-slate-600">•</span>
						<span>v2.9</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						style={{
							backgroundColor: activeAccent.hex,
							color: activeAccent.textHex,
							boxShadow: `0 4px 16px ${activeAccent.hex}40`,
						}}
						className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer hover:opacity-95 hover:scale-[1.02] active:scale-95 border-0 shadow-md"
					>
						<Check className="w-3.5 h-3.5 stroke-[3]" />
						<span>Done</span>
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
