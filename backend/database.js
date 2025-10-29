const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or open database
const db = new sqlite3.Database(path.join(__dirname, 'roblox_friends.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Users table - stores app users who login with their Roblox account
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roblox_user_id INTEGER UNIQUE NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT,
        roblox_cookie TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Friends table - stores information about each friend
    db.run(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_roblox_id INTEGER NOT NULL,
        current_username TEXT NOT NULL,
        current_display_name TEXT,
        friend_added_date DATETIME,
        is_locked INTEGER DEFAULT 0,
        is_marked_for_unfriend INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, friend_roblox_id)
      )
    `);

    // Username history - tracks username changes
    db.run(`
      CREATE TABLE IF NOT EXISTS username_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
      )
    `);

    // Display name history - tracks display name changes
    db.run(`
      CREATE TABLE IF NOT EXISTS display_name_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
      )
    `);

    // Avatar snapshots - stores avatar images at different points in time
    db.run(`
      CREATE TABLE IF NOT EXISTS avatar_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id INTEGER NOT NULL,
        avatar_url TEXT NOT NULL,
        snapshot_type TEXT NOT NULL, -- 'current', 'last_played', 'first_met'
        snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
      )
    `);

    // Play sessions - tracks when users played together
    db.run(`
      CREATE TABLE IF NOT EXISTS play_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        game_name TEXT,
        played_at DATETIME NOT NULL,
        session_duration INTEGER, -- in minutes
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
      )
    `);

    // Notes - user notes about friends
    db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id INTEGER NOT NULL,
        note_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
      )
    `);

    // Games played together stats - cached statistics
    db.run(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        game_name TEXT,
        play_count INTEGER DEFAULT 1,
        last_played_together DATETIME,
        first_played_together DATETIME,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE,
        UNIQUE(friend_id, game_id)
      )
    `);

    // Friendship statistics - pre-calculated stats for performance
    db.run(`
      CREATE TABLE IF NOT EXISTS friendship_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id INTEGER UNIQUE NOT NULL,
        total_sessions INTEGER DEFAULT 0,
        last_played_together DATETIME,
        first_played_together DATETIME,
        average_days_between_sessions REAL,
        most_played_game_id INTEGER,
        most_played_game_name TEXT,
        likely_met_in_game_id INTEGER,
        likely_met_in_game_name TEXT,
        FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables initialized successfully');
  });
}

// Helper functions for database operations
const dbOperations = {
  // Run a query that doesn't return results
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  // Get a single row
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Get all rows
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = { db, dbOperations };
