import { open } from 'react-native-quick-sqlite';

const DATABASE_NAME = 'SmartSolarApp.db';

let db: any = null;
let isInitialized = false;

class DatabaseService {
  async initDatabase(): Promise<void> {
    if (isInitialized && db) {
      return;
    }

    try {
      db = open({
        name: DATABASE_NAME,
        location: 'default',
      });

      // Create tables
      await this.createTables();
      isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      db.executeAsync(
        `CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
      
      // Create user_profile table for storing profile pictures
      db.executeAsync(
        `CREATE TABLE IF NOT EXISTS user_profile (
          user_id TEXT PRIMARY KEY NOT NULL,
          profile_picture TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
      
      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async getSetting(key: string): Promise<string | null> {
    try {
      await this.initDatabase();

      if (!db) {
        console.error('Database not initialized in getSetting');
        return null;
      }

      const result = await db.executeAsync(
        'SELECT value FROM app_settings WHERE key = ?',
        [key]
      );

      if (result.rows && result.rows.length > 0) {
        return result.rows.item(0).value;
      }
      return null;
    } catch (error) {
      console.error('Error getting setting:', error);
      return null;
    }
  }

  async setSetting(key: string, value: string): Promise<void> {
    try {
      await this.initDatabase();

      if (!db) {
        throw new Error('Database not initialized');
      }

      await db.executeAsync(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
        [key, value]
      );
      console.log('Setting saved successfully:', key, value);
    } catch (error) {
      console.error('Error setting preference:', error);
      throw error;
    }
  }

  async getProfilePicture(userId: string): Promise<string | null> {
    try {
      await this.initDatabase();

      if (!db) {
        console.error('Database not initialized in getProfilePicture');
        return null;
      }

      const result = await db.executeAsync(
        'SELECT profile_picture FROM user_profile WHERE user_id = ?',
        [userId]
      );

      if (result.rows && result.rows.length > 0) {
        return result.rows.item(0).profile_picture;
      }
      return null;
    } catch (error) {
      console.error('Error getting profile picture:', error);
      return null;
    }
  }

  async saveProfilePicture(userId: string, profilePicture: string): Promise<void> {
    try {
      await this.initDatabase();

      if (!db) {
        throw new Error('Database not initialized');
      }

      await db.executeAsync(
        'INSERT OR REPLACE INTO user_profile (user_id, profile_picture, updated_at) VALUES (?, ?, datetime("now"))',
        [userId, profilePicture]
      );
      console.log('Profile picture saved successfully');
    } catch (error) {
      console.error('Error saving profile picture:', error);
      throw error;
    }
  }

  async closeDatabase(): Promise<void> {
    if (db) {
      try {
        db.close();
        console.log('Database closed');
        db = null;
        isInitialized = false;
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  }
}

export const databaseService = new DatabaseService();
