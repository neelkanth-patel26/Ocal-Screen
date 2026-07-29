import { Check, Moon, Palette, Settings, Sun, User, Layout } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ACCENT_COLOR_MAP, type AccentColor, saveUserPreferences } from "@/lib/userPreferences";

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
	const initials = userName
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
				className={`rounded-3xl max-w-md p-6 gap-0 shadow-2xl transition-colors duration-200 ${
					isLight
						? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
						: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
				}`}
			>
				<DialogHeader className="mb-6">
					<div className="flex items-center gap-3">
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
								isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
							}`}
							style={{ color: activeAccent.hex }}
						>
							<Settings className="h-5 w-5" />
						</div>
						<div>
							<DialogTitle
								className={`text-base font-extrabold leading-tight ${
									isLight ? "text-[#18181b]" : "text-[#e8e8e8]"
								}`}
							>
								Studio Settings
							</DialogTitle>
							<p className="text-xs text-[#888888]">Customize appearance, user profile & HUD</p>
						</div>
					</div>
				</DialogHeader>

				<div className="flex flex-col gap-6">
					{/* 1. User Profile Section */}
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#888888]">
							<User className="h-3.5 w-3.5" style={{ color: activeAccent.hex }} />
							<span>User Profile</span>
						</div>
						<div
							className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
								isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
							}`}
						>
							<div
								className="flex h-11 w-11 items-center justify-center rounded-full font-black text-sm shadow-md flex-shrink-0"
								style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
							>
								{initials}
							</div>
							<div className="flex-1 min-w-0">
								<label
									htmlFor="settings-username-input"
									className="block text-[11px] font-semibold text-[#888888] mb-1"
								>
									Display Name
								</label>
								<input
									id="settings-username-input"
									type="text"
									value={userName}
									onChange={handleNameChange}
									placeholder="Enter your name..."
									className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none transition-all ${
										isLight
											? "bg-white border-[#e4e4e7] text-[#18181b] focus:border-[#18181b]"
											: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8] focus:border-[#e8ff47]"
									}`}
								/>
							</div>
						</div>
					</div>

					{/* 2. Theme Mode Section */}
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#888888]">
							<Sun className="h-3.5 w-3.5" style={{ color: activeAccent.hex }} />
							<span>Appearance Theme</span>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => handleThemeToggle("dark")}
								style={
									themeMode === "dark"
										? {
												borderColor: activeAccent.hex,
												color: activeAccent.hex,
												boxShadow: `0 0 0 1px ${activeAccent.hex}50`,
										  }
										: undefined
								}
								className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
									themeMode === "dark"
										? "bg-[#141414]"
										: isLight
											? "bg-[#f4f4f5] border-[#e4e4e7] text-[#888888] hover:bg-[#e4e4e7]"
											: "bg-[#141414] border-[#252525] text-[#888888] hover:text-[#e8e8e8]"
								}`}
							>
								<Moon className="h-4 w-4" />
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
												boxShadow: `0 0 0 1px ${activeAccent.hex}50`,
										  }
										: undefined
								}
								className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
									themeMode === "light"
										? isLight
											? "bg-[#ffffff] text-[#18181b]"
											: "bg-[#141414]"
										: isLight
											? "bg-[#f4f4f5] border-[#e4e4e7] text-[#888888] hover:bg-[#e4e4e7]"
											: "bg-[#141414] border-[#252525] text-[#888888] hover:text-[#e8e8e8]"
								}`}
							>
								<Sun className="h-4 w-4" />
								<span>Light Mode</span>
							</button>
						</div>
					</div>

					{/* 3. Accent Color Section */}
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#888888]">
							<Palette className="h-3.5 w-3.5" style={{ color: activeAccent.hex }} />
							<span>Accent Color</span>
						</div>
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
										className={`h-10 rounded-2xl transition-all flex items-center justify-center cursor-pointer ${
											isSelected
												? "scale-105 ring-2 ring-white ring-offset-2 ring-offset-[#0c0c0c] shadow-lg"
												: "hover:scale-105 opacity-80 hover:opacity-100"
										}`}
										style={{ backgroundColor: colData.hex }}
									>
										{isSelected && <Check className="h-4 w-4" style={{ color: colData.textHex }} />}
									</button>
								);
							})}
						</div>
					</div>

					{/* 4. HUD Control Layout Section */}
					{onTrayLayoutChange && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#888888]">
								<Layout className="h-3.5 w-3.5" style={{ color: activeAccent.hex }} />
								<span>Recorder HUD Layout</span>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<button
									type="button"
									onClick={() => handleLayoutChange("horizontal")}
									style={
										trayLayout === "horizontal"
											? {
													borderColor: activeAccent.hex,
													color: activeAccent.hex,
													boxShadow: `0 0 0 1px ${activeAccent.hex}50`,
											  }
											: undefined
									}
									className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
										trayLayout === "horizontal"
											? isLight
												? "bg-[#ffffff]"
												: "bg-[#141414]"
											: isLight
												? "bg-[#f4f4f5] border-[#e4e4e7] text-[#888888] hover:bg-[#e4e4e7]"
												: "bg-[#141414] border-[#252525] text-[#888888] hover:text-[#e8e8e8]"
									}`}
								>
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
													boxShadow: `0 0 0 1px ${activeAccent.hex}50`,
											  }
											: undefined
									}
									className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
										trayLayout === "vertical"
											? isLight
												? "bg-[#ffffff]"
												: "bg-[#141414]"
											: isLight
												? "bg-[#f4f4f5] border-[#e4e4e7] text-[#888888] hover:bg-[#e4e4e7]"
												: "bg-[#141414] border-[#252525] text-[#888888] hover:text-[#e8e8e8]"
									}`}
								>
									<span>Vertical Tray</span>
								</button>
							</div>
						</div>
					)}
				</div>

				<div className="mt-6 pt-4 border-t border-[#252525] flex justify-end">
					<button
						type="button"
						onClick={onClose}
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						className="px-6 py-2.5 rounded-full font-extrabold text-xs tracking-wide transition-all shadow-md cursor-pointer active:scale-95 hover:opacity-90"
					>
						Done
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
