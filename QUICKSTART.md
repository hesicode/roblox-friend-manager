# Quick Start Guide

Get up and running with Roblox Friend Manager in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- A Roblox account with friends

## Installation (One-time setup)

### Option 1: Automated Setup (Recommended)
```bash
cd roblox-friend-manager
./setup.sh
```

### Option 2: Manual Setup
```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

## Running the Application

### Terminal 1 - Backend
```bash
cd backend
npm start
```
Server runs on: http://localhost:3001

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```
App opens at: http://localhost:3000

## Getting Your Roblox Cookie

1. Go to https://www.roblox.com and log in
2. Press `F12` to open Developer Tools
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Click **Cookies** → **https://www.roblox.com**
5. Find `.ROBLOSECURITY` cookie
6. Copy its **Value** (long string)
7. Paste into the login form

⚠️ **Never share this cookie with anyone!**

## First Time Usage

1. **Login**: Paste your Roblox cookie
2. **Sync**: Click "Sync Friends from Roblox" on dashboard
3. **Swipe**: Click "Start Swiping" to begin reviewing friends
4. **Review**: After swiping, review marked friends
5. **Execute**: Click "Unfriend All" to remove marked friends

## Controls

### Swipe Interface
- **→ or ✓**: Keep friend (skip)
- **← or ✕**: Mark for unfriend
- **🔒**: Lock friend (protect forever)
- **Undo**: Go back to previous friend

### Desktop
- Click buttons below the card
- Or drag the card left/right

### Mobile
- Swipe the card directly
- Or tap the buttons

## Tips

1. **Lock Important Friends First**: Lock your closest friends before swiping
2. **Use Notes**: Add notes to remember who people are
3. **Avatar History**: Toggle avatars to help identify friends who changed names
4. **Review Before Unfriending**: Always review the list before executing
5. **Undo Available**: You can undo your last action while swiping

## Troubleshooting

### "Invalid Roblox cookie"
- Get a fresh cookie from Roblox
- Make sure you copied the entire value

### "No friends to review"
- Click "Sync Friends" on the dashboard first
- Wait for sync to complete

### Backend won't start
- Make sure port 3001 is available
- Check that npm install completed successfully

### Frontend won't start
- Make sure port 3000 is available
- Verify backend is running first

## Need More Help?

See the full [README.md](README.md) for:
- Detailed feature explanations
- Complete API documentation
- Security information
- Advanced troubleshooting

---

**Happy Friend Managing! 🎉**
