import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import Column from "./Column";
import { useBoardStore } from "@/store/boardStore";
import { useSocket } from "@/hooks/useSocket";
import type { ColumnKey } from "@/shared/types";

const COLUMNS: { key: ColumnKey; title: string }[] = [
	{ key: "todo", title: "To-Do" },
	{ key: "in-progress", title: "In Progress" },
	{ key: "done", title: "Done" },
];

export default function Board() {
	const tasks = useBoardStore((s) => s.tasks);
	const moveTaskLocally = useBoardStore((s) => s.moveTaskLocally);
	const { emitMoveTask } = useSocket();

	// Group tasks by column and sort by position
	const tasksByColumn = (column: ColumnKey) =>
		tasks.filter((t) => t.column === column).sort((a, b) => a.position - b.position);

	const onDragEnd = (result: DropResult) => {
		const { destination, source, draggableId } = result;
		if (!destination) return;
		if (destination.droppableId === source.droppableId && destination.index === source.index)
			return;

		const toColumn = destination.droppableId as ColumnKey;
		const toPosition = destination.index;

		// Update local state optimistically
		moveTaskLocally(draggableId, toColumn, toPosition);

		// Emit to server (offline-first will queue if disconnected)
		emitMoveTask?.({ id: draggableId, toColumn, toPosition });
	};

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
				{COLUMNS.map((col) => (
					<Column
						key={col.key}
						columnKey={col.key}
						title={col.title}
						tasks={tasksByColumn(col.key)}
					/>
				))}
			</div>
		</DragDropContext>
	);
}
