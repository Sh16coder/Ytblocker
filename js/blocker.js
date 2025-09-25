import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class YouTubeBlocker {
    constructor() {
        this.user = null;
        this.userData = null;
        this.init();
    }

    async init() {
        await this.checkAuthState();
        this.setupBlocker();
    }

    async checkAuthState() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.user = user;
                await this.loadUserData();
            }
        });
    }

    async loadUserData() {
        try {
            const userDoc = await getDoc(doc(db, 'users', this.user.uid));
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                this.checkBlockStatus();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    setupBlocker() {
        // Check if current page is YouTube
        if (this.isYouTubePage()) {
            this.monitorYouTube();
        }
    }

    isYouTubePage() {
        return window.location.hostname.includes('youtube.com') || 
               window.location.hostname.includes('youtu.be');
    }

    async monitorYouTube() {
        // Check block status every second
        setInterval(async () => {
            await this.checkBlockStatus();
        }, 1000);

        // Initial check
        await this.checkBlockStatus();
    }

    async checkBlockStatus() {
        if (!this.userData) {
            await this.loadUserData();
        }

        if (this.userData) {
            const dailyLimit = this.userData.dailyLimit || 7200;
            const currentUsage = this.userData.currentUsage || 0;

            if (currentUsage >= dailyLimit) {
                this.blockYouTube();
            } else {
                this.unblockYouTube();
            }
        }
    }

    blockYouTube() {
        if (!document.getElementById('yt-blocker-overlay')) {
            this.createBlockOverlay();
        }
        
        // Disable video playback
        this.disableYouTubeContent();
    }

    unblockYouTube() {
        const overlay = document.getElementById('yt-blocker-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        this.enableYouTubeContent();
    }

    createBlockOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'yt-blocker-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;

        const message = document.createElement('div');
        message.style.cssText = `
            text-align: center;
            padding: 2rem;
            background: #1a1a1a;
            border-radius: 12px;
            max-width: 400px;
        `;

        message.innerHTML = `
            <h2 style="color: #ff4444; margin-bottom: 1rem;">⏰ Time's Up!</h2>
            <p>You've reached your daily YouTube limit.</p>
            <p>YouTube will be available again after midnight.</p>
            <button id="yt-blocker-close" style="
                margin-top: 1rem;
                padding: 0.5rem 1rem;
                background: #4361ee;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            ">Okay</button>
        `;

        overlay.appendChild(message);
        document.body.appendChild(overlay);

        // Add event listener to close button
        document.getElementById('yt-blocker-close').addEventListener('click', () => {
            window.location.href = 'https://your-app-domain.com/dashboard.html';
        });
    }

    disableYouTubeContent() {
        // Pause all videos
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });

        // Disable click events on YouTube content
        document.addEventListener('click', this.preventClicks, true);
    }

    enableYouTubeContent() {
        document.removeEventListener('click', this.preventClicks, true);
    }

    preventClicks(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}

// Initialize blocker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeBlocker();
});
