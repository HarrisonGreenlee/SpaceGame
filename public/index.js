const socket = io(`ws://localhost:5000`);
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let tickRate = 30;
let keyDown = {};
let keyMap = {
    65: 'left',  // A for turning left
    68: 'right', // D for turning right
    87: 'up',    // W for accelerating
    83: 'down',  // S for decelerating
    32: 'shoot'  // Space for shooting
};

let myShipId = null;
let bullets = []; // Array to hold bullet positions
let isGameOver = false;
let arenaCenter = { x: 0, y: 0 };
let arenaRadius = 0;

socket.on('yourShip', function(id) {
    myShipId = id; // Store my ship's ID
});

// Listen for the arena size from the server
socket.on('arenaSize', function(data) {
    arenaCenter = data.center;
    arenaRadius = data.radius;
});

function drawArena() {
    ctx.beginPath();
    console.log(arenaCenter.x);
    console.log(arenaCenter.y);
    console.log(arenaRadius);
    ctx.arc(arenaCenter.x, arenaCenter.y, arenaRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'black';
    ctx.fill()
    // ctx.stroke();
}

function drawShip(x, y, rotation) {
    ctx.save();

    ctx.translate(x, y); // Move to the ship's position
    ctx.rotate((rotation + 90) * Math.PI / 180); // Convert degrees to radians and rotate

    // Draw the ship as a triangle
    ctx.beginPath();
    ctx.moveTo(0, -15); // Tip of the ship
    ctx.lineTo(-10, 10); // Left corner
    ctx.lineTo(10, 10); // Right corner
    ctx.closePath();
    ctx.fillStyle = "blue"
    ctx.stroke();

    ctx.restore();
}

function drawBullet(x, y) {
    var gradient = ctx.createRadialGradient(x, y, 1, x, y, 10);
    gradient.addColorStop(0, 'black');
    gradient.addColorStop(1, 'grey');
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;//'black';
    ctx.fill();
}

socket.on('spaceshipsMove', function(spaceshipsPositions) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (isGameOver) {
        displayGameOver();
    }

    if (myShipId && spaceshipsPositions[myShipId]) {
        const myShip = spaceshipsPositions[myShipId];

        ctx.save();

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.translate(-myShip.x, -myShip.y);


        var gradient = ctx.createRadialGradient(arenaCenter.x, arenaCenter.y, 10, arenaCenter.x, arenaCenter.y, arenaRadius);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, 'black');

        ctx.beginPath();
        ctx.arc(arenaCenter.x, arenaCenter.y, arenaRadius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();


        bullets.forEach(bullet => {
            drawBullet(bullet.x, bullet.y);
        });
        

        for (let id in spaceshipsPositions) {
            const ship = spaceshipsPositions[id];
            drawShip(ship.x, ship.y, ship.rot);
        }

        ctx.restore();
    }
});

socket.on('bulletsMove', function(bulletsPositions) {
    bullets = bulletsPositions;
});

document.addEventListener('keydown', function(e) {
    if (keyMap[e.keyCode]) {
        keyDown[keyMap[e.keyCode]] = true;
    }
});

document.addEventListener('keyup', function(e) {
    if (keyMap[e.keyCode]) {
        keyDown[keyMap[e.keyCode]] = false;
    }
});

socket.on('shipDestroyed', function() {
    isGameOver = true;
});

function displayGameOver() {
    console.log("ded")
    const gameOverText = "Game Over! Your ship has been destroyed.";
    ctx.font = "30px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    // Draw the text in the middle of the canvas
    ctx.fillText(gameOverText, canvas.width / 2, canvas.height / 2);
}

var tick = function() {
    let movement = {
        turnLeft: keyDown['left'] || false,
        turnRight: keyDown['right'] || false,
        accelerate: keyDown['up'] || false,
        decelerate: keyDown['down'] || false,
        shoot: keyDown['shoot'] || false
    };

    socket.emit('moveSpaceship', movement);

    setTimeout(tick, 1000 / tickRate);
};

tick();
