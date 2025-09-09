import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Color } from 'three/src/math/Color.js';


export default class Car {
    followTarget = new THREE.Object3D()
    pivot
    constructor(scene, world, pivot) {
        this.scene = scene;
        this.world = world;
        

        this.car = {};
        this.chassis = {};
        this.wheels = [];
        this.chassisDimension = {
            x: 2.7,
            y: 1,
            z: 6.5
        };
        this.chassisModelPos = {
            x: 0,
            y: -0.9,
            z: 0
        };
        this.wheelScale = {
            frontWheel: 1.1,
            hindWheel: 1.1
        };
        this.mass = 500; // change the mass to get effect => less it will be a super car & more  it will be a bulldozer
        this.pivot = pivot;
        this.maxForce = 1500;
        
        // Brake light properties
        this.brakeLight = null;
        this.originalBrakeLightMaterial = null;
        this.isBraking = false;
        
        // Flip detection properties
        this.flipCheckInterval = 100; // Check every 100ms
        this.flipThreshold = Math.PI / 3; // 60 degrees - better for catching sideways flips
        this.timeUpsideDown = 0;
        this.flipResetDelay = 2000; // 2 seconds upside down before reset
        this.lastFlipCheck = 0;
        this.isFlipped = false;
        this.currentFlipType = 'upright';
    }

    // Add this new method to create wireframe visualization
createChassisWireframe() {
    // Create geometry matching your physics chassis dimensions
    const wireframeGeometry = new THREE.BoxGeometry(
        this.chassisDimension.x, 
        this.chassisDimension.y, 
        this.chassisDimension.z
    );
    
    // Create wireframe material
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,        // Red color
        wireframe: true,        // Enable wireframe mode
        transparent: true,      // Make it semi-transparent
        opacity: 0.8           // Set opacity
    });
    
    // Create the wireframe mesh
    this.chassisWireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    
    // Add to scene
    this.scene.add(this.chassisWireframe);
    
    console.log('Chassis wireframe created with dimensions:', this.chassisDimension);
}

