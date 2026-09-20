import {
	AlignLeft,
	Bug,
	ChevronDown,
	ChevronUp,
	Cpu,
	FileText,
	Film,
	HelpCircle,
	Layout,
	Monitor,
	Send,
	Sparkles,
	Volume2,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ACCENT_COLOR_MAP, loadUserPreferences } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

const APP_VERSION = __APP_VERSION__;
const GITHUB_ISSUES_URL = "https://github.com/neelkanth-patel26/Ocal-Screen/issues/new";

const BUG_CATEGORIES = [
	{ id: "UI/Visual", label: "UI / Visual", icon: Layout },
	{ id: "Export/Render", label: "Export / Render", icon: Film },
	{ id: "Audio/Video", label: "Audio / Video", icon: Volume2 },
	{ id: "Performance", label: "Performance", icon: Zap },
	{ id: "Other", label: "Other", icon: HelpCircle },
];

interface SystemDetails {
	cpu: string;
	ram: string;
	os: string;
	gpu: string;
	appVersion: string;
	electronVersion?: string;
	chromeVersion?: string;
}

function getWebGLGpuInfo(): string {
	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		if (gl) {
			const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
			if (debugInfo) {
				const renderer = (gl as WebGLRenderingContext).getParameter(
					debugInfo.UNMASKED_RENDERER_WEBGL,
				);
				if (renderer) return String(renderer);
			}
		}
	} catch {
		// Ignore fallback
	}
	return "Standard Graphics Adapter";
}

