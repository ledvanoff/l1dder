import { describe, expect, it } from 'vitest';

import { InMemoryFileSystem } from './testing.js';

describe('InMemoryFileSystem.removeDir', () => {
  it('removes a directory that has become empty after its only file was deleted', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/.cursor/skills-l1dder/old-skill/SKILL.md', 'content');
    await fs.deleteFile('/project/.cursor/skills-l1dder/old-skill/SKILL.md');

    await fs.removeDir('/project/.cursor/skills-l1dder/old-skill');

    expect(await fs.exists('/project/.cursor/skills-l1dder/old-skill')).toBe(false);
  });

  it('does not remove a directory that still contains files', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/.cursor/skills-l1dder/keep-skill/SKILL.md', 'content');

    await fs.removeDir('/project/.cursor/skills-l1dder/keep-skill');

    expect(await fs.exists('/project/.cursor/skills-l1dder/keep-skill')).toBe(true);
    expect(await fs.readFile('/project/.cursor/skills-l1dder/keep-skill/SKILL.md')).toBe('content');
  });

  it('does not remove a directory that still contains a nested subdirectory', async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFile('/project/a/b/c.md', 'content');
    await fs.deleteFile('/project/a/b/c.md');

    // 'b' is now empty, but 'a' still has 'b' registered as a subdirectory.
    await fs.removeDir('/project/a');

    expect(await fs.exists('/project/a')).toBe(true);
  });

  it('is safe (no throw) when removing a directory that does not exist', async () => {
    const fs = new InMemoryFileSystem();

    await expect(fs.removeDir('/project/never-created')).resolves.toBeUndefined();
  });
});
