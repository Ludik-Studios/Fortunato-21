import type { APIRoute } from 'astro';
import { getMercadoPagoAccessToken, mercadoPagoRequest } from '../../../lib/mercado-pago';

const donationAmounts = new Set([50, 100, 200, 500, 1000]);
const donationReferencePrefix = 'ludik-donation';

type CheckoutResponse = {
	init_point?: string;
	sandbox_init_point?: string;
};

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const accessToken = getMercadoPagoAccessToken();
	if (!accessToken) return new Response('El pago de donativos no está configurado.', { status: 503 });

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

	const formData = await request.formData();
	const amount = Number(formData.get('amount'));
	const donationType = formData.get('donationType');
	if (!donationAmounts.has(amount) || (donationType !== 'once' && donationType !== 'monthly')) {
		return new Response('Elige un monto y una frecuencia de donativo válidos.', { status: 400 });
	}
	if (donationType === 'monthly' && !locals.user?.email) {
		return redirect('/login/?next=%2Fdonate%2F', 303);
	}

	try {
		const originUrl = new URL(request.url).origin;
		const reference = `${donationReferencePrefix}-${donationType}-${crypto.randomUUID()}`;
		let checkout: CheckoutResponse;

		if (donationType === 'monthly') {
			checkout = await mercadoPagoRequest<CheckoutResponse>('/preapproval', {
				method: 'POST',
				body: {
					reason: `Donativo mensual a Ludik Studios de $${amount} MXN`,
					external_reference: reference,
					payer_email: locals.user?.email,
					auto_recurring: {
						frequency: 1,
						frequency_type: 'months',
						transaction_amount: amount,
						currency_id: 'MXN',
					},
					back_url: `${originUrl}/donate/success/`,
					status: 'pending',
				},
			});
		} else {
			checkout = await mercadoPagoRequest<CheckoutResponse>('/checkout/preferences', {
				method: 'POST',
				body: {
					items: [{
						id: reference,
						title: 'Donativo para Ludik Studios',
						quantity: 1,
						currency_id: 'MXN',
						unit_price: amount,
					}],
					external_reference: reference,
					metadata: { donation_type: 'once', donation_amount_mxn: amount },
					...(locals.user?.email ? { payer: { email: locals.user.email } } : {}),
					back_urls: {
						success: `${originUrl}/donate/success/`,
						pending: `${originUrl}/donate/?pending=1`,
						failure: `${originUrl}/donate/?canceled=1`,
					},
					auto_return: 'approved',
				},
			});
		}

		const checkoutUrl = accessToken.startsWith('TEST-')
			? checkout.sandbox_init_point ?? checkout.init_point
			: checkout.init_point;
		if (!checkoutUrl || new URL(checkoutUrl).protocol !== 'https:') {
			return new Response('No se pudo crear la sesión de pago.', { status: 502 });
		}
		return redirect(checkoutUrl, 303);
	} catch (error) {
		console.error('Mercado Pago donation checkout failed:', error);
		return new Response('El pago no está disponible temporalmente.', { status: 502 });
	}
};