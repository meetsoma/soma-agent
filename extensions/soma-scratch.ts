/**
 * Soma Scratch — Quick scratchpad for notes
 *
 * Basic version (community/hub):
 *   /scratch <text>  — append timestamped note
 *   /scratch read    — show scratchpad to agent
 *   /scratch clear   — clear scratchpad
 *
 * Extracted from soma-boot.ts for modularity.
 * Pro version adds: named pads, date sections, system prompt injection.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { findSomaDir, loadSettings, getSomaChain, resolveSomaPath } from "../core/index.js";

export default function somaScratch(pi: ExtensionAPI) {
	let somaPath: string | null = null;
	let scratchDir: string | null = null;

	pi.on("session_start", async () => {
		const soma = findSomaDir();
		if (!soma) return;
		const chain = getSomaChain();
		const settings = loadSettings(chain);
		somaPath = soma.path;
		scratchDir = resolveSomaPath(soma.path, "sessions", settings);
	});

	function getScratchPath(): string | null {
		if (!scratchDir) return null;
		return join(scratchDir, "scratchpad.md");
	}

	function ensureDir(path: string) {
		const dir = dirname(path);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	}

	pi.registerCommand("scratch", {
		description: "Quick notes — append to scratchpad without agent seeing it",
		getArgumentCompletions: (prefix) =>
			["read", "clear"].filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o })),
		handler: async (args, ctx) => {
			const scratchPath = getScratchPath();
			if (!scratchPath) {
				ctx.ui.notify("No .soma/ found. Run /soma init first.", "error");
				return;
			}

			const trimmed = args.trim();

			// /scratch read — show to agent
			if (trimmed === "read") {
				if (!existsSync(scratchPath)) {
					ctx.ui.notify("📝 Scratchpad is empty.", "info");
					return;
				}
				const content = readFileSync(scratchPath, "utf-8");
				pi.sendUserMessage(
					`[Scratchpad — ${scratchPath}]\n\n${content}`,
					{ deliverAs: "followUp" }
				);
				return;
			}

			// /scratch clear
			if (trimmed === "clear") {
				if (existsSync(scratchPath)) {
					writeFileSync(scratchPath, "");
					ctx.ui.notify("🗑️ Scratchpad cleared.", "info");
				} else {
					ctx.ui.notify("📝 Scratchpad already empty.", "info");
				}
				return;
			}

			// /scratch (no args) — usage
			if (!trimmed) {
				ctx.ui.notify(
					"Usage:\n" +
					"  /scratch <note>  — append a note (agent won't see it)\n" +
					"  /scratch read    — show scratchpad to agent\n" +
					"  /scratch clear   — empty the scratchpad",
					"info"
				);
				return;
			}

			// /scratch <text> — append
			const timestamp = new Date().toLocaleTimeString("en-US", {
				hour12: false, hour: "2-digit", minute: "2-digit",
			});
			const entry = `- [${timestamp}] ${trimmed}\n`;

			try {
				ensureDir(scratchPath);
				const existing = existsSync(scratchPath) ? readFileSync(scratchPath, "utf-8") : "";
				writeFileSync(scratchPath, existing + entry);
				ctx.ui.notify(`📝 Noted. (${scratchPath.split("/").pop()})`, "info");
			} catch (err: any) {
				ctx.ui.notify(`❌ Failed to write: ${err?.message?.slice(0, 80)}`, "error");
			}
		},
	});
}
