// client/src/components/ConnectionBadge.tsx
import { useEffect, useState } from "react";

export default function ConnectionBadge() {
	const [online, setOnline] = useState<boolean>(navigator.onLine);
	useEffect(() => {
		const on = () => setOnline(true);
		const off = () => setOnline(false);
		window.addEventListener("online", on);
		window.addEventListener("offline", off);
		return () => {
			window.removeEventListener("online", on);
			window.removeEventListener("offline", off);
		};
	}, []);
	return (
		<div
			className={`px-3 py-1 rounded-full text-xs font-medium ${
				online ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
			}`}
		>
			{online ? "Online" : "Offline"}
		</div>
	);
}