export function ReportBugDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const prefs = loadUserPreferences();
	const activeAccent = ACCENT_COLOR_MAP[prefs.accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = prefs.theme === "light";

	const [title, setTitle] = useState("");
	const [category, setCategory] = useState("UI/Visual");
	const [description, setDescription] = useState("");
	const [attachEnv, setAttachEnv] = useState(true);
	const [showSpecDetails, setShowSpecDetails] = useState(false);
	const [sysDetails, setSysDetails] = useState<SystemDetails | null>(null);

	useEffect(() => {
		if (!open) return;

		async function fetchDetails() {
			const webglGpu = getWebGLGpuInfo();
			let fetched: SystemDetails = {
				cpu: `${navigator.hardwareConcurrency || 8} Logical Cores`,
				ram: (navigator as unknown as { deviceMemory?: number }).deviceMemory
					? `~${(navigator as unknown as { deviceMemory?: number }).deviceMemory} GB RAM`
					: "System Memory",
				os: navigator.platform || "Windows",
				gpu: webglGpu,
				appVersion: `v${APP_VERSION}`,
			};

			if (window.electronAPI?.getSystemInfo) {
				try {
					const info = await window.electronAPI.getSystemInfo();
					fetched = {
						cpu: info.cpu,
						ram: info.ram,
						os: info.os,
						gpu: info.gpu && info.gpu !== "Graphics Adapter" ? info.gpu : webglGpu,
						appVersion: `v${info.appVersion}`,
						electronVersion: info.electronVersion,
						chromeVersion: info.chromeVersion,
					};
				} catch {
					// Fallback to WebGL
				}
			}

			setSysDetails(fetched);
		}

		fetchDetails();
	}, [open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim()) {
			toast.error("Please enter a bug title");
			return;
		}

		const fullTitle = `[${category}] ${title.trim()}`;
		const envInfo =
			attachEnv && sysDetails
				? `\n\n---\n### Detailed System & Hardware Specifications\n` +
					`- **Operating System**: ${sysDetails.os}\n` +
					`- **Processor (CPU)**: ${sysDetails.cpu}\n` +
					`- **Memory (RAM)**: ${sysDetails.ram}\n` +
					`- **Graphics Card (GPU)**: ${sysDetails.gpu}\n` +
					`- **App & Engine Version**: ${sysDetails.appVersion}` +
					(sysDetails.electronVersion
						? ` (Electron v${sysDetails.electronVersion}, Chrome v${sysDetails.chromeVersion})`
						: "")
				: "";

		const bodyText = `### Bug Description\n${description.trim() || "No description provided."}\n\n### Category\n${category}${envInfo}`;

		const issueUrl = `${GITHUB_ISSUES_URL}?title=${encodeURIComponent(fullTitle)}&body=${encodeURIComponent(bodyText)}`;

		if (window.electronAPI?.openExternalUrl) {
			window.electronAPI.openExternalUrl(issueUrl);
		} else {
			window.open(issueUrl, "_blank");
		}

		toast.success("Bug report prepared! Opening GitHub Issues...");
		setTitle("");
		setDescription("");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"max-w-lg overflow-hidden rounded-2xl p-0 border backdrop-blur-3xl transition-all duration-300 relative",
					isLight
						? "bg-white/95 border-zinc-200 text-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)]"
						: "bg-[#0c0d12]/95 border-white/[0.09] text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]",
				)}
			>
				{/* Top ambient radial glow matching active accent */}
				<div
					className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
					style={{ backgroundColor: activeAccent.hex }}
				/>

				<div className="p-6 space-y-4 relative z-10">
					{/* Header */}
					<DialogHeader className="space-y-1 text-left">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div
									className="flex h-9 w-9 items-center justify-center rounded-xl border shadow-xs transition-transform hover:scale-105"
									style={{
										backgroundColor: `${activeAccent.hex}18`,
										borderColor: `${activeAccent.hex}30`,
										color: activeAccent.hex,
									}}
								>
									<Bug size={18} />
								</div>
								<div>
									<DialogTitle className="text-base font-extrabold tracking-tight flex items-center gap-2">
										<span>Report an Issue</span>
									</DialogTitle>
									<p
										className={cn(
											"text-xs font-medium mt-0.5",
											isLight ? "text-slate-500" : "text-slate-400",
										)}
									>
										Submit a bug report directly to GitHub Issues
									</p>
								</div>
							</div>
							<span
								className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-xs inline-flex items-center gap-1.5"
								style={{
									backgroundColor: `${activeAccent.hex}18`,
									borderColor: `${activeAccent.hex}35`,
									color: activeAccent.hex,
								}}
							>
								v{APP_VERSION}
							</span>
						</div>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Category Selector */}
						<div className="space-y-2">
							<label
								className={cn(
									"text-xs font-bold flex items-center gap-1.5",
									isLight ? "text-slate-700" : "text-slate-300",
								)}
							>
								<Sparkles size={13} style={{ color: activeAccent.hex }} />
								<span>Select Category</span>
							</label>
							<div className="flex flex-wrap gap-1.5">
								{BUG_CATEGORIES.map((cat) => {
									const isSelected = category === cat.id;
									const Icon = cat.icon;
									return (
										<button
											key={cat.id}
											type="button"
											onClick={() => setCategory(cat.id)}
											style={
												isSelected
													? {
															backgroundColor: `${activeAccent.hex}22`,
															borderColor: `${activeAccent.hex}44`,
															color: isLight ? "#0f172a" : "#ffffff",
															boxShadow: `0 0 12px ${activeAccent.hex}20`,
														}
													: undefined
											}
											className={cn(
												"flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none",
												isSelected
													? "shadow-xs border-current/30 scale-[1.01]"
													: isLight
														? "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-black"
														: "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
											)}
										>
											<Icon size={13} className={isSelected ? "text-current" : "opacity-70"} />
											<span>{cat.label}</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Bug Title */}
						<div className="space-y-1.5">
							<label
								className={cn(
									"text-xs font-bold flex items-center gap-1.5",
									isLight ? "text-slate-700" : "text-slate-300",
								)}
							>
								<FileText size={13} className="text-slate-400" />
								<span>Title / Summary</span>
								<span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Briefly describe what went wrong..."
								className={cn(
									"w-full h-10 px-3.5 rounded-xl border text-xs font-semibold outline-none transition-all shadow-2xs",
									isLight
										? "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
										: "border-white/[0.08] bg-white/[0.03] text-slate-100 placeholder:text-slate-500 focus:border-white/30 focus:ring-2 focus:ring-white/5",
								)}
							/>
						</div>

						{/* Description */}
						<div className="space-y-1.5">
							<label
								className={cn(
									"text-xs font-bold flex items-center gap-1.5",
									isLight ? "text-slate-700" : "text-slate-300",
								)}
							>
								<AlignLeft size={13} className="text-slate-400" />
								<span>Steps to Reproduce / Details</span>
							</label>
							<textarea
								rows={3}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Provide details or steps to reproduce the issue..."
								className={cn(
									"w-full p-3.5 rounded-xl border text-xs font-medium outline-none transition-all resize-none custom-scrollbar shadow-2xs leading-relaxed",
									isLight
										? "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
										: "border-white/[0.08] bg-white/[0.03] text-slate-100 placeholder:text-slate-500 focus:border-white/30 focus:ring-2 focus:ring-white/5",
								)}
							/>
						</div>

						{/* Attach System & Hardware Information Switch Card */}
						<div className="space-y-2">
							<div
								className={cn(
									"flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
									isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.025] border-white/[0.08]",
								)}
								onClick={() => setAttachEnv((prev) => !prev)}
							>
								<div className="flex items-center gap-2.5">
									<div
										className="flex h-7 w-7 items-center justify-center rounded-lg border"
										style={{
											backgroundColor: `${activeAccent.hex}18`,
											borderColor: `${activeAccent.hex}30`,
											color: activeAccent.hex,
										}}
									>
										<Cpu size={14} />
									</div>
									<div>
										<div
											className={cn(
												"text-xs font-bold",
												isLight ? "text-slate-800" : "text-slate-200",
											)}
										>
											Include Detailed Hardware Specs
										</div>
										<div
											className={cn(
												"text-[10px] font-medium",
												isLight ? "text-slate-500" : "text-slate-400",
											)}
										>
											Attaches CPU, RAM, GPU, VRAM & OS Version info
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
									{attachEnv && (
										<button
											type="button"
											onClick={() => setShowSpecDetails((prev) => !prev)}
											className={cn(
												"p-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
												isLight
													? "hover:bg-slate-200 text-slate-600"
													: "hover:bg-white/10 text-slate-300",
											)}
											title="Toggle Specifications Details"
										>
											{showSpecDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
										</button>
									)}
									<Switch
										checked={attachEnv}
										onCheckedChange={setAttachEnv}
										style={{
											backgroundColor: attachEnv ? activeAccent.hex : undefined,
										}}
										className="scale-90"
									/>
								</div>
							</div>

							{/* Hardware Specs Details Box (Clean Modern Monospace) */}
							{attachEnv && sysDetails && (
								<div
									className={cn(
										"p-3 rounded-xl border text-[11px] space-y-1 font-mono transition-all leading-snug",
										isLight
											? "bg-slate-100/70 border-slate-200 text-slate-700"
											: "bg-black/30 border-white/[0.08] text-slate-300",
									)}
								>
									<div
										className="flex items-center justify-between font-sans font-bold text-xs mb-1.5"
										style={{ color: activeAccent.hex }}
									>
										<div className="flex items-center gap-1.5">
											<Monitor size={12} />
											<span>System Hardware Overview</span>
										</div>
										<span className="text-[10px] opacity-75 font-mono">
											{sysDetails.appVersion}
										</span>
									</div>
									<div className="truncate">
										<strong className="font-sans text-slate-500 font-semibold mr-1">OS:</strong>{" "}
										{sysDetails.os}
									</div>
									<div className="truncate">
										<strong className="font-sans text-slate-500 font-semibold mr-1">CPU:</strong>{" "}
										{sysDetails.cpu}
									</div>
									<div className="truncate">
										<strong className="font-sans text-slate-500 font-semibold mr-1">RAM:</strong>{" "}
										{sysDetails.ram}
									</div>
									<div className="truncate">
										<strong className="font-sans text-slate-500 font-semibold mr-1">GPU:</strong>{" "}
										{sysDetails.gpu}
									</div>
								</div>
							)}
						</div>

						{/* Action Buttons */}
						<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className={cn(
									"px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
									isLight
										? "text-slate-600 hover:bg-slate-100"
										: "text-slate-400 hover:bg-white/[0.06] hover:text-white",
								)}
							>
								Cancel
							</button>
							<button
								type="submit"
								style={{
									backgroundColor: `${activeAccent.hex}22`,
									borderColor: `${activeAccent.hex}50`,
									color: isLight ? "#0f172a" : "#ffffff",
									boxShadow: `0 0 16px ${activeAccent.hex}25`,
								}}
								className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-current/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
							>
								<Send size={13} style={{ color: activeAccent.hex }} />
								<span>Submit & Open Issue</span>
							</button>
						</div>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
