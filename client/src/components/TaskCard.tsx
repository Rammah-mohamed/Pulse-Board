import { useState, useRef, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { IconPencil, IconCheck, IconX } from "@tabler/icons-react";
import type { Task } from "@/shared/types";
import { useSocket } from "@/hooks/useSocket";
import { useBoardStore } from "@/store/boardStore";

interface TaskCardProps {
	task: Task;
	index: number;
}

export default function TaskCard({ task, index }: TaskCardProps) {
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(task.title);
	const inputRef = useRef<HTMLInputElement>(null);

	const { emitUpdateTask } = useSocket();
	const updateTaskLocally = useBoardStore((s) => s.updateTaskLocally);

	const save = () => {
		const trimmed = title.trim();
		if (!trimmed || trimmed === task.title) {
			setEditing(false);
			setTitle(task.title);
			return;
		}
		updateTaskLocally(task.id, { title: trimmed });
		emitUpdateTask({ id: task.id, title: trimmed });
		setEditing(false);
	};

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	return (
		<Draggable draggableId={task.id} index={index}>
			{(provided, snapshot) => (
				<div
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					className={`p-3 bg-white border border-gray-200 rounded-xl shadow-sm transition
            ${snapshot.isDragging ? "ring-2 ring-blue-400 ring-offset-1" : ""}
            hover:shadow-md`}
				>
					{editing ? (
						<div className="flex gap-2">
							<input
								ref={inputRef}
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") save();
									if (e.key === "Escape") {
										setEditing(false);
										setTitle(task.title);
									}
								}}
								className="border px-2 py-1 rounded flex-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
							/>
							<button onClick={save} className="text-blue-600 hover:underline">
								<IconCheck size={16} />
							</button>
							<button
								onClick={() => {
									setEditing(false);
									setTitle(task.title);
								}}
								className="text-gray-400 hover:text-red-500"
							>
								<IconX size={16} />
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
								onClick={() => setEditing(true)}
								className="text-gray-400 hover:text-blue-600 transition"
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
