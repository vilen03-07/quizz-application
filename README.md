# ⚡ Hardware Arena — Real-Time Identification Platform

An enterprise-grade, real-time quiz application designed with an authoritative 30-second question timer, anti-cheat & anti-retry security mechanisms, WebSocket live-streaming telemetry, and a mission-control administrative dashboard.

---

## ☁️ Cloudflare Pages & Production Deployment Guide

### Cloudflare Pages Settings (Recommended)

When connecting your GitHub repository to **Cloudflare Pages**:

| Setting | Value |
|---|---|
| **Framework Preset** | `Vite` (or `None`) |
| **Root Directory** | `/` (Leave empty/root) OR `client` |
| **Build Command** | `npm run build` |
| **Build Output Directory** | `client/dist` (or `dist` if root dir is `client`) |
| **Node.js Version** | `20` (Set environment variable `NODE_VERSION=20`) |

### Environment Variables (Optional)
- `VITE_API_URL`: (Optional) URL of your Node.js backend server (e.g. `https://your-quiz-api.onrender.com` or `https://quiz-api.yourdomain.com`). If frontend and backend are hosted on the same domain, leave empty.

---

## 🌟 Features & Specifications

- **10 Hardware Components**: Biometric Scanner, Iris Scanner, VR Headset, Network Hub, Microchip, SIM Card Tray, Camera Sensor, Optical Fiber, Motherboard, Joystick.
- **Authoritative 30s Countdown**: Server-synchronized countdown per question with auto-advancement on timeout.
- **Single Attempt Lock**: Answer choices lock instantly with zero retries or backward navigation.
- **Anti-Cheat Monitor**: Tracks window blur and tab switching, streaming integrity alerts to the administrator in real-time.
- **Live Streaming Admin Dashboard**: Sub-50ms WebSocket telemetry streaming active question, response time, selected choice, live score, answer heatmaps, and one-click CSV export.

---

## 🔑 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

---

## 🚀 Running Locally

```bash
# Install dependencies & run production build
npm run build

# Start the unified production server
npm start
```
- **Quiz Arena**: [http://localhost:5000](http://localhost:5000)
- **Admin Panel**: [http://localhost:5000](http://localhost:5000) (Click Admin Panel in top right)

---

## 🧪 Running Verification Tests

```bash
npm test
```
