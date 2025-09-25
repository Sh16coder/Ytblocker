import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy,
    limit 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class Analytics {
    constructor() {
        this.user = null;
        this.usageData = [];
        this.currentPeriod = 'daily';
        this.charts = {};
        
        this.init();
    }

    async init() {
        this.initEventListeners();
        await this.checkAuthState();
        this.loadAnalyticsData();
    }

    initEventListeners() {
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Period filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setPeriod(e.target.dataset.period);
            });
        });
    }

    async checkAuthState() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                this.loadAnalyticsData();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    setPeriod(period) {
        this.currentPeriod = period;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });
        
        this.updateAnalyticsDisplay();
    }

    async loadAnalyticsData() {
        if (!this.user) return;

        try {
            // In a real implementation, you would query your usage history collection
            // This is a simplified version with mock data
            this.usageData = await this.getMockUsageData();
            this.updateAnalyticsDisplay();
            this.initCharts();
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }

    async getMockUsageData() {
        // Generate mock data for demonstration
        // In production, you would query Firestore for actual usage records
        const data = [];
        const today = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                usage: Math.floor(Math.random() * 7200), // Random usage up to 2 hours
                limit: 7200 // 2 hours in seconds
            });
        }
        
        return data;
    }

    updateAnalyticsDisplay() {
        const filteredData = this.getFilteredData();
        this.updateSummaryStats(filteredData);
        this.updateUsageList(filteredData);
    }

    getFilteredData() {
        const today = new Date();
        let daysToShow = 7; // Default to weekly
        
        switch (this.currentPeriod) {
            case 'daily':
                daysToShow = 1;
                break;
            case 'weekly':
                daysToShow = 7;
                break;
            case 'monthly':
                daysToShow = 30;
                break;
        }
        
        return this.usageData.slice(-daysToShow);
    }

    updateSummaryStats(data) {
        const totalUsage = data.reduce((sum, day) => sum + day.usage, 0);
        const averageUsage = data.length > 0 ? totalUsage / data.length : 0;
        const totalLimit = data.reduce((sum, day) => sum + day.limit, 0);
        const limitUsed = totalLimit > 0 ? (totalUsage / totalLimit) * 100 : 0;

        document.getElementById('totalUsage').textContent = this.formatTime(totalUsage);
        document.getElementById('averageUsage').textContent = this.formatTime(averageUsage);
        document.getElementById('limitUsed').textContent = `${Math.round(limitUsed)}%`;
        document.getElementById('usagePeriod').textContent = `This ${this.currentPeriod}`;
    }

    updateUsageList(data) {
        const usageList = document.getElementById('usageList');
        usageList.innerHTML = '';

        data.forEach(day => {
            const usageItem = document.createElement('div');
            usageItem.className = 'usage-item';
            
            const usagePercentage = (day.usage / day.limit) * 100;
            
            usageItem.innerHTML = `
                <span>${this.formatDate(day.date)}</span>
                <span>${this.formatTime(day.usage)}</span>
                <span>${Math.round(usagePercentage)}%</span>
            `;
            
            usageList.appendChild(usageItem);
        });
    }

    initCharts() {
        this.createUsageChart();
        this.createComparisonChart();
    }

    createUsageChart() {
        const ctx = document.getElementById('usageChart').getContext('2d');
        const filteredData = this.getFilteredData();
        
        if (this.charts.usage) {
            this.charts.usage.destroy();
        }

        this.charts.usage = new Chart(ctx, {
            type: 'line',
            data: {
                labels: filteredData.map(day => this.formatChartDate(day.date)),
                datasets: [{
                    label: 'Usage Time',
                    data: filteredData.map(day => Math.round(day.usage / 60)), // Convert to minutes
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Usage Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        });
    }

    createComparisonChart() {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        const filteredData = this.getFilteredData();
        
        if (this.charts.comparison) {
            this.charts.comparison.destroy();
        }

        this.charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: filteredData.map(day => this.formatChartDate(day.date)),
                datasets: [{
                    label: 'Usage',
                    data: filteredData.map(day => Math.round(day.usage / 60)),
                    backgroundColor: 'rgba(67, 97, 238, 0.8)',
                }, {
                    label: 'Limit',
                    data: filteredData.map(day => Math.round(day.limit / 60)),
                    backgroundColor: 'rgba(108, 117, 125, 0.3)',
                    type: 'line',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Usage vs Limit'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        });
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatChartDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    async logout() {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Analytics();
});
