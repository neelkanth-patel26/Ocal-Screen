/**
 * Utility to parse and format real dates and timestamps for media recordings and assets.
 * Converts raw internal names like 'recording-1789549479096.webm' into human-friendly real dates.
 */

export interface MediaDateInfo {
	cleanName: string;
	formattedDate: string;
	formattedTime: string;
	fullDateTime: string;
	rawTimestamp?: number;
}

/**
 * Extracts timestamp from a recording filename (e.g. recording-1789549479096.webm)
 * or falls back to an explicit timestamp (e.g. asset.addedAt).
 */
export function parseMediaDate(fileNameOrPath: string, fallbackTimestamp?: number): MediaDateInfo {
	const baseName = (fileNameOrPath || "").split(/[/\\]/).pop() || "";
	const match = baseName.match(/recording-(\d{10,13})/i);
	let timestamp: number | undefined;

	if (match) {
		const parsed = parseInt(match[1], 10);
		if (!Number.isNaN(parsed) && parsed > 0) {
			timestamp = parsed;
		}
	}

	if (!timestamp && fallbackTimestamp && fallbackTimestamp > 0) {
		timestamp = fallbackTimestamp;
	}

	if (timestamp) {
		const d = new Date(timestamp);
		if (!Number.isNaN(d.getTime())) {
			const formattedDate = d.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
			const formattedTime = d.toLocaleTimeString(undefined, {
				hour: "numeric",
				minute: "2-digit",
			});
			const isRecordingPattern = Boolean(match);
			const cleanName = isRecordingPattern
				? `Recording • ${formattedDate}`
				: baseName.replace(/\.[^/.]+$/, "");

			return {
				cleanName,
				formattedDate,
				formattedTime,
				fullDateTime: `${formattedDate}, ${formattedTime}`,
				rawTimestamp: timestamp,
			};
		}
	}

	return {
		cleanName: baseName.replace(/\.[^/.]+$/, "") || "Media",
		formattedDate: "",
		formattedTime: "",
		fullDateTime: "",
	};
}
