import { useBoardStore } from "@/store/boardStore";

/** Get token if it exists */
export function getToken(): string | null {
	return localStorage.getItem("token");
}

/** Check if user is logged in */
export function isLoggedIn(): boolean {
	return !!getToken();
}

/**
 * Logout (PURE, SAFE)
 * - clears token
 * - resets board state
 * - socket cleanup is handled elsewhere
 */
export function logout() {
	// 1️⃣ Remove auth token
	localStorage.removeItem("token");

	// 2️⃣ Reset board store safely
	useBoardStore.getState().setTasks([]);
	useBoardStore.setState({ queue: [] });
}
