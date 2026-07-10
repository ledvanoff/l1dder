import { describe, expect, it } from 'vitest';

import { createColorPalette } from './colors.js';

describe('createColorPalette', () => {
  it('disabled palette returns ASCII glyphs', () => {
    const palette = createColorPalette(false);
    expect(palette.glyph.pass).toBe('[OK]');
    expect(palette.glyph.warn).toBe('[WARN]');
    expect(palette.glyph.fail).toBe('[FAIL]');
    expect(palette.glyph.info).toBe('[INFO]');
    expect(palette.glyph.arrow).toBe('->');
  });

  it('disabled palette returns identity functions', () => {
    const palette = createColorPalette(false);
    expect(palette.success('hello')).toBe('hello');
    expect(palette.warning('hello')).toBe('hello');
    expect(palette.error('hello')).toBe('hello');
    expect(palette.info('hello')).toBe('hello');
    expect(palette.dim('hello')).toBe('hello');
    expect(palette.bold('hello')).toBe('hello');
  });

  it('enabled palette returns functions that contain the input text', () => {
    const palette = createColorPalette(true);
    expect(palette.success('hello')).toContain('hello');
    expect(palette.warning('world')).toContain('world');
    expect(palette.error('oops')).toContain('oops');
  });

  it('enabled palette returns unicode glyphs', () => {
    const palette = createColorPalette(true);
    expect(palette.glyph.pass).toContain('✓');
    expect(palette.glyph.warn).toContain('⚠');
    expect(palette.glyph.fail).toContain('✗');
    expect(palette.glyph.info).toContain('ℹ');
    expect(palette.glyph.arrow).toContain('→');
  });
});
