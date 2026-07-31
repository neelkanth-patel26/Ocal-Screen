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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

	// Compute user initials for avatar badge
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
					"max-w-md overflow-hidden rounded-3xl p-0 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] border backdrop-blur-3xl transition-all duration-300 gap-0",
					isLight
						? "bg-white/95 border-[#e4e4e7] text-slate-800"
						: "bg-[#141417]/95 border-white/10 text-slate-100"
				)}
			>
				{/* Top Accent Gradient Bar */}
				<div
					className="h-1.5 w-full"
					style={{
						background: `linear-gradient(to right, ${activeAccent.hex}, #a855f7, #3b82f6)`,
					}}
				/>

				<div className="p-6 space-y-5">
					{/* Dialog Header */}
					<DialogHeader className="space-y-1 text-left">
						<div className="flex items-center gap-3">
							<div
								className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm transition-transform hover:scale-105"
								style={{ backgroundColor: `${activeAccent.hex}18`, color: activeAccent.hex }}
							>
								<Settings size={20} />
							</div>
							<div>
								<DialogTitle className="text-base font-extrabold tracking-tight flex items-center gap-2">
									<span>Studio Settings</span>
								</DialogTitle>
								<p className={cn("text-xs font-medium mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>
									Customize appearance, user profile & HUD layout
								</p>
							</div>
						</div>
					</DialogHeader>

					<div className="space-y-4">
						{/* 1. User Profile Section */}
						<div className="space-y-2">
							<label className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isLight ? "text-slate-500" : "text-slate-400")}>
								<User size={13} style={{ color: activeAccent.hex }} />
								<span>User Profile</span>
							</label>
							<div
								className={cn(
									"flex items-center gap-3 p-3.5 rounded-2xl border transition-all shadow-2xs",
									isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-white/5 border-white/10"
								)}
							>
								<div
									className="flex h-11 w-11 items-center justify-center rounded-2xl font-black text-sm shadow-md flex-shrink-0 transition-transform hover:scale-105"
									style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
								>
									{initials}
								</div>
								<div className="flex-1 min-w-0">
									<label
										htmlFor="settings-username-input"
										className={cn("block text-[11px] font-semibold mb-1", isLight ? "text-slate-500" : "text-slate-400")}
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
											"w-full h-9 px-3 rounded-xl border text-xs font-bold outline-none transition-all shadow-2xs",
											isLight
												? "border-[#e4e4e7] bg-white text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
												: "border-white/10 bg-black/40 text-slate-100 placeholder:text-slate-500 focus:border-white/30 focus:ring-2 focus:ring-white/10"
										)}
									/>
								</div>
							</div>
						</div>

						{/* 2. Theme Mode Section */}
						<div className="space-y-2">
							<label className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isLight ? "text-slate-500" : "text-slate-400")}>
								<Sun size={13} style={{ color: activeAccent.hex }} />
								<span>Appearance Theme</span>
							</label>
							<div className="grid grid-cols-2 gap-2.5">
								<button
									type="button"
									onClick={() => handleThemeToggle("dark")}
									style={
										themeMode === "dark"
											? {
													borderColor: activeAccent.hex,
													color: activeAccent.hex,
													backgroundColor: `${activeAccent.hex}12`,
													boxShadow: `0 0 0 1px ${activeAccent.hex}40`,
												}
											: undefined
									}
									className={cn(
										"flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none shadow-2xs",
										themeMode === "dark"
											? "font-extrabold"
											: isLight
												? "border-[#e4e4e7] bg-[#f4f4f5] text-slate-600 hover:border-slate-300 hover:bg-slate-200/70"
												: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
									)}
								>
									<Moon size={15} />
									<span>Dark Mode</span>
								</button>

								<button
									type="button"
									onClick={() => handleThemeToggle("light")}
									style={
										themeMode === "light"
											? {
													borderColor: activeAccent.hex,
													color: activeAccent.hex,
													backgroundColor: `${activeAccent.hex}12`,
													boxShadow: `0 0 0 1px ${activeAccent.hex}40`,
												}
											: undefined
									}
									className={cn(
										"flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none shadow-2xs",
										themeMode === "light"
											? "font-extrabold"
											: isLight
												? "border-[#e4e4e7] bg-[#f4f4f5] text-slate-600 hover:border-slate-300 hover:bg-slate-200/70"
												: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
									)}
								>
									<Sun size={15} />
									<span>Light Mode</span>
								</button>
							</div>
						</div>

						{/* 3. Accent Color Section */}
						<div className="space-y-2">
							<label className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isLight ? "text-slate-500" : "text-slate-400")}>
								<Palette size={13} style={{ color: activeAccent.hex }} />
								<span>Accent Color</span>
							</label>
							<div className="grid grid-cols-6 gap-2">
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
												"h-10 rounded-2xl transition-all flex items-center justify-center cursor-pointer shadow-2xs relative",
												isSelected
													? "scale-105 ring-2 ring-offset-2 shadow-md"
													: "hover:scale-105 opacity-80 hover:opacity-100"
											)}
											style={{
												backgroundColor: colData.hex,
												outlineColor: isSelected ? colData.hex : undefined,
											}}
										>
											{isSelected && <Check size={16} style={{ color: colData.textHex }} className="drop-shadow-xs" />}
										</button>
									);
								})}
							</div>
						</div>

						{/* 4. HUD Control Layout Section */}
						{onTrayLayoutChange && (
							<div className="space-y-2">
								<label className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", isLight ? "text-slate-500" : "text-slate-400")}>
									<Layout size={13} style={{ color: activeAccent.hex }} />
									<span>Recorder HUD Layout</span>
								</label>
								<div className="grid grid-cols-2 gap-2.5">
									<button
										type="button"
										onClick={() => handleLayoutChange("horizontal")}
										style={
											trayLayout === "horizontal"
												? {
														borderColor: activeAccent.hex,
														color: activeAccent.hex,
														backgroundColor: `${activeAccent.hex}12`,
														boxShadow: `0 0 0 1px ${activeAccent.hex}40`,
													}
												: undefined
										}
										className={cn(
											"flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none shadow-2xs",
											trayLayout === "horizontal"
												? "font-extrabold"
												: isLight
													? "border-[#e4e4e7] bg-[#f4f4f5] text-slate-600 hover:border-slate-300 hover:bg-slate-200/70"
													: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
										)}
									>
										<Sliders size={14} />
										<span>Horizontal Bar</span>
									</button>

									<button
										type="button"
										onClick={() => handleLayoutChange("vertical")}
										style={
											trayLayout === "vertical"
												? {
														borderColor: activeAccent.hex,
														color: activeAccent.hex,
														backgroundColor: `${activeAccent.hex}12`,
														boxShadow: `0 0 0 1px ${activeAccent.hex}40`,
													}
												: undefined
										}
										className={cn(
											"flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none shadow-2xs",
											trayLayout === "vertical"
												? "font-extrabold"
												: isLight
													? "border-[#e4e4e7] bg-[#f4f4f5] text-slate-600 hover:border-slate-300 hover:bg-slate-200/70"
													: "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
										)}
									>
										<Layout size={14} />
										<span>Vertical Tray</span>
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Done Action Button */}
					<div className="pt-3 border-t border-white/10 flex justify-end">
						<button
							type="button"
							onClick={onClose}
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-extrabold text-xs tracking-wide transition-all shadow-md cursor-pointer hover:scale-[1.03] active:scale-95"
						>
							<CheckCircle2 size={15} />
							<span>Done</span>
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
