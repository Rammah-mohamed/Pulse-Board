import express from "express";
import http from "http";
import { Server as IOServer, type Socket } from "socket.io";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

/* ──────────────────────────────────────────────
	CONFIG
────────────────────────────────────────────── */
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/* ──────────────────────────────────────────────
	TYPES
────────────────────────────────────────────── */
type ColumnKey = "todo" | "in-progress" | "done";

export type Task = {
	id: string;
	userId: string;
	title: string;
	description?: string;
	column: ColumnKey;
	position: number;
	createdAt: string;
	updatedAt?: string;
};

interface AuthenticatedSocket extends Socket {
	userId?: string;
}

/* ──────────────────────────────────────────────
	APP + SERVER
────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: "*" } });

/* ──────────────────────────────────────────────
	DATABASE
────────────────────────────────────────────── */
const db = new Database("pulseboard.db");

/* ──────────────────────────────────────────────
	SCHEMA
────────────────────────────────────────────── */
db.prepare(
	`
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT UNIQUE NOT NULL,
		passwordHash TEXT NOT NULL,
		createdAt TEXT NOT NULL
	)
`
).run();

db.prepare(
	`
	CREATE TABLE IF NOT EXISTS tasks (
		id TEXT PRIMARY KEY,
		userId TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		column TEXT NOT NULL,
		position INTEGER NOT NULL,
		createdAt TEXT NOT NULL,
		updatedAt TEXT
	)
`
).run();

/* ──────────────────────────────────────────────
	AUTH ROUTES
────────────────────────────────────────────── */
app.post("/api/auth/register", async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) return res.status(400).json({ message: "Invalid input" });

	const userId = crypto.randomUUID();
	const passwordHash = await bcrypt.hash(password, 10);

	try {
		db.prepare(
			`
			INSERT INTO users (id, email, passwordHash, createdAt)
			VALUES (@id, @email, @passwordHash, @createdAt)
		`
		).run({
			id: userId,
			email,
			passwordHash,
			createdAt: new Date().toISOString(),
		});

		const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
		res.json({ token });
	} catch {
		res.status(400).json({ message: "Email already exists" });
	}
});

app.post("/api/auth/login", async (req, res) => {
	const { email, password } = req.body;

	const user = db.prepare("SELECT * FROM users WHERE email = @email").get({ email }) as any;

	if (!user) return res.status(400).json({ message: "Invalid credentials" });

	const valid = await bcrypt.compare(password, user.passwordHash);
	if (!valid) return res.status(400).json({ message: "Invalid credentials" });

	const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
	res.json({ token });
});

/* ──────────────────────────────────────────────
	HELPERS
────────────────────────────────────────────── */
function normalizeColumn(column: ColumnKey, userId: string) {
	const rows = db
		.prepare(
			`
		SELECT id FROM tasks
		WHERE column = @column AND userId = @userId
		ORDER BY position ASC
	`
		)
		.all({ column, userId }) as { id: string }[];

	const stmt = db.prepare(`
		UPDATE tasks SET position = @position WHERE id = @id
	`);

	rows.forEach((r, index) => {
		stmt.run({ id: r.id, position: index });
	});
}

/* ──────────────────────────────────────────────
	SOCKET AUTH
────────────────────────────────────────────── */
io.use((socket, next) => {
	const token = socket.handshake.auth.token;
	if (!token) return next(new Error("Missing token"));

	try {
		const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
		(socket as AuthenticatedSocket).userId = payload.userId;
		next();
	} catch {
		next(new Error("Invalid token"));
	}
});

