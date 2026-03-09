/**
 * Soma Core
 *
 * The minimal runtime that makes Soma work. Everything else is a plugin.
 *
 * Modules:
 *   discovery  — find .soma/ directories (project, parent, global)
 *   identity   — load and layer identity files
 *   preload    — session resumption via preload files
 *   protocols  — behavioral rules, heat tracking, system prompt injection
 *   init       — scaffold new .soma/ directories
 *   utils      — shared helpers
 */

export {
	findSomaDir,
	findParentSomaDir,
	findGlobalSomaDir,
	getSomaChain,
	DEFAULT_ROOT,
	SCAN_ORDER,
	MARKERS,
} from "./discovery.js";
export type { SomaDir } from "./discovery.js";

export {
	loadIdentity,
	loadIdentityChain,
	buildLayeredIdentity,
	hasIdentity,
} from "./identity.js";
export type { IdentityInfo } from "./identity.js";

export {
	findPreload,
	hasPreload,
} from "./preload.js";
export type { PreloadInfo } from "./preload.js";

export {
	discoverProtocols,
	discoverProtocolChain,
	loadProtocolState,
	saveProtocolState,
	bootstrapProtocolState,
	syncProtocolState,
	getProtocolHeat,
	buildProtocolInjection,
	recordHeatEvent,
	applyDecay,
} from "./protocols.js";
export type { Protocol, ProtocolHeatState, ProtocolState, ProtocolInjection } from "./protocols.js";

export {
	initSoma,
} from "./init.js";
export type { InitOptions } from "./init.js";

export { safeRead, fmtDuration } from "./utils.js";
