---
title: Hongzhong Mahjong
emoji: 🀄
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
---

# Red Dragon Mahjong (红中麻将)

A web-based Red Dragon Mahjong game with multiplayer support and AI bots.

## Features
- **Rules**: Red Dragon (红中) as wildcard. No Chow. Pong/Kong/Hu allowed.
- **AI**: Fills empty seats with bots.
- **UI**: Exquisite green felt table, Unicode tiles, animations.
- **Assist**: Ting status indicator (hover to see winning tiles).
- **Auto Hu**: Option to automatically win when possible.

## How to Run
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the server:
   ```bash
   python app.py
   ```
3. Open browser at `http://localhost:8000`.

## Deploy to Hugging Face Spaces (Docker)
1. Create a new Space and choose **Docker** SDK.
2. Upload these files/folders:
   - `app.py`
   - `game/`
   - `static/`
   - `requirements.txt`
   - `Dockerfile`
   - `.dockerignore`
3. Commit and wait for build.
4. The app reads `PORT` from environment automatically in Spaces.

## Tech Stack
- **Backend**: Python (aiohttp, python-socketio)
- **Frontend**: HTML5, CSS3, Vanilla JS (Socket.io client)
