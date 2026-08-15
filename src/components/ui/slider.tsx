import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
	accentColor?: string;
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
	({ className, accentColor, style, ...props }, ref) => {
		const activeColor = accentColor || "var(--active-accent-color, #f97316)";

		return (
			<SliderPrimitive.Root
				ref={ref}
				className={cn(
					"relative flex w-full touch-none select-none items-center group py-1",
					className,
				)}
				style={style}
				{...props}
			>
				<SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-black/20 dark:bg-white/10 transition-all group-hover:h-2">
					<SliderPrimitive.Range
						className="absolute h-full transition-all"
						style={{ backgroundColor: activeColor }}
					/>
				</SliderPrimitive.Track>
				<SliderPrimitive.Thumb
					className="block h-4 w-4 rounded-full bg-white shadow-md transition-all duration-150 group-hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing"
					style={{
						border: `2.5px solid ${activeColor}`,
						boxShadow: `0 2px 8px ${activeColor}40`,
					}}
				/>
			</SliderPrimitive.Root>
		);
	},
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
