import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./App.css";
import { useBoardStore } from "@/store/boardStore";
import { useSocket } from "@/hooks/useSocket";

// Initialize store & hydrate IndexedDB before app renders
async function bootstrapStore() {
	await useBoardStore.getState().hydrateFromIndexedDB();
}

bootstrapStore().finally(() => {
	const root = createRoot(document.getElementById("root")!);
	root.render(
		<StrictMode>
			<App />
		</StrictMode>
	);
});

// Initialize socket hooks
useSocket();
