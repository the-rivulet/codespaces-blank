export function getId<T extends HTMLElement> (x: string): T {return document.getElementById(x) as T;}
export let log = (x: string) => { getId("log").innerText = x + "\n" + getId("log").innerText; }

export let scrX = 0, scrY = 0, mouseX = 0, mouseY = 0;
document.onmousemove = function(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
  scrX = 0.3 * (e.clientX - 0.5 * window.innerWidth);
  scrY = 0.3 * (e.clientY - 0.5 * window.innerHeight);
  getId("tooltip").style.left = (e.clientX + 20).toString();
  getId("tooltip").style.top = (e.clientY + 20).toString();
}

export let format = (x: string) => x.replace(/\<s/g, "<span style='color: ")
  .replace(/s\>/g, "'>")
  .replace(/\<\/\>/g, "</span>")
  .replace(/\<b\>/g, "<br/>");

export let keysDown = {};
document.onkeydown = function(e) {
  keysDown[e.key] = true;
}
document.onkeyup = function(e) {
  keysDown[e.key] = false;
}

export class Position {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  equals(other: Position) {
    return this.x == other.x && this.y == other.y;
  }
  plus(x = 0, y = 0) {
    return new Position(this.x + x, this.y + y);
  }
  toString() {
    return "(" + this.x + ", " + this.y + ")";
  }
}

export let zoomLevel = 80;
export let framerate = 30;

export enum Direction {
  down, up, left, right
}

export interface CircuitInfo {
  voltage: number;
  resistance: number;
  sources: number[];
}

export enum Color {
  joules = "cyan",
  watts = "gold",
  ohms = "orange",
  amps = "yellow",
  volts = "lime"
}