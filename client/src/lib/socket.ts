// client/src/lib/socket.ts
import type { Task } from "@/shared/types";
import { io, Socket } from "socket.io-client";

// -------- Server → Client events --------
type ServerToClientEvents = {
	"task:added": (task: Task) => void;
	"tasks:initial": (tasks: Task[]) => void;
	"task:moved": (payload: { task: Task }) => void;
	"task:updated": (payload: { task: Task }) => void;
	"task:deleted": (payload: { id: string }) => void; // ⭐ NEW
};

// -------- Client → Server events --------
type ClientToServerEvents = {
	"task:add": (task: Partial<Task> & { id: string }) => void;
	"tasks:fetch": () => void;
	"task:move": (payload: { id: string; toColumn: Task["column"]; toPosition: number }) => void;
	"task:update": (payload: { id: string; title?: string; description?: string }) => void;
	"task:delete": (payload: { id: string }) => void; // ⭐ NEW
};

// -------- Create socket instance --------
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
	import.meta.env.VITE_SERVER_ORIGIN || "http://localhost:4000",
	{
		transports: ["websocket"],
		autoConnect: true,
	}
);
