import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn, logout } from "@/lib/auth";

type AuthGuardProps = {
	children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
	const navigate = useNavigate();
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		if (!isLoggedIn()) {
			logout();
			navigate("/auth", { replace: true });
			return;
		}

		setChecking(false);

		const handleStorage = () => {
			if (!isLoggedIn()) {
				logout();
				navigate("/auth", { replace: true });
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [navigate]);

	if (checking) {
		return (
			<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
				Checking authentication…
			</div>
		);
	}

	return <>{children}</>;
}
