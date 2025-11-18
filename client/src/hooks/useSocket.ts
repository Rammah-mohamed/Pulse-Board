import { useEffect } from "react";
import type { Task } from "../shared/types";
import { useBoardStore } from "../store/boardStore";
import { socket } from "../lib/socket"; // <-- singleton socket

export function useSocket() {
	const setTasks = useBoardStore((s) => s.setTasks);
	const addTask = useBoardStore((s) => s.addTask);
	const applyAuthoritativeTask = useBoardStore((s) => s.applyAuthoritativeTask);

	useEffect(() => {
		console.log("[socket] hook mounted");

		// ---------------------------------------------------
		// 🧼 Remove previous event listeners (CRITICAL)
		// ---------------------------------------------------
		socket.off("tasks:initial");
		socket.off("task:added");
		socket.off("task:moved");
		socket.off("task:updated");

		// ---------------------------------------------------
		// 🧼 Remove connection listeners to avoid duplicates
		// ---------------------------------------------------
		socket.off("connect");
		socket.off("disconnect");

		// ---------------------------------------------------
		// 🟢 Register listeners exactly once
		// ---------------------------------------------------
		socket.on("connect", () => {
			console.log("[socket] connected:", socket.id);
		});

		socket.on("disconnect", (reason) => {
			console.log("[socket] disconnected:", reason);
		});

		socket.on("tasks:initial", (tasks) => {
			console.log("[socket] tasks:initial received", tasks.length);
			setTasks(tasks);
		});

		socket.on("task:added", (task) => {
			console.log("[socket] task:added", task.id);
			addTask(task);
		});

		socket.on("task:moved", ({ task }) => {
			console.log("[socket] task:moved", task.id);
			applyAuthoritativeTask(task);
		});

		socket.on("task:updated", ({ task }) => {
			console.log("[socket] task:updated", task.id);
			applyAuthoritativeTask(task);
		});

		// ---------------------------------------------------
		// 🟡 Fetch tasks ONLY once (not on connect!)
		// ---------------------------------------------------
		console.log("[socket] fetching initial tasks…");
		socket.emit("tasks:fetch");

		// No cleanup needed — socket is global/singleton
	}, [setTasks, addTask, applyAuthoritativeTask]);

	// ---------------------------------------------------
	// ✨ Emitters
	// ---------------------------------------------------
	const emitAddTask = (task: Partial<Task> & { id: string }) => {
		socket.emit("task:add", task);
	};

	const emitMoveTask = (payload: { id: string; toColumn: Task["column"]; toPosition: number }) => {
		socket.emit("task:move", payload);
	};

	const emitUpdateTask = (payload: { id: string; title?: string; description?: string }) => {
		socket.emit("task:update", payload);
	};

	return {
		emitAddTask,
		emitMoveTask,
		emitUpdateTask,
	};
}
