import { getId, scrX, scrY, keysDown, log, Position, zoomLevel, Direction, format, framerate, Color, PositionLike } from "./globals.js";
import { Map, PowerDrainTile, PowerSourceTile, Tile, WireTile } from "./map.js";
import { BatteryTile, CoalTile, ColoredTile, ConveyorTile, DrillTile, LightTile } from "./tileset.js";
import { Player, fill } from "./player.js";

let canvas = getId<HTMLCanvasElement>("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let context = canvas.getContext("2d") as CanvasRenderingContext2D; // override
context.fillStyle = "red";

function initialize() {
  Map.tiles = [
    // not circuits
    new LightTile({x: 1, y: 1}),
    new WireTile({x: 1, y: 2}),
    new WireTile({x: 0, y: 3}),
    new WireTile({x: 0, y: 4}),
    new BatteryTile({x: 0, y: 5}),
    // 1 light, 1 battery
    new BatteryTile({x: 11, y: 3}),
    new WireTile({x: 11, y: 2}),
    new LightTile({x: 11, y: 1}),
    // 2 lights, 1 battery
    new WireTile({x: 5, y: 2}),
    new WireTile({x: 4, y: 2}),
    new LightTile({x: 5, y: 1}),
    new LightTile({x: 4, y: 1}),
    new BatteryTile({x: 3, y: 2}),
    // 1 light, 2 batteries
    new WireTile({x: 8, y: 2}),
    new LightTile({x: 8, y: 1}),
    new BatteryTile({x: 7, y: 2}),
    new BatteryTile({x: 9, y: 2}),
    new BatteryTile({x: 8, y: 3}),
    // battery powering multiple lights
    new BatteryTile({x: 5, y: 5}),
    new WireTile({x: 4, y: 5}),
    new BatteryTile({x: 3, y: 5}),
    new LightTile({x: 4, y: 4}),
    new BatteryTile({x: 7, y: 5}),
    new WireTile({x: 6, y: 5}),
    new LightTile({x: 6, y: 4}),
    // drills and such
    new WireTile({x: 12, y: 3}),
    new DrillTile({x: 13, y: 3}),
    new ConveyorTile({x: 13, y: 4}, Direction.up),
    new ConveyorTile({x: 14, y: 4}, Direction.up),
    // just to look at them
    new ConveyorTile({x: 9, y: 4}, Direction.up),
    new ConveyorTile({x: 10, y: 4}, Direction.down),
    new ConveyorTile({x: 9, y: 5}, Direction.left),
    new ConveyorTile({x: 10, y: 5}, Direction.right),
  ];
  Map.land = [
    new CoalTile({x: 13, y: 3}),
    new CoalTile({x: 14, y: 3}),
    new CoalTile({x: 13, y: 2}),
    new CoalTile({x: 14, y: 2})
  ]
}

function drawSelector(pos: PositionLike, color?: string) {
  if(color) context.fillStyle = color;
  let left = (pos.x - Player.pos.x) * zoomLevel - scrX;
  let top = (pos.y - Player.pos.y) * zoomLevel - scrY;
  context.fillRect(left, top, zoomLevel/3, zoomLevel/10);
  context.fillRect(left, top, zoomLevel/10, zoomLevel/3);
  context.fillRect(left + zoomLevel * 2/3, top, zoomLevel/3, zoomLevel/10);
  context.fillRect(left + zoomLevel * 9/10, top, zoomLevel/10, zoomLevel/3);
  context.fillRect(left, top + zoomLevel * 9/10, zoomLevel/3, zoomLevel/10);
  context.fillRect(left, top + zoomLevel * 2/3, zoomLevel/10, zoomLevel/3);
  context.fillRect(left + zoomLevel * 2/3, top + zoomLevel * 9/10, zoomLevel/3, zoomLevel/10);
  context.fillRect(left + zoomLevel * 9/10, top + zoomLevel * 2/3, zoomLevel/10, zoomLevel/3);
}

function frame() {
  context.clearRect(0, 0, canvas.width, canvas.height); // clear screen
  if(keysDown["a"]) Player.pos.x -= 0.1;
  if(keysDown["d"]) Player.pos.x += 0.1;
  if(keysDown["w"]) Player.pos.y -= 0.1;
  if(keysDown["s"]) Player.pos.y += 0.1;
  for(let i of Map.land) i.render(context);
  for(let i of Map.tiles) i.render(context);
  // draw the selector thingy
  drawSelector(Map.mousePos, (Player.tileUnderCursor ? "cyan" : "white"));
  if(Player.tileUnderCursor) drawSelector(Player.tileUnderCursor.pos, "cyan");
  // tooltip stuff
  let tip = (Map.hoveredTile ? Map.hoveredTile.tooltip : "");
  if(tip) {
    getId("tooltip").style.display = "block";
    getId("tooltip").innerHTML = tip;
  } else {
    getId("tooltip").style.display = "none";
  }
  let tip2 = (Map.hoveredLand ? Map.hoveredLand.tooltip : "");
  if(tip2) {
    getId("tooltip2").style.display = "block";
    getId("tooltip2").innerHTML = tip2;
  } else {
    getId("tooltip2").style.display = "none";
  }
  // circuits!
  // first, reset all circuit info
  for(let i of Map.tiles) i.circuitInfo = [];
  let wiresWalked: WireTile[] = [];
  for(let wire of Map.tiles.filter(x => x instanceof WireTile) as WireTile[]) {
    if(wiresWalked.includes(wire)) continue;
    // for each wire, walk around, following wires, looking for power source and drain tiles
    let toSearch = [wire];
    let powerDrains: PowerDrainTile[] = [];
    let powerSources: PowerSourceTile[] = [];
    let wiresHere = [wire];
    let resistances: number[] = [];
    let voltage = 0;
    while(toSearch.length) {
      let i = toSearch[0];
      let u = Map.tileAt(i.pos.plus({x: 0, y: -1}));
      let d = Map.tileAt(i.pos.plus({x: 0, y: 1}));
      let l = Map.tileAt(i.pos.plus({x: -1, y: 0}));
      let r = Map.tileAt(i.pos.plus({x: 1, y: 0}));
      for(let otherTile of [u, d, l, r]) {
        if(otherTile && otherTile instanceof WireTile && !wiresWalked.includes(otherTile)) {
          toSearch.push(otherTile);
          wiresHere.push(otherTile);
        }
        if(otherTile && otherTile instanceof PowerDrainTile && i.isConnected(otherTile)) {
          powerDrains.push(otherTile);
          resistances.push(otherTile.resistance);
        }
        if(otherTile && otherTile instanceof PowerSourceTile && i.isConnected(otherTile) && (otherTile.maxEnergy == 0 || otherTile.energy > 0)) {
          powerSources.push(otherTile);
          voltage += otherTile.voltage;
        }
      }
      wiresWalked.push(i);
      toSearch.splice(0, 1); // remove the first element
    }
    // keep track of voltage and resistance
    for(let tile of [...wiresHere, ...powerDrains, ...powerSources]) {
      // circuits will always be in parallel, so total R = reciprocal of sum of reciprocals
      tile.circuitInfo.push({
        resistance: 1 / resistances.map(x => 1 / x).reduce((x, y) => x + y, 0),
        voltage: voltage,
        sources: powerSources.map(x => x.voltage)
      });
    }
  }
  // drain energy
  for(let powerSource of Map.tiles.filter(x => x instanceof PowerSourceTile && x.maxEnergy > 0 && x.wattageTotal < Infinity) as PowerSourceTile[]) {
    powerSource.energy = Math.max(0, powerSource.energy - powerSource.wattageTotal / framerate);
  }
  // tooltips
  let t = Map.hoveredTile;
  if(t) {
    if(t instanceof PowerSourceTile) {
      if(t.maxEnergy >= 10e3) getId("tooltip").innerHTML += format(`<b> Energy: <s${Color.joules}s>${Math.floor(t.energy / 10) / 100}</> / <s${Color.joules}s>${Math.floor(t.maxEnergy / 10) / 100}</> kJ`);
      else if(t.maxEnergy > 0) getId("tooltip").innerHTML += format(`<b> Energy: <s${Color.joules}s>${Math.floor(t.energy)}</> / <s${Color.joules}s>${t.maxEnergy}</> J`);
      getId("tooltip").innerHTML += format(`<b> Voltage: <s${Color.volts}s>${t.voltage}</> V`);
      if(t.wattageTotal < Infinity) getId("tooltip").innerHTML += format(`<b> Power: <s${Color.watts}s>${Math.floor(t.wattageTotal * 100) / 100}</> W`);
    }
    if(t instanceof PowerDrainTile) {
      getId("tooltip").innerHTML += format(`
      <b> Resistance: <s${Color.ohms}s>${Math.round(t.resistance * 100) / 100}</> O
      <b> Current: <s${Color.amps}s>${Math.round(t.currentTotal * 100) / 100}</> A
      <b> Power: <s${Color.watts}s>${Math.round(t.wattageTotal * 100) / 100}</> W
      `);
    }
    let hasV = t.circuitVoltageTotal > 0;
    let hasR = t.circuitResistanceTotal > 0;
    if(hasV) getId("tooltip").innerHTML += format(`<b> Circuit Voltage: <s${Color.volts}s>${Math.round(t.circuitVoltageTotal * 100 / t.circuitInfo.length) / 100}</> V`);
    if(hasR) getId("tooltip").innerHTML += format(`<b> Circuit Resistance: <s${Color.ohms}s>${Math.round(t.circuitResistanceTotal * 100 / t.circuitInfo.length) / 100}</> O`);
    if(hasV && hasR) {
      getId("tooltip").innerHTML += format(`
      <b> Circuit Current: <s${Color.amps}s>${Math.round(t.circuitCurrentTotal * 100 / t.circuitInfo.length) / 100}</> A
      <b> Circuit Power: <s${Color.watts}s>${Math.round(t.circuitWattageTotal * 100 / t.circuitInfo.length) / 100}</> W
      `);
    }
  }
  // tick
  for(let i of Map.tiles) i.tick();
}

document.onclick = function() {
  if(Player.tileUnderCursor && !Map.hoveredTile) {
    // move the tile to the targeted position
    Player.tileUnderCursor.pos = Map.mousePos;
    Player.tileUnderCursor = undefined;
  } else if(Map.hoveredTile) {
    Player.tileUnderCursor = Map.hoveredTile;
  }
}

initialize();
log("Initialization complete.");
setInterval(function() {
  try { frame(); }
  catch(e) { log("Error! " + e); }
}, (1000 / framerate));