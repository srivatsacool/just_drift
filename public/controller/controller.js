/**
 * JUST DRIFT - Controller
 * 8-Bit Arcade Racing Game Controller
 * Mobile-first touch controls with haptic feedback
 */

class ArcadeController {
  constructor() {
    // ==================== SOCKET ====================
    this.socket = null;
    this.roomCode = null;
    this.isConnected = false;
    
    // ==================== CONTROL STATE ====================
    this.controlState = {
      steering: 0,      // -1 (left) to 1 (right)
      nitro: false,
      nitroAmount: 100, // Start with full nitro (0-100)
      gun: false
    };
    
    // ==================== NITRO CONFIG ====================
    this.maxNitro = 100;
    this.nitroUseRate = 35;    // Drain per second when using
    this.nitroRefillRate = 12; // Refill per second when not using
    this.lastNitroUpdate = null;
    this.nitroLoop = null;
    
    // ==================== DOM ELEMENTS ====================
    // Screens
    this.joinScreen = document.getElementById('join-screen');
    this.controllerScreen = document.getElementById('controller-screen');
    
    // Join Form
    this.roomInput = document.getElementById('room-input');
    this.joinBtn = document.getElementById('join-btn');
    this.errorMsg = document.getElementById('error-msg');
    
    // HUD
    this.ammoCount = document.getElementById('ammo-count');
    this.n2oFill = document.getElementById('n2o-fill');
    this.connectionStatus = document.getElementById('connection-status');
    
    // Buttons
    this.btnLeft = document.getElementById('btn-left');
    this.btnRight = document.getElementById('btn-right');
    this.btnGun = document.getElementById('btn-gun');
    this.btnNitro = document.getElementById('btn-nitro');
    this.btnPause = document.getElementById('btn-pause');
    this.btnRetry = document.getElementById('btn-retry');
    
    // Game Over Overlay
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.controllerScore = document.getElementById('controller-score');
    
    // ==================== INITIALIZE ====================
    this.init();
  }
  
