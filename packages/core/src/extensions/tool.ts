/**
 * Metadata describing a registered tool.
 *
 * Zod validation schema for this interface lives in `@l1dder/schemas`
 * (core is a leaf package with no Zod dependency).
 */
export interface ToolMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
}

/**
 * Runtime context provided to a tool when it executes.
 *
 * Injected by the framework — tools should not construct this themselves.
 */
export interface ToolContext {
  readonly cwd: string;
  readonly verbose: boolean;
}

/**
 * A tool that can be registered in the ToolRegistry.
 *
 * Tools are the extension point for custom commands and integrations (P2).
 * In MVP, only the registry skeleton is provided — actual tools come later.
 */
export interface Tool<Input = unknown, Output = unknown> {
  readonly meta: ToolMetadata;
  execute(input: Input, context: ToolContext): Promise<Output>;
}
