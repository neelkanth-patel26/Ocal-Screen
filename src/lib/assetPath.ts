export class UnsafeAssetPathError extends Error {
	constructor(segment: string) {
		super(`Unsafe asset path segment: ${segment}`);
		this.name = "UnsafeAssetPathError";
	}
}

function encodeRelativeAssetPath(relativePath: string): string {
	return relativePath
		.replace(/^\/+/, "")
		.split("/")
		.filter(Boolean)
		.map((part) => {
			const decoded = decodeURIComponent(part);
			if (decoded === "." || decoded === "..") {
				throw new UnsafeAssetPathError(decoded);
			}
			return encodeURIComponent(decoded);
		})
		.join("/");
}

function ensureTrailingSlash(value: string): string {
	return value.endsWith("/") ? value : `${value}/`;
}

export async function getAssetPath(relativePath: string): Promise<string> {
	const encodedRelativePath = encodeRelativeAssetPath(relativePath);

	try {
		if (typeof window !== "undefined") {
			if (
				window.location &&
				window.location.protocol &&
				window.location.protocol.startsWith("http")
			) {
				return `/${encodedRelativePath}`;
			}

			if (window.electronAPI && typeof window.electronAPI.getAssetBasePath === "function") {
				const base = await window.electronAPI.getAssetBasePath();
				if (base) {
					return new URL(encodedRelativePath, ensureTrailingSlash(base)).toString();
				}
			}
		}
	} catch (err) {
		if (err instanceof UnsafeAssetPathError) {
			throw err;
		}
	}

	return `/${encodedRelativePath}`;
}

export default getAssetPath;
