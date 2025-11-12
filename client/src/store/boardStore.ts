// client/src/store/boardStore.ts
import { create } from "zustand";
import type { Task, ColumnKey } from "../shared/types";

type BoardState = {
	tasks: Task[];
	setTasks: (tasks: Task[]) => void;
	addTask: (task: Task) => void;
	moveTaskLocally: (id: string, toColumn: ColumnKey, toPosition: number) => void;
	applyAuthoritativeTask: (task: Task) => void; // server confirms
	updateTaskLocally: (id: string, fields: Partial<Task>) => void;
};

export const useBoardStore = create<BoardState>((set) => ({
	tasks: [],
	setTasks: (tasks) => set({ tasks }),
	addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
	moveTaskLocally: (id, toColumn, toPosition) => {
		set((state) => {
			// optimistic reordering
			const tasks = state.tasks.map((t) => ({ ...t }));
			const task = tasks.find((x) => x.id === id);
			if (!task) return { tasks };

			const fromColumn = task.column;
			// remove task from its current spot
			const oldColumnTasks = tasks
				.filter((t) => t.column === fromColumn && t.id !== id)
				.sort((a, b) => a.position - b.position);

			// reassign positions for old column
			oldColumnTasks.forEach((t, idx) => (t.position = idx));

			// insert into target column at toPosition
			task.column = toColumn;
			const targetColumnTasks = tasks
				.filter((t) => t.column === toColumn && t.id !== id)
				.sort((a, b) => a.position - b.position);

			// clamp toPosition
			const pos = Math.max(0, Math.min(toPosition, targetColumnTasks.length));
			targetColumnTasks.splice(pos, 0, task);

			// reassign positions in target column
			targetColumnTasks.forEach((t, idx) => (t.position = idx));

			// build new tasks array
			const remainingOtherTasks = tasks.filter(
				(t) => t.id !== id && t.column !== fromColumn && t.column !== toColumn
			);
			const combined = [...remainingOtherTasks, ...oldColumnTasks, ...targetColumnTasks];

			return { tasks: combined };
		});
	},
	applyAuthoritativeTask: (task) => {
		set((state) => {
			// remove any previous copy
			const others = state.tasks.filter((t) => t.id !== task.id);
			return { tasks: [...others, task] };
		});
	},
	updateTaskLocally: (id, fields) => {
		set((state) => ({
			tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...fields } : t)),
		}));
	},
}));
