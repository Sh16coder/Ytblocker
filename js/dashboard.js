import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { logout } from './auth.js';

class Dashboard {
    constructor() {
        this.user = null;
        this.userData = null;
        this.timerInterval = null;
        this.currentUsage = 0;
        this.isYouTubeOpen = false;
        
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.checkAuthState();
        this.startUsageTracker();
    }

    initEventListeners() {
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', logout);

        // YouTube button
        document.getElementById('goToYouTubeBtn')?.addEventListener('click', () => {
            this.handleYouTubeAccess();
        });

        // Settings
        document.getElementById('editLimitBtn')?.addEventListener('click', () => {
            this.toggleLimitEdit();
        });

        document.getElementById('saveLimitBtn')?.addEventListener('click', () => {
            this.saveDailyLimit();
        });

        // Block overlay
        document.getElementById('closeOverlay')?.addEventListener('click', () => {
            this.hideBlockOverlay();
        });
    }

    async checkAuthState() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.user = user;
                await this.loadUserData();
                this.setupRealtimeListener();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    async loadUserData() {
        try {
            const userDoc = await getDoc(doc(db, 'users', this.user.uid));
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                this.updateDashboard();
                this.checkDailyReset();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    setupRealtimeListener() {
        // Listen for real-time updates to user data
        const userDocRef = doc(db, 'users', this.user.uid);
        onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                this.userData = doc.data();
                this.updateDashboard();
            }
        });
    }

    updateDashboard() {
        if (!this.userData) return;

        const dailyLimit = this.userData.dailyLimit || 7200; // Default 2 hours in seconds
        this.currentUsage = this.userData.currentUsage || 0;

        // Update usage display
        document.getElementById('todayUsage').textContent = this.formatTime(this.currentUsage);
        document.getElementById('dailyLimit').textContent = `${Math.round(dailyLimit / 60)} minutes`;

        // Update progress bar
        const percentage = Math.min((this.currentUsage / dailyLimit) * 100, 100);
        document.getElementById('usageProgress').style.width = `${percentage}%`;
        document.getElementById('usagePercentage').textContent = `${Math.round(percentage)}%`;

        // Update status
        const isBlocked = this.currentUsage >= dailyLimit;
        document.getElementById('statusText').textContent = isBlocked ? 'Blocked' : 'Active';
        document.getElementById('statusIndicator').className = `status-indicator ${isBlocked ? 'blocked' : 'active'}`;
        
        // Show/hide block message
        document.getElementById('blockMessage').classList.toggle('hidden', !isBlocked);

        // Update settings input
        document.getElementById('customLimit').value = Math.round(dailyLimit / 60);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    handleYouTubeAccess() {
        const dailyLimit = this.userData.dailyLimit || 7200;
        
        if (this.currentUsage >= dailyLimit) {
            this.showBlockOverlay();
        } else {
            this.openYouTube();
        }
    }

    openYouTube() {
        // Open YouTube in a new tab
        const youtubeWindow = window.open('https://www.youtube.com', '_blank');
        this.isYouTubeOpen = true;
        
        // Start tracking time when YouTube is opened
        this.startYouTubeTracking();
        
        // Check every second if the window is closed
        const checkWindow = setInterval(() => {
            if (youtubeWindow.closed) {
                this.isYouTubeOpen = false;
                this.stopYouTubeTracking();
                clearInterval(checkWindow);
            }
        }, 1000);
    }

    startYouTubeTracking() {
        this.trackingStartTime = Date.now();
        
        this.trackingInterval = setInterval(async () => {
            if (this.isYouTubeOpen) {
                const elapsedSeconds = Math.floor((Date.now() - this.trackingStartTime) / 1000);
                
                // Update local usage
                this.currentUsage += elapsedSeconds;
                this.trackingStartTime = Date.now();
                
                // Update Firestore
                try {
                    await updateDoc(doc(db, 'users', this.user.uid), {
                        currentUsage: this.currentUsage,
                        lastUpdated: new Date()
                    });
                } catch (error) {
                    console.error('Error updating usage:', error);
                }
                
                this.updateDashboard();
            }
        }, 5000); // Update every 5 seconds
    }

    stopYouTubeTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    }

    showBlockOverlay() {
        document.getElementById('blockOverlay').classList.remove('hidden');
        document.getElementById('limitDisplay').textContent = `${Math.round(this.userData.dailyLimit / 60)} minutes`;
    }

    hideBlockOverlay() {
        document.getElementById('blockOverlay').classList.add('hidden');
    }

    toggleLimitEdit() {
        const limitInput = document.getElementById('customLimit');
        const saveBtn = document.getElementById('saveLimitBtn');
        const isEditing = limitInput.disabled;
        
        limitInput.disabled = !isEditing;
        saveBtn.style.display = isEditing ? 'inline-block' : 'none';
    }

    async saveDailyLimit() {
        const newLimit = parseInt(document.getElementById('customLimit').value);
        
        if (newLimit && newLimit > 0 && newLimit <= 1440) {
            try {
                await updateDoc(doc(db, 'users', this.user.uid), {
                    dailyLimit: newLimit * 60 // Convert to seconds
                });
                
                this.toggleLimitEdit();
                this.showNotification('Daily limit updated successfully!', 'success');
            } catch (error) {
                this.showNotification('Error updating limit. Please try again.', 'error');
            }
        }
    }

    async checkDailyReset() {
        const today = new Date().toDateString();
        const lastReset = this.userData.lastReset;
        
        if (lastReset !== today) {
            // Reset daily usage
            try {
                await updateDoc(doc(db, 'users', this.user.uid), {
                    currentUsage: 0,
                    lastReset: today
                });
                
                // Add usage record to history
                await this.addUsageRecord();
            } catch (error) {
                console.error('Error resetting daily usage:', error);
            }
        }
    }

    async addUsageRecord() {
        if (this.userData.currentUsage > 0) {
            try {
                const usageRecord = {
                    date: new Date(this.userData.lastReset),
                    usage: this.userData.currentUsage,
                    limit: this.userData.dailyLimit,
                    userId: this.user.uid
                };
                
                // Add to usage history collection
                // Implementation depends on your Firestore structure
            } catch (error) {
                console.error('Error adding usage record:', error);
            }
        }
    }

    startUsageTracker() {
        // Track time even when not on YouTube (for background tracking)
        setInterval(() => {
            if (this.isYouTubeOpen) {
                // Time is tracked separately when YouTube is open
                return;
            }
            
            // Additional tracking logic can be added here
        }, 60000); // Check every minute
    }

    showNotification(message, type) {
        // Create and show a temporary notification
        const notification = document.createElement('div');
        notification.className = `message ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1000';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
