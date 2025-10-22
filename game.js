// grab canvas and stuff
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const finalScoreElement = document.getElementById('finalScore');
const gameOverElement = document.getElementById('gameOver');
const restartButton = document.getElementById('restartButton');
const backToMenuButton = document.getElementById('backToMenu');
const levelDisplay = document.getElementById('levelDisplay');
const currentLevelElement = document.getElementById('currentLevel');
const maxLevelElement = document.getElementById('maxLevel');

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const gameModeParam = urlParams.get('mode');
const levelParam = urlParams.get('level');

// Mobile controls
const touchArea = document.getElementById('touchArea');

let gameRunning = false;
let score = 0;
let lives = 5;
let animationId;
let gameMode = null; // 'infinite' or 'campaign'
let currentLevel = 1;
let maxLevel = 20;
let levelComplete = false;
let isBossLevel = false;
let boss = null;
let bossHealth = 0;
let maxBossHealth = 0;
let deathStarExploding = false;
let explosionTimer = 0;
let explosionParticles = [];
let autoFire = false;
let autoFireTimer = 0;
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

// Audio for sound effects
let blasterSound;
let tieFighterSound;
let audioInitialized = false;

// Initialize audio and load sound effects
function initAudio() {
    if (audioInitialized) return;
    
    try {
        loadBlasterSound();
        loadTieFighterSound();
        audioInitialized = true;
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// Load the blaster sound file using HTML5 Audio
function loadBlasterSound() {
    blasterSound = new Audio('blaster-2-81267.mp3');
    blasterSound.volume = 0.5; // Set volume to 50%
    blasterSound.preload = 'auto';
    
    // Add error handling
    blasterSound.addEventListener('error', function(e) {
        console.log('Error loading blaster audio file:', e);
        // Create a fallback silent audio if the file fails to load
        blasterSound = new Audio();
        blasterSound.volume = 0;
    });
    
    // Add load event listener
    blasterSound.addEventListener('canplaythrough', function() {
        console.log('Blaster audio loaded successfully');
    });
}

// Load the TIE fighter sound file using HTML5 Audio
function loadTieFighterSound() {
    tieFighterSound = new Audio('tie-fighter-fire-1.mp3');
    tieFighterSound.volume = 0.3; // Set volume to 30% (lower than player blaster)
    tieFighterSound.preload = 'auto';
    
    // Add error handling
    tieFighterSound.addEventListener('error', function(e) {
        console.log('Error loading TIE fighter audio file:', e);
        // Create a fallback silent audio if the file fails to load
        tieFighterSound = new Audio();
        tieFighterSound.volume = 0;
    });
    
    // Add load event listener
    tieFighterSound.addEventListener('canplaythrough', function() {
        console.log('TIE fighter audio loaded successfully');
    });
}

// Enable audio on first user interaction
function enableAudio() {
    if (!audioInitialized) {
        initAudio();
    }
    
    // Try to play a silent sound to enable audio context
    if (blasterSound) {
        blasterSound.volume = 0;
        blasterSound.play().then(() => {
            blasterSound.volume = 0.5; // Reset volume
            blasterSound.pause();
            blasterSound.currentTime = 0;
        }).catch(e => {
            console.log('Blaster audio enable failed:', e);
        });
    }
    
    if (tieFighterSound) {
        tieFighterSound.volume = 0;
        tieFighterSound.play().then(() => {
            tieFighterSound.volume = 0.3; // Reset volume
            tieFighterSound.pause();
            tieFighterSound.currentTime = 0;
        }).catch(e => {
            console.log('TIE fighter audio enable failed:', e);
        });
    }
}

// Play blaster sound
function playPewSound() {
    if (!blasterSound) {
        initAudio();
        return;
    }
    
    try {
        // Reset audio to beginning and play
        blasterSound.currentTime = 0;
        blasterSound.play().catch(function(error) {
            console.log('Error playing blaster audio:', error);
        });
    } catch (e) {
        console.log('Error playing blaster sound:', e);
    }
}

// Play TIE fighter sound
function playTieFighterSound() {
    if (!tieFighterSound) {
        initAudio();
        return;
    }
    
    try {
        // Reset audio to beginning and play
        tieFighterSound.currentTime = 0;
        tieFighterSound.play().catch(function(error) {
            console.log('Error playing TIE fighter audio:', error);
        });
    } catch (e) {
        console.log('Error playing TIE fighter sound:', e);
    }
}

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
const enemyPadding = 20; // Increased for TIE fighter solar panels
const enemyOffsetTop = 50;
const enemyOffsetLeft = 80;
let enemySpeed = 1;
let enemyDirection = 1;
let enemyDropDistance = 20;

// enemy fire
let enemyBullets = [];
let enemyBulletSpeed = 3;
let enemyShootChance = 0.001; // tweak this if too hard/easy

function updateDifficulty() {
    if (gameMode === 'campaign') {
        // Increase enemy speed every 3 levels
        enemySpeed = 1 + Math.floor(currentLevel / 3) * 0.5;
        
        // Increase shooting chance every 2 levels
        enemyShootChance = 0.001 + Math.floor(currentLevel / 2) * 0.0005;
        
        // Increase bullet speed every 4 levels
        enemyBulletSpeed = 3 + Math.floor(currentLevel / 4) * 0.5;
    }
}

function updateLevelDisplay() {
    if (gameMode === 'campaign') {
        levelDisplay.style.display = 'block';
        currentLevelElement.textContent = currentLevel;
        maxLevelElement.textContent = maxLevel;
    } else {
        levelDisplay.style.display = 'none';
    }
}

// Initialize game mode from URL parameters
function initializeGameMode() {
    if (gameModeParam === 'infinite') {
        gameMode = 'infinite';
        levelDisplay.style.display = 'none';
        // Auto-start infinite mode
        startGame();
    } else if (gameModeParam === 'campaign') {
        gameMode = 'campaign';
        if (levelParam) {
            // Auto-start specific level
            startLevel(parseInt(levelParam));
        } else {
            // No level specified, redirect to menu
            window.location.href = 'index.html';
        }
    } else {
        // No valid mode, redirect to menu
        window.location.href = 'index.html';
    }
}

function startLevel(level) {
    currentLevel = level;
    gameRunning = true;
    score = 0;
    lives = 5;
    enemySpeed = 1;
    bullets = [];
    enemyBullets = [];
    player.x = canvas.width / 2 - 20;
    showStartMessage = false; // Hide start message when game starts
    
    updateDifficulty();
    updateLevelDisplay();
    
    enableAutoFire(); // Enable auto-fire for mobile
    autoFireTimer = 0;
    enableAudio(); // Enable audio on user interaction
    
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    gameOverElement.style.display = 'none';
    restartButton.style.display = 'none';
    
    createEnemies();
    gameLoop();
}

const keys = {};

// Detect if user is on mobile device
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Enable auto-fire for mobile devices
function enableAutoFire() {
    autoFire = isMobileDevice();
}

function createEnemies() {
    enemies = [];
    
    // Check if this is a boss level
    isBossLevel = (gameMode === 'campaign' && currentLevel % 5 === 0);
    
    if (isBossLevel) {
        // Create boss instead of regular enemies
        createBoss();
        return;
    }
    
    // Scale difficulty based on level
    let rows = enemyRows;
    let cols = enemyCols;
    
    if (gameMode === 'campaign') {
        // Increase enemies per level
        rows = Math.min(enemyRows + Math.floor(currentLevel / 3), 8);
        cols = Math.min(enemyCols + Math.floor(currentLevel / 4), 12);
    }
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
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

function createBoss() {
    // Boss is a much larger Star Destroyer
    const bossWidth = 200;
    const bossHeight = 120;
    const bossHealthPoints = 20 + (currentLevel * 5); // More health for higher levels
    
    boss = {
        x: canvas.width / 2 - bossWidth / 2,
        y: 50,
        width: bossWidth,
        height: bossHeight,
        alive: true,
        dx: 2, // Movement speed
        direction: 1,
        shootTimer: 0,
        shootInterval: 30, // Frames between shots
        specialAttackTimer: 0,
        specialAttackInterval: 180 // Frames between special attacks
    };
    
    bossHealth = bossHealthPoints;
    maxBossHealth = bossHealthPoints;
    enemies = []; // Clear regular enemies for boss fight
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;
    
    // Main X-wing body (fuselage)
    ctx.fillStyle = '#C0C0C0'; // Light gray
    ctx.fillRect(x + w/2 - 3, y + 5, 6, h - 10);
    
    // Fuselage outline
    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Cockpit
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + w/2 - 4, y + 8, 8, 12);
    
    // Cockpit frame
    ctx.strokeStyle = '#708090';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Cockpit highlight
    ctx.fillStyle = '#B0E0E6';
    ctx.fillRect(x + w/2 - 2, y + 10, 4, 8);
    
    // S-foils (wings) - X-wing signature feature
    ctx.fillStyle = '#B8B8B8';
    // Top left wing
    ctx.fillRect(x + 2, y + h/2 - 8, 12, 4);
    // Top right wing
    ctx.fillRect(x + w - 14, y + h/2 - 8, 12, 4);
    // Bottom left wing
    ctx.fillRect(x + 2, y + h/2 + 2, 12, 4);
    // Bottom right wing
    ctx.fillRect(x + w - 14, y + h/2 + 2, 12, 4);
    
    // S-foil details
    ctx.fillStyle = '#A0A0A0';
    ctx.fillRect(x + 4, y + h/2 - 6, 8, 2);
    ctx.fillRect(x + w - 12, y + h/2 - 6, 8, 2);
    ctx.fillRect(x + 4, y + h/2 + 4, 8, 2);
    ctx.fillRect(x + w - 12, y + h/2 + 4, 8, 2);
    
    // Wing tips
    ctx.fillStyle = '#D0D0D0';
    ctx.fillRect(x + 1, y + h/2 - 6, 2, 2);
    ctx.fillRect(x + w - 3, y + h/2 - 6, 2, 2);
    ctx.fillRect(x + 1, y + h/2 + 4, 2, 2);
    ctx.fillRect(x + w - 3, y + h/2 + 4, 2, 2);
    
    // Laser cannons (on wing tips)
    ctx.fillStyle = '#2F2F2F';
    ctx.fillRect(x, y + h/2 - 7, 1, 4);
    ctx.fillRect(x + w - 1, y + h/2 - 7, 1, 4);
    ctx.fillRect(x, y + h/2 + 3, 1, 4);
    ctx.fillRect(x + w - 1, y + h/2 + 3, 1, 4);
    
    // Main engines (4 engines on wings)
    ctx.fillStyle = '#2F2F2F';
    ctx.fillRect(x + 6, y + h - 8, 3, 4);
    ctx.fillRect(x + w - 9, y + h - 8, 3, 4);
    ctx.fillRect(x + 6, y + h - 8, 3, 4);
    ctx.fillRect(x + w - 9, y + h - 8, 3, 4);
    
    // Engine glow
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 7, y + h - 7, 1, 2);
    ctx.fillRect(x + w - 8, y + h - 7, 1, 2);
    ctx.fillRect(x + 7, y + h - 7, 1, 2);
    ctx.fillRect(x + w - 8, y + h - 7, 1, 2);
    
    // Engine exhaust
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 6, y + h - 4, 3, 2);
    ctx.fillRect(x + w - 9, y + h - 4, 3, 2);
    ctx.fillRect(x + 6, y + h - 4, 3, 2);
    ctx.fillRect(x + w - 9, y + h - 4, 3, 2);
    
    // Astromech droid (R2 unit)
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + w/2 - 2, y + h - 12, 4, 6);
    
    // Droid details
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + w/2 - 1, y + h - 11, 2, 2);
    ctx.fillRect(x + w/2 - 1, y + h - 8, 2, 2);
    
    // Navigation lights
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x + 2, y + h/2 - 1, 1, 1);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(x + w - 3, y + h/2 - 1, 1, 1);
    
    // Wing markings (Rebel Alliance)
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 8, y + h/2 - 6, 2, 1);
    ctx.fillRect(x + w - 10, y + h/2 - 6, 2, 1);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            const x = enemy.x;
            const y = enemy.y;
            const w = enemy.width;
            const h = enemy.height;
            
            // TIE Fighter design
            // Central hexagonal cockpit
            ctx.fillStyle = '#2F2F2F'; // Dark gray cockpit
            ctx.beginPath();
            ctx.moveTo(x + w/2, y + 2); // top
            ctx.lineTo(x + w - 2, y + h/2 - 2); // top right
            ctx.lineTo(x + w - 2, y + h/2 + 2); // bottom right
            ctx.lineTo(x + w/2, y + h - 2); // bottom
            ctx.lineTo(x + 2, y + h/2 + 2); // bottom left
            ctx.lineTo(x + 2, y + h/2 - 2); // top left
            ctx.closePath();
            ctx.fill();
            
            // Cockpit outline
            ctx.strokeStyle = '#1F1F1F';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Cockpit window
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.moveTo(x + w/2, y + 4);
            ctx.lineTo(x + w - 4, y + h/2);
            ctx.lineTo(x + w/2, y + h - 4);
            ctx.lineTo(x + 4, y + h/2);
            ctx.closePath();
            ctx.fill();
            
            // Left solar panel
            ctx.fillStyle = '#404040';
            ctx.fillRect(x - 8, y + h/2 - 8, 12, 16);
            
            // Left solar panel details
            ctx.fillStyle = '#505050';
            ctx.fillRect(x - 6, y + h/2 - 6, 8, 3);
            ctx.fillRect(x - 6, y + h/2 - 1, 8, 3);
            ctx.fillRect(x - 6, y + h/2 + 4, 8, 3);
            
            // Right solar panel
            ctx.fillStyle = '#404040';
            ctx.fillRect(x + w - 4, y + h/2 - 8, 12, 16);
            
            // Right solar panel details
            ctx.fillStyle = '#505050';
            ctx.fillRect(x + w - 2, y + h/2 - 6, 8, 3);
            ctx.fillRect(x + w - 2, y + h/2 - 1, 8, 3);
            ctx.fillRect(x + w - 2, y + h/2 + 4, 8, 3);
            
            // Solar panel outlines
            ctx.strokeStyle = '#303030';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 8, y + h/2 - 8, 12, 16);
            ctx.strokeRect(x + w - 4, y + h/2 - 8, 12, 16);
            
            // Solar panel connecting struts
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + w/2 - 1, y + h/2 - 2, 2, 4);
            ctx.fillRect(x - 2, y + h/2 - 1, 2, 2);
            ctx.fillRect(x + w, y + h/2 - 1, 2, 2);
            
            // Engine glow (center)
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x + w/2 - 1, y + h - 3, 2, 2);
            
            // Engine exhaust
            ctx.fillStyle = '#FF6600';
            ctx.fillRect(x + w/2 - 2, y + h - 1, 4, 1);
        }
    });
}

