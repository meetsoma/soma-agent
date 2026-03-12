/**
 * Soma Content CLI — non-interactive content management commands
 *
 * Handles: soma content install <type> <name> [--force]
 *          soma content list [--remote] [--local] [--type <type>]
 *          soma content search <query>
 *
 * Also: soma init --template <name>
 */

import { findSomaDir, initSoma } from "./discovery.js";
import { installItem, listRemote, listLocal, type ContentType } from "./install.js";

const VALID_TYPES: ContentType[] = ["protocol", "muscle", "skill", "template", "automation"];

function isValidType(t: string): t is ContentType {
	return VALID_TYPES.includes(t as ContentType);
}

function printUsage(): void {
	console.log(`
Usage:
  soma init [--orphan|-o] [--template <name>] [--force]
  soma install <type> <name> [--force]
  soma list [--remote] [--local] [--type <type>]

Types: protocol, muscle, skill, template, automation

Flags:
  --orphan, -o    Initialize without inheriting from parent .soma/
  --force         Overwrite existing content on install
  --template      Apply a template during init

Examples:
  soma init                              # initialize with parent inheritance
  soma init --orphan                     # standalone, no parent inheritance
  soma init -o --template architect      # orphan + template
  soma install protocol breath-cycle     # install from hub
  soma list --remote                     # browse available content
`);
}

/**
 * Handle `soma content ...` commands.
 * Returns true if the command was handled (caller should exit).
 */
export async function handleContentCommand(args: string[]): Promise<boolean> {
	// soma init [--template <name>] [--orphan|-o] [--force]
	if (args[0] === "init") {
		const orphan = args.includes("--orphan") || args.includes("-o");
		const force = args.includes("--force");

		if (args.includes("--template")) {
			const idx = args.indexOf("--template");
			const templateName = args[idx + 1];
			if (!templateName) {
				console.error("Error: --template requires a name");
				return true;
			}
			return await handleInitTemplate(templateName, force, orphan);
		}

		// Plain init: soma init [--orphan]
		return handleInit(orphan);
	}

	// Direct commands: soma install ..., soma list ...
	if (args[0] === "install") {
		return await handleInstall(args.slice(1));
	}
	if (args[0] === "list") {
		return await handleList(args.slice(1));
	}

	// Namespaced: soma content install ..., soma content list ...
	if (args[0] !== "content") return false;

	const subCommand = args[1];

	if (!subCommand || subCommand === "help" || subCommand === "--help") {
		printUsage();
		return true;
	}

	switch (subCommand) {
		case "install":
			return await handleInstall(args.slice(2));
		case "list":
			return await handleList(args.slice(2));
		default:
			console.error(`Unknown content command: ${subCommand}`);
			printUsage();
			return true;
	}
}

async function handleInstall(args: string[]): Promise<boolean> {
	const type = args[0];
	const name = args[1];
	const force = args.includes("--force");

	if (!type || !name) {
		console.error("Error: soma content install <type> <name>");
		return true;
	}

	if (!isValidType(type)) {
		console.error(`Error: invalid type "${type}". Must be one of: ${VALID_TYPES.join(", ")}`);
		return true;
	}

	const cwd = process.cwd();
	let soma = findSomaDir(cwd);

	if (!soma) {
		// Auto-init .soma/ if not found
		console.log("No .soma/ found — initializing...");
		try {
			initSoma(cwd);
		} catch (err: any) {
			console.error(`Failed to initialize .soma/: ${err.message}`);
			return true;
		}
		soma = findSomaDir(cwd);
		if (!soma) {
			console.error("Failed to locate .soma/ after init");
			return true;
		}
	}

	console.log(`Installing ${type}: ${name}...`);
	const result = await installItem(soma, type, name, { force });

	if (result.success) {
		console.log(`✓ Installed ${type} "${name}" → ${result.path}`);
		if (result.dependencies?.length) {
			for (const dep of result.dependencies) {
				const icon = dep.success ? "✓" : dep.error?.includes("Already exists") ? "·" : "✗";
				console.log(`  ${icon} ${dep.type}: ${dep.name}${dep.error ? ` (${dep.error})` : ""}`);
			}
		}
	} else {
		console.error(`✗ Failed to install ${type} "${name}": ${result.error}`);
		if (result.dependencies?.length) {
			for (const dep of result.dependencies) {
				if (!dep.success && !dep.error?.includes("Already exists")) {
					console.error(`  ✗ ${dep.type}: ${dep.name} — ${dep.error}`);
				}
			}
		}
	}

	return true;
}

