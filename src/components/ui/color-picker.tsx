import { HsvaColor, hexToHsva } from "@uiw/color-convert";
import Colorful from "@uiw/react-color-colorful";
import { Check, Copy, Palette, Pipette } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type BaseProps = {
	selectedColor: string;
	colorPalette: string[];
	onUpdateColor: (color: string) => void;
	activeAccentHex?: string;
	isLight?: boolean;
};

type ColorPickerProps =
	| (BaseProps & {
			clearBackgroundOption?: false;
			translations: Record<"colorWheel" | "colorPalette", string>;
	  })
	| (BaseProps & {
			clearBackgroundOption: true;
			translations: Record<"colorWheel" | "colorPalette" | "clearBackground", string>;
	  });

export default function ColorPicker(props: ColorPickerProps) {
	const {
		selectedColor,
		colorPalette,
		translations,
		onUpdateColor,
		activeAccentHex = "#3b82f6",
		isLight = false,
	} = props;
	const [colorMode, setColorMode] = useState<"wheel" | "palette">("wheel");
	const [hexInput, setHexInput] = useState(selectedColor);
	const [copied, setCopied] = useState(false);
	const [transparentColorHSVA, setTransparentColorHSVA] = useState<HsvaColor>({
		h: 0,
		s: 0,
		v: 0,
		a: 0,
	});

	useEffect(() => {
		setHexInput(selectedColor);
	}, [selectedColor]);

	const getTextColor = (color: string) => {
		if (color === "transparent") return "#ffffff";
		const cleanHex = color.replace(/^#/, "");
		if (cleanHex.length < 6) return "#ffffff";
		const r = parseInt(cleanHex.slice(0, 2), 16);
		const g = parseInt(cleanHex.slice(2, 4), 16);
		const b = parseInt(cleanHex.slice(4, 6), 16);
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		return luminance > 170 ? "#000000" : "#ffffff";
	};

	const normalizeHexDraft = (raw: string) => {
		const trimmed = raw.trim();
		if (trimmed === "") return "";
		if (/^[0-9A-Fa-f]/.test(trimmed[0])) return `#${trimmed}`;
		return trimmed;
	};

	const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const normalized = normalizeHexDraft(e.target.value);
		setHexInput(normalized);
		const isValidHexColor =
			/^#[0-9A-Fa-f]{3}$/.test(normalized) || /^#[0-9A-Fa-f]{6}$/.test(normalized);
		if (isValidHexColor) {
			onUpdateColor(normalized);
		}
	};

	const handleCopyHex = () => {
		if (selectedColor && selectedColor !== "transparent") {
			navigator.clipboard.writeText(selectedColor.toUpperCase());
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}
	};

	const handleEyeDropper = async () => {
		if (typeof window !== "undefined" && "EyeDropper" in window) {
			try {
				// biome-ignore lint/suspicious/noExplicitAny: native EyeDropper API
				const eyeDropper = new (window as any).EyeDropper();
				const result = await eyeDropper.open();
				if (result?.sRGBHex) {
					onUpdateColor(result.sRGBHex);
					setHexInput(result.sRGBHex);
				}
			} catch {
				// User cancelled eyedropper
			}
		}
	};

	const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

	const toTransparent = (color: string) => {
		if (color === "transparent") return;
		const hsva = hexToHsva(color);
		hsva.a = 0;
		return hsva;
	};

	return (
		<div className="w-full flex flex-col gap-3 items-center">
			{/* Segmented Mode Switcher */}
			<div
				className={cn(
					"flex items-center p-1 rounded-xl w-full border",
					isLight ? "bg-slate-100/90 border-slate-200" : "bg-white/[0.04] border-white/[0.08]",
				)}
			>
				<button
					type="button"
					onClick={() => setColorMode("wheel")}
					className={cn(
						"flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
						colorMode === "wheel"
							? "shadow-sm border-current/30"
							: isLight
								? "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60"
								: "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
					)}
					style={
						colorMode === "wheel"
							? {
									backgroundColor: `${activeAccentHex}22`,
									borderColor: `${activeAccentHex}50`,
									color: isLight ? "#0f172a" : "#ffffff",
									boxShadow: `0 0 12px ${activeAccentHex}20`,
								}
							: undefined
					}
				>
					<Pipette className="w-3.5 h-3.5" />
					<span>{translations.colorWheel}</span>
				</button>
				<button
					type="button"
					onClick={() => setColorMode("palette")}
					className={cn(
						"flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
						colorMode === "palette"
							? "shadow-sm border-current/30"
							: isLight
								? "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60"
								: "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
					)}
					style={
						colorMode === "palette"
							? {
									backgroundColor: `${activeAccentHex}22`,
									borderColor: `${activeAccentHex}50`,
									color: isLight ? "#0f172a" : "#ffffff",
									boxShadow: `0 0 12px ${activeAccentHex}20`,
								}
							: undefined
					}
				>
					<Palette className="w-3.5 h-3.5" />
					<span>{translations.colorPalette}</span>
				</button>
			</div>

			{/* Integrated Swatch + Hex Control Bar */}
			<div
				className={cn(
					"w-full flex items-center gap-2.5 p-2 rounded-xl border transition-all shadow-xs",
					isLight ? "bg-white border-slate-200" : "bg-white/[0.03] border-white/[0.08]",
				)}
			>
				{/* Live Squircle Color Swatch Preview */}
				<div
					className="w-9 h-9 rounded-xl border border-white/20 shadow-inner shrink-0 relative overflow-hidden flex items-center justify-center transition-transform hover:scale-105"
					style={{
						backgroundColor: selectedColor === "transparent" ? "transparent" : selectedColor,
					}}
					title={selectedColor}
				>
					{selectedColor === "transparent" && (
						<span className="text-[10px] font-bold text-slate-400">None</span>
					)}
				</div>

				{/* Modern Hex Input with Prefix & Copy Button */}
				<div
					className={cn(
						"flex-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all focus-within:ring-1",
						isLight
							? "bg-slate-50 border-slate-200 focus-within:border-slate-400 focus-within:ring-slate-300"
							: "bg-black/40 border-white/10 focus-within:border-white/30 focus-within:ring-white/20",
					)}
				>
					<span className="text-xs font-bold text-slate-400 select-none">#</span>
					<input
						type="text"
						value={hexInput.replace(/^#/, "")}
						placeholder="FFFFFF"
						className={cn(
							"w-full bg-transparent text-xs font-mono font-bold outline-none uppercase tracking-wider",
							isLight ? "text-slate-900" : "text-slate-100",
						)}
						onChange={(e) => {
							const clean = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
							handleColorInputChange({
								target: { value: `#${clean}` },
							} as React.ChangeEvent<HTMLInputElement>);
						}}
						maxLength={6}
					/>
					<button
						type="button"
						onClick={handleCopyHex}
						title="Copy Hex Code"
						className={cn(
							"p-1 rounded-md transition-all cursor-pointer shrink-0",
							isLight
								? "text-slate-400 hover:text-slate-800 hover:bg-slate-200/60"
								: "text-slate-400 hover:text-white hover:bg-white/10",
						)}
					>
						{copied ? (
							<Check className="w-3.5 h-3.5 text-emerald-400" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
					{hasEyeDropper && (
						<button
							type="button"
							onClick={handleEyeDropper}
							title="Pick Color from Screen"
							className={cn(
								"p-1 rounded-md transition-all cursor-pointer shrink-0",
								isLight
									? "text-slate-400 hover:text-slate-800 hover:bg-slate-200/60"
									: "text-slate-400 hover:text-white hover:bg-white/10",
							)}
						>
							<Pipette className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
			</div>

			{/* Color Wheel View */}
			{colorMode === "wheel" && (
				<div
					className={cn(
						"w-full rounded-2xl overflow-hidden border p-2 flex justify-center shadow-md",
						isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/[0.08]",
					)}
				>
					<Colorful
						color={selectedColor !== "transparent" ? selectedColor : transparentColorHSVA}
						onChange={(color) => {
							onUpdateColor(color.hex);
						}}
						style={{
							width: "100%",
							borderRadius: "12px",
							overflow: "hidden",
						}}
						disableAlpha={true}
					/>
				</div>
			)}

			{/* Palette View: 6-column Luxury Squircle Grid */}
			{colorMode === "palette" && (
				<div
					className={cn(
						"w-full grid grid-cols-6 gap-2 p-3 rounded-2xl border shadow-inner",
						isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/[0.08]",
					)}
				>
					{colorPalette.map((color) => {
						const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
						return (
							<button
								key={color}
								type="button"
								onClick={() => {
									onUpdateColor(color);
									setHexInput(color);
								}}
								className={cn(
									"w-full aspect-square rounded-xl border transition-all duration-200 cursor-pointer relative group flex items-center justify-center shadow-2xs",
									isSelected
										? "scale-110 ring-2 ring-white/90 shadow-md z-10"
										: "border-white/10 hover:scale-105 hover:border-white/30",
								)}
								style={{
									backgroundColor: color,
								}}
								title={color}
							>
								{isSelected && (
									<Check
										className="w-3.5 h-3.5 stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
										style={{ color: getTextColor(color) }}
									/>
								)}
							</button>
						);
					})}
				</div>
			)}

			{props.clearBackgroundOption === true && (
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"w-full mt-1 text-xs h-8 rounded-xl border border-dashed transition-all",
						isLight
							? "border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
							: "border-white/15 text-slate-400 hover:text-white hover:bg-white/5",
					)}
					onClick={() => {
						const hsva = toTransparent(selectedColor);
						if (hsva) setTransparentColorHSVA(hsva);
						onUpdateColor("transparent");
					}}
				>
					{props.translations.clearBackground}
				</Button>
			)}
		</div>
	);
}
