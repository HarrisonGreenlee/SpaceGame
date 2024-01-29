const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static("public"));


const port = process.env.PORT || 3000; // Use the PORT environment variable provided by Railway or default to 3000


const spaceshipStates = {};
const bullets = [];

const arena = {
    center: { x: 500, y: 500 },
    radius: 3000
};

io.on("connection", (socket) => {
    console.log("user connected: ", socket.id);

    // Initialize spaceship state for new connection
    spaceshipStates[socket.id] = { x: arena.center.x, y: arena.center.y, vel: 0, rot: -90, alive: true };

    socket.emit('yourShip', socket.id);
    socket.emit('arenaSize', arena);
    

    // Handle movement input from clients
    socket.on('moveSpaceship', (movement) => {
        const spaceship = spaceshipStates[socket.id];
        if (spaceship && spaceship.alive) {
            spaceship.movement = movement;
        }
    });

    socket.on('disconnect', () => {
        delete spaceshipStates[socket.id];
        console.log("user disconnected: ", socket.id);
    });
});

// Check for collisions between bullets, arena, and spaceships
function checkCollisions() {
    bullets.forEach((bullet, index) => {
        // Check if the bullet is outside the arena
        if (Math.hypot(bullet.x - arena.center.x, bullet.y - arena.center.y) > arena.radius) {
            bullets.splice(index, 1); // Despawn bullet
            return; // Move to the next bullet
        }

        if (!bullet.active) return; // Skip inactive bullets

        for (let id in spaceshipStates) {
            //if (id === bullet.originId) continue; // uncomment to skip the ship that fired the bullet

            const ship = spaceshipStates[id];
            if (ship.alive && Math.hypot(ship.x - bullet.x, ship.y - bullet.y) < 20) { // Assuming a collision radius
                io.to(id).emit('shipDestroyed');
                ship.alive = false; // Mark ship as destroyed
                break; // Break out of the loop to prevent multiple collisions with the same bullet
            }
        }
    });

    // Check spaceships for collisions with the arena boundary
    for (let id in spaceshipStates) {
        const ship = spaceshipStates[id];
        if (ship.alive && Math.hypot(ship.x - arena.center.x, ship.y - arena.center.y) > arena.radius) {
            io.to(id).emit('shipDestroyed');
            ship.alive = false; // Mark ship as destroyed
        }
    }
}

function gameTick() {
    // Update spaceship positions based on stored movement commands
    for (const id in spaceshipStates) {
        const spaceship = spaceshipStates[id];
        if (spaceship.movement && spaceship.alive) {
            if (spaceship.movement.turnLeft) {
                spaceship.rot -= 5;
            }
            if (spaceship.movement.turnRight) {
                spaceship.rot += 5;
            }
            if (spaceship.movement.accelerate) {
                spaceship.vel += 1;
            }
            if (spaceship.movement.decelerate) {
                spaceship.vel -= 1;
            }
            if (spaceship.movement.shoot) {
                const bullet = {
                    x: spaceship.x + (spaceship.vel - 10) * Math.cos(spaceship.rot * Math.PI / 180),
                    y: spaceship.y + (spaceship.vel - 10) * Math.sin(spaceship.rot * Math.PI / 180),
                    vel: spaceship.vel * 1.1 + 10, // Increase bullet velocity for effect
                    rot: spaceship.rot,
                    originId: id, // Store the ID of the ship that fired the bullet
                    active: false // Initially, the bullet is not active
                };
                bullets.push(bullet);
            }
            spaceship.x += spaceship.vel * Math.cos(spaceship.rot * Math.PI / 180);
            spaceship.y += spaceship.vel * Math.sin(spaceship.rot * Math.PI / 180);
        }
    }

    // Update bullet positions
    bullets.forEach(bullet => {
        bullet.x += bullet.vel * Math.cos(bullet.rot * Math.PI / 180);
        bullet.y += bullet.vel * Math.sin(bullet.rot * Math.PI / 180);
    
        // Check if the bullet is far enough from its originating ship to become active
        const originShip = spaceshipStates[bullet.originId];
        if (!bullet.active && originShip && Math.hypot(originShip.x - bullet.x, originShip.y - bullet.y) > 50) { // Threshold distance
            bullet.active = true; // Bullet becomes active
        }
    });

    // Check for collisions
    checkCollisions();

    // Remove destroyed ships and bullets that are out of bounds
    for (let id in spaceshipStates) {
        if (!spaceshipStates[id].alive) {
            delete spaceshipStates[id];
        }
    }

    // Broadcast updated game state
    io.emit('spaceshipsMove', spaceshipStates);
    io.emit('bulletsMove', bullets);
}

// Set game tick interval (e.g., 30 times per second)
setInterval(gameTick, 1000 / 30);

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
