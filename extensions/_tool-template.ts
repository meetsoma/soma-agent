/**
 * Tool Template — copy this to create a custom tool.
 *
 * Rename the file, update the tool name/description/schema,
 * and implement the handler. The tool will be available to the
 * model on next session boot.
 *
 * Docs: pi.registerTool() registers a tool that the model can call.
 * The handler receives validated params and returns a string result.
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function myToolExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "MyTool",
		description: "Describe what this tool does — the model reads this to decide when to use it.",
		parameters: Type.Object({
			input: Type.String({ description: "What to process" }),
			// Add more params as needed:
			// count: Type.Number({ description: "How many results" }),
			// verbose: Type.Optional(Type.Boolean({ description: "Show details" })),
		}),
		execute: async ({ input }, _ctx) => {
			// Your tool logic here.
			// Can use Node.js APIs, spawn processes, fetch URLs, read files, etc.
			// Return a string — this is what the model sees as the tool result.

			return `Processed: ${input}`;
		},
	});
}
