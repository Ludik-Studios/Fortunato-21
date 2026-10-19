import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const donationAmounts = new Set([50, 100, 200, 500, 1000]);

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const secretKey = import.meta.env.STRIPE_SECRET_KEY;
	if (!secretKey) return new Response('El pago de donativos no está configurado.', { status: 503 });

	const origin = request.headers.get('origin');
	if (origin && new URL(origin).host !== new URL(request.url).host) {
		return new Response('El origen de la solicitud no es válido.', { status: 403 });
	}

	const formData = await request.formData();
	const amount = Number(formData.get('amount'));
	const donationType = formData.get('donationType');
	if (!donationAmounts.has(amount) || (donationType !== 'once' && donationType !== 'monthly')) {
		return new Response('Elige un monto y una frecuencia de donativo válidos.', { status: 400 });
	}
	if (donationType === 'monthly' && !locals.user?.email) {
		return redirect('/login/?next=%2Fdonate%2F', 303);
	}

	const stripe = new Stripe(secretKey);
	const originUrl = new URL(request.url).origin;
	try {
		const existingCustomer = donationType === 'monthly'
			? (await stripe.customers.list({ email: locals.user?.email ?? undefined, limit: 10 })).data.find((customer) => !customer.deleted)
			: undefined;
		const session = await stripe.checkout.sessions.create({
			mode: donationType === 'monthly' ? 'subscription' : 'payment',
			line_items: [{
				quantity: 1,
				price_data: {
					currency: 'mxn',
					unit_amount: amount * 100,
					product_data: { name: 'Support Ludik Studios' },
					...(donationType === 'monthly' ? { recurring: { interval: 'month' as const } } : {}),
				},
			}],
			metadata: { donation_type: donationType, donation_amount_mxn: String(amount) },
			...(donationType === 'monthly' ? {
				...(existingCustomer ? { customer: existingCustomer.id } : { customer_email: locals.user?.email ?? undefined }),
				subscription_data: { metadata: { donation_type: donationType, donation_amount_mxn: String(amount) } },
			} : { submit_type: 'donate' as const }),
			success_url: `${originUrl}/donate/success/?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${originUrl}/donate/?canceled=1`,
		});

		if (!session.url) return new Response('No se pudo crear la sesión de pago.', { status: 502 });
		return redirect(session.url, 303);
	} catch {
		return new Response('El pago no está disponible temporalmente.', { status: 502 });
	}
};