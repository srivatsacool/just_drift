# 🏎️ JUST DRIFT

<div align="center">

![Just Drift](./just_drift_2.jpeg)

### **OUTRUN THE COPS. DRIFT TO SURVIVE.**

*A top-down 8-bit arcade chase game with mobile controller support*

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?logo=socket.io)](https://socket.io)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![Built by](https://img.shields.io/badge/Built%20by-Build.Srivatsa-orange)](https://github.com/srivatsacool)

**🎮 [Play Now](https://jdrift.buildsrivatsa.qzz.io)** | **📱 [Controller](https://jdrift.buildsrivatsa.qzz.io/controller)**

</div>

---

## 🤖 Semi Vibe-Coded

> **This project was semi vibe-coded** - built collaboratively with AI assistance (Claude/Gemini) using natural language prompts and iterative development. The core game logic, visual design, and architecture were developed through human-AI pair programming, combining creative vision with AI-powered code generation.

---

## 📖 Table of Contents

- [About the Game](#-about-the-game)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [How to Play](#-how-to-play)
- [Power-ups](#-power-ups)
- [Architecture](#-architecture)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Credits](#-credits)

---

## 🎮 About the Game

**Just Drift** is a fast-paced, top-down 8-bit arcade chase game where you play as a getaway driver being pursued by relentless police! Use your phone as a controller and your laptop/TV as the display for an immersive arcade experience.

| Aspect | Description |
|--------|-------------|
| **Genre** | Top-down arcade racer |
| **Style** | 8-bit retro pixel art with CRT effects |
| **Theme** | High-speed police chase |
| **Objective** | Survive as long as possible, collect coins, use power-ups |
| **Input** | Laptop/TV as display + Phone as controller |
| **Multiplayer** | Room-based (4-digit PIN code) |

---

## ✨ Features

### 🎮 Core Gameplay
- ⚡ **Fast-paced chase mechanics** with smart AI police
- 🚗 **Smooth driving physics** with nitro boost system
- 💰 **Coin collection** for bonus points
- 🔫 **Shooting mechanics** to destroy police cars
- ⏸️ **Pause functionality** on both display and controller
- 🏆 **High score tracking** saved to localStorage
- 🔄 **Retry system** on both interfaces

### 🌟 Power-up System (6 Types)
| Power-up | Icon | Duration | Effect |
|----------|------|----------|--------|
| **Shield** | 🛡️ | 5s | Invincibility |
| **Machine Gun** | 🔫 | 5s | Rapid fire mode |
| **EMP Blast** | 💥 | Instant | Destroy all police |
| **Infinite Nitro** | ⚡ | 5s | Unlimited boost |
| **Coin Magnet** | 🧲 | 10s | Attract nearby coins |
| **Nitro Refill** | ⛽ | Instant | Refill nitro to 100% (5x spawn rate) |

### 📱 Mobile Controller
- 🕹️ Touch-optimized large buttons
- 📳 Haptic feedback for immersion
- 📊 Real-time ammo and nitro display
- ⏸️ Pause button
- 🔄 Retry button on game over
- 🎨 8-bit arcade visual theme
- 📱 Landscape mode support with larger buttons

### 🖥️ Display Features
- 🎨 8-bit retro pixel art visuals
- 📺 CRT scanline effects
- 🔊 8-bit sound effects (Web Audio API)
- 📝 QR code for easy controller connection
- ⏱️ Real-time HUD (score, time, ammo, nitro)
- ⏸️ Pause button + keyboard (P / Escape)
- 🏆 High score persistence

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js 18+ | Server runtime |
| **Framework** | Express.js | HTTP server & static files |
| **Real-time** | Socket.IO 4.x | WebSocket communication |
| **Frontend** | Vanilla JS + Canvas | Game rendering |
| **Styling** | Pure CSS | 8-bit themed UI |
| **Audio** | Web Audio API | 8-bit sound effects |
| **Haptics** | Vibration API | Mobile feedback |
| **Containerization** | Docker | Production deployment |
| **Reverse Proxy** | Nginx | Traffic routing + SSL |
| **SSL** | Let's Encrypt | HTTPS certificates |
| **CDN/DNS** | Cloudflare | DNS, caching, DDoS protection |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/srivatsacool/just_drift.git
cd just_drift

# Install dependencies
npm install

# Start development server
npm start
# or
node server.js
```

Server runs at: `http://localhost:3000`

### Docker Deployment

```bash
# Build image
docker build -t just-drift .

# Run container
docker run -d --name just-drift --restart always -p 3001:8080 just-drift

# View logs
docker logs just-drift
```

---

## 🎯 How to Play

### Step 1: Open Display
Navigate to the game URL on your laptop/TV:
- **Local:** `http://localhost:3000/display`
- **Live:** `https://jdrift.buildsrivatsa.qzz.io/display`

### Step 2: Connect Controller
On your phone, open:
- **Local:** `http://YOUR_IP:3000/controller`
- **Live:** `https://jdrift.buildsrivatsa.qzz.io/controller`

Enter the 4-digit room code shown on the display.

### Step 3: Play!
Tap **FIRE** on the controller to start the game.

### 📱 Controller Layout

```
┌─────────────────────────────────────────────────────┐
│  [AMMO: 50]  [N2O: ████████]              [⏸]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐   ┌───────────┐  │
│  │      ◀      │  │      ▶      │   │    🔫     │  │
│  │    LEFT     │  │    RIGHT    │   │   FIRE    │  │
│  └─────────────┘  └─────────────┘   ├───────────┤  │
│                                     │    ⚡     │  │
│                                     │   NITRO   │  │
│                                     └───────────┘  │
└─────────────────────────────────────────────────────┘
```

### ⌨️ Keyboard Controls (Display)

| Key | Action |
|-----|--------|
| **P** | Pause/Resume |
| **Escape** | Pause/Resume |

### 🏁 Tips

1. **Collect coins** 💰 - Extra points!
2. **Use nitro wisely** - Refills automatically when not in use
3. **Look for cyan power-ups** ⛽ - Instant nitro refill
4. **Destroy police** - 500 points per car

---

## 💥 Power-ups

Power-ups spawn every **4 seconds** (max 2 on screen):

| Power-up | Color | Effect |
|----------|-------|--------|
| 🛡️ Shield | Teal | 5s invincibility |
| 🔫 Machine Gun | Red | 5s rapid fire |
| 💥 EMP | Yellow | Destroy all police instantly |
| ⚡ Infinite Nitro | Green | 5s unlimited boost |
| 🧲 Coin Magnet | Purple | 10s attract coins |
| ⛽ Nitro Refill | Cyan | Instant 100% nitro (5x spawn rate) |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   📱 Phone      │     │   🖥️ Display    │
│   Controller    │     │   Game Screen   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    WebSocket/WSS      │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │  ☁️ Cloudflare │
              │  DNS + SSL    │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  🔀 Nginx    │
              │  Reverse Proxy│
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  🐳 Docker   │
              │  Node.js App │
              └─────────────┘
```

### Data Flow

1. **Display** creates a room → gets 4-digit code
2. **Controller** joins room with code
3. **Controller** sends input (steering, nitro, fire) via WebSocket
4. **Server** relays input to display
5. **Display** runs game logic, sends state updates back

---

## 🌐 Deployment

### Production Setup (Docker + Nginx + Cloudflare)

1. **Clone to VM:**
   ```bash
   git clone https://github.com/srivatsacool/just_drift.git
   cd just_drift
   ```

2. **Build & Run Docker:**
   ```bash
   docker build -t just-drift .
   docker run -d --name just-drift --restart always -p 3001:8080 just-drift
   ```

3. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name jdrift.buildsrivatsa.qzz.io;

       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_read_timeout 86400;
       }
   }
   ```

4. **Get SSL:**
   ```bash
   sudo certbot --nginx -d jdrift.buildsrivatsa.qzz.io
   ```

5. **Add Cloudflare DNS:**
   - Type: A
   - Name: jdrift
   - Content: YOUR_VM_IP
   - Proxy: Enabled

---

## 📁 Project Structure

```
just-drift/
├── 📄 server.js              # Express + Socket.IO server
├── 📄 package.json           # Dependencies
├── 📄 Dockerfile             # Docker configuration
├── 📄 .dockerignore          # Docker ignore rules
├── 📄 app.yaml               # Google App Engine config
├── 📄 README.md              # This file
│
├── 📂 public/
│   ├── 📄 index.html         # Home page
│   ├── 🖼️ bg_2.jpeg          # Background image
│   │
│   ├── 📂 display/           # Game display
│   │   ├── 📄 index.html     # Display HTML
│   │   ├── 📄 game.js        # Game engine (~1600 lines)
│   │   └── 📄 style.css      # Display styles
│   │
│   └── 📂 controller/        # Mobile controller
│       ├── 📄 index.html     # Controller HTML
│       ├── 📄 controller.js  # Input handling
│       └── 📄 style.css      # Controller styles
│
└── 🖼️ just_drift_2.jpeg      # Logo image
```

---

## 🎨 Visual Design

### Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark Black | `#0a0a0f` |
| Road | Dark Gray | `#2d2d3a` |
| Player Car | Yellow | `#ffd166` |
| Police Car | Blue | `#2196f3` |
| Siren Red | Bright Red | `#ff1744` |
| Siren Blue | Cyan | `#00e5ff` |
| Coins | Gold | `#ffd700` |
| UI Accent | Teal | `#4ecdc4` |
| Nitro | Cyan-Green | `#4ecdc4` → `#00ff88` |

### Visual Effects
- CRT scanline overlay
- Glitch text animation
- Police siren flashing
- Nitro flame particles
- Explosion effects
- Coin sparkle animation

---

## 📊 Technical Specs

| Aspect | Specification |
|--------|---------------|
| **Rendering** | HTML5 Canvas 2D |
| **Frame Rate** | 60 FPS target |
| **Audio** | Web Audio API (procedural 8-bit sounds) |
| **Network** | WebSocket (Socket.IO) |
| **Font** | Press Start 2P (Google Fonts) |
| **Browser Support** | Chrome 80+, Firefox 75+, Safari 13+, Edge 80+ |
| **Mobile Support** | iOS Safari, Chrome for Android |

---

## 🤝 Credits

<div align="center">

### Built with ❤️ by **Build.Srivatsa**

🤖 **Semi Vibe-Coded** with AI assistance

Part of the arcade game collection featuring the innovative  
**laptop-display + phone-controller** architecture.

---

**🏎️ JUST DRIFT 🏎️**

*Can you outrun the cops?*

**[Play Now →](https://jdrift.buildsrivatsa.qzz.io)**

</div>