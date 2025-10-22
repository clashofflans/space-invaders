// grab canvas and stuff
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const finalScoreElement = document.getElementById('finalScore');
const gameOverElement = document.getElementById('gameOver');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

let gameRunning = false;
let score = 0;
let lives = 3;
let animationId;

const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 60,
    width: 40,
    height: 40,
    speed: 5,
    dx: 0
};

let bullets = [];
const bulletSpeed = 7;
const bulletWidth = 4;
const bulletHeight = 15;

let enemies = [];
const enemyRows = 4;
const enemyCols = 8;
const enemyWidth = 35;
const enemyHeight = 35;
const enemyPadding = 15;
const enemyOffsetTop = 50;
const enemyOffsetLeft = 80;
let enemySpeed = 1;
let enemyDirection = 1;
let enemyDropDistance = 20;

// enemy fire
let enemyBullets = [];
const enemyBulletSpeed = 3;
const enemyShootChance = 0.001; // tweak this if too hard/easy

const keys = {};

function createEnemies() {
    enemies = [];
    for (let row = 0; row < enemyRows; row++) {
        for (let col = 0; col < enemyCols; col++) {
            enemies.push({
                x: enemyOffsetLeft + col * (enemyWidth + enemyPadding),
                y: enemyOffsetTop + row * (enemyHeight + enemyPadding),
                width: enemyWidth,
                height: enemyHeight,
                alive: true
            });
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // ship cockpit
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(player.x + 15, player.y - 10, 10, 10);
    ctx.fillRect(player.x, player.y + 35, 10, 5);
    ctx.fillRect(player.x + 30, player.y + 35, 10, 5);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(enemy.x + 5, enemy.y + 5, 8, 8);
            ctx.fillRect(enemy.x + 22, enemy.y + 5, 8, 8);
            ctx.fillRect(enemy.x + 10, enemy.y + 20, 15, 8);
        }
    });
}

function drawBullets() {
    ctx.fillStyle = '#ffff00';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
    });

    ctx.fillStyle = '#ff6600';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
    });
}

function updatePlayer() {
    player.x += player.dx;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

function updateBullets() {
    bullets = bullets.filter(bullet => {
        bullet.y -= bulletSpeed;
        return bullet.y > 0;
    });
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.y += enemyBulletSpeed;
        return bullet.y < canvas.height;
    });
}

function updateEnemies() {
    let hitEdge = false;

    enemies.forEach(enemy => {
        if (enemy.alive) {
            enemy.x += enemySpeed * enemyDirection;

            if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
                hitEdge = true;
            }

            if (Math.random() < enemyShootChance) {
                enemyBullets.push({
                    x: enemy.x + enemy.width / 2 - bulletWidth / 2,
                    y: enemy.y + enemy.height
                });
            }
        }
    });

    // move down and reverse when hit edge
    if (hitEdge) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            if (enemy.alive) {
                enemy.y += enemyDropDistance;
            }
        });
    }
}

function checkCollisions() {
    // check hits on enemies
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (enemy.alive &&
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bulletWidth > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bulletHeight > enemy.y) {

                enemy.alive = false;
                bullets.splice(bulletIndex, 1);
                score += 10;
                scoreElement.textContent = score;

                if (score % 100 === 0) {
                    enemySpeed += 0.5; // gets harder
                }
            }
        });
    });

    enemyBullets.forEach((bullet, bulletIndex) => {
        if (bullet.x < player.x + player.width &&
            bullet.x + bulletWidth > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bulletHeight > player.y) {

            enemyBullets.splice(bulletIndex, 1);
            loseLife();
        }
    });

    enemies.forEach(enemy => {
        if (enemy.alive && enemy.y + enemy.height >= player.y) {
            gameOver();
        }
    });

    if (enemies.every(enemy => !enemy.alive)) {
        nextWave();
    }
}

function loseLife() {
    lives--;
    livesElement.textContent = lives;

    if (lives <= 0) {
        gameOver();
    } else {
        player.x = canvas.width / 2 - 20;
        enemyBullets = [];
    }
}

function nextWave() {
    createEnemies();
    enemySpeed += 0.5;
    bullets = [];
    enemyBullets = [];
}

function gameOver() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    finalScoreElement.textContent = score;
    restartButton.style.display = 'inline-block';
    startButton.style.display = 'none';
    cancelAnimationFrame(animationId);
}

function clear() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// TODO: make stars move for parallax effect?
function drawStars() {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        ctx.fillRect(x, y, size, size);
    }
}

function gameLoop() {
    if (!gameRunning) return;

    clear();
    drawStars();

    updatePlayer();
    updateBullets();
    updateEnemies();
    checkCollisions();

    drawPlayer();
    drawEnemies();
    drawBullets();

    animationId = requestAnimationFrame(gameLoop);
}

const moveLeft = () => player.dx = -player.speed;
const moveRight = () => player.dx = player.speed;
const stopMoving = () => player.dx = 0;

function shoot() {
    bullets.push({
        x: player.x + player.width / 2 - bulletWidth / 2,
        y: player.y
    });
}

document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

    keys[e.key] = true;

    if (e.key === 'ArrowLeft') {
        moveLeft();
    } else if (e.key === 'ArrowRight') {
        moveRight();
    } else if (e.key === ' ') {
        e.preventDefault();
        if (!keys.shooting) {
            shoot();
            keys.shooting = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        stopMoving();
    } else if (e.key === ' ') {
        keys.shooting = false;
    }
});

function startGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    enemySpeed = 1;
    bullets = [];
    enemyBullets = [];
    player.x = canvas.width / 2 - 20;

    scoreElement.textContent = score;
    livesElement.textContent = lives;
    gameOverElement.style.display = 'none';
    startButton.style.display = 'none';
    restartButton.style.display = 'none';

    createEnemies();
    gameLoop();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// initial screen
clear();
drawStars();
ctx.fillStyle = '#00ff00';
ctx.font = '30px Courier New';
ctx.textAlign = 'center';
ctx.fillText('Press Start to Begin!', canvas.width / 2, canvas.height / 2);
