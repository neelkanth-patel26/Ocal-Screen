import { Film, Save, Trash2, X } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { ACCENT_COLOR_MAP, type AccentColor } from "@/lib/userPreferences";

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
				className={`rounded-3xl max-w-sm p-6 gap-0 shadow-2xl transition-colors duration-200 ${
					isLight
						? "bg-[#ffffff] border-[#e4e4e7] text-[#18181b]"
						: "bg-[#0c0c0c] border-[#252525] text-[#e8e8e8]"
				}`}
			>
				<DialogHeader className="mb-4">
					<div className="flex items-center gap-3">
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
								isLight ? "bg-[#f4f4f5] border-[#e4e4e7]" : "bg-[#141414] border-[#252525]"
							}`}
							style={{ color: activeAccent.hex }}
						>
							<Film className="h-5 w-5" />
						</div>
						<DialogTitle
							className={`text-base font-extrabold leading-tight ${
								isLight ? "text-[#18181b]" : "text-[#e8e8e8]"
							}`}
						>
							{td("unsavedChanges.title")}
						</DialogTitle>
					</div>
				</DialogHeader>

				<p className={`text-xs font-semibold mb-1 ${isLight ? "text-[#18181b]" : "text-[#e8e8e8]"}`}>
					{td("unsavedChanges.message")}
				</p>
				<DialogDescription className="text-xs text-[#888888] mb-6 leading-relaxed">
					{detail}
				</DialogDescription>

				<div className="flex flex-col gap-2.5">
					<button
						type="button"
						onClick={onSaveAndClose}
						style={{ backgroundColor: activeAccent.hex, color: activeAccent.textHex }}
						className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-full active:scale-95 font-extrabold text-xs tracking-wide transition-all shadow-md cursor-pointer outline-none hover:opacity-90"
					>
						<Save className="w-4 h-4" />
						{saveLabel}
					</button>
					<button
						type="button"
						onClick={onDiscardAndClose}
						className={`flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-full active:scale-95 border font-bold text-xs transition-all cursor-pointer outline-none ${
							isLight
								? "bg-[#f4f4f5] hover:bg-red-500/10 border-[#e4e4e7] hover:border-red-500/30 text-[#18181b] hover:text-red-600"
								: "bg-[#141414] hover:bg-red-500/20 border-[#252525] hover:border-red-500/40 text-[#e8e8e8] hover:text-red-400"
						}`}
					>
						<Trash2 className="w-4 h-4" />
						{discardLabel}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className={`flex items-center justify-center gap-2 w-full px-5 py-2 rounded-full font-bold text-xs transition-all cursor-pointer outline-none ${
							isLight
								? "hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b]"
								: "hover:bg-[#141414] text-[#888888] hover:text-[#e8e8e8]"
						}`}
					>
						<X className="w-3.5 h-3.5" />
						{tc("actions.cancel")}
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
