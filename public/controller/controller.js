/**
 * Just Drift - Landscape Controller
 * Mobile-first arcade racing game controller
 */

class ArcadeController {
  constructor() {
    // Socket connection
    this.socket = null;
    this.roomCode = null;
    this.isConnected = false;
    
    // Control state
    this.controlState = {
      steerX: 0,
      steerY: 0,
      nitro: false,
      nitroAmount: 100, // Start with full nitro
      gun: false,
      drift: false,
      reverse: false
    };
    
    // Nitro config
    this.maxNitro = 100;
    this.nitroUseRate = 40; // Drain per second when using
    this.nitroRefillRate = 15; // Refill per second when not using
    
    // Screen Elements
    this.joinScreen = document.getElementById('join-screen');
    this.controllerRoot = document.getElementById('controller-root');
    this.roomInput = document.getElementById('room-input');
    this.joinBtn = document.getElementById('join-btn');
    this.errorMsg = document.getElementById('error-msg');
    
    // Action Button Elements
    this.btnGun = document.getElementById('btn-gun');
    this.btnNitro = document.getElementById('btn-nitro');
    
    // HUD Elements
    this.n2oFill = document.getElementById('n2o-fill');
    this.ammoCount = document.getElementById('ammo-count');
    
    this.init();
  }
  