function drawBoss() {
    if (!boss || !boss.alive) return;
    
    const x = boss.x;
    const y = boss.y;
    const w = boss.width;
    const h = boss.height;
    
    // Main boss Star Destroyer hull (larger triangular shape)
    ctx.fillStyle = '#B0B0B0'; // Slightly darker for boss
    ctx.beginPath();
    ctx.moveTo(x + w/2, y + 5); // top point (bow)
    ctx.lineTo(x + w - 5, y + h - 5); // bottom right (stern)
    ctx.lineTo(x + 5, y + h - 5); // bottom left (stern)
    ctx.closePath();
    ctx.fill();
    
    // Hull outline
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Large bridge tower (center of ship)
    ctx.fillStyle = '#D0D0D0';
    ctx.fillRect(x + w/2 - 15, y + h/2 - 25, 30, 35);
    
    // Bridge tower outline
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Multiple bridge windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + w/2 - 12, y + h/2 - 20, 24, 8);
    ctx.fillRect(x + w/2 - 12, y + h/2 - 10, 24, 6);
    ctx.fillRect(x + w/2 - 12, y + h/2 - 2, 24, 4);
    
    // Bridge details
    ctx.fillStyle = '#A0A0A0';
    ctx.fillRect(x + w/2 - 16, y + h/2 - 26, 32, 3);
    ctx.fillRect(x + w/2 - 16, y + h/2 + 8, 32, 3);
    
    // Hull surface details (more extensive)
    ctx.fillStyle = '#A8A8A8';
    // Left side panels
    ctx.fillRect(x + 10, y + h/2 - 15, 20, 8);
    ctx.fillRect(x + 10, y + h/2 - 5, 20, 8);
    ctx.fillRect(x + 10, y + h/2 + 5, 20, 8);
    
    // Right side panels
    ctx.fillRect(x + w - 30, y + h/2 - 15, 20, 8);
    ctx.fillRect(x + w - 30, y + h/2 - 5, 20, 8);
    ctx.fillRect(x + w - 30, y + h/2 + 5, 20, 8);
    
    // Center line detail
    ctx.fillStyle = '#909090';
    ctx.fillRect(x + w/2 - 2, y + 8, 4, h - 16);
    
    // Engine section (rear) - much larger
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(x + 10, y + h - 20, w - 20, 15);
    
    // Main engines (5 large engines)
    ctx.fillStyle = '#1F1F1F';
    ctx.fillRect(x + w/2 - 8, y + h - 18, 6, 10);
    ctx.fillRect(x + w/2 - 20, y + h - 18, 6, 10);
    ctx.fillRect(x + w/2 + 14, y + h - 18, 6, 10);
    ctx.fillRect(x + w/2 - 35, y + h - 18, 6, 10);
    ctx.fillRect(x + w/2 + 29, y + h - 18, 6, 10);
    
    // Engine glow (more intense)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x + w/2 - 6, y + h - 16, 2, 6);
    ctx.fillRect(x + w/2 - 18, y + h - 16, 2, 6);
    ctx.fillRect(x + w/2 + 16, y + h - 16, 2, 6);
    ctx.fillRect(x + w/2 - 33, y + h - 16, 2, 6);
    ctx.fillRect(x + w/2 + 31, y + h - 16, 2, 6);
    
    // Engine exhaust (larger)
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(x + w/2 - 8, y + h - 8, 6, 4);
    ctx.fillRect(x + w/2 - 20, y + h - 8, 6, 4);
    ctx.fillRect(x + w/2 + 14, y + h - 8, 6, 4);
    ctx.fillRect(x + w/2 - 35, y + h - 8, 6, 4);
    ctx.fillRect(x + w/2 + 29, y + h - 8, 6, 4);
    
    // Multiple weapon turrets
    ctx.fillStyle = '#606060';
    // Left side turrets
    ctx.fillRect(x + 5, y + h/2 - 15, 8, 8);
    ctx.fillRect(x + 5, y + h/2 - 5, 8, 8);
    ctx.fillRect(x + 5, y + h/2 + 5, 8, 8);
    
    // Right side turrets
    ctx.fillRect(x + w - 13, y + h/2 - 15, 8, 8);
    ctx.fillRect(x + w - 13, y + h/2 - 5, 8, 8);
    ctx.fillRect(x + w - 13, y + h/2 + 5, 8, 8);
    
    // Bow details
    ctx.fillStyle = '#A8A8A8';
    ctx.fillRect(x + w/2 - 3, y + 3, 6, 6);
    
    // Hull plating lines (more extensive)
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 1;
    // Horizontal lines
    for (let i = 0; i < 6; i++) {
        const lineY = y + h/2 - 20 + i * 8;
        ctx.beginPath();
        ctx.moveTo(x + 8, lineY);
        ctx.lineTo(x + w - 8, lineY);
        ctx.stroke();
    }
    
    // Diagonal hull lines
    ctx.beginPath();
    ctx.moveTo(x + w/2, y + 8);
    ctx.lineTo(x + w - 8, y + h - 8);
    ctx.moveTo(x + w/2, y + 8);
    ctx.lineTo(x + 8, y + h - 8);
    ctx.stroke();
    
    // Navigation lights (more)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x + 3, y + h/2 - 3, 2, 2);
    ctx.fillRect(x + 3, y + h/2 + 1, 2, 2);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(x + w - 5, y + h/2 - 3, 2, 2);
    ctx.fillRect(x + w - 5, y + h/2 + 1, 2, 2);
    
    // Boss health bar
    drawBossHealthBar();
}

