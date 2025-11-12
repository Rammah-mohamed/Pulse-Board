import { AddTaskForm } from "./components/AddTaskForm";
import Board from "./components/Board";
import { BoardLayout } from "./components/BoardLayout";

export default function App() {
	return (
		<BoardLayout>
			<AddTaskForm />
			<Board />
		</BoardLayout>
	);
}