  init() {
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
  
  // ==================== JOIN SCREEN ====================
  setupJoinScreen() {
    if (this.joinBtn) {
      this.joinBtn.addEventListener('click', () => this.attemptJoin());
    }
    
    if (this.roomInput) {
      this.roomInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
      
      this.roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.attemptJoin();
        }
      });
    }
  }
  
  attemptJoin() {
    const code = this.roomInput?.value?.trim()?.toUpperCase();
    
    if (!code || code.length !== 4) {
      this.showError('Enter 4-digit code');
      return;
    }
    
    this.roomCode = code;
    this.joinRoom(code);
  }
  
  showError(msg) {
    if (this.errorMsg) {
      this.errorMsg.textContent = msg;
      setTimeout(() => {
        this.errorMsg.textContent = '';
      }, 3000);
    }
  }
  
  showController() {
    if (this.joinScreen) {
      this.joinScreen.classList.add('hidden');
    }
    if (this.controllerRoot) {
      this.controllerRoot.classList.remove('hidden');
    }
    
    // Initialize steering buttons and action buttons after showing controller
    this.setupSteering();
    this.setupButtons();
    
    // Start nitro management loop
    this.lastNitroUpdate = Date.now();
    this.nitroLoop = setInterval(() => this.updateNitro(), 50);
  }
  
  // ==================== NITRO MANAGEMENT ====================
  updateNitro() {
    const now = Date.now();
    
    // Initialize lastNitroUpdate if missing
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
        this.sendControl({ nitro: false, nitroAmount: 0 });
      }
    } else if (!this.controlState.nitro && this.controlState.nitroAmount < this.maxNitro) {
      // Refill nitro when not using
      this.controlState.nitroAmount += this.nitroRefillRate * deltaTime;
      this.controlState.nitroAmount = Math.min(this.maxNitro, this.controlState.nitroAmount);
    }
    
    // Update UI
    if (this.n2oFill) {
      this.n2oFill.style.width = `${this.controlState.nitroAmount}%`;
    }
  }
  
  // ==================== STEERING BUTTONS ====================
  setupSteering() {
    this.btnLeft = document.getElementById('btn-left');
    this.btnRight = document.getElementById('btn-right');
    
    // Left button
    this.setupSteerButton(this.btnLeft, -1);
    
    // Right button
    this.setupSteerButton(this.btnRight, 1);
  }
  
  setupSteerButton(btn, direction) {
    if (!btn) return;
    
    // Touch events
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.classList.add('active');
      this.controlState.steerX = direction;
      this.sendControl({ steering: direction });
      this.triggerHaptic(30);
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      this.controlState.steerX = 0;
      this.sendControl({ steering: 0 });
    }, { passive: false });
    
    btn.addEventListener('touchcancel', (e) => {
      btn.classList.remove('active');
      this.controlState.steerX = 0;
      this.sendControl({ steering: 0 });
    });
    
    // Mouse events for desktop testing
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      btn.classList.add('active');
      this.controlState.steerX = direction;
      this.sendControl({ steering: direction });
    });
    
    btn.addEventListener('mouseup', (e) => {
      btn.classList.remove('active');
      this.controlState.steerX = 0;
      this.sendControl({ steering: 0 });
    });
    
    btn.addEventListener('mouseleave', (e) => {
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        this.controlState.steerX = 0;
        this.sendControl({ steering: 0 });
      }
    });
  }
  
  // ==================== BUTTONS ====================
  setupButtons() {
    // Gun/Fire button
    this.setupButton(this.btnGun, 'gun', () => {
      this.sendControl({ gun: true });
      this.socket?.emit('shoot');
      this.triggerHaptic(50);
    });
    
    // Nitro button (hold to use - only works if nitro available)
    this.setupButton(this.btnNitro, 'nitro', 
      () => {
        // Only activate nitro if there's some available
        if (this.controlState.nitroAmount > 0) {
          this.controlState.nitro = true;
          this.sendControl({ nitro: true, nitroAmount: this.controlState.nitroAmount });
          this.triggerHaptic(30);
        }
      },
      () => {
        this.controlState.nitro = false;
        this.sendControl({ nitro: false, nitroAmount: this.controlState.nitroAmount });
      }
    );
    
    // Pause button
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      const handlePause = () => {
        this.socket?.emit('togglePause');
        this.triggerHaptic(50);
      };
      pauseBtn.addEventListener('click', handlePause);
      pauseBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handlePause();
      }, { passive: false });
    }
  }
  
  setupButton(btn, name, onPress, onRelease = null) {
    if (!btn) return;
    
    // Touch events
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.classList.add('active');
      if (onPress) onPress();
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      if (onRelease) onRelease();
    }, { passive: false });
    
    btn.addEventListener('touchcancel', (e) => {
      btn.classList.remove('active');
      if (onRelease) onRelease();
    });
    
    // Mouse events (for desktop testing)
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      btn.classList.add('active');
      if (onPress) onPress();
    });
    
    btn.addEventListener('mouseup', (e) => {
      btn.classList.remove('active');
      if (onRelease) onRelease();
    });
    
    btn.addEventListener('mouseleave', (e) => {
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        if (onRelease) onRelease();
      }
    });
  }
  
  // ==================== SOCKET ====================
  setupSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO not available');
      this.showError('Connection failed');
      return;
    }
    
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    this.socket.on('joined', (data) => {
      console.log('Joined room:', data.roomCode);
      this.isConnected = true;
      this.showController();
      this.triggerHaptic(100);
    });
    
    this.socket.on('ready', (data) => {
      console.log('Ready to play in room:', data.roomCode);
      this.isConnected = true;
      this.showController();
    });
    
    this.socket.on('gameStart', () => {
      console.log('Game started!');
      this.triggerHaptic(150);
    });
    
    this.socket.on('updateAmmo', (data) => {
      this.updateAmmo(data.ammo);
    });
    
    this.socket.on('updateNitro', (data) => {
      this.updateNitro(data.nitro);
    });
    
    // Nitro refill from power-up
    this.socket.on('nitroRefill', () => {
      this.controlState.nitroAmount = this.maxNitro;
      if (this.n2oFill) {
        this.n2oFill.style.width = '100%';
      }
      this.triggerHaptic(100);
    });
    
    this.socket.on('error', (data) => {
      console.error('Socket error:', data.message);
      this.showError(data.message || 'Room not found');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });
  }
  
  joinRoom(code) {
    if (this.socket && code) {
      this.socket.emit('joinRoom', { roomCode: code });
    }
  }
  
  // ==================== CONTROL SENDING ====================
  sendControl(payload) {
    // Log for debugging
    console.log('Control:', payload);
    
    // Send via socket if connected
    if (this.socket && this.isConnected) {
      // Build input object for the game
      const input = {
        steering: payload.steering ?? this.controlState.steerX,
        nitro: payload.nitro ?? this.controlState.nitro,
        drift: payload.drift ?? this.controlState.drift
      };
      
      this.socket.emit('input', input);
    }
  }
  
  // ==================== HUD UPDATES ====================
  updateAmmo(ammo) {
    if (this.ammoCount) {
      this.ammoCount.textContent = ammo;
    }
  }
  
  updateNitro(nitroPercent) {
    if (this.n2oFill) {
      this.n2oFill.style.width = `${nitroPercent}%`;
    }
  }
  
  updateFuel(fuelPercent) {
    if (this.fuelFill) {
      this.fuelFill.style.width = `${fuelPercent}%`;
    }
    if (this.fuelPercent) {
      this.fuelPercent.textContent = `${Math.round(fuelPercent)}%`;
    }
  }
  
  // ==================== HAPTIC FEEDBACK ====================
  triggerHaptic(duration = 50) {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }
  
  // ==================== PREVENT DEFAULTS ====================
  preventDefaults() {
    // Prevent scrolling and zooming on the controller
    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('#controller-root')) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Prevent double-tap zoom
    document.addEventListener('dblclick', (e) => {
      e.preventDefault();
    });
    
    // Prevent context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
}

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', () => {
  window.controller = new ArcadeController();
});
