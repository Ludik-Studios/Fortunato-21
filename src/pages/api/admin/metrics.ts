import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { APIRoute } from 'astro';
import { mercadoPagoRequest } from '../../../lib/mercado-pago';

type MercadoPagoSubscription = {
	id?: string;
	reason?: string;
	external_reference?: string;
};

type MercadoPagoPayment = {
	status?: string;
	currency_id?: string;
	transaction_amount?: number | string;
	external_reference?: string;
	preapproval_id?: string;
};

type MercadoPagoSearchResponse<T> = {
	results?: T[];
	paging?: { total?: number };
};

const jsonResponse = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
	status,
	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
});

async function getAllMercadoPagoResults<T>(path: string) {
	const limit = 100;
	const maximumResults = 10_000;
	const results: T[] = [];

	for (let offset = 0; offset < maximumResults; offset += limit) {
		const separator = path.includes('?') ? '&' : '?';
		const page = await mercadoPagoRequest<MercadoPagoSearchResponse<T>>(
			`${path}${separator}limit=${limit}&offset=${offset}`,
		);
		const pageResults = page.results ?? [];
		results.push(...pageResults);
		if (!pageResults.length || results.length >= (page.paging?.total ?? 0)) return results;
	}

	throw new Error('Mercado Pago search exceeded the 10,000-result reporting limit.');
}

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.isAdmin) return jsonResponse({ error: 'Acceso denegado.' }, 403);

	const now = new Date();
	const periodStart = new Date(now);
	periodStart.setUTCDate(periodStart.getUTCDate() - 28);
	const result: {
		visitors: number | null;
		pageViews: number | null;
		clicks: number | null;
		donations: number | null;
		donationCount: number | null;
		services: { auth: boolean; ga4: boolean; mercadoPago: boolean };
	} = {
		visitors: null,
		pageViews: null,
		clicks: null,
		donations: null,
		donationCount: null,
		services: { auth: true, ga4: false, mercadoPago: false },
	};

	const propertyId = import.meta.env.GA4_PROPERTY_ID;
	const serviceAccountJson = import.meta.env.GA4_SERVICE_ACCOUNT_JSON;
	if (propertyId && serviceAccountJson) {
		try {
			const credentials = JSON.parse(serviceAccountJson);
			const analytics = new BetaAnalyticsDataClient({ credentials });
			const base = {
				property: `properties/${propertyId}`,
				dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
			};
			const [overview] = await analytics.runReport({
				...base,
				metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
			});
			const [clickReport] = await analytics.runReport({
				...base,
				metrics: [{ name: 'eventCount' }],
				 dimensionFilter: {
					filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'site_click' } },
				},
			});
			result.visitors = Number(overview.rows?.[0]?.metricValues?.[0]?.value ?? 0);
			result.pageViews = Number(overview.rows?.[0]?.metricValues?.[1]?.value ?? 0);
			result.clicks = Number(clickReport.rows?.[0]?.metricValues?.[0]?.value ?? 0);
			result.services.ga4 = true;
		} catch (error) {
			console.error('GA4 admin report failed:', error);
		}
	}

	if (import.meta.env.MERCADO_PAGO_ACCESS_TOKEN) {
		try {
			const [subscriptions, payments] = await Promise.all([
				getAllMercadoPagoResults<MercadoPagoSubscription>('/preapproval/search'),
				getAllMercadoPagoResults<MercadoPagoPayment>(
					`/v1/payments/search?${new URLSearchParams({
						begin_date: periodStart.toISOString(),
						end_date: now.toISOString(),
						status: 'approved',
						sort: 'date_created',
						criteria: 'desc',
					})}`,
				),
			]);
			const donationSubscriptionIds = new Set(
				subscriptions
					.filter((subscription): subscription is MercadoPagoSubscription & { id: string } =>
						Boolean(
							subscription.id
							&& subscription.external_reference?.startsWith('ludik-donation-monthly-')
							&& subscription.reason?.startsWith('Donativo mensual a Ludik Studios de $'),
						))
					.map((subscription) => subscription.id),
			);
			let donationTotal = 0;
			let donationCount = 0;
			for (const payment of payments) {
				const isOneTimeDonation = payment.external_reference?.startsWith('ludik-donation-once-');
				const isMonthlyDonation = payment.preapproval_id && donationSubscriptionIds.has(payment.preapproval_id);
				if (payment.status !== 'approved' || payment.currency_id !== 'MXN' || (!isOneTimeDonation && !isMonthlyDonation)) continue;
				donationTotal += Number(payment.transaction_amount ?? 0);
				donationCount += 1;
			}

			result.donations = donationTotal;
			result.donationCount = donationCount;
			result.services.mercadoPago = true;
		} catch (error) {
			console.error('Mercado Pago admin report failed:', error);
		}
	}

	return jsonResponse(result);
};