import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register";

export default function AuthPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<AuthMode>("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const res = await fetch(`/api/auth/${mode}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await res.json();

			if (!res.ok) throw new Error(data.message || "Authentication failed");

			// ✅ Persist token
			localStorage.setItem("token", data.token);

			// ✅ Navigate to board
			navigate("/board", { replace: true });
		} catch (err: any) {
			setError(err.message || "Something went wrong");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<Card className="w-full max-w-sm shadow-lg">
				<CardHeader>
					<CardTitle className="text-2xl">
						{mode === "login" ? "Welcome back" : "Create an account"}
					</CardTitle>
					<CardDescription>
						{mode === "login" ? "Sign in to your Pulseboard" : "Get started with Pulseboard"}
					</CardDescription>
				</CardHeader>

				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && (
							<div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
								{error}
							</div>
						)}

						<div className="space-y-1">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						<div className="space-y-1">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={loading}
								autoComplete="true"
							/>
						</div>
					</CardContent>

					<CardFooter className="flex flex-col gap-3">
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
						</Button>

						<button
							type="button"
							onClick={() => setMode(mode === "login" ? "register" : "login")}
							className="text-sm text-muted-foreground hover:underline"
							disabled={loading}
						>
							{mode === "login"
								? "Don't have an account? Register"
								: "Already have an account? Login"}
						</button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