function drawBossHealthBar() {
    if (!boss || !boss.alive) return;
    
    const barWidth = 300;
    const barHeight = 20;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 20;
    
    // Health bar background
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health bar border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Health bar fill
    const healthPercent = bossHealth / maxBossHealth;
    const fillWidth = barWidth * healthPercent;
    
    if (healthPercent > 0.6) {
        ctx.fillStyle = '#00FF00'; // Green
    } else if (healthPercent > 0.3) {
        ctx.fillStyle = '#FFFF00'; // Yellow
    } else {
        ctx.fillStyle = '#FF0000'; // Red
    }
    
    ctx.fillRect(barX + 2, barY + 2, fillWidth - 4, barHeight - 4);
    
    // Boss level text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`BOSS LEVEL ${currentLevel}`, canvas.width / 2, barY - 5);
}

function drawBullets() {
    // Player bullets (green)
    ctx.fillStyle = '#00ff00';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
    });

    // Enemy bullets (red)
    ctx.fillStyle = '#ff0000';
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
    if (isBossLevel) {
        updateBoss();
        return;
    }
    
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
                playTieFighterSound(); // Play TIE fighter blaster sound
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

function updateBoss() {
    if (!boss || !boss.alive) return;
    
    // Boss movement (side to side)
    boss.x += boss.dx * boss.direction;
    
    // Reverse direction when hitting edges
    if (boss.x <= 0 || boss.x + boss.width >= canvas.width) {
        boss.direction *= -1;
    }
    
    // Boss shooting
    boss.shootTimer++;
    if (boss.shootTimer >= boss.shootInterval) {
        // Regular shots from multiple turrets
        enemyBullets.push({
            x: boss.x + boss.width / 2 - bulletWidth / 2,
            y: boss.y + boss.height
        });
        
        // Side turret shots
        enemyBullets.push({
            x: boss.x + 20 - bulletWidth / 2,
            y: boss.y + boss.height / 2
        });
        enemyBullets.push({
            x: boss.x + boss.width - 20 - bulletWidth / 2,
            y: boss.y + boss.height / 2
        });
        
        playTieFighterSound(); // Play TIE fighter blaster sound for boss
        boss.shootTimer = 0;
    }
    
    // Special attack (spread shot)
    boss.specialAttackTimer++;
    if (boss.specialAttackTimer >= boss.specialAttackInterval) {
        // Spread shot pattern
        for (let i = -2; i <= 2; i++) {
            enemyBullets.push({
                x: boss.x + boss.width / 2 - bulletWidth / 2 + i * 20,
                y: boss.y + boss.height
            });
        }
        playTieFighterSound(); // Play TIE fighter blaster sound for special attack
        boss.specialAttackTimer = 0;
    }
}

