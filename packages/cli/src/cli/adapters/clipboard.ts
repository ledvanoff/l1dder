import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Copy text to system clipboard using platform-specific subprocess.
 *
 * macOS: pbcopy, Linux: xclip -selection clipboard, Windows: clip.exe
 */
export async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;
  let command: string;

  switch (platform) {
    case 'darwin':
      command = 'pbcopy';
      break;
    case 'linux':
      command = 'xclip -selection clipboard';
      break;
    case 'win32':
      command = 'clip';
      break;
    default:
      throw new ClipboardUnavailableError(
        `Clipboard not supported on platform: ${platform}. Use --file instead.`,
      );
  }

  try {
    const child = execAsync(command);
    child.child.stdin?.write(text);
    child.child.stdin?.end();
    await child;
  } catch {
    const binary = command.split(' ')[0] ?? command;
    throw new ClipboardUnavailableError(
      `Failed to copy to clipboard. Ensure '${binary}' is installed. Use --file instead.`,
    );
  }
}

/** Thrown when clipboard tool is unavailable. */
export class ClipboardUnavailableError extends Error {
  readonly code = 'CLIPBOARD_UNAVAILABLE' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ClipboardUnavailableError';
  }
}
