import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
	accentColor?: string;
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(
	({ className, accentColor, style, ...props }, ref) => {
		const activeColor = accentColor || "var(--active-accent-color, #f97316)";

		return (
			<SwitchPrimitives.Root
				className={cn(
					"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
					"data-[state=unchecked]:bg-zinc-600/70 dark:data-[state=unchecked]:bg-zinc-700/60",
					className,
				)}
				style={{
					...style,
					...(props.checked !== false
						? {
								backgroundColor:
									(props as any)["data-state"] === "checked" || props.checked
										? activeColor
										: undefined,
							}
						: {}),
				}}
				{...props}
				ref={ref}
			>
				<SwitchPrimitives.Thumb
					className={cn(
						"pointer-events-none block h-4 w-4 rounded-full shadow-md ring-0 transition-transform bg-white",
						"data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
					)}
				/>
			</SwitchPrimitives.Root>
		);
	},
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