function checkCollisions() {
    if (isBossLevel) {
        checkBossCollisions();
        return;
    }
    
    // check hits on enemies (TIE fighters)
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (enemy.alive) {
                // Check collision with TIE fighter (including solar panels)
                const tieLeft = enemy.x - 8; // Solar panel extends 8px left
                const tieRight = enemy.x + enemy.width + 4; // Solar panel extends 4px right
                const tieTop = enemy.y;
                const tieBottom = enemy.y + enemy.height;
                
                if (bullet.x < tieRight &&
                    bullet.x + bulletWidth > tieLeft &&
                    bullet.y < tieBottom &&
                    bullet.y + bulletHeight > tieTop) {

                enemy.alive = false;
                bullets.splice(bulletIndex, 1);
                score += 10;
                scoreElement.textContent = score;

                if (score % 100 === 0) {
                    enemySpeed += 0.5; // gets harder
                    }
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
        if (enemy.alive) {
            // Check collision with TIE fighter (including solar panels)
            const tieLeft = enemy.x - 8; // Solar panel extends 8px left
            const tieRight = enemy.x + enemy.width + 4; // Solar panel extends 4px right
            const tieTop = enemy.y;
            const tieBottom = enemy.y + enemy.height;
            
            if (player.x < tieRight &&
                player.x + player.width > tieLeft &&
                player.y < tieBottom &&
                player.y + player.height > tieTop) {
            gameOver();
            }
        }
    });

    if (enemies.every(enemy => !enemy.alive)) {
        nextWave();
    }
}

