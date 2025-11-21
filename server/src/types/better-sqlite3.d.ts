declare module "better-sqlite3" {
	type RunResult = { changes: number; lastInsertROWID: number };
	interface Statement {
		run(params?: Record<string, any>): RunResult;
		all(params?: Record<string, any>): any[];
		get(params?: Record<string, any>): any;
	}

	interface Database {
		prepare(sql: string): Statement;
	}

	const DatabaseConstructor: {
		new (filename: string, options?: { verbose?: (...args: any[]) => void }): Database;
	};

	export default DatabaseConstructor;
}
