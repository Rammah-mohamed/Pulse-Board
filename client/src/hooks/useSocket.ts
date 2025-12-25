// client/src/hooks/useSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { Task, ColumnKey } from "@/shared/types";
import { useBoardStore } from "@/store/boardStore";
import { getQueueByUser, removeQueueItem } from "@/local-db/indexedDB";
import { getUserIdFromToken } from "@/helper/token";

type Emitters = {
	emitAddTask: (task: Task) => Promise<void>;
	emitMoveTask: (payload: { id: string; toColumn: ColumnKey; toPosition: number }) => Promise<void>;
	emitUpdateTask: (payload: { id: string; title?: string; description?: string }) => Promise<void>;
	emitDeleteTask: (id: string) => Promise<void>;
};

export function useSocket(): Emitters {
	const socketRef = useRef<Socket | null>(null);

	const { setTasks, applyAuthoritativeTask, deleteTaskLocally, enqueue, hydrateFromIndexedDB } =
		useBoardStore.getState();

	const userId = getUserIdFromToken();
	const token = localStorage.getItem("token");

	// ---------------------------------------------------
	// OFFLINE QUEUE REPLAY
	// ---------------------------------------------------
	const flushQueue = useCallback(async () => {
		if (!userId || !socketRef.current) return;

		const queue = await getQueueByUser(userId);
		if (!queue.length) return;

		console.log(`[socket] Replaying ${queue.length} queued actions`);

		for (const item of queue) {
			try {
				switch (item.type) {
					case "add":
						socketRef.current.emit("task:add", item.task);
						break;
					case "move":
						socketRef.current.emit("task:move", item.payload);
						break;
					case "update":
						socketRef.current.emit("task:update", {
							id: item.payload.id,
							...item.payload.fields,
						});
						break;
					case "delete":
						socketRef.current.emit("task:delete", { id: item.payload.id });
						break;
				}
				await removeQueueItem(item.qid!);
			} catch (err) {
				console.error("[socket] queue replay error", err);
				break;
			}
		}
	}, [userId]);

	// ---------------------------------------------------
	// SOCKET LIFECYCLE (TOKEN-DRIVEN)
	// ---------------------------------------------------
	useEffect(() => {
		hydrateFromIndexedDB().catch(console.error);

		// 🔴 LOGGED OUT → HARD TEARDOWN
		if (!token || !userId) {
			if (socketRef.current) {
				socketRef.current.disconnect();
				socketRef.current = null;
			}
			return;
		}

		const socket = io("http://localhost:4000", {
			auth: { token },
			autoConnect: false,
		});

		socketRef.current = socket;

		socket.on("connect", async () => {
			console.log("[socket] connected", socket.id);
			await flushQueue();
			socket.emit("tasks:fetch");
		});

		socket.on("disconnect", (reason) => {
			console.log("[socket] disconnected:", reason);
		});

		// -------- SERVER → CLIENT (AUTHORITATIVE) --------
		socket.on("tasks:initial", (tasks: Task[]) => setTasks(tasks));
		socket.on("task:added", (task: Task) => applyAuthoritativeTask(task));
		socket.on("task:moved", ({ task }: { task: Task }) => applyAuthoritativeTask(task));
		socket.on("task:updated", ({ task }: { task: Task }) => applyAuthoritativeTask(task));
		socket.on("task:deleted", ({ id }: { id: string }) => deleteTaskLocally(id));

		const handleOnline = async () => {
			if (socket.connected) await flushQueue();
			else socket.connect();
		};

		window.addEventListener("online", handleOnline);
		socket.connect();

		return () => {
			window.removeEventListener("online", handleOnline);
			socket.disconnect();
			socketRef.current = null;
		};
	}, [token, userId, flushQueue]);

	// ---------------------------------------------------
	// EMITTERS (OFFLINE-FIRST)
	// ---------------------------------------------------
	const emitAddTask = async (task: Task) => {
		if (socketRef.current?.connected && navigator.onLine) socketRef.current.emit("task:add", task);
		else if (userId) await enqueue({ type: "add", userId, task });
	};

	const emitMoveTask = async (payload: { id: string; toColumn: ColumnKey; toPosition: number }) => {
		if (socketRef.current?.connected && navigator.onLine)
			socketRef.current.emit("task:move", payload);
		else if (userId) await enqueue({ type: "move", userId, payload });
	};

	const emitUpdateTask = async (payload: { id: string; title?: string; description?: string }) => {
		if (socketRef.current?.connected && navigator.onLine)
			socketRef.current.emit("task:update", payload);
		else if (userId)
			await enqueue({
				type: "update",
				userId,
				payload: {
					id: payload.id,
					fields: { title: payload.title, description: payload.description },
				},
			});
	};

	const emitDeleteTask = async (id: string) => {
		// optimistic UI
		deleteTaskLocally(id);

		if (socketRef.current?.connected && navigator.onLine)
			socketRef.current.emit("task:delete", { id });
		else if (userId) await enqueue({ type: "delete", userId, payload: { id } });
	};

	return { emitAddTask, emitMoveTask, emitUpdateTask, emitDeleteTask };
}
