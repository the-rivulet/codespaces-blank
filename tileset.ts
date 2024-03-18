import { PowerSourceTile, PowerDrainTile, Tile, ResourceTile, Map } from "./map.js";
import { zoomLevel, scrX, scrY, Direction, format, CircuitInfo, Color, framerate, Item, Inventory, log, PositionLike, DirUtils } from "./globals.js";
import { fill } from "./player.js";

export class ColoredTile extends Tile {
  color: string;
  constructor(pos: PositionLike, color = "yellow") {
    super(pos);
    this.color = color;
  }
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = this.color;
    fill(this, context, 0, 0, 5, 5);
  }
  get tooltip() {return format(`<s${this.color}s>${this.color}</> tile`);}
}

export class BatteryTile extends PowerSourceTile {
  voltage = 10;
  energy = 1e6;
  maxEnergy = this.energy;
  constructor(pos: PositionLike) {
    super(pos);
  }
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = "darkred";
    fill(this, context, 0, 0, 5, 5);
    context.fillStyle = "orange";
    fill(this, context, 1, 1, 3, 3);
  }
  hasConnection(direction: Direction) {return true;} // connects from all four sides
  get tooltip() {return format(`Battery <b> Provides energy. <b>`);}
}

export class LightTile extends PowerDrainTile {
  resistance = 5;
  constructor(pos: PositionLike) {
    super(pos);
  }
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = `rgb(${50 + this.currentTotal * 205/5}, ${50 + this.currentTotal * 205/5}, 50)`;
    fill(this, context, 0, 0, 5, 5);
    context.fillStyle = "gray";
    fill(this, context, 2, 4, 1, 1);
  }
  hasConnection(direction: Direction) {return direction == Direction.down;}
  get tooltip() {return format(`Light <b> Turns on when powered. <b> Current brightness: ${Math.min(Math.floor(100*this.currentTotal/5), 100)}%<b>`);}
}

export class CoalTile extends ResourceTile {
  constructor(pos: PositionLike) {
    super(pos, Item.coal, 100);
  }
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = "#555";
    fill(this, context, 0, 0, 5, 5);
  }
}

export class DrillTile extends PowerDrainTile {
  baseResistance = 5;
  storedPower = 0;
  inventory = new Inventory();
  constructor(pos: PositionLike) {
    super(pos);
  }
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = "gray";
    fill(this, context, 1, 1, 3, 3);
  }
  tick() {
    // if there's a resource tile underneath this, start digging it up, otherwise reset digging counter
    let land = Map.landAt(this.pos);
    if(land && land instanceof ResourceTile) {
      this.resistance = this.baseResistance;
      this.storedPower += this.currentTotal;
      while(this.storedPower >= land.powerCost) {
        this.storedPower -= land.powerCost;
        this.inventory.add(land.resource, 1);
      }
    } else {
      this.resistance = this.baseResistance * 10;
      this.storedPower = 0;
    }
  }
  hasConnection(direction: Direction) {return true;}
  get tooltip() {
    let land = Map.landAt(this.pos);
    return format(`
      Drill <b>
      Mines the land under it. <b>
      ${land instanceof ResourceTile ? "Mining " + (Math.round(framerate * this.currentTotal / land.powerCost * 100) / 100) + " " + land.resource + "/s." : "Idle."} <b>
      Inventory: <b> ${this.inventory.toString()}
    `);
  }
}

export class ConveyorTile extends PowerDrainTile {
  out: Direction;
  baseResistance = 20;
  storedPower = 0;
  powerPerItem = 10;
  inventory = new Inventory();
  constructor(pos: PositionLike, out: Direction) {
    super(pos);
    this.out = out;
  }
  render(context: CanvasRenderingContext2D) {
    context.fillStyle = "gray";
    fill(this, context, 0, 0, 5, 5);
    context.fillStyle = "orange";
    switch(this.out) {
      case Direction.up:
        // up arrow
        fill(this, context, 2, 0, 1, 5);
        fill(this, context, 1.5, 1, 2, 0.5);
        fill(this, context, 1, 1.5, 3, 0.5);
        fill(this, context, 0.5, 2, 4, 0.5);
        fill(this, context, 0, 2.5, 5, 0.5);
        break;
      case Direction.down:
        // down arrow
        fill(this, context, 2, 0, 1, 5);
        fill(this, context, 1.5, 4, 2, 0.5);
        fill(this, context, 1, 3.5, 3, 0.5);
        fill(this, context, 0.5, 3, 4, 0.5);
        fill(this, context, 0, 2.5, 5, 0.5);
        break;
      case Direction.left:
        // left arrow
        fill(this, context, 0, 2, 5, 1);
        fill(this, context, 1, 1.5, 0.5, 2);
        fill(this, context, 1.5, 1, 0.5, 3);
        fill(this, context, 2, 0.5, 0.5, 4);
        fill(this, context, 2.5, 0, 0.5, 5);
        break;
      default:
        // right arrow
        fill(this, context, 0, 2, 5, 1);
        fill(this, context, 4, 1.5, 0.5, 2);
        fill(this, context, 3.5, 1, 0.5, 3);
        fill(this, context, 3, 0.5, 0.5, 4);
        fill(this, context, 2.5, 0, 0.5, 5);
    }
  }
  tick() {
    // if there's a container in the input direction, start carrying items, otherwise reset carry counter
    this.resistance = this.baseResistance;
    this.storedPower += this.currentTotal;
    let working = false;
    let dirs = [Direction.up, Direction.down, Direction.right, Direction.left];
    dirs.splice(dirs.indexOf(this.out), 1);
    for(let dir of dirs) {
      //log(this.uuid + " -> " + dir);
      let tile = Map.tileAt(this.pos.plus(dir));
      // conveyors don't output anywhere but their output side
      if(tile && tile instanceof ConveyorTile && dir == DirUtils.opposite(dir)) continue;
      if(tile && tile.hasInventory() && tile.inventory.totalCount) {
        working = true;
        while(this.storedPower >= this.powerPerItem && tile.inventory.totalCount) {
          this.storedPower -= this.powerPerItem;
          let item = tile.inventory.items[0].item;
          tile.inventory.subtract(item, 1);
          this.inventory.add(item, 1);
        }
      }
    }
    if(!working) {
      this.resistance = this.baseResistance * 10;
      this.storedPower = 0;
    }
  }
  hasConnection(direction: Direction) {
    return direction != this.out; // take in power from sides
  }
  get tooltip() {
    return format(`
      Conveyor <b>
      Transfers and stores items. Outputs in the direction of the arrow. <b>
      ${this.resistance == this.baseResistance ? "Transferring " + (Math.round(framerate * this.currentTotal / this.powerPerItem * 100) / 100) + " items/s." : "Idle."} <b>
      Inventory: <b> ${this.inventory.toString()}
    `);
  }
}