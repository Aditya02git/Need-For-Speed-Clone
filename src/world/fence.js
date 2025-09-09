import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// GameBoundary.js - Fixed version that prevents car spinning and upward movement

export default class GameBoundary {
  constructor(scene, world, car, options = {}) {
    this.scene = scene;
    this.world = world;
    this.car = car;
    
    // Default boundary settings
    this.options = {
      // Boundary dimensions (from center)
      width: options.width || 1000,
      height: options.height || 1000,
      depth: options.depth || 1000,
      
      // Boundary position (center point)
      position: options.position || { x: 0, y: 0, z: 0 },
      
      // Visual settings
      showVisualBoundary: options.showVisualBoundary !== false,
      boundaryColor: options.boundaryColor || 0xff0000,
      boundaryOpacity: options.boundaryOpacity || 0.3,
      
      // Physics settings
      wallThickness: options.wallThickness || 10,
      wallHeight: options.wallHeight || 50,
      
      // Behavior settings - REDUCED force strength to prevent spinning
      forceStrength: options.forceStrength || 500, // Reduced from 2000
      damping: options.damping || 0.5, // Reduced damping
      enableWarning: options.enableWarning !== false,
      warningDistance: options.warningDistance || 100,
      
      // Reset settings
      enableAutoReset: options.enableAutoReset !== false,
      resetPosition: options.resetPosition || { x: 0, y: 5, z: 0 },
      resetDistance: options.resetDistance || 50
    };
    
    this.boundaryWalls = [];
    this.warningZones = [];
    this.visualBoundary = null;
    this.warningUI = null;
    this.isWarningActive = false;
    this.lastForceTime = 0; // Prevent rapid force application
    
    // Boundary limits (calculated from center and dimensions)
    this.limits = {
      minX: this.options.position.x - this.options.width / 2,
      maxX: this.options.position.x + this.options.width / 2,
      minZ: this.options.position.z - this.options.depth / 2,
      maxZ: this.options.position.z + this.options.depth / 2,
      minY: this.options.position.y - this.options.height / 2,
      maxY: this.options.position.y + this.options.height / 2
    };
  }

  init() {
    this.createPhysicsWalls();
    if (this.options.showVisualBoundary) {
      this.createVisualBoundary();
    }
    if (this.options.enableWarning) {
      this.createWarningSystem();
    }
    this.startBoundaryCheck();
    console.log("Game Boundary System initialized with limits:", this.limits);
  }

  createPhysicsWalls() {
    const { position, width, depth, wallThickness, wallHeight } = this.options;
    
    // Wall configurations: [x, y, z, rotationY, width, height, depth]
    const wallConfigs = [
      // North wall (positive Z)
      [position.x, position.y + wallHeight/2, position.z + depth/2 + wallThickness/2, 0, width + wallThickness, wallHeight, wallThickness],
      // South wall (negative Z)
      [position.x, position.y + wallHeight/2, position.z - depth/2 - wallThickness/2, 0, width + wallThickness, wallHeight, wallThickness],
      // East wall (positive X)
      [position.x + width/2 + wallThickness/2, position.y + wallHeight/2, position.z, Math.PI/2, depth, wallHeight, wallThickness],
      // West wall (negative X)
      [position.x - width/2 - wallThickness/2, position.y + wallHeight/2, position.z, Math.PI/2, depth, wallHeight, wallThickness]
    ];

    wallConfigs.forEach((config, index) => {
      const [x, y, z, rotY, w, h, d] = config;
      
      // Create physics body
      const wallShape = new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2));
      const wallBody = new CANNON.Body({ 
        mass: 0, // Static
        // FIXED: Better material properties to prevent bouncing and spinning
        material: new CANNON.Material({ 
          friction: 0.8,      // Increased friction
          restitution: 0.0,   // No bounce
          frictionEquationStiffness: 1e8,
          frictionEquationRelaxation: 3,
          contactEquationStiffness: 1e8,
          contactEquationRelaxation: 3
        })
      });
      wallBody.addShape(wallShape);
      wallBody.position.set(x, y, z);
      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotY);
      
