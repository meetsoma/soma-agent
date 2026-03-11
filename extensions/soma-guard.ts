/**
 * Soma Guard — Safe file operation enforcement
 *
 * Intercepts destructive tool calls before execution:
 * - `write` to existing files without prior `read` → warns or blocks
 * - `bash` with rm -rf, rm on critical paths → confirms with user
 * - `write` to files over a size threshold → confirms with user
 *
 * This is the protocol-to-script graduation of the "safe-file-ops" muscle.
 * The muscle teaches the pattern. This extension enforces it.
 *
 * Pi hooks used:
 * - tool_call: intercept before execution, can block
 * - tool_result: track reads for the "read before write" guard
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, statSync } from "fs";

export default function somaGuard(pi: ExtensionAPI) {
	// --- State ---

	/** Paths the agent has read this session (read before write tracking) */
	const readPaths = new Set<string>();

	/** Paths the agent has listed (ls'd) this session */
	const listedDirs = new Set<string>();

	/** How many writes were blocked or warned */
	let guardEvents = 0;

	// --- Configuration ---

	/** Files over this many bytes trigger a confirmation before overwrite */
	const LARGE_FILE_THRESHOLD = 5000; // ~150 lines

	/** Critical paths that should never be written without confirmation */
	const CRITICAL_PATTERNS = [
		/\.soma\/identity\.md$/,
		/\.soma\/STATE\.md$/,
		/\.soma\/protocols\//,
		/\.env$/,
		/settings\.json$/,
		/settings\.local\.json$/,
		/package\.json$/,
		/tsconfig\.json$/,
	];

	/** Paths where writes are always safe (no guard needed) */
	const SAFE_WRITE_PATTERNS = [
		/preload-next\.md$/,
		/\.soma\/memory\/sessions\//,
		/\/review\//,
		/\/_archive\//,
		/\/node_modules\//,
	];

	/** Dangerous bash patterns */
	const DANGEROUS_BASH = [
		/rm\s+-rf?\s+[^\s]/,
		/rm\s+.*\.(ts|js|md|json|sh)\b/,
		/>\s*\//, // redirect to root
		/git\s+push\s+.*--force/,
		/git\s+reset\s+--hard/,
		/git\s+clean\s+-fd/,
	];

	// --- Helpers ---

	function normalizePath(p: string): string {
		// Resolve ~ and make comparable
		if (p.startsWith("~/")) {
			p = (process.env.HOME || "") + p.slice(1);
		}
		return p;
	}

	function isSafeWrite(path: string): boolean {
		return SAFE_WRITE_PATTERNS.some((pat) => pat.test(path));
	}

	function isCriticalPath(path: string): boolean {
		return CRITICAL_PATTERNS.some((pat) => pat.test(path));
	}

	function dirOf(path: string): string {
		const parts = path.split("/");
		parts.pop();
		return parts.join("/");
	}

	// --- Track reads ---

	pi.on("tool_result", async (event) => {
		if (event.isError) return;

		const toolName = event.toolName;
		const input = event.input as any;

		// Track file reads
		if (toolName === "read" && input?.path) {
			readPaths.add(normalizePath(input.path));
		}

		// Track directory listings (bash ls, find, etc.)
		if (toolName === "bash" && input?.command) {
			const cmd = input.command;
			// Extract paths from ls commands
			const lsMatch = cmd.match(/\bls\s+(?:-\S+\s+)*([^\s|;>&]+)/);
			if (lsMatch) {
				listedDirs.add(normalizePath(lsMatch[1]));
			}
		}
	});

	// --- Intercept writes ---

	pi.on("tool_call", async (event, ctx) => {
		const toolName = event.toolName;
		const input = event.input as any;

		// === WRITE GUARD ===
		if (toolName === "write" && input?.path) {
			const path = normalizePath(input.path);

			// Skip safe paths
			if (isSafeWrite(path)) return;

			const hasRead = readPaths.has(path);
			const dirListed = listedDirs.has(dirOf(path));
			const fileExists = existsSync(path);
			let existingSize = 0;
			if (fileExists) {
				try { existingSize = statSync(path).size; } catch {}
			}

			// Critical path — always confirm
			if (isCriticalPath(path)) {
				if (!ctx.hasUI) {
					return { block: true, reason: `Blocked write to critical file (no UI to confirm): ${path}` };
				}
				const detail = fileExists
					? `Existing file: ${existingSize} bytes. Writing will replace all content.`
					: `New file at a critical path.`;
				const ok = await ctx.ui.confirm(
					"⚠️ Critical file write",
					`${path}\n\n${detail}\n\nConfirm?`
				);
				if (!ok) {
					guardEvents++;
					return { block: true, reason: `Blocked write to critical file: ${path}` };
				}
				return;
			}

			// Overwriting a large existing file without reading it first
			if (fileExists && !hasRead && existingSize > LARGE_FILE_THRESHOLD) {
				if (!ctx.hasUI) {
					return { block: true, reason: `Blocked overwrite of unread ${existingSize}-byte file (no UI): ${path}` };
				}
				const ok = await ctx.ui.confirm(
					"⚠️ Overwriting unread file",
					`${path}\n\nThis file exists (${existingSize} bytes / ~${Math.round(existingSize / 33)} lines) and was NOT read this session.\n\nThe write tool will replace ALL content. Consider using edit for surgical changes.\n\nContinue?`
				);
				if (!ok) {
					guardEvents++;
					return { block: true, reason: `Blocked overwrite of unread ${existingSize}-byte file: ${path}` };
				}
			}

			// Overwriting any existing file without reading — lighter warning
			if (fileExists && !hasRead && !dirListed && existingSize <= LARGE_FILE_THRESHOLD && ctx.hasUI) {
				ctx.ui.notify(
					`📝 Overwriting ${path} (${existingSize}b, not read first)`,
					"info"
				);
			}

			// New file — no guard needed, just track
			if (!fileExists) {
				// All good — creating a new file
			}
		}

		// === BASH GUARD ===
		if (toolName === "bash" && input?.command) {
			const cmd = input.command;

			for (const pattern of DANGEROUS_BASH) {
				if (pattern.test(cmd)) {
					if (!ctx.hasUI) {
						guardEvents++;
						return { block: true, reason: `Blocked dangerous command (no UI): ${cmd.slice(0, 80)}` };
					}
					const ok = await ctx.ui.confirm(
						"⚠️ Dangerous command",
						`${cmd}\n\nThis command could cause data loss. Continue?`
					);
					if (!ok) {
						guardEvents++;
						return { block: true, reason: `Blocked dangerous command: ${cmd.slice(0, 80)}` };
					}
					break; // Only prompt once even if multiple patterns match
				}
			}
		}
	});

	// --- Status ---

	pi.registerCommand("guard-status", {
		description: "Show guard statistics",
		handler: async (_args, ctx) => {
			if (ctx.hasUI) {
				ctx.ui.notify(
					`🛡️ Guard: ${readPaths.size} reads tracked, ${listedDirs.size} dirs listed, ${guardEvents} interventions`,
					"info"
				);
			}
		},
	});
}
