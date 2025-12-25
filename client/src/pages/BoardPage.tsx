import { AddTaskForm } from "@/components/AddTaskForm";
import Board from "@/components/Board";
import BoardHeader from "@/components/BoardHeader";
import { BoardLayout } from "@/components/BoardLayout";
import ConnectionBadge from "@/components/ConnectionBadge";

export default function BoardPage() {
	return (
		<BoardLayout>
			<BoardHeader />
			<AddTaskForm />
			<ConnectionBadge />
			<Board />
		</BoardLayout>
	);
}