async function handleList(args: string[]): Promise<boolean> {
	const isRemote = args.includes("--remote");
	const isLocal = args.includes("--local");
	const typeIdx = args.indexOf("--type");
	const typeFilter = typeIdx >= 0 ? args[typeIdx + 1] : undefined;

	if (typeFilter && !isValidType(typeFilter)) {
		console.error(`Error: invalid type "${typeFilter}". Must be one of: ${VALID_TYPES.join(", ")}`);
		return true;
	}

	const type = typeFilter as ContentType | undefined;

	// Default: show both if neither specified
	const showRemote = isRemote || !isLocal;
	const showLocal = isLocal || !isRemote;

	if (showLocal) {
		const cwd = process.cwd();
		const soma = findSomaDir(cwd);
		if (soma) {
			const items = listLocal(soma, type);
			console.log(`\n📁 Local (.soma/):`);
			if (items.length === 0) {
				console.log("  (none)");
			} else {
				const grouped = groupBy(items, i => i.type);
				for (const [t, group] of Object.entries(grouped)) {
					console.log(`  ${t}s:`);
					for (const item of group) {
						console.log(`    · ${item.name}`);
					}
				}
			}
		} else if (isLocal) {
			console.log("\nNo .soma/ found in this directory.");
		}
	}

	if (showRemote) {
		console.log(`\n🌐 Hub (meetsoma/community):`);
		try {
			const items = await listRemote(type);
			if (items.length === 0) {
				console.log("  (none)");
			} else {
				const grouped = groupBy(items, i => i.type);
				for (const [t, group] of Object.entries(grouped)) {
					console.log(`  ${t}s:`);
					for (const item of group) {
						console.log(`    · ${item.name}`);
					}
				}
			}
		} catch (err: any) {
			console.error(`  Error fetching remote list: ${err.message}`);
		}
	}

	console.log();
	return true;
}

function handleInit(orphan: boolean): boolean {
	const cwd = process.cwd();
	const existing = findSomaDir(cwd);
	if (existing) {
		console.log(`Soma already initialized at ${existing.path}`);
		return true;
	}

	try {
		const somaPath = initSoma(cwd, {
			inheritFromParent: !orphan,
		});
		console.log(`🌱 Soma planted at ${somaPath}`);
		if (orphan) {
			console.log(`   (orphan mode — no parent inheritance)`);
		}
		console.log(`\nRun \`soma\` to start your agent session.`);
	} catch (err: any) {
		console.error(`Failed to initialize: ${err.message}`);
	}
	return true;
}

async function handleInitTemplate(name: string, force: boolean, orphan: boolean = false): Promise<boolean> {
	const cwd = process.cwd();

	// Init .soma/ first
	console.log(`Initializing Soma with template: ${name}${orphan ? " (orphan)" : ""}...`);
	try {
		initSoma(cwd, { inheritFromParent: !orphan });
	} catch (err: any) {
		console.error(`Failed to initialize .soma/: ${err.message}`);
		return true;
	}

	const soma = findSomaDir(cwd);
	if (!soma) {
		console.error("Failed to locate .soma/ after init");
		return true;
	}

	// Install the template
	const result = await installItem(soma, "template", name, { force });

	if (result.success) {
		console.log(`✓ Initialized with template "${name}"`);
		if (result.dependencies?.length) {
			for (const dep of result.dependencies) {
				const icon = dep.success ? "✓" : dep.error?.includes("Already exists") ? "·" : "✗";
				console.log(`  ${icon} ${dep.type}: ${dep.name}`);
			}
		}
		console.log(`\nRun \`soma\` to start your agent session.`);
	} else {
		console.error(`✗ Template "${name}" failed: ${result.error}`);
	}

	return true;
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
	const result: Record<string, T[]> = {};
	for (const item of items) {
		const k = key(item);
		(result[k] ??= []).push(item);
	}
	return result;
}
