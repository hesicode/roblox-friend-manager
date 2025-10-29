# Roblox Friend Manager

A Tinder-style web application for managing your Roblox friends. Swipe through your friends list and decide who to keep or unfriend.

## Features

- 🔐 Secure login with Roblox cookie authentication
- 📊 Dashboard with friend statistics
- 👆 Swipe interface (Tinder-style) for reviewing friends
- 🖼️ Avatar history tracking (current vs first met)
- 📝 Add notes to friends
- 🔒 Lock friends to protect from accidental unfriending
- ⌨️ Keyboard shortcuts (arrow keys)
- 📱 Fully responsive mobile design
- 🎮 View play history, top games, and statistics
- 📜 Username and display name history tracking

## Tech Stack

**Backend:**
- Node.js + Express
- SQLite database
- Roblox API integration

**Frontend:**
- React 18
- React Router
- React Spring (animations)
- React Use Gesture (swipe gestures)

## Installation

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
npm install
```

2. Start the backend server:
```bash
npm start
```

Server runs on http://localhost:3001

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
npm install
```

2. Start the frontend:
```bash
npm start
```

Frontend runs on http://localhost:3000

## Usage

1. Login with your Roblox `.ROBLOSECURITY` cookie
2. Sync your friends from the dashboard
3. Start swiping!
   - **Swipe Right / Right Arrow** = Keep friend
   - **Swipe Left / Left Arrow** = Mark for unfriend
   - **Lock button** = Protect friend forever
   - **Expand button (→)** = View detailed info
4. Review marked friends before mass unfriending

## Security Note

Your Roblox cookie is stored locally and only used to communicate with Roblox APIs. Never share your cookie with anyone.

## License

MIT

---

🤖 Built with Claude Code
