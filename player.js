import { Position, zoomLevel, scrX, scrY } from "./globals.js";
export class Player {
    static pos = new Position();
    static tileUnderCursor;
}
export function fill(tile, context, x, y, w, h) {
    context.fillRect(Math.round((tile.pos.x - Player.pos.x + 0.2 * x) * zoomLevel - scrX), Math.round((tile.pos.y - Player.pos.y + 0.2 * y) * zoomLevel - scrY), Math.round(zoomLevel * 0.2 * w), Math.round(zoomLevel * 0.2 * h));
}
