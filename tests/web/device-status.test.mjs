import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "web");
const html = readFileSync(join(webRoot, "index.html"), "utf8");
const stylesheet = readFileSync(join(webRoot, "device-canvas.css"), "utf8");

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stylesheet.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `Expected a ${selector} rule`);
  return match[1];
}

test("device status surface has semantic copy, iconography, and an in-frame action", () => {
  assert.match(
    html,
    /id="stream-overlay"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/,
  );
  assert.match(html, /class="stream-status-card" aria-labelledby="stream-overlay-title"/);
  assert.match(html, /id="stream-overlay-icon"/);
  assert.match(html, /id="stream-overlay-eyebrow"/);
  assert.match(html, /id="stream-overlay-title"/);
  assert.match(html, /id="stream-overlay-detail"/);
  assert.match(html, /id="stream-overlay-action"[^>]+type="button"/);
  assert.match(html, /<symbol id="icon-alert"/);
  assert.match(html, /<symbol id="icon-link-off"/);
});

test("inactive device screens use a compact host-themed status surface", () => {
  assert.match(html, /id="device-screen" width="180" height="400"/);
  assert.match(rule(".stream-overlay"), /linear-gradient/);
  assert.doesNotMatch(rule(".stream-overlay"), /radial-gradient/);
  assert.match(rule(".stream-status-card"), /border:\s*1px solid var\(--border-default\)/);
  assert.match(rule(".stream-status-card"), /border-radius:\s*var\(--control-radius\)/);
  assert.doesNotMatch(rule(".stream-status-card"), /backdrop-filter|box-shadow/);
  assert.match(rule(".stream-status-title"), /font-weight:\s*600/);
  assert.match(rule(".stream-status-detail"), /line-height:\s*1\.5/);
  assert.match(rule(".button.stream-status-action"), /min-height:\s*44px/);
});

test("busy status uses a compact spinner instead of wrapping the state icon", () => {
  assert.match(rule(".stream-overlay-spinner"), /width:\s*18px/);
  assert.match(rule(".stream-overlay-spinner"), /height:\s*18px/);
  assert.doesNotMatch(rule(".stream-overlay-spinner"), /position:\s*absolute|inset:/);
  assert.match(
    rule('.stream-overlay[data-busy="true"] .stream-status-glyph'),
    /display:\s*none/,
  );
});

test("primary actions retain their semantic fill on hover", () => {
  assert.match(
    rule(".button.primary:hover:not(:disabled)"),
    /background:\s*var\(--success-emphasis\)/,
  );
  assert.match(
    rule(".icon-button.primary:hover:not(:disabled)"),
    /background:\s*var\(--success-emphasis\)/,
  );
});

test("starts on the live view instead of the empty selector", () => {
  assert.match(html, /id="empty-state" class="empty-state hidden"/);
  assert.match(html, /id="device-view" class="device-view"/);
  assert.doesNotMatch(html, /id="device-view" class="device-view hidden"/);
  assert.match(html, />Opening live view</);
  assert.match(html, /Connecting to a running simulator or emulator/);
  assert.match(html, /id="selector-detail"[^>]*>Opening live view</);
});

test("screenshot capture shows a draggable preview instead of saving immediately", () => {
  assert.match(html, /data-action="screenshot"[^>]+aria-label="Take screenshot"/);
  assert.match(html, /id="screenshot-preview"[^>]+draggable="true"/);
  assert.match(html, /id="screenshot-preview-image"/);
  assert.match(html, /id="screenshot-preview-dismiss"/);
  assert.match(rule(".screenshot-preview"), /position:\s*fixed/);
  assert.match(rule(".screenshot-preview"), /right:\s*16px/);
  assert.match(rule(".screenshot-preview"), /bottom:\s*16px/);
  assert.match(rule(".screenshot-preview"), /z-index:\s*70/);
  assert.match(rule(".screenshot-preview"), /width:\s*fit-content/);
  assert.match(rule(".screenshot-preview-image"), /width:\s*56px/);
  assert.match(rule(".screenshot-preview-image"), /object-fit:\s*cover/);
  assert.doesNotMatch(rule(".screenshot-preview-image"), /object-fit:\s*contain|max-height:/);
  assert.match(rule('.screenshot-preview[data-open="true"]'), /visibility:\s*visible/);
});
