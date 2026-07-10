import { join } from 'node:path';

import type { Phase, WorkflowPosition } from '@l1dder/core';
import type { BriefResult } from '@l1dder/context';

import type { CliContext } from '../context.js';
import {
  ExitCode,
  mapErrorToExitCode,
  errorToCode,
  errorToHint,
} from '../output/exit-codes.js';
import {
  copyToClipboard,
  ClipboardUnavailableError,
} from '../adapters/clipboard.js';

/** Options parsed from `l1dder context` flags. */
interface ContextOptions {
  copy?: boolean;
  file?: boolean | string;
  full?: boolean;
  role?: string;
  phase?: string;
}

/** Result returned by executeContext. */
interface ContextResult {
  exitCode: number;
  data?: unknown;
  humanText?: string;
  error?: { code: string; message: string; hint?: string };
}

/**
 * Execute `l1dder context` — output project context brief or full rendered context.
 *
 * Modes:
 * - Default: brief to stdout
 * - --copy: brief to clipboard
 * - --file [path]: brief to file (default .l1dder/context-brief.md)
 * - --full: full rendered context (combinable with --copy / --file)
 */
export async function executeContext(
  ctx: CliContext,
  opts: ContextOptions,
): Promise<ContextResult> {
  if (opts.copy && opts.file && !opts.full) {
    return {
      exitCode: ExitCode.USAGE_ERROR,
      error: {
        code: 'USAGE_ERROR',
        message:
          'Cannot use --copy and --file together. Choose one output mode.',
      },
    };
  }

  try {
    const engine = await ctx.contextEngine();

    if (opts.full) {
      return await executeFullMode(ctx, engine, opts);
    }

    return await executeBriefMode(ctx, engine, opts);
  } catch (e) {
    if (e instanceof ClipboardUnavailableError) {
      return {
        exitCode: ExitCode.GENERIC_ERROR,
        error: {
          code: e.code,
          message: e.message,
          hint: 'Use --file instead of --copy.',
        },
      };
    }
    const exitCode = mapErrorToExitCode(e);
    const hint = errorToHint(e);
    return {
      exitCode,
      error: {
        code: errorToCode(e),
        message: (e as Error).message,
        ...(hint ? { hint } : {}),
      },
    };
  }
}

async function executeFullMode(
  ctx: CliContext,
  engine: Awaited<ReturnType<CliContext['contextEngine']>>,
  opts: ContextOptions,
): Promise<ContextResult> {
  const sm = await ctx.state();
  let position: WorkflowPosition = sm.currentPosition();

  if (opts.phase) {
    position = { ...position, phase: opts.phase as Phase };
  }

  const chatLanguage = sm.configSnapshot().language.chat;
  const rendered = await engine.render(position, opts.role, chatLanguage);
  const content = rendered.content;

  if (opts.copy) {
    await copyToClipboard(content);
    return {
      exitCode: ExitCode.SUCCESS,
      data: {
        content,
        token_estimate: rendered.metadata.totalTokens,
        char_count: content.length,
        sections: [],
      },
      humanText: `${ctx.colors.glyph.pass} Full context copied to clipboard (~${rendered.metadata.totalTokens.toLocaleString()} tokens)`,
    };
  }

  if (opts.file) {
    const filePath =
      typeof opts.file === 'string'
        ? opts.file
        : join(ctx.cwd, '.l1dder', 'context-brief.md');
    await ctx.fs.writeFile(filePath, content);
    return {
      exitCode: ExitCode.SUCCESS,
      data: {
        content,
        token_estimate: rendered.metadata.totalTokens,
        char_count: content.length,
        sections: [],
      },
      humanText: `${ctx.colors.glyph.pass} Full context saved to ${filePath}`,
    };
  }

  return {
    exitCode: ExitCode.SUCCESS,
    data: {
      content,
      token_estimate: rendered.metadata.totalTokens,
      char_count: content.length,
      sections: [],
    },
    humanText: content,
  };
}

async function executeBriefMode(
  ctx: CliContext,
  engine: Awaited<ReturnType<CliContext['contextEngine']>>,
  opts: ContextOptions,
): Promise<ContextResult> {
  const brief = await engine.brief();
  const content = brief.content;

  if (opts.copy) {
    await copyToClipboard(content);
    return {
      exitCode: ExitCode.SUCCESS,
      data: buildBriefData(brief),
      humanText: `${ctx.colors.glyph.pass} Brief copied to clipboard (~${brief.tokenEstimate.toLocaleString()} tokens est.)`,
    };
  }

  if (opts.file) {
    const filePath =
      typeof opts.file === 'string'
        ? opts.file
        : join(ctx.cwd, '.l1dder', 'context-brief.md');
    await ctx.fs.writeFile(filePath, content);
    return {
      exitCode: ExitCode.SUCCESS,
      data: buildBriefData(brief),
      humanText: `${ctx.colors.glyph.pass} Brief saved to ${filePath}`,
    };
  }

  const lines: string[] = [];
  lines.push('───────── Project Brief ─────────');
  lines.push('');
  lines.push(content);
  lines.push('');
  lines.push(
    `Token estimate: ~${brief.tokenEstimate.toLocaleString()} | Sections: ${String(brief.sections.length)}`,
  );

  return {
    exitCode: ExitCode.SUCCESS,
    data: buildBriefData(brief),
    humanText: lines.join('\n'),
  };
}

function buildBriefData(brief: BriefResult): {
  content: string;
  token_estimate: number;
  char_count: number;
  sections: string[];
} {
  return {
    content: brief.content,
    token_estimate: brief.tokenEstimate,
    char_count: brief.content.length,
    sections: brief.sections.map((s) => s.title),
  };
}
