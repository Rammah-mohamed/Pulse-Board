// client/src/hooks/useSocket.ts
import { useEffect } from "react";
import type { Task, ColumnKey } from "@/shared/types";
import { useBoardStore } from "@/store/boardStore";
import { socket } from "@/lib/socket";
import { getQueue, clearQueue } from "@/local-db/indexedDB";

export function useSocket() {
	const setTasks = useBoardStore((s) => s.setTasks);
	const addTaskLocally = useBoardStore((s) => s.addTask);
	const moveTaskLocally = useBoardStore((s) => s.moveTaskLocally);
	const updateTaskLocally = useBoardStore((s) => s.updateTaskLocally);
	const deleteTaskLocally = useBoardStore((s) => s.deleteTask);
	const applyAuthoritativeTask = useBoardStore((s) => s.applyAuthoritativeTask);
	const enqueueAction = useBoardStore((s) => s.enqueueAction);
	const hydrateFromIndexedDB = useBoardStore((s) => s.hydrateFromIndexedDB);
	const flushLocalQueueToMemory = useBoardStore((s) => s.flushLocalQueueToMemory);

	const flushPersistedQueueAndClear = async () => {
		try {
			await flushLocalQueueToMemory();
			const persisted = await getQueue();
			if (persisted?.length) {
				console.log("[socket] replaying persisted queue:", persisted.length);
				for (const item of persisted) {
					switch (item.type) {
						case "add":
							socket.emit("task:add", item.task);
							break;
						case "move":
							socket.emit("task:move", item.payload);
							break;
						case "update":
							socket.emit("task:update", { id: item.payload.id, ...item.payload.fields });
							break;
						case "delete":
							socket.emit("task:delete", { id: item.payload.id });
							break;
					}
				}
				await clearQueue();
				await flushLocalQueueToMemory(); // reset in-memory mirror
			}
		} catch (err) {
			console.error("[socket] error flushing persisted queue", err);
		}
	};

	useEffect(() => {
		// hydrate local cache for offline-first
		hydrateFromIndexedDB().catch((e) => console.error("hydrate error", e));

		// remove old listeners
		socket.off("tasks:initial");
		socket.off("task:added");
		socket.off("task:moved");
		socket.off("task:updated");
		socket.off("task:deleted");
		socket.off("connect");
		socket.off("disconnect");

		// socket listeners
		socket.on("connect", async () => {
			console.log("[socket] connected:", socket.id);
			await flushPersistedQueueAndClear();
			socket.emit("tasks:fetch");
		});

		socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));

		socket.on("tasks:initial", (tasks: Task[]) => {
			console.log("[socket] tasks:initial received", tasks.length);
			setTasks(tasks);
		});

		socket.on("task:added", (task: Task) => applyAuthoritativeTask(task));
		socket.on("task:moved", ({ task }: { task: Task }) => applyAuthoritativeTask(task));
		socket.on("task:updated", ({ task }: { task: Task }) => applyAuthoritativeTask(task));
		socket.on("task:deleted", ({ id }: { id: string }) => deleteTaskLocally(id));

		// network events
		const handleOnline = () => {
			console.log("[network] online — attempting queue flush");
			if (socket.connected) flushPersistedQueueAndClear();
			else socket.connect();
		};
		const handleOffline = () => console.log("[network] offline — changes will queue");

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [setTasks, applyAuthoritativeTask, hydrateFromIndexedDB, flushLocalQueueToMemory]);

	// --- emitters (offline-first) ---
	const emitAddTask = async (task: Task) => {
		addTaskLocally(task);
		if (socket.connected && navigator.onLine) socket.emit("task:add", task);
		else await enqueueAction({ type: "add", task } as any);
	};

	const emitMoveTask = async (payload: { id: string; toColumn: ColumnKey; toPosition: number }) => {
		moveTaskLocally(payload.id, payload.toColumn, payload.toPosition);
		if (socket.connected && navigator.onLine) socket.emit("task:move", payload);
		else await enqueueAction({ type: "move", payload } as any);
	};

	const emitUpdateTask = async (payload: { id: string; title?: string; description?: string }) => {
		updateTaskLocally(payload.id, { title: payload.title, description: payload.description });
		if (socket.connected && navigator.onLine) socket.emit("task:update", payload);
		else
			await enqueueAction({
				type: "update",
				payload: {
					id: payload.id,
					fields: { title: payload.title, description: payload.description },
				},
			} as any);
	};

	const emitDeleteTask = async (id: string) => {
		deleteTaskLocally(id);
		if (socket.connected && navigator.onLine) socket.emit("task:delete", { id });
		else await enqueueAction({ type: "delete", payload: { id } } as any);
	};

	return { emitAddTask, emitMoveTask, emitUpdateTask, emitDeleteTask };
}
