import { useState, useRef, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
	IconPencil,
	IconCheck,
	IconX,
	IconTrash,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react";
import type { Task } from "@/shared/types";
import { useSocket } from "@/hooks/useSocket";
import { useBoardStore } from "@/store/boardStore";

interface TaskCardProps {
	task: Task;
	index: number;
}

export default function TaskCard({ task, index }: TaskCardProps) {
	const [editingTitle, setEditingTitle] = useState(false);
	const [editingDescription, setEditingDescription] = useState(false);
	const [showDescription, setShowDescription] = useState(false);

	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description || "");

	const inputRef = useRef<HTMLInputElement>(null);

	const { emitUpdateTask, emitDeleteTask } = useSocket();
	const updateTaskLocally = useBoardStore((s) => s.updateTaskLocally);

	// Save title
	const saveTitle = () => {
		const trimmed = title.trim();
		if (!trimmed || trimmed === task.title) {
			setEditingTitle(false);
			setTitle(task.title);
			return;
		}
		updateTaskLocally(task.id, { title: trimmed });
		emitUpdateTask({ id: task.id, title: trimmed });
		setEditingTitle(false);
	};

	// Save description
	const saveDescription = () => {
		const trimmed = description.trim();
		updateTaskLocally(task.id, { description: trimmed });
		emitUpdateTask({ id: task.id, description: trimmed });
		setEditingDescription(false);
	};

	const handleDelete = () => {
		if (confirm(`Delete "${task.title}"?`)) {
			emitDeleteTask(task.id);
		}
	};

	useEffect(() => {
		if (editingTitle) inputRef.current?.focus();
	}, [editingTitle]);

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
					{/* Title section */}
					{editingTitle ? (
						<div className="flex gap-2">
							<input
								ref={inputRef}
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") saveTitle();
									if (e.key === "Escape") {
										setEditingTitle(false);
										setTitle(task.title);
									}
								}}
								className="border px-2 py-1 rounded flex-1 text-sm focus:ring-1 focus:ring-blue-400"
							/>
							<button onClick={saveTitle} className="text-blue-600">
								<IconCheck size={16} />
							</button>
							<button
								onClick={() => {
									setEditingTitle(false);
									setTitle(task.title);
								}}
								className="text-gray-400 hover:text-red-500"
							>
								<IconX size={16} />
							</button>
						</div>
					) : (
						<div className="flex justify-between items-center">
							<div>
								<div className="font-medium text-gray-800">{task.title}</div>
								<div className="text-xs text-gray-400">
									{new Date(task.createdAt).toLocaleDateString()}
								</div>
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => setEditingTitle(true)}
									className="text-gray-400 hover:text-blue-600"
								>
									<IconPencil size={16} />
								</button>
								<button onClick={handleDelete} className="text-gray-400 hover:text-red-500">
									<IconTrash size={16} />
								</button>
							</div>
						</div>
					)}

					{/* Description toggle */}
					<div className="mt-2">
						<button
							onClick={() => setShowDescription((v) => !v)}
							className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700"
						>
							{showDescription ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
							Description
						</button>
					</div>

					{/* Description content */}
					{showDescription && (
						<div className="mt-2">
							{editingDescription ? (
								<div className="flex flex-col gap-2">
									<textarea
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										className="border p-2 rounded text-sm min-h-20 focus:ring-1 focus:ring-blue-400"
									/>
									<div className="flex gap-2">
										<button onClick={saveDescription} className="text-blue-600">
											<IconCheck size={16} />
										</button>
										<button
											onClick={() => {
												setEditingDescription(false);
												setDescription(task.description || "");
											}}
											className="text-gray-400 hover:text-red-500"
										>
											<IconX size={16} />
										</button>
									</div>
								</div>
							) : (
								<div className="flex justify-between">
									<p className="text-sm text-gray-700 whitespace-pre-line flex-1">
										{task.description || "No description"}
									</p>
									<button
										onClick={() => setEditingDescription(true)}
										className="text-gray-400 hover:text-blue-600 ml-2"
									>
										<IconPencil size={14} />
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</Draggable>
	);
}
