// client/src/hooks/useSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Task } from "@/shared/types";

type ServerToClientEvents = {
	"task:added": (task: Task) => void;
	"tasks:initial": (tasks: Task[]) => void;
};

type ClientToServerEvents = {
	"task:add": (task: Partial<Task> & { id: string }) => void;
	"tasks:fetch": () => void;
};

export function useSocket(
	onTaskAdded: (task: Task) => void,
	onInitialLoad?: (tasks: Task[]) => void
) {
	const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

	// Memoize the handlers to prevent re-renders breaking the connection
	const stableOnTaskAdded = useCallback(onTaskAdded, []);
	const stableOnInitialLoad = useCallback(onInitialLoad ?? (() => {}), []);

	useEffect(() => {
		const socket = io(import.meta.env.VITE_SERVER_ORIGIN || "http://localhost:4000", {
			transports: ["websocket"],
			autoConnect: true,
		});

		socketRef.current = socket;

		socket.on("connect", () => {
			console.log("✅ Socket connected", socket.id);
			socket.emit("tasks:fetch");
		});

		socket.on("tasks:initial", (tasks) => {
			console.log("📦 Received initial tasks:", tasks.length);
			stableOnInitialLoad && stableOnInitialLoad(tasks);
		});

		socket.on("task:added", (task) => {
			console.log("🧩 Task added via socket", task.title);
			stableOnTaskAdded(task);
		});

		socket.on("disconnect", (reason) => {
			console.warn("⚠️ Socket disconnected:", reason);
		});

		socket.on("error", (err) => {
			console.error("❌ Socket error", err);
		});

		return () => {
			console.log("🧹 Cleaning up socket");
			socket.disconnect();
			socketRef.current = null;
		};
	}, [stableOnTaskAdded, stableOnInitialLoad]);

	const emitAddTask = useCallback((task: Partial<Task> & { id: string }) => {
		socketRef.current?.emit("task:add", { ...task, senderID: socketRef.current.id });
	}, []);

	return { emitAddTask };
}