      this.world.addBody(wallBody);
      this.boundaryWalls.push(wallBody);

      // Create visual representation (optional, usually invisible)
      if (this.options.showVisualBoundary) {
        const wallGeometry = new THREE.BoxGeometry(w, h, d);
        const wallMaterial = new THREE.MeshBasicMaterial({ 
          color: this.options.boundaryColor,
          transparent: true,
          opacity: 0.1,
          wireframe: true
        });
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.set(x, y, z);
        wallMesh.rotation.y = rotY;
        this.scene.add(wallMesh);
      }
    });
  }

  createVisualBoundary() {
    const { position, width, depth, boundaryColor, boundaryOpacity } = this.options;
    
    // Create a wireframe box to show the boundary
    const boundaryGeometry = new THREE.BoxGeometry(width, 20, depth);
    const boundaryMaterial = new THREE.MeshBasicMaterial({
      color: boundaryColor,
      transparent: true,
      opacity: boundaryOpacity,
      wireframe: true
    });
    
    this.visualBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    this.visualBoundary.position.set(position.x, position.y + 10, position.z);
    this.scene.add(this.visualBoundary);
  }

  createWarningSystem() {
    // Create warning UI element
    this.warningUI = document.createElement('div');
    this.warningUI.id = 'boundaryWarning';
    this.warningUI.style.position = 'fixed';
    this.warningUI.style.top = '50%';
    this.warningUI.style.left = '50%';
    this.warningUI.style.transform = 'translate(-50%, -50%)';
    this.warningUI.style.color = 'red';
    this.warningUI.style.fontSize = '36px';
    this.warningUI.style.fontWeight = 'bold';
    this.warningUI.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    this.warningUI.style.zIndex = '1000';
    this.warningUI.style.display = 'none';
    this.warningUI.style.pointerEvents = 'none';
    this.warningUI.innerHTML = '⚠️ BOUNDARY WARNING ⚠️<br>TURN BACK!';
    
    document.body.appendChild(this.warningUI);
  }

  startBoundaryCheck() {
    // Check boundary every frame
    this.boundaryCheckInterval = setInterval(() => {
      this.checkBoundary();
    }, 16); // ~60 FPS
  }

  checkBoundary() {
    if (!this.car || !this.getCarPosition()) return;
    
    const carPos = this.getCarPosition();
    const distanceToNearestBoundary = this.getDistanceToNearestBoundary(carPos);
    
    // Warning system
    if (this.options.enableWarning && distanceToNearestBoundary < this.options.warningDistance) {
      this.showWarning();
    } else {
      this.hideWarning();
    }
    
    // FIXED: Apply gentle correction force instead of strong impulse
    if (distanceToNearestBoundary < 30) {
      this.applyGentleBoundaryCorrection(carPos);
    }
    
    // Auto-reset if car goes too far beyond boundary
    if (this.options.enableAutoReset && distanceToNearestBoundary < -this.options.resetDistance) {
      this.resetCarPosition();
    }
  }

  getCarPosition() {
    // Try different car structure possibilities
    if (this.car.car && this.car.car.chassisBody) {
      return this.car.car.chassisBody.position;
    } else if (this.car.truck && this.car.truck.chassisBody) {
      return this.car.truck.chassisBody.position;
    } else if (this.car.chassisBody) {
      return this.car.chassisBody.position;
    } else if (this.car.position) {
      return this.car.position;
    }
    return null;
  }

  getDistanceToNearestBoundary(position) {
    const distanceToWalls = [
      this.limits.maxX - position.x, // Distance to east wall
      position.x - this.limits.minX, // Distance to west wall
      this.limits.maxZ - position.z, // Distance to north wall
      position.z - this.limits.minZ  // Distance to south wall
    ];
    
    return Math.min(...distanceToWalls);
  }

  // FIXED: New gentle correction method that prevents spinning and upward movement
  applyGentleBoundaryCorrection(carPos) {
    const carBody = this.getCarBody();
    if (!carBody) return;
    
    // Throttle force application to prevent rapid successive forces
    const currentTime = Date.now();
    if (currentTime - this.lastForceTime < 100) { // 100ms throttle
      return;
    }
    this.lastForceTime = currentTime;
    
    const { forceStrength, damping } = this.options;
    const centerX = this.options.position.x;
    const centerZ = this.options.position.z;
    
    // Calculate gentle correction force
    let correctionX = 0;
    let correctionZ = 0;
    
    // Check which boundary is being violated
    const margin = 25; // Safety margin
    
    if (carPos.x < this.limits.minX + margin) {
      correctionX = forceStrength * (this.limits.minX + margin - carPos.x) / margin;
    } else if (carPos.x > this.limits.maxX - margin) {
      correctionX = -forceStrength * (carPos.x - (this.limits.maxX - margin)) / margin;
    }
    
    if (carPos.z < this.limits.minZ + margin) {
      correctionZ = forceStrength * (this.limits.minZ + margin - carPos.z) / margin;
    } else if (carPos.z > this.limits.maxZ - margin) {
      correctionZ = -forceStrength * (carPos.z - (this.limits.maxZ - margin)) / margin;
    }
    
    // Apply ONLY horizontal forces to prevent upward movement
    if (correctionX !== 0 || correctionZ !== 0) {
      const correctionForce = new CANNON.Vec3(correctionX, 0, correctionZ); // Y = 0 prevents upward movement
      
      // Apply force at the center of mass to prevent spinning
      carBody.applyForce(correctionForce, carBody.position);
      
      // Apply selective damping to reduce bouncing without affecting normal driving
      if (Math.abs(correctionX) > 0) {
        carBody.velocity.x *= damping;
      }
      if (Math.abs(correctionZ) > 0) {
        carBody.velocity.z *= damping;
      }
      
      // Prevent upward velocity accumulation
      if (carBody.velocity.y > 2) {
        carBody.velocity.y = 2;
      }
      
      // Reduce angular velocity to prevent spinning
      carBody.angularVelocity.x *= 0.8;
      carBody.angularVelocity.z *= 0.8;
    }
  }

  // DEPRECATED: Old method that caused spinning - kept for reference
  applyBoundaryForce(carPos) {
    const forceVector = new CANNON.Vec3(0, 0, 0);
    const { forceStrength } = this.options;
    
    // Calculate force direction to push car back toward center
    const centerX = this.options.position.x;
    const centerZ = this.options.position.z;
    
    // Apply force toward center
    if (carPos.x < this.limits.minX + 30) {
      forceVector.x = forceStrength;
    } else if (carPos.x > this.limits.maxX - 30) {
      forceVector.x = -forceStrength;
    }
    
    if (carPos.z < this.limits.minZ + 30) {
      forceVector.z = forceStrength;
    } else if (carPos.z > this.limits.maxZ - 30) {
      forceVector.z = -forceStrength;
    }
    
    // Apply the force to the car
    const carBody = this.getCarBody();
    if (carBody && (forceVector.x !== 0 || forceVector.z !== 0)) {
      carBody.applyImpulse(forceVector, carBody.position);
      
      // Apply damping to prevent excessive bouncing
      carBody.velocity.x *= this.options.damping;
      carBody.velocity.z *= this.options.damping;
    }
  }

  getCarBody() {
    if (this.car.car && this.car.car.chassisBody) {
      return this.car.car.chassisBody;
    } else if (this.car.truck && this.car.truck.chassisBody) {
      return this.car.truck.chassisBody;
    } else if (this.car.chassisBody) {
      return this.car.chassisBody;
    }
    return null;
  }

  showWarning() {
    if (!this.isWarningActive && this.warningUI) {
      this.isWarningActive = true;
      this.warningUI.style.display = 'block';
      
      // Add pulsing animation
      this.warningUI.style.animation = 'pulse 0.5s infinite alternate';
      
      // Add CSS animation if not already present
      if (!document.getElementById('boundaryWarningStyle')) {
        const style = document.createElement('style');
        style.id = 'boundaryWarningStyle';
        style.textContent = `
          @keyframes pulse {
            0% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  hideWarning() {
    if (this.isWarningActive && this.warningUI) {
      this.isWarningActive = false;
      this.warningUI.style.display = 'none';
      this.warningUI.style.animation = '';
    }
  }

  resetCarPosition() {
    const carBody = this.getCarBody();
    if (carBody) {
      console.log("Resetting car position due to boundary violation");
      
      // FIXED: Smoother reset process
      // First, stop all movement
      carBody.velocity.set(0, 0, 0);
      carBody.angularVelocity.set(0, 0, 0);
      
      // Reset position
      carBody.position.set(
        this.options.resetPosition.x,
        this.options.resetPosition.y,
        this.options.resetPosition.z
      );
      
      // Reset rotation to upright
      carBody.quaternion.set(0, 0, 0, 1);
      
      // Clear any accumulated forces
      carBody.force.set(0, 0, 0);
      carBody.torque.set(0, 0, 0);
      
      // If car has a reset method, call it
      if (this.car.reset) {
        this.car.reset(this.options.resetPosition);
      }
    }
  }

  // Method to check if position is within boundary
  isPositionInBounds(position) {
    return position.x >= this.limits.minX && 
           position.x <= this.limits.maxX &&
           position.z >= this.limits.minZ && 
           position.z <= this.limits.maxZ;
  }

  // Method to get safe position (clamp to boundary)
  getSafePosition(position) {
    return {
      x: Math.max(this.limits.minX, Math.min(this.limits.maxX, position.x)),
      y: position.y,
      z: Math.max(this.limits.minZ, Math.min(this.limits.maxZ, position.z))
    };
  }

  // Update boundary dimensions
  updateBoundary(newOptions) {
    this.cleanup();
    this.options = { ...this.options, ...newOptions };
    
    // Recalculate limits
    this.limits = {
      minX: this.options.position.x - this.options.width / 2,
      maxX: this.options.position.x + this.options.width / 2,
      minZ: this.options.position.z - this.options.depth / 2,
      maxZ: this.options.position.z + this.options.depth / 2,
      minY: this.options.position.y - this.options.height / 2,
      maxY: this.options.position.y + this.options.height / 2
    };
    
    this.init();
  }

  // Cleanup method
  cleanup() {
    // Remove physics walls
    this.boundaryWalls.forEach(wall => {
      this.world.removeBody(wall);
    });
    this.boundaryWalls = [];
    
    // Remove visual boundary
    if (this.visualBoundary) {
      this.scene.remove(this.visualBoundary);
      this.visualBoundary = null;
    }
    
    // Remove warning UI
    if (this.warningUI && this.warningUI.parentNode) {
      this.warningUI.parentNode.removeChild(this.warningUI);
      this.warningUI = null;
    }
    
    // Clear interval
    if (this.boundaryCheckInterval) {
      clearInterval(this.boundaryCheckInterval);
      this.boundaryCheckInterval = null;
    }
    
    // Remove warning styles
    const warningStyle = document.getElementById('boundaryWarningStyle');
    if (warningStyle) {
      warningStyle.remove();
    }
  }

  // Get boundary status info
  getBoundaryStatus() {
    const carPos = this.getCarPosition();
    if (!carPos) return null;
    
    return {
      position: carPos,
      isInBounds: this.isPositionInBounds(carPos),
      distanceToNearestBoundary: this.getDistanceToNearestBoundary(carPos),
      isWarningActive: this.isWarningActive,
      limits: this.limits
    };
  }
}

// Usage example with recommended settings:
/*
const gameBoundary = new GameBoundary(scene, world, car, {
  width: 1500,
  depth: 800,
  height: 100,
  position: { x: 0, y: 0, z: 0 },
  
  // Visual settings
  showVisualBoundary: true,
  boundaryColor: 0xff0000,
  boundaryOpacity: 0.3,
  
  // Physics settings
  wallThickness: 20,
  wallHeight: 50,
  
  // Behavior settings - REDUCED values to prevent spinning
  forceStrength: 800,    // Reduced from 3000
  damping: 0.5,          // Reduced from 0.7
  enableWarning: true,
  warningDistance: 100,
  
  // Reset settings
  enableAutoReset: true,
  resetPosition: { x: 452, y: 5, z: 180 },
  resetDistance: 100
});
*/