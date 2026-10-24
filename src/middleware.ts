import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient, hasSupabaseConfig } from './lib/supabase/server';

export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.authConfigured = hasSupabaseConfig();
	context.locals.isAdmin = false;
	context.locals.user = null;

	if (!context.locals.authConfigured) {
		if (import.meta.env.PROD && context.url.pathname.startsWith('/admin')) {
			return new Response('El acceso de administración no está configurado.', { status: 404 });
		}
		return next();
	}

	const responseHeaders = new Headers();
	const supabase = createSupabaseServerClient({
		request: context.request,
		cookies: context.cookies,
		responseHeaders,
	});
	const { data, error } = await supabase.auth.getClaims();
	const claims = error ? null : data?.claims;
	const id = typeof claims?.sub === 'string' ? claims.sub : null;
	const email = typeof claims?.email === 'string' ? claims.email : null;
	const adminEmail = import.meta.env.ADMIN_EMAIL?.trim().toLowerCase();

	if (id) {
		context.locals.user = { id, email };
		context.locals.isAdmin = Boolean(adminEmail && email?.toLowerCase() === adminEmail);
	}

	const isAdminRoute = context.url.pathname === '/admin' || context.url.pathname.startsWith('/admin/');
	if (isAdminRoute && !context.locals.user) {
		const response = context.redirect('/login/?next=%2Fadmin%2F');
		responseHeaders.forEach((value, name) => response.headers.set(name, value));
		return response;
	}
	if (isAdminRoute && !context.locals.isAdmin) {
		const response = new Response('Acceso denegado.', { status: 403 });
		responseHeaders.forEach((value, name) => response.headers.set(name, value));
		return response;
	}

	const response = await next();
	if (context.request.headers.has('cookie')) {
		response.headers.set('Cache-Control', 'private, no-store');
	}
	responseHeaders.forEach((value, name) => response.headers.set(name, value));
	return response;
});