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
	detectProjectSignals,
	protocolMatchesSignals,
	loadProtocolState,
	saveProtocolState,
	bootstrapProtocolState,
	syncProtocolState,
	getProtocolHeat,
	buildProtocolInjection,
	recordHeatEvent,
	applyDecay,
} from "./protocols.js";
export type { Protocol, ProtocolHeatState, ProtocolState, ProtocolInjection, ProjectSignal } from "./protocols.js";

export {
	initSoma,
	resolveTemplateDir,
	detectProjectContext,
	buildSmartIdentity,
} from "./init.js";
export type { InitOptions, ProjectDetection } from "./init.js";

export {
	discoverMuscles,
	discoverMuscleChain,
	buildMuscleInjection,
	trackMuscleLoads,
	bumpMuscleHeat,
	decayMuscleHeat,
} from "./muscles.js";
export type { Muscle, MuscleInjection, MuscleLoadConfig } from "./muscles.js";

export {
	loadSettings,
	loadSettingsFile,
	getDefaultSettings,
} from "./settings.js";
export type { SomaSettings } from "./settings.js";
export { resolveSomaPath } from "./settings.js";

export {
	installItem,
	listRemote,
	listLocal,
} from "./install.js";
export type { ContentType, InstallResult, RemoteItem, LocalItem } from "./install.js";

export {
	compileFrontalCortex,
	clearPromptCache,
} from "./prompt.js";
export {
	compileFullSystemPrompt,
	extractSections,
	extractSkillsBlock,
	extractProjectContext,
	extractDateTimeCwd,
	extractPiDocs,
	isPiDefaultPrompt,
	buildToolSection,
	buildDocsSection,
} from "./prompt.js";
export type { CompiledPrompt, CompileOptions, FullCompileOptions, ExtractedSections } from "./prompt.js";

export {
	discoverAutomations,
	discoverAutomationChain,
	buildAutomationInjection,
	bumpAutomationHeat,
	decayAutomationHeat,
} from "./automations.js";
export type { Automation, AutomationInjection, AutomationLoadConfig } from "./automations.js";

export { safeRead, fmtDuration, extractFrontmatter, extractDigest, parseArrayField, estimateTokens, stripFrontmatter } from "./utils.js";

export { handleContentCommand } from "./content-cli.js";

export { createDebugLogger } from "./debug.js";
export type { DebugLogger } from "./debug.js";
