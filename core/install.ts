/**
 * Soma Install — fetch community content from GitHub
 *
 * Registry is GitHub raw URLs. No server needed.
 * Resolution: local cache → GitHub raw → error
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { SomaDir } from "./discovery.js";

const REPO = "meetsoma/community";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const API_BASE = `https://api.github.com/repos/${REPO}`;

export type ContentType = "protocol" | "muscle" | "skill" | "template";

export interface InstallResult {
	success: boolean;
	type: ContentType;
	name: string;
	path?: string;
	error?: string;
	dependencies?: InstallResult[];
}

export interface RemoteItem {
	name: string;
	type: ContentType;
	tier?: string;
	description?: string;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: { "User-Agent": "soma-cli" },
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	return res.text();
}

async function fetchJson(url: string): Promise<any> {
	const res = await fetch(url, {
		headers: {
			"Accept": "application/vnd.github.v3+json",
			"User-Agent": "soma-cli",
		},
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	return res.json();
}

// ---------------------------------------------------------------------------
// Install single item
// ---------------------------------------------------------------------------

function targetDir(soma: SomaDir, type: ContentType): string {
	const map: Record<ContentType, string> = {
		protocol: "protocols",
		muscle: "memory/muscles",
		skill: "skills",
		template: "templates",
	};
	return join(soma.path, map[type]);
}

export async function installItem(
	soma: SomaDir,
	type: ContentType,
	name: string,
	options: { force?: boolean } = {}
): Promise<InstallResult> {
	const dir = targetDir(soma, type);

	if (type === "template") {
		return installTemplate(soma, name, options);
	}

	// Single file content (protocol, muscle, skill)
	const remoteDir = type === "protocol" ? "protocols" : type === "muscle" ? "muscles" : "skills";
	const localPath = join(dir, `${name}.md`);

	// Check if already exists
	if (existsSync(localPath) && !options.force) {
		return {
			success: false,
			type,
			name,
			path: localPath,
			error: `Already exists. Use --force to overwrite.`,
		};
	}

	try {
		const content = await fetchText(`${RAW_BASE}/${remoteDir}/${name}.md`);
		mkdirSync(dir, { recursive: true });
		writeFileSync(localPath, content, "utf-8");
		return { success: true, type, name, path: localPath };
	} catch (err: any) {
		return {
			success: false,
			type,
			name,
			error: err.message.includes("404") ? `Not found in hub: ${name}` : err.message,
		};
	}
}

// ---------------------------------------------------------------------------
// Install template (manifest + dependencies)
// ---------------------------------------------------------------------------

async function installTemplate(
	soma: SomaDir,
	name: string,
	options: { force?: boolean } = {}
): Promise<InstallResult> {
	const result: InstallResult = {
		success: false,
		type: "template",
		name,
		dependencies: [],
	};

	// Fetch template.json manifest
	let manifest: any;
	try {
		const manifestText = await fetchText(`${RAW_BASE}/templates/${name}/template.json`);
		manifest = JSON.parse(manifestText);
	} catch (err: any) {
		result.error = `Template manifest not found: ${name}`;
		return result;
	}

	// Fetch and write identity.md
	try {
		const identity = await fetchText(`${RAW_BASE}/templates/${name}/identity.md`);
		const identityPath = join(soma.path, "identity.md");
		if (!existsSync(identityPath) || options.force) {
			writeFileSync(identityPath, identity, "utf-8");
		}
	} catch {
		// Identity is optional — template might not have one
	}

	// Fetch and merge settings.json
	try {
		const settingsText = await fetchText(`${RAW_BASE}/templates/${name}/settings.json`);
		const templateSettings = JSON.parse(settingsText);
		const settingsPath = join(soma.path, "settings.json");

		if (existsSync(settingsPath) && !options.force) {
			// Merge: template settings are defaults, existing settings override
			const existing = JSON.parse(readFileSync(settingsPath, "utf-8"));
			const merged = deepMerge(templateSettings, existing);
			writeFileSync(settingsPath, JSON.stringify(merged, null, 2), "utf-8");
		} else {
			writeFileSync(settingsPath, settingsText, "utf-8");
		}
	} catch {
		// Settings are optional
	}

	// Install required dependencies
	const requires = manifest.requires || {};

	for (const type of ["protocol", "muscle", "skill"] as ContentType[]) {
		const pluralKey = type + "s";
		const names: string[] = requires[pluralKey] || [];
		for (const depName of names) {
			const depResult = await installItem(soma, type, depName, options);
			result.dependencies!.push(depResult);
		}
	}

	const allDepsOk = result.dependencies!.every(d => d.success || d.error?.includes("Already exists"));
	result.success = allDepsOk;
	result.path = soma.path;

	if (!allDepsOk) {
		const failed = result.dependencies!.filter(d => !d.success && !d.error?.includes("Already exists"));
		result.error = `Some dependencies failed: ${failed.map(d => d.name).join(", ")}`;
	}

	return result;
}

// ---------------------------------------------------------------------------
// List remote content
// ---------------------------------------------------------------------------

export async function listRemote(type?: ContentType): Promise<RemoteItem[]> {
	const types: ContentType[] = type ? [type] : ["protocol", "muscle", "skill", "template"];
	const items: RemoteItem[] = [];

	for (const t of types) {
		const remoteDir = t === "protocol" ? "protocols" : t === "muscle" ? "muscles" : t === "skill" ? "skills" : "templates";
		try {
			const entries = await fetchJson(`${API_BASE}/contents/${remoteDir}?ref=${BRANCH}`);
			if (!Array.isArray(entries)) continue;

			for (const entry of entries) {
				const name = entry.name.replace(/\.md$/, "");
				if (name === "README" || name === ".gitkeep") continue;
				items.push({ name, type: t });
			}
		} catch {
			// Directory might not exist or API error — skip
		}
	}

	return items;
}

// ---------------------------------------------------------------------------
// List locally installed content
// ---------------------------------------------------------------------------

export interface LocalItem {
	name: string;
	type: ContentType;
	path: string;
}

export function listLocal(soma: SomaDir, type?: ContentType): LocalItem[] {
	const types: ContentType[] = type ? [type] : ["protocol", "muscle", "skill", "template"];
	const items: LocalItem[] = [];

	for (const t of types) {
		const dir = targetDir(soma, t);
		if (!existsSync(dir)) continue;

		const entries = readdirSync(dir) as string[];

		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stat = statSync(fullPath);

			if (stat.isFile() && entry.endsWith(".md")) {
				items.push({ name: entry.replace(/\.md$/, ""), type: t, path: fullPath });
			} else if (stat.isDirectory()) {
				items.push({ name: entry, type: t, path: fullPath });
			}
		}
	}

	return items;
}

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------

function deepMerge(base: any, override: any): any {
	const result = { ...base };
	for (const key of Object.keys(override)) {
		if (
			typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key]) &&
			typeof override[key] === "object" && override[key] !== null && !Array.isArray(override[key])
		) {
			result[key] = deepMerge(result[key], override[key]);
		} else {
			result[key] = override[key];
		}
	}
	return result;
}
