import { PowerSourceTile, PowerDrainTile, Tile } from "./map.js";
import { zoomLevel, scrX, scrY, Direction, format } from "./globals.js";
import { Player } from "./player.js";
export class ColoredTile extends Tile {
    color;
    constructor(pos, color = "yellow") {
        super(pos);
        this.color = color;
    }
    render(context) {
        context.fillStyle = this.color;
        context.fillRect((this.pos.x - Player.pos.x) * zoomLevel - scrX, (this.pos.y - Player.pos.y) * zoomLevel - scrY, zoomLevel, zoomLevel);
    }
    get tooltip() { return format(`<s${this.color}s>${this.color}</> tile`); }
}
export class BatteryTile extends PowerSourceTile {
    voltage = 10;
    energy = 10000;
    maxEnergy = this.energy;
    constructor(pos) {
        super(pos);
    }
    render(context) {
        context.fillStyle = "darkred";
        context.fillRect((this.pos.x - Player.pos.x) * zoomLevel - scrX, (this.pos.y - Player.pos.y) * zoomLevel - scrY, zoomLevel, zoomLevel);
        context.fillStyle = "orange";
        context.fillRect((this.pos.x - Player.pos.x + 0.2) * zoomLevel - scrX, (this.pos.y - Player.pos.y + 0.2) * zoomLevel - scrY, zoomLevel * 0.6, zoomLevel * 0.6);
    }
    hasConnection(direction) { return true; } // connects from all four sides
    get tooltip() { return format(`Battery <b> Provides energy. <b>`); }
}
export class LightTile extends PowerDrainTile {
    resistance = 5;
    constructor(pos) {
        super(pos);
    }
    render(context) {
        context.fillStyle = `rgb(${50 + this.currentTotal * 205 / 5}, ${50 + this.currentTotal * 205 / 5}, 50)`;
        context.fillRect((this.pos.x - Player.pos.x) * zoomLevel - scrX, (this.pos.y - Player.pos.y) * zoomLevel - scrY, zoomLevel, zoomLevel);
        context.fillStyle = "gray";
        context.fillRect((this.pos.x - Player.pos.x + 2 / 5) * zoomLevel - scrX, (this.pos.y - Player.pos.y + 4 / 5) * zoomLevel - scrY, zoomLevel * 1 / 5, zoomLevel * 1 / 5);
    }
    hasConnection(direction) { return direction == Direction.down; }
    get tooltip() { return format(`Light <b> Turns on when powered. <b> Current brightness: ${Math.min(Math.floor(100 * this.currentTotal / 5), 100)}%<b>`); }
}
