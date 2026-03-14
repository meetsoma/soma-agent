/**
 * Soma Scratch — Persistent thought capture that bridges sessions
 *
 * Free tier (ships with Soma):
 *   /scratch <text>       — append timestamped note with session ID
 *   /scratch read         — show scratchpad to agent
 *   /scratch clear        — clear scratchpad
 *   /scratch done <n>     — mark note #n as completed
 *   /scratch park <n>     — park note #n (kept but not injected)
 *   /scratch activate <n> — reactivate a parked/done note
 *
 * Features:
 *   - Session ID tagging (last 6 chars) on every note
 *   - Date sections (auto-grouped under ## YYYY-MM-DD)
 *   - Note lifecycle (active → done | parked)
 *   - Auto-inject active notes into next session after preload
 *   - Router capabilities for cross-extension access
 *
 * Pro version extends: named pads, smart injection modes, statusline count,
 * agent hooks, pad analytics. See soma-scratch-pro.ts.
 *
 * Router capabilities provided:
 *   scratch:read     — get full scratchpad content
 *   scratch:append   — programmatically add a note
 *   scratch:active   — get array of active notes (for injection)
 *   scratch:count    — get count of active notes (for statusline)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { findSomaDir, loadSettings, getSomaChain, resolveSomaPath } from "../core/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScratchNote {
	index: number;
	time: string;
	text: string;
	sessionId: string;
	status: "active" | "done" | "parked";
	date: string;
	raw: string;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function somaScratch(pi: ExtensionAPI) {
	let somaPath: string | null = null;
	let scratchDir: string | null = null;
	let injectedThisSession = false;

	// ── Bootstrap ──

	pi.on("session_start", async () => {
		const soma = findSomaDir();
		if (!soma) return;
		const chain = getSomaChain();
		const settings = loadSettings(chain);
		somaPath = soma.path;
		scratchDir = resolveSomaPath(soma.path, "sessions", settings);

		// Register router capabilities
		provideToRouter();

		// Auto-inject active notes (after preload, on first session)
		if (!injectedThisSession) {
			injectedThisSession = true;
			const notes = getActiveNotes();
			if (notes.length > 0) {
				const block = `## 📝 Scratch Notes\n\n` +
					`You have ${notes.length} active note(s) from previous sessions. Consider how they apply:\n\n` +
					notes.map(n => `- ${n.text} *(session: ${n.sessionId}, ${n.date})*`).join("\n");
				// Small delay to let preload inject first
				setTimeout(() => {
					pi.sendUserMessage(block, { deliverAs: "followUp" });
				}, 500);
			}
		}
	});

	// ── Paths ──

	function getScratchPath(): string | null {
		if (!scratchDir) return null;
		return join(scratchDir, "scratchpad.md");
	}

	function ensureDir(path: string) {
		const dir = dirname(path);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	}

	// ── Session ID ──

	function getSessionId(): string {
		const route = (globalThis as any).__somaRoute;
		const getter = route?.get("session:id");
		const id = getter?.();
		return id ? id.slice(-6) : "??????";
	}

	// ── Time helpers ──

	function today(): string {
		return new Date().toISOString().split("T")[0];
	}

	function timestamp(): string {
		return new Date().toLocaleTimeString("en-US", {
			hour12: false, hour: "2-digit", minute: "2-digit",
		});
	}

	// ── Note parsing ──

	function parseNotes(content: string): ScratchNote[] {
		const notes: ScratchNote[] = [];
		let currentDate = "";
		let index = 0;

		for (const line of content.split("\n")) {
			// Date header
			const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})/);
			if (dateMatch) {
				currentDate = dateMatch[1];
				continue;
			}

			// Note line: - [HH:MM] text <!-- sid:XXXXXX status:STATUS -->
			const noteMatch = line.match(/^- \[(\d{2}:\d{2})\] (.+?)(?:\s*<!--\s*sid:(\w+)(?:\s+status:(\w+))?\s*-->)?$/);
			if (noteMatch) {
				index++;
				const [, time, rawText, sid, status] = noteMatch;
				// Strip markdown formatting from done/parked notes for clean text
				let text = rawText;
				if (text.startsWith("~~") && text.endsWith("~~")) text = text.slice(2, -2);
				if (text.startsWith("*") && text.endsWith("*") && !text.startsWith("**")) text = text.slice(1, -1);

				notes.push({
					index,
					time,
					text,
					sessionId: sid || "??????",
					status: (status as ScratchNote["status"]) || "active",
					date: currentDate,
					raw: line,
				});
			}
		}
		return notes;
	}

	function getActiveNotes(): ScratchNote[] {
		const path = getScratchPath();
		if (!path || !existsSync(path)) return [];
		const content = readFileSync(path, "utf-8");
		return parseNotes(content).filter(n => n.status === "active");
	}

	// ── Note formatting ──

	function formatNote(text: string, status: "active" | "done" | "parked", sid: string): string {
		const ts = timestamp();
		switch (status) {
			case "done":
				return `- [${ts}] ~~${text}~~ <!-- sid:${sid} status:done -->`;
			case "parked":
				return `- [${ts}] *${text}* <!-- sid:${sid} status:parked -->`;
			default:
				return `- [${ts}] ${text} <!-- sid:${sid} -->`;
		}
	}

	// ── Date-sectioned append ──

	function appendWithDate(filePath: string, entry: string): void {
		ensureDir(filePath);
		const existing = existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
		const header = `## ${today()}`;

		if (existing.includes(header)) {
			// Find the date section and append within it
			const idx = existing.indexOf(header);
			const afterHeader = existing.indexOf("\n", idx);
			const nextSection = existing.indexOf("\n## ", afterHeader + 1);
			const insertAt = nextSection === -1 ? existing.length : nextSection;
			const updated = existing.slice(0, insertAt).trimEnd() + "\n" + entry + "\n" +
				(nextSection !== -1 ? "\n" + existing.slice(nextSection) : "");
			writeFileSync(filePath, updated);
		} else {
			// New date section at the top
			const block = `${header}\n\n${entry}\n`;
			writeFileSync(filePath, existing ? block + "\n" + existing : block);
		}
	}

	// ── Update note status ──

	function updateNoteStatus(noteIndex: number, newStatus: "done" | "parked" | "active"): { success: boolean; note?: ScratchNote } {
		const path = getScratchPath();
		if (!path || !existsSync(path)) return { success: false };

		const content = readFileSync(path, "utf-8");
		const notes = parseNotes(content);
		const note = notes.find(n => n.index === noteIndex);
		if (!note) return { success: false };

		// Rebuild the line with new status
		let newLine: string;
		const sid = note.sessionId;
		switch (newStatus) {
			case "done":
				newLine = `- [${note.time}] ~~${note.text}~~ <!-- sid:${sid} status:done -->`;
				break;
			case "parked":
				newLine = `- [${note.time}] *${note.text}* <!-- sid:${sid} status:parked -->`;
				break;
			case "active":
				newLine = `- [${note.time}] ${note.text} <!-- sid:${sid} -->`;
				break;
		}

		const updated = content.replace(note.raw, newLine);
		writeFileSync(path, updated);
		return { success: true, note: { ...note, status: newStatus } };
	}

	// ── Router capabilities ──

	function provideToRouter() {
		const route = (globalThis as any).__somaRoute;
		if (!route) return;

		route.provide("scratch:read", () => {
			const path = getScratchPath();
			if (!path || !existsSync(path)) return "";
			return readFileSync(path, "utf-8");
		}, {
			provider: "soma-scratch",
			description: "Get full scratchpad content as string",
		});

		route.provide("scratch:append", (text: string) => {
			const path = getScratchPath();
			if (!path) return false;
			const sid = getSessionId();
			const entry = formatNote(text, "active", sid);
			appendWithDate(path, entry);
			return true;
		}, {
			provider: "soma-scratch",
			description: "Programmatically append a note (from any extension)",
		});

		route.provide("scratch:active", () => {
			return getActiveNotes();
		}, {
			provider: "soma-scratch",
			description: "Get array of active (non-done, non-parked) notes",
		});

		route.provide("scratch:count", () => {
			return getActiveNotes().length;
		}, {
			provider: "soma-scratch",
			description: "Get count of active notes (for statusline)",
		});
	}

	// ── Command ──

	pi.registerCommand("scratch", {
		description: "Quick notes — append to scratchpad with session tracking",
		getArgumentCompletions: (prefix) => {
			const completions = ["read", "clear", "done", "park", "activate", "notes"];
			return completions
				.filter(o => o.startsWith(prefix))
				.map(o => ({ value: o, label: o }));
		},

		handler: async (args, ctx) => {
			const scratchPath = getScratchPath();
			if (!scratchPath) {
				ctx.ui.notify("No .soma/ found. Run /soma init first.", "error");
				return;
			}

			const trimmed = args.trim();

			// ── /scratch read ──
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

			// ── /scratch clear ──
			if (trimmed === "clear") {
				if (existsSync(scratchPath)) {
					writeFileSync(scratchPath, "");
					ctx.ui.notify("🗑️ Scratchpad cleared.", "info");
				} else {
					ctx.ui.notify("📝 Scratchpad already empty.", "info");
				}
				return;
			}

			// ── /scratch notes — show numbered list ──
			if (trimmed === "notes") {
				if (!existsSync(scratchPath)) {
					ctx.ui.notify("📝 Scratchpad is empty.", "info");
					return;
				}
				const notes = parseNotes(readFileSync(scratchPath, "utf-8"));
				if (!notes.length) {
					ctx.ui.notify("📝 No notes.", "info");
					return;
				}
				const lines = notes.map(n => {
					const icon = n.status === "done" ? "✅" : n.status === "parked" ? "⏸️" : "📝";
					return `  ${icon} #${n.index} [${n.time}] ${n.text} (${n.sessionId})`;
				});
				ctx.ui.notify(`📋 Notes:\n${lines.join("\n")}`, "info");
				return;
			}

			// ── /scratch done <n> ──
			if (trimmed.startsWith("done")) {
				const n = parseInt(trimmed.slice(4).trim());
				if (isNaN(n)) {
					ctx.ui.notify("Usage: /scratch done <note-number>. Use /scratch notes to see numbers.", "info");
					return;
				}
				const result = updateNoteStatus(n, "done");
				if (result.success) {
					ctx.ui.notify(`✅ Note #${n} done: ${result.note?.text?.slice(0, 60)}`, "info");
				} else {
					ctx.ui.notify(`❌ Note #${n} not found. Use /scratch notes.`, "error");
				}
				return;
			}

			// ── /scratch park <n> ──
			if (trimmed.startsWith("park")) {
				const n = parseInt(trimmed.slice(4).trim());
				if (isNaN(n)) {
					ctx.ui.notify("Usage: /scratch park <note-number>. Use /scratch notes to see numbers.", "info");
					return;
				}
				const result = updateNoteStatus(n, "parked");
				if (result.success) {
					ctx.ui.notify(`⏸️ Note #${n} parked: ${result.note?.text?.slice(0, 60)}`, "info");
				} else {
					ctx.ui.notify(`❌ Note #${n} not found. Use /scratch notes.`, "error");
				}
				return;
			}

			// ── /scratch activate <n> ──
			if (trimmed.startsWith("activate")) {
				const n = parseInt(trimmed.slice(8).trim());
				if (isNaN(n)) {
					ctx.ui.notify("Usage: /scratch activate <note-number>.", "info");
					return;
				}
				const result = updateNoteStatus(n, "active");
				if (result.success) {
					ctx.ui.notify(`📝 Note #${n} reactivated: ${result.note?.text?.slice(0, 60)}`, "info");
				} else {
					ctx.ui.notify(`❌ Note #${n} not found.`, "error");
				}
				return;
			}

			// ── /scratch (no args) — usage ──
			if (!trimmed) {
				const activeCount = getActiveNotes().length;
				ctx.ui.notify(
					`📝 Scratchpad (${activeCount} active notes)\n\n` +
					"  /scratch <note>       — append a note (agent won't see it)\n" +
					"  /scratch read         — show scratchpad to agent\n" +
					"  /scratch notes        — numbered list with status\n" +
					"  /scratch done <n>     — mark note #n as completed\n" +
					"  /scratch park <n>     — park note (kept, not injected)\n" +
					"  /scratch activate <n> — reactivate a parked/done note\n" +
					"  /scratch clear        — empty the scratchpad",
					"info"
				);
				return;
			}

			// ── /scratch <text> — append with date section + session ID ──
			const sid = getSessionId();
			const entry = formatNote(trimmed, "active", sid);

			try {
				appendWithDate(scratchPath, entry);
				ctx.ui.notify(`📝 Noted. (sid:${sid})`, "info");
			} catch (err: any) {
				ctx.ui.notify(`❌ Failed to write: ${err?.message?.slice(0, 80)}`, "error");
			}
		},
	});
}
