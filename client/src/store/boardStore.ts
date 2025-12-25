// client/src/store/boardStore.ts
import { create } from "zustand";
import type { Task, ColumnKey } from "@/shared/types";
import {
	saveTask,
	saveTasks,
	getTasksByUser,
	deleteTaskById,
	type QueueItem,
	enqueueAction,
	getQueueByUser,
} from "@/local-db/indexedDB";
import { getUserIdFromToken } from "@/helper/token";

type BoardState = {
	tasks: Task[];
	queue: (QueueItem & { qid?: number })[];

	setTasks: (tasks: Task[]) => void;
	addTask: (task: Task) => void;
	moveTaskLocally: (id: string, toColumn: ColumnKey, toPosition: number) => void;
	updateTaskLocally: (id: string, fields: Partial<Task>) => void;
	deleteTaskLocally: (id: string) => void;
	applyAuthoritativeTask: (task: Task) => void;

	enqueue: (action: QueueItem) => Promise<void>;
	flushQueueFromIndexedDB: () => Promise<void>;
	hydrateFromIndexedDB: () => Promise<void>;
};

export const useBoardStore = create<BoardState>((set) => ({
	tasks: [],
	queue: [],

	// ---------------------------
	// SAFE SET (deduplicated)
	// ---------------------------
	setTasks: (tasks) => {
		const map = new Map<string, Task>();
		tasks.forEach((t) => map.set(t.id, t));
		const deduped = Array.from(map.values());

		set({ tasks: deduped });
		saveTasks(deduped).catch(console.error);
	},

	// ---------------------------
	// IDEMPOTENT ADD
	// ---------------------------
	addTask: (task) =>
		set((state) => {
			const exists = state.tasks.some((t) => t.id === task.id);
			const tasks = exists
				? state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
				: [...state.tasks, task];

			saveTask(task).catch(console.error);
			return { tasks };
		}),

	// ---------------------------
	// MOVE TASK (SAFE, POSITION NORMALIZATION)
	// ---------------------------
	moveTaskLocally: (id, toColumn, toPosition) =>
		set((state) => {
			const taskIndex = state.tasks.findIndex((t) => t.id === id);
			if (taskIndex === -1) return state;

			const task = { ...state.tasks[taskIndex] };
			const rest = state.tasks.filter((t) => t.id !== id);

			task.column = toColumn;

			const columnTasks = rest
				.filter((t) => t.column === toColumn)
				.sort((a, b) => a.position - b.position);

			const safeIndex = Math.max(0, Math.min(toPosition, columnTasks.length));
			columnTasks.splice(safeIndex, 0, task);

			columnTasks.forEach((t, i) => (t.position = i));

			const updatedTasks = [...rest.filter((t) => t.column !== toColumn), ...columnTasks];

			saveTasks(updatedTasks).catch(console.error);
			return { tasks: updatedTasks };
		}),

	// ---------------------------
	// UPDATE TASK LOCALLY
	// ---------------------------
	updateTaskLocally: (id, fields) =>
		set((state) => {
			const tasks = state.tasks.map((t) => (t.id === id ? { ...t, ...fields } : t));
			const updated = tasks.find((t) => t.id === id);
			if (updated) saveTask(updated).catch(console.error);
			return { tasks };
		}),

	// ---------------------------
	// DELETE TASK LOCALLY
	// ---------------------------
	deleteTaskLocally: (id) =>
		set((state) => {
			const tasks = state.tasks.filter((t) => t.id !== id);
			deleteTaskById(id).catch(console.error);
			return { tasks };
		}),

	// ---------------------------
	// APPLY SERVER-AUTHORITATIVE TASK
	// ---------------------------
	applyAuthoritativeTask: (task) =>
		set((state) => {
			const exists = state.tasks.some((t) => t.id === task.id);
			const tasks = exists
				? state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
				: [...state.tasks, task];

			saveTask(task).catch(console.error);
			return { tasks };
		}),

	// ---------------------------
	// QUEUE MANAGEMENT
	// ---------------------------
	enqueue: async (action) => {
		try {
			await enqueueAction(action);
			set((s) => ({ queue: [...s.queue, action] }));
		} catch (err) {
			console.error("enqueue error", err);
		}
	},

	flushQueueFromIndexedDB: async () => {
		const userId = getUserIdFromToken();
		if (!userId) return;
		const queue = await getQueueByUser(userId);
		set({ queue });
	},

	hydrateFromIndexedDB: async () => {
		const userId = getUserIdFromToken();
		if (!userId) return;

		const tasks = await getTasksByUser(userId);
		if (tasks?.length) {
			const map = new Map<string, Task>();
			tasks.forEach((t) => map.set(t.id, t));
			set({ tasks: Array.from(map.values()) });
		}
	},
}));
