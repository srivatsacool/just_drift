/* ========================================
   JUST DRIFT - Game Engine
   Top-down 8-bit arcade chase game
   Enhanced: Fullscreen, Coins, Sound Effects
======================================== */

// ==================== CONFIGURATION ====================
const CONFIG = {
  // Canvas - will be set dynamically for fullscreen
  CANVAS_WIDTH: window.innerWidth,
  CANVAS_HEIGHT: window.innerHeight,
  PIXEL_SCALE: 4,
  
  // Road - now uses most of the screen
  ROAD_WIDTH_RATIO: 0.85, // 85% of screen width
  LANE_COUNT: 6,
  ROAD_SCROLL_SPEED: 8,
  
  // Player
  PLAYER_WIDTH: 32,
  PLAYER_HEIGHT: 52,
  PLAYER_BASE_SPEED: 5,
  PLAYER_MAX_SPEED: 8,
  PLAYER_TURN_SPEED: 0.055,
  PLAYER_DRIFT_TURN_SPEED: 0.095,
  PLAYER_DRIFT_GRIP: 0.65,
  PLAYER_FRICTION: 0.98,
  
  // Police
  POLICE_WIDTH: 32,
  POLICE_HEIGHT: 52,
  POLICE_BASE_SPEED: 3,
  POLICE_MAX_SPEED: 5,
  POLICE_TURN_RATE: 0.025,
  POLICE_SPAWN_DELAY: 4000,
  POLICE_MAX_COUNT: 6,
  INITIAL_POLICE_COUNT: 2,
  
  // Coins
  COIN_SIZE: 24,
  COIN_SPAWN_DELAY: 2000,
  COIN_MAX_COUNT: 8,
  COIN_SCORE: 150,
  
  // Scoring
  SCORE_PER_SECOND: 10,
  
  // Colors (8-bit palette)
  COLORS: {
    BACKGROUND: '#0a0a0f',
    ROAD: '#2d2d3a',
    ROAD_LINE: '#4a4a5a',
    ROAD_LINE_YELLOW: '#ffd166',
    GRASS: '#1a4d1a',
    GRASS_DARK: '#0f3d0f',
    PLAYER_BODY: '#ffd166',
    PLAYER_WINDOW: '#1a1a2e',
    POLICE_BODY: '#2196f3',
    POLICE_WINDOW: '#1a1a2e',
    SIREN_RED: '#ff1744',
    SIREN_BLUE: '#00e5ff',
    SMOKE: '#888888',
    COIN: '#ffd700',
    COIN_SHINE: '#fff8dc'
  }
};

// ==================== SOUND SYSTEM ====================
class SoundSystem {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.initialized = false;
  }
  
  init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }
  
  // 8-bit style sound generator
  playTone(frequency, duration, type = 'square', volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }
  
  // Sound effects
  playGameStart() {
    this.init();
    // Ascending arpeggio
    this.playTone(262, 0.1, 'square', 0.2); // C4
    setTimeout(() => this.playTone(330, 0.1, 'square', 0.2), 100); // E4
    setTimeout(() => this.playTone(392, 0.1, 'square', 0.2), 200); // G4
    setTimeout(() => this.playTone(523, 0.2, 'square', 0.3), 300); // C5
  }
  
  playCoinCollect() {
    if (!this.initialized) this.init();
    // Quick high-pitched blip
    this.playTone(880, 0.05, 'square', 0.2);
    setTimeout(() => this.playTone(1320, 0.1, 'square', 0.25), 50);
  }
  
  playDrift() {
    if (!this.initialized) this.init();
    // Low rumble/screech
    this.playTone(80, 0.1, 'sawtooth', 0.15);
  }
  
  playGameOver() {
    if (!this.initialized) this.init();
    // Descending sad tones
    this.playTone(392, 0.2, 'square', 0.3);
    setTimeout(() => this.playTone(330, 0.2, 'square', 0.25), 200);
    setTimeout(() => this.playTone(262, 0.3, 'square', 0.2), 400);
    setTimeout(() => this.playTone(196, 0.4, 'square', 0.15), 600);
  }
  
  playCrash() {
    if (!this.initialized) this.init();
    // Explosion noise burst
    this.playTone(100, 0.3, 'sawtooth', 0.5);
    setTimeout(() => this.playTone(80, 0.2, 'square', 0.4), 50);
    setTimeout(() => this.playTone(60, 0.3, 'sawtooth', 0.3), 100);
  }
  
  playSiren() {
    if (!this.initialized) return;
    // Alternating siren tones (called periodically)
    this.playTone(600, 0.15, 'square', 0.05);
  }
  
  playGunshot() {
    if (!this.initialized) this.init();
    // Sharp gunshot sound
    this.playTone(200, 0.05, 'sawtooth', 0.4);
    this.playTone(150, 0.08, 'square', 0.3);
  }
  
  playNitro() {
    if (!this.initialized) this.init();
    // Whoosh/boost sound
    this.playTone(150, 0.2, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.15), 50);
  }
}

// ==================== GAME STATE ====================
const GameState = {
  TITLE: 'title',
  WAITING: 'waiting',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver'
};

// ==================== POWER UP TYPES ====================
const PowerUpType = {
  SHIELD: 'shield',
  MACHINE_GUN: 'machine_gun',
  EMP: 'emp',
  INFINITE_NITRO: 'infinite_nitro',
  COIN_MAGNET: 'coin_magnet',
  NITRO_REFILL: 'nitro_refill'  // Spawns 5x more frequently
};

