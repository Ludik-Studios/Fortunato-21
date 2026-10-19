import type { APIRoute } from 'astro';
import { createSupabaseServerClient, hasSupabaseConfig } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const origin = request.headers.get('origin');
	if (origin && new URL(origin).host !== new URL(request.url).host) {
		return new Response('Invalid request origin.', { status: 403 });
	}
	if (!hasSupabaseConfig()) return redirect('/', 303);

	const responseHeaders = new Headers();
	const supabase = createSupabaseServerClient({ request, cookies, responseHeaders });
	await supabase.auth.signOut();
	const response = redirect('/', 303);
	responseHeaders.forEach((value, name) => response.headers.set(name, value));
	return response;
};