export type FontCategory = "sans" | "serif" | "display" | "monospace" | "handwriting" | "custom";

export interface FontDefinition {
	value: string;
	name: string;
	category: FontCategory;
	previewText?: string;
	labelKey?: string;
	isSystem?: boolean;
}

export interface CuratedFont {
	id: string;
	name: string;
	fontFamily: string;
	category: FontCategory;
	description: string;
	importUrl: string;
	previewText: string;
	tags: string[];
}

export const FONT_CATEGORIES: Array<{
	id: FontCategory | "all";
	label: string;
}> = [
	{ id: "all", label: "All Fonts" },
	{ id: "sans", label: "Sans Serif" },
	{ id: "serif", label: "Serif" },
	{ id: "display", label: "Display & Bold" },
	{ id: "monospace", label: "Monospace" },
	{ id: "handwriting", label: "Handwriting" },
	{ id: "custom", label: "My Fonts" },
];

export const BUILTIN_FONTS: FontDefinition[] = [
	// Sans-Serif
	{ value: "Inter", name: "Inter", category: "sans", previewText: "Modern & crisp UI" },
	{
		value: '"Plus Jakarta Sans", sans-serif',
		name: "Plus Jakarta Sans",
		category: "sans",
		previewText: "Geometric & friendly",
	},
	{
		value: '"Space Grotesk", sans-serif',
		name: "Space Grotesk",
		category: "sans",
		previewText: "Tech & futuristic headline",
	},
	{
		value: '"DM Sans", sans-serif',
		name: "DM Sans",
		category: "sans",
		previewText: "Clean geometric sans",
	},
	{
		value: "Sora, sans-serif",
		name: "Sora",
		category: "sans",
		previewText: "Modern digital headline",
	},
	{
		value: "Manrope, sans-serif",
		name: "Manrope",
		category: "sans",
		previewText: "Semi-geometric modern",
	},
	{
		value: '"IBM Plex Sans", sans-serif',
		name: "IBM Plex Sans",
		category: "sans",
		previewText: "Engineered neo-grotesque",
	},
	{
		value: "system-ui, -apple-system, sans-serif",
		name: "System UI (Classic)",
		category: "sans",
		labelKey: "classic",
		isSystem: true,
	},
	{
		value: "Arial, sans-serif",
		name: "Arial",
		category: "sans",
		labelKey: "simple",
		isSystem: true,
	},
	{
		value: "Verdana, sans-serif",
		name: "Verdana",
		category: "sans",
		labelKey: "modern",
		isSystem: true,
	},
	{
		value: "Trebuchet MS, sans-serif",
		name: "Trebuchet MS",
		category: "sans",
		labelKey: "clean",
		isSystem: true,
	},

	// Serif
	{
		value: '"Playfair Display", Georgia, serif',
		name: "Playfair Display",
		category: "serif",
		previewText: "Editorial luxury title",
	},
	{
		value: "Merriweather, Georgia, serif",
		name: "Merriweather",
		category: "serif",
		previewText: "Highly readable editorial",
	},
	{
		value: "Lora, Georgia, serif",
		name: "Lora",
		category: "serif",
		previewText: "Contemporary luxury serif",
	},
	{
		value: "Georgia, serif",
		name: "Georgia",
		category: "serif",
		labelKey: "editor",
		isSystem: true,
		previewText: "Classic elegant serif",
	},

	// Display & Bold Headlines
	{
		value: '"Bebas Neue", sans-serif',
		name: "Bebas Neue",
		category: "display",
		previewText: "BOLD CINEMATIC ALL-CAPS",
	},
	{
		value: "Oswald, sans-serif",
		name: "Oswald",
		category: "display",
		previewText: "Punchy condensed headline",
	},
	{
		value: "Impact, Arial Black, sans-serif",
		name: "Impact",
		category: "display",
		labelKey: "strong",
		isSystem: true,
		previewText: "HEAVY IMPACT CALLOUT",
	},
	{
		value: '"Permanent Marker", cursive',
		name: "Permanent Marker",
		category: "display",
		previewText: "Vibrant hand-drawn marker",
	},

	// Monospace
	{
		value: '"Fira Code", monospace',
		name: "Fira Code",
		category: "monospace",
		previewText: "const video = create(4K);",
	},
	{
		value: '"IBM Plex Mono", monospace',
		name: "IBM Plex Mono",
		category: "monospace",
		previewText: "01:23:45 TERMINAL READY",
	},
	{
		value: "Courier New, monospace",
		name: "Courier New",
		category: "monospace",
		labelKey: "typewriter",
		isSystem: true,
		previewText: "Typewriter vintage text",
	},

	// Handwriting / Script
	{
		value: "Caveat, cursive",
		name: "Caveat",
		category: "handwriting",
		previewText: "Friendly quick handwritten notes",
	},
	{
		value: "Brush Script MT, cursive",
		name: "Brush Script MT",
		category: "handwriting",
		labelKey: "deco",
		isSystem: true,
		previewText: "Classic brush calligraphy",
	},
];

