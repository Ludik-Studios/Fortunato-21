import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const jsonResponse = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
	status,
	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
});

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.isAdmin) return jsonResponse({ error: 'Acceso denegado.' }, 403);

	const now = new Date();
	const periodStart = new Date(now);
	periodStart.setUTCDate(periodStart.getUTCDate() - 28);
	const since = Math.floor(periodStart.getTime() / 1000);
	const result: {
		visitors: number | null;
		pageViews: number | null;
		clicks: number | null;
		donations: number | null;
		donationCount: number | null;
		services: { auth: boolean; ga4: boolean; stripe: boolean };
	} = {
		visitors: null,
		pageViews: null,
		clicks: null,
		donations: null,
		donationCount: null,
		services: { auth: true, ga4: false, stripe: false },
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

	const stripeSecret = import.meta.env.STRIPE_SECRET_KEY;
	if (stripeSecret) {
		try {
			const stripe = new Stripe(stripeSecret);
			const donationSubscriptionIds = new Set<string>();
			for await (const subscription of stripe.subscriptions.list({ limit: 100, status: 'all' })) {
				if (subscription.metadata.donation_type === 'monthly') donationSubscriptionIds.add(subscription.id);
			}

			let donationTotalCents = 0;
			let donationCount = 0;
			for await (const session of stripe.checkout.sessions.list({
				limit: 100,
				status: 'complete',
				created: { gte: since },
			})) {
				if (session.mode !== 'payment' || session.metadata.donation_type !== 'once' || session.payment_status !== 'paid' || session.currency !== 'mxn') continue;
				donationTotalCents += session.amount_total ?? 0;
				donationCount += 1;
			}

			for await (const invoice of stripe.invoices.list({ limit: 100, status: 'paid', created: { gte: since } })) {
				const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
				if (!subscriptionId || !donationSubscriptionIds.has(subscriptionId) || invoice.currency !== 'mxn') continue;
				donationTotalCents += invoice.amount_paid;
				donationCount += 1;
			}

			result.donations = donationTotalCents / 100;
			result.donationCount = donationCount;
			result.services.stripe = true;
		} catch (error) {
			console.error('Stripe admin report failed:', error);
		}
	}

	return jsonResponse(result);
};