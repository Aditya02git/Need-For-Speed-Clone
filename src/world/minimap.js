export default class Minimap {
    constructor(options = {}) {
        this.mapWidth = options.mapWidth || 1600;
        this.mapHeight = options.mapHeight || 800;
        this.minimapWidth = options.minimapWidth || 200;
        this.minimapHeight = options.minimapHeight || 100;
        this.scale = this.minimapWidth / this.mapWidth;
        
        // Container element
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        
        // Tracked objects
        this.cars = new Map();
        this.aiCars = new Map();
        
        // Styling options
        this.backgroundColor = options.backgroundColor || 'transparent'; // Transparent by default
        this.borderColor = options.borderColor || '#333';
        this.carColor = options.carColor || '#00ff00';
        this.aiCarColor = options.aiCarColor || '#ff0000';
        this.carSize = options.carSize || 3;
        
        // Background image
        this.backgroundImage = null;
        this.useBackgroundImage = false;
        
        this.init();
    }
    
    // NEW METHOD: Load background image
    loadBackgroundImage(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.backgroundImage = img;
                this.useBackgroundImage = true;
                console.log('Minimap background image loaded successfully');
                resolve(img);
            };
            
            img.onerror = (error) => {
                console.error('Failed to load minimap background image:', error);
                this.useBackgroundImage = false;
                reject(error);
            };
            
            img.src = imagePath;
        });
    }
    
    // NEW METHOD: Remove background image
    removeBackgroundImage() {
        this.backgroundImage = null;
        this.useBackgroundImage = false;
    }
    
    init() {
        this.createMinimapElement();
        this.setupCanvas();
    }
    
    createMinimapElement() {
        // Create container
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.bottom = '80px';
        this.container.style.left = '20px';
        this.container.style.width = `${this.minimapWidth}px`;
        this.container.style.height = `${this.minimapHeight}px`;
        this.container.style.backgroundColor = 'transparent'; // Transparent container
        // this.container.style.border = `2px solid ${this.borderColor}`;
        this.container.style.borderRadius = '50%'; // make it a circle
        this.container.style.overflow = 'hidden'; // clip canvas to circle
        this.container.style.zIndex = '1000';
        // this.container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.minimapWidth;
        this.canvas.height = this.minimapHeight;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.backgroundColor = 'transparent'; // Make canvas background transparent
        
        this.container.appendChild(this.canvas);
        document.body.appendChild(this.container);
        
        this.ctx = this.canvas.getContext('2d');
    }

    setupCanvas() {
        this.ctx.imageSmoothingEnabled = false;
    }
    
    // Register a car for tracking
    registerCar(car, type = 'car') {
        const id = car.chassisBody?.id || Math.random().toString(36);
        
        if (type === 'aiCar') {
            this.aiCars.set(id, car);
        } else {
            this.cars.set(id, car);
        }
    }
    
    // Unregister a car
    unregisterCar(car, type = 'car') {
        const id = car.chassisBody?.id || car.id;
        
        if (type === 'aiCar') {
            this.aiCars.delete(id);
        } else {
            this.cars.delete(id);
        }
    }
    
    // Helper method to check if a userData type indicates an AI car
    isAiCarType(userDataType) {
        if (!userDataType || typeof userDataType !== 'string') {
            return false;
        }
        
        // Check for various AI car patterns
        return userDataType === 'aiCar' || 
               userDataType === 'aicar' || 
               userDataType.startsWith('aicar') || // Handles aicar1, aicar2, etc.
               userDataType.toLowerCase().includes('ai');
    }
    
    // Auto-discover cars from physics world (if using Cannon.js or similar)
    scanForCars(world) {
        if (!world || !world.bodies) {
            console.warn('Minimap: No world or bodies found');
            return;
        }
        
        this.cars.clear();
        this.aiCars.clear();
        
        let foundCars = 0;
        let foundAiCars = 0;
        
        world.bodies.forEach(body => {
            if (body.userData) {
                // console.log('Found body with userData:', body.userData.type, body.userData);
                
                if (body.userData.type === 'car') {
                    this.cars.set(body.id, body.userData.car);
                    foundCars++;
                } else if (this.isAiCarType(body.userData.type)) {
                    // Handle AI cars with various type patterns
                    this.aiCars.set(body.id, body.userData.car);
                    foundAiCars++;
                } else if (body.userData.belongsTo === 'aiCar') {
                    // Alternative check using belongsTo property
                    this.aiCars.set(body.id, body.userData.car);
                    foundAiCars++;
                }
            }
        });
        
        // console.log(`Minimap: Found ${foundCars} cars and ${foundAiCars} AI cars`);
    }
    
    // FIXED: Convert world coordinates to minimap coordinates - corrected mirror reflection
    worldToMinimap(worldX, worldZ) {
        // Map world coordinates to minimap coordinates
        // Center the coordinates and normalize to minimap size
        // FIXED: Swapped X and Z mapping to correct the mirror reflection
        const minimapX = ((worldX + this.mapWidth / 2) / this.mapWidth) * this.minimapWidth;
        const minimapY = ((worldZ + this.mapHeight / 2) / this.mapHeight) * this.minimapHeight;
        
        // Return raw coordinates (boundary checking done in drawing methods)
        return { x: minimapX, y: minimapY };
    }
    
    // Debug method to help identify coordinate issues
    // debugCarPositions() {
    //     console.log('=== Car Position Debug ===');
    //     console.log(`Map bounds: ${this.mapWidth} x ${this.mapHeight}`);
    //     console.log(`Minimap size: ${this.minimapWidth} x ${this.minimapHeight}`);
        
    //     this.cars.forEach((car, id) => {
    //         const chassisBody = this.getChassisBody(car);
    //         if (chassisBody && chassisBody.position) {
    //             const worldPos = { x: chassisBody.position.x, z: chassisBody.position.z };
    //             const minimapPos = this.worldToMinimap(worldPos.x, worldPos.z);
    //             console.log(`Car ${id}: World(${worldPos.x.toFixed(2)}, ${worldPos.z.toFixed(2)}) -> Minimap(${minimapPos.x.toFixed(2)}, ${minimapPos.y.toFixed(2)})`);
    //         }
    //     });
        
    //     this.aiCars.forEach((car, id) => {
    //         const chassisBody = this.getChassisBody(car);
    //         if (chassisBody && chassisBody.position) {
    //             const worldPos = { x: chassisBody.position.x, z: chassisBody.position.z };
    //             const minimapPos = this.worldToMinimap(worldPos.x, worldPos.z);
    //             console.log(`AI Car ${id}: World(${worldPos.x.toFixed(2)}, ${worldPos.z.toFixed(2)}) -> Minimap(${minimapPos.x.toFixed(2)}, ${minimapPos.y.toFixed(2)})`);
    //         }
    //     });
    // }
    
    // Draw a car dot on the minimap
    drawCar(x, y, color, size = this.carSize) {
        this.ctx.save(); // Save current state
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add a small border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore(); // Restore state
    }
    
    // Draw car with direction indicator
    drawCarWithDirection(x, y, angle, color, size = this.carSize) {
        this.ctx.save();
        
        // Draw car body
        this.drawCar(x, y, color, size);
        this.ctx.restore();
    }

    // Clear the minimap - Updated for background image only or transparent
    clear() {
        // ALWAYS clear the canvas completely first to prevent trails
        this.ctx.clearRect(0, 0, this.minimapWidth, this.minimapHeight);
        
        if (this.useBackgroundImage && this.backgroundImage) {
            // Draw ONLY the background image - no additional background color
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.minimapWidth, this.minimapHeight);
        } else if (this.backgroundColor !== 'transparent') {
            // Only draw background color if it's not transparent
            this.ctx.fillStyle = this.backgroundColor;
            this.ctx.fillRect(0, 0, this.minimapWidth, this.minimapHeight);
        }
        // If transparent and no image, canvas remains clear/transparent
    }
    
    // Helper method to get chassis body from car object (handles both car types)
    getChassisBody(car) {
        // Check multiple possible structures:
        if (car.chassisBody) {
            return car.chassisBody; // Direct chassisBody reference
        } else if (car.car && car.car.chassisBody) {
            return car.car.chassisBody; // RaycastVehicle structure
        }
        return null;
    }
    
    // Update and render the minimap
    update() {
        this.clear();
        
        // Debug info
        const totalCars = this.cars.size + this.aiCars.size;
        if (totalCars === 0) {
            // Draw "No cars found" text
            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('No cars found', 5, 15);
        }
        
        // Draw regular cars
        this.cars.forEach((car, id) => {
            const chassisBody = this.getChassisBody(car);
            
            if (chassisBody && chassisBody.position) {
                const pos = this.worldToMinimap(
                    chassisBody.position.x,
                    chassisBody.position.z
                );
                
                // Check if car is within reasonable bounds (allow some overflow for partially visible cars)
                if (pos.x >= -this.carSize && pos.x <= this.minimapWidth + this.carSize && 
                    pos.y >= -this.carSize && pos.y <= this.minimapHeight + this.carSize) {
                    
                    const angle = chassisBody.quaternion ? 
                        this.getYRotationFromQuaternion(chassisBody.quaternion) + Math.PI/2 : Math.PI/2;
                    
                    this.drawCarWithDirection(pos.x, pos.y, angle, this.carColor);
                } else {
                    console.log(`Car ${id} outside minimap bounds:`, pos);
                }
            } else {
                console.warn(`Car ${id} missing chassisBody or position`);
            }
        });
        
        // Draw AI cars
        this.aiCars.forEach((aiCar, id) => {            
            const chassisBody = this.getChassisBody(aiCar);
            
            if (chassisBody && chassisBody.position) {
                const pos = this.worldToMinimap(
                    chassisBody.position.x,
                    chassisBody.position.z
                );
                
                // Check if car is within reasonable bounds (allow some overflow for partially visible cars)
                if (pos.x >= -this.carSize && pos.x <= this.minimapWidth + this.carSize && 
                    pos.y >= -this.carSize && pos.y <= this.minimapHeight + this.carSize) {
                    
                    const angle = chassisBody.quaternion ? 
                        this.getYRotationFromQuaternion(chassisBody.quaternion) + Math.PI/2 : Math.PI/2;
                    
                    this.drawCarWithDirection(pos.x, pos.y, angle, this.aiCarColor);
                } else {
                    console.log(`AI car ${id} outside minimap bounds:`, pos);
                }
            } else {
                console.warn(`AI car ${id} missing chassisBody or position:`, aiCar);
                // Debug: Log the structure of the AI car (only if debugging is needed)
                if (aiCar) {
                    console.log('AI car structure keys:', Object.keys(aiCar));
                }
            }
        });
        
        // Draw car count in corner
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(`Cars: ${this.cars.size}`, 5, this.minimapHeight - 15);
        this.ctx.fillText(`AI: ${this.aiCars.size}`, 5, this.minimapHeight - 5);
    }
    
    // Extract Y rotation from quaternion for direction indicator
    getYRotationFromQuaternion(quaternion) {
        const { x, y, z, w } = quaternion;
        return Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z));
    }
    
    // Show/hide minimap
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }
    
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    
    // Set minimap position
    setPosition(top, right, bottom, left) {
        if (!this.container) return;
        
        this.container.style.top = top !== undefined ? `${top}px` : 'auto';
        this.container.style.right = right !== undefined ? `${right}px` : 'auto';
        this.container.style.bottom = bottom !== undefined ? `${bottom}px` : 'auto';
        this.container.style.left = left !== undefined ? `${left}px` : 'auto';
    }
    
    // Update colors - Updated for low opacity background
    setColors(carColor, aiCarColor, backgroundColor) {
        if (carColor) this.carColor = carColor;
        if (aiCarColor) this.aiCarColor = aiCarColor;
        if (backgroundColor) {
            this.backgroundColor = backgroundColor;
            this.container.style.backgroundColor = backgroundColor;
        }
    }
    
    // Cleanup
    cleanup() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.cars.clear();
        this.aiCars.clear();
        console.log("Minimap cleaned up successfully.");
    }
}