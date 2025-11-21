// server/src/index.ts
import express from "express";
import http from "http";
import { Server as IOServer, Socket } from "socket.io";
import cors from "cors";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

type ColumnKey = "todo" | "in-progress" | "done";

type Task = {
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

// --- Initialize SQLite ---
const db = new Database("pulseboard.db");

// Create tasks table if not exists
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
		.prepare(`SELECT * FROM tasks WHERE column = @column ORDER BY position ASC`)
		.all({ column });

	tasks.forEach((t, idx) => {
		db.prepare(`UPDATE tasks SET position = @position WHERE id = @id`).run({
			position: idx,
			id: t.id,
		});
	});
}

// --- Express endpoint ---
app.get("/api/tasks", (_req, res) => {
	const tasks: Task[] = db.prepare(`SELECT * FROM tasks ORDER BY createdAt ASC`).all();
	res.json(tasks);
});

// --- Socket.IO ---
io.on("connection", (socket: Socket) => {
	console.log("Socket connected:", socket.id);

	socket.on("tasks:fetch", () => {
		const tasks: Task[] = db.prepare(`SELECT * FROM tasks ORDER BY position ASC`).all();
		socket.emit("tasks:initial", tasks);
	});

	// Add task
	socket.on("task:add", (payload: Partial<Task> & { id: string }) => {
		if (!payload.id || !payload.title) return socket.emit("error", { message: "Invalid task" });

		const column = (payload.column as ColumnKey) || "todo";

		const countResult = db
			.prepare(`SELECT COUNT(*) as c FROM tasks WHERE column = @column`)
			.get({ column }) as { c: number };

		const newTask: Task = {
			id: payload.id,
			title: payload.title,
			description: payload.description || "",
			column,
			position: countResult.c,
			createdAt: new Date().toISOString(),
		};

		db.prepare(
			`
      INSERT INTO tasks (id, title, description, column, position, createdAt)
      VALUES (@id, @title, @description, @column, @position, @createdAt)
    `
		).run(newTask);

		io.emit("task:added", newTask);
	});

	// Move task
	socket.on(
		"task:move",
		({ id, toColumn, toPosition }: { id: string; toColumn: ColumnKey; toPosition: number }) => {
			const task: Task | undefined = db.prepare(`SELECT * FROM tasks WHERE id = @id`).get({ id });

			if (!task) return;

			task.column = toColumn;

			// Get other tasks in the column
			const columnTasks: Task[] = db
				.prepare(`SELECT * FROM tasks WHERE column = @column AND id != @id ORDER BY position ASC`)
				.all({ column: toColumn, id });

			const safeIndex = Math.max(0, Math.min(toPosition, columnTasks.length));
			columnTasks.splice(safeIndex, 0, task);

			// Update positions in DB
			columnTasks.forEach((t, idx) => {
				db.prepare(`UPDATE tasks SET position = @position, column = @column WHERE id = @id`).run({
					position: idx,
					column: t.column,
					id: t.id,
				});
			});

			task.updatedAt = new Date().toISOString();
			db.prepare(
				`UPDATE tasks SET column = @column, position = @position, updatedAt = @updatedAt WHERE id = @id`
			).run({
				column: task.column,
				position: safeIndex,
				updatedAt: task.updatedAt,
				id: task.id,
			});

			io.emit("task:moved", { task });
		}
	);

	// Update task
	socket.on(
		"task:update",
		({ id, title, description }: { id: string; title?: string; description?: string }) => {
			const task: Task | undefined = db.prepare(`SELECT * FROM tasks WHERE id = @id`).get({ id });
			if (!task) return;

			if (title) task.title = title;
			if (description) task.description = description;
			task.updatedAt = new Date().toISOString();

			db.prepare(
				`UPDATE tasks SET title = @title, description = @description, updatedAt = @updatedAt WHERE id = @id`
			).run({
				title: task.title,
				description: task.description,
				updatedAt: task.updatedAt,
				id: task.id,
			});

			io.emit("task:updated", { task });
		}
	);

	socket.on("disconnect", (reason) =>
		console.log(`Socket disconnected: ${socket.id} reason: ${reason}`)
	);
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
