# ⚡ CyberQuiz Pro — AAA Real-Time Hardware Quiz Platform & Live Admin Command Center

An enterprise-grade, high-performance real-time quiz application designed with an authoritative 30-second question timer, anti-cheat & anti-retry security mechanisms, WebSocket live-streaming telemetry, and a full administrative dashboard.

---

## 🌟 Key Features

### 🎮 Participant Quiz Arena
- **10 Image-Driven Questions**: Visual hardware component identification questions with 4 selectable options each.
- **Authoritative 30-Second Countdown**: Server-synchronized countdown per question with auto-advancement when time expires.
- **Zero-Retry Lock**: Single-click selection locks immediately and prevents going back or modifying answers.
- **High-Definition Image Inspector**: Full-screen zoom and pan tool for detailed inspection of hardware components.
- **Keyboard Navigation**: Instant selection using keys `1`, `2`, `3`, `4` or `A`, `B`, `C`, `D`.
- **Anti-Cheat & Tab-Switch Monitor**: Detects window blur and tab switching, triggering security alerts and logging violations live on the admin dashboard.
- **Network & Refresh Resilience**: Resumes seamlessly on the exact active question with remaining time if page is reloaded.
- **Web Audio Sound Effects**: Procedurally synthesized sounds for countdown ticks, option lock-in, urgent time warnings, and victory fanfares (with mute toggle).
- **Post-Quiz Debrief**: Comprehensive debrief with score breakdown, speed metrics, performance badge, and detailed hardware component explanations.

### 🛡️ Admin Real-Time Command Center
- **Sub-50ms Live Telemetry Stream**: WebSocket broadcast streaming every participant's active question, selected choice, live score, time taken, and connection status.
- **Ranked Leaderboard**: Real-time sorted leaderboard by score and completion speed.
- **Option Distribution Heatmaps**: Live A/B/C/D answer distribution per question and accuracy percentages.
- **Participant Inspector**: Deep drill-down modal to inspect any participant's exact answers, response timestamps, and security violations.
- **Live Broadcast Tool**: Send real-time announcement banners to all active participants simultaneously.
- **Question Image Asset Manager**: Easily upload or replace images for any of the 10 questions directly from the UI with instant hot-swapping.
- **CSV Data Export**: One-click download of the complete leaderboard and participant telemetry in CSV format.

---

## 🔑 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

---

## 🚀 How to Run the Application

### Option 1: Quick Start (Single Server)
```bash
# Start the unified production server (serves frontend, backend & websockets on port 5000)
npm start
```
Open your browser and navigate to:
- **Participant Arena**: [http://localhost:5000](http://localhost:5000)
- **Admin Command Center**: Click **Admin Portal** in the top right or go to [http://localhost:5000](http://localhost:5000)

### Option 2: Development Mode (with Hot Reload)
In one terminal:
```bash
node server/src/server.js
```
In a second terminal:
```bash
cd client
npm run dev
```

---

## 🧪 Running Automated Tests

To run the complete automated test suite (verifying authentication, authoritative timers, anti-retry locks, violation tracking, live scoring, and CSV export):
```bash
npm test
```

---

## 🖼️ The 10 Questions & Answers Reference

| # | Component | Correct Option | Correct Answer Text |
|---|---|---|---|
| 1 | Biometric Terminal / Fingerprint Scanner | **D** | **Biometric Scanner** |
| 2 | Iris Scanner Optical Sensor | **A** | **Iris Scanner** |
| 3 | VR Head-Mounted Display | **C** | **VR Headset** |
| 4 | 8-Port Ethernet Network Switch | **D** | **Network Hub** |
| 5 | ATmega328P Microcontroller Chip | **B** | **Microchip** |
| 6 | Smartphone Micro SIM Card Tray | **B** | **SIM Card Tray** |
| 7 | CMOS Digital Camera Sensor Module | **D** | **Camera Sensor** |
| 8 | Optical Fiber Filament Light Cable | **B** | **Optical Fiber** |
| 9 | Computer Main Motherboard PCB | **B** | **Motherboard** |
| 10| Directional Analog Arcade / Flight Stick | **D** | **Joystick** |
