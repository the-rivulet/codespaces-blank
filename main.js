import { getId, scrX, scrY, keysDown, log, Position, zoomLevel, format, framerate, Color } from "./globals.js";
import { Map, PowerDrainTile, PowerSourceTile, WireTile } from "./map.js";
import { BatteryTile, LightTile } from "./tileset.js";
import { Player } from "./player.js";
let canvas = getId("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let context = canvas.getContext("2d"); // override
context.fillStyle = "red";
function initialize() {
    // not circuits
    Map.tiles.push(new LightTile(new Position(1, 1)));
    Map.tiles.push(new WireTile(new Position(1, 2)));
    Map.tiles.push(new WireTile(new Position(0, 3)));
    Map.tiles.push(new WireTile(new Position(0, 4)));
    Map.tiles.push(new BatteryTile(new Position(0, 5)));
    // 1 light, 1 battery
    Map.tiles.push(new BatteryTile(new Position(11, 4)));
    Map.tiles.push(new WireTile(new Position(11, 3)));
    Map.tiles.push(new WireTile(new Position(11, 2)));
    Map.tiles.push(new LightTile(new Position(11, 1)));
    // 2 lights, 1 battery
    Map.tiles.push(new WireTile(new Position(5, 2)));
    Map.tiles.push(new WireTile(new Position(4, 2)));
    Map.tiles.push(new LightTile(new Position(5, 1)));
    Map.tiles.push(new LightTile(new Position(4, 1)));
    Map.tiles.push(new BatteryTile(new Position(3, 2)));
    // 1 light, 2 batteries
    Map.tiles.push(new WireTile(new Position(8, 2)));
    Map.tiles.push(new LightTile(new Position(8, 1)));
    Map.tiles.push(new BatteryTile(new Position(7, 2)));
    Map.tiles.push(new BatteryTile(new Position(9, 2)));
    Map.tiles.push(new BatteryTile(new Position(8, 3)));
    // battery powering multiple lights
    Map.tiles.push(new BatteryTile(new Position(5, 5)));
    Map.tiles.push(new WireTile(new Position(4, 5)));
    Map.tiles.push(new BatteryTile(new Position(3, 5)));
    Map.tiles.push(new LightTile(new Position(4, 4)));
    Map.tiles.push(new BatteryTile(new Position(7, 5)));
    Map.tiles.push(new WireTile(new Position(6, 5)));
    Map.tiles.push(new LightTile(new Position(6, 4)));
}
function drawSelector(pos, color) {
    if (color)
        context.fillStyle = color;
    let left = (pos.x - Player.pos.x) * zoomLevel - scrX;
    let top = (pos.y - Player.pos.y) * zoomLevel - scrY;
    context.fillRect(left, top, zoomLevel / 3, zoomLevel / 10);
    context.fillRect(left, top, zoomLevel / 10, zoomLevel / 3);
    context.fillRect(left + zoomLevel * 2 / 3, top, zoomLevel / 3, zoomLevel / 10);
    context.fillRect(left + zoomLevel * 9 / 10, top, zoomLevel / 10, zoomLevel / 3);
    context.fillRect(left, top + zoomLevel * 9 / 10, zoomLevel / 3, zoomLevel / 10);
    context.fillRect(left, top + zoomLevel * 2 / 3, zoomLevel / 10, zoomLevel / 3);
    context.fillRect(left + zoomLevel * 2 / 3, top + zoomLevel * 9 / 10, zoomLevel / 3, zoomLevel / 10);
    context.fillRect(left + zoomLevel * 9 / 10, top + zoomLevel * 2 / 3, zoomLevel / 10, zoomLevel / 3);
}
function frame() {
    context.clearRect(0, 0, canvas.width, canvas.height); // clear screen
    if (keysDown["a"])
        Player.pos.x -= 0.1;
    if (keysDown["d"])
        Player.pos.x += 0.1;
    if (keysDown["w"])
        Player.pos.y -= 0.1;
    if (keysDown["s"])
        Player.pos.y += 0.1;
    for (let i of Map.tiles) {
        i.render(context);
    }
    // draw the selector thingy
    drawSelector(Map.mousePos, (Player.tileUnderCursor ? "cyan" : "white"));
    if (Player.tileUnderCursor)
        drawSelector(Player.tileUnderCursor.pos, "cyan");
    // tooltip stuff
    let tip = (Map.hoveredTile ? Map.hoveredTile.tooltip : "");
    if (tip) {
        getId("tooltip").style.display = "block";
        getId("tooltip").innerHTML = tip;
    }
    else {
        getId("tooltip").style.display = "none";
    }
    // circuits!
    // first, reset all circuit info
    for (let i of Map.tiles)
        i.circuitInfo = [];
    let wiresWalked = [];
    for (let wire of Map.tiles.filter(x => x instanceof WireTile)) {
        if (wiresWalked.includes(wire))
            continue;
        // for each wire, walk around, following wires, looking for power source and drain tiles
        let toSearch = [wire];
        let powerDrains = [];
        let powerSources = [];
        let wiresHere = [wire];
        let resistances = [];
        let voltage = 0;
        while (toSearch.length) {
            let i = toSearch[0];
            let u = Map.tileAt(i.pos.plus(0, -1));
            let d = Map.tileAt(i.pos.plus(0, 1));
            let l = Map.tileAt(i.pos.plus(-1));
            let r = Map.tileAt(i.pos.plus(1));
            for (let otherTile of [u, d, l, r]) {
                if (otherTile && otherTile instanceof WireTile && !wiresWalked.includes(otherTile)) {
                    toSearch.push(otherTile);
                    wiresHere.push(otherTile);
                }
                if (otherTile && otherTile instanceof PowerDrainTile && i.isConnected(otherTile)) {
                    powerDrains.push(otherTile);
                    resistances.push(otherTile.resistance);
                }
                if (otherTile && otherTile instanceof PowerSourceTile && i.isConnected(otherTile) && (otherTile.maxEnergy == 0 || otherTile.energy > 0)) {
                    powerSources.push(otherTile);
                    voltage += otherTile.voltage;
                }
            }
            wiresWalked.push(i);
            toSearch.splice(0, 1); // remove the first element
        }
        // keep track of voltage and resistance
        for (let tile of [...wiresHere, ...powerDrains, ...powerSources]) {
            // circuits will always be in parallel, so total R = reciprocal of sum of reciprocals
            tile.circuitInfo.push({
                resistance: 1 / resistances.map(x => 1 / x).reduce((x, y) => x + y, 0),
                voltage: voltage,
                sources: powerSources.map(x => x.voltage)
            });
        }
    }
    // drain energy
    for (let powerSource of Map.tiles.filter(x => x instanceof PowerSourceTile && x.maxEnergy > 0 && x.wattageTotal < Infinity)) {
        powerSource.energy = Math.max(0, powerSource.energy - powerSource.wattageTotal / framerate);
    }
    // tooltips
    let t = Map.hoveredTile;
    if (t) {
        if (t instanceof PowerSourceTile) {
            if (t.maxEnergy >= 10e3)
                getId("tooltip").innerHTML += format(`<b> Energy: <s${Color.joules}s>${Math.floor(t.energy / 10) / 100}</> / <s${Color.joules}s>${Math.floor(t.maxEnergy / 10) / 100}</> kJ`);
            else if (t.maxEnergy > 0)
                getId("tooltip").innerHTML += format(`<b> Energy: <s${Color.joules}s>${Math.floor(t.energy)}</> / <s${Color.joules}s>${t.maxEnergy}</> J`);
            getId("tooltip").innerHTML += format(`<b> Voltage: <s${Color.volts}s>${t.voltage}</> V`);
            if (t.wattageTotal < Infinity)
                getId("tooltip").innerHTML += format(`<b> Power: <s${Color.watts}s>${Math.floor(t.wattageTotal * 100) / 100}</> W`);
        }
        if (t instanceof PowerDrainTile) {
            getId("tooltip").innerHTML += format(`
      <b> Resistance: <s${Color.ohms}s>${Math.round(t.resistance * 100) / 100}</> V
      <b> Current: <s${Color.amps}s>${Math.round(t.currentTotal * 100) / 100}</> A
      <b> Power: <s${Color.watts}s>${Math.round(t.wattageTotal * 100) / 100}</> W
      `);
        }
        let hasV = t.circuitVoltageTotal > 0;
        let hasR = t.circuitResistanceTotal > 0;
        if (hasV)
            getId("tooltip").innerHTML += format(`<b> Circuit Voltage: <s${Color.volts}s>${Math.round(t.circuitVoltageTotal * 100) / 100}</> V`);
        if (hasR)
            getId("tooltip").innerHTML += format(`<b> Circuit Resistance: <s${Color.ohms}s>${Math.round(t.circuitResistanceTotal * 100) / 100}</> O`);
        if (hasV && hasR) {
            getId("tooltip").innerHTML += format(`
      <b> Circuit Current: <s${Color.amps}s>${Math.round(t.circuitCurrentTotal * 100) / 100}</> A
      <b> Circuit Power: <s${Color.watts}s>${Math.round(t.circuitWattageTotal * 100) / 100}</> W
      `);
        }
    }
    // tick
    for (let i of Map.tiles)
        i.tick();
}
document.onclick = function () {
    if (Player.tileUnderCursor && !Map.hoveredTile) {
        // move the tile to the targeted position
        Player.tileUnderCursor.pos = Map.mousePos;
        Player.tileUnderCursor = undefined;
    }
    else if (Map.hoveredTile) {
        Player.tileUnderCursor = Map.hoveredTile;
    }
};
initialize();
log("Initialization complete.");
setInterval(function () {
    try {
        frame();
    }
    catch (e) {
        log("Error! " + e);
    }
}, (1000 / framerate));
