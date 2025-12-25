// src/layouts/ProtectedLayout.tsx
import AuthGuard from "@/helper/AuthGuard";
import { useSocket } from "@/hooks/useSocket";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
	useSocket(); // 🔥 mounted ONCE

	return <AuthGuard>{children}</AuthGuard>;
}
