// src/components/forms/AddTaskForm.tsx
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
import type { ColumnKey } from "@/shared/types";
import { useSocket } from "@/hooks/useSocket";
import { useBoardStore } from "@/store/boardStore";
import { IconPlus } from "@tabler/icons-react";

export const AddTaskForm: React.FC = () => {
	const [title, setTitle] = useState("");
	const [column, setColumn] = useState<ColumnKey>("todo");
	const { emitAddTask } = useSocket();
	const addTaskLocally = useBoardStore((s) => s.addTask);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		const newTask = {
			id: uuidv4(),
			title: title.trim(),
			description: "",
			column,
			position: 0,
			createdAt: new Date().toISOString(),
		};

		addTaskLocally(newTask);
		emitAddTask(newTask);
		setTitle("");
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm"
		>
			<Input
				placeholder="Enter new task..."
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				className="flex-1"
			/>

			<Select value={column} onValueChange={(val: ColumnKey) => setColumn(val)}>
				<SelectTrigger className="w-40">
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
				className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
			>
				<IconPlus size={18} /> Add Task
			</Button>
		</form>
	);
};