function checkBossCollisions() {
    // check hits on boss
    bullets.forEach((bullet, bulletIndex) => {
        if (boss && boss.alive &&
            bullet.x < boss.x + boss.width &&
            bullet.x + bulletWidth > boss.x &&
            bullet.y < boss.y + boss.height &&
            bullet.y + bulletHeight > boss.y) {

            bossHealth--;
            bullets.splice(bulletIndex, 1);
            score += 50; // More points for hitting boss
            scoreElement.textContent = score;

            // Boss defeated
            if (bossHealth <= 0) {
                boss.alive = false;
                score += 500; // Bonus for defeating boss
                lives++; // Gain a life for defeating boss
                livesElement.textContent = lives;
                scoreElement.textContent = score;
                
                // Trigger Death Star explosion after level 20 boss (final boss)
                if (currentLevel === 20) {
                    deathStarExploding = true;
                    explosionTimer = 0;
                    explosionParticles = [];
                    // Don't call nextWave() - let explosion play out
                    return;
                }
                
                nextWave();
            }
        }
    });

    // check enemy bullets hitting player
    enemyBullets.forEach((bullet, bulletIndex) => {
        if (bullet.x < player.x + player.width &&
            bullet.x + bulletWidth > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bulletHeight > player.y) {

            enemyBullets.splice(bulletIndex, 1);
            loseLife();
        }
    });

    // check boss collision with player
    if (boss && boss.alive &&
        player.x < boss.x + boss.width &&
        player.x + player.width > boss.x &&
        player.y < boss.y + boss.height &&
        player.y + player.height > boss.y) {
        gameOver();
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
    if (gameMode === 'infinite') {
    createEnemies();
    enemySpeed += 0.5;
    bullets = [];
    enemyBullets = [];
    } else if (gameMode === 'campaign') {
        if (currentLevel < maxLevel) {
            currentLevel++;
            levelComplete = false;
            updateDifficulty();
            createEnemies();
            bullets = [];
            enemyBullets = [];
            updateLevelDisplay();
        } else {
            // Campaign completed!
            gameOver();
        }
    }
}

function gameOver() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    finalScoreElement.textContent = score;
    
    // Show different messages based on game mode and completion
    const gameOverTitle = document.querySelector('#gameOver h2');
    if (gameMode === 'campaign' && currentLevel > maxLevel) {
        gameOverTitle.textContent = 'Campaign Complete!';
    } else {
        gameOverTitle.textContent = 'Game Over!';
    }
    
    restartButton.style.display = 'inline-block';
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


function drawDeathStar() {
    // Death Star position and size (moved to top)
    const centerX = canvas.width / 2;
    const centerY = 150;
    const radius = 120;
    
    if (deathStarExploding) {
        drawDeathStarExplosion(centerX, centerY, radius);
        return;
    }
    
    // Main Death Star sphere
    const gradient = ctx.createRadialGradient(
        centerX - 30, centerY - 30, 0,
        centerX, centerY, radius
    );
    gradient.addColorStop(0, '#F0F0F0');
    gradient.addColorStop(0.7, '#C0C0C0');
    gradient.addColorStop(1, '#808080');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Death Star outline
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Superlaser dish (the big crater)
    const dishX = centerX - 40;
    const dishY = centerY - 20;
    const dishRadius = 35;
    
    // Dish shadow
    ctx.fillStyle = '#404040';
    ctx.beginPath();
    ctx.arc(dishX, dishY, dishRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Dish rim
    ctx.strokeStyle = '#202020';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Dish interior details
    ctx.fillStyle = '#606060';
    ctx.beginPath();
    ctx.arc(dishX, dishY, dishRadius - 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Dish center
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(dishX, dishY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Surface details - equatorial trench
    ctx.strokeStyle = '#505050';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 15, 0, Math.PI * 2);
    ctx.stroke();
    
    // Surface panels and details
    ctx.fillStyle = '#A0A0A0';
    // Large surface panels
    ctx.fillRect(centerX - 60, centerY - 40, 25, 15);
    ctx.fillRect(centerX + 20, centerY - 30, 20, 12);
    ctx.fillRect(centerX - 30, centerY + 20, 18, 10);
    ctx.fillRect(centerX + 15, centerY + 25, 22, 8);
    
    // Smaller surface details
    ctx.fillStyle = '#B0B0B0';
    ctx.fillRect(centerX - 80, centerY - 10, 8, 6);
    ctx.fillRect(centerX + 50, centerY - 15, 6, 8);
    ctx.fillRect(centerX - 45, centerY + 40, 10, 5);
    ctx.fillRect(centerX + 35, centerY + 35, 7, 6);
    
    // Surface grid lines
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 1;
    // Vertical lines
    for (let i = 0; i < 5; i++) {
        const x = centerX - 60 + i * 30;
        ctx.beginPath();
        ctx.moveTo(x, centerY - 50);
        ctx.lineTo(x, centerY + 50);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i < 4; i++) {
        const y = centerY - 40 + i * 25;
        ctx.beginPath();
        ctx.moveTo(centerX - 60, y);
        ctx.lineTo(centerX + 60, y);
        ctx.stroke();
    }
    
    // Shadow on the Death Star (from the superlaser dish)
    const shadowGradient = ctx.createRadialGradient(
        centerX - 40, centerY - 20, 0,
        centerX - 40, centerY - 20, 60
    );
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.arc(centerX - 40, centerY - 20, 60, 0, Math.PI * 2);
    ctx.fill();
}

function drawDeathStarExplosion(centerX, centerY, radius) {
    // Create explosion particles (more intense and longer lasting)
    if (explosionTimer % 2 === 0) { // Create particles every 2 frames
        for (let i = 0; i < 8; i++) { // More particles
            explosionParticles.push({
                x: centerX + (Math.random() - 0.5) * radius * 2,
                y: centerY + (Math.random() - 0.5) * radius * 2,
                vx: (Math.random() - 0.5) * 12, // Faster particles
                vy: (Math.random() - 0.5) * 12,
                life: 120, // Longer lasting particles
                maxLife: 120,
                size: Math.random() * 12 + 3, // Larger particles
                color: Math.random() > 0.6 ? '#FF4500' : (Math.random() > 0.3 ? '#FFD700' : '#FFFFFF')
            });
        }
    }
    
    // Update and draw particles
    explosionParticles = explosionParticles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98; // Slow down over time
        particle.vy *= 0.98;
        particle.life--;
        
        // Draw particle with glow effect
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha;
        
        // Draw particle with glow
        ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillRect(particle.x - particle.size, particle.y - particle.size, particle.size * 2, particle.size * 2);
        
        return particle.life > 0;
    });
    
    ctx.globalAlpha = 1; // Reset alpha
    
    // Multi-stage explosion flash
    if (explosionTimer < 60) {
        const flashAlpha = Math.max(0, 1 - explosionTimer / 60);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Secondary flash
    if (explosionTimer > 30 && explosionTimer < 90) {
        const flashAlpha = Math.max(0, 1 - (explosionTimer - 30) / 60);
        ctx.fillStyle = `rgba(255, 200, 0, ${flashAlpha * 0.6})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw shattered Death Star pieces (longer lasting)
    const shatterAlpha = Math.max(0, 1 - explosionTimer / 180);
    ctx.globalAlpha = shatterAlpha;
    
    // Draw broken pieces with more detail
    ctx.fillStyle = '#404040';
    for (let i = 0; i < 16; i++) { // More pieces
        const angle = (i / 16) * Math.PI * 2;
        const pieceX = centerX + Math.cos(angle) * radius * (0.5 + Math.random() * 0.5);
        const pieceY = centerY + Math.sin(angle) * radius * (0.5 + Math.random() * 0.5);
        const pieceSize = 15 + Math.random() * 25;
        
        ctx.fillRect(pieceX - pieceSize/2, pieceY - pieceSize/2, pieceSize, pieceSize);
        
        // Add some smaller debris
        if (Math.random() > 0.7) {
            ctx.fillStyle = '#606060';
            ctx.fillRect(pieceX - pieceSize/4, pieceY - pieceSize/4, pieceSize/2, pieceSize/2);
            ctx.fillStyle = '#404040';
        }
    }
    
    ctx.globalAlpha = 1; // Reset alpha
    
    // Draw explosion text (longer display)
    if (explosionTimer < 300) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '28px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('DEATH STAR DESTROYED!', centerX, centerY - 30);
        ctx.font = '18px Courier New';
        ctx.fillText('The Rebel Alliance has struck back!', centerX, centerY + 5);
        
        if (explosionTimer > 120) {
            ctx.font = '16px Courier New';
            ctx.fillText('Mission Accomplished!', centerX, centerY + 30);
        }
    }
    
    // Draw victory celebration
    if (explosionTimer > 200) {
        ctx.fillStyle = '#00FF00';
        ctx.font = '20px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', centerX, centerY + 60);
        ctx.font = '14px Courier New';
        ctx.fillText('The Empire has been defeated!', centerX, centerY + 85);
    }
    
    explosionTimer++;
    
    // End explosion after 10 seconds (600 frames at 60fps)
    if (explosionTimer > 600) {
        deathStarExploding = false;
        explosionParticles = [];
        explosionTimer = 0;
        
        // Return to title screen after explosion
        gameRunning = false;
        cancelAnimationFrame(animationId);
        
        // Show game over with victory message
        gameOverElement.style.display = 'block';
        const gameOverTitle = document.querySelector('#gameOver h2');
        gameOverTitle.textContent = 'Campaign Complete!';
        finalScoreElement.textContent = score;
        restartButton.style.display = 'inline-block';
        
        // Reset to mode selection
        setTimeout(() => {
            gameOverElement.style.display = 'none';
            restartButton.style.display = 'none';
            modeSelection.style.display = 'block';
            levelSelection.style.display = 'none';
            levelDisplay.style.display = 'none';
        }, 3000);
    }
}

function gameLoop() {
    if (!gameRunning) return;

    clear();
    drawStars();
    drawDeathStar();

    updatePlayer();
    updateBullets();
    updateEnemies();
    checkCollisions();
    
    // Auto-fire for mobile devices
    if (autoFire) {
        autoFireTimer++;
        if (autoFireTimer >= 10) { // Fire every 10 frames (6 times per second)
            shoot();
            autoFireTimer = 0;
        }
    }

    drawPlayer();
    if (isBossLevel) {
        drawBoss();
    } else {
        drawEnemies();
    }
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
    playPewSound();
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
    lives = 5;
    enemySpeed = 1;
    bullets = [];
    enemyBullets = [];
    player.x = canvas.width / 2 - 20;
    showStartMessage = false; // Hide start message when game starts
    
    if (gameMode === 'campaign') {
        currentLevel = 1;
        updateDifficulty();
        updateLevelDisplay();
    }

    enableAutoFire(); // Enable auto-fire for mobile
    autoFireTimer = 0;
    enableAudio(); // Enable audio on user interaction

    scoreElement.textContent = score;
    livesElement.textContent = lives;
    gameOverElement.style.display = 'none';
    restartButton.style.display = 'none';

    createEnemies();
    gameLoop();
}

restartButton.addEventListener('click', startGame);
backToMenuButton.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Mobile touch/swipe controls
if (touchArea) {
    // Touch start
    touchArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (gameRunning) {
            isTouching = true;
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    }, { passive: false });
    
    // Touch move (swipe detection)
    touchArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (gameRunning && isTouching) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            // Only respond to horizontal swipes (ignore vertical scrolling)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
                if (deltaX > 0) {
                    moveRight();
                } else {
                    moveLeft();
                }
            }
        }
    }, { passive: false });
    
    // Touch end
    touchArea.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (gameRunning) {
            isTouching = false;
            stopMoving();
        }
    }, { passive: false });
    
    // Mouse events for desktop testing
    touchArea.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (gameRunning) {
            isTouching = true;
            touchStartX = e.clientX;
            touchStartY = e.clientY;
        }
    });
    
    touchArea.addEventListener('mousemove', (e) => {
        e.preventDefault();
        if (gameRunning && isTouching) {
            const deltaX = e.clientX - touchStartX;
            const deltaY = e.clientY - touchStartY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
                if (deltaX > 0) {
                    moveRight();
                } else {
                    moveLeft();
                }
            }
        }
    });
    
    touchArea.addEventListener('mouseup', (e) => {
        e.preventDefault();
        if (gameRunning) {
            isTouching = false;
            stopMoving();
        }
    });
}

// Add touch controls to canvas as backup for iOS
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Canvas touchstart detected, gameRunning:', gameRunning);
    if (gameRunning) {
        isTouching = true;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        console.log('Touch started at:', touchStartX, touchStartY);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameRunning && isTouching) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        console.log('Touch move - deltaX:', deltaX, 'deltaY:', deltaY);
        
        // Only respond to horizontal swipes (ignore vertical scrolling)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
            if (deltaX > 0) {
                console.log('Moving right');
                moveRight();
            } else {
                console.log('Moving left');
                moveLeft();
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameRunning) {
        isTouching = false;
        stopMoving();
    }
}, { passive: false });

// Initialize the game
initializeGameMode();

// initial screen
clear();
drawStars();
drawDeathStar();
