// client/src/local-db/indexedDB.ts
import { openDB } from "idb";
import type { Task } from "@/shared/types";

const DB_NAME = "pulseboard";
const DB_VERSION = 1;
const TASK_STORE = "tasks";
const QUEUE_STORE = "queue";

export type QueueItem =
	| { type: "add"; task: Task }
	| { type: "move"; payload: { id: string; toColumn: Task["column"]; toPosition: number } }
	| { type: "update"; payload: { id: string; fields: Partial<Task> } }
	| { type: "delete"; payload: { id: string } };

async function getDb() {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(TASK_STORE)) {
				db.createObjectStore(TASK_STORE, { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains(QUEUE_STORE)) {
				db.createObjectStore(QUEUE_STORE, { keyPath: "qid", autoIncrement: true });
			}
		},
	});
}

// tasks
export async function saveTask(task: Task) {
	const db = await getDb();
	await db.put(TASK_STORE, task);
}

export async function saveTasks(tasks: Task[]) {
	const db = await getDb();
	const tx = db.transaction(TASK_STORE, "readwrite");
	for (const t of tasks) tx.store.put(t);
	await tx.done;
}

export async function getAllTasks(): Promise<Task[]> {
	const db = await getDb();
	return (await db.getAll(TASK_STORE)) as Task[];
}

export async function deleteTask(id: string) {
	const db = await getDb();
	await db.delete(TASK_STORE, id);
}

export async function clearTasks() {
	const db = await getDb();
	await db.clear(TASK_STORE);
}

// queue
export async function enqueue(item: QueueItem) {
	const db = await getDb();
	await db.add(QUEUE_STORE, item as any);
}

export async function getQueue(): Promise<QueueItem[]> {
	const db = await getDb();
	// @ts-ignore - items are stored as plain objects
	return (await db.getAll(QUEUE_STORE)) as QueueItem[];
}

export async function clearQueue() {
	const db = await getDb();
	await db.clear(QUEUE_STORE);
}

export async function removeQueueItemByKey(key: number) {
	const db = await getDb();
	await db.delete(QUEUE_STORE, key);
}
