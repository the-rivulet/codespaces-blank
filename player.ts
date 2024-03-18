import { Position, zoomLevel, scrX, scrY } from "./globals.js";
import type { Tile } from "./map.js";

export class Player {
  static pos = new Position();
  static tileUnderCursor: Tile;
}

export function fill(tile: Tile, context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  context.fillRect(
    Math.round((tile.pos.x - Player.pos.x + 0.2 * x) * zoomLevel - scrX),
    Math.round((tile.pos.y - Player.pos.y + 0.2 * y) * zoomLevel - scrY),
    Math.round(zoomLevel * 0.2 * w), Math.round(zoomLevel * 0.2 * h)
  );
}