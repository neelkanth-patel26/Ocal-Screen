import { AlertCircle, AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ className, ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="system"
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
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 shadow-2xs">
						<Check className="w-4 h-4 stroke-[2.5]" />
					</div>
				),
				error: (
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0 shadow-2xs">
						<AlertCircle className="w-4 h-4 stroke-[2.5]" />
					</div>
				),
				warning: (
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 shadow-2xs">
						<AlertTriangle className="w-4 h-4 stroke-[2.5]" />
					</div>
				),
				info: (
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0 shadow-2xs">
						<Sparkles className="w-4 h-4 stroke-[2.5]" />
					</div>
				),
				loading: (
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-white/20 text-zinc-200 shrink-0 shadow-2xs">
						<Loader2 className="w-4 h-4 animate-spin" />
					</div>
				),
			}}
			toastOptions={{
				classNames: {
					toast: "group toast font-sans rounded-2xl select-none transition-all duration-200",
					title: "font-bold tracking-tight",
					description: "font-medium",
					actionButton:
						"bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl px-3 py-1.5 transition-colors border border-white/10",
					cancelButton:
						"bg-white/5 hover:bg-white/10 text-zinc-400 text-xs rounded-xl px-3 py-1.5 transition-colors",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
