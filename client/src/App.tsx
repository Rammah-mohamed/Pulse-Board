import { AddTaskForm } from "./components/AddTaskForm";
import Board from "./components/Board";
import { BoardLayout } from "./components/BoardLayout";
import ConnectionBadge from "./components/ConnectionBadge";

export default function App() {
	return (
		<BoardLayout>
			<AddTaskForm />
			<ConnectionBadge />
			<Board />
		</BoardLayout>
	);
}
