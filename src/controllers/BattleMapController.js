import { getActiveCombatant } from "../combat.js";
import {
  createBattleMapPosition,
  getCombatantMovementTiles,
  getCombatantSpeedFeet,
} from "../models.js";
import { BattleMapGeometry } from "./BattleMapGeometry.js";
import { clampNumber, escapeHtml } from "../utils.js";

const DRAG_THRESHOLD_PX = 4;
const MIN_GRID_SIZE = 4;
const MAX_GRID_SIZE = 60;

const tokenInitials = (name) =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export class BattleMapController {
  constructor(elements, targetController, onChange) {
    this.elements = elements;
    this.targetController = targetController;
    this.onChange = onChange;
    this.geometry = new BattleMapGeometry();
    this.state = null;
    this.drag = null;
    this.statusOverride = "";
    this.pointerMoveHandler = (event) => this.handlePointerMove(event);
    this.pointerUpHandler = (event) => this.handlePointerUp(event);
  }

  setGridType(state, gridType) {
    if (!["square", "hex"].includes(gridType)) return false;

    state.battleMap.gridType = gridType;
    this.ensureCombatantPositions(state);
    return true;
  }

  setGridSize(state, width, height) {
    const nextWidth = clampNumber(width, MIN_GRID_SIZE, MAX_GRID_SIZE);
    const nextHeight = clampNumber(height, MIN_GRID_SIZE, MAX_GRID_SIZE);
    if (state.battleMap.width === nextWidth && state.battleMap.height === nextHeight) return false;

    state.battleMap.width = nextWidth;
    state.battleMap.height = nextHeight;
    this.ensureCombatantPositions(state);
    return true;
  }

  resetPositions(state) {
    state.combatants.forEach((combatant) => {
      combatant.battleMapPosition = this.geometry.clampPosition(
        createBattleMapPosition(combatant.type, combatant.order),
        state.battleMap,
      );
    });
  }

  render(state) {
    this.state = state;
    this.ensureCombatantPositions(state);

    const map = state.battleMap;
    const layout = this.geometry.getLayout(map);
    this.elements.battleMapGridType.value = map.gridType;
    this.elements.battleMapWidth.value = map.width;
    this.elements.battleMapHeight.value = map.height;
    this.elements.battleMapBoard.className = `battle-map-board ${map.gridType}-grid`;
    this.elements.battleMapBoard.style.width = `${layout.width}px`;
    this.elements.battleMapBoard.style.height = `${layout.height}px`;
    this.elements.battleMapBoard.innerHTML = `${this.renderCells(map)}${this.renderTokens(state)}`;
    this.renderStatus(state);
  }

  renderStatus(state) {
    if (this.statusOverride) {
      this.elements.battleMapStatus.textContent = this.statusOverride;
      this.statusOverride = "";
      return;
    }

    const active = getActiveCombatant(state);
    const mapSize = `${state.battleMap.width} x ${state.battleMap.height}`;

    if (state.combatants.length === 0) {
      this.elements.battleMapStatus.textContent = `No tokens - ${mapSize}`;
      return;
    }

    if (state.isFinished) {
      this.elements.battleMapStatus.textContent = "Encounter finished";
      return;
    }

    if (!state.hasStarted || !active) {
      this.elements.battleMapStatus.textContent = `${state.combatants.length} token${state.combatants.length === 1 ? "" : "s"} - ${mapSize}`;
      return;
    }

    const speed = getCombatantSpeedFeet(active);
    const remaining = Math.max(0, speed - state.movementUsedThisTurn);
    this.elements.battleMapStatus.textContent = `${active.name}: ${remaining} / ${speed} ft - ${mapSize}`;
  }

  renderCells(map) {
    const cells = [];

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const position = this.geometry.getCellPosition(map, { x, y });
        cells.push(
          `<div class="battle-map-cell" style="left:${position.left}px;top:${position.top}px;" aria-hidden="true"></div>`,
        );
      }
    }

    return cells.join("");
  }

  renderTokens(state) {
    const active = getActiveCombatant(state);

    return state.combatants
      .map((combatant) => this.renderToken(state, combatant, active))
      .join("");
  }

  renderToken(state, combatant, active) {
    const position = this.geometry.clampPosition(combatant.battleMapPosition, state.battleMap);
    const cell = this.geometry.getCellPosition(state.battleMap, position);
    const movementTiles = getCombatantMovementTiles(combatant);

    return `<button
      class="${this.getTokenClassName(state, combatant, active)}"
      type="button"
      style="left:${cell.centerX}px;top:${cell.centerY}px;"
      data-token-id="${combatant.id}"
      title="${escapeHtml(combatant.name)} - ${movementTiles} tile${movementTiles === 1 ? "" : "s"}"
    >
      <span class="token-initials">${escapeHtml(tokenInitials(combatant.name))}</span>
      <span class="token-name">${escapeHtml(combatant.name)}</span>
    </button>`;
  }

  getTokenClassName(state, combatant, active) {
    const isActive = active?.id === combatant.id && state.hasStarted && !state.isFinished;
    const isSelected = this.targetController.selectedId === combatant.id;

    return [
      "battle-token",
      `battle-token-${combatant.type}`,
      isActive ? "is-active-token" : "",
      isSelected ? "is-selected-token" : "",
      combatant.isDefeated ? "is-defeated-token" : "",
      this.canMoveCombatant(state, combatant) ? "is-movable-token" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  startDrag(event, state) {
    if (event.button !== 0) return;

    const token = event.target.closest("[data-token-id]");
    if (!token) return;

    const combatant = state.combatants.find((item) => item.id === token.dataset.tokenId);
    if (!combatant) return;

    if (!this.canMoveCombatant(state, combatant)) {
      if (this.selectTargetFromToken(state, combatant)) {
        this.onChange();
      }
      return;
    }

    event.preventDefault();
    token.setPointerCapture?.(event.pointerId);

    const startPointer = this.getPointerPoint(event);
    this.drag = {
      combatantId: combatant.id,
      token,
      startPointer,
      startPosition: { ...combatant.battleMapPosition },
      hasMoved: false,
    };

    token.classList.add("is-dragging-token");
    window.addEventListener("pointermove", this.pointerMoveHandler);
    window.addEventListener("pointerup", this.pointerUpHandler, { once: true });
  }

  handlePointerMove(event) {
    if (!this.drag) return;

    const point = this.getPointerPoint(event);
    const dx = point.x - this.drag.startPointer.x;
    const dy = point.y - this.drag.startPointer.y;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      this.drag.hasMoved = true;
    }

    this.drag.token.style.left = `${point.x}px`;
    this.drag.token.style.top = `${point.y}px`;
  }

  handlePointerUp(event) {
    if (!this.drag || !this.state) return;

    const { combatantId, hasMoved, startPosition } = this.finishDrag();
    const state = this.state;
    const combatant = state.combatants.find((item) => item.id === combatantId);

    if (!combatant) {
      this.onChange();
      return;
    }

    if (!hasMoved) {
      this.selectTargetFromToken(state, combatant);
      this.onChange();
      return;
    }

    const targetPosition = this.getOpenDropPosition(state, event, combatant.id);
    if (!targetPosition || !this.spendMovement(state, startPosition, targetPosition)) {
      this.onChange();
      return;
    }

    combatant.battleMapPosition = targetPosition;
    this.onChange();
  }

  finishDrag() {
    window.removeEventListener("pointermove", this.pointerMoveHandler);

    const drag = this.drag;
    this.drag = null;
    drag.token.classList.remove("is-dragging-token");
    return drag;
  }

  getOpenDropPosition(state, event, combatantId) {
    const targetPosition = this.getCellFromPointer(state.battleMap, event);

    if (!targetPosition || this.isOccupied(state, targetPosition, combatantId)) {
      this.statusOverride = "Space occupied";
      return null;
    }

    return targetPosition;
  }

  spendMovement(state, from, to) {
    if (!state.hasStarted) return true;

    const distanceFeet = this.geometry.getDistanceFeet(state.battleMap, from, to);
    const active = getActiveCombatant(state);
    const remaining = Math.max(0, getCombatantSpeedFeet(active) - state.movementUsedThisTurn);

    if (distanceFeet > remaining) {
      this.statusOverride = `${distanceFeet} ft exceeds remaining movement`;
      return false;
    }

    state.movementUsedThisTurn += distanceFeet;
    return true;
  }

  selectTargetFromToken(state, combatant) {
    const active = getActiveCombatant(state);
    if (
      !state.hasStarted ||
      state.isFinished ||
      combatant.isDefeated ||
      !active ||
      active.id === combatant.id ||
      !this.targetController.select(combatant.id, state)
    ) {
      return false;
    }

    return true;
  }

  canMoveCombatant(state, combatant) {
    if (combatant.isDefeated) return false;
    if (!state.hasStarted) return true;
    if (state.isFinished) return false;

    const active = getActiveCombatant(state);
    return active?.id === combatant.id && state.movementUsedThisTurn < getCombatantSpeedFeet(active);
  }

  ensureCombatantPositions(state) {
    const occupied = new Set();

    state.combatants.forEach((combatant) => {
      const clampedPosition = this.geometry.clampPosition(
        combatant.battleMapPosition ?? createBattleMapPosition(combatant.type, combatant.order),
        state.battleMap,
      );
      const position = this.findOpenPosition(state.battleMap, clampedPosition, occupied);

      combatant.battleMapPosition = position;
      occupied.add(this.getPositionKey(position));
    });
  }

  findOpenPosition(map, preferredPosition, occupied) {
    if (!occupied.has(this.getPositionKey(preferredPosition))) return preferredPosition;

    let bestPosition = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const position = { x, y };
        if (occupied.has(this.getPositionKey(position))) continue;

        const distance = this.geometry.getDistanceFeet(map, preferredPosition, position);
        if (distance < bestDistance) {
          bestPosition = position;
          bestDistance = distance;
        }
      }
    }

    return bestPosition ?? preferredPosition;
  }

  getPositionKey(position) {
    return `${position.x},${position.y}`;
  }

  isOccupied(state, position, movingId) {
    return state.combatants.some(
      (combatant) =>
        combatant.id !== movingId &&
        combatant.battleMapPosition?.x === position.x &&
        combatant.battleMapPosition?.y === position.y,
    );
  }

  getPointerPoint(event) {
    const rect = this.elements.battleMapBoard.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  getCellFromPointer(map, event) {
    const point = this.getPointerPoint(event);

    return this.geometry.getCellFromPoint(map, point);
  }
}
