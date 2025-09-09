export class Timer {
    constructor(health) {
        this.health = health;
        this.startTime = Date.now();
        this.currentTime = 0;
        this.totalTime = 0;
        this.isRunning = true;
        this.timerElement = null;
        
        this.createTimerUI();
        this.startTimer();
    }
    
    createTimerUI() {
        // Create timer display element positioned to not conflict with health bar
        this.timerElement = document.createElement('div');
        this.timerElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            color: #ffffff;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            border: 2px solid #00ff00;
            text-shadow: 0 0 5px #00ff00;
            min-width: 120px;
            text-align: center;
        `;
        document.body.appendChild(this.timerElement);
    }
    
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            // Check if health system exists and car is destroyed
            if (this.health && this.health.isDestroyed === true) {
                this.stopTimer();
                return;
            }
            
            if (this.isRunning) {
                this.currentTime = Date.now() - this.startTime;
                this.updateDisplay();
            }
        }, 10); // Update every 10ms for smooth display
    }
    
    updateDisplay() {
        if (this.timerElement) {
            this.timerElement.textContent = `Time: ${this.formatTime(this.currentTime)}`;
        }
    }
    
    stopTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.totalTime = this.currentTime;
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            // Update display to show final time
            if (this.timerElement) {
                this.timerElement.style.color = '#ff4444';
                this.timerElement.style.borderColor = '#ff4444';
                this.timerElement.style.textShadow = '0 0 5px #ff4444';
                this.timerElement.textContent = `Final Time: ${this.formatTime(this.totalTime)}`;
            }
            
            console.log(`Timer stopped. Total time: ${this.formatTime(this.totalTime)}`);
        }
    }
    
    getTotalTime() {
        return this.isRunning ? this.currentTime : this.totalTime;
    }
    
    getTotalTimeFormatted() {
        const time = this.getTotalTime();
        return this.formatTime(time);
    }
    
    // Method to pause/resume timer (useful for game pauses)
    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            this.pauseTime = Date.now();
            console.log('Timer paused at:', this.formatTime(this.currentTime));
        }
    }
    
    resume() {
        if (!this.isRunning && !this.health?.isDestroyed) {
            this.startTime += (Date.now() - this.pauseTime);
            this.isRunning = true;
            console.log('Timer resumed');
        }
    }
    
    // Method to check if game is over and return survival time
    getGameResult() {
        return {
            isDestroyed: this.health?.isDestroyed || false,
            survivalTime: this.getTotalTime(),
            survivalTimeFormatted: this.getTotalTimeFormatted(),
            isRunning: this.isRunning
        };
    }
    
    // Method to reset the timer
    reset() {
        this.stopTimer();
        this.startTime = Date.now();
        this.currentTime = 0;
        this.totalTime = 0;
        this.isRunning = true;
        
        if (this.timerElement) {
            this.timerElement.style.color = '#ffffff';
            this.timerElement.style.borderColor = '#00ff00';
            this.timerElement.style.textShadow = '0 0 5px #00ff00';
        }
        
        this.startTimer();
    }
    
    // Clean up the timer and UI element
    cleanup() {
        this.stopTimer();
        if (this.timerElement && this.timerElement.parentNode) {
            this.timerElement.parentNode.removeChild(this.timerElement);
        }
    }
}

// Usage example with your Health class:
/*
import Health from './Health.js';
import { Timer } from './Timer.js';

// Initialize your health system
const health = new Health(world, scene, car, 100, renderer);
health.init();

// Create timer that monitors the health system
const gameTimer = new Timer(health);

// Optional: Set up health callback to log timer when player dies
health.setOnDeath(() => {
    console.log('Game Over! Survival time:', gameTimer.getTotalTimeFormatted());
});

// Get current time during gameplay
console.log('Current time:', gameTimer.getTotalTimeFormatted());

// Check game status
const result = gameTimer.getGameResult();
if (result.isDestroyed) {
    console.log(`You survived for: ${result.survivalTimeFormatted}`);
}

// Clean up when done
gameTimer.destroy();
*/