// src/components/board/TaskCard.tsx
import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { Task } from "@/shared/types";
import { useSocket } from "@/hooks/useSocket";
import { useBoardStore } from "@/store/boardStore";
import { IconPencil } from "@tabler/icons-react";

export default function TaskCard({ task, index }: { task: Task; index: number }) {
	const { emitUpdateTask } = useSocket();
	const updateLocally = useBoardStore((s) => s.updateTaskLocally);
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(task.title);

	const save = () => {
		if (title.trim() === task.title) {
			setEditing(false);
			return;
		}
		updateLocally(task.id, { title: title.trim() });
		emitUpdateTask({ id: task.id, title: title.trim() });
		setEditing(false);
	};

	return (
		<Draggable draggableId={task.id} index={index}>
			{(provided, snapshot) => (
				<div
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					className={`p-3 bg-white border border-gray-200 rounded-xl shadow-sm transition 
          ${snapshot.isDragging ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
				>
					{editing ? (
						<div className="flex gap-2">
							<input
								className="border rounded px-2 py-1 flex-1 text-sm"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") save();
									if (e.key === "Escape") {
										setEditing(false);
										setTitle(task.title);
									}
								}}
							/>
							<button className="text-sm text-blue-600 font-medium hover:underline" onClick={save}>
								Save
							</button>
						</div>
					) : (
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium text-gray-800">{task.title}</div>
								<div className="text-xs text-gray-400">
									{new Date(task.createdAt).toLocaleDateString()}
								</div>
							</div>
							<button
								className="text-gray-400 hover:text-blue-600 transition"
								onClick={() => setEditing(true)}
								aria-label={`Edit ${task.title}`}
							>
								<IconPencil size={16} />
							</button>
						</div>
					)}
				</div>
			)}
		</Draggable>
	);
}
