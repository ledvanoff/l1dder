import { describe, expect, it } from 'vitest';
import { InMemoryFileSystem } from '@l1dder/core/testing';
import type { ShellPort, ShellResult } from '@l1dder/core';

import { checkKnowledge } from './knowledge.js';

function shellStub(handler: (command: string) => ShellResult): ShellPort {
  return {
    exec: (command: string) => Promise.resolve(handler(command)),
  };
}

describe('checkKnowledge', () => {
  it('runs the same checks without --deep regardless of drift (back-compat)', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/knowledge/idea.md', '# Idea\n');
    await fs.writeFile('/project/knowledge/roadmap.md', '# Roadmap\n');
    await fs.writeFile('/project/knowledge/as-is/architecture.md', '## Summary\n');
    await fs.writeFile('/project/knowledge/to-be/architecture.md', '## Summary\n## Details\nmore\n');

    const checks = await checkKnowledge(fs, '/project');

    expect(checks.some((c) => c.id.startsWith('knowledge-drift-'))).toBe(false);
  });

  it('--deep flags a structural drift warning when as-is is missing a to-be section', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/knowledge/idea.md', '# Idea\n');
    await fs.writeFile('/project/knowledge/roadmap.md', '# Roadmap\n');
    await fs.writeFile('/project/knowledge/as-is/architecture.md', '## Summary\ntext\n');
    await fs.writeFile(
      '/project/knowledge/to-be/architecture.md',
      '## Summary\ntext\n## Details\nmore\n',
    );

    const checks = await checkKnowledge(fs, '/project', { deep: true });

    const driftCheck = checks.find((c) => c.id.startsWith('knowledge-drift-architecture-'));
    expect(driftCheck?.level).toBe('warn');
    expect(driftCheck?.message).toContain('Details');
  });

  it('--deep passes when as-is/to-be pair has no structural drift', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/knowledge/idea.md', '# Idea\n');
    await fs.writeFile('/project/knowledge/roadmap.md', '# Roadmap\n');
    const content = '## Summary\nidentical on both sides\n';
    await fs.writeFile('/project/knowledge/as-is/architecture.md', content);
    await fs.writeFile('/project/knowledge/to-be/architecture.md', content);

    const checks = await checkKnowledge(fs, '/project', { deep: true });

    expect(checks.find((c) => c.id === 'knowledge-drift-architecture')?.level).toBe('pass');
  });

  it('--deep skips a pair when only one side of as-is/to-be exists', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/knowledge/idea.md', '# Idea\n');
    await fs.writeFile('/project/knowledge/roadmap.md', '# Roadmap\n');
    await fs.writeFile('/project/knowledge/to-be/erd.md', '## Summary\n');

    const checks = await checkKnowledge(fs, '/project', { deep: true });

    expect(checks.some((c) => c.id.startsWith('knowledge-drift-erd'))).toBe(false);
  });

  it('--deep uses git timestamps via ShellPort to flag stale as-is', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/knowledge/idea.md', '# Idea\n');
    await fs.writeFile('/project/knowledge/roadmap.md', '# Roadmap\n');
    const content = '## Summary\nsame text\n';
    await fs.writeFile('/project/knowledge/as-is/architecture.md', content);
    await fs.writeFile('/project/knowledge/to-be/architecture.md', content);

    const shell = shellStub((command) => {
      if (command.includes('as-is/architecture.md')) {
        return { stdout: '2026-01-01T00:00:00.000Z\n', stderr: '', exitCode: 0 };
      }
      return { stdout: '2026-03-01T00:00:00.000Z\n', stderr: '', exitCode: 0 };
    });

    const checks = await checkKnowledge(fs, '/project', { deep: true, shell });

    const driftCheck = checks.find((c) => c.id.startsWith('knowledge-drift-architecture-'));
    expect(driftCheck?.level).toBe('warn');
    expect(driftCheck?.message).toContain('stale');
  });

  it('--deep skips structural drift for a skeleton as-is placeholder in the discovery stage (DEC-6-5)', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/knowledge/idea.md', '# Idea\n');
    await fs.writeFile('/project/knowledge/roadmap.md', '# Roadmap\n');
    await fs.writeFile('/project/knowledge/as-is/architecture.md', 'TODO: fill this in\n');
    await fs.writeFile(
      '/project/knowledge/to-be/architecture.md',
      `## Summary\n${'x'.repeat(250)}\n## Details\nmore\n`,
    );

    const checks = await checkKnowledge(fs, '/project', { deep: true, stage: 'discovery' });

    const driftCheck = checks.find((c) => c.id === 'knowledge-drift-architecture');
    expect(driftCheck?.level).toBe('pass');
    expect(driftCheck?.message).toContain('placeholder');
    expect(checks.some((c) => c.id.startsWith('knowledge-drift-architecture-'))).toBe(false);
  });

  it('--deep still flags structural drift for a skeleton as-is outside the discovery stage', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/knowledge/idea.md', '# Idea\n');
    await fs.writeFile('/project/knowledge/roadmap.md', '# Roadmap\n');
    await fs.writeFile('/project/knowledge/as-is/architecture.md', 'TODO: fill this in\n');
    await fs.writeFile(
      '/project/knowledge/to-be/architecture.md',
      `## Summary\n${'x'.repeat(250)}\n## Details\nmore\n`,
    );

    const checks = await checkKnowledge(fs, '/project', { deep: true, stage: 'maintenance' });

    const driftCheck = checks.find((c) => c.id.startsWith('knowledge-drift-architecture-'));
    expect(driftCheck?.level).toBe('warn');
  });
});
