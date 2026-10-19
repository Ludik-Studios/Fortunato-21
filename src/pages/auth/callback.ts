import type { APIRoute } from 'astro';
import { createSupabaseServerClient, hasSupabaseConfig } from '../../lib/supabase/server';

export const GET: APIRoute = async (context) => {
	if (!hasSupabaseConfig()) {
		return new Response('La autenticación no está configurada.', { status: 503 });
	}

	const code = new URL(context.request.url).searchParams.get('code');
	if (!code) {
		return context.redirect('/login/?error=confirmation');
	}

	const responseHeaders = new Headers();
	const supabase = createSupabaseServerClient({
		request: context.request,
		cookies: context.cookies,
		responseHeaders,
	});
	const { error } = await supabase.auth.exchangeCodeForSession(code);
	const response = context.redirect(error ? '/login/?error=confirmation' : '/');
	responseHeaders.forEach((value, name) => response.headers.set(name, value));
	return response;
};