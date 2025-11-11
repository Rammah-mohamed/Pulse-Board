// server/src/index.ts
import express from "express";
import http from "http";
import { Server as IOServer, Socket } from "socket.io";
import cors from "cors";

type Task = {
	id: string;
	title: string;
	description?: string;
	column: "todo" | "in-progress" | "done";
	createdAt: string;
	updatedAt?: string;
	senderID?: string;
};

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new IOServer(server, {
	cors: {
		origin: "*",
	},
});

const PORT = process.env.PORT || 4000;

// In-memory task store (Phase 1)
let tasks: Task[] = [
	{
		id: "t-1",
		title: "Welcome to PulseBoard",
		description: "This is a sample task",
		column: "todo",
		createdAt: new Date().toISOString(),
	},
];

// Express endpoint to fetch current tasks (useful for initial load)
app.get("/api/tasks", (_req, res) => {
	res.json(tasks);
});

io.on("connection", (socket: Socket) => {
	console.log(`Socket connected: ${socket.id}`);

	// When a client asks for the current tasks (optional)
	socket.on("tasks:fetch", () => {
		socket.emit("tasks:initial", tasks);
	});

	// Add a new task
	socket.on("task:add", (payload: Omit<Task, "createdAt" | "updatedAt">) => {
		// Basic validation
		if (!payload || !payload.id || !payload.title) {
			socket.emit("error", { message: "Invalid task payload" });
			return;
		}

		const { senderID, ...task } = payload;

		const newTask: Task = {
			...task,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Persist in-memory (later: persist to DB)
		tasks.push(newTask);

		// Only broadcast to others
		socket.broadcast.emit("task:added", newTask);
	});

	socket.on("disconnect", (reason) => {
		console.log(`Socket disconnected: ${socket.id} reason: ${reason}`);
	});
});

server.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});
