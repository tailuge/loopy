export async function waitFor(
  condition: () => boolean | any,
  timeout = 1000
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const result = condition();
      if (result !== false && result !== undefined && result !== null) return;
    } catch {
      // Condition not met
    }
    await new Promise((r) => setTimeout(r, 10));
  }

  throw new Error("waitFor timed out");
}

export const KEYS = {
  ENTER: "\r",
  ESCAPE: "\x1B",
  UP: "\x1B[A",
  DOWN: "\x1B[B",
  LEFT: "\x1B[D",
  RIGHT: "\x1B[C",
  TAB: "\t",
  BACKSPACE: "\x7F",
  CTRL_C: "\x03",
};
