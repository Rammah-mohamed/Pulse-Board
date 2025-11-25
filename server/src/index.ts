// server/src/index.ts
import express from "express";
import http from "http";
import { Server as IOServer, Socket } from "socket.io";
import cors from "cors";
import Database from "better-sqlite3";

type ColumnKey = "todo" | "in-progress" | "done";

export type Task = {
	id: string;
	title: string;
	description?: string;
	column: ColumnKey;
	position: number;
	createdAt: string;
	updatedAt?: string;
};

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 4000;

// --- SQLite setup ---
const db = new Database("pulseboard.db");

// Create tasks table
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    column TEXT NOT NULL,
    position INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  )
`
).run();

// --- Normalize positions helper ---
function normalizePositions(column: ColumnKey) {
	const tasks: Task[] = db
		.prepare("SELECT * FROM tasks WHERE column = @column ORDER BY position ASC")
		.all({ column });

	const updateStmt = db.prepare("UPDATE tasks SET position = @position WHERE id = @id");

	tasks.forEach((t, idx) => updateStmt.run({ position: idx, id: t.id }));
}

// --- Express endpoint ---
app.get("/api/tasks", (_req, res) => {
	const tasks: Task[] = db.prepare("SELECT * FROM tasks ORDER BY createdAt ASC").all();
	res.json(tasks);
});

// --- Socket.IO ---
io.on("connection", (socket: Socket) => {
	console.log("Socket connected:", socket.id);

	// Fetch initial tasks
	socket.on("tasks:fetch", () => {
		const tasks: Task[] = db.prepare("SELECT * FROM tasks ORDER BY position ASC").all();
		socket.emit("tasks:initial", tasks);
	});

	// Add task
	socket.on("task:add", (payload: Partial<Task> & { id: string }) => {
		if (!payload.id || !payload.title) {
			return socket.emit("error", { message: "Invalid task payload" });
		}

		const column: ColumnKey = (payload.column as ColumnKey) || "todo";

		// Calculate new task position
		const { c: count } = db
			.prepare("SELECT COUNT(*) as c FROM tasks WHERE column = @column")
			.get({ column }) as { c: number };

		const newTask: Task = {
			id: payload.id,
			title: payload.title,
			description: payload.description || "",
			column,
			position: count,
			createdAt: new Date().toISOString(),
		};

		db.prepare(
			`INSERT INTO tasks (id, title, description, column, position, createdAt)
			VALUES (@id, @title, @description, @column, @position, @createdAt)`
		).run(newTask);

		io.emit("task:added", newTask);
	});

	// Move task
	socket.on(
		"task:move",
		({ id, toColumn, toPosition }: { id: string; toColumn: ColumnKey; toPosition: number }) => {
			const task: Task | undefined = db.prepare("SELECT * FROM tasks WHERE id = @id").get({ id });

			if (!task) return;

			const oldColumn = task.column;
			const isSameColumn = oldColumn === toColumn;

			// --- 1. Remove the task from its old column list ---
			const oldColumnTasks: Task[] = db
				.prepare("SELECT * FROM tasks WHERE column = @column ORDER BY position ASC")
				.all({ column: oldColumn });

			const filteredOld = oldColumnTasks.filter((t) => t.id !== id);

			// --- 2. If moving within same column ---
			if (isSameColumn) {
				// Insert the task at the new index
				const safeIndex = Math.max(0, Math.min(toPosition, filteredOld.length));
				filteredOld.splice(safeIndex, 0, task);

				// Rewrite ALL positions in this column correctly
				const updateStmt = db.prepare("UPDATE tasks SET position = @position WHERE id = @id");

				filteredOld.forEach((t, idx) => updateStmt.run({ position: idx, id: t.id }));

				// Update metadata
				task.position = safeIndex;
				task.updatedAt = new Date().toISOString();

				db.prepare("UPDATE tasks SET updatedAt = @updatedAt WHERE id = @id").run({
					updatedAt: task.updatedAt,
					id,
				});

				return io.emit("task:moved", { task });
			}

			// --- 3. If moving to a *different* column ---
			// Normalize old column after removal
			const updateOld = db.prepare("UPDATE tasks SET position = @position WHERE id = @id");
			filteredOld.forEach((t, idx) => updateOld.run({ position: idx, id: t.id }));

			// Fetch tasks in the new column
			const newColumnTasks: Task[] = db
				.prepare("SELECT * FROM tasks WHERE column = @column ORDER BY position ASC")
				.all({ column: toColumn });

			const safeIndex = Math.max(0, Math.min(toPosition, newColumnTasks.length));
			newColumnTasks.splice(safeIndex, 0, task);

			// Rewrite the target column
			const updateNew = db.prepare(
				"UPDATE tasks SET column = @column, position = @position WHERE id = @id"
			);

			newColumnTasks.forEach((t, idx) =>
				updateNew.run({ column: toColumn, position: idx, id: t.id })
			);

			// Update metadata
			task.column = toColumn;
			task.position = safeIndex;
			task.updatedAt = new Date().toISOString();

			db.prepare(
				"UPDATE tasks SET column = @column, position = @position, updatedAt = @updatedAt WHERE id = @id"
			).run({
				column: task.column,
				position: task.position,
				updatedAt: task.updatedAt,
				id: task.id,
			});

			return io.emit("task:moved", { task });
		}
	);

	// Update task
	socket.on(
		"task:update",
		({ id, title, description }: { id: string; title?: string; description?: string }) => {
			const task: Task | undefined = db.prepare("SELECT * FROM tasks WHERE id = @id").get({ id });
			if (!task) return;

			if (title) task.title = title;
			if (description) task.description = description;
			task.updatedAt = new Date().toISOString();

			db.prepare(
				"UPDATE tasks SET title = @title, description = @description, updatedAt = @updatedAt WHERE id = @id"
			).run({
				title: task.title,
				description: task.description,
				updatedAt: task.updatedAt,
				id: task.id,
			});

			io.emit("task:updated", { task });
		}
	);

	socket.on("task:delete", ({ id }: { id: string }) => {
		const task: Task | undefined = db.prepare("SELECT * FROM tasks WHERE id = @id").get({ id });
		if (!task) return;

		// delete from DB
		db.prepare("DELETE FROM tasks WHERE id = @id").run({ id });

		// normalize positions in old column
		normalizePositions(task.column);

		// broadcast deletion
		io.emit("task:deleted", { id });
	});

	socket.on("disconnect", (reason) =>
		console.log(`Socket disconnected: ${socket.id} reason: ${reason}`)
	);
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
