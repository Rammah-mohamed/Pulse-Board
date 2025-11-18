// src/components/board/Board.tsx
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import Column from "./Column";
import { useBoardStore } from "@/store/boardStore";
import { useSocket } from "@/hooks/useSocket";
import type { ColumnKey } from "@/shared/types";

const columns: { key: ColumnKey; title: string }[] = [
	{ key: "todo", title: "To-Do" },
	{ key: "in-progress", title: "In Progress" },
	{ key: "done", title: "Done" },
];

export default function Board() {
	const tasks = useBoardStore((s) => s.tasks);
	const moveTaskLocally = useBoardStore((s) => s.moveTaskLocally);
	const { emitMoveTask } = useSocket();

	const tasksByColumn = (key: ColumnKey) =>
		tasks.filter((t) => t.column === key).sort((a, b) => a.position - b.position);

	const onDragEnd = (result: DropResult) => {
		const { destination, source, draggableId } = result;
		if (!destination) return;
		if (destination.droppableId === source.droppableId && destination.index === source.index)
			return;

		const toColumn = destination.droppableId as ColumnKey;
		const toPosition = destination.index;

		moveTaskLocally(draggableId, toColumn, toPosition); // optimistic
		emitMoveTask({ id: draggableId, toColumn, toPosition }); // server authoritative
	};

	return (
		<div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
			<DragDropContext onDragEnd={onDragEnd}>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{columns.map((col) => (
						<Column key={col.key} id={col.key} title={col.title} tasks={tasksByColumn(col.key)} />
					))}
				</div>
			</DragDropContext>
		</div>
	);
}
