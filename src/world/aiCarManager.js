import * as THREE from 'three';
import AIRacingCar from './aiSpoartsCar';

// AI Car Manager to handle multiple AI cars
export class AICarManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.aiCars = [];
        this.setupCollisionDetection();
    }
    
setupCollisionDetection() {
    this.world.addEventListener('beginContact', (event) => {
        const { bodyA, bodyB } = event;
        
        // Check if collision involves AI cars
        if (bodyA.userData && bodyB.userData) {
            const carA = bodyA.userData.type === 'aicar' ? bodyA.userData.car : null;
            const carB = bodyB.userData.type === 'aicar' ? bodyB.userData.car : null;
            
            // Only handle collisions between AI cars and other AI cars or actual obstacles
            // Ignore collisions with lapBox (checkpoints)
            if (carA && bodyB.userData.type !== 'lapBox') {
                console.log(`AI Car ${carA.carId} collided with ${bodyB.userData.type || 'obstacle'}`);
                this.handleCollision(carA);
            }
            
            if (carB && carB !== carA && bodyA.userData.type !== 'lapBox') {
                console.log(`AI Car ${carB.carId} collided with ${bodyA.userData.type || 'obstacle'}`);
                this.handleCollision(carB);
            }
        }
    });
}
    
    handleCollision(car) {
        // Start reverse maneuver on collision
        if (!car.isReversing) {
            console.log(`Starting reverse maneuver for AI Car ${car.carId} due to collision`);
            car.startReverseManeuver();
        }
    }
    
    createAICar(path, startPoint, endPoint) {
        const carId = this.aiCars.length;
        const aiCar = new AIRacingCar(this.scene, this.world, path, startPoint, endPoint, carId);
        this.aiCars.push(aiCar);
        return aiCar;
    }
    
    // Convenience method to create a simple straight path
    createStraightPath(start, end, segments = 8) {
        const path = [];
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            path.push(point);
        }
        return path;
    }
    
    // Convenience method to create a curved path
    createCurvedPath(start, end, controlPoints, segments = 15) {
        const path = [];
        const curve = new THREE.CatmullRomCurve3([start, ...controlPoints, end]);
        
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const point = curve.getPoint(t);
            path.push(point);
        }
        return path;
    }
    
    // Method to visualize paths for debugging
    visualizePath(path, color = 0xff0000) {
        if (!path || path.length === 0) return;
        
        const geometry = new THREE.BufferGeometry().setFromPoints(path);
        const material = new THREE.LineBasicMaterial({ color: color });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        return line;
    }
    
    resetAllCars() {
        this.aiCars.forEach(car => car.reset());
    }
    
cleanup() {
    console.log(`Cleaning up ${this.aiCars.length} AI cars`);
    
    // Clean up each AI car
    this.aiCars.forEach((car, index) => {
        if (car && typeof car.cleanup === 'function') {
            car.cleanup();
        }
    });
    
    // Clear the array
    this.aiCars = [];
    
    // Remove any collision event listeners if needed
    // Note: The collision detection setup in constructor adds listeners to the world
    // If you need to remove those listeners, you'd need to store references to them
    
    console.log('AI Car Manager cleanup complete');
}

// Add method to remove specific car from manager
removeAICar(carId) {
    const carIndex = this.aiCars.findIndex(car => car.carId === carId);
    if (carIndex !== -1) {
        const car = this.aiCars[carIndex];
        if (car && typeof car.cleanup === 'function') {
            car.cleanup();
        }
        this.aiCars.splice(carIndex, 1);
        console.log(`Removed AI Car ${carId} from manager`);
    }
}

// Add method to clean up specific car by reference
removeAICarByReference(carToRemove) {
    const carIndex = this.aiCars.indexOf(carToRemove);
    if (carIndex !== -1) {
        const car = this.aiCars[carIndex];
        if (car && typeof car.cleanup === 'function') {
            car.cleanup();
        }
        this.aiCars.splice(carIndex, 1);
        console.log(`Removed AI Car ${car.carId} from manager`);
    }
}
}

// Export both named and default exports for compatibility

