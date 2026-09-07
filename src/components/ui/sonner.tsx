import { AlertCircle, AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ className, ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			className={cn(
				"toaster group pointer-events-none [&_[data-sonner-toast]]:pointer-events-auto",
				className,
			)}
			duration={3500}
			visibleToasts={3}
			expand={true}
			gap={10}
			icons={{
				success: (
					<div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)] flex-shrink-0">
						<Check className="w-3.5 h-3.5 stroke-[2.5]" />
					</div>
				),
				error: (
					<div className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)] flex-shrink-0">
						<AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
					</div>
				),
				warning: (
					<div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] flex-shrink-0">
						<AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
					</div>
				),
				info: (
					<div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)] flex-shrink-0">
						<Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
					</div>
				),
				loading: (
					<div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex-shrink-0">
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					</div>
				),
			}}
			toastOptions={{
				classNames: {
					toast:
						"group toast font-sans rounded-2xl border border-white/[0.12] bg-[#0c0e14]/90 text-slate-100 shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.14)] backdrop-blur-2xl px-4 py-3.5 text-xs font-medium tracking-tight select-none transition-all duration-200",
					title: "text-[13px] font-semibold text-white tracking-tight leading-snug",
					description: "text-[11.5px] text-zinc-300 font-normal leading-relaxed mt-0.5",
					actionButton:
						"group-[.toast]:bg-white/10 group-[.toast]:hover:bg-white/20 group-[.toast]:text-white text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors border border-white/10",
					cancelButton:
						"group-[.toast]:bg-white/5 group-[.toast]:hover:bg-white/10 group-[.toast]:text-zinc-400 text-xs rounded-lg px-2.5 py-1 transition-colors",
					success:
						"data-[type=success]:border-emerald-500/30 data-[type=success]:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.12),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
					error:
						"data-[type=error]:border-rose-500/30 data-[type=error]:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7),0_0_20px_rgba(244,63,94,0.12),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
					warning:
						"data-[type=warning]:border-amber-500/30 data-[type=warning]:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7),0_0_20px_rgba(245,158,11,0.12),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
					info: "data-[type=info]:border-blue-500/30 data-[type=info]:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7),0_0_20px_rgba(59,130,246,0.12),inset_0_1px_0_0_rgba(255,255,255,0.14)]",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
