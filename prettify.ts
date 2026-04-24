import { config, editor } from "@silverbulletmd/silverbullet/syscalls";
import { DEFAULT_CONFIG, runPipeline } from "./pipeline.ts";
import type { PrettifyConfig, Scope } from "./pipeline.ts";

export async function prettifyCommand(): Promise<void> {
  const raw =
    (await config.get("markdownPrettify", {})) as Partial<PrettifyConfig>;
  const cfg = { ...DEFAULT_CONFIG, ...raw };

  const selection = await editor.getSelection();
  const hasSelection = selection.from !== selection.to;
  const scope: Scope = hasSelection ? "selection" : "page";

  const fullText = await editor.getText();
  const from = hasSelection ? selection.from : 0;
  const to = hasSelection ? selection.to : fullText.length;
  const sourceSlice = fullText.slice(from, to);
  const originalCursor = await editor.getCursor();

  let prettified: string;
  try {
    prettified = await runPipeline(sourceSlice, cfg, scope);
  } catch (err) {
    await editor.flashNotification(
      `Markdown: Prettify failed: ${(err as Error).message}`,
      "error",
    );
    return;
  }

  if (prettified === sourceSlice) return;

  await editor.replaceRange(from, to, prettified);
  const newCursor = from +
    Math.min(Math.max(originalCursor - from, 0), prettified.length);
  await editor.moveCursor(newCursor);
}
