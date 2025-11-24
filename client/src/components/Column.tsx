import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Task, ColumnKey } from "@/shared/types";

interface ColumnProps {
	columnKey: ColumnKey;
	title: string;
	tasks: Task[];
}

export default function Column({ columnKey, title, tasks }: ColumnProps) {
	return (
		<div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col shadow-sm">
			<h2 className="text-lg font-semibold mb-3">{title}</h2>

			<Droppable droppableId={columnKey}>
				{(provided, snapshot) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className={`flex flex-col gap-2 min-h-[120px] transition-all duration-200
              ${snapshot.isDraggingOver ? "bg-blue-50" : ""}`}
					>
						{tasks.map((task, index) => (
							<TaskCard key={task.id} task={task} index={index} />
						))}
						{provided.placeholder}
					</div>
				)}
			</Droppable>
		</div>
	);
}
