type Timeout = ReturnType<typeof setTimeout>;

enum Direction {
  Up,
  Right,
  Down,
  Left
}

const Transforms = {
  [Direction.Up]: [0, 1],
  [Direction.Right]: [1, 0],
  [Direction.Down]: [0, -1],
  [Direction.Left]: [-1, 0]
};

type ID = string;
type Coord = [number, number];
type Instruction = [Direction, Coord];

const DELIMITER = ",";
const toId = (coord: Coord): ID => coord.join(DELIMITER);
const toCoord = (id?: ID) => id?.split(DELIMITER).map(Number) as Coord;

let playing = false;

const canvas = document.createElement("canvas");
canvas.style.width = "100vw";
canvas.style.height = "100vh";
document.getElementById("root")?.appendChild(canvas);
const width = canvas.clientWidth;
const height = canvas.clientHeight;
const ctx = canvas.getContext("2d")!;

const smaller = Math.min(width, height);
const size = Math.floor(smaller / 10);
const rect = {
  size: size,
  spacing: 1
};

let animationId: number;
let gameLoopId: Timeout;
const GAME_LOOP_MS = 250;
let segments = 5;
let head: Coord = [Math.round(width / 2), Math.round(height / 2)];
let instructions: Instruction[] = [[Direction.Right, head]];
const startTextWidth = ctx.measureText("Press enter to play").width;

let prevSquares: ID[] | null = null;
let nextSquares: ID[] | null = null;

const rectSize = rect.size + rect.spacing;

const constrainToCanvas = ([x, y]: Coord): Coord => {
  let constrainedX = x;
  let constrainedY = y;

  const rightEdge = width - rectSize;
  const leftEdge = 0;
  const topEdge = 0;
  const bottomEdge = height - rectSize;

  if (x < leftEdge) constrainedX = rightEdge;
  if (x > rightEdge) constrainedX = leftEdge;
  if (y < topEdge) constrainedY = bottomEdge;
  if (y > bottomEdge) constrainedY = topEdge;

  return [constrainedX, constrainedY];
};

const nextCoords = ([direction, [x, y] = head]: Instruction): Coord => {
  const [tx, ty] = Transforms[direction];
  return constrainToCanvas([x + tx * rectSize, y + ty * rectSize]);
};

const passed = (
  [x, y] = ([null, null] as unknown) as Coord,
  [direction, [instructionX, instructionY]]: Instruction
) => {
  switch (direction) {
    case Direction.Up:
      return y > instructionY;
    case Direction.Right:
      return x > instructionX;
    case Direction.Down:
      return y < instructionY;
    case Direction.Left:
      return x < instructionX;
  }
};

function draw() {
  if (nextSquares) {
    prevSquares?.forEach(function clearRemovedSquares(square) {
      if (nextSquares?.includes(square)) return;
      ctx.clearRect(...toCoord(square), rect.size, rect.size);
    });

    nextSquares.forEach(function drawAddedSquares(square) {
      if (prevSquares?.includes(square)) return;
      ctx.fillStyle = "black";
      ctx.fillRect(...toCoord(square), rect.size, rect.size);
    });

    prevSquares = nextSquares;
    nextSquares = null;
  }

  if (playing) {
    return (animationId = requestAnimationFrame(draw));
  }

  cancelAnimationFrame(animationId);
}

function gameLoop() {
  if (!prevSquares && !nextSquares) {
    nextSquares = [...new Array(segments)]
      .fill(null)
      .reduce(
        (next, _, i) => {
          let prev = next[i - 1];
          if (!prev) return next;
          return [...next, nextCoords([Direction.Left, prev])];
        },
        [head]
      )
      .map(toId);
  } else {
    let appliedInstructions = new Set();
    nextSquares = [];
    for (let segmentIdx = 0; segmentIdx < segments; segmentIdx++) {
      const segmentId = prevSquares?.[segmentIdx];
      const segment = toCoord(segmentId);
      const instruction =
        instructions.find((it) => !passed(segment, it)) || instructions[0];
      appliedInstructions.add(instruction);
      const [direction] = instruction;
      const nextCoord = nextCoords([direction, segment]);
      nextSquares.push(toId(nextCoord));
    }

    instructions.forEach(function removeUnusedInstructions(instruction, i) {
      if (appliedInstructions.has(instruction)) return;
      // Don't remove the last instruction:
      if (!i) return;
      instructions.splice(i, 1);
    });
  }

  if (playing) {
    return (gameLoopId = setTimeout(gameLoop, GAME_LOOP_MS));
  }

  clearTimeout(gameLoopId);
}

const handleKeyEvents = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !playing) {
    playing = true;

    // Clear startText:
    ctx.clearRect(
      width / 2 - startTextWidth / 2,
      height / 2 - 10,
      startTextWidth,
      20
    );
    draw();
    gameLoop();
    return;
  }

  let head = toCoord((nextSquares || prevSquares)?.[0]!);
  if (e.key === "ArrowUp") {
    e.preventDefault();
    instructions.push([Direction.Up, head]);
  }

  if (e.key === "ArrowRight") {
    e.preventDefault();
    instructions.push([Direction.Right, head]);
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    instructions.push([Direction.Down, head]);
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    instructions.push([Direction.Left, head]);
  }

  if (e.key === "Escape") {
    playing = false;
  }
};

canvas.width = width;
canvas.height = height;

window.addEventListener("keydown", handleKeyEvents);

ctx.fillText("Press enter to play", width / 2 - startTextWidth / 2, height / 2);

export {};
