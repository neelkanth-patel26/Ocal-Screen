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
					"max-w-md overflow-hidden rounded-3xl p-0 border backdrop-blur-3xl transition-colors duration-200 gap-0",
					isLight
						? "bg-white/95 border-zinc-200 text-zinc-900"
						: "bg-[#0d0e14]/95 border-white/[0.1] text-zinc-100",
				)}
			>
				{/* Dialog Header */}
				<div
					className={cn(
						"flex items-center justify-between px-6 py-4 border-b",
						isLight ? "border-zinc-200 bg-zinc-50/50" : "border-white/[0.08] bg-white/[0.02]",
					)}
				>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
								isLight
									? "bg-white border-zinc-200 text-zinc-800"
									: "bg-white/[0.06] border-white/[0.08] text-white",
							)}
						>
							<Settings size={18} style={{ color: activeAccent.hex }} />
						</div>
						<div>
							<DialogTitle className="text-sm font-extrabold tracking-tight">
								Studio Settings
							</DialogTitle>
							<p
								className={cn(
									"text-[11px] font-medium",
									isLight ? "text-zinc-500" : "text-zinc-400",
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
							"flex h-7 w-7 items-center justify-center rounded-full transition-colors cursor-pointer",
							isLight
								? "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
								: "text-zinc-400 hover:text-white hover:bg-white/10",
						)}
					>
						<X size={15} />
					</button>
				</div>

				<div className="p-6 space-y-5">
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
								"flex items-center gap-3 p-3 rounded-2xl border transition-colors",
								isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/[0.03] border-white/[0.08]",
							)}
						>
							<div
								className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-xs shrink-0 select-none"
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
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
										"w-full h-8 px-3 rounded-xl border text-xs font-semibold outline-none transition-all",
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
								"grid grid-cols-2 gap-1 p-1 rounded-2xl border",
								isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/[0.03] border-white/[0.08]",
							)}
						>
							<button
								type="button"
								onClick={() => handleThemeToggle("dark")}
								className={cn(
									"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
									themeMode === "dark"
										? isLight
											? "bg-white text-zinc-900 font-extrabold"
											: "bg-white/15 text-white font-extrabold"
										: isLight
											? "text-zinc-600 hover:text-zinc-900"
											: "text-zinc-400 hover:text-white",
								)}
							>
								<Moon size={14} />
								<span>Dark Mode</span>
							</button>

							<button
								type="button"
								onClick={() => handleThemeToggle("light")}
								className={cn(
									"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
									themeMode === "light"
										? isLight
											? "bg-white text-zinc-900 font-extrabold"
											: "bg-white/15 text-white font-extrabold"
										: isLight
											? "text-zinc-600 hover:text-zinc-900"
											: "text-zinc-400 hover:text-white",
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
											"h-9 rounded-xl transition-all flex items-center justify-center cursor-pointer relative",
											isSelected
												? "ring-2 ring-white ring-offset-2 ring-offset-[#0d0e14] scale-105"
												: "hover:scale-105 opacity-80 hover:opacity-100",
										)}
										style={{ backgroundColor: colData.hex }}
									>
										{isSelected && <Check size={15} style={{ color: colData.textHex }} />}
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
									"grid grid-cols-2 gap-1 p-1 rounded-2xl border",
									isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/[0.03] border-white/[0.08]",
								)}
							>
								<button
									type="button"
									onClick={() => handleLayoutChange("horizontal")}
									className={cn(
										"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
										trayLayout === "horizontal"
											? isLight
												? "bg-white text-zinc-900 font-extrabold"
												: "bg-white/15 text-white font-extrabold"
											: isLight
												? "text-zinc-600 hover:text-zinc-900"
												: "text-zinc-400 hover:text-white",
									)}
								>
									<Sliders size={13} />
									<span>Horizontal Bar</span>
								</button>

								<button
									type="button"
									onClick={() => handleLayoutChange("vertical")}
									className={cn(
										"flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
										trayLayout === "vertical"
											? isLight
												? "bg-white text-zinc-900 font-extrabold"
												: "bg-white/15 text-white font-extrabold"
											: isLight
												? "text-zinc-600 hover:text-zinc-900"
												: "text-zinc-400 hover:text-white",
									)}
								>
									<Layout size={13} />
									<span>Vertical Tray</span>
								</button>
							</div>
						</div>
					)}

					{/* Done Action Button */}
					<div
						className={cn(
							"pt-4 border-t flex justify-end gap-2",
							isLight ? "border-zinc-200" : "border-white/[0.08]",
						)}
					>
						<button
							type="button"
							onClick={onClose}
							style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							className="flex items-center gap-1.5 px-6 py-2 rounded-full font-extrabold text-xs tracking-wide transition-all cursor-pointer hover:opacity-90 active:scale-95"
						>
							<CheckCircle2 size={14} />
							<span>Done</span>
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
