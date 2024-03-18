export function getId(x) { return document.getElementById(x); }
export let log = (x) => { getId("log").innerText = x + "\n" + getId("log").innerText; };
export let scrX = 0, scrY = 0, mouseX = 0, mouseY = 0;
document.onmousemove = function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    scrX = 0.3 * (e.clientX - 0.5 * window.innerWidth);
    scrY = 0.3 * (e.clientY - 0.5 * window.innerHeight);
    getId("tooltip").style.left = (e.clientX + 20).toString();
    getId("tooltip").style.top = (e.clientY + 20).toString();
    if (getId("tooltip").style.display == "block") {
        getId("tooltip2").style.left = (e.clientX - getId("tooltip2").clientWidth).toString();
        getId("tooltip2").style.top = (e.clientY + 20).toString();
    }
    else {
        getId("tooltip2").style.left = (e.clientX + 20).toString();
        getId("tooltip2").style.top = (e.clientY + 20).toString();
    }
};
export let format = (x) => x.replace(/\<s/g, "<span style='color: ")
    .replace(/s\>/g, "'>")
    .replace(/\<\/\>/g, "</span>")
    .replace(/\<b\>/g, "<br/>");
export let keysDown = {};
document.onkeydown = function (e) {
    keysDown[e.key] = true;
};
document.onkeyup = function (e) {
    keysDown[e.key] = false;
};
export class Position {
    x;
    y;
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    equals(other) {
        return this.x == other.x && this.y == other.y;
    }
    plus(x) {
        return (x == Direction.up || x == Direction.down || x == Direction.left || x == Direction.right) ?
            this.plus(asPosition(x)) : new Position(this.x + x.x, this.y + x.y);
    }
    toString() {
        return "(" + this.x + ", " + this.y + ")";
    }
}
export let zoomLevel = 80;
export let framerate = 30;
export var Direction;
(function (Direction) {
    Direction[Direction["down"] = 0] = "down";
    Direction[Direction["up"] = 1] = "up";
    Direction[Direction["left"] = 2] = "left";
    Direction[Direction["right"] = 3] = "right";
})(Direction || (Direction = {}));
function asPosition(dir) {
    switch (dir) {
        case Direction.up:
            return { x: 0, y: -1 };
        case Direction.down:
            return { x: 0, y: 1 };
        case Direction.left:
            return { x: -1, y: 0 };
        default:
            return { x: 1, y: 0 };
    }
}
function opposite(dir) {
    switch (dir) {
        case Direction.up: return Direction.down;
        case Direction.down: return Direction.up;
        case Direction.left: return Direction.right;
        default: return Direction.left;
    }
}
export let DirUtils = {
    asPosition: asPosition,
    opposite: opposite
};
export var Color;
(function (Color) {
    Color["joules"] = "cyan";
    Color["watts"] = "gold";
    Color["ohms"] = "orange";
    Color["amps"] = "yellow";
    Color["volts"] = "lime";
})(Color || (Color = {}));
export var Item;
(function (Item) {
    Item["coal"] = "coal";
})(Item || (Item = {}));
export class Inventory {
    items = [];
    find(item) {
        let matches = this.items.filter(x => x.item == item);
        return matches.length ? matches[0] : null;
    }
    count(item) {
        let i = this.find(item);
        return i ? i.amount : 0;
    }
    get totalCount() {
        return this.items.reduce((x, y) => x + y.amount, 0);
    }
    addSlot(slot) {
        if (this.find(slot.item))
            this.items.filter(x => x.item == slot.item)[0].amount += slot.amount;
        else
            this.items.push(slot);
    }
    add(item, amount) {
        this.addSlot({ item: item, amount: amount });
    }
    subtractSlot(slot) {
        if (this.count(slot.item) > slot.amount) {
            this.items.filter(x => x.item == slot.item)[0].amount -= slot.amount;
        }
        else
            this.remove(slot.item);
    }
    subtract(item, amount) {
        this.subtractSlot({ item: item, amount: amount });
    }
    remove(item) {
        let i = this.find(item);
        if (i) {
            return this.items.splice(this.items.indexOf(i), 1)[0];
        }
    }
    toString() {
        return this.items.sort((x, y) => x.amount - y.amount).map(x => "&nbsp; &nbsp; " + x.item + " x " + x.amount + "<b>").join("");
    }
}
