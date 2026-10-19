import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { APIContext } from 'astro';

type SupabaseContext = Pick<APIContext, 'request' | 'cookies'> & {
	responseHeaders: Headers;
};

export function hasSupabaseConfig() {
	return Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function createSupabaseServerClient(context: SupabaseContext) {
	const url = import.meta.env.PUBLIC_SUPABASE_URL;
	const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!url || !key) {
		throw new Error('Las variables de entorno de Supabase no están configuradas.');
	}

	return createServerClient(url, key, {
		cookies: {
			getAll() {
				return parseCookieHeader(context.request.headers.get('cookie') ?? '');
			},
			setAll(cookiesToSet, cacheHeaders) {
				cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
				Object.entries(cacheHeaders).forEach(([name, value]) => context.responseHeaders.set(name, value));
			},
		},
	});
}