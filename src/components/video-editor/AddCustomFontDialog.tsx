import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScopedT } from "@/contexts/I18nContext";
import {
	addCustomFont,
	type CustomFont,
	generateFontId,
	isValidGoogleFontsUrl,
	parseFontFamilyFromImport,
} from "@/lib/customFonts";
import { cn } from "@/lib/utils";

interface AddCustomFontDialogProps {
	onFontAdded?: (font: CustomFont) => void;
	isLight?: boolean;
}

export function AddCustomFontDialog({ onFontAdded, isLight }: AddCustomFontDialogProps) {
	const t = useScopedT("settings");
	const tc = useScopedT("common");
	const [open, setOpen] = useState(false);
	const [importUrl, setImportUrl] = useState("");
	const [fontName, setFontName] = useState("");
	const [loading, setLoading] = useState(false);

	const handleImportUrlChange = (url: string) => {
		setImportUrl(url);

		if (isValidGoogleFontsUrl(url)) {
			const extracted = parseFontFamilyFromImport(url);
			if (extracted && !fontName) {
				setFontName(extracted);
			}
		}
	};

	const handleAdd = async () => {
		if (!importUrl.trim()) {
			toast.error(t("customFont.errorEmptyUrl"));
			return;
		}

		if (!isValidGoogleFontsUrl(importUrl)) {
			toast.error(t("customFont.errorInvalidUrl"));
			return;
		}

		if (!fontName.trim()) {
			toast.error(t("customFont.errorEmptyName"));
			return;
		}

		setLoading(true);

		try {
			const fontFamily = parseFontFamilyFromImport(importUrl);
			if (!fontFamily) {
				toast.error(t("customFont.errorExtractFailed"));
				setLoading(false);
				return;
			}

			const newFont: CustomFont = {
				id: generateFontId(fontName),
				name: fontName.trim(),
				fontFamily: fontFamily,
				importUrl: importUrl.trim(),
			};

			// Loads and verifies the font; throws on failure
			await addCustomFont(newFont);

			if (onFontAdded) {
				onFontAdded(newFont);
			}

			toast.success(t("customFont.successMessage", { fontName }));

			setImportUrl("");
			setFontName("");
			setOpen(false);
		} catch (error) {
			console.error("Failed to add custom font:", error);
			const errorMessage = error instanceof Error ? error.message : "Failed to load font";
			toast.error(t("customFont.failedToAdd"), {
				description: errorMessage.includes("timeout")
					? t("customFont.errorTimeout")
					: t("customFont.errorLoadFailed"),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						"w-full h-9 text-xs rounded-xl border transition-all cursor-pointer font-bold",
						isLight
							? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs hover:border-slate-300"
							: "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10",
					)}
				>
					<Plus className="w-3.5 h-3.5 mr-1" />
					{t("customFont.dialogTitle")}
				</Button>
			</DialogTrigger>
			<DialogContent
				className={cn(
					"border rounded-2xl",
					isLight
						? "bg-white border-slate-200 text-slate-900"
						: "bg-[#141824] border-white/10 text-slate-200",
				)}
			>
				<DialogHeader>
					<DialogTitle
						className={isLight ? "text-slate-900 font-extrabold" : "text-white font-extrabold"}
					>
						{t("customFont.dialogTitle")}
					</DialogTitle>
					<DialogDescription
						className={isLight ? "text-slate-500 text-xs" : "text-slate-400 text-xs"}
					>
						Add a custom font from Google Fonts to use in your annotations.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 mt-4">
					<div className="space-y-2">
						<Label
							htmlFor="import-url"
							className={
								isLight ? "text-slate-700 text-xs font-bold" : "text-slate-200 text-xs font-bold"
							}
						>
							{t("customFont.urlLabel")}
						</Label>
						<Input
							id="import-url"
							placeholder={t("customFont.urlPlaceholder")}
							value={importUrl}
							onChange={(e) => handleImportUrlChange(e.target.value)}
							className={cn(
								"text-xs rounded-xl border",
								isLight
									? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
									: "bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500",
							)}
						/>
						<p className={isLight ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>
							{t("customFont.urlHelp")}
						</p>
					</div>

					<div className="space-y-2">
						<Label
							htmlFor="font-name"
							className={
								isLight ? "text-slate-700 text-xs font-bold" : "text-slate-200 text-xs font-bold"
							}
						>
							{t("customFont.nameLabel")}
						</Label>
						<Input
							id="font-name"
							placeholder={t("customFont.namePlaceholder")}
							value={fontName}
							onChange={(e) => setFontName(e.target.value)}
							className={cn(
								"text-xs rounded-xl border",
								isLight
									? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
									: "bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500",
							)}
						/>
						<p className={isLight ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>
							{t("customFont.nameHelp")}
						</p>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							className={cn(
								"rounded-xl border font-bold text-xs h-9",
								isLight
									? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
									: "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10",
							)}
						>
							{tc("actions.cancel")}
						</Button>
						<Button
							onClick={handleAdd}
							disabled={loading}
							className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 cursor-pointer"
						>
							{loading ? t("customFont.addingButton") : t("customFont.addButton")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
