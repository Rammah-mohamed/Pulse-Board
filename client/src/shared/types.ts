export type Task = {
	id: string;
	title: string;
	description?: string;
	column: "todo" | "in-progress" | "done";
	createdAt: string;
	updatedAt?: string;
	senderID?: string;
};