// ==================== GAME CLASS ====================
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = GameState.TITLE;
    this.roomCode = null;
    
    // Sound system
    this.sound = new SoundSystem();
    
    // Game objects
    this.player = null;
    this.police = [];
    this.particles = [];
    this.coins = [];
    this.powerUps = []; // Active power-up items on road
    this.activePowerUps = {}; // Currently active effects on player
    this.collectEffects = []; // Visual effects when collecting coins
    this.explosionParticles = []; // Explosion on crash
    this.bullets = []; // Player bullets
    
    // Kaboom text effect
    this.kaboomText = '';
    this.kaboomFullText = 'KABOOM!';
    this.kaboomIndex = 0;
    this.kaboomScale = 1;
    this.kaboomShake = 0;
    this.showKaboom = false;
    this.crashLocation = { x: 0, y: 0 };
    
    // Game stats
    this.score = 0;
    this.time = 0;
    this.gameStartTime = 0;
    this.coinsCollected = 0;
    this.ammo = 5;
    this.maxAmmo = 5;
    
    // Input state
    this.input = {
      steering: 0,
      nitro: false,
      wasNitro: false,
      nitroAmount: 100
    };
    
    // Road scrolling
    this.roadOffset = 0;
    
    // Siren animation
    this.sirenState = false;
    this.sirenInterval = null;
    
    // Coin animation
    this.coinFrame = 0;
    
    // Computed road values (updated on resize)
    this.roadWidth = 0;
    this.roadLeft = 0;
    this.roadRight = 0;
    
    // DOM elements
    this.titleScreen = document.getElementById('title-screen');
    this.waitingScreen = document.getElementById('waiting-screen');
    this.readyScreen = document.getElementById('ready-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.hud = document.getElementById('hud');
    this.roomCodeDisplay = document.getElementById('room-code');
    this.scoreDisplay = document.getElementById('score');
    this.timeDisplay = document.getElementById('time');
    this.ammoDisplay = document.getElementById('ammo');
    this.nitroFillDisplay = document.getElementById('nitro-fill-display');
    this.finalTimeDisplay = document.getElementById('final-time');
    this.finalScoreDisplay = document.getElementById('final-score');
    this.highScoreDisplay = document.getElementById('high-score');
    this.controllerUrlDisplay = document.getElementById('controller-url');
    this.resumeBtn = document.getElementById('resume-btn');
    
    // High score from localStorage
    this.highScore = parseInt(localStorage.getItem('justdrift_highscore')) || 0;
    
    this.init();
  }
  
  init() {
    this.setupCanvas();
    this.setupSocket();
    this.startSirenAnimation();
    this.startCoinAnimation();
    this.gameLoop();
    
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Resume button click handler
    if (this.resumeBtn) {
      this.resumeBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }
    
    // Arcade start button click handler (on display)
    const arcadeStartBtn = document.querySelector('.start-btn');
    if (arcadeStartBtn) {
      arcadeStartBtn.addEventListener('click', () => {
        if (this.state === GameState.READY) {
          this.socket.emit('startGame');
          this.startGame();
        }
      });
      arcadeStartBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (this.state === GameState.READY) {
          this.socket.emit('startGame');
          this.startGame();
        }
      });
    }
    
    // Retry button click handler
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (this.state === GameState.GAME_OVER) {
          this.resetGame();
        }
      });
    }
    
    // HUD Pause button click handler
    const hudPauseBtn = document.getElementById('hud-pause-btn');
    if (hudPauseBtn) {
      hudPauseBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }
    
    // Keyboard controls for pause (P or Escape)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
          this.togglePause();
        }
      }
    });
  }
  
  setupCanvas() {
    this.handleResize();
    this.ctx.imageSmoothingEnabled = false;
  }
  
  handleResize() {
    CONFIG.CANVAS_WIDTH = window.innerWidth;
    CONFIG.CANVAS_HEIGHT = window.innerHeight;
    
    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;
    
    // Recalculate road dimensions
    this.roadWidth = CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO;
    this.roadLeft = (CONFIG.CANVAS_WIDTH - this.roadWidth) / 2;
    this.roadRight = this.roadLeft + this.roadWidth;
    
    this.ctx.imageSmoothingEnabled = false;
  }
  
  setupSocket() {
    this.socket = io();
    
    this.socket.emit('createRoom', (response) => {
      if (response.success) {
        this.roomCode = response.roomCode;
        this.roomCodeDisplay.textContent = this.roomCode;
        
        const url = `${window.location.origin}/controller`;
        this.controllerUrlDisplay.textContent = url;
        this.generateQRCode(url + `?room=${this.roomCode}`);
        
        this.showScreen('waiting');
      }
    });
    
    this.socket.on('controllerJoined', () => {
      console.log('Controller joined!');
      this.state = GameState.READY;
      this.showScreen('ready');
    });
    
    // Start game from ready screen
    this.socket.on('startGame', () => {
      if (this.state === GameState.READY) {
        this.startGame();
      }
    });
    
    this.socket.on('controllerInput', (input) => {
      this.input.steering = input.steering || 0;
      this.input.nitro = input.nitro || false;
      this.input.nitroAmount = input.nitroAmount || 0;
    });
    
    // Shoot event from controller
    this.socket.on('shoot', () => {
      this.fireGun();
    });
    
    this.socket.on('gameReset', () => {
      this.resetGame();
    });
    
    this.socket.on('controllerDisconnected', () => {
      if (this.state === GameState.PLAYING) {
        this.input.steering = 0;
        this.input.nitro = false;
      }
    });
    
    // Toggle pause
    this.socket.on('togglePause', () => {
      this.togglePause();
    });
  }
  
  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.pauseScreen.classList.remove('hidden');
      this.hud.classList.add('hidden');
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.pauseScreen.classList.add('hidden');
      this.hud.classList.remove('hidden');
    }
  }
  
  generateQRCode(url) {
    const qrContainer = document.getElementById('qr-code');
    qrContainer.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, url, {
        width: 128,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }, (error) => {
        if (!error) qrContainer.appendChild(canvas);
      });
    }
  }
  
  showScreen(screen) {
    this.titleScreen.classList.add('hidden');
    this.waitingScreen.classList.add('hidden');
    this.readyScreen.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.hud.classList.add('hidden');
    
    switch (screen) {
      case 'title':
        this.titleScreen.classList.remove('hidden');
        break;
      case 'waiting':
        this.waitingScreen.classList.remove('hidden');
        break;
      case 'ready':
        this.readyScreen.classList.remove('hidden');
        break;
      case 'playing':
        this.hud.classList.remove('hidden');
        break;
      case 'gameOver':
        this.gameoverScreen.classList.remove('hidden');
        this.hud.classList.remove('hidden');
        break;
    }
  }
  
  startSirenAnimation() {
    this.sirenInterval = setInterval(() => {
      this.sirenState = !this.sirenState;
      // Play subtle siren sound occasionally
      if (this.state === GameState.PLAYING && this.sirenState && Math.random() > 0.7) {
        this.sound.playSiren();
      }
    }, 200);
  }
  
  startCoinAnimation() {
    setInterval(() => {
      this.coinFrame = (this.coinFrame + 1) % 4;
    }, 150);
  }
  
  startGame() {
    this.state = GameState.PLAYING;
    this.showScreen('playing');
    this.sound.playGameStart();
    
    // Initialize player at center bottom
    this.player = {
      x: CONFIG.CANVAS_WIDTH / 2,
      y: CONFIG.CANVAS_HEIGHT - 150,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      speed: CONFIG.PLAYER_BASE_SPEED,
      width: CONFIG.PLAYER_WIDTH,
      height: CONFIG.PLAYER_HEIGHT
    };
    
    // Initialize police
    this.police = [];
    for (let i = 0; i < CONFIG.INITIAL_POLICE_COUNT; i++) {
      this.spawnPolice(true);
    }
    
    // Initialize coins
    this.coins = [];
    for (let i = 0; i < 3; i++) {
      this.spawnCoin();
    }
    
    // Reset stats
    this.score = 0;
    this.time = 0;
    this.coinsCollected = 0;
    this.gameStartTime = Date.now();
    this.particles = [];
    this.powerUps = [];
    this.activePowerUps = {};
    this.collectEffects = [];
    this.explosionParticles = [];
    this.bullets = [];
    this.ammo = this.maxAmmo;
    this.showKaboom = false;
    this.kaboomText = '';
    
    // Spawn police over time
    this.policeSpawnTimer = setInterval(() => {
      if (this.police.length < CONFIG.POLICE_MAX_COUNT && this.state === GameState.PLAYING) {
        this.spawnPolice(false);
      }
    }, CONFIG.POLICE_SPAWN_DELAY);
    
    // Spawn coins over time
    this.coinSpawnTimer = setInterval(() => {
      if (this.coins.length < CONFIG.COIN_MAX_COUNT && this.state === GameState.PLAYING) {
        this.spawnCoin();
      }
    }, CONFIG.COIN_SPAWN_DELAY);
    
    // Spawn power-ups over time (every 4 seconds)
    this.powerUpSpawnTimer = setInterval(() => {
      if (this.powerUps.length < 2 && this.state === GameState.PLAYING) {
        this.spawnPowerUp();
      }
    }, 4000);
  }
  
  spawnPolice(initial) {
    const margin = CONFIG.POLICE_WIDTH;
    const police = {
      x: this.roadLeft + margin + Math.random() * (this.roadWidth - margin * 2),
      y: initial ? -100 - Math.random() * 300 : -100,
      vx: 0,
      vy: 0,
      angle: Math.PI / 2,
      speed: CONFIG.POLICE_BASE_SPEED + Math.random() * 1,
      width: CONFIG.POLICE_WIDTH,
      height: CONFIG.POLICE_HEIGHT,
      turnOffset: (Math.random() - 0.5) * 0.015
    };
    this.police.push(police);
  }
  
  spawnCoin() {
    const margin = CONFIG.COIN_SIZE * 2;
    const coin = {
      x: this.roadLeft + margin + Math.random() * (this.roadWidth - margin * 2),
      y: -50 - Math.random() * 200,
      size: CONFIG.COIN_SIZE,
      collected: false
    };
    this.coins.push(coin);
  }
  
  spawnPowerUp() {
    // Weighted power-up selection: NITRO_REFILL spawns 5x more frequently
    const weightedTypes = [
      PowerUpType.SHIELD,
      PowerUpType.MACHINE_GUN,
      PowerUpType.EMP,
      PowerUpType.INFINITE_NITRO,
      PowerUpType.COIN_MAGNET,
      // NITRO_REFILL appears 5 times for 5x frequency
      PowerUpType.NITRO_REFILL,
      PowerUpType.NITRO_REFILL,
      PowerUpType.NITRO_REFILL,
      PowerUpType.NITRO_REFILL,
      PowerUpType.NITRO_REFILL
    ];
    const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
    const margin = 50;
    
    const colors = {
      [PowerUpType.SHIELD]: '#4ecdc4',
      [PowerUpType.MACHINE_GUN]: '#ff6b6b',
      [PowerUpType.EMP]: '#ffd166',
      [PowerUpType.INFINITE_NITRO]: '#00ff88',
      [PowerUpType.COIN_MAGNET]: '#a066ff',
      [PowerUpType.NITRO_REFILL]: '#00bfff'  // Cyan for nitro
    };
    
    const powerUp = {
      x: this.roadLeft + margin + Math.random() * (this.roadWidth - margin * 2),
      y: -80,
      size: 35,
      type: type,
      color: colors[type],
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2
    };
    this.powerUps.push(powerUp);
  }
  
  activatePowerUp(type) {
    const durations = {
      [PowerUpType.SHIELD]: 5000,
      [PowerUpType.MACHINE_GUN]: 5000,
      [PowerUpType.EMP]: 0, // Instant
      [PowerUpType.INFINITE_NITRO]: 5000,
      [PowerUpType.COIN_MAGNET]: 10000,
      [PowerUpType.NITRO_REFILL]: 0 // Instant
    };
    
    // Handle instant effects
    if (type === PowerUpType.EMP) {
      // Destroy all police cars
      for (const cop of this.police) {
        this.spawnPoliceExplosion(cop.x, cop.y);
        this.score += 500;
      }
      this.police = [];
      this.sound.playCoinCollect();
      return;
    }
    
    // Handle nitro refill - send to controller
    if (type === PowerUpType.NITRO_REFILL) {
      console.log('Activating NITRO REFILL');
      this.socket.emit('nitroRefill');
      this.sound.playNitro();
      return;
    }
    
    // Set active power-up with timer
    this.activePowerUps[type] = Date.now() + durations[type];
    
    // Machine gun starts auto-fire
    if (type === PowerUpType.MACHINE_GUN) {
      this.machineGunInterval = setInterval(() => {
        if (this.activePowerUps[PowerUpType.MACHINE_GUN] && Date.now() < this.activePowerUps[PowerUpType.MACHINE_GUN]) {
          this.fireGun();
        } else {
          clearInterval(this.machineGunInterval);
        }
      }, 150);
    }
  }
  
  updatePowerUps(deltaTime) {
    // Update power-up positions (scroll down)
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += CONFIG.ROAD_SCROLL_SPEED;
      p.pulsePhase += 0.1;
      
      // Remove if off screen
      if (p.y > CONFIG.CANVAS_HEIGHT + 50) {
        this.powerUps.splice(i, 1);
        continue;
      }
      
      // Check collision with player
      if (!p.collected && this.player) {
        const dx = p.x - this.player.x;
        const dy = p.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < p.size + 20) {
          p.collected = true;
          this.powerUps.splice(i, 1);
          this.activatePowerUp(p.type);
          this.sound.playCoinCollect();
          
          // Visual effect
          this.collectEffects.push({
            x: p.x,
            y: p.y,
            text: p.type.replace('_', ' ').toUpperCase(),
            color: p.color,
            life: 1,
            vy: -2
          });
        }
      }
    }
    
    // Check expired power-ups
    const now = Date.now();
    for (const type in this.activePowerUps) {
      if (this.activePowerUps[type] && now > this.activePowerUps[type]) {
        delete this.activePowerUps[type];
      }
    }
  }
  
  hasPowerUp(type) {
    return this.activePowerUps[type] && Date.now() < this.activePowerUps[type];
  }
  
  spawnPoliceExplosion(x, y) {
    const colors = ['#ff4500', '#ff6600', '#2196f3', '#00e5ff'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 / 20) * i;
      const speed = 2 + Math.random() * 4;
      this.explosionParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2
      });
    }
  }
  
  resetGame() {
    if (this.policeSpawnTimer) clearInterval(this.policeSpawnTimer);
    if (this.coinSpawnTimer) clearInterval(this.coinSpawnTimer);
    if (this.powerUpSpawnTimer) clearInterval(this.powerUpSpawnTimer);
    if (this.machineGunInterval) clearInterval(this.machineGunInterval);
    this.startGame();
  }
  
  gameOver(crashX, crashY) {
    this.state = GameState.GAME_OVER;
    
    // Play crash sound first
    this.sound.playCrash();
    
    // Store crash location and spawn explosion
    this.crashLocation = { x: crashX || this.player.x, y: crashY || this.player.y };
    this.spawnExplosion(this.crashLocation.x, this.crashLocation.y);
    
    // Start KABOOM typewriter effect
    this.showKaboom = true;
    this.kaboomText = '';
    this.kaboomIndex = 0;
    this.kaboomScale = 3;
    this.kaboomShake = 20;
    this.startKaboomTypewriter();
    
    if (this.policeSpawnTimer) clearInterval(this.policeSpawnTimer);
    if (this.coinSpawnTimer) clearInterval(this.coinSpawnTimer);
    
    // Delay showing game over screen to let explosion play
    setTimeout(() => {
      this.showScreen('gameOver');
      this.sound.playGameOver();
      
      // Update final stats
      this.finalTimeDisplay.textContent = this.formatTime(this.time);
      this.finalScoreDisplay.textContent = Math.floor(this.score);
      
      // Update high score
      const currentScore = Math.floor(this.score);
      if (currentScore > this.highScore) {
        this.highScore = currentScore;
        localStorage.setItem('justdrift_highscore', this.highScore);
      }
      if (this.highScoreDisplay) {
        this.highScoreDisplay.textContent = this.highScore;
      }
      
      this.socket.emit('gameOver', { time: this.time, score: this.score });
    }, 1500);
  }
  
  spawnExplosion(x, y) {
    // Create many explosion particles
    const colors = ['#ff4500', '#ff6600', '#ff8c00', '#ffd700', '#ffff00', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 / 40) * i + Math.random() * 0.3;
      const speed = 3 + Math.random() * 8;
      this.explosionParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 16,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2
      });
    }
    // Add some debris squares
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.explosionParticles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 10,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        color: Math.random() > 0.5 ? '#333' : '#666',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  }
  
  startKaboomTypewriter() {
    const typeNextChar = () => {
      if (this.kaboomIndex < this.kaboomFullText.length) {
        this.kaboomText += this.kaboomFullText[this.kaboomIndex];
        this.kaboomIndex++;
        this.kaboomShake = 10; // Shake on each letter
        setTimeout(typeNextChar, 80);
      }
    };
    typeNextChar();
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // ==================== UPDATE ====================
  update(deltaTime) {
    // Always update explosion and kaboom even in game over
    this.updateExplosionParticles(deltaTime);
    this.updateKaboom(deltaTime);
    
    // Skip updates when not playing
    if (this.state !== GameState.PLAYING) return;
    
    this.time = (Date.now() - this.gameStartTime) / 1000;
    this.score += CONFIG.SCORE_PER_SECOND * deltaTime;
    
    this.scoreDisplay.textContent = Math.floor(this.score);
    this.timeDisplay.textContent = this.formatTime(this.time);
    if (this.ammoDisplay) {
      this.ammoDisplay.textContent = this.ammo;
    }
    if (this.nitroFillDisplay) {
      this.nitroFillDisplay.style.width = (this.input.nitroAmount || 0) + '%';
      
      // Change color when low
      if (this.input.nitroAmount < 20) {
        this.nitroFillDisplay.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #e63946 100%)';
      } else {
        this.nitroFillDisplay.style.background = 'linear-gradient(90deg, #4ecdc4 0%, #00ff88 100%)';
      }
    }
    
    this.roadOffset = (this.roadOffset + CONFIG.ROAD_SCROLL_SPEED) % 40;
    
    this.updatePlayer(deltaTime);
    this.updatePolice(deltaTime);
    this.updateCoins(deltaTime);
    this.updatePowerUps(deltaTime);
    this.updateBullets(deltaTime);
    this.updateParticles(deltaTime);
    this.updateCollectEffects(deltaTime);
    this.checkCollisions();
  }
  
  // Fire gun from player
  fireGun() {
    if (this.state !== GameState.PLAYING || this.ammo <= 0) return;
    
    this.ammo--;
    this.sound.playGunshot();
    
    const p = this.player;
    // Create bullet traveling in player's facing direction
    this.bullets.push({
      x: p.x + Math.cos(p.angle) * (p.height / 2 + 5),
      y: p.y + Math.sin(p.angle) * (p.height / 2 + 5),
      vx: Math.cos(p.angle) * 15,
      vy: Math.sin(p.angle) * 15,
      size: 8,
      life: 1,
      decay: 0.01
    });
  }
  
  updateBullets(deltaTime) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life -= b.decay;
      
      // Remove if off screen or expired
      if (b.life <= 0 || b.x < 0 || b.x > CONFIG.CANVAS_WIDTH || 
          b.y < 0 || b.y > CONFIG.CANVAS_HEIGHT) {
        this.bullets.splice(i, 1);
        continue;
      }
      
      // Check bullet vs police collision
      for (let j = this.police.length - 1; j >= 0; j--) {
        const cop = this.police[j];
        const dx = b.x - cop.x;
        const dy = b.y - cop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < (b.size / 2 + cop.width / 2)) {
          // Hit! Destroy police car
          this.spawnPoliceExplosion(cop.x, cop.y);
          this.police.splice(j, 1);
          this.bullets.splice(i, 1);
          this.score += 500; // Bonus for shooting police
          this.sound.playCrash();
          
          // Send hit confirmation to controller
          this.socket.emit('hitConfirm');
          break;
        }
      }
    }
  }
  
  updateExplosionParticles(deltaTime) {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 0.1; // Gravity
      p.life -= p.decay;
      if (p.rotationSpeed) p.rotation += p.rotationSpeed;
      if (p.life <= 0) this.explosionParticles.splice(i, 1);
    }
  }
  
  updateKaboom(deltaTime) {
    // Decay kaboom scale towards 1
    if (this.kaboomScale > 1) {
      this.kaboomScale *= 0.92;
      if (this.kaboomScale < 1.05) this.kaboomScale = 1;
    }
    // Decay shake
    if (this.kaboomShake > 0) {
      this.kaboomShake *= 0.85;
      if (this.kaboomShake < 0.5) this.kaboomShake = 0;
    }
  }
  
  updatePlayer(deltaTime) {
    const p = this.player;
    const input = this.input;
    
    // Check if has infinite nitro power-up
    const hasInfiniteNitro = this.hasPowerUp(PowerUpType.INFINITE_NITRO);
    
    // Play nitro sound when starting to boost
    if ((input.nitro || hasInfiniteNitro) && !input.wasNitro) {
      this.sound.playDrift(); // Reuse drift sound for nitro rumble
    }
    input.wasNitro = input.nitro || hasInfiniteNitro;
    
    // Steering - slightly faster when using nitro
    const usingNitro = input.nitro || hasInfiniteNitro;
    const turnSpeed = usingNitro ? CONFIG.PLAYER_TURN_SPEED * 0.8 : CONFIG.PLAYER_TURN_SPEED;
    p.angle += input.steering * turnSpeed;
    
    // Speed - nitro gives a big boost (infinite nitro power-up bypasses need for nitroAmount)
    const baseSpeed = CONFIG.PLAYER_BASE_SPEED;
    const nitroBoost = (input.nitro && input.nitroAmount > 0) || hasInfiniteNitro ? CONFIG.PLAYER_MAX_SPEED : baseSpeed;
    const targetSpeed = nitroBoost;
    p.speed += (targetSpeed - p.speed) * 0.15;
    
    const targetVx = Math.cos(p.angle) * p.speed;
    const targetVy = Math.sin(p.angle) * p.speed;
    
    // Full grip (no sliding)
    p.vx += (targetVx - p.vx) * 0.9;
    p.vy += (targetVy - p.vy) * 0.9;
    
    p.x += p.vx;
    p.y += p.vy;
    
    p.vx *= CONFIG.PLAYER_FRICTION;
    p.vy *= CONFIG.PLAYER_FRICTION;
    
    // Wide boundary constraints
    const boundaryLeft = this.roadLeft + p.width / 2 + 10;
    const boundaryRight = this.roadRight - p.width / 2 - 10;
    const boundaryTop = p.height / 2 + 30;
    const boundaryBottom = CONFIG.CANVAS_HEIGHT - p.height / 2 - 30;
    
    p.x = Math.max(boundaryLeft, Math.min(boundaryRight, p.x));
    p.y = Math.max(boundaryTop, Math.min(boundaryBottom, p.y));
    
    // Spawn nitro flame particles when boosting (including infinite nitro)
    if (((input.nitro && input.nitroAmount > 0) || hasInfiniteNitro) && Math.random() > 0.3) {
      this.spawnNitroFlame(p.x, p.y + p.height / 2, p.angle);
    }
  }
  
  spawnNitroFlame(x, y, angle) {
    // Spawn flame particles behind the car
    const backX = x - Math.cos(angle) * 20;
    const backY = y - Math.sin(angle) * 20;
    
    const colors = ['#ff4500', '#ff6600', '#ffff00', '#00bfff'];
    this.particles.push({
      x: backX + (Math.random() - 0.5) * 10,
      y: backY + (Math.random() - 0.5) * 10,
      vx: -Math.cos(angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2,
      vy: -Math.sin(angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 2,
      size: 8 + Math.random() * 8,
      life: 1,
      decay: 0.06 + Math.random() * 0.04,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  
  updatePolice(deltaTime) {
    const p = this.player;
    
    for (let i = this.police.length - 1; i >= 0; i--) {
      const cop = this.police[i];
      
      const dx = p.x - cop.x;
      const dy = p.y - cop.y;
      const targetAngle = Math.atan2(dy, dx);
      
      let angleDiff = targetAngle - cop.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      cop.angle += angleDiff * (CONFIG.POLICE_TURN_RATE + cop.turnOffset);
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speedMod = distance < 250 ? 1.3 : 1;
      
      cop.vx = Math.cos(cop.angle) * cop.speed * speedMod;
      cop.vy = Math.sin(cop.angle) * cop.speed * speedMod;
      
      cop.x += cop.vx;
      cop.y += cop.vy;
      
      // Keep on road
      cop.x = Math.max(this.roadLeft + cop.width / 2, Math.min(this.roadRight - cop.width / 2, cop.x));
      
      if (cop.y > CONFIG.CANVAS_HEIGHT + 200) {
        this.police.splice(i, 1);
      }
    }
    
    // Check police-to-police collisions
    this.checkPoliceCollisions();
  }
  
  checkPoliceCollisions() {
    const toRemove = new Set();
    
    for (let i = 0; i < this.police.length; i++) {
      for (let j = i + 1; j < this.police.length; j++) {
        const cop1 = this.police[i];
        const cop2 = this.police[j];
        
        if (this.checkCarCollision(cop1, cop2)) {
          // Both police cars explode!
          const crashX = (cop1.x + cop2.x) / 2;
          const crashY = (cop1.y + cop2.y) / 2;
          
          this.spawnPoliceExplosion(crashX, crashY);
          this.sound.playCrash();
          
          // Give player bonus points for police crashing into each other
          this.score += 200;
          
          toRemove.add(i);
          toRemove.add(j);
        }
      }
    }
    
    // Remove crashed police (in reverse order to maintain indices)
    const removeIndices = Array.from(toRemove).sort((a, b) => b - a);
    for (const index of removeIndices) {
      this.police.splice(index, 1);
    }
  }
  
  spawnPoliceExplosion(x, y) {
    // Smaller explosion for police crashes
    const colors = ['#00bfff', '#ff4500', '#ff6600', '#ffffff', '#4169e1'];
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 / 25) * i + Math.random() * 0.3;
      const speed = 2 + Math.random() * 6;
      this.explosionParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 12,
        life: 1,
        decay: 0.02 + Math.random() * 0.025,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2
      });
    }
    // Blue debris for police
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.explosionParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        color: Math.random() > 0.5 ? '#2196f3' : '#1565c0',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  }
  
  updateCoins(deltaTime) {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      
      // Move coins down with road scroll
      coin.y += CONFIG.ROAD_SCROLL_SPEED * 0.5;
      
      // Remove if off screen
      if (coin.y > CONFIG.CANVAS_HEIGHT + 100) {
        this.coins.splice(i, 1);
      }
    }
  }
  
  spawnSmoke(x, y) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1,
      size: 6 + Math.random() * 6,
      life: 1,
      decay: 0.025 + Math.random() * 0.02
    });
  }
  
  spawnCollectEffect(x, y) {
    // Sparkle particles when collecting coin
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      this.collectEffects.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        size: 6,
        life: 1,
        color: i % 2 === 0 ? CONFIG.COLORS.COIN : CONFIG.COLORS.COIN_SHINE
      });
    }
  }
  
  updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  
  updateCollectEffects(deltaTime) {
    for (let i = this.collectEffects.length - 1; i >= 0; i--) {
      const e = this.collectEffects[i];
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= 0.92;
      e.vy *= 0.92;
      e.life -= 0.05;
      e.size *= 0.95;
      if (e.life <= 0) this.collectEffects.splice(i, 1);
    }
  }
  
  checkCollisions() {
    const p = this.player;
    
    // Check police collision
    for (let i = this.police.length - 1; i >= 0; i--) {
      const cop = this.police[i];
      if (this.checkCarCollision(p, cop)) {
        if (this.hasPowerUp(PowerUpType.SHIELD)) {
          // Shield active: destroy police car instead of game over
          this.spawnPoliceExplosion(cop.x, cop.y);
          this.police.splice(i, 1);
          this.score += 500;
          continue;
        }
        // Calculate collision point (between the two cars)
        const crashX = (p.x + cop.x) / 2;
        const crashY = (p.y + cop.y) / 2;
        this.gameOver(crashX, crashY);
        return;
      }
    }
    
    // Check coin collision
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      const dx = p.x - coin.x;
      const dy = p.y - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < (p.width / 2 + coin.size / 2)) {
        // Collect coin!
        this.score += CONFIG.COIN_SCORE;
        this.coinsCollected++;
        this.sound.playCoinCollect();
        this.spawnCollectEffect(coin.x, coin.y);
        this.coins.splice(i, 1);
      }
    }
  }
  
  checkCarCollision(car1, car2) {
    const tolerance = 8;
    const dx = Math.abs(car1.x - car2.x);
    const dy = Math.abs(car1.y - car2.y);
    return dx < (car1.width + car2.width) / 2 - tolerance &&
           dy < (car1.height + car2.height) / 2 - tolerance;
  }
  
  // ==================== RENDER ====================
  render() {
    const ctx = this.ctx;
    
    ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    if (this.state === GameState.PLAYING || this.state === GameState.GAME_OVER) {
      this.renderRoad();
      this.renderCoins();
      this.renderPowerUps();
      this.renderBullets();
      this.renderParticles();
      this.renderCollectEffects();
      
      for (const cop of this.police) {
        this.renderPoliceCar(cop);
      }
      
      if (this.player && this.state === GameState.PLAYING) {
        this.renderPlayerCar(this.player);
      }
      
      // Render explosion and kaboom on top
      this.renderExplosion();
      this.renderKaboom();
    }
  }
  
  renderRoad() {
    const ctx = this.ctx;
    
    // Grass (full background first)
    ctx.fillStyle = CONFIG.COLORS.GRASS;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Grass pattern (only on edges for performance)
    ctx.fillStyle = CONFIG.COLORS.GRASS_DARK;
    const patternOffset = this.roadOffset % 20;
    
    // Left grass pattern
    for (let y = -20 + patternOffset; y < CONFIG.CANVAS_HEIGHT; y += 30) {
      for (let x = 0; x < this.roadLeft; x += 30) {
        if ((x + y) % 60 < 30) {
          ctx.fillRect(x, y, 15, 15);
        }
      }
    }
    
    // Right grass pattern
    for (let y = -20 + patternOffset; y < CONFIG.CANVAS_HEIGHT; y += 30) {
      for (let x = this.roadRight; x < CONFIG.CANVAS_WIDTH; x += 30) {
        if ((x + y) % 60 < 30) {
          ctx.fillRect(x, y, 15, 15);
        }
      }
    }
    
    // Road surface
    ctx.fillStyle = CONFIG.COLORS.ROAD;
    ctx.fillRect(this.roadLeft, 0, this.roadWidth, CONFIG.CANVAS_HEIGHT);
    
    // Road edge lines (white solid)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.roadLeft, 0, 6, CONFIG.CANVAS_HEIGHT);
    ctx.fillRect(this.roadRight - 6, 0, 6, CONFIG.CANVAS_HEIGHT);
    
    // Center double yellow line
    ctx.fillStyle = CONFIG.COLORS.ROAD_LINE_YELLOW;
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    ctx.fillRect(centerX - 6, 0, 4, CONFIG.CANVAS_HEIGHT);
    ctx.fillRect(centerX + 2, 0, 4, CONFIG.CANVAS_HEIGHT);
    
    // Lane dividers (white dashed)
    ctx.fillStyle = CONFIG.COLORS.ROAD_LINE;
    const laneWidth = this.roadWidth / CONFIG.LANE_COUNT;
    
    for (let lane = 1; lane < CONFIG.LANE_COUNT; lane++) {
      if (lane === CONFIG.LANE_COUNT / 2) continue; // Skip center
      
      const laneX = this.roadLeft + lane * laneWidth - 2;
      for (let y = -40 + this.roadOffset; y < CONFIG.CANVAS_HEIGHT; y += 50) {
        ctx.fillRect(laneX, y, 4, 25);
      }
    }
  }
  
  renderBullets() {
    const ctx = this.ctx;
    
    for (const b of this.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      
      // Bullet glow
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 15;
      
      // Bullet core (orange/yellow)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, b.size);
      gradient.addColorStop(0, '#ffff00');
      gradient.addColorStop(0.5, '#ff6600');
      gradient.addColorStop(1, '#ff0000');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  renderPowerUps() {
    const ctx = this.ctx;
    
    for (const p of this.powerUps) {
      ctx.save();
      ctx.translate(p.x, p.y);
      
      // Pulsing effect
      const pulse = 1 + Math.sin(p.pulsePhase) * 0.1;
      ctx.scale(pulse, pulse);
      
      // Glow effect
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 20;
      
      // Power-up box with icon
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner icon based on type
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const icons = {
        [PowerUpType.SHIELD]: '🛡',
        [PowerUpType.MACHINE_GUN]: '🔫',
        [PowerUpType.EMP]: '💥',
        [PowerUpType.INFINITE_NITRO]: '⚡',
        [PowerUpType.COIN_MAGNET]: '🧲',
        [PowerUpType.NITRO_REFILL]: '⛽'
      };
      
      ctx.fillText(icons[p.type] || '?', 0, 0);
      
      ctx.restore();
    }
  }
  
  renderCoins() {
    const ctx = this.ctx;
    
    for (const coin of this.coins) {
      ctx.save();
      ctx.translate(coin.x, coin.y);
      
      // Coin animation (slight scale pulse)
      const scale = 1 + Math.sin(this.coinFrame * Math.PI / 2) * 0.1;
      ctx.scale(scale, scale);
      
      // Outer circle
      ctx.fillStyle = CONFIG.COLORS.COIN;
      ctx.beginPath();
      ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner shine
      ctx.fillStyle = CONFIG.COLORS.COIN_SHINE;
      ctx.beginPath();
      ctx.arc(-3, -3, coin.size / 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Dollar sign (pixel style)
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-5, -4, 10, 3);
      ctx.fillRect(-5, 1, 10, 3);
      
      ctx.restore();
    }
  }
  
  renderPlayerCar(car) {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + Math.PI / 2);
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 4, car.width, car.height);
    
    // Car body
    ctx.fillStyle = CONFIG.COLORS.PLAYER_BODY;
    ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
    
    // Front windshield
    ctx.fillStyle = CONFIG.COLORS.PLAYER_WINDOW;
    ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 5, car.width - 10, 12);
    
    // Rear windshield
    ctx.fillRect(-car.width / 2 + 5, car.height / 2 - 15, car.width - 10, 10);
    
    // Racing stripe
    ctx.fillStyle = '#e63946';
    ctx.fillRect(-2, -car.height / 2, 4, car.height);
    
    // Headlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-car.width / 2 + 3, -car.height / 2, 6, 5);
    ctx.fillRect(car.width / 2 - 9, -car.height / 2, 6, 5);
    
    // Taillights
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-car.width / 2 + 3, car.height / 2 - 5, 8, 5);
    ctx.fillRect(car.width / 2 - 11, car.height / 2 - 5, 8, 5);
    
    ctx.restore();
  }
  
  renderPoliceCar(car) {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + Math.PI / 2);
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 4, car.width, car.height);
    
    // Car body
    ctx.fillStyle = CONFIG.COLORS.POLICE_BODY;
    ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
    
    // White stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-car.width / 2, -5, car.width, 10);
    
    // Windows
    ctx.fillStyle = CONFIG.COLORS.POLICE_WINDOW;
    ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 5, car.width - 10, 12);
    ctx.fillRect(-car.width / 2 + 5, car.height / 2 - 15, car.width - 10, 10);
    
    // Siren light bar
    const sirenY = -car.height / 2 + 20;
    ctx.fillStyle = '#333';
    ctx.fillRect(-car.width / 2 + 4, sirenY, car.width - 8, 6);
    
    // Siren lights (alternating)
    if (this.sirenState) {
      ctx.fillStyle = CONFIG.COLORS.SIREN_RED;
      ctx.fillRect(-car.width / 2 + 5, sirenY + 1, 10, 4);
      ctx.fillStyle = '#330000';
      ctx.fillRect(car.width / 2 - 15, sirenY + 1, 10, 4);
    } else {
      ctx.fillStyle = '#000033';
      ctx.fillRect(-car.width / 2 + 5, sirenY + 1, 10, 4);
      ctx.fillStyle = CONFIG.COLORS.SIREN_BLUE;
      ctx.fillRect(car.width / 2 - 15, sirenY + 1, 10, 4);
    }
    
    // Headlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-car.width / 2 + 3, -car.height / 2, 6, 5);
    ctx.fillRect(car.width / 2 - 9, -car.height / 2, 6, 5);
    
    ctx.restore();
  }
  
  renderParticles() {
    const ctx = this.ctx;
    
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 0.5;
      ctx.fillStyle = CONFIG.COLORS.SMOKE;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
  
  renderCollectEffects() {
    const ctx = this.ctx;
    
    for (const e of this.collectEffects) {
      ctx.globalAlpha = e.life;
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
    ctx.globalAlpha = 1;
  }
  
  renderExplosion() {
    const ctx = this.ctx;
    
    for (const p of this.explosionParticles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.rotation) ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  
  renderKaboom() {
    if (!this.showKaboom || this.kaboomText.length === 0) return;
    
    const ctx = this.ctx;
    const x = this.crashLocation.x + (Math.random() - 0.5) * this.kaboomShake * 2;
    const y = this.crashLocation.y - 60 + (Math.random() - 0.5) * this.kaboomShake * 2;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.kaboomScale, this.kaboomScale);
    
    // Text settings
    ctx.font = 'bold 48px "Press Start 2P", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text outline (black stroke)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeText(this.kaboomText, 0, 0);
    
    // Draw text fill with gradient effect
    const gradient = ctx.createLinearGradient(0, -30, 0, 30);
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.3, '#ffff00');
    gradient.addColorStop(0.7, '#ff6600');
    gradient.addColorStop(1, '#ff0000');
    
    ctx.fillStyle = gradient;
    ctx.fillText(this.kaboomText, 0, 0);
    
    // Add glow effect
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 20;
    ctx.fillText(this.kaboomText, 0, 0);
    
    ctx.restore();
  }
  
  // ==================== GAME LOOP ====================
  gameLoop() {
    const now = Date.now();
    const deltaTime = (now - (this.lastTime || now)) / 1000;
    this.lastTime = now;
    
    this.update(deltaTime);
    this.render();
    
    requestAnimationFrame(() => this.gameLoop());
  }
}

// ==================== INITIALIZE ====================
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
