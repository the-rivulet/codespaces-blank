import { CircuitInfo, Direction, Inventory, Item, Position, PositionLike, format, log, mouseX, mouseY, scrX, scrY, zoomLevel } from "./globals.js";
import { Player, fill } from "./player.js";

export class Map {
  static tiles: Tile[] = [];
  static tileAt(pos: PositionLike) {
    let matches = this.tiles.filter(t => t.pos.x == pos.x && t.pos.y == pos.y);
    return matches.length ? matches[0] : null;
  }
  static land: Tile[] = [];
  static landAt(pos: PositionLike) {
    let matches = this.land.filter(t => t.pos.x == pos.x && t.pos.y == pos.y);
    return matches.length ? matches[0] : null;
  }
  static tileByUUID(uuid: number) {
    let matches = [...this.tiles, ...this.land].filter(t => t.uuid == uuid);
    return matches.length ? matches[0] : null;
  }
  static positionAt(x: number, y: number) {
    return new Position(
      Math.floor((x / zoomLevel) + Player.pos.x + (scrX / zoomLevel) - 0.0),
      Math.floor((y / zoomLevel) + Player.pos.y + (scrY / zoomLevel) - 0.0)
    );
  }
  static get mousePos() {
    return this.positionAt(mouseX, mouseY);
  }
  static get hoveredTile() {
    return this.tileAt(this.mousePos);
  }
  static get hoveredLand() {
    return this.landAt(this.mousePos);
  }
}

interface Container { inventory: Inventory; }
export class Tile {
  pos: Position;
  uuid: number;
  circuitInfo: CircuitInfo[] = [];
  constructor(pos: PositionLike) {
    this.pos = pos instanceof Position ? pos : new Position(pos.x, pos.y);
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
  render(context: CanvasRenderingContext2D) {}
  hasConnection(direction: Direction) {return false;}
  get tooltip() {return "Unnamed Tile";}
  isConnected(other: Tile) {
    if((other.pos.plus(Direction.down).equals(this.pos) && other.hasConnection(Direction.down)) ||
      (other.pos.plus(Direction.up).equals(this.pos) && other.hasConnection(Direction.up)) ||
      (other.pos.plus(Direction.right).equals(this.pos) && other.hasConnection(Direction.right)) ||
      (other.pos.plus(Direction.left).equals(this.pos) && other.hasConnection(Direction.left))) {return true;}
    else return false;
  }
  tick() {}
  hasInventory(): this is Container {
    return "inventory" in this;
  }
}

export class PowerSourceTile extends Tile {
  voltage = 0;
  energy = 0;
  maxEnergy = 0;
  constructor(pos: PositionLike) {
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
  constructor(pos: PositionLike) {
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

function renderWire(context: CanvasRenderingContext2D, wire: WireTile, color?: string) {
  if(color) context.fillStyle = color;
  fill(wire, context, 2, 2, 1, 1);
  let u = Map.tileAt(wire.pos.plus(Direction.up));
  if(u && (u instanceof WireTile || wire.isConnected(u))) fill(wire, context, 2, 0, 1, 2);
  let d = Map.tileAt(wire.pos.plus(Direction.down));
  if(d && (d instanceof WireTile || wire.isConnected(d))) fill(wire, context, 2, 3, 1, 2);
  let l = Map.tileAt(wire.pos.plus(Direction.left));
  if(l && (l instanceof WireTile || wire.isConnected(l))) fill(wire, context, 0, 2, 2, 1);
  let r = Map.tileAt(wire.pos.plus(Direction.right));
  if(r && (r instanceof WireTile || wire.isConnected(r))) fill(wire, context, 3, 2, 2, 1);
}

export class WireTile extends Tile {
  constructor(pos: PositionLike) {
    super(pos);
  }
  render(context: CanvasRenderingContext2D) {
    // rendering depends on location of other power components
    renderWire(context, this, "gray");
  }
  get tooltip() {return format("Wire <b> Transmits energy. <b>");}
}

export class ResourceTile extends Tile {
  resource: Item;
  powerCost: number;
  constructor(pos: PositionLike, resource: Item, cost: number) {
    super(pos);
    this.resource = resource;
    this.powerCost = cost;
  }
  get tooltip() {return format(`${this.resource[0].toUpperCase() + this.resource.slice(1)} Deposit <b> Mine this for ${this.resource}. <b>`);}
}