// client/src/App.tsx
import React, { useCallback, useState } from "react";
import { useBoardStore } from "./store/boardStore";
import { useSocket } from "./hooks/useSocket";
import { v4 as uuidv4 } from "uuid";
import type { Task } from "./shared/types";

const Column = ({ title, children }: { title: string; children?: React.ReactNode }) => (
	<div className="flex-1 bg-gray-50 rounded p-4 min-h-[300px]">
		<h3 className="font-semibold mb-3">{title}</h3>
		<div className="space-y-2">{children}</div>
	</div>
);

export default function App() {
	const tasks = useBoardStore((s) => s.tasks);
	const setTasks = useBoardStore((s) => s.setTasks);
	const addTaskToStore = useBoardStore((s) => s.addTask);
	console.log(tasks);

	// Local form state
	const [title, setTitle] = useState("");
	const [column, setColumn] = useState<"todo" | "in-progress" | "done">("todo");

	// handlers for socket events
	const handleTaskAdded = useCallback(
		(task: Task) => {
			console.log(task);
			// Avoid duplicates: ignore if we already have an ID
			const exists = tasks.some((t) => t.id === task.id);
			if (!exists) addTaskToStore(task);
		},
		[tasks, addTaskToStore]
	);

	const handleInitialLoad = useCallback(
		(initialTasks: Task[]) => {
			setTasks(initialTasks);
		},
		[setTasks]
	);

	const { emitAddTask } = useSocket(handleTaskAdded, handleInitialLoad);

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		const newTask: Task = {
			id: uuidv4(),
			title: title.trim(),
			description: "",
			column,
			createdAt: new Date().toISOString(),
		};

		// Optimistic UI: update local store immediately
		addTaskToStore(newTask);

		// Emit to server (server will broadcast to other clients)
		emitAddTask(newTask);

		setTitle("");
	};

	// convenience: group tasks by column
	const todo = tasks.filter((t) => t.column === "todo");
	const inProgress = tasks.filter((t) => t.column === "in-progress");
	const done = tasks.filter((t) => t.column === "done");

	return (
		<div className="min-h-screen bg-white p-6">
			<header className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">PulseBoard — Phase 1</h1>
				<div className="text-sm text-gray-500">Real-time demo (Socket.IO)</div>
			</header>

			<main>
				<form onSubmit={submit} className="mb-4 flex gap-2">
					<input
						className="border rounded px-3 py-2 flex-1"
						placeholder="Task title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
					<select
						value={column}
						onChange={(e) => setColumn(e.target.value as any)}
						className="border rounded px-3 py-2"
					>
						<option value="todo">To-Do</option>
						<option value="in-progress">In Progress</option>
						<option value="done">Done</option>
					</select>
					<button className="bg-blue-600 text-white px-4 py-2 rounded">Add Task</button>
				</form>

				<div className="flex gap-4">
					<Column title="To-Do">
						{todo.map((t) => (
							<div key={t.id} className="p-3 bg-white rounded shadow-sm">
								<div className="font-medium">{t.title}</div>
								<div className="text-xs text-gray-400">
									{new Date(t.createdAt).toLocaleString()}
								</div>
							</div>
						))}
					</Column>

					<Column title="In Progress">
						{inProgress.map((t) => (
							<div key={t.id} className="p-3 bg-white rounded shadow-sm">
								<div className="font-medium">{t.title}</div>
							</div>
						))}
					</Column>

					<Column title="Done">
						{done.map((t) => (
							<div key={t.id} className="p-3 bg-white rounded shadow-sm">
								<div className="font-medium">{t.title}</div>
							</div>
						))}
					</Column>
				</div>
			</main>
		</div>
	);
}
