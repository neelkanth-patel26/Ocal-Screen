interface OcalLoaderProps {
	size?: "sm" | "md" | "lg";
	text?: string;
	className?: string;
}

export function OcalLoader({ size = "md", text, className = "" }: OcalLoaderProps) {
	const dimension = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
	const strokeWidth = size === "sm" ? 3 : 3.5;

	return (
		<div className={`flex flex-col items-center justify-center gap-2.5 ${className}`}>
			<div className={`relative ${dimension} flex items-center justify-center`}>
				{/* Outer subtle glowing ring */}
				<div className="absolute inset-0 rounded-full border border-[#e8ff47]/30 animate-ping opacity-25" />

				{/* Rotating neon loader ring */}
				<svg
					className="animate-spin text-[#e8ff47] w-full h-full"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						className="opacity-20 text-white"
						cx="12"
						cy="12"
						r="9.5"
						stroke="currentColor"
						strokeWidth={strokeWidth}
					/>
					<path
						className="opacity-95"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>

				{/* Center core glowing dot */}
				<div className="absolute h-1.5 w-1.5 rounded-full bg-[#e8ff47] shadow-[0_0_8px_#e8ff47]" />
			</div>
			{text && (
				<p className="text-xs font-semibold tracking-wide text-[#e8e8e8] animate-pulse">
					{text}
				</p>
			)}
		</div>
	);
}
