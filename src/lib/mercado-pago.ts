const apiUrl = 'https://api.mercadopago.com';

export function getMercadoPagoAccessToken() {
	return import.meta.env.MERCADO_PAGO_ACCESS_TOKEN;
}

export async function mercadoPagoRequest<T>(
	path: string,
	options: { method?: 'GET' | 'POST' | 'PUT'; body?: unknown } = {},
): Promise<T> {
	const accessToken = getMercadoPagoAccessToken();
	if (!accessToken) throw new Error('MERCADO_PAGO_ACCESS_TOKEN is not configured.');

	const response = await fetch(`${apiUrl}${path}`, {
		method: options.method ?? 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
		},
		...(options.body ? { body: JSON.stringify(options.body) } : {}),
	});

	if (!response.ok) throw new Error(`Mercado Pago API responded with status ${response.status}.`);
	return response.json() as Promise<T>;
}