/* ──────────────────────────────────────────────
	SOCKET HANDLERS
────────────────────────────────────────────── */
io.on("connection", (socket) => {
	const s = socket as AuthenticatedSocket;
	if (!s.userId) return socket.disconnect();

	const userId = s.userId;
	console.log("[socket] connected:", socket.id, "user:", userId);

	/* ───── FETCH ───── */
	s.on("tasks:fetch", () => {
		const tasks = db
			.prepare(
				`
			SELECT * FROM tasks
			WHERE userId = @userId
			ORDER BY column, position
		`
			)
			.all({ userId }) as Task[];

		s.emit("tasks:initial", tasks);
	});

	/* ───── ADD (IDEMPOTENT) ───── */
	s.on("task:add", (payload: Partial<Task> & { id: string }) => {
		if (!payload.id || !payload.title) return;

		const existing = db
			.prepare(
				`
			SELECT * FROM tasks
			WHERE id = @id AND userId = @userId
		`
			)
			.get({ id: payload.id, userId }) as Task | undefined;

		if (existing) {
			s.emit("task:added", existing);
			return;
		}

		const column: ColumnKey = payload.column || "todo";

		const { c } = db
			.prepare(
				`
			SELECT COUNT(*) as c
			FROM tasks
			WHERE column = @column AND userId = @userId
		`
			)
			.get({ column, userId }) as { c: number };

		const task: Task = {
			id: payload.id,
			userId,
			title: payload.title,
			description: payload.description || "",
			column,
			position: c,
			createdAt: new Date().toISOString(),
		};

		db.prepare(
			`
			INSERT INTO tasks
			(id, userId, title, description, column, position, createdAt)
			VALUES
			(@id, @userId, @title, @description, @column, @position, @createdAt)
		`
		).run(task);

		s.emit("task:added", task);
	});

	/* ───── MOVE (SMOOTH & ATOMIC) ───── */
	s.on("task:move", ({ id, toColumn, toPosition }) => {
		const task = db
			.prepare(
				`
			SELECT * FROM tasks
			WHERE id = @id AND userId = @userId
		`
			)
			.get({ id, userId }) as Task | undefined;

		if (!task) return;
		if (task.column === toColumn && task.position === toPosition) return;

		db.prepare(
			`
			UPDATE tasks
			SET position = position - 1
			WHERE userId = @userId
			  AND column = @column
			  AND position > @position
		`
		).run({
			userId,
			column: task.column,
			position: task.position,
		});

		db.prepare(
			`
			UPDATE tasks
			SET position = position + 1
			WHERE userId = @userId
			  AND column = @column
			  AND position >= @position
		`
		).run({
			userId,
			column: toColumn,
			position: toPosition,
		});

		const updatedAt = new Date().toISOString();

		db.prepare(
			`
			UPDATE tasks
			SET column = @column,
			    position = @position,
			    updatedAt = @updatedAt
			WHERE id = @id
		`
		).run({
			id,
			column: toColumn,
			position: toPosition,
			updatedAt,
		});

		s.emit("task:moved", {
			task: { ...task, column: toColumn, position: toPosition, updatedAt },
		});
	});

	/* ───── UPDATE (FIXED PAYLOAD) ───── */
	s.on("task:update", ({ id, title, description }) => {
		const task = db
			.prepare(
				`
			SELECT * FROM tasks
			WHERE id = @id AND userId = @userId
		`
			)
			.get({ id, userId }) as Task | undefined;

		if (!task) return;

		const updatedAt = new Date().toISOString();

		db.prepare(
			`
			UPDATE tasks
			SET title = @title,
			    description = @description,
			    updatedAt = @updatedAt
			WHERE id = @id
		`
		).run({
			id,
			title: title ?? task.title,
			description: description ?? task.description,
			updatedAt,
		});

		// 🔧 FIX: wrap in { task }
		s.emit("task:updated", {
			task: {
				...task,
				title: title ?? task.title,
				description: description ?? task.description,
				updatedAt,
			},
		});
	});

	/* ───── DELETE (IDEMPOTENT) ───── */
	s.on("task:delete", ({ id }) => {
		const task = db
			.prepare(
				`
			SELECT * FROM tasks
			WHERE id = @id AND userId = @userId
		`
			)
			.get({ id, userId }) as Task | undefined;

		if (!task) {
			s.emit("task:deleted", { id });
			return;
		}

		db.prepare("DELETE FROM tasks WHERE id = @id").run({ id });
		normalizeColumn(task.column, userId);

		s.emit("task:deleted", { id });
	});

	s.on("disconnect", () => {
		console.log("[socket] disconnected:", socket.id);
	});
});

/* ──────────────────────────────────────────────
	START
────────────────────────────────────────────── */
server.listen(PORT, () => {
	console.log(`🚀 Server listening on port ${PORT}`);
});
