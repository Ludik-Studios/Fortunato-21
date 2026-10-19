import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	const origin = request.headers.get('origin');
	if (origin && new URL(origin).host !== new URL(request.url).host) {
		return new Response('El origen de la solicitud no es válido.', { status: 403 });
	}
	if (!locals.user?.email) return redirect('/login/?next=%2Fdonate%2F', 303);

	const secretKey = import.meta.env.STRIPE_SECRET_KEY;
	if (!secretKey) return new Response('La administración de suscripciones no está configurada.', { status: 503 });

	try {
		const stripe = new Stripe(secretKey);
		const customers = await stripe.customers.list({ email: locals.user.email, limit: 10 });
		const customer = customers.data.find((candidate) => !candidate.deleted);
		if (!customer) return redirect('/donate/?portal=unavailable', 303);

		const session = await stripe.billingPortal.sessions.create({
			customer: customer.id,
			return_url: new URL('/donate/', request.url).toString(),
		});
		return redirect(session.url, 303);
	} catch {
		return new Response('La administración de suscripciones no está disponible temporalmente.', { status: 502 });
	}
};