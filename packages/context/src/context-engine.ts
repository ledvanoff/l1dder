/**
 * ContextEngine — facade for the Context Injection pipeline (CE10).
 *
 * Methods: resolve(), inspect(), allocate(), render(), brief(), detectHandoff().
 * AS-12 implements resolve() and inspect(). AS-13 adds the rest.
 */

import type { WorkflowPosition, FileSystemPort, ClockPort } from '@l1dder/core';
import type { ContextConfig, LanguageCode } from '@l1dder/schemas';
import type { TokenCounterPort } from './ports/token-counter.js';
import type {
  ContextProfile,
  ContextInspection,
  TokenBudget,
  AllocatedProfile,
  RenderedContext,
  BriefResult,
  HandoffDetection,
} from './domain/types.js';
import { resolveProfile } from './features/resolve/resolve.js';
import { allocate } from './features/allocate/allocate.js';
import { renderContext } from './features/render/renderer.js';
import {
  buildBrief,
  type BuildBriefOptions,
} from './features/brief/brief-builder.js';
import { detectHandoff } from './features/handoff/handoff-detector.js';
import { CharBasedTokenCounter } from './adapters/char-based-token-counter.js';
import { estimateCategoryTokens } from './domain/constants.js';

/** Dependencies injected into ContextEngine. */
export interface ContextEngineDeps {
  readonly fs: FileSystemPort;
  readonly clock: ClockPort;
  readonly config: ContextConfig;
  readonly projectRoot?: string;
  readonly tokenCounter?: TokenCounterPort;
}

const DEFAULT_ROLE = 'developer';

/**
 * Context Injection Engine — assembles context for LLM prompts.
 *
 * Pipeline: resolve → allocate → render (three phases, CE1).
 * Created via static factory `ContextEngine.create()`.
 */
export class ContextEngine {
  private readonly fs: FileSystemPort;
  private readonly clock: ClockPort;
  private readonly config: ContextConfig;
  private readonly projectRoot: string;
  private readonly tokenCounter: TokenCounterPort;

  private constructor(deps: ContextEngineDeps) {
    this.fs = deps.fs;
    this.clock = deps.clock;
    this.config = deps.config;
    this.projectRoot = deps.projectRoot ?? '';
    this.tokenCounter = deps.tokenCounter ?? new CharBasedTokenCounter(deps.config.chars_per_token);
  }

  /**
   * Factory method — creates a ContextEngine instance with validated config.
   */
  static create(deps: ContextEngineDeps): ContextEngine {
    return new ContextEngine(deps);
  }

  /**
   * Phase 1: Resolve context profile for given position and role.
   *
   * Pure computation — no file I/O. Returns ordered list of entries
   * with their intended include modes.
   */
  resolve(position: WorkflowPosition, role?: string): ContextProfile {
    return resolveProfile(position, role ?? DEFAULT_ROLE, this.config);
  }

  /**
   * Inspect resolved profile — returns entry list with token estimates.
   *
   * No file I/O: estimates are based on approximate sizes per category.
   * Useful for `l1dder status` and `l1dder doctor`.
   */
  inspect(position: WorkflowPosition, role?: string): ContextInspection {
    const resolvedRole = role ?? DEFAULT_ROLE;
    const profile = this.resolve(position, resolvedRole);

    const estimatedTotalTokens = profile.entries.reduce((sum, entry) => {
      if (entry.mode === 'exclude') return sum;
      return sum + estimateCategoryTokens(entry.mode, entry.category);
    }, 0);

    return {
      entries: profile.entries,
      estimatedTotalTokens,
      phase: position.phase,
      role: resolvedRole,
      stage: position.stage,
    };
  }

  /** Compute token budget from config. */
  computeBudget(): TokenBudget {
    return {
      total: this.config.token_budget,
      reserved: this.config.reserved_tokens,
      effective: this.config.token_budget - this.config.reserved_tokens,
    };
  }

  /** Access the configured token counter. */
  getTokenCounter(): TokenCounterPort {
    return this.tokenCounter;
  }

  /** Access the file system port. */
  getFileSystem(): FileSystemPort {
    return this.fs;
  }

  /** Access the clock port. */
  getClock(): ClockPort {
    return this.clock;
  }

  /** Access the context config. */
  getConfig(): ContextConfig {
    return this.config;
  }

  /**
   * Phase 2: Allocate token budget across resolved profile entries.
   *
   * Reads file sizes, applies three-tier trimming (comfortable/tight/critical).
   * Priority 1-2 entries are never excluded.
   */
  async allocate(position: WorkflowPosition, role?: string): Promise<AllocatedProfile> {
    const profile = this.resolve(position, role);
    const budget = this.computeBudget();
    return allocate(profile, budget, this.tokenCounter, this.fs);
  }

  /**
   * Full pipeline: resolve → allocate → read files → render.
   *
   * Produces the final context string with static/dynamic zones,
   * SHA-256 hash of static zone, and metadata.
   *
   * @param chatLanguage - Optional chat language; when set, prepends a
   *   deterministic "Communicate with the user in …" directive to the
   *   static zone (cache-safe, IL T-05).
   */
  async render(
    position: WorkflowPosition,
    role?: string,
    chatLanguage?: LanguageCode,
  ): Promise<RenderedContext> {
    const resolvedRole = role ?? DEFAULT_ROLE;
    const allocated = await this.allocate(position, resolvedRole);

    const contents = new Map<string, string>();
    for (const entry of allocated.entries) {
      if (entry.allocatedMode === 'exclude') continue;
      try {
        const content = await this.fs.readFile(entry.path);
        contents.set(entry.path, content);
      } catch {
        // Missing files handled gracefully by renderer (placeholder comment)
      }
    }

    return renderContext(allocated, contents, {
      position,
      role: resolvedRole,
      clock: this.clock,
      ...(chatLanguage ? { chatLanguage } : {}),
    });
  }

  /**
   * Generate a compact project brief (~150-200 lines).
   *
   * Phase-independent: always produces the same sections structure.
   * Uses extractSummary for each knowledge file.
   *
   * Pass `options.projection` (mapped from `WorkflowProjectionService`) so
   * Workflow Status claims cannot contradict runtime (DF-025). Wiring the
   * real projection is the CLI caller's responsibility.
   */
  async brief(options?: BuildBriefOptions): Promise<BriefResult> {
    return buildBrief(
      this.fs,
      this.tokenCounter,
      this.clock,
      this.projectRoot,
      options,
    );
  }

  /**
   * Detect and validate `.l1dder/handoff.md`.
   *
   * Returns detection result — the caller decides whether to include
   * handoff content in the context.
   */
  async detectHandoff(): Promise<HandoffDetection> {
    return detectHandoff(this.fs, this.projectRoot);
  }
}

