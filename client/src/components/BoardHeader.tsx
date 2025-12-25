import { useNavigate } from "react-router-dom";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function BoardHeader() {
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/auth", { replace: true });
	};

	return (
		<div className="flex items-center justify-between px-4 py-2 border-b">
			<h1 className="font-semibold">Pulseboard</h1>

			<Button variant="outline" size="sm" onClick={handleLogout}>
				Logout
			</Button>
		</div>
	);
}
