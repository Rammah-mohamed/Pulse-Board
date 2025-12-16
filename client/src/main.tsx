// client/src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";
import { useBoardStore } from "@/store/boardStore";

async function bootstrap() {
	// store hydration
	await useBoardStore.getState().hydrateFromIndexedDB();

	const container = document.getElementById("root");
	if (!container) {
		throw new Error("Root container missing in index.html");
	}

	const root = createRoot(container);

	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}

bootstrap();