export const CURATED_GOOGLE_FONTS: CuratedFont[] = [
	{
		id: "montserrat",
		name: "Montserrat",
		fontFamily: "Montserrat",
		category: "sans",
		description: "Modern geometric sans, popular for clean video titles",
		importUrl:
			"https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;0,900;1,400&display=swap",
		previewText: "Clean & Powerful Video Title",
		tags: ["modern", "geometric", "bold", "clean"],
	},
	{
		id: "poppins",
		name: "Poppins",
		fontFamily: "Poppins",
		category: "sans",
		description: "Smooth, friendly rounded sans serif, high legibility",
		importUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap",
		previewText: "Modern Friendly Creator Font",
		tags: ["friendly", "modern", "subtitles", "lowerthird"],
	},
	{
		id: "anton",
		name: "Anton",
		fontFamily: "Anton",
		category: "display",
		description: "Ultra-heavy condensed headline font for YouTube thumbnails",
		importUrl: "https://fonts.googleapis.com/css2?family=Anton&display=swap",
		previewText: "MAXIMUM IMPACT HEADLINE",
		tags: ["bold", "youtube", "thumbnail", "heavy"],
	},
	{
		id: "bangers",
		name: "Bangers",
		fontFamily: "Bangers",
		category: "display",
		description: "Comic book / superhero style font for gaming & memes",
		importUrl: "https://fonts.googleapis.com/css2?family=Bangers&display=swap",
		previewText: "GAMING & COMIC ACTION!",
		tags: ["comic", "gaming", "cartoon", "fun"],
	},
	{
		id: "cinzel",
		name: "Cinzel",
		fontFamily: "Cinzel",
		category: "serif",
		description: "Epic cinematic roman serif for luxury chapters & trailers",
		importUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap",
		previewText: "EPIC CINEMATIC CHAPTER",
		tags: ["cinematic", "luxury", "trailer", "movie"],
	},
	{
		id: "righteous",
		name: "Righteous",
		fontFamily: "Righteous",
		category: "display",
		description: "Retro 80s arcade & synthwave display typography",
		importUrl: "https://fonts.googleapis.com/css2?family=Righteous&display=swap",
		previewText: "RETRO SYNTHWAVE 1984",
		tags: ["retro", "arcade", "synthwave", "futuristic"],
	},
	{
		id: "orbitron",
		name: "Orbitron",
		fontFamily: "Orbitron",
		category: "display",
		description: "Sci-Fi tech font, perfect for cybersecurity & gaming HUDs",
		importUrl: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap",
		previewText: "CYBER PROTOCOL ACTIVE",
		tags: ["scifi", "tech", "gaming", "hud"],
	},
	{
		id: "press-start-2p",
		name: "Press Start 2P",
		fontFamily: '"Press Start 2P"',
		category: "display",
		description: "Authentic 8-bit retro arcade pixel typography",
		importUrl: "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap",
		previewText: "LEVEL 1 • START GAME",
		tags: ["pixel", "8bit", "arcade", "gaming"],
	},
	{
		id: "pacifico",
		name: "Pacifico",
		fontFamily: "Pacifico",
		category: "handwriting",
		description: "Fun, vibrant 1950s American surf culture script",
		importUrl: "https://fonts.googleapis.com/css2?family=Pacifico&display=swap",
		previewText: "Sunny vibes & adventures",
		tags: ["casual", "fun", "summer", "vlog"],
	},
	{
		id: "satisfy",
		name: "Satisfy",
		fontFamily: "Satisfy",
		category: "handwriting",
		description: "Smooth brush script with timeless elegance",
		importUrl: "https://fonts.googleapis.com/css2?family=Satisfy&display=swap",
		previewText: "Signature touch & stories",
		tags: ["signature", "elegant", "cursive"],
	},
	{
		id: "lobster",
		name: "Lobster",
		fontFamily: "Lobster",
		category: "handwriting",
		description: "Bold bold retro script with great contrast",
		importUrl: "https://fonts.googleapis.com/css2?family=Lobster&display=swap",
		previewText: "Classic Retro Headline",
		tags: ["vintage", "bold", "poster"],
	},
	{
		id: "great-vibes",
		name: "Great Vibes",
		fontFamily: '"Great Vibes"',
		category: "handwriting",
		description: "Flowing luxury calligraphy for elegant titles",
		importUrl: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
		previewText: "Romantic & Special Moments",
		tags: ["calligraphy", "wedding", "luxury"],
	},
	{
		id: "creepster",
		name: "Creepster",
		fontFamily: "Creepster",
		category: "display",
		description: "Spooky horror / thriller dripping style display font",
		importUrl: "https://fonts.googleapis.com/css2?family=Creepster&display=swap",
		previewText: "MIDNIGHT HORROR NIGHT",
		tags: ["horror", "spooky", "halloween"],
	},
	{
		id: "unbounded",
		name: "Unbounded",
		fontFamily: "Unbounded",
		category: "display",
		description: "Ultra-wide modern tech display for cutting-edge videos",
		importUrl: "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&display=swap",
		previewText: "WIDE TECH REEL",
		tags: ["wide", "modern", "bold", "tech"],
	},
	{
		id: "exo-2",
		name: "Exo 2",
		fontFamily: '"Exo 2"',
		category: "sans",
		description: "Futuristic techno sans with organic curves",
		importUrl:
			"https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,700;1,400&display=swap",
		previewText: "NEXT-GEN CREATOR OS",
		tags: ["tech", "cyber", "modern"],
	},
	{
		id: "outfit",
		name: "Outfit",
		fontFamily: "Outfit",
		category: "sans",
		description: "Geometric luxury brand font inspired by premium fashion",
		importUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap",
		previewText: "Premium Minimalist Design",
		tags: ["clean", "luxury", "minimal"],
	},
	{
		id: "syne",
		name: "Syne",
		fontFamily: "Syne",
		category: "display",
		description: "Avant-garde artistic typography with unique character",
		importUrl: "https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&display=swap",
		previewText: "CREATIVE PERSPECTIVE",
		tags: ["creative", "artistic", "bold"],
	},
	{
		id: "rubik",
		name: "Rubik",
		fontFamily: "Rubik",
		category: "sans",
		description: "Gentle rounded corners with strong readability",
		importUrl:
			"https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,700;1,400&display=swap",
		previewText: "Smooth Readable Captions",
		tags: ["rounded", "captions", "friendly"],
	},
	{
		id: "raleway",
		name: "Raleway",
		fontFamily: "Raleway",
		category: "sans",
		description: "Elegant neo-grotesque sans with refined geometric weights",
		importUrl:
			"https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,400;0,700;1,400&display=swap",
		previewText: "High Fashion Documentary",
		tags: ["elegant", "documentary", "clean"],
	},
	{
		id: "cabin-sketch",
		name: "Cabin Sketch",
		fontFamily: '"Cabin Sketch"',
		category: "display",
		description: "Hand-drawn doodle hatch texture font",
		importUrl: "https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&display=swap",
		previewText: "SKETCHED DOODLE NOTES",
		tags: ["handdrawn", "sketch", "creative"],
	},
];

export function cleanFontFamily(fontFamily: string): string {
	return fontFamily.replace(/['"]/g, "").split(",")[0].trim();
}

export function normalizeFontKey(fontFamily: string): string {
	return cleanFontFamily(fontFamily).toLowerCase();
}
