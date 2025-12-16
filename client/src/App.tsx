import { AddTaskForm } from "./components/AddTaskForm";
import Board from "./components/Board";
import { BoardLayout } from "./components/BoardLayout";
import ConnectionBadge from "./components/ConnectionBadge";
import { useSocket } from "@/hooks/useSocket";

export default function App() {
	useSocket();

	return (
		<BoardLayout>
			<AddTaskForm />
			<ConnectionBadge />
			<Board />
		</BoardLayout>
	);
}
