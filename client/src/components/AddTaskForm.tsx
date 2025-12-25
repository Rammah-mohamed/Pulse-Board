import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ColumnKey, Task } from "@/shared/types";
import { useSocket } from "@/hooks/useSocket";
import { useBoardStore } from "@/store/boardStore";
import { IconPlus } from "@tabler/icons-react";
import { getUserIdFromToken } from "@/helper/token";

export const AddTaskForm: React.FC = () => {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [column, setColumn] = useState<ColumnKey>("todo");

	const { emitAddTask } = useSocket();
	const addTaskLocally = useBoardStore((s) => s.addTask);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = title.trim();
		if (!trimmed) return;

		const userId = getUserIdFromToken();
		if (!userId) {
			console.error("No userId found. Are you logged in?");
			return;
		}

		const newTask: Task = {
			id: uuidv4(),
			userId, // Added userId
			title: trimmed,
			description: description.trim(),
			column,
			position: 0,
			createdAt: new Date().toISOString(),
		};

		// Add task locally and emit to server
		addTaskLocally(newTask);
		emitAddTask(newTask);

		// Reset form
		setTitle("");
		setDescription("");
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm"
		>
			<Input
				placeholder="Enter new task title..."
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				className="flex-1"
			/>

			<textarea
				placeholder="Enter description (optional)..."
				value={description}
				onChange={(e) => setDescription(e.target.value)}
				className="border border-gray-300 rounded-lg p-2 text-sm min-h-[70px] focus:ring-1 focus:ring-blue-400"
			/>

			<div className="flex flex-col sm:flex-row items-center gap-3">
				<Select value={column} onValueChange={(val: ColumnKey) => setColumn(val)}>
					<SelectTrigger className="w-full sm:w-40">
						<SelectValue placeholder="Select column" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="todo">To-Do</SelectItem>
						<SelectItem value="in-progress">In Progress</SelectItem>
						<SelectItem value="done">Done</SelectItem>
					</SelectContent>
				</Select>

				<Button
					type="submit"
					className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 w-full sm:w-auto"
				>
					<IconPlus size={18} /> Add Task
				</Button>
			</div>
		</form>
	);
};
