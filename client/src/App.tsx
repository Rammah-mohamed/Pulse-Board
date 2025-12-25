import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import BoardPage from "@/pages/BoardPage";
import ProtectedLayout from "./helper/ProtectedLayout";

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/auth" element={<AuthPage />} />

				<Route
					path="/board"
					element={
						<ProtectedLayout>
							<BoardPage />
						</ProtectedLayout>
					}
				/>

				<Route path="*" element={<Navigate to="/board" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
