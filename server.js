const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve images from root directory
app.use('/just_drift_2.jpeg', express.static(path.join(__dirname, 'just_drift_2.jpeg')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display', 'index.html'));
});

app.get('/controller', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'controller', 'index.html'));
});

// ==================== ROOM MANAGEMENT ====================
const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

// ==================== SOCKET.IO EVENTS ====================
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // ==================== DISPLAY EVENTS ====================
  
  // Display creates a room
  socket.on('createRoom', (callback) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      displaySocketId: socket.id,
      controllerSocketId: null,
      gameState: 'waiting'
    });
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isDisplay = true;
    
    console.log(`Room created: ${roomCode} by display ${socket.id}`);
    
    if (typeof callback === 'function') {
      callback({ success: true, roomCode });
    }
  });

  // ==================== CONTROLLER EVENTS ====================
  
  // Controller joins a room - handles both old and new calling conventions
  socket.on('joinRoom', (data, callback) => {
    // Handle both { roomCode: 'XXXX' } object and 'XXXX' string
    let roomCode;
    if (typeof data === 'string') {
      roomCode = data;
    } else if (data && data.roomCode) {
      roomCode = data.roomCode;
    } else {
      const errorMsg = 'Invalid room code';
      if (typeof callback === 'function') {
        callback({ success: false, error: errorMsg });
      } else {
        socket.emit('error', { message: errorMsg });
      }
      return;
    }
    
    roomCode = roomCode.toUpperCase();
    const room = rooms.get(roomCode);
    
    if (!room) {
      const errorMsg = 'Room not found';
      console.log(`Join failed: ${errorMsg} - ${roomCode}`);
      if (typeof callback === 'function') {
        callback({ success: false, error: errorMsg });
      } else {
        socket.emit('error', { message: errorMsg });
      }
      return;
    }
    
    if (room.controllerSocketId) {
      const errorMsg = 'Room already has a controller';
      if (typeof callback === 'function') {
        callback({ success: false, error: errorMsg });
      } else {
        socket.emit('error', { message: errorMsg });
      }
      return;
    }
    
    // Join the room
    room.controllerSocketId = socket.id;
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isController = true;
    
    console.log(`Controller ${socket.id} joined room ${roomCode}`);
    
    // Notify display that controller joined
    io.to(room.displaySocketId).emit('controllerJoined');
    
    // Tell controller it joined successfully
    socket.emit('joined', { roomCode });
    socket.emit('ready', { roomCode });
    
    if (typeof callback === 'function') {
      callback({ success: true, roomCode });
    }
  });

  // Controller sends input (supports both 'input' and 'controllerInput' events)
  socket.on('input', (input) => {
    handleControllerInput(socket, input);
  });
  
  socket.on('controllerInput', (input) => {
    handleControllerInput(socket, input);
  });
  
  function handleControllerInput(socket, input) {
    if (!socket.roomCode || !socket.isController) return;
    
    const room = rooms.get(socket.roomCode);
    if (room && room.displaySocketId) {
      io.to(room.displaySocketId).emit('controllerInput', input);
    }
  }

  // ==================== GAME CONTROL EVENTS ====================
  
  // Start game
  socket.on('startGame', () => {
    if (!socket.roomCode) return;
    
    const room = rooms.get(socket.roomCode);
    if (room) {
      room.gameState = 'playing';
      io.to(socket.roomCode).emit('startGame');
      console.log(`Game started in room ${socket.roomCode}`);
    }
  });

  // Reset game
  socket.on('resetGame', () => {
    if (!socket.roomCode) return;
    
    const room = rooms.get(socket.roomCode);
    if (room) {
      room.gameState = 'playing';
      io.to(socket.roomCode).emit('gameReset');
      console.log(`Game reset in room ${socket.roomCode}`);
    }
  });

  // Game over notification
  socket.on('gameOver', (data) => {
    if (!socket.roomCode) return;
    
    const room = rooms.get(socket.roomCode);
    if (room) {
      room.gameState = 'gameOver';
      io.to(socket.roomCode).emit('gameEnded', data);
    }
  });

  // ==================== ACTION EVENTS ====================
  
  // Shoot event from controller
  socket.on('shoot', () => {
    if (!socket.roomCode || !socket.isController) return;
    
    const room = rooms.get(socket.roomCode);
    if (room && room.displaySocketId) {
      io.to(room.displaySocketId).emit('shoot');
      // Confirm shot to controller for haptic feedback
      socket.emit('shotFired');
    }
  });

  // Hit confirmation (from display to controller)
  socket.on('hitConfirm', () => {
    if (!socket.roomCode || !socket.isDisplay) return;
    
    const room = rooms.get(socket.roomCode);
    if (room && room.controllerSocketId) {
      io.to(room.controllerSocketId).emit('hitConfirm');
    }
  });

  // Toggle pause from controller
  socket.on('togglePause', () => {
    if (!socket.roomCode) return;
    
    const room = rooms.get(socket.roomCode);
    if (room) {
      io.to(socket.roomCode).emit('togglePause');
    }
  });

  // Nitro refill from display to controller
  socket.on('nitroRefill', () => {
    if (!socket.roomCode || !socket.isDisplay) return;
    
    const room = rooms.get(socket.roomCode);
    if (room && room.controllerSocketId) {
      io.to(room.controllerSocketId).emit('nitroRefill');
    }
  });

  // ==================== DISCONNECT HANDLING ====================
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    if (socket.roomCode) {
      const room = rooms.get(socket.roomCode);
      
      if (room) {
        if (socket.isDisplay) {
          // Display disconnected, destroy room
          if (room.controllerSocketId) {
            io.to(room.controllerSocketId).emit('displayDisconnected');
          }
          rooms.delete(socket.roomCode);
          console.log(`Room ${socket.roomCode} destroyed (display left)`);
        } else if (socket.isController) {
          // Controller disconnected
          room.controllerSocketId = null;
          io.to(room.displaySocketId).emit('controllerDisconnected');
          console.log(`Controller left room ${socket.roomCode}`);
        }
      }
    }
  });
});

// ==================== START SERVER ====================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║           JUST DRIFT SERVER               ║
  ║     Outrun the cops. Drift to survive.    ║
  ╠═══════════════════════════════════════════╣
  ║  Display:    http://localhost:${PORT}/display  ║
  ║  Controller: http://localhost:${PORT}/controller║
  ╚═══════════════════════════════════════════╝
  `);
});
