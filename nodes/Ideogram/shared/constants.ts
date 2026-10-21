import type { INodePropertyOptions } from 'n8n-workflow';

/** Option lists shared by several operations. Values are the exact strings the API expects. */

export const STYLE_PRESETS = [
	'80s_illustration',
	'90s_nostalgia',
	'abstract_organic',
	'analog_nostalgia',
	'art_brut',
	'art_deco',
	'art_poster',
	'aura',
	'avant_garde',
	'bauhaus',
	'blueprint',
	'blurry_motion',
	'bright_art',
	'c4d_cartoon',
	'childrens_book',
	'collage',
	'coloring_book_i',
	'coloring_book_ii',
	'cubism',
	'dark_aura',
	'doodle',
	'double_exposure',
	'dramatic_cinema',
	'editorial',
	'emotional_minimal',
	'ethereal_party',
	'expired_film',
	'flat_art',
	'flat_vector',
	'forest_reverie',
	'geo_minimalist',
	'glass_prism',
	'golden_hour',
	'graffiti_i',
	'graffiti_ii',
	'halftone_print',
	'high_contrast',
	'hippie_era',
	'iconic',
	'japandi_fusion',
	'jazzy',
	'long_exposure',
	'magazine_editorial',
	'minimal_illustration',
	'mixed_media',
	'monochrome',
	'nightlife',
	'oil_painting',
	'old_cartoons',
	'paint_gesture',
	'pop_art',
	'retro_etching',
	'riviera_pop',
	'spotlight_80s',
	'stylized_red',
	'surreal_collage',
	'travel_poster',
	'vintage_geo',
	'vintage_poster',
	'watercolor',
	'weird',
	'woodblock_print',
];

