# Promodo Timer

A server-first Pomodoro timer with multi-client support.

## About

WebSocket-based Pomodoro timer backend built with Bun and TypeScript. Designed to support web, desktop, and mobile clients.

## Status

✅ Released v1.0.0

## Tech Stack

- Runtime: Bun
- Language: TypeScript
- Protocol: WebSocket
- 
## Features
- 25min work / 5min break modes
- Sound effects and notifications
- User sessions - sync across devices
- Desktop app (Windows)

## Usage

### Web
Visit [bananadoro.bananalabs.cloud](https://bananadoro.bananalabs.cloud)

### Desktop
Download from [Releases](https://github.com/sirniklas9/pomodoro-timer/releases)

### Self-host (Docker)
```bash
docker pull ghcr.io/sirniklas9/pomodoro-timer:latest
docker run -d --name bananadoro -p 3000:3000 ghcr.io/sirniklas9/pomodoro-timer:latest
```

## License

Proprietary - All rights reserved.