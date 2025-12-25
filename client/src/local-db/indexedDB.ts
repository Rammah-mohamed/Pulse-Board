// client/src/local-db/indexedDB.ts
import { openDB, type DBSchema } from "idb";
import type { Task } from "@/shared/types";

/* ──────────────────────────────────────────────
	DB CONSTANTS
────────────────────────────────────────────── */
const DB_NAME = "pulseboard";
const DB_VERSION = 5;

const TASK_STORE = "tasks";
const QUEUE_STORE = "queue";

/* ──────────────────────────────────────────────
	QUEUE TYPES
────────────────────────────────────────────── */
export type QueueItem =
	| { type: "add"; userId: string; task: Task }
	| {
			type: "move";
			userId: string;
			payload: { id: string; toColumn: Task["column"]; toPosition: number };
	  }
	| {
			type: "update";
			userId: string;
			payload: { id: string; fields: Partial<Task> };
	  }
	| { type: "delete"; userId: string; payload: { id: string } };

/* ──────────────────────────────────────────────
	DB SCHEMA
────────────────────────────────────────────── */
interface PulseBoardDB extends DBSchema {
	tasks: {
		key: string;
		value: Task;
	};
	queue: {
		key: number;
		value: QueueItem & { qid?: number };
	};
}

/* ──────────────────────────────────────────────
	DB INIT
────────────────────────────────────────────── */
async function getDb() {
	return openDB<PulseBoardDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(TASK_STORE)) {
				db.createObjectStore(TASK_STORE, { keyPath: "id" });
			}

			if (!db.objectStoreNames.contains(QUEUE_STORE)) {
				db.createObjectStore(QUEUE_STORE, {
					keyPath: "qid",
					autoIncrement: true,
				});
			}
		},
	});
}

/* ──────────────────────────────────────────────
	TASK STORE (CACHE ONLY)
────────────────────────────────────────────── */

/**
 * Save or replace a task (authoritative-safe)
 */
export async function saveTask(task: Task) {
	const db = await getDb();
	await db.put(TASK_STORE, task);
}

/**
 * Bulk save (used for tasks:initial)
 * Completely replaces existing cache for those IDs
 */
export async function saveTasks(tasks: Task[]) {
	const db = await getDb();
	const tx = db.transaction(TASK_STORE, "readwrite");

	for (const task of tasks) {
		tx.store.put(task);
	}

	await tx.done;
}

/**
 * Hydration source — must NEVER resurrect deleted tasks
 */
export async function getTasksByUser(userId: string): Promise<Task[]> {
	const db = await getDb();
	const all = await db.getAll(TASK_STORE);
	return all.filter((t) => t.userId === userId);
}

/**
 * Permanent deletion
 */
export async function deleteTaskById(id: string) {
	const db = await getDb();
	await db.delete(TASK_STORE, id);
}

/**
 * Logout / user switch safety
 */
export async function clearTasksForUser(userId: string) {
	const db = await getDb();
	const tx = db.transaction(TASK_STORE, "readwrite");
	const all = await tx.store.getAll();

	for (const task of all) {
		if (task.userId === userId) {
			tx.store.delete(task.id);
		}
	}

	await tx.done;
}

/* ──────────────────────────────────────────────
	QUEUE STORE (OFFLINE ONLY)
────────────────────────────────────────────── */

/**
 * Add offline action
 */
export async function enqueueAction(item: QueueItem) {
	const db = await getDb();
	await db.add(QUEUE_STORE, item);
}

/**
 * Used ONLY by socket replay
 */
export async function getQueueByUser(userId: string) {
	const db = await getDb();
	const all = await db.getAll(QUEUE_STORE);
	return all.filter((q) => q.userId === userId) as (QueueItem & { qid: number })[];
}

/**
 * Remove executed queue item
 */
export async function removeQueueItem(qid: number) {
	const db = await getDb();
	await db.delete(QUEUE_STORE, qid);
}

/**
 * Safety cleanup
 */
export async function clearQueueForUser(userId: string) {
	const db = await getDb();
	const tx = db.transaction(QUEUE_STORE, "readwrite");
	const all = await tx.store.getAll();

	for (const item of all) {
		if (item.userId === userId && item.qid != null) {
			tx.store.delete(item.qid);
		}
	}

	await tx.done;
}
