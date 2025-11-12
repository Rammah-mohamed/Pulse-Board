// server/src/index.ts
import express from "express";
import http from "http";
import { Server as IOServer, Socket } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

type ColumnKey = "todo" | "in-progress" | "done";

type Task = {
	id: string;
	title: string;
	description?: string;
	column: ColumnKey;
	position: number; // numeric ordering within column (smaller -> top)
	createdAt: string;
	updatedAt?: string;
};

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new IOServer(server, {
	cors: { origin: "*" },
});

const PORT = process.env.PORT || 4000;

// initial tasks with positions
let tasks: Task[] = [
	{
		id: "t-1",
		title: "Welcome to PulseBoard",
		description: "Drag me across columns",
		column: "todo",
		position: 0,
		createdAt: new Date().toISOString(),
	},
	{
		id: "t-2",
		title: "Set up Phase 2",
		description: "Drag & drop + optimistic updates",
		column: "todo",
		position: 1,
		createdAt: new Date().toISOString(),
	},
];

function normalizePositionsForColumn(column: ColumnKey) {
	const columnTasks = tasks
		.filter((t) => t.column === column)
		.sort((a, b) => a.position - b.position);
	columnTasks.forEach((t, idx) => (t.position = idx));
}

// Express endpoint
app.get("/api/tasks", (_req, res) => {
	res.json(tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
});

io.on("connection", (socket: Socket) => {
	console.log(`Socket connected: ${socket.id}`);

	socket.on("tasks:fetch", () => {
		socket.emit("tasks:initial", tasks);
	});

	// Add a new task
	socket.on("task:add", (payload: Partial<Task> & { id: string }) => {
		if (!payload || !payload.id || !payload.title) {
			socket.emit("error", { message: "Invalid task payload" });
			return;
		}

		const column = (payload.column as ColumnKey) || "todo";
		// position at the end of column
		const pos = tasks.filter((t) => t.column === column).length;

		const newTask: Task = {
			id: payload.id,
			title: payload.title,
			description: payload.description || "",
			column,
			position: pos,
			createdAt: new Date().toISOString(),
		};

		tasks.push(newTask);
		io.emit("task:added", newTask);
	});

	// Move a task (client optimistic; server authoritative)
	// Payload: { id, toColumn, toPosition, movedBy (optional) }
	socket.on("task:move", (payload: { id: string; toColumn: ColumnKey; toPosition: number }) => {
		const { id, toColumn, toPosition } = payload;
		const t = tasks.find((x) => x.id === id);
		if (!t) {
			socket.emit("error", { message: "Task not found" });
			return;
		}

		// Remove from old column by collapsing positions
		const oldColumn = t.column;
		// set to new column & temporary position
		t.column = toColumn;
		t.position = toPosition;

		// After setting, we need to re-normalize positions in both affected columns
		normalizePositionsForColumn(oldColumn);
		normalizePositionsForColumn(toColumn);

		t.updatedAt = new Date().toISOString();

		// Broadcast authoritative moved event (full task payload)
		io.emit("task:moved", { task: t });
	});

	// Update a task (title/description)
	socket.on("task:update", (payload: { id: string; title?: string; description?: string }) => {
		const { id, title, description } = payload;
		const t = tasks.find((x) => x.id === id);
		if (!t) {
			socket.emit("error", { message: "Task not found" });
			return;
		}
		if (typeof title === "string") t.title = title;
		if (typeof description === "string") t.description = description;
		t.updatedAt = new Date().toISOString();

		io.emit("task:updated", { task: t });
	});

	socket.on("disconnect", (reason) => {
		console.log(`Socket disconnected: ${socket.id} reason: ${reason}`);
	});
});

server.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});
