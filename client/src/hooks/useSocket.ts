// client/src/hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { Task } from "../shared/types";
import { useBoardStore } from "../store/boardStore";

type ServerToClientEvents = {
	"task:added": (task: Task) => void;
	"tasks:initial": (tasks: Task[]) => void;
	"task:moved": (payload: { task: Task }) => void;
	"task:updated": (payload: { task: Task }) => void;
};

type ClientToServerEvents = {
	"task:add": (task: Partial<Task> & { id: string }) => void;
	"tasks:fetch": () => void;
	"task:move": (payload: { id: string; toColumn: Task["column"]; toPosition: number }) => void;
	"task:update": (payload: { id: string; title?: string; description?: string }) => void;
};

export function useSocket() {
	const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
	const setTasks = useBoardStore((s) => s.setTasks);
	const addTask = useBoardStore((s) => s.addTask);
	const applyAuthoritativeTask = useBoardStore((s) => s.applyAuthoritativeTask);

	useEffect(() => {
		const socket = io(import.meta.env.VITE_SERVER_ORIGIN || "http://localhost:4000", {
			transports: ["websocket"],
			autoConnect: true,
		});

		socketRef.current = socket;

		socket.on("connect", () => {
			console.log("[socket] connected", socket.id);
			socket.emit("tasks:fetch");
		});

		socket.on("tasks:initial", (tasks) => {
			setTasks(tasks);
		});

		socket.on("task:added", (task) => {
			addTask(task);
		});

		socket.on("task:moved", ({ task }) => {
			applyAuthoritativeTask(task);
		});

		socket.on("task:updated", ({ task }) => {
			applyAuthoritativeTask(task);
		});

		socket.on("disconnect", (reason) => {
			console.log("[socket] disconnected", reason);
		});

		socket.on("error", (err) => {
			console.error("[socket] error", err);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [setTasks, addTask, applyAuthoritativeTask]);

	const emitAddTask = (task: Partial<Task> & { id: string }) => {
		socketRef.current?.emit("task:add", task);
	};

	const emitMoveTask = (payload: { id: string; toColumn: Task["column"]; toPosition: number }) => {
		socketRef.current?.emit("task:move", payload);
	};

	const emitUpdateTask = (payload: { id: string; title?: string; description?: string }) => {
		socketRef.current?.emit("task:update", payload);
	};

	return {
		emitAddTask,
		emitMoveTask,
		emitUpdateTask,
	};
}
