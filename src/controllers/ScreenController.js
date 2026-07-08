const screenRoutes = {
  encounter: "/",
  "battle-map": "/battle-map",
  "encounter-calculator": "/encounter-calculator",
  management: "/management",
};

const routeScreens = Object.fromEntries(Object.entries(screenRoutes).map(([screen, route]) => [route, screen]));

export class ScreenController {
  constructor(elements, browserWindow = globalThis.window) {
    this.elements = elements;
    this.window = browserWindow;
  }

  showCurrent({ updatePath = false } = {}) {
    this.showScreen(this.getScreenFromPath(), { updatePath });
  }

  showScreen(screenName, { updatePath = true } = {}) {
    const nextScreenName = screenRoutes[screenName] ? screenName : "encounter";
    this.moveTurnPanel(nextScreenName);

    this.elements.screens.forEach((screen) => {
      screen.hidden = screen.dataset.screen !== nextScreenName;
    });
    this.elements.screenButtons.forEach((button) => {
      const isActive = button.dataset.screenButton === nextScreenName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (updatePath) {
      const nextPath = screenRoutes[nextScreenName];
      if (this.window.location.pathname !== nextPath) {
        this.window.history.pushState({}, "", nextPath);
      }
    }
  }

  moveTurnPanel(screenName) {
    const slot = screenName === "battle-map"
      ? this.elements.battleMapTurnPanelSlot
      : this.elements.encounterTurnPanelSlot;

    if (!slot || this.elements.turnPanel.parentElement === slot) return;

    this.elements.turnPanel.classList.toggle("battle-map-turn-band", screenName === "battle-map");
    slot.append(this.elements.turnPanel);
  }

  getScreenFromPath() {
    return routeScreens[this.window.location.pathname] ?? "encounter";
  }
}
