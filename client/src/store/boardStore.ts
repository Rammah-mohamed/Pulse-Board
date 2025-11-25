// client/src/store/boardStore.ts
import { create } from "zustand";
import type { Task, ColumnKey } from "../shared/types";
import {
	saveTask,
	saveTasks,
	getAllTasks,
	enqueue as persistEnqueue,
	getQueue,
	deleteTask,
} from "@/local-db/indexedDB";

type QueueItem =
	| { type: "add"; task: Task }
	| { type: "move"; payload: { id: string; toColumn: ColumnKey; toPosition: number } }
	| { type: "update"; payload: { id: string; fields: Partial<Task> } }
	| { type: "delete"; payload: { id: string } };

type BoardState = {
	tasks: Task[];
	queue: QueueItem[];
	setTasks: (tasks: Task[]) => void;
	addTask: (task: Task) => void;
	moveTaskLocally: (id: string, toColumn: ColumnKey, toPosition: number) => void;
	applyAuthoritativeTask: (task: Task) => void;
	updateTaskLocally: (id: string, fields: Partial<Task>) => void;
	deleteTask: (id: string) => void;
	enqueueAction: (action: QueueItem) => Promise<void>;
	flushLocalQueueToMemory: () => Promise<void>;
	hydrateFromIndexedDB: () => Promise<void>;
};

export const useBoardStore = create<BoardState>((set, _get) => ({
	tasks: [],
	queue: [],

	setTasks: (tasks) => {
		set({ tasks });
		saveTasks(tasks).catch((e) => console.error("saveTasks error", e));
	},

	addTask: (task) =>
		set((state) => {
			const exists = state.tasks.some((t) => t.id === task.id);
			const tasks = exists
				? state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
				: [...state.tasks, task];
			saveTask(task).catch((e) => console.error("saveTask error", e));
			return { tasks };
		}),

	moveTaskLocally: (id, toColumn, toPosition) =>
		set((state) => {
			const taskIndex = state.tasks.findIndex((t) => t.id === id);
			if (taskIndex === -1) return state;

			const task = { ...state.tasks[taskIndex] };
			const remainingTasks = state.tasks.filter((t) => t.id !== id);

			task.column = toColumn;

			const columnTasks = remainingTasks
				.filter((t) => t.column === toColumn)
				.sort((a, b) => a.position - b.position);

			const safeIndex = Math.max(0, Math.min(toPosition, columnTasks.length));
			columnTasks.splice(safeIndex, 0, task);
			columnTasks.forEach((t, idx) => (t.position = idx));

			const newTasks = [...remainingTasks.filter((t) => t.column !== toColumn), ...columnTasks];

			saveTasks(newTasks).catch((e) => console.error("saveTasks error", e));

			return { tasks: newTasks };
		}),

	applyAuthoritativeTask: (task) =>
		set((state) => {
			const exists = state.tasks.some((t) => t.id === task.id);
			const tasks = exists
				? state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
				: [...state.tasks, task];
			saveTask(task).catch((e) => console.error("saveTask error", e));
			return { tasks };
		}),

	updateTaskLocally: (id, fields) =>
		set((state) => {
			const tasks = state.tasks.map((t) => (t.id === id ? { ...t, ...fields } : t));
			const updated = tasks.find((t) => t.id === id);
			if (updated) saveTask(updated).catch((e) => console.error("saveTask error", e));
			return { tasks };
		}),

	deleteTask: (id) =>
		set((state) => {
			const tasks = state.tasks.filter((t) => t.id !== id);

			// persist deletion
			deleteTask(id).catch((e) => console.error("deleteTask error", e));

			return { tasks };
		}),

	enqueueAction: async (action) => {
		try {
			await persistEnqueue(action as any);
			set((s) => ({ queue: [...s.queue, action] }));
		} catch (err) {
			console.error("enqueueAction error", err);
		}
	},

	flushLocalQueueToMemory: async () => {
		try {
			const queued = await getQueue();
			set({ queue: queued as any });
		} catch (err) {
			console.error("flushLocalQueueToMemory error", err);
		}
	},

	hydrateFromIndexedDB: async () => {
		try {
			const tasks = await getAllTasks();
			if (tasks && tasks.length) set({ tasks });
		} catch (err) {
			console.error("hydrateFromIndexedDB error", err);
		}
	},
}));
