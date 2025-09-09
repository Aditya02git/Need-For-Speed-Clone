// map.js - Map Selection System

export class MapSelection {
    constructor() {
        this.mapContainer = null;
        this.selectedMap = 'default';
        this.maps = {
            default: {
                name: 'Default City',
                description: 'A balanced urban environment with buildings, bridges, and obstacles',
                preview: '🏙️',
                difficulty: 'Medium'
            },
            desert: {
                name: 'Desert Highway',
                description: 'Wide open spaces with sand dunes and sparse obstacles',
                preview: '🏜️',
                difficulty: 'Easy'
            },
            mountain: {
                name: 'Mountain Pass',
                description: 'Narrow winding roads with steep cliffs and challenging terrain',
                preview: '🏔️',
                difficulty: 'Hard'
            },
            industrial: {
                name: 'Industrial Zone',
                description: 'Factory complexes with tight spaces and heavy machinery',
                preview: '🏭',
                difficulty: 'Hard'
            }
        };
        this.init();
    }

    init() {
        this.createMapSelectionHTML();
        this.setupEventListeners();
        this.showMapSelection();
    }

    createMapSelectionHTML() {
        this.mapContainer = document.createElement('div');
        this.mapContainer.id = 'map-selection';
        
        const mapButtons = Object.keys(this.maps).map(mapKey => {
            const map = this.maps[mapKey];
            const isDefault = mapKey === 'default';
            return `
                <div class="map-card ${isDefault ? 'available' : 'locked'}" data-map="${mapKey}">
                    <div class="map-preview">
                        <div class="map-icon">${map.preview}</div>
                        ${!isDefault ? '<div class="lock-overlay">🔒</div>' : ''}
                    </div>
                    <div class="map-info">
                        <h3 class="map-name">${map.name}</h3>
                        <p class="map-description">${map.description}</p>
                        <div class="map-difficulty">
                            <span class="difficulty-label">Difficulty:</span>
                            <span class="difficulty-value ${map.difficulty.toLowerCase()}">${map.difficulty}</span>
                        </div>
                        ${!isDefault ? '<div class="coming-soon">Coming Soon</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.mapContainer.innerHTML = `
            <div class="map-selection-overlay">
                <div class="map-selection-content">
                    <div class="map-header">
                        <h1>SELECT MAP</h1>
                        <p>Choose your battleground</p>
                    </div>
                    
                    <div class="maps-grid">
                        ${mapButtons}
                    </div>
                    
                    <div class="map-actions">
                        <button class="action-btn start-btn" id="start-game-btn">
                            <span class="btn-icon">🚗</span>
                            <span class="btn-text">START GAME</span>
                        </button>
                        <button class="action-btn back-btn" id="back-to-menu-btn">
                            <span class="btn-icon">←</span>
                            <span class="btn-text">BACK TO MENU</span>
                        </button>
                    </div>
                </div>
                
                <!-- Background animation -->
                <div class="map-bg-animation">
                    <div class="floating-element"></div>
                    <div class="floating-element"></div>
                    <div class="floating-element"></div>
                </div>
            </div>
        `;

        this.addMapSelectionStyles();
        document.body.appendChild(this.mapContainer);
    }

    addMapSelectionStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #map-selection {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 1000;
                font-family: 'Arial', sans-serif;
            }

            .map-selection-overlay {
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                overflow: hidden;
                padding: 20px;
                box-sizing: border-box;
            }

            .map-selection-content {
                text-align: center;
                z-index: 10;
                max-width: 1200px;
                width: 100%;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 20px;
                border: 2px solid #00ffff;
                box-shadow: 0 0 50px rgba(0, 255, 255, 0.3);
                backdrop-filter: blur(15px);
                padding: 40px;
            }

            .map-header h1 {
                font-size: 3rem;
                color: #00ffff;
                margin: 0 0 10px 0;
                text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
                font-weight: bold;
                letter-spacing: 2px;
            }

            .map-header p {
                font-size: 1.2rem;
                color: #ffffff;
                margin-bottom: 40px;
                opacity: 0.8;
            }

            .maps-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }

            .map-card {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid transparent;
                border-radius: 15px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .map-card.available {
                border-color: #00ff00;
            }

            .map-card.locked {
                border-color: #666;
                opacity: 0.6;
                cursor: not-allowed;
            }

            .map-card.available:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
                background: rgba(0, 255, 0, 0.1);
            }

            .map-card.selected {
                border-color: #ffff00;
                background: rgba(255, 255, 0, 0.1);
                box-shadow: 0 0 30px rgba(255, 255, 0, 0.4);
            }

            .map-preview {
                position: relative;
                margin-bottom: 15px;
            }

            .map-icon {
                font-size: 4rem;
                margin-bottom: 10px;
            }

            .lock-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 2rem;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 50%;
                width: 60px;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .map-info {
                text-align: left;
            }

            .map-name {
                color: #ffffff;
                font-size: 1.5rem;
                margin: 0 0 10px 0;
                font-weight: bold;
            }

            .map-description {
                color: #cccccc;
                font-size: 0.9rem;
                margin: 0 0 15px 0;
                line-height: 1.4;
            }

            .map-difficulty {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .difficulty-label {
                color: #ffffff;
                font-weight: bold;
            }

            .difficulty-value {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: bold;
            }

            .difficulty-value.easy {
                background: #00ff00;
                color: #000;
            }

            .difficulty-value.medium {
                background: #ffaa00;
                color: #000;
            }

            .difficulty-value.hard {
                background: #ff0000;
                color: #fff;
            }

            .coming-soon {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #ff6600;
                color: #fff;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: bold;
            }

            .map-actions {
                display: flex;
                justify-content: center;
                gap: 20px;
                flex-wrap: wrap;
            }

            .action-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 15px 30px;
                font-size: 1.2rem;
                font-weight: bold;
                border: 2px solid transparent;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .start-btn {
                background: linear-gradient(45deg, #00ff00, #00cc00);
                color: #000;
                border-color: #00ff00;
            }

            .start-btn:hover {
                background: linear-gradient(45deg, #00cc00, #00ff00);
                box-shadow: 0 0 30px rgba(0, 255, 0, 0.6);
                transform: translateY(-2px);
            }

            .back-btn {
                background: linear-gradient(45deg, #666, #444);
                color: #fff;
                border-color: #666;
            }

            .back-btn:hover {
                background: linear-gradient(45deg, #444, #666);
                box-shadow: 0 0 30px rgba(102, 102, 102, 0.6);
                transform: translateY(-2px);
            }

            .map-bg-animation {
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
                pointer-events: none;
            }

            .floating-element {
                position: absolute;
                width: 20px;
                height: 20px;
                background: rgba(0, 255, 255, 0.2);
                border-radius: 50%;
                animation: float 8s ease-in-out infinite;
            }

            .floating-element:nth-child(1) {
                top: 10%;
                left: 10%;
                animation-delay: 0s;
            }

            .floating-element:nth-child(2) {
                top: 70%;
                right: 20%;
                animation-delay: -2s;
            }

            .floating-element:nth-child(3) {
                bottom: 20%;
                left: 60%;
                animation-delay: -4s;
            }

            @keyframes float {
                0%, 100% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 0.3;
                }
                50% {
                    transform: translateY(-20px) rotate(180deg);
                    opacity: 0.8;
                }
            }

            @media (max-width: 768px) {
                .map-selection-content {
                    padding: 20px;
                }
                
                .map-header h1 {
                    font-size: 2rem;
                }
                
                .maps-grid {
                    grid-template-columns: 1fr;
                }
                
                .map-actions {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        const mapCards = document.querySelectorAll('.map-card.available');
        const startButton = document.getElementById('start-game-btn');
        const backButton = document.getElementById('back-to-menu-btn');

        // Map selection
        mapCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
                
                // Select current map
                card.classList.add('selected');
                this.selectedMap = card.dataset.map;
                
                this.playSelectSound();
            });
        });

        // Select default map initially
        const defaultCard = document.querySelector('.map-card[data-map="default"]');
        if (defaultCard) {
            defaultCard.classList.add('selected');
        }

        startButton.addEventListener('click', () => this.startSelectedMap());
        backButton.addEventListener('click', () => this.backToMenu());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.startSelectedMap();
            } else if (e.key === 'Escape') {
                this.backToMenu();
            }
        });
    }

    startSelectedMap() {
        this.playButtonSound();
        
        // Show loading screen briefly
        this.showLoadingScreen();
        
        setTimeout(() => {
            this.hideMapSelection();
            this.initializeGame();
        }, 1500);
    }

    showLoadingScreen() {
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                color: #00ffff;
                font-family: Arial, sans-serif;
            ">
                <div style="font-size: 3rem; margin-bottom: 20px;">🏁</div>
                <h2 style="margin: 0 0 20px 0; font-size: 2rem;">Loading ${this.maps[this.selectedMap].name}...</h2>
                <div style="width: 300px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #00ff00, #ffff00); animation: loading 1.5s ease-in-out;"></div>
                </div>
                <style>
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(0); }
                    }
                </style>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        
        setTimeout(() => {
            loadingDiv.remove();
        }, 1500);
    }

    initializeGame() {
        // Show the game canvas
        const canvas = document.querySelector('canvas.webgl');
        if (canvas) {
            canvas.style.display = 'block';
        }
        
        // Initialize your main game here
        // You can pass the selected map to your game initialization
        console.log(`Starting game with map: ${this.selectedMap}`);
        
        // If you have a global game initialization function, call it here
        if (window.initializeGameWithMap) {
            window.initializeGameWithMap(this.selectedMap);
        }
    }

    backToMenu() {
        this.playButtonSound();
        this.hideMapSelection();
        
        // Show main menu again
        const mainMenu = new MainMenu();
    }

    playSelectSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    playButtonSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    showMapSelection() {
        this.mapContainer.style.display = 'block';
    }

    hideMapSelection() {
        if (this.mapContainer) {
            this.mapContainer.style.display = 'none';
        }
    }

    destroy() {
        if (this.mapContainer) {
            this.mapContainer.remove();
        }
    }
}

// Export for use in other files
window.MapSelection = MapSelection;