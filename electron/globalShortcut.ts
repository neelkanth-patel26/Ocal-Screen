import fs from "node:fs/promises";
import { globalShortcut } from "electron";
import { type ShortcutBinding } from "../src/lib/shortcuts";
import { SHORTCUTS_FILE } from "./ipc/handlers";

const DEFAULT_OPEN_APP_BINDING: ShortcutBinding = { key: "o", ctrl: true, shift: true };

function bindingToAccelerator(binding: ShortcutBinding): string {
	const parts: string[] = [];
	if (binding.ctrl) parts.push("CommandOrControl");
	if (binding.shift) parts.push("Shift");
	if (binding.alt) parts.push("Alt");
	parts.push(binding.key.toUpperCase());
	return parts.join("+");
}

let currentAccelerator: string | null = null;

export function registerOpenAppShortcut(binding: ShortcutBinding, onTrigger: () => void): boolean {
	if (currentAccelerator) {
		globalShortcut.unregister(currentAccelerator);
	}

	const accelerator = bindingToAccelerator(binding);
	const success = globalShortcut.register(accelerator, onTrigger);

	if (success) {
		currentAccelerator = accelerator;
		console.log(`Global shortcut registered: ${accelerator}`);
	} else {
		console.warn(`Failed to register global shortcut: ${accelerator}`);
	}

	return success;
}

export async function loadAndRegisterGlobalShortcut(onTrigger: () => void): Promise<void> {
	try {
		const data = await fs.readFile(SHORTCUTS_FILE, "utf-8");
		const shortcuts = JSON.parse(data);
		const binding = shortcuts.openApp || DEFAULT_OPEN_APP_BINDING;
		registerOpenAppShortcut(binding, onTrigger);
	} catch {
		// File doesn't exist or parse error, use default
		registerOpenAppShortcut(DEFAULT_OPEN_APP_BINDING, onTrigger);
	}
}

export function unregisterAllGlobalShortcuts(): void {
	globalShortcut.unregisterAll();
}
