import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ScreenController } from "../src/controllers/ScreenController.js";

const createClassList = () => {
  const classes = new Set();
  return {
    has: (className) => classes.has(className),
    toggle: (className, force) => {
      if (force) {
        classes.add(className);
      } else {
        classes.delete(className);
      }
    },
  };
};

const createButton = (screenName) => ({
  dataset: { screenButton: screenName },
  classList: createClassList(),
  attributes: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
});

const createSlot = () => ({
  child: null,
  append(element) {
    this.child = element;
    element.parentElement = this;
  },
});

const createElements = () => {
  const encounterSlot = createSlot();
  const battleMapSlot = createSlot();
  const turnPanel = { parentElement: encounterSlot, classList: createClassList() };
  encounterSlot.child = turnPanel;

  return {
    screenButtons: [createButton("encounter"), createButton("battle-map")],
    screens: [
      { dataset: { screen: "encounter" }, hidden: false },
      { dataset: { screen: "battle-map" }, hidden: true },
    ],
    battleMapTurnPanelSlot: battleMapSlot,
    encounterTurnPanelSlot: encounterSlot,
    turnPanel,
  };
};

const createWindow = (pathname = "/") => ({
  location: { pathname },
  pushedPath: "",
  history: {
    pushState(_state, _title, path) {
      this.owner.pushedPath = path;
      this.owner.location.pathname = path;
    },
  },
});

describe("ScreenController", () => {
  it("shows the selected screen, updates navigation state, and pushes history", () => {
    const elements = createElements();
    const browserWindow = createWindow("/");
    browserWindow.history.owner = browserWindow;

    new ScreenController(elements, browserWindow).showScreen("battle-map");

    assert.equal(elements.screens[0].hidden, true);
    assert.equal(elements.screens[1].hidden, false);
    assert.equal(elements.screenButtons[0].attributes["aria-pressed"], "false");
    assert.equal(elements.screenButtons[1].attributes["aria-pressed"], "true");
    assert.equal(elements.screenButtons[1].classList.has("is-active"), true);
    assert.equal(elements.turnPanel.parentElement, elements.battleMapTurnPanelSlot);
    assert.equal(elements.turnPanel.classList.has("battle-map-turn-band"), true);
    assert.equal(browserWindow.pushedPath, "/battle-map");
  });

  it("falls back to the encounter screen for unknown paths", () => {
    const elements = createElements();
    const browserWindow = createWindow("/missing");
    browserWindow.history.owner = browserWindow;

    new ScreenController(elements, browserWindow).showCurrent({ updatePath: false });

    assert.equal(elements.screens[0].hidden, false);
    assert.equal(elements.screens[1].hidden, true);
    assert.equal(browserWindow.pushedPath, "");
  });
});
