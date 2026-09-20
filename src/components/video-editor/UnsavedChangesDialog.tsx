import { Film, Save, Trash2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { ACCENT_COLOR_MAP, type AccentColor } from "@/lib/userPreferences";
import { cn } from "@/lib/utils";

interface UnsavedChangesDialogProps {
	isOpen: boolean;
	variant?: "close" | "newProject" | "loadProject";
	onSaveAndClose: () => void;
	onDiscardAndClose: () => void;
	onCancel: () => void;
	accentColor?: AccentColor;
	themeMode?: "dark" | "light";
}

export function UnsavedChangesDialog({
	isOpen,
	variant = "close",
	onSaveAndClose,
	onDiscardAndClose,
	onCancel,
	accentColor = "lime",
	themeMode = "dark",
}: UnsavedChangesDialogProps) {
	const activeAccent = ACCENT_COLOR_MAP[accentColor] || ACCENT_COLOR_MAP.lime;
	const isLight = themeMode === "light";
	const td = useScopedT("dialogs");
	const tc = useScopedT("common");

	const detail =
		variant === "newProject"
			? td("unsavedChanges.detailNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.detailLoadProject")
				: td("unsavedChanges.detail");
	const saveLabel =
		variant === "newProject"
			? td("unsavedChanges.saveAndNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.saveAndLoadProject")
				: td("unsavedChanges.saveAndClose");
	const discardLabel =
		variant === "newProject"
			? td("unsavedChanges.discardAndNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.discardAndLoadProject")
				: td("unsavedChanges.discardAndClose");

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent
				className={cn(
					"rounded-2xl max-w-[440px] p-5 gap-0 shadow-2xl transition-all border",
					isLight
						? "bg-white border-zinc-200 text-zinc-900 shadow-zinc-300/60"
						: "bg-[#0e0f14] border-white/10 text-zinc-100 shadow-black/90",
				)}
			>
				<DialogHeader className="mb-5 text-left">
					<div className="flex items-start gap-3.5">
						<div
							className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 mt-0.5"
							style={{
								backgroundColor: `${activeAccent.hex}15`,
								borderColor: `${activeAccent.hex}30`,
								color: activeAccent.hex,
							}}
						>
							<Film className="w-5 h-5 stroke-[2]" />
						</div>
						<div className="min-w-0 flex-1 pr-4">
							<DialogTitle
								className={cn(
									"text-base font-bold tracking-tight leading-snug",
									isLight ? "text-zinc-900" : "text-white",
								)}
							>
								{td("unsavedChanges.title")}
							</DialogTitle>
							<DialogDescription
								className={cn(
									"text-xs mt-1.5 leading-relaxed",
									isLight ? "text-zinc-600" : "text-zinc-400",
								)}
							>
								{td("unsavedChanges.message")} {detail}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{/* Footer Actions */}
				<div
					className={cn(
						"flex items-center justify-between gap-2.5 pt-4 border-t",
						isLight ? "border-zinc-200" : "border-white/[0.08]",
					)}
				>
					<button
						type="button"
						onClick={onCancel}
						className={cn(
							"px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
							isLight
								? "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
								: "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200",
						)}
					>
						{tc("actions.cancel")}
					</button>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onDiscardAndClose}
							className={cn(
								"flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
								isLight
									? "border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100"
									: "border-red-500/30 bg-red-500/[0.06] text-red-400 hover:bg-red-500/15 hover:border-red-500/50",
							)}
						>
							<Trash2 className="w-3.5 h-3.5" />
							<span>{discardLabel}</span>
						</button>

						<button
							type="button"
							onClick={onSaveAndClose}
							style={{
								backgroundColor: activeAccent.hex,
								color: activeAccent.textHex,
							}}
							className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:opacity-90 active:scale-[0.98] shadow-sm"
						>
							<Save className="w-3.5 h-3.5 stroke-[2.2]" />
							<span>{saveLabel}</span>
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
