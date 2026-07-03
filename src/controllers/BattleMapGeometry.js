import { TILE_FEET } from "../models.js";

const SQUARE_TILE_SIZE = 48;
const HEX_WIDTH = 52;
const HEX_HEIGHT = 45;
const HEX_STEP_X = 39;

const clampGridValue = (value, max) => Math.min(Math.max(value, 0), max - 1);

export class BattleMapGeometry {
  clampPosition(position, map) {
    return {
      x: clampGridValue(position?.x ?? 0, map.width),
      y: clampGridValue(position?.y ?? 0, map.height),
    };
  }

  getLayout(map) {
    if (map.gridType === "hex") {
      return {
        width: (map.width - 1) * HEX_STEP_X + HEX_WIDTH,
        height: map.height * HEX_HEIGHT + HEX_HEIGHT / 2,
      };
    }

    return {
      width: map.width * SQUARE_TILE_SIZE,
      height: map.height * SQUARE_TILE_SIZE,
    };
  }

  getCellPosition(map, position) {
    if (map.gridType === "hex") {
      const left = position.x * HEX_STEP_X;
      const top = position.y * HEX_HEIGHT + (position.x % 2 === 1 ? HEX_HEIGHT / 2 : 0);

      return {
        left,
        top,
        centerX: left + HEX_WIDTH / 2,
        centerY: top + HEX_HEIGHT / 2,
      };
    }

    const left = position.x * SQUARE_TILE_SIZE;
    const top = position.y * SQUARE_TILE_SIZE;

    return {
      left,
      top,
      centerX: left + SQUARE_TILE_SIZE / 2,
      centerY: top + SQUARE_TILE_SIZE / 2,
    };
  }

  getCellFromPoint(map, point) {
    if (map.gridType === "hex") {
      return this.getNearestHexCell(map, point);
    }

    return {
      x: clampGridValue(Math.floor(point.x / SQUARE_TILE_SIZE), map.width),
      y: clampGridValue(Math.floor(point.y / SQUARE_TILE_SIZE), map.height),
    };
  }

  getDistanceFeet(map, from, to) {
    if (from.x === to.x && from.y === to.y) return 0;

    if (map.gridType === "hex") {
      return this.getHexDistance(from, to) * TILE_FEET;
    }

    return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * TILE_FEET;
  }

  getNearestHexCell(map, point) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const cell = this.getCellPosition(map, { x, y });
        const distance = (cell.centerX - point.x) ** 2 + (cell.centerY - point.y) ** 2;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { x, y };
        }
      }
    }

    return nearest;
  }

  getHexDistance(from, to) {
    const a = this.oddColumnToCube(from);
    const b = this.oddColumnToCube(to);

    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
  }

  oddColumnToCube(position) {
    const x = position.x;
    const z = position.y - (position.x - (position.x & 1)) / 2;
    const y = -x - z;

    return { x, y, z };
  }
}
