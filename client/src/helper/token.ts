export function getUserIdFromToken(): string | null {
	const token = localStorage.getItem("token");
	if (!token) return null;

	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		return payload.userId ?? null;
	} catch {
		return null;
	}
}
