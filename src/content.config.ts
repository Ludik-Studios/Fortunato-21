import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const projectSchema = z.object({
	title: z.string(),
	tagline: z.string(),
	category: z.string(),
	categorySlug: z.enum(['videojuegos', 'web', 'marketing', 'branding', 'audiovisual','multimedia', 'otros']),
	status: z.enum(['DISPONIBLE', 'ACTIVO', 'EN DESARROLLO', 'FINALIZADO', 'PROXIMAMENTE', 'HIATUS']),
	year: z.string(),
	featured: z.boolean().default(false),
	description: z.string(),
	playUrl: z.string().nullable().optional(),
	detailUrl: z.string().nullable().optional(),
	externalUrl: z.string().nullable().optional(),
	media: z.object({
		coverImage: z.string().optional(),
		videoUrl: z.string().optional(),
		gallery: z.array(z.string()).default([])
	}).default({}),
	team: z.array(z.object({
		role: z.string(),
		name: z.string(),
		contact: z.string().optional(),
		avatar: z.string().optional()
	})).default([])
});

const projects = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/data/projects' }),
	schema: projectSchema
});

export const collections = { projects };