function titleCase(value: string): string {
	return value
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export const stylePresetOptions: INodePropertyOptions[] = STYLE_PRESETS.map((value) => ({
	name: titleCase(value),
	value,
}));

export const COLOR_PALETTE_PRESETS = [
	'ember',
	'fresh',
	'jungle',
	'magic',
	'melon',
	'mosaic',
	'pastel',
	'ultramarine',
];

export const renderingSpeedOptions: INodePropertyOptions[] = [
	{ name: 'Turbo (Fastest, Cheapest)', value: 'turbo' },
	{ name: 'Default', value: 'default' },
	{ name: 'Quality (Slowest, Best)', value: 'quality' },
];

export const magicPromptOptions: INodePropertyOptions[] = [
	{ name: 'Auto', value: 'auto' },
	{ name: 'On', value: 'on' },
	{ name: 'Off', value: 'off' },
];

export const styleTypeOptions: INodePropertyOptions[] = [
	{ name: 'Auto', value: 'auto' },
	{ name: 'General', value: 'general' },
	{ name: 'Realistic', value: 'realistic' },
	{ name: 'Design', value: 'design' },
	{ name: 'Fiction', value: 'fiction' },
	{ name: 'Stylized', value: 'stylized' },
	{ name: 'Render 3D (Ideogram 2a)', value: 'render_3d' },
	{ name: 'Anime (Ideogram 2a)', value: 'anime' },
];

/** Aspect ratios in Ideogram notation (WxH), accepted by Ideogram models. */
export const IDEOGRAM_ASPECT_RATIOS = [
	'auto',
	'1x1',
	'16x9',
	'9x16',
	'4x3',
	'3x4',
	'3x2',
	'2x3',
	'16x10',
	'10x16',
	'5x4',
	'4x5',
	'2x1',
	'1x2',
	'3x1',
	'1x3',
];

export const qualityOptions: INodePropertyOptions[] = [
	{ name: 'Auto (GPT Image Only)', value: 'auto' },
	{ name: 'Very Low', value: 'very_low' },
	{ name: 'Low', value: 'low' },
	{ name: 'Medium', value: 'medium' },
	{ name: 'High', value: 'high' },
	{ name: 'Very High (P-Image Only)', value: 'very_high' },
];

export const toolQualityOptions: INodePropertyOptions[] = [
	{ name: 'Low', value: 'low' },
	{ name: 'Medium', value: 'medium' },
	{ name: 'High', value: 'high' },
];

export const AD_RESOLUTIONS = [
	'300x250',
	'336x280',
	'300x600',
	'1080x1080',
	'1080x1350',
	'1080x1920',
	'1920x1080',
	'728x90',
	'160x600',
	'970x250',
	'320x50',
	'300x50',
	'320x100',
	'1800x900',
	'2400x2400',
	'1200x3500',
	'2880x2880',
	'2560x3200',
	'3200x2560',
	'2448x3264',
	'3264x2448',
	'2336x3504',
	'3504x2336',
	'2240x3584',
	'3584x2240',
	'2160x3840',
	'3840x2160',
	'1920x3840',
	'3840x1920',
	'1280x3840',
	'3840x1280',
];

export const AD_LANGUAGES: INodePropertyOptions[] = [
	{ name: 'Arabic', value: 'ar' },
	{ name: 'Czech', value: 'cs' },
	{ name: 'Danish', value: 'da' },
	{ name: 'Dutch', value: 'nl' },
	{ name: 'English', value: 'en' },
	{ name: 'Finnish', value: 'fi' },
	{ name: 'French', value: 'fr' },
	{ name: 'French (Canada)', value: 'fr-ca' },
	{ name: 'German', value: 'de' },
	{ name: 'Hungarian', value: 'hu' },
	{ name: 'Italian', value: 'it' },
	{ name: 'Japanese', value: 'ja' },
	{ name: 'Norwegian', value: 'no' },
	{ name: 'Polish', value: 'pl' },
	{ name: 'Portuguese', value: 'pt' },
	{ name: 'Spanish', value: 'es' },
	{ name: 'Swedish', value: 'sv' },
];

/** Image models of Image > Generate. The value is the model segment of the endpoint URL. */
export const GENERATE_MODELS: INodePropertyOptions[] = [
	{
		name: 'Ideogram 4.5',
		value: 'ideogram-4-5',
		description: 'Newest Ideogram model: prompt fidelity, typography, optional source images to edit',
	},
	{ name: 'Ideogram 4.0', value: 'ideogram-4', description: 'Text to image at 1K or 2K' },
	{
		name: 'Ideogram 4.0 Transparent',
		value: 'ideogram-4-transparent',
		description: 'PNG images with a transparent background (1K to 8K)',
	},
	{ name: 'Ideogram 3.0', value: 'ideogram-3', description: 'Style presets, palettes and style references' },
	{
		name: 'Ideogram 3.0 Transparent',
		value: 'ideogram-3-transparent',
		description: 'Transparent PNG output from Ideogram 3.0',
	},
	{ name: 'Ideogram 2a', value: 'ideogram-2a', description: 'Fast, low-cost legacy model' },
	{ name: 'Auto (Ideogram Picks)', value: 'auto', description: 'Ideogram chooses the model for the request' },
	{ name: 'GPT Image 2.5 Flare', value: 'gpt-image-2-5-flare' },
	{ name: 'GPT Image 2.5 Sunburst', value: 'gpt-image-2-5-sunburst' },
	{ name: 'GPT Image 2', value: 'gpt-image-2' },
	{ name: 'Nano Banana Pro', value: 'nano-banana-pro' },
	{ name: 'Nano Banana 2.1', value: 'nano-banana-2-1' },
	{ name: 'Nano Banana 2', value: 'nano-banana-2' },
	{ name: 'P-Image Ideogram', value: 'p-image-ideogram', description: 'Very low cost tiers' },
	{ name: 'Z-Image', value: 'z-image' },
];

/** Models that take optional source images (`images`) in Image > Generate. */
export const GENERATE_MODELS_WITH_SOURCE_IMAGES = [
	'auto',
	'ideogram-4-5',
	'gpt-image-2-5-flare',
	'gpt-image-2-5-sunburst',
	'gpt-image-2',
	'nano-banana-pro',
	'nano-banana-2-1',
	'nano-banana-2',
];

export const VIDEO_MODELS: INodePropertyOptions[] = [
	{ name: 'Seedance 2.5', value: 'seedance-2-5', description: '480p to 1080p, optional audio' },
	{ name: 'Seedance 2.0', value: 'seedance-2', description: '480p or 720p, optional audio' },
	{ name: 'MiniMax H3', value: 'minimax-h3', description: '480P to 4K' },
	{ name: 'Kling V3 Standard', value: 'kling-3-standard', description: 'Negative prompt, shot type, CFG scale' },
];

export const UPSCALE_MODELS: INodePropertyOptions[] = [
	{ name: 'Auto (Ideogram Picks)', value: 'auto' },
	{ name: 'Nano Banana Pro', value: 'nano-banana-pro', description: 'Prompt-guided enhancement to 1K, 2K or 4K' },
	{ name: 'Topaz Standard V2', value: 'topaz-standard-2' },
	{ name: 'Topaz Bloom 2', value: 'topaz-bloom-2' },
	{ name: 'Topaz Redefine', value: 'topaz-redefine' },
	{ name: 'Topaz Text Refine', value: 'topaz-text-refine', description: 'Keeps text legible' },
	{ name: 'Topaz Wonder 3.5', value: 'topaz-wonder-3-5' },
];