  // ==================== INITIALIZATION ====================
  init() {
    console.log('🎮 Controller initializing...');
    
    this.setupSocket();
    this.setupJoinScreen();
    this.preventDefaults();
    
    // Check for room code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      this.roomInput.value = roomFromUrl.toUpperCase();
      this.attemptJoin();
    }
  }
  
  // ==================== PREVENT DEFAULTS ====================
  preventDefaults() {
    // Prevent zoom and scroll on mobile
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());
    
    // Prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
  }
  
  // ==================== JOIN SCREEN ====================
  setupJoinScreen() {
    // Join button click
    if (this.joinBtn) {
      this.joinBtn.addEventListener('click', () => this.attemptJoin());
      this.joinBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.attemptJoin();
      });
    }
    
    // Room input
    if (this.roomInput) {
      // Auto-capitalize and filter input
      this.roomInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
      
      // Enter key to join
      this.roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.attemptJoin();
        }
      });
      
      // Focus input on load
      setTimeout(() => this.roomInput.focus(), 100);
    }
  }
  
  attemptJoin() {
    const code = this.roomInput?.value?.trim()?.toUpperCase();
    
    if (!code || code.length !== 4) {
      this.showError('Enter 4-character code');
      this.triggerHaptic(100);
      return;
    }
    
    this.showError(''); // Clear error
    this.roomCode = code;
    this.joinRoom(code);
  }
  
  showError(msg) {
    if (this.errorMsg) {
      this.errorMsg.textContent = msg;
    }
  }
  
  // ==================== SHOW CONTROLLER ====================
  showController() {
    // Hide join screen, show controller
    if (this.joinScreen) this.joinScreen.classList.add('hidden');
    if (this.controllerScreen) this.controllerScreen.classList.remove('hidden');
    
    // Setup controls
    this.setupSteering();
    this.setupActionButtons();
    this.setupPauseButton();
    this.setupRetryButton();
    
    // Start nitro management loop
    this.lastNitroUpdate = Date.now();
    this.nitroLoop = setInterval(() => this.updateNitro(), 50);
    
    // Update connection status
    this.updateConnectionStatus(true);
    
    console.log('🎮 Controller active!');
  }
  
  // ==================== GAME OVER ====================
  showGameOver(score) {
    if (this.gameoverOverlay) {
      this.gameoverOverlay.classList.remove('hidden');
    }
    if (this.controllerScore) {
      this.controllerScore.textContent = Math.floor(score || 0);
    }
    this.triggerHaptic(300);
  }
  
  hideGameOver() {
    if (this.gameoverOverlay) {
      this.gameoverOverlay.classList.add('hidden');
    }
  }
  
  setupRetryButton() {
    if (!this.btnRetry) return;
    
    const handleRetry = () => {
      this.socket?.emit('resetGame');
      this.hideGameOver();
      this.controlState.nitroAmount = this.maxNitro;
      this.updateNitroUI();
      this.triggerHaptic(100);
    };
    
    this.btnRetry.addEventListener('click', handleRetry);
    this.btnRetry.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleRetry();
    }, { passive: false });
  }
  
  // ==================== NITRO MANAGEMENT ====================
  updateNitro() {
    const now = Date.now();
    
    // Initialize if needed
    if (!this.lastNitroUpdate) {
      this.lastNitroUpdate = now;
      return;
    }
    
    const deltaTime = (now - this.lastNitroUpdate) / 1000;
    this.lastNitroUpdate = now;
    
    // Ensure nitroAmount is valid
    if (isNaN(this.controlState.nitroAmount)) {
      this.controlState.nitroAmount = this.maxNitro;
    }
    
    if (this.controlState.nitro && this.controlState.nitroAmount > 0) {
      // Drain nitro when using
      this.controlState.nitroAmount -= this.nitroUseRate * deltaTime;
      this.controlState.nitroAmount = Math.max(0, this.controlState.nitroAmount);
      
      // If nitro ran out, stop using it
      if (this.controlState.nitroAmount <= 0) {
        this.controlState.nitro = false;
        this.sendControl({ nitro: false });
      }
    } else if (!this.controlState.nitro && this.controlState.nitroAmount < this.maxNitro) {
      // Refill nitro when not using
      this.controlState.nitroAmount += this.nitroRefillRate * deltaTime;
      this.controlState.nitroAmount = Math.min(this.maxNitro, this.controlState.nitroAmount);
    }
    
    // Update UI
    this.updateNitroUI();
  }
  
  updateNitroUI() {
    if (this.n2oFill) {
      const percent = Math.round(this.controlState.nitroAmount);
      this.n2oFill.style.width = `${percent}%`;
      
      // Change color when low
      if (percent < 20) {
        this.n2oFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #c92a2a 100%)';
      } else {
        this.n2oFill.style.background = 'linear-gradient(90deg, #4ecdc4 0%, #00ff88 100%)';
      }
    }
    
    // Update nitro button state
    if (this.btnNitro) {
      if (this.controlState.nitroAmount <= 0) {
        this.btnNitro.classList.add('disabled');
      } else {
        this.btnNitro.classList.remove('disabled');
      }
    }
  }
  
  // ==================== STEERING ====================
  setupSteering() {
    this.setupSteerButton(this.btnLeft, -1);
    this.setupSteerButton(this.btnRight, 1);
  }
  
  setupSteerButton(btn, direction) {
    if (!btn) return;
    
    const startSteering = () => {
      btn.classList.add('active');
      this.controlState.steering = direction;
      this.sendControl({ steering: direction });
      this.triggerHaptic(20);
    };
    
    const stopSteering = () => {
      btn.classList.remove('active');
      this.controlState.steering = 0;
      this.sendControl({ steering: 0 });
    };
    
    // Touch events
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startSteering();
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopSteering();
    }, { passive: false });
    
    btn.addEventListener('touchcancel', stopSteering);
    
    // Mouse events (for desktop testing)
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startSteering();
    });
    
    btn.addEventListener('mouseup', stopSteering);
    btn.addEventListener('mouseleave', (e) => {
      if (btn.classList.contains('active')) stopSteering();
    });
  }
  
  // ==================== ACTION BUTTONS ====================
  setupActionButtons() {
    // Fire button
    this.setupButton(this.btnGun, 'fire', 
      () => {
        this.sendControl({ gun: true });
        this.socket?.emit('shoot');
        this.triggerHaptic(50);
      },
      () => {
        this.sendControl({ gun: false });
      }
    );
    
    // Nitro button (hold to use)
    this.setupButton(this.btnNitro, 'nitro',
      () => {
        if (this.controlState.nitroAmount > 0) {
          this.controlState.nitro = true;
          this.sendControl({ nitro: true });
          this.triggerHaptic(30);
        }
      },
      () => {
        this.controlState.nitro = false;
        this.sendControl({ nitro: false });
      }
    );
  }
  
  setupButton(btn, name, onPress, onRelease = null) {
    if (!btn) return;
    
    const handlePress = () => {
      btn.classList.add('active');
      if (onPress) onPress();
    };
    
    const handleRelease = () => {
      btn.classList.remove('active');
      if (onRelease) onRelease();
    };
    
    // Touch events
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handlePress();
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleRelease();
    }, { passive: false });
    
    btn.addEventListener('touchcancel', handleRelease);
    
    // Mouse events
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handlePress();
    });
    
    btn.addEventListener('mouseup', handleRelease);
    btn.addEventListener('mouseleave', (e) => {
      if (btn.classList.contains('active')) handleRelease();
    });
  }
  
  // ==================== PAUSE BUTTON ====================
  setupPauseButton() {
    if (!this.btnPause) return;
    
    const handlePause = () => {
      this.socket?.emit('togglePause');
      this.triggerHaptic(50);
    };
    
    this.btnPause.addEventListener('click', handlePause);
    this.btnPause.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handlePause();
    }, { passive: false });
  }
  
  // ==================== SOCKET ====================
  setupSocket() {
    if (typeof io === 'undefined') {
      console.error('Socket.IO not available');
      this.showError('Connection failed');
      return;
    }
    
    this.socket = io();
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('📡 Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('📡 Disconnected from server');
      this.isConnected = false;
      this.updateConnectionStatus(false);
    });
    
    // Room events
    this.socket.on('joined', (data) => {
      console.log('🎮 Joined room:', data.roomCode);
      this.isConnected = true;
      this.showController();
      this.triggerHaptic(100);
    });
    
    this.socket.on('ready', (data) => {
      console.log('🎮 Ready in room:', data.roomCode);
      this.isConnected = true;
      this.showController();
    });
    
    this.socket.on('error', (data) => {
      console.error('❌ Socket error:', data.message);
      this.showError(data.message || 'Room not found');
      this.triggerHaptic(200);
    });
    
    // Game events
    this.socket.on('gameStart', () => {
      console.log('🏁 Game started!');
      this.triggerHaptic(150);
    });
    
    this.socket.on('gameEnded', (data) => {
      console.log('🏁 Game over!');
      this.showGameOver(data?.score || 0);
    });
    
    this.socket.on('gameReset', () => {
      console.log('🔄 Game reset');
      this.hideGameOver();
      this.controlState.nitroAmount = this.maxNitro;
      this.updateNitroUI();
    });
    
    // HUD updates from game
    this.socket.on('updateAmmo', (data) => {
      if (this.ammoCount) {
        this.ammoCount.textContent = data.ammo;
      }
    });
    
    this.socket.on('updateNitro', (data) => {
      // External nitro update (from game state sync)
      if (typeof data.nitro === 'number') {
        this.controlState.nitroAmount = data.nitro;
        this.updateNitroUI();
      }
    });
    
    // Nitro refill from power-up
    this.socket.on('nitroRefill', () => {
      console.log('⛽ Nitro refilled!');
      this.controlState.nitroAmount = this.maxNitro;
      this.updateNitroUI();
      this.triggerHaptic(100);
      
      // Immediately sync to game
      this.sendControl({});
    });
    
    // Hit confirmation for feedback
    this.socket.on('hitConfirm', () => {
      this.triggerHaptic(80);
    });
  }
  
  joinRoom(code) {
    if (this.socket && code) {
      console.log('🔗 Joining room:', code);
      this.socket.emit('joinRoom', { roomCode: code });
    }
  }
  
  // ==================== CONTROL SENDING ====================
  sendControl(payload) {
    if (!this.socket || !this.isConnected) return;
    
    // Build complete input object
    const input = {
      steering: payload.steering ?? this.controlState.steering,
      nitro: payload.nitro ?? this.controlState.nitro,
      nitroAmount: payload.nitroAmount ?? this.controlState.nitroAmount,
      gun: payload.gun ?? this.controlState.gun
    };
    
    this.socket.emit('input', input);
  }
  
  // ==================== UI UPDATES ====================
  updateConnectionStatus(connected) {
    if (this.connectionStatus) {
      if (connected) {
        this.connectionStatus.classList.add('connected');
        this.connectionStatus.querySelector('.status-text').textContent = 'CONNECTED';
      } else {
        this.connectionStatus.classList.remove('connected');
        this.connectionStatus.querySelector('.status-text').textContent = 'DISCONNECTED';
      }
    }
  }
  
  // ==================== HAPTIC FEEDBACK ====================
  triggerHaptic(duration = 50) {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }
}

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', () => {
  window.controller = new ArcadeController();
});
