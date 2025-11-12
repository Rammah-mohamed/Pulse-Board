// src/components/board/Column.tsx
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Task } from "@/shared/types";

export default function Column({ id, title, tasks }: { id: string; title: string; tasks: Task[] }) {
	return (
		<div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 p-4 min-h-[400px]">
			<h3 className="font-semibold text-gray-800 mb-3 tracking-tight">{title}</h3>
			<Droppable droppableId={id}>
				{(provided) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className="space-y-2 min-h-[300px]"
					>
						{tasks.map((t, index) => (
							<TaskCard key={t.id} task={t} index={index} />
						))}
						{provided.placeholder}
						{tasks.length === 0 && (
							<p className="text-sm text-gray-400 text-center py-6 italic">No tasks here</p>
						)}
					</div>
				)}
			</Droppable>
		</div>
	);
}
