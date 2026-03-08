/**
 * Soma Header Extension
 *
 * Branded startup header replacing Pi's default.
 * Shows σῶμα logotype, memory status, and compact keybinding hints.
 */

import { existsSync, readdirSync } from "fs";
import { join, resolve, basename, dirname } from "path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

// ---------------------------------------------------------------------------
// Path resolution (matches soma-boot.ts)
// ---------------------------------------------------------------------------

const AGENT_DIR = getAgentDir();
const CONFIG_DIR = basename(dirname(AGENT_DIR)); // ".soma"
const MARKERS = ["STATE.md", "identity.md", "memory"];

function findSomaDir(): string | null {
	let dir = process.cwd();
	const root = resolve("/");
	while (dir !== root) {
		const candidate = join(dir, CONFIG_DIR);
		if (existsSync(candidate) && MARKERS.some(m => existsSync(join(candidate, m)))) {
			return candidate;
		}
		dir = resolve(dir, "..");
	}
	return null;
}

function findPreload(somaDir: string): boolean {
	const dirs = [somaDir, join(somaDir, "memory")];
	for (const dir of dirs) {
		try {
			const files = readdirSync(dir).filter(f => f.startsWith("preload-") && f.endsWith(".md"));
			if (files.length > 0) return true;
		} catch {}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function somaHeaderExtension(pi: ExtensionAPI) {

	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setHeader((tui, theme) => {
			return {
				invalidate() {},
				dispose() {},
				render(width: number): string[] {
					const RESET = "\x1b[0m";
					const truecolor = theme.getColorMode() === "truecolor";

					// Soma brand colors — soft blue/indigo palette
					const BRAND = truecolor ? "\x1b[1;38;2;124;156;255m" : "\x1b[1;38;5;111m";
					const BRAND_DIM = truecolor ? "\x1b[38;2;90;120;200m" : "\x1b[38;5;68m";
					const WARM = truecolor ? "\x1b[38;2;200;180;140m" : "\x1b[38;5;180m";
					const MUTED = truecolor ? "\x1b[38;2;120;130;150m" : "\x1b[38;5;245m";
					const DIM = truecolor ? "\x1b[38;2;80;85;100m" : "\x1b[38;5;240m";

					// Logo
					const logo = `${BRAND}σῶμα${RESET}`;
					const tagline = `${WARM}the body that grows around you${RESET}`;

					// Memory status
					const somaDir = findSomaDir();
					const hasIdentity = somaDir ? existsSync(join(somaDir, "identity.md")) : false;
					const hasPreload = somaDir ? findPreload(somaDir) : false;
					const hasMemory = somaDir ? existsSync(join(somaDir, "memory")) : false;

					const dots: string[] = [];
					if (hasIdentity) dots.push(`${BRAND}●${RESET} ${MUTED}identity${RESET}`);
					if (hasPreload) dots.push(`${BRAND}●${RESET} ${MUTED}preload${RESET}`);
					if (hasMemory) dots.push(`${BRAND}●${RESET} ${MUTED}memory${RESET}`);
					if (dots.length === 0) dots.push(`${DIM}○ empty — will grow${RESET}`);

					const memoryLine = dots.join(`${DIM}  ·  ${RESET}`);

					// Keybinding hints
					const keys = `${DIM}esc${RESET}${MUTED} interrupt${RESET}  ${DIM}ctrl+l${RESET}${MUTED} clear${RESET}  ${DIM}/${RESET}${MUTED} commands${RESET}  ${DIM}!${RESET}${MUTED} bash${RESET}`;

					// Border
					const border = `${BRAND_DIM}${"─".repeat(Math.min(width - 2, 50))}${RESET}`;

					return [
						"",
						`  ${logo}  ${DIM}·${RESET}  ${tagline}`,
						`  ${memoryLine}`,
						`  ${keys}`,
						`  ${border}`,
						"",
					];
				},
			};
		});
	});
}
