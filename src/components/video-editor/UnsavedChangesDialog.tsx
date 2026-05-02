import { Save, Trash2, X } from "lucide-react";
import { useScopedT } from "@/contexts/I18nContext";

interface UnsavedChangesDialogProps {
	isOpen: boolean;
	onSaveAndClose: () => void;
	onDiscardAndClose: () => void;
	onCancel: () => void;
}

export function UnsavedChangesDialog({
	isOpen,
	onSaveAndClose,
	onDiscardAndClose,
	onCancel,
}: UnsavedChangesDialogProps) {
	const td = useScopedT("dialogs");
	const tc = useScopedT("common");

	if (!isOpen) return null;

	return (
		<>
			<div
				className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200"
				onClick={onCancel}
			/>
			<div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-6 w-[90vw] max-w-sm animate-in zoom-in-95 duration-200">
				<div className="flex items-center gap-3 mb-5">
					<img
						src="/openscreen.png"
						alt="OpenScreen"
						className="w-9 h-9 rounded-xl flex-shrink-0"
					/>
					<h2 className="text-base font-semibold text-slate-200 leading-tight">
						{td("unsavedChanges.title")}
					</h2>
					<button
						type="button"
						onClick={onCancel}
						className="ml-auto rounded-full p-1 hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<p className="text-sm text-slate-300 mb-1">{td("unsavedChanges.message")}</p>
				<p className="text-sm text-slate-500 mb-6">{td("unsavedChanges.detail")}</p>

				<div className="flex flex-col gap-2">
					<button
						type="button"
						onClick={onSaveAndClose}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-[#34B27B] hover:bg-[#2d9e6c] active:bg-[#27885c] text-white font-medium text-sm transition-colors"
					>
						<Save className="w-4 h-4" />
						{td("unsavedChanges.saveAndClose")}
					</button>
					<button
						type="button"
						onClick={onDiscardAndClose}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 font-medium text-sm transition-colors"
					>
						<Trash2 className="w-4 h-4" />
						{td("unsavedChanges.discardAndClose")}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 font-medium text-sm transition-colors"
					>
						{tc("actions.cancel")}
					</button>
				</div>
			</div>
		</>
	);
}
