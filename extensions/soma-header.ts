/**
 * Soma Header Extension
 *
 * Branded startup header replacing Pi's default.
 * Shows σῶμα logotype, memory status, and compact keybinding hints.
 */

import { existsSync } from "fs";
import { join } from "path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { findSomaDir, hasPreload, hasIdentity, discoverProtocols } from "../core/index.js";

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

					const BRAND = truecolor ? "\x1b[1;38;2;124;156;255m" : "\x1b[1;38;5;111m";
					const BRAND_DIM = truecolor ? "\x1b[38;2;90;120;200m" : "\x1b[38;5;68m";
					const WARM = truecolor ? "\x1b[38;2;200;180;140m" : "\x1b[38;5;180m";
					const MUTED = truecolor ? "\x1b[38;2;120;130;150m" : "\x1b[38;5;245m";
					const DIM = truecolor ? "\x1b[38;2;80;85;100m" : "\x1b[38;5;240m";

					const logo = `${BRAND}σῶμα${RESET}`;
					const tagline = `${WARM}the body that grows around you${RESET}`;

					// Memory status — uses core discovery
					const soma = findSomaDir();
					const dots: string[] = [];

					if (soma) {
						if (hasIdentity(soma)) dots.push(`${BRAND}●${RESET} ${MUTED}identity${RESET}`);
						if (hasPreload(soma)) dots.push(`${BRAND}●${RESET} ${MUTED}preload${RESET}`);
						if (existsSync(join(soma.path, "memory"))) dots.push(`${BRAND}●${RESET} ${MUTED}memory${RESET}`);

						const protocols = discoverProtocols(soma);
						if (protocols.length > 0) dots.push(`${BRAND}●${RESET} ${MUTED}${protocols.length} protocols${RESET}`);
					}

					if (dots.length === 0) dots.push(`${DIM}○ empty — will grow${RESET}`);

					const memoryLine = dots.join(`${DIM}  ·  ${RESET}`);
					const keys = `${DIM}esc${RESET}${MUTED} interrupt${RESET}  ${DIM}ctrl+l${RESET}${MUTED} clear${RESET}  ${DIM}/${RESET}${MUTED} commands${RESET}  ${DIM}!${RESET}${MUTED} bash${RESET}`;
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
