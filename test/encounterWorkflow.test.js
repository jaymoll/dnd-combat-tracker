import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EncounterWorkflow } from "../src/workflows/EncounterWorkflow.js";

describe("EncounterWorkflow", () => {
  it("preserves the active combatant index after initiative order changes", () => {
    const state = {
      combatants: [
        { id: "active", initiative: 15, order: 0 },
        { id: "late", initiative: 10, order: 1 },
        { id: "new-fast", initiative: 20, order: 2 },
      ],
      currentTurnIndex: 0,
    };
    const workflow = new EncounterWorkflow({
      elements: { rollResult: { textContent: "" } },
      formController: {},
      rosterController: {},
      targetController: {},
      turnController: {},
      getState: () => state,
      setState: () => {},
      render: () => {},
    });

    workflow.preserveActiveTurn({ id: "active" });

    assert.equal(state.currentTurnIndex, 1);
  });
});
