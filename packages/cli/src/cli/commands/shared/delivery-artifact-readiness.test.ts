import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';

import {
  classifyArtifactContent,
  evaluateDeliveryArtifactReadiness,
} from './delivery-artifact-readiness.js';

describe('classifyArtifactContent', () => {
  it('returns missing for null or blank content', () => {
    expect(classifyArtifactContent(null)).toBe('missing');
    expect(classifyArtifactContent('   \n')).toBe('missing');
  });

  it('returns in_progress when {{PLACEHOLDER}} or <!-- TODO remain', () => {
    expect(classifyArtifactContent('Hello {{FEATURE_NAME}}')).toBe('in_progress');
    expect(classifyArtifactContent('Body\n<!-- TODO: fill -->\n')).toBe(
      'in_progress',
    );
  });

  it('returns ready when content is filled', () => {
    expect(classifyArtifactContent('# Plan\n\nDone.\n')).toBe('ready');
  });
});

describe('evaluateDeliveryArtifactReadiness', () => {
  it('reports missing when the phase artifact file is absent', async () => {
    const fs = new InMemoryFileSystem();
    const rows = await evaluateDeliveryArtifactReadiness(fs, '/p', 'plan');
    expect(rows).toEqual([
      {
        id: 'plan',
        path: 'specs/current/plan.md',
        label: 'plan.md',
        status: 'missing',
      },
    ]);
  });
});
