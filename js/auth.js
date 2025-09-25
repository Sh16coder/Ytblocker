import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class AuthManager {
    constructor() {
        this.initEventListeners();
        this.checkAuthState();
    }

    initEventListeners() {
        // Login/Signup form toggle
        document.getElementById('showSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });
    }

    showLoginForm() {
        document.getElementById('signupCard').style.display = 'none';
        document.getElementById('loginForm').parentElement.style.display = 'block';
    }

    showSignupForm() {
        document.getElementById('loginForm').parentElement.style.display = 'none';
        document.getElementById('signupCard').style.display = 'block';
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('authMessage');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            this.showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after successful login
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        }
    }

    async handleSignup() {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const dailyLimit = parseInt(document.getElementById('dailyLimit').value) * 60; // Convert to seconds
        const messageEl = document.getElementById('authMessage');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                dailyLimit: dailyLimit,
                createdAt: new Date(),
                currentUsage: 0,
                lastReset: new Date().toDateString()
            });

            this.showMessage('Account created successfully! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        }
    }

    checkAuthState() {
        onAuthStateChanged(auth, (user) => {
            if (user && window.location.pathname.includes('login.html')) {
                // User is signed in, redirect to dashboard
                window.location.href = 'dashboard.html';
            } else if (!user && !window.location.pathname.includes('login.html') && 
                      !window.location.pathname.includes('index.html')) {
                // User is not signed in, redirect to login
                window.location.href = 'login.html';
            }
        });
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'This email is already registered.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            default:
                return 'An error occurred. Please try again.';
        }
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('authMessage');
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');

        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Logout functionality
export async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}
