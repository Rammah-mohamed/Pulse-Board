export type ColumnKey = "todo" | "in-progress" | "done";

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
