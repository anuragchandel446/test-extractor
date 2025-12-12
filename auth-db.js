// auth-db.js - Client-side authentication database using IndexedDB
// Moon Stoners TTS Reader Authentication System

class AuthDatabase {
    constructor() {
        this.dbName = 'MoonStonersAuth';
        this.dbVersion = 1;
        this.db = null;
        this.storeName = 'users';
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                
                // Create object store for users
                if (!this.db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = this.db.createObjectStore(this.storeName, {
                        keyPath: 'username'
                    });
                    
                    // Create indexes
                    objectStore.createIndex('email', 'email', { unique: false });
                    objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    objectStore.createIndex('lastLogin', 'lastLogin', { unique: false });
                    
                    console.log('Database setup complete');
                }
            };
        });
    }

    // Hash password (simple client-side hashing - in production use proper server-side hashing)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'moon_stoners_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Register a new user
    async registerUser(userData) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const { username, password, email = '', fullName = '' } = userData;

        // Validate input
        if (!username || username.length < 2) {
            throw new Error('Username must be at least 2 characters long');
        }

        if (!password || password.length < 4) {
            throw new Error('Password must be at least 4 characters long');
        }

        // Check if user already exists
        const existingUser = await this.getUser(username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        // Hash password
        const hashedPassword = await this.hashPassword(password);

        // Create user object
        const user = {
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            email: email.toLowerCase().trim(),
            fullName: fullName.trim(),
            createdAt: new Date().toISOString(),
            lastLogin: null,
            loginCount: 0,
            preferences: {
                theme: 'cosmic',
                language: 'en',
                autoSpeak: false,
                backgroundAnimation: true
            }
        };

        // Store user in database
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.add(user);

            request.onsuccess = () => {
                console.log('User registered successfully:', username);
                resolve({ success: true, user: { username: user.username, fullName: user.fullName } });
            };

            request.onerror = () => {
                console.error('Failed to register user:', request.error);
                reject(new Error('Failed to register user'));
            };
        });
    }

    // Authenticate user login
    async loginUser(username, password) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        // Get user from database
        const user = await this.getUser(username);
        if (!user) {
            throw new Error('Invalid username or password');
        }

        // Verify password
        const hashedPassword = await this.hashPassword(password);
        if (user.password !== hashedPassword) {
            throw new Error('Invalid username or password');
        }

        // Update last login
        await this.updateLastLogin(username);

        // Return user info (without password)
        const { password: _, ...userInfo } = user;
        return {
            success: true,
            user: userInfo,
            message: 'Login successful'
        };
    }

    // Get user by username
    async getUser(username) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(username.toLowerCase().trim());

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Update last login time
    async updateLastLogin(username) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const user = await this.getUser(username);
        if (!user) return;

        user.lastLogin = new Date().toISOString();
        user.loginCount = (user.loginCount || 0) + 1;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.put(user);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Logout user (update last logout time)
    async logoutUser(username) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const user = await this.getUser(username);
        if (!user) return;

        user.lastLogout = new Date().toISOString();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.put(user);

            request.onsuccess = () => {
                console.log('User logout recorded:', username);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Get all users (for admin purposes - without passwords)
    async getAllUsers() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                const users = request.result.map(user => {
                    const { password, ...userInfo } = user;
                    return userInfo;
                });
                resolve(users);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Update user preferences
    async updateUserPreferences(username, preferences) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const user = await this.getUser(username);
        if (!user) {
            throw new Error('User not found');
        }

        user.preferences = { ...user.preferences, ...preferences };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.put(user);

            request.onsuccess = () => resolve(user.preferences);
            request.onerror = () => reject(request.error);
        });
    }

    // Delete user account
    async deleteUser(username) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(username.toLowerCase().trim());

            request.onsuccess = () => {
                console.log('User deleted successfully:', username);
                resolve(true);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Check if database has any users
    async hasUsers() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.count();

            request.onsuccess = () => {
                resolve(request.result > 0);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Create demo users for testing
    async createDemoUsers() {
        const demoUsers = [
            {
                username: 'admin',
                password: 'admin123',
                email: 'admin@moonstoners.com',
                fullName: 'Administrator'
            },
            {
                username: 'demo',
                password: 'demo123',
                email: 'demo@moonstoners.com',
                fullName: 'Demo User'
            },
            {
                username: 'guest',
                password: 'guest123',
                email: 'guest@moonstoners.com',
                fullName: 'Guest User'
            }
        ];

        const results = [];
        for (const userData of demoUsers) {
            try {
                const result = await this.registerUser(userData);
                results.push(result);
            } catch (error) {
                console.log(`Demo user ${userData.username} already exists or failed to create:`, error.message);
            }
        }

        return results;
    }

    // Export user data (for backup)
    async exportUserData() {
        const users = await this.getAllUsers();
        const exportData = {
            exportDate: new Date().toISOString(),
            version: this.dbVersion,
            userCount: users.length,
            users: users
        };

        return JSON.stringify(exportData, null, 2);
    }

    // Get database statistics
    async getStats() {
        const users = await this.getAllUsers();
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const stats = {
            totalUsers: users.length,
            activeUsers: users.filter(user => 
                user.lastLogin && new Date(user.lastLogin) > oneWeekAgo
            ).length,
            newUsers: users.filter(user => 
                new Date(user.createdAt) > oneWeekAgo
            ).length,
            averageLoginCount: users.length > 0 
                ? Math.round(users.reduce((sum, user) => sum + (user.loginCount || 0), 0) / users.length)
                : 0
        };

        return stats;
    }
}

// Create global instance
window.authDB = new AuthDatabase();

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.authDB.init();
        
        // Create demo users if no users exist
        const hasUsers = await window.authDB.hasUsers();
        if (!hasUsers) {
            console.log('Creating demo users...');
            await window.authDB.createDemoUsers();
            console.log('Demo users created successfully');
        }
    } catch (error) {
        console.error('Failed to initialize auth database:', error);
    }
});