// Alternative: Create wireframe with edges for cleaner look
createChassisWireframeEdges() {
    // Create geometry matching your physics chassis dimensions
    const boxGeometry = new THREE.BoxGeometry(
        this.chassisDimension.x, 
        this.chassisDimension.y, 
        this.chassisDimension.z
    );
    
    // Create edges geometry for cleaner wireframe
    const edges = new THREE.EdgesGeometry(boxGeometry);
    
    // Create line material
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,    // Green color
        linewidth: 2        // Line thickness (may not work on all systems)
    });
    
    // Create the wireframe using LineSegments
    this.chassisWireframe = new THREE.LineSegments(edges, lineMaterial);
    
    // Add to scene
    this.scene.add(this.chassisWireframe);
    
    console.log('Chassis wireframe edges created with dimensions:', this.chassisDimension);
}

    // NEW: Comprehensive flip detection - handles all orientations
    checkIfFlipped() {
        if (!this.car.chassisBody) return false;
        
        // Get the car's up vector (Y-axis in local space)
        const upVector = new CANNON.Vec3(0, 1, 0);
        this.car.chassisBody.quaternion.vmult(upVector, upVector);
        
        // Check if the up vector is pointing significantly away from up
        // upVector.y should be close to 1 for upright car
        // Less than 0.3 means car is more than ~72 degrees from upright
        return upVector.y < 0.3; // Catches upside down, sideways, and steep angles
    }
    
    // NEW: Enhanced rotation-based flip detection for all angles
    checkFlipByRotation() {
        if (!this.car.chassisBody) return false;
        
        // Convert quaternion to Euler angles
        const euler = new THREE.Euler();
        const quaternion = new THREE.Quaternion(
            this.car.chassisBody.quaternion.x,
            this.car.chassisBody.quaternion.y,
            this.car.chassisBody.quaternion.z,
            this.car.chassisBody.quaternion.w
        );
        euler.setFromQuaternion(quaternion);
        
        // Check rotation on all axes
        const rollAngle = Math.abs(euler.z);   // Side-to-side flip (90° sideways)
        const pitchAngle = Math.abs(euler.x);  // Front-to-back flip
        
        // Normalize angles to 0-π range for better detection
        const normalizedRoll = Math.min(rollAngle, Math.PI - rollAngle);
        const normalizedPitch = Math.min(pitchAngle, Math.PI - pitchAngle);
        
        // Consider flipped if rotated more than ~60 degrees on either axis
        const flipThreshold = Math.PI / 3; // 60 degrees
        
        return normalizedRoll > flipThreshold || normalizedPitch > flipThreshold;
    }
    
    // NEW: Most comprehensive method - checks actual ground contact
    checkFlipByGroundContact() {
        if (!this.car.chassisBody) return false;
        
        // Method 1: Check up vector orientation
        const upVector = new CANNON.Vec3(0, 1, 0);
        this.car.chassisBody.quaternion.vmult(upVector, upVector);
        const isUprightByVector = upVector.y > 0.3;
        
        // Method 2: Check if wheels are above chassis (car is upside down)
        if (this.car.wheelInfos && this.car.wheelInfos.length === 4) {
            let wheelsAboveChassis = 0;
            const chassisY = this.car.chassisBody.position.y;
            
            for (let i = 0; i < 4; i++) {
                if (this.car.wheelInfos[i] && this.car.wheelInfos[i].worldTransform) {
                    const wheelY = this.car.wheelInfos[i].worldTransform.position.y;
                    if (wheelY > chassisY + 0.5) { // Wheel is significantly above chassis
                        wheelsAboveChassis++;
                    }
                }
            }
            
            // If 3 or more wheels are above chassis, car is likely flipped
            const isUprightByWheels = wheelsAboveChassis < 3;
            
            // Car is flipped if either method indicates it
            return !isUprightByVector || !isUprightByWheels;
        }
        
        // Fallback to vector method if wheel data not available
        return !isUprightByVector;
    }
    
    // NEW: Detect specific flip types for better reset handling
    getFlipType() {
        if (!this.car.chassisBody) return 'none';
        
        const euler = new THREE.Euler();
        const quaternion = new THREE.Quaternion(
            this.car.chassisBody.quaternion.x,
            this.car.chassisBody.quaternion.y,
            this.car.chassisBody.quaternion.z,
            this.car.chassisBody.quaternion.w
        );
        euler.setFromQuaternion(quaternion);
        
        const rollAngle = euler.z;
        const pitchAngle = euler.x;
        const upVector = new CANNON.Vec3(0, 1, 0);
        this.car.chassisBody.quaternion.vmult(upVector, upVector);
        
        // Determine flip type
        if (upVector.y < -0.5) {
            return 'upside_down';
        } else if (Math.abs(rollAngle) > Math.PI / 3) {
            return rollAngle > 0 ? 'right_side' : 'left_side';
        } else if (Math.abs(pitchAngle) > Math.PI / 3) {
            return pitchAngle > 0 ? 'nose_down' : 'nose_up';
        } else if (upVector.y < 0.3) {
            return 'tilted';
        }
        
        return 'upright';
    }
    
    // NEW: Handle flip detection and reset
    handleFlipDetection(deltaTime) {
        const currentTime = performance.now();
        
        // Only check at intervals to avoid excessive calculations
        if (currentTime - this.lastFlipCheck < this.flipCheckInterval) {
            return;
        }
        
        this.lastFlipCheck = currentTime;
        
        // Use the most comprehensive detection method
        const isCurrentlyFlipped = this.checkFlipByGroundContact();
        const flipType = this.getFlipType();
        
        if (isCurrentlyFlipped) {
            if (!this.isFlipped) {
                // Just got flipped
                this.isFlipped = true;
                this.timeUpsideDown = 0;
                console.log(`Car flipped! Type: ${flipType}. Starting countdown...`);
            } else {
                // Still flipped, increment timer
                this.timeUpsideDown += this.flipCheckInterval;
                
                // Show progress every second
                if (this.timeUpsideDown % 1000 === 0) {
                    const remainingTime = (this.flipResetDelay - this.timeUpsideDown) / 1000;
                    console.log(`Auto-reset in ${remainingTime} seconds... (${flipType})`);
                }
                
                if (this.timeUpsideDown >= this.flipResetDelay) {
                    console.log(`Car has been ${flipType} for too long. Auto-resetting...`);
                    this.autoReset(flipType);
                }
            }
        } else {
            if (this.isFlipped) {
                // Car is no longer flipped
                this.isFlipped = false;
                this.timeUpsideDown = 0;
                console.log("Car recovered from flip.");
            }
        }
    }
    
    // NEW: Enhanced auto reset with flip-type specific handling
    autoReset(flipType = 'unknown') {
        // Get current position
        const currentPos = this.car.chassisBody.position;
        
        // Determine lift height based on flip type
        let liftHeight = 3;
        if (flipType === 'upside_down') {
            liftHeight = 4; // Need more height when fully upside down
        } else if (flipType === 'left_side' || flipType === 'right_side') {
            liftHeight = 3.5; // Moderate height for sideways flips
        }
        
        // Reset at current X,Z position but lift it up
        this.car.chassisBody.position.set(
            currentPos.x, 
            currentPos.y + liftHeight,
            currentPos.z
        );
        
        // Reset rotation to upright (preserve heading direction)
        // Get current Y rotation (heading) to preserve driving direction
        const currentQuaternion = this.car.chassisBody.quaternion;
        const euler = new THREE.Euler();
        const threeQuat = new THREE.Quaternion(
            currentQuaternion.x,
            currentQuaternion.y,
            currentQuaternion.z,
            currentQuaternion.w
        );
        euler.setFromQuaternion(threeQuat);
        
        // Keep only the Y rotation (heading), reset X and Z to upright
        const uprightEuler = new CANNON.Vec3(0, euler.y, 0);
        const q = new CANNON.Quaternion();
        q.setFromEuler(uprightEuler.x, uprightEuler.y, uprightEuler.z);
        this.car.chassisBody.quaternion.copy(q);
        
        // Reset velocities
        this.car.chassisBody.angularVelocity.set(0, 0, 0);
        this.car.chassisBody.velocity.set(0, 0, 0);
        
        // Reset flip tracking
        this.isFlipped = false;
        this.timeUpsideDown = 0;
        
        console.log(`Car auto-reset completed. Was: ${flipType}, now upright at:`, currentPos);
    }

    // NEW: Setup brake light functionality
    setupBrakeLight() {
        if (!this.chassis) {
            console.warn('Chassis not loaded yet, cannot setup brake light');
            return;
        }

        // Find Object_248 in the chassis model
this.chassis.traverse((child) => {
    if (child.name === 'Object_26') {
        this.brakeLight = child;
        
        // Store the original material for restoration
        if (child.material) {
            this.originalBrakeLightMaterial = child.material.clone();
        }
        
        console.log(`Brake light (${child.name}) found and setup complete`);
        return;
    }
});

        if (!this.brakeLight) {
            console.warn('Object_248 not found in chassis model');
        }
    }

    // NEW: Activate brake light (turn red)
    activateBrakeLight() {
        if (this.brakeLight && !this.isBraking) {
            this.isBraking = true;
            
            // Create red emissive material for brake light effect
            const emissiveColor = new Color(1, 0, 0).multiplyScalar(3);

const redMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: emissiveColor,
    emissiveIntensity: 1,
    // opacity: 0.1
});

            
            this.brakeLight.material = redMaterial;
            console.log('Brake light activated (red)');
        }
    }

    // NEW: Deactivate brake light (restore original)
    deactivateBrakeLight() {
        if (this.brakeLight && this.isBraking && this.originalBrakeLightMaterial) {
            this.isBraking = false;
            this.brakeLight.material = this.originalBrakeLightMaterial;
            console.log('Brake light deactivated (original color)');
        }
    }

    init() {
        this.loadModels();
        this.setChassis();
        this.setWheels();
        this.controls();
        this.update();
        this.createChassisWireframe();
    }

    loadModels() {
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();

        dracoLoader.setDecoderConfig({ type: 'js' });
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load("./car/Police_Ford.glb", gltf => {
            this.chassis = gltf.scene;
            
            this.chassis.traverse(function (object) {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.recieveShadow = true;
            
                }
            });
            this.chassis.scale.set(1.1, 1.1, 1.1);

            // Optional visual-only rotation (disabled because we're rotating the physics body)
            // this.chassis.position.z = 5;

            this.scene.add(this.chassis);
            
            // Setup brake light after chassis is loaded
            this.setupBrakeLight();
        });

        this.wheels = [];
        for (let i = 0; i < 4; i++) {
            gltfLoader.load("./car/Police_Ford_Wheel.glb", gltf => {
                const model = gltf.scene;
                this.wheels[i] = model;
                if (i === 1 || i === 3)
                    this.wheels[i].scale.set(-0.97 * this.wheelScale.frontWheel, 0.97 * this.wheelScale.frontWheel, -0.97 * this.wheelScale.frontWheel);
                else
                    this.wheels[i].scale.set(0.97 * this.wheelScale.frontWheel, 0.97 * this.wheelScale.frontWheel, 0.97 * this.wheelScale.frontWheel);
                this.scene.add(this.wheels[i]);
            });
        }
    }

    setChassis() {
        const chassisShape = new CANNON.Box(new CANNON.Vec3(this.chassisDimension.x * 0.5, this.chassisDimension.y * 0.5, this.chassisDimension.z * 0.5));
        // FIXED: Added friction and damping to chassis material
        const chassisBody = new CANNON.Body({ 
            mass: this.mass, 
            material: new CANNON.Material({ friction: 0.3 }) // Increased friction from 0
        });

        // FIXED: Added linear and angular damping to chassis body
        chassisBody.linearDamping = 0.1;  // Adds air resistance
        chassisBody.angularDamping = 0.1; // Reduces rotation drift
        
        chassisBody.addShape(chassisShape);

        // Initial rotation of chassis (physics!)
        const euler = new CANNON.Vec3(0, 0, 0); // Yaw 90 degrees
        const q = new CANNON.Quaternion();
        q.setFromEuler(euler.x, euler.y, euler.z);
        chassisBody.quaternion.copy(q);

        this.car = new CANNON.RaycastVehicle({
            chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 2
        });
        // In setChassis() method, add user data to identify the car
        chassisBody.userData = { type: 'car', car: this };
        this.car.addToWorld(this.world);
    }

    setWheels() {
        this.car.wheelInfos = [];
        const wheelPositions = [
            new CANNON.Vec3(1.45, 0.06, -2.05),
            new CANNON.Vec3(-1.45, 0.06, -2.05),
            new CANNON.Vec3(1.4, 0.06, 1.75),
            new CANNON.Vec3(-1.4, 0.06, 1.75)
        ];

        for (let i = 0; i < 4; i++) {
            this.car.addWheel({
                radius: 0.50,
                directionLocal: new CANNON.Vec3(0, -1, 0),
                suspensionStiffness: 55,
                suspensionRestLength: 0.5,
                frictionSlip: 30,
                dampingRelaxation: 2.3,
                dampingCompression: 4.3,
                maxSuspensionForce: 10000,
                rollInfluence: 0.01,
                axleLocal: new CANNON.Vec3(-1, 0, 0),
                chassisConnectionPointLocal: wheelPositions[i],
                maxSuspensionTravel: 1,
                customSlidingRotationalSpeed: 30,
            });
        }

        this.car.wheelInfos.forEach(function (wheel, index) {
            const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
            const wheelBody = new CANNON.Body({
                mass: 1,
                material: new CANNON.Material({ friction: 0.7 }), // FIXED: Increased wheel friction
            });

            // FIXED: Increased damping values for better stopping
            wheelBody.linearDamping = 0.4;  // Increased from 0.9
            wheelBody.angularDamping = 0.4; // Increased from 0.9
            
            const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
            // this.wheels[index].wheelBody = wheelBody;
        }.bind(this));
    }

