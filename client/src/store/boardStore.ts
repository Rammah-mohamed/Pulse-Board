import { create } from "zustand";
import type { Task } from "@/shared/types";

type BoardState = {
	tasks: Task[];
	setTasks: (tasks: Task[]) => void;
	addTask: (task: Task) => void;
};

export const useBoardStore = create<BoardState>((set) => ({
	tasks: [],
	setTasks: (tasks) => set({ tasks }),
	addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
}));
