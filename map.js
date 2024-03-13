import { Direction, Position, format, mouseX, mouseY, scrX, scrY, zoomLevel } from "./globals.js";
import { Player } from "./player.js";
export class Map {
    static tiles = [];
    static tileAt(pos) {
        let matches = this.tiles.filter(t => t.pos.x == pos.x && t.pos.y == pos.y);
        return matches.length ? matches[0] : null;
    }
    static tileByUUID(uuid) {
        let matches = this.tiles.filter(t => t.uuid == uuid);
        return matches.length ? matches[0] : null;
    }
    static positionAt(x, y) {
        return new Position(Math.floor((x / zoomLevel) + Player.pos.x + (scrX / zoomLevel) - 0.0), Math.floor((y / zoomLevel) + Player.pos.y + (scrY / zoomLevel) - 0.0));
    }
    static get mousePos() {
        return this.positionAt(mouseX, mouseY);
    }
    static get hoveredTile() {
        return this.tileAt(this.mousePos);
    }
}
export class Tile {
    pos;
    uuid;
    circuitInfo = [];
    constructor(pos) {
        this.pos = pos;
        this.uuid = Math.random();
    }
    get circuitCurrents() {
        return this.circuitInfo.map(x => x.voltage / x.resistance);
    }
    get circuitWattages() {
        return this.circuitInfo.map(x => x.sources.map(y => y * y).reduce((x, y) => x + y, 0) / x.resistance);
    }
    get circuitVoltageTotal() {
        return this.circuitInfo.reduce((x, y) => x + y.voltage, 0);
    }
    get circuitResistanceTotal() {
        return this.circuitInfo.reduce((x, y) => x + y.resistance, 0);
    }
    get circuitCurrentTotal() {
        return this.circuitCurrents.reduce((x, y) => x + y, 0);
    }
    get circuitWattageTotal() {
        return this.circuitWattages.reduce((x, y) => x + y, 0);
    }
    render(context) { }
    hasConnection(direction) { return false; }
    get tooltip() { return ""; }
    isConnected(other) {
        if ((other.pos.plus(0, 1).equals(this.pos) && other.hasConnection(Direction.down)) ||
            (other.pos.plus(0, -1).equals(this.pos) && other.hasConnection(Direction.up)) ||
            (other.pos.plus(1).equals(this.pos) && other.hasConnection(Direction.right)) ||
            (other.pos.plus(-1).equals(this.pos) && other.hasConnection(Direction.left))) {
            return true;
        }
        else
            return false;
    }
    tick() { }
}
export class PowerSourceTile extends Tile {
    voltage = 0;
    energy = 0;
    maxEnergy = 0;
    constructor(pos) {
        super(pos);
    }
    get currents() {
        return this.circuitInfo.map(x => this.voltage / x.resistance);
    }
    get wattages() {
        return this.circuitInfo.map(x => this.voltage * this.voltage / x.resistance);
    }
    get currentTotal() {
        return this.currents.reduce((x, y) => x + y, 0);
    }
    get wattageTotal() {
        return this.wattages.reduce((x, y) => x + y, 0);
    }
}
export class PowerDrainTile extends Tile {
    resistance = 0;
    constructor(pos) {
        super(pos);
    }
    get currents() {
        return this.circuitInfo.map(x => x.voltage / this.resistance);
    }
    get wattages() {
        return this.circuitInfo.map(x => x.sources.map(y => y * y).reduce((x, y) => x + y, 0) / this.resistance);
    }
    get currentTotal() {
        return this.currents.reduce((x, y) => x + y, 0);
    }
    get wattageTotal() {
        return this.wattages.reduce((x, y) => x + y, 0);
    }
}
function renderWire(context, wire, color) {
    if (color)
        context.fillStyle = color;
    let left = (wire.pos.x - Player.pos.x) * zoomLevel - scrX;
    let top = (wire.pos.y - Player.pos.y) * zoomLevel - scrY;
    context.fillRect(left + zoomLevel * 2 / 5, top + zoomLevel * 2 / 5, zoomLevel * 1 / 5, zoomLevel * 1 / 5);
    let u = Map.tileAt(wire.pos.plus(0, -1));
    if (u && (u instanceof WireTile || wire.isConnected(u)))
        context.fillRect(left + zoomLevel * 2 / 5, top, zoomLevel * 1 / 5, zoomLevel * 2 / 5);
    let d = Map.tileAt(wire.pos.plus(0, 1));
    if (d && (d instanceof WireTile || wire.isConnected(d)))
        context.fillRect(left + zoomLevel * 2 / 5, top + zoomLevel * 3 / 5, zoomLevel * 1 / 5, zoomLevel * 2 / 5);
    let l = Map.tileAt(wire.pos.plus(-1));
    if (l && (l instanceof WireTile || wire.isConnected(l)))
        context.fillRect(left, top + zoomLevel * 2 / 5, zoomLevel * 2 / 5, zoomLevel * 1 / 5);
    let r = Map.tileAt(wire.pos.plus(1));
    if (r && (r instanceof WireTile || wire.isConnected(r)))
        context.fillRect(left + zoomLevel * 3 / 5, top + zoomLevel * 2 / 5, zoomLevel * 2 / 5, zoomLevel * 1 / 5);
}
export class WireTile extends Tile {
    constructor(pos) {
        super(pos);
    }
    render(context) {
        // rendering depends on location of other power components
        renderWire(context, this, "gray");
    }
    get tooltip() { return format("Wire <b> Transmits energy. <b>"); }
}
