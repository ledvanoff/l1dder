import pc from 'picocolors';

/** Color and glyph palette for CLI output (CL5). */
export interface ColorPalette {
  success(text: string): string;
  warning(text: string): string;
  error(text: string): string;
  info(text: string): string;
  dim(text: string): string;
  bold(text: string): string;
  glyph: {
    pass: string;
    warn: string;
    fail: string;
    info: string;
    arrow: string;
  };
}

/**
 * Create a color palette.
 *
 * When disabled, returns identity functions and ASCII glyphs
 * (safe for piping and non-TTY environments).
 */
export function createColorPalette(enabled: boolean): ColorPalette {
  const identity = (text: string): string => text;

  if (!enabled) {
    return {
      success: identity,
      warning: identity,
      error: identity,
      info: identity,
      dim: identity,
      bold: identity,
      glyph: {
        pass: '[OK]',
        warn: '[WARN]',
        fail: '[FAIL]',
        info: '[INFO]',
        arrow: '->',
      },
    };
  }

  return {
    success: pc.green,
    warning: pc.yellow,
    error: pc.red,
    info: pc.cyan,
    dim: pc.gray,
    bold: pc.bold,
    glyph: {
      pass: pc.green('✓'),
      warn: pc.yellow('⚠'),
      fail: pc.red('✗'),
      info: pc.cyan('ℹ'),
      arrow: pc.cyan('→'),
    },
  };
}

/**
 * Detect whether color output should be enabled (CL5 detection rules).
 *
 * Disabled when: `--no-color`, NO_COLOR env, `--json`, non-TTY, FORCE_COLOR=0.
 * Forced on when: FORCE_COLOR=1/2/3.
 */
export function shouldEnableColor(opts: {
  noColor?: boolean;
  json?: boolean;
}): boolean {
  const forceColor = process.env['FORCE_COLOR'];
  if (forceColor === '0') return false;
  if (forceColor && forceColor !== '0') return true;

  if (opts.noColor) return false;
  if (opts.json) return false;
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (!process.stdout.isTTY) return false;

  return true;
}
