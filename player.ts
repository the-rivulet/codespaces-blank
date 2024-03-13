import { Position } from "./globals.js";
import type { Tile } from "./map.js";

export class Player {
  static pos = new Position();
  static tileUnderCursor: Tile;
}