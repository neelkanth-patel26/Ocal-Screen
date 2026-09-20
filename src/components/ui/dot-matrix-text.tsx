import { cn } from "@/lib/utils";

// 5x7 dot-matrix font definition (1 = dot on, 0 = dot off)
const MATRIX_FONT: Record<string, number[][]> = {
	"0": [
		[0, 1, 1, 1, 0],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 1, 1],
		[1, 0, 1, 0, 1],
		[1, 1, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
	],
	"1": [
		[0, 0, 1, 0, 0],
		[0, 1, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 1, 1, 1, 0],
	],
	"2": [
		[0, 1, 1, 1, 0],
		[1, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 1, 0],
		[0, 0, 1, 0, 0],
		[0, 1, 0, 0, 0],
		[1, 1, 1, 1, 1],
	],
	"3": [
		[1, 1, 1, 1, 0],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
		[1, 1, 1, 1, 0],
	],
	"4": [
		[0, 0, 0, 1, 0],
		[0, 0, 1, 1, 0],
		[0, 1, 0, 1, 0],
		[1, 0, 0, 1, 0],
		[1, 1, 1, 1, 1],
		[0, 0, 0, 1, 0],
		[0, 0, 0, 1, 0],
	],
	"5": [
		[1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0],
		[1, 1, 1, 1, 0],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
	],
	"6": [
		[0, 1, 1, 1, 0],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 0, 0],
		[1, 1, 1, 1, 0],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
	],
	"7": [
		[1, 1, 1, 1, 1],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 1, 0],
		[0, 0, 1, 0, 0],
		[0, 1, 0, 0, 0],
		[0, 1, 0, 0, 0],
		[0, 1, 0, 0, 0],
	],
	"8": [
		[0, 1, 1, 1, 0],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
	],
	"9": [
		[0, 1, 1, 1, 0],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 1, 1, 1],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
	],
	":": [
		[0, 0],
		[1, 1],
		[1, 1],
		[0, 0],
		[1, 1],
		[1, 1],
		[0, 0],
	],
	".": [
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[1, 1],
		[1, 1],
	],
	"/": [
		[0, 0, 0, 1],
		[0, 0, 0, 1],
		[0, 0, 1, 0],
		[0, 1, 0, 0],
		[0, 1, 0, 0],
		[1, 0, 0, 0],
		[1, 0, 0, 0],
	],
	"-": [
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[1, 1, 1, 1, 1],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
	],
	K: [
		[1, 0, 0, 0, 1],
		[1, 0, 0, 1, 0],
		[1, 0, 1, 0, 0],
		[1, 1, 0, 0, 0],
		[1, 0, 1, 0, 0],
		[1, 0, 0, 1, 0],
		[1, 0, 0, 0, 1],
	],
	F: [
		[1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 0, 0],
		[1, 1, 1, 1, 0],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 0, 0],
	],
	P: [
		[1, 1, 1, 1, 0],
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[1, 1, 1, 1, 0],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 0, 0],
	],
	S: [
		[0, 1, 1, 1, 1],
		[1, 0, 0, 0, 0],
		[1, 1, 1, 1, 0],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[0, 1, 1, 1, 0],
	],
	" ": [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	],
};

interface DotMatrixCharProps {
	char: string;
	dotSize: number;
	gap: number;
	color?: string;
	inactiveColor?: string;
	showInactive?: boolean;
}

export function DotMatrixChar({
	char,
	dotSize,
	gap,
	color = "currentColor",
	inactiveColor = "transparent",
	showInactive = false,
}: DotMatrixCharProps) {
	const upper = char.toUpperCase();
	const pattern = MATRIX_FONT[upper] || MATRIX_FONT[" "];
	const rows = pattern.length;
	const cols = pattern[0]?.length || 3;

	const width = cols * dotSize + (cols - 1) * gap;
	const height = rows * dotSize + (rows - 1) * gap;

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="inline-block shrink-0 align-middle"
			aria-hidden="true"
		>
			{pattern.map((row, rIdx) =>
				row.map((active, cIdx) => {
					if (!active && !showInactive) return null;
					const cx = cIdx * (dotSize + gap) + dotSize / 2;
					const cy = rIdx * (dotSize + gap) + dotSize / 2;
					return (
						<circle
							key={`${rIdx}-${cIdx}`}
							cx={cx}
							cy={cy}
							r={dotSize / 2}
							fill={active ? color : inactiveColor}
							opacity={active ? 1 : 0.15}
						/>
					);
				}),
			)}
		</svg>
	);
}

export interface DotMatrixTextProps {
	text: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
	color?: string;
	charGap?: number;
	className?: string;
	showInactive?: boolean;
	inactiveColor?: string;
}

export function DotMatrixText({
	text,
	size = "md",
	color,
	charGap,
	className,
	showInactive = false,
	inactiveColor,
}: DotMatrixTextProps) {
	const sizeConfig = {
		xs: { dotSize: 1.5, gap: 0.8, defaultCharGap: 2 },
		sm: { dotSize: 2, gap: 1, defaultCharGap: 2.5 },
		md: { dotSize: 2.8, gap: 1.4, defaultCharGap: 3.5 },
		lg: { dotSize: 3.8, gap: 2, defaultCharGap: 5 },
		xl: { dotSize: 5, gap: 2.5, defaultCharGap: 6.5 },
		hero: { dotSize: 6.5, gap: 3.2, defaultCharGap: 8.5 },
	}[size];

	const resolvedCharGap = charGap ?? sizeConfig.defaultCharGap;

	return (
		<span
			className={cn("inline-flex items-center select-none font-mono", className)}
			style={{ gap: `${resolvedCharGap}px` }}
			role="text"
			aria-label={text}
		>
			{text.split("").map((c, i) => (
				<DotMatrixChar
					key={i}
					char={c}
					dotSize={sizeConfig.dotSize}
					gap={sizeConfig.gap}
					color={color}
					inactiveColor={inactiveColor}
					showInactive={showInactive}
				/>
			))}
		</span>
	);
}

export default DotMatrixText;