// In your car.js file, update the controls() method:

controls() {
    const maxSteerVal = 0.5;
    // REMOVE this line: const maxForce = this.maxForce;
    // We'll use this.maxForce directly instead
    
    const brakeForce = 45;
    const slowDownCar = 25;
    const keysPressed = [];

    window.addEventListener('keydown', (e) => {
        if (!keysPressed.includes(e.key.toLowerCase())) keysPressed.push(e.key.toLowerCase());
        hindMovement();
    });
    window.addEventListener('keyup', (e) => {
        keysPressed.splice(keysPressed.indexOf(e.key.toLowerCase()), 1);
        hindMovement();
    });

    const hindMovement = () => {
        if (keysPressed.includes("r")) resetCar();

        if (keysPressed.includes("f")) {
            this.toggleWireframe();
            // Remove 'f' from pressed keys to prevent continuous toggling
            keysPressed.splice(keysPressed.indexOf("f"), 1);
        }

        if (!keysPressed.includes(" ")) {
            // Spacebar not pressed - deactivate brake light
            this.deactivateBrakeLight();
            
            this.car.setBrake(0, 0);
            this.car.setBrake(0, 1);
            this.car.setBrake(0, 2);
            this.car.setBrake(0, 3);

            if (keysPressed.includes("a") || keysPressed.includes("arrowleft")) {
                this.car.setSteeringValue(maxSteerVal * 1, 2);
                this.car.setSteeringValue(maxSteerVal * 1, 3);
            }
            else if (keysPressed.includes("d") || keysPressed.includes("arrowright")) {
                this.car.setSteeringValue(maxSteerVal * -1, 2);
                this.car.setSteeringValue(maxSteerVal * -1, 3);
            }
            else stopSteer();

            if (keysPressed.includes("w") || keysPressed.includes("arrowup")) {
                // CHANGED: Use this.maxForce instead of maxForce
                this.car.applyEngineForce(this.maxForce * -1, 0);
                this.car.applyEngineForce(this.maxForce * -1, 1);
                this.car.applyEngineForce(this.maxForce * -1, 2);
                this.car.applyEngineForce(this.maxForce * -1, 3);
            }
            else if (keysPressed.includes("s") || keysPressed.includes("arrowdown")) {

                this.activateBrakeLight();
                // CHANGED: Use this.maxForce instead of maxForce
                this.car.applyEngineForce(this.maxForce * 1, 0);
                this.car.applyEngineForce(this.maxForce * 1, 1);
                this.car.applyEngineForce(this.maxForce * 1, 2);
                this.car.applyEngineForce(this.maxForce * 1, 3);
            }
            else {
                this.car.applyEngineForce(0, 0);
                this.car.applyEngineForce(0, 1);
                this.car.applyEngineForce(0, 2);
                this.car.applyEngineForce(0, 3);
                stopCar();
            }
        }
        else {
            // Spacebar pressed - activate brake light and brake
            this.activateBrakeLight();
            brake();
        }
    };

    const resetCar = () => {
        this.car.chassisBody.position.set(0, 4, 0);

        const euler = new CANNON.Vec3(0, Math.PI / 2, 0);
        const q = new CANNON.Quaternion();
        q.setFromEuler(euler.x, euler.y, euler.z);
        this.car.chassisBody.quaternion.copy(q);

        this.car.chassisBody.angularVelocity.set(0, 0, 0);
        this.car.chassisBody.velocity.set(0, 0, 0);
        
        // OPTIONAL: Reset maxForce when car resets
        this.maxForce = 750; // Uncomment if you want to restore power on reset
    };

    const brake = () => {
        this.car.setBrake(brakeForce, 0);
        this.car.setBrake(brakeForce, 1);
        this.car.setBrake(brakeForce, 2);
        this.car.setBrake(brakeForce, 3);
    };

    const stopCar = () => {
        this.car.setBrake(slowDownCar, 0);
        this.car.setBrake(slowDownCar, 1);
        this.car.setBrake(slowDownCar, 2);
        this.car.setBrake(slowDownCar, 3);
    };

    const stopSteer = () => {
        this.car.setSteeringValue(0, 2);
        this.car.setSteeringValue(0, 3);
    };
}

    reset(position = this.startPosition) {
        this.car.chassisBody.position.set(position.x, position.y, position.z);
        this.car.chassisBody.angularVelocity.set(0, 0, 0);
        this.car.chassisBody.velocity.set(0, 0, 0);
        this.currentSteer = 0;
        this.currentThrottle = 0;
        this.targetSteer = 0;
        
        // Reset collision recovery stat
    }

    update() {
        const updateWorld = () => {
            // NEW: Add flip detection to the update loop
            this.handleFlipDetection();
            
            if (this.car.wheelInfos && this.chassis.position && this.wheels[0]?.position) {
                this.chassis.position.set(
                    this.car.chassisBody.position.x + this.chassisModelPos.x,
                    this.car.chassisBody.position.y + this.chassisModelPos.y,
                    this.car.chassisBody.position.z + this.chassisModelPos.z
                );
                this.chassis.quaternion.copy(this.car.chassisBody.quaternion);

                if (this.chassisWireframe) {
                    // Position wireframe exactly where physics chassis is
                    this.chassisWireframe.position.copy(this.car.chassisBody.position);
                    this.chassisWireframe.quaternion.copy(this.car.chassisBody.quaternion);
                }
                for (let i = 0; i < 4; i++) {
                    if (this.car.wheelInfos[i]) {
                        this.car.updateWheelTransform(i);
                        this.wheels[i].position.copy(this.car.wheelInfos[i].worldTransform.position);
                        this.wheels[i].quaternion.copy(this.car.wheelInfos[i].worldTransform.quaternion);
                    }
                }
            }
        };
        this.world.addEventListener('postStep', updateWorld);
    }

    // Add method to toggle wireframe visibility
toggleWireframe(visible = null) {
    if (this.chassisWireframe) {
        if (visible !== null) {
            this.chassisWireframe.visible = visible;
        } else {
            this.chassisWireframe.visible = !this.chassisWireframe.visible;
        }
        console.log('Chassis wireframe visibility:', this.chassisWireframe.visible);
    }
}

// Add method to remove wireframe (useful for cleanup)
removeWireframe() {
    if (this.chassisWireframe) {
        this.scene.remove(this.chassisWireframe);
        this.chassisWireframe.geometry.dispose();
        this.chassisWireframe.material.dispose();
        this.chassisWireframe = null;
        console.log('Chassis wireframe removed');
    }
}

    // NEW: Manual flip reset method (can be called externally)
    forceFlipReset() {
        console.log("Manual flip reset triggered");
        this.autoReset();
    }
    
    // NEW: Get flip status (useful for UI indicators)
    getFlipStatus() {
        return {
            isFlipped: this.isFlipped,
            timeUpsideDown: this.timeUpsideDown,
            resetProgress: this.timeUpsideDown / this.flipResetDelay
        };
    }
}