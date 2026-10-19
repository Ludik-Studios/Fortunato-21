declare namespace App {
	interface Locals {
		authConfigured: boolean;
		isAdmin: boolean;
		user: {
			id: string;
			email: string | null;
		} | null;
	}
}