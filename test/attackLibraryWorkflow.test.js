import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AttackLibraryWorkflow } from "../src/workflows/AttackLibraryWorkflow.js";

const createEvent = (button) => ({
  target: {
    closest(selector) {
      return selector === "button" ? button : null;
    },
  },
});

describe("AttackLibraryWorkflow", () => {
  it("ignores spell and weapon quick-access clicks during an active encounter", async () => {
    let didLookup = false;
    const workflow = new AttackLibraryWorkflow({
      elements: {},
      spellFormController: {},
      weaponFormController: {},
      quickAccessController: {
        find() {
          didLookup = true;
        },
      },
      getState: () => ({ hasStarted: true }),
      render: () => {},
    });

    await workflow.handleQuickAccessClick(
      createEvent({ dataset: { action: "edit-spell", id: "spell-1" } }),
      "spell",
      {},
    );

    assert.equal(didLookup, false);
  });
});
