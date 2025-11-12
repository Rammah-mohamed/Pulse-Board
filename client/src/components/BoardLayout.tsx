// src/components/layout/BoardLayout.tsx
import { IconLayoutGrid, IconUsers } from "@tabler/icons-react";
import React from "react";

interface BoardLayoutProps {
	children: React.ReactNode;
}

export const BoardLayout: React.FC<BoardLayoutProps> = ({ children }) => {
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			{/* Header */}
			<header className="bg-white border-b border-gray-200 shadow-sm">
				<div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
					<div className="flex items-center gap-2">
						<IconLayoutGrid size={22} className="text-blue-600" />
						<h1 className="text-xl font-semibold text-gray-800 tracking-tight">PulseBoard</h1>
					</div>
					<div className="flex items-center gap-2 text-gray-500 text-sm">
						<IconUsers size={18} />
						<span>Team Workspace</span>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6 space-y-6">{children}</main>
		</div>
	);
};
