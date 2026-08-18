import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

describe("web application contract", () => {
  it("keeps four primary routes including telemetry", async () => {
    const source = await readFile(
      new URL("../src/App.tsx", import.meta.url),
      "utf8",
    );
    const routes = {
      "/": "ChatPage",
      "/explorer": "ExplorerPage",
      "/operations": "OperationsPage",
      "/telemetry": "TelemetryPage",
    };

    for (const [path, component] of Object.entries(routes)) {
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(
        source,
        new RegExp(`["']${escapedPath}["']\\s*:\\s*${component}`),
      );
    }
  });

  it("accepts only structured and staged source formats", async () => {
    const source = await readFile(
      new URL("../src/pages/OperationsPage.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /accept="\.xlsx,\.txt"/);
  });
});
