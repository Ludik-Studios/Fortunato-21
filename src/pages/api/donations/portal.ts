import type { APIRoute } from 'astro';
import { mercadoPagoRequest } from '../../../lib/mercado-pago';

type MercadoPagoSubscription = {
	id: string;
	reason?: string;
	external_reference?: string;
	status?: string;
};

type SubscriptionSearchResponse = {
	results?: MercadoPagoSubscription[];
};

export const POST: APIRoute = async ({ request, locals, redirect }) => {
	const origin = request.headers.get('origin');
	if (origin) {
		try {
			if (new URL(origin).host !== new URL(request.url).host) {
				return new Response('El origen de la solicitud no es válido.', { status: 403 });
			}
		} catch {
			return new Response('El origen de la solicitud no es válido.', { status: 403 });
		}
	}
	if (!locals.user?.email) return redirect('/login/?next=%2Fdonate%2F', 303);

	if (!import.meta.env.MERCADO_PAGO_ACCESS_TOKEN) {
		return new Response('La administración de suscripciones no está configurada.', { status: 503 });
	}

	try {
		const query = new URLSearchParams({ payer_email: locals.user.email, limit: '100' });
		const subscriptions = await mercadoPagoRequest<SubscriptionSearchResponse>(`/preapproval/search?${query}`);
		const donationSubscriptions = (subscriptions.results ?? []).filter((subscription) =>
			subscription.external_reference?.startsWith('ludik-donation-monthly-')
			&& subscription.reason?.startsWith('Donativo mensual a Ludik Studios de $')
			&& (subscription.status === 'authorized' || subscription.status === 'paused'));

		if (!donationSubscriptions.length) return redirect('/donate/?portal=unavailable', 303);
		for (const subscription of donationSubscriptions) {
			await mercadoPagoRequest(`/preapproval/${encodeURIComponent(subscription.id)}`, {
				method: 'PUT',
				body: { status: 'cancelled' },
			});
		}
		return redirect('/donate/?portal=cancelled', 303);
	} catch (error) {
		console.error('Mercado Pago subscription cancellation failed:', error);
		return new Response('La administración de suscripciones no está disponible temporalmente.', { status: 502 });
	}
};