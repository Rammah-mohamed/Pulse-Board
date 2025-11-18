// client/src/store/boardStore.ts
import { create } from "zustand";
import type { Task, ColumnKey } from "../shared/types";

type BoardState = {
	tasks: Task[];
	setTasks: (tasks: Task[]) => void;
	addTask: (task: Task) => void;
	moveTaskLocally: (id: string, toColumn: ColumnKey, toPosition: number) => void;
	applyAuthoritativeTask: (task: Task) => void;
	updateTaskLocally: (id: string, fields: Partial<Task>) => void;
};

export const useBoardStore = create<BoardState>((set) => ({
	tasks: [],

	setTasks: (tasks) => set({ tasks }),

	addTask: (task) =>
		set((state) => {
			const exists = state.tasks.some((t) => t.id === task.id);
			if (exists) {
				// update instead of duplicating (idempotent)
				return {
					tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
				};
			}
			return { tasks: [...state.tasks, task] };
		}),

	moveTaskLocally: (id, toColumn, toPosition) =>
		set((state) => {
			// 1️⃣ Find the task
			const taskIndex = state.tasks.findIndex((t) => t.id === id);
			if (taskIndex === -1) return state;

			// 2️⃣ Remove task from its current location
			const task = { ...state.tasks[taskIndex] }; // clone to avoid mutation
			const remainingTasks = state.tasks.filter((t) => t.id !== id);

			// 3️⃣ Update column
			task.column = toColumn;

			// 4️⃣ Get current tasks in the target column
			const columnTasks = remainingTasks
				.filter((t) => t.column === toColumn)
				.sort((a, b) => a.position - b.position);

			// 5️⃣ Clamp toPosition
			const safeIndex = Math.max(0, Math.min(toPosition, columnTasks.length));

			// 6️⃣ Insert task at safeIndex
			columnTasks.splice(safeIndex, 0, task);

			// 7️⃣ Normalize positions
			columnTasks.forEach((t, idx) => (t.position = idx));

			// 8️⃣ Rebuild full task array
			const newTasks = [...remainingTasks.filter((t) => t.column !== toColumn), ...columnTasks];

			return { tasks: newTasks };
		}),

	applyAuthoritativeTask: (task) =>
		set((state) => {
			const exists = state.tasks.some((t) => t.id === task.id);
			if (exists) {
				return {
					tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
				};
			}
			return { tasks: [...state.tasks, task] };
		}),

	updateTaskLocally: (id, fields) =>
		set((state) => ({
			tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...fields } : t)),
		})),
}));
