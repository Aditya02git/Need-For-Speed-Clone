import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export default class AIInactiveCar {
    constructor(scene, world, targetCar, startPosition = { x: 10, y: 4, z: 10 } , startRotation = { x: 0, y: 0, z: 0 }) {
        this.scene = scene;
        this.world = world;
        this.targetCar = targetCar; // Reference to the player's car
        this.startPosition = startPosition;
        this.startRotation = startRotation;
        
        this.car = {};
        this.chassis = {};
        this.wheels = [];
    this.chassisDimension = {
      x: 2.5,
      y: 1,
      z: 7,
    };
    this.chassisModelPos = {
      x: 0,
      y: -1.1,
      z: 0,
    };
        this.wheelScale = {
            frontWheel: 1.1,
            hindWheel: 1.1
        };
        this.mass = 450;

        this.brakeLight = null;
        this.originalBrakeLightMaterial = null;
        this.isBraking = false;
        this.initialBrakeLightState = true; // NEW: Track initial brake light state
        
        // AI activation state
        this.isActivated = false;
        this.activationTime = 0;
        this.activationDelay = 500; // 500ms delay after being hit
        this.hitDetected = false;
        this.activationMinForce = 50; // REDUCED from 200 - was too high
        
        // AI behavior parameters
        this.maxSpeed = 1200;
        this.maxSteerVal = 0.6;
        this.followDistance = 5;
        this.attackDistance = 15;
        this.updateInterval = 100;
        this.lastUpdate = 0;
        
        // AI state
        this.targetPosition = new THREE.Vector3();
        this.currentSteer = 0;
        this.currentThrottle = 0;
        this.isAttacking = false;
        
        // Enhanced steering smoothing parameters
        this.steerDeadZone = 0.08;
        this.steerSmoothFactor = 0.15;
        this.targetSteer = 0;
        this.straightThreshold = 0.02;
        this.alignmentBonus = 0.95;

        // Collision detection and recovery parameters
        this.isRecovering = false;
        this.recoveryStartTime = 0;
        this.recoveryDuration = 2000;
        this.stuckThreshold = 2;
        this.stuckCheckInterval = 500;
        this.lastStuckCheck = 0;
        this.stuckCounter = 0;
        this.maxStuckChecks = 3;
        this.lastPosition = new THREE.Vector3();
        this.positionHistory = [];
        this.maxHistoryLength = 5;
        this.collisionForce = 0;
        this.minCollisionForce = 500;
        
        // Recovery behavior parameters
        this.recoveryPhase = 'reverse';
        this.reverseTime = 1000;
        this.turnTime = 800;
        this.recoveryDirection = 1;

        // Flip detection parameters
        this.flipCheckInterval = 200;
        this.lastFlipCheck = 0;
        this.flipThreshold = 0.3;
        this.flipTimeThreshold = 1000;
        this.flipStartTime = 0;
        this.isFlipped = false;
        this.flipResetCooldown = 2000;
        this.lastFlipReset = 0;

        // Debug logging
        this.debugMode = true; // Enable for troubleshooting
        
        // Model loading state
        this.modelsLoaded = false;
        this.policeLightsSetup = false;
    }

    // NEW: Method to handle activation state change
    setActivated(activated) {
        const wasActivated = this.isActivated;
        this.isActivated = activated;
        
        // Handle brake light state based on activation
        if (activated && !wasActivated) {
            // Just got activated - turn off brake lights
            this.deactivateBrakeLight();
            console.log("AI Car activated - brake lights turned off");
        } else if (!activated && wasActivated) {
            // Just got deactivated - turn on brake lights
            this.activateBrakeLight();
            console.log("AI Car deactivated - brake lights turned on");
        }
    }

    // MODIFIED: Update method to handle brake light state
    update(deltaTime) {
        // ... your existing update logic here ...
        
        // Handle brake light state based on activation
        if (!this.isActivated) {
            // Car is inactive - brake lights should be on
            if (!this.isBraking) {
                this.activateBrakeLight();
            }
        } else {
            // Car is active - brake lights should follow normal braking logic
            // This is where you'd add your normal brake light logic based on actual braking
            // For now, we'll turn them off when activated
            if (this.isBraking && this.initialBrakeLightState) {
                this.deactivateBrakeLight();
                this.initialBrakeLightState = false;
            }
        }
        
        // Update brake light flare positions
        this.updateBrakeLightFlarePositions();
        
        // Update police lights
        this.updatePoliceLight();
        this.updatePoliceLightPositions();
    }

setupPoliceLight() {
        if (!this.chassis || !this.chassis.traverse) {
            console.warn("Chassis not loaded yet, cannot setup police lights");
            return;
        }

        if (this.policeLightsSetup) {
            console.log("Police lights already set up");
            return;
        }

        const flareTexture = new THREE.TextureLoader().load(
            "https://threejs.org/examples/textures/lensflare/lensflare0.png"
        );

        this.policeLights = [];
        this.policeLightFlares = [];
        this.policeAnimation = {
            isActive: false,
            startTime: 0,
            speed: 5.0, // Animation speed multiplier
            pattern: 'alternating', // 'alternating', 'together', 'strobe'
            flickerInterval: 10000, // 10 seconds in milliseconds
            lastFlickerTime: 0,
            isFlickering: false,
            flickerDuration: 5000 // Duration of each flicker in milliseconds
        };

        // Define police light positions - FIXED: Red on right, Blue on left (standard configuration)
        const lightPositions = [
            { x: -0.5, y: 1.8, z: -0.2, isRed: false }, // Left blue light
            { x: 0.5, y: 1.8, z: -0.2, isRed: true },   // Right red light
            { x: -0.3, y: 1.9, z: -0.1, isRed: false }, // Additional left blue
            { x: 0.3, y: 1.9, z: -0.1, isRed: true }    // Additional right red
        ];

        // Create police lights at specified positions
        lightPositions.forEach((pos, index) => {
            const isRed = pos.isRed;
            const color = isRed ? 0xff0000 : 0x0000ff;
            
            // Create multiple flares for each light position for better effect
            const flareArray = [];
            
            // Main flare
            const flareMaterial1 = new THREE.SpriteMaterial({
                map: flareTexture,
                color: color,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                alphaTest: 0.01,
            });

            // Secondary flare (larger)
            const flareMaterial2 = new THREE.SpriteMaterial({
                map: flareTexture,
                color: color,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                alphaTest: 0.01,
            });

            // Outer glow flare
            const flareMaterial3 = new THREE.SpriteMaterial({
                map: flareTexture,
                color: color,
                transparent: true,
                opacity: 0.3,
                depthWrite: false,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                alphaTest: 0.01,
            });

            // Create three flares per light position
            const flare1 = new THREE.Sprite(flareMaterial1);
            flare1.scale.set(0.8, 0.8, 1);
            flare1.visible = false;

            const flare2 = new THREE.Sprite(flareMaterial2);
            flare2.scale.set(1.2, 1.2, 1);
            flare2.visible = false;

            const flare3 = new THREE.Sprite(flareMaterial3);
            flare3.scale.set(2.0, 2.0, 1);
            flare3.visible = false;

            // Position all flares at the same location
            flare1.position.set(pos.x, pos.y, pos.z);
            flare2.position.set(pos.x, pos.y, pos.z);
            flare3.position.set(pos.x, pos.y, pos.z);

            // Add flares to chassis so they move with the car
            this.chassis.add(flare1);
            this.chassis.add(flare2);
            this.chassis.add(flare3);

            // Store flares for this light
            flareArray.push(flare1, flare2, flare3);
            this.policeLightFlares.push(flareArray);

            // Store light info
            this.policeLights.push({
                position: pos,
                isRed: isRed,
                flares: flareArray,
                intensity: 0
            });

            console.log(`Police light ${index} (${isRed ? 'RED' : 'BLUE'}) created at position:`, pos);
        });

        this.policeLightsSetup = true;
        console.log(`Police lights setup complete with ${this.policeLights.length} lights`);
    }

    activatePoliceLight() {
        if (this.policeLights && !this.policeAnimation.isActive) {
            this.policeAnimation.isActive = true;
            this.policeAnimation.startTime = Date.now();
            this.policeAnimation.lastFlickerTime = Date.now();
            console.log("Police lights activated");
        }
    }

    deactivatePoliceLight() {
        if (this.policeLights && this.policeAnimation.isActive) {
            this.policeAnimation.isActive = false;
            this.policeAnimation.isFlickering = false;
            
            // Hide all flares
            this.policeLightFlares.forEach((flareArray) => {
                flareArray.forEach((flare) => {
                    flare.visible = false;
                });
            });

            console.log("Police lights deactivated");
        }
    }

    // Update police light animation (call this in your main update loop)
    updatePoliceLight() {
        if (!this.policeAnimation.isActive || !this.policeLights) return;

        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.policeAnimation.startTime) / 1000; // Convert to seconds
        const animationTime = elapsedTime * this.policeAnimation.speed;

        // Check for 10-second flickering interval
        const timeSinceLastFlicker = currentTime - this.policeAnimation.lastFlickerTime;
        
        if (timeSinceLastFlicker >= this.policeAnimation.flickerInterval && !this.policeAnimation.isFlickering) {
            this.policeAnimation.isFlickering = true;
            this.policeAnimation.flickerStartTime = currentTime;
            console.log("Police lights flickering started");
        }

        // Handle flickering effect
        let flickerMultiplier = 1;
        if (this.policeAnimation.isFlickering) {
            const flickerElapsed = currentTime - this.policeAnimation.flickerStartTime;
            
            if (flickerElapsed < this.policeAnimation.flickerDuration) {
                // Create rapid flickering effect
                const flickerFreq = 20; // 20 flickers per second during flicker period
                flickerMultiplier = Math.sin(flickerElapsed * flickerFreq) > 0 ? 1 : 0.1;
            } else {
                // End flickering
                this.policeAnimation.isFlickering = false;
                this.policeAnimation.lastFlickerTime = currentTime;
                flickerMultiplier = 1;
                console.log("Police lights flickering ended");
            }
        }

        this.policeLights.forEach((light, index) => {
            let intensity = 0;

            switch (this.policeAnimation.pattern) {
                case 'alternating':
                    // Red and blue lights alternate
                    if (light.isRed) {
                        intensity = Math.max(0, Math.sin(animationTime));
                    } else {
                        intensity = Math.max(0, Math.sin(animationTime + Math.PI));
                    }
                    break;

                case 'together':
                    // All lights flash together
                    intensity = Math.max(0, Math.sin(animationTime * 2));
                    break;

                case 'strobe':
                    // Fast strobe effect
                    const strobeTime = animationTime * 3;
                    if (light.isRed) {
                        intensity = (Math.sin(strobeTime) > 0.5) ? 1 : 0;
                    } else {
                        intensity = (Math.sin(strobeTime + Math.PI) > 0.5) ? 1 : 0;
                    }
                    break;
            }

            // Apply flickering effect
            intensity *= flickerMultiplier;

            // Apply intensity to all flares
            light.flares.forEach((flare, flareIndex) => {
                const visible = intensity > 0.1;
                flare.visible = visible;
                
                if (visible) {
                    // Different opacity for each flare layer
                    const baseOpacity = [0.9, 0.6, 0.3][flareIndex] || 0.3;
                    flare.material.opacity = baseOpacity * intensity;
                    
                    // Slight scale animation for more dynamic effect
                    const scaleMultiplier = 1 + (intensity * 0.3);
                    const baseScale = [0.8, 1.2, 2.0][flareIndex] || 1.0;
                    flare.scale.set(
                        baseScale * scaleMultiplier,
                        baseScale * scaleMultiplier,
                        1
                    );
                }
            });

            light.intensity = intensity;
        });
    }

    // Update police light positions when car moves
    updatePoliceLightPositions() {
        if (!this.policeLights) return;

        this.policeLights.forEach((light, index) => {
            // Since flares are children of chassis, they automatically move with the car
            // But if you need to adjust positions dynamically, you can do it here
            
            // Example: Adjust position based on car state
            // const adjustedPos = light.position.clone();
            // adjustedPos.y += Math.sin(Date.now() * 0.005) * 0.05; // Slight bobbing
            
            // light.flares.forEach(flare => {
            //   flare.position.copy(adjustedPos);
            // });
        });
    }

    // Helper method to change animation pattern
    setPoliceAnimationPattern(pattern) {
        if (['alternating', 'together', 'strobe'].includes(pattern)) {
            this.policeAnimation.pattern = pattern;
            console.log(`Police light pattern changed to: ${pattern}`);
        }
    }

    // Helper method to adjust animation speed
    setPoliceAnimationSpeed(speed) {
        this.policeAnimation.speed = Math.max(0.1, speed);
        console.log(`Police light speed set to: ${speed}`);
    }

    // Helper method to set flicker interval (in seconds)
    setPoliceFlickerInterval(seconds) {
        this.policeAnimation.flickerInterval = seconds * 1000;
        console.log(`Police light flicker interval set to: ${seconds} seconds`);
    }

    // Helper method to manually trigger flickering
    triggerPoliceFlicker() {
        if (this.policeAnimation.isActive && !this.policeAnimation.isFlickering) {
            this.policeAnimation.isFlickering = true;
            this.policeAnimation.flickerStartTime = Date.now();
            console.log("Police lights flickering manually triggered");
        }
    }

    // Helper method to manually adjust a specific light position
    adjustPoliceLightPosition(lightIndex, offsetX, offsetY, offsetZ) {
        if (this.policeLights && this.policeLights[lightIndex]) {
            const light = this.policeLights[lightIndex];
            const newPos = {
                x: light.position.x + offsetX,
                y: light.position.y + offsetY,
                z: light.position.z + offsetZ
            };

            // Update stored position
            light.position = newPos;

            // Update all flares for this light
            light.flares.forEach(flare => {
                flare.position.set(newPos.x, newPos.y, newPos.z);
            });

            console.log(`Police light ${lightIndex} adjusted to position:`, newPos);
        }
    }

    // Helper method to add more police lights dynamically
    addPoliceLight(x, y, z, isRed = true) {
        if (!this.chassis) return;

        const flareTexture = new THREE.TextureLoader().load(
            "https://threejs.org/examples/textures/lensflare/lensflare0.png"
        );

        const color = isRed ? 0xff0000 : 0x0000ff;
        const flareArray = [];

        // Create three flares for the new light
        for (let i = 0; i < 3; i++) {
            const opacity = [0.9, 0.6, 0.3][i];
            const scale = [0.8, 1.2, 2.0][i];

            const flareMaterial = new THREE.SpriteMaterial({
                map: flareTexture,
                color: color,
                transparent: true,
                opacity: opacity,
                depthWrite: false,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                alphaTest: 0.01,
            });

            const flare = new THREE.Sprite(flareMaterial);
            flare.scale.set(scale, scale, 1);
            flare.position.set(x, y, z);
            flare.visible = false;

            this.chassis.add(flare);
            flareArray.push(flare);
        }

        // Add to arrays
        this.policeLightFlares.push(flareArray);
        this.policeLights.push({
            position: { x, y, z },
            isRed: isRed,
            flares: flareArray,
            intensity: 0
        });

        console.log(`New police light added at position: (${x}, ${y}, ${z}), Color: ${isRed ? 'RED' : 'BLUE'}`);
    }

    //--------------------BackLight-----------------------
    // MODIFIED: Setup brake light and activate it immediately for inactive state
    setupBrakeLight() {
        if (!this.chassis) {
            console.warn("Chassis not loaded yet, cannot setup brake light");
            return;
        }

        const flareTexture = new THREE.TextureLoader().load(
            "https://threejs.org/examples/textures/lensflare/lensflare0.png"
        );

        this.brakeLights = [];
        this.originalBrakeLightMaterials = new Map();
        this.brakeLightObjects = [];
        this.brakeLightFlares = [];

        this.chassis.traverse((child) => {
            if (child.name === "Object_243") {
                this.brakeLights.push(child);
                this.brakeLightObjects.push(child);

                if (child.material) {
                    this.originalBrakeLightMaterials.set(child, child.material.clone());
                }

                // Create TWO lens flare sprites with proper transparency settings
                const flareMaterial1 = new THREE.SpriteMaterial({
                    map: flareTexture,
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.8,
                    depthWrite: false,
                    depthTest: false,
                    blending: THREE.AdditiveBlending,
                    alphaTest: 0.01,
                });

                const flareMaterial2 = new THREE.SpriteMaterial({
                    map: flareTexture,
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.6, // Slightly different opacity for variation
                    depthWrite: false,
                    depthTest: false,
                    blending: THREE.AdditiveBlending,
                    alphaTest: 0.01,
                });

                // FIRST FLARE - Main flare
                const flare1 = new THREE.Sprite(flareMaterial1);
                flare1.scale.set(1, 1, 1);
                flare1.visible = false;

                // SECOND FLARE - Secondary flare (larger)
                const flare2 = new THREE.Sprite(flareMaterial2);
                flare2.scale.set(1, 1, 1); // Larger than first flare
                flare2.visible = false;

                // METHOD 1: Manual positioning with fixed offsets
                // Get the local position of the light object
                const localPos = child.position.clone();

                // Position FIRST FLARE - closer to the light
                const offset1 = new THREE.Vector3(0, 0, 0.3); // X, Y, Z offset
                flare1.position.copy(localPos).add(offset1);

                // Position SECOND FLARE - further back
                const offset2 = new THREE.Vector3(0, 0, 0.8); // Further back
                flare2.position.copy(localPos).add(offset2);

                // Add both flares to the chassis (moves with car)
                this.chassis.add(flare1);
                this.chassis.add(flare2);
                // Store both flares in an array for this light
                this.brakeLightFlares.push([flare1, flare2]);

                console.log(
                    `Brake light (${child.name}) setup with TWO lens flares at positions:`,
                    [flare1.position, flare2.position]
                );
                console.log(`Light object position:`, child.position);
            }
        });

        if (this.brakeLights.length === 0) {
            console.warn(
                "Brake lights (Object_243) not found in chassis model"
            );
        } else {
            // NEW: Activate brake lights immediately since car starts as inactive
            this.activateBrakeLight();
            console.log("Brake lights activated on startup (car is inactive)");
        }
    }

    // MODIFIED: Keep original logic but add state tracking
    activateBrakeLight() {
        if (this.brakeLights && !this.isBraking) {
            this.isBraking = true;

            const emissiveColor = new THREE.Color(1, 0, 0).multiplyScalar(0.5);
            const redMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: emissiveColor,
                emissiveIntensity: 10, // Increased for better visibility
            });

            this.brakeLights.forEach((mesh) => {
                mesh.material = redMaterial;
            });

            // Show both flares for each light
            this.brakeLightFlares.forEach((flareArray) => {
                flareArray.forEach((flare) => {
                    flare.visible = true;
                });
            });

            console.log("Brake lights activated (with lens flare)");
        }
    }

    // MODIFIED: Keep original logic but add state tracking
    deactivateBrakeLight() {
        if (this.brakeLights && this.isBraking) {
            this.isBraking = false;

            this.brakeLights.forEach((mesh) => {
                const original = this.originalBrakeLightMaterials.get(mesh);
                if (original) mesh.material = original;
            });

            // Hide both flares for each light
            this.brakeLightFlares.forEach((flareArray) => {
                flareArray.forEach((flare) => {
                    flare.visible = false;
                });
            });

            console.log("Brake lights deactivated (original state)");
        }
    }

    // IMPROVED: More precise flare position updating for TWO flares
    updateBrakeLightFlarePositions() {
        if (!this.brakeLights || !this.brakeLightFlares) return;

        this.brakeLights.forEach((light, index) => {
            if (this.brakeLightFlares[index]) {
                const [flare1, flare2] = this.brakeLightFlares[index];

                // METHOD 1: If flares are children of chassis, use local positioning
                if (flare1.parent === this.chassis) {
                    const localPos = light.position.clone();

                    // Update both flares with their respective offsets
                    const offset1 = new THREE.Vector3(0.9, 1.1, -3.2);
                    const offset2 = new THREE.Vector3(-0.9, 1.1, -3.2);

                    flare1.position.copy(localPos).add(offset1);
                    flare2.position.copy(localPos).add(offset2);
                }

                // METHOD 2: If flares are in scene, use world positioning
                else if (flare1.parent === this.scene) {
                    const worldPos = new THREE.Vector3();
                    light.getWorldPosition(worldPos);

                    // Get the car's forward direction for proper offset
                    const carForward = new THREE.Vector3(0, 0, 1);
                    this.chassis.getWorldDirection(carForward);

                    // Position flares behind the car (brake lights are at the back)
                    const offset1 = carForward.clone().multiplyScalar(-0.3);
                    const offset2 = carForward.clone().multiplyScalar(-0.8);

                    flare1.position.copy(worldPos).add(offset1);
                    flare2.position.copy(worldPos).add(offset2);
                }

                // METHOD 3: If flares are children of light object, no update needed
                // (they will automatically follow the light)
            }
        });
    }

    // BONUS: Helper method to manually adjust flare positions for TWO flares
    adjustBrakeFlarePosition(lightIndex, flareIndex, offsetX, offsetY, offsetZ) {
        if (this.brakeLightFlares && this.brakeLightFlares[lightIndex]) {
            const flareArray = this.brakeLightFlares[lightIndex];
            if (flareArray[flareIndex]) {
                const flare = flareArray[flareIndex];
                const light = this.brakeLights[lightIndex];

                if (flare.parent === this.chassis) {
                    // Adjust relative to chassis
                    const basePos = light.position.clone();
                    flare.position
                        .copy(basePos)
                        .add(new THREE.Vector3(offsetX, offsetY, offsetZ));
                } else {
                    // Adjust in world space
                    const worldPos = new THREE.Vector3();
                    light.getWorldPosition(worldPos);
                    flare.position
                        .copy(worldPos)
                        .add(new THREE.Vector3(offsetX, offsetY, offsetZ));
                }

                console.log(
                    `Brake Light ${lightIndex}, Flare ${flareIndex} adjusted to position:`,
                    flare.position
                );
            }
        }
    }

    // BONUS: Helper method to adjust both flares at once
    adjustBothBrakeFlares(lightIndex, offset1, offset2) {
        this.adjustBrakeFlarePosition(
            lightIndex,
            0,
            offset1.x,
            offset1.y,
            offset1.z
        );
        this.adjustBrakeFlarePosition(
            lightIndex,
            1,
            offset2.x,
            offset2.y,
            offset2.z
        );
    }

    init() {
        this.loadModels();
        this.setChassis();
        this.setWheels();
        this.setupCollisionDetection();
        this.setupActivationSystem();
        this.update();
    }

    loadModels() {
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();

        dracoLoader.setDecoderConfig({ type: 'js' });
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

        gltfLoader.setDRACOLoader(dracoLoader);

        // Load AI car with different color
        gltfLoader.load("./car/Police_Car.glb", gltf => {
            this.chassis = gltf.scene;
            
            this.chassis.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                }
            });
            this.chassis.scale.set(1, 1, 1);
            this.scene.add(this.chassis);
            
            // Mark models as loaded and setup police lights
            this.modelsLoaded = true;
            console.log("Chassis loaded, setting up police lights...");
            this.setupPoliceLight();
            this.setupBrakeLight();
        });

        // Load wheels
        this.wheels = [];
        for (let i = 0; i < 4; i++) {
            gltfLoader.load("./car/Police_Car_Wheel.glb", gltf => {
                const model = gltf.scene;
                this.wheels[i] = model;
                
                if (i === 1 || i === 3)
                    this.wheels[i].scale.set(-1.4 * this.wheelScale.frontWheel, 1.4 * this.wheelScale.frontWheel, -1.4 * this.wheelScale.frontWheel);
                else
                    this.wheels[i].scale.set(1.4 * this.wheelScale.frontWheel, 1.4 * this.wheelScale.frontWheel, 1.4 * this.wheelScale.frontWheel);
                this.scene.add(this.wheels[i]);
            });
        }
    }

    setChassis() {
        const chassisShape = new CANNON.Box(new CANNON.Vec3(this.chassisDimension.x * 0.5, this.chassisDimension.y * 0.5, this.chassisDimension.z * 0.5));
        const chassisBody = new CANNON.Body({ 
            mass: this.mass, 
            material: new CANNON.Material({ friction: 0.3 })
        });

        chassisBody.linearDamping = 0.1;
        chassisBody.angularDamping = 0.1;
        chassisBody.addShape(chassisShape);

        // Set initial position
        chassisBody.position.set(this.startPosition.x, this.startPosition.y, this.startPosition.z);
        chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.startRotation.y);

        this.car = new CANNON.RaycastVehicle({
      chassisBody,
      indexRightAxis: 0, // X-axis for right
      indexUpAxis: 1, // Y-axis for up (CRITICAL!)
      indexForwardAxis: 2, // Z-axis for forward
        });
        this.car.addToWorld(this.world);
    }

    setWheels() {
        this.car.wheelInfos = [];
        const wheelPositions = [
      new CANNON.Vec3(1, -0.5, -1.85), // Front right - LOWERED Y position
      new CANNON.Vec3(-1, -0.5, -1.85), // Front left - LOWERED Y position
      new CANNON.Vec3(1, -0.5, 2.05), // Rear right - LOWERED Y position
      new CANNON.Vec3(-1, -0.5, 2.05),
        ];

        for (let i = 0; i < 4; i++) {
            this.car.addWheel({
        radius: 0.45,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        suspensionStiffness: 55,
        suspensionRestLength: 0.5,
        frictionSlip: 35, // Slightly better grip for AI
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
                material: new CANNON.Material({ friction: 0.8 }),
            });

            wheelBody.linearDamping = 0.4;
            wheelBody.angularDamping = 0.4;
            
            const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
        }.bind(this));
    }

    setupActivationSystem() {
        // Check for activation periodically
        this.activationInterval = setInterval(() => {
            this.checkActivation();
        }, 50); // Check every 50ms
    }

    checkActivation() {
        const currentTime = Date.now();
        
        // Debug logging
        if (this.debugMode && this.hitDetected && !this.isActivated) {
            const timeRemaining = this.activationDelay - (currentTime - this.activationTime);
            if (timeRemaining > 0) {
                console.log(`AI activation in ${timeRemaining}ms...`);
            }
        }
        
        // If hit detected but not yet activated, check if enough time has passed
        if (this.hitDetected && !this.isActivated && 
            currentTime - this.activationTime > this.activationDelay) {
            this.activateAI();
        }
        
        // If activated, run normal AI
        if (this.isActivated && currentTime - this.lastUpdate > this.updateInterval) {
            this.lastUpdate = currentTime;
            this.makeAIDecision();
        }
    }

    activateAI() {
        console.log("🚗 AI Car activated! Starting pursuit...");
        this.isActivated = true;
        this.deactivateBrakeLight();
        
        // Only activate police lights if they're set up
        if (this.policeLightsSetup) {
            this.activatePoliceLight();
        } else {
            console.log("Police lights not yet set up, will activate when ready");
        }
    }

    setupCollisionDetection() {
        // FIXED: Use beginContact event instead of collide for better detection
        this.car.chassisBody.addEventListener('beginContact', (event) => {
            const other = event.body;
            
            // Get the contact to calculate collision force
            let impactForce = 0;
            if (event.contact) {
                const relativeVelocity = new CANNON.Vec3();
                this.car.chassisBody.velocity.vsub(other.velocity, relativeVelocity);
                impactForce = relativeVelocity.length() * 10; // Simplified force calculation
            } else {
                // Fallback force calculation
                const velocity = this.car.chassisBody.velocity.length();
                const otherVelocity = other.velocity ? other.velocity.length() : 0;
                impactForce = (velocity + otherVelocity) * 5;
            }
            
            this.collisionForce = impactForce;
            
            if (this.debugMode) {
                console.log(`🔥 Collision detected! Force: ${impactForce}`);
            }
            
            // Check if this is a collision with the player car for activation
            if (this.targetCar && this.targetCar.car && other === this.targetCar.car.chassisBody) {
                if (this.debugMode) {
                    console.log(`💥 Hit by player car! Force: ${impactForce}, Min required: ${this.activationMinForce}`);
                }
                
                if (!this.isActivated && !this.hitDetected && impactForce > this.activationMinForce) {
                    console.log(`🎯 AI Car hit by player! Activation force: ${impactForce}`);
                    this.hitDetected = true;
                    this.activationTime = Date.now();
                    
                    if (this.debugMode) {
                        console.log(`⏰ Activation timer started, will activate in ${this.activationDelay}ms`);
                    }
                }
                return; // Don't trigger recovery for player collisions
            }
            
            // Only handle obstacle collisions if AI is activated
            if (this.isActivated && impactForce > this.minCollisionForce && !this.isRecovering) {
                console.log(`🚧 AI Car collision detected with obstacle! Force: ${impactForce}`);
                this.startCollisionRecovery();
            }
        });

        // ADDITIONAL: Also listen for collide events as backup
        this.car.chassisBody.addEventListener('collide', (event) => {
            const contact = event.contact;
            const other = event.target === this.car.chassisBody ? event.body : event.target;
            
            // Only process if we haven't already detected a hit
            if (!this.hitDetected && this.targetCar && this.targetCar.car && other === this.targetCar.car.chassisBody) {
                // Simple collision detection without complex force calculation
                const velocity = this.car.chassisBody.velocity.length();
                const otherVelocity = other.velocity ? other.velocity.length() : 0;
                const totalVelocity = velocity + otherVelocity;
                
                if (this.debugMode) {
                    console.log(`🔄 Backup collision check - Total velocity: ${totalVelocity}`);
                }
                
                // Lower threshold for backup detection
                if (totalVelocity > 3 && !this.isActivated) {
                    console.log(`🔄 Backup activation triggered! Combined velocity: ${totalVelocity}`);
                    this.hitDetected = true;
                    this.activationTime = Date.now();
                }
            }
        });
    }

    checkFlipStatus() {
        // Only check flip status if AI is activated
        if (!this.isActivated) return;
        
        const currentTime = Date.now();
        
        // Don't check flip status too frequently or during cooldown
        if (currentTime - this.lastFlipCheck < this.flipCheckInterval || 
            currentTime - this.lastFlipReset < this.flipResetCooldown) {
            return;
        }
        
        this.lastFlipCheck = currentTime;
        
        if (!this.car.chassisBody) return;
        
        // Get the car's up vector by transforming the local up vector (0, 1, 0) by the car's quaternion
        const upVector = new THREE.Vector3(0, 1, 0);
        const chassisQuaternion = new THREE.Quaternion(
            this.car.chassisBody.quaternion.x,
            this.car.chassisBody.quaternion.y,
            this.car.chassisBody.quaternion.z,
            this.car.chassisBody.quaternion.w
        );
        upVector.applyQuaternion(chassisQuaternion);
        
        // Check if the car's up vector is pointing significantly downward
        const isCurrentlyFlipped = upVector.y < this.flipThreshold;
        
        if (isCurrentlyFlipped && !this.isFlipped) {
            // Car just flipped - start the timer
            this.isFlipped = true;
            this.flipStartTime = currentTime;
            console.log("AI Car flip detected, starting timer...");
        } else if (!isCurrentlyFlipped && this.isFlipped) {
            // Car righted itself - cancel flip detection
            this.isFlipped = false;
            this.flipStartTime = 0;
            console.log("AI Car righted itself");
        } else if (isCurrentlyFlipped && this.isFlipped) {
            // Car has been flipped for some time - check if we should reset
            const flipDuration = currentTime - this.flipStartTime;
            if (flipDuration > this.flipTimeThreshold) {
                console.log(`AI Car has been flipped for ${flipDuration}ms, auto-resetting...`);
                this.resetFromFlip();
            }
        }
    }

    resetFromFlip() {
        console.log("Auto-resetting AI car from flip");
        
        // Find a safe position slightly above the current position
        const currentPos = this.car.chassisBody.position;
        const resetPosition = {
            x: currentPos.x,
            y: currentPos.y + 3, // Lift the car up
            z: currentPos.z
        };
        
        // Reset the car
        this.reset(resetPosition);
        
        // Set the flip reset timestamp and clear flip state
        this.lastFlipReset = Date.now();
        this.isFlipped = false;
        this.flipStartTime = 0;
        
        // Also clear any recovery state since we're doing a full reset
        this.isRecovering = false;
        this.recoveryPhase = 'reverse';
        this.collisionForce = 0;
        this.stuckCounter = 0;
        this.positionHistory = [];
    }

    startCollisionRecovery() {
        if (this.isRecovering) return;
        
        console.log("Starting collision recovery sequence");
        this.isRecovering = true;
        this.recoveryStartTime = Date.now();
        this.recoveryPhase = 'reverse';
        
        // Randomize recovery direction to avoid repeated collisions
        this.recoveryDirection = Math.random() < 0.5 ? -1 : 1;
        
        // Reset stuck counter
        this.stuckCounter = 0;
    }

    checkIfStuck() {
        // Only check if stuck when AI is activated
        if (!this.isActivated) return;
        
        const currentTime = Date.now();
        
        if (currentTime - this.lastStuckCheck < this.stuckCheckInterval) {
            return;
        }
        
        this.lastStuckCheck = currentTime;
        
        const currentPos = this.car.chassisBody.position;
        const currentSpeed = this.car.chassisBody.velocity.length();
        
        // Check if we're close to the player car - if so, don't consider it "stuck"
        if (this.targetCar && this.targetCar.car && this.targetCar.car.chassisBody) {
            const targetPos = this.targetCar.car.chassisBody.position;
            const distanceToPlayer = Math.sqrt(
                Math.pow(targetPos.x - currentPos.x, 2) + 
                Math.pow(targetPos.z - currentPos.z, 2)
            );
            
            // If we're close to the player (within follow/attack distance), don't trigger stuck recovery
            if (distanceToPlayer < this.attackDistance) {
                this.stuckCounter = 0;
                return;
            }
        }
        
        // Add current position to history
        this.positionHistory.push({
            position: new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z),
            time: currentTime
        });
        
        // Keep history length manageable
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }
        
        // Check if car is moving too slowly
        if (currentSpeed < this.stuckThreshold && this.currentThrottle > 0) {
            this.stuckCounter++;
            
            // Also check if position hasn't changed much
            if (this.positionHistory.length >= 3) {
                const oldPos = this.positionHistory[0].position;
                const distance = currentPos.distanceTo(oldPos);
                
                if (distance < 2 && this.stuckCounter >= this.maxStuckChecks) {
                    console.log("AI Car appears to be stuck (not near player), starting recovery");
                    this.startCollisionRecovery();
                }
            }
        } else {
            this.stuckCounter = Math.max(0, this.stuckCounter - 1);
        }
    }

    executeRecoveryBehavior() {
        const currentTime = Date.now();
        const recoveryElapsed = currentTime - this.recoveryStartTime;
        
        switch (this.recoveryPhase) {
            case 'reverse':
                // Reverse while turning slightly
                this.currentThrottle = -this.maxSpeed * 0.6; // Reverse at 60% speed
                this.currentSteer = this.recoveryDirection * this.maxSteerVal * 0.3;
                
                if (recoveryElapsed > this.reverseTime) {
                    this.recoveryPhase = 'turn';
                    this.recoveryStartTime = currentTime;
                }
                break;
                
            case 'turn':
                // Turn sharply while stopped
                this.currentThrottle = 0;
                this.currentSteer = this.recoveryDirection * this.maxSteerVal;
                
                if (recoveryElapsed > this.turnTime) {
                    this.recoveryPhase = 'forward';
                    this.recoveryStartTime = currentTime;
                }
                break;
                
            case 'forward':
                // Move forward briefly to clear the obstacle
                this.currentThrottle = this.maxSpeed * 0.4;
                this.currentSteer = 0;
                
                if (recoveryElapsed > 500) { // 500ms forward movement
                    this.finishRecovery();
                }
                break;
        }
    }

    finishRecovery() {
        console.log("Collision recovery completed");
        this.isRecovering = false;
        this.recoveryPhase = 'reverse';
        this.collisionForce = 0;
        this.stuckCounter = 0;
        this.positionHistory = [];
        
        // Resume normal AI behavior
        this.currentSteer = 0;
        this.currentThrottle = 0;
        this.targetSteer = 0;
    }

    makeAIDecision() {
        // Only make AI decisions if activated
        if (!this.isActivated) return;
        
        // Check for flip status first
        this.checkFlipStatus();
        
        // If flipped, don't make normal AI decisions
        if (this.isFlipped) {
            this.currentSteer = 0;
            this.currentThrottle = 0;
            this.applyAIControls();
            return;
        }
        
        // Check for stuck condition
        this.checkIfStuck();
        
        // If in recovery mode, execute recovery behavior instead of normal AI
        if (this.isRecovering) {
            this.executeRecoveryBehavior();
            this.applyAIControls();
            return;
        }
        
        if (!this.targetCar || !this.targetCar.car || !this.targetCar.car.chassisBody) return;

        const aiPos = this.car.chassisBody.position;
        const targetPos = this.targetCar.car.chassisBody.position;
        
        // Calculate distance to target
        const distance = Math.sqrt(
            Math.pow(targetPos.x - aiPos.x, 2) + 
            Math.pow(targetPos.z - aiPos.z, 2)
        );

        // Determine if we should attack or follow
        this.isAttacking = distance < this.attackDistance;

        // Calculate direction to target
        const directionX = targetPos.x - aiPos.x;
        const directionZ = targetPos.z - aiPos.z;
        
        // Get AI car's forward direction using the chassis body's quaternion
        const chassisQuaternion = this.car.chassisBody.quaternion;
        const forwardVector = new THREE.Vector3(0, 0, 1);
        forwardVector.applyQuaternion(new THREE.Quaternion(
            chassisQuaternion.x,
            chassisQuaternion.y,
            chassisQuaternion.z,
            chassisQuaternion.w
        ));

        // Calculate desired direction (normalized)
        const desiredDirection = new THREE.Vector3(directionX, 0, directionZ).normalize();
        
        // Calculate alignment - how well we're pointing toward target
        const alignment = forwardVector.dot(desiredDirection);
        
        // If we're well-aligned (pointing almost directly at target), go straight
        if (alignment > this.alignmentBonus) {
            this.targetSteer = 0;
        } else {
            // Calculate the angle between forward and desired direction
            const cross = forwardVector.cross(desiredDirection);
            const angle = Math.atan2(cross.y, alignment);

            // Apply enhanced dead zone - only steer if angle is significant
            if (Math.abs(angle) > this.steerDeadZone) {
                // Progressive steering - stronger corrections for larger angles
                let steerIntensity = 1.0;
                if (Math.abs(angle) < 0.3) {
                    steerIntensity = 0.5; // Gentle steering for small corrections
                }
                
                this.targetSteer = THREE.MathUtils.clamp(
                    angle * steerIntensity, 
                    -this.maxSteerVal, 
                    this.maxSteerVal
                );
            } else {
                // Within dead zone - aim to go straight
                this.targetSteer = 0;
            }
        }

        // Enhanced smooth steering with alignment-based smoothing
        const smoothFactor = alignment > 0.8 ? this.steerSmoothFactor * 2 : this.steerSmoothFactor;
        this.currentSteer = THREE.MathUtils.lerp(
            this.currentSteer, 
            this.targetSteer, 
            smoothFactor
        );

        // If steering is very small, snap to zero for perfectly straight movement
        if (Math.abs(this.currentSteer) < this.straightThreshold) {
            this.currentSteer = 0;
        }

        // Throttle control based on distance and attack mode
        if (this.isAttacking) {
            // Full throttle when attacking, but reduce if we need big steering corrections
            const steerPenalty = Math.abs(this.currentSteer) / this.maxSteerVal;
            this.currentThrottle = this.maxSpeed * (1 - steerPenalty * 0.3);
        } else if (distance < this.followDistance) {
            // Slow down if too close
            this.currentThrottle = this.maxSpeed * 0.3;
        } else {
            // Normal following speed, with slight reduction for steering
            const steerPenalty = Math.abs(this.currentSteer) / this.maxSteerVal;
            this.currentThrottle = this.maxSpeed * (0.7 - steerPenalty * 0.2);
        }

        // Only predict future position if we need significant steering
        if (this.isAttacking && Math.abs(this.currentSteer) > 0.1 && this.targetCar.car.chassisBody.velocity) {
            const targetVel = this.targetCar.car.chassisBody.velocity;
            const predictTime = distance / 30; // Reduced prediction for straighter paths
            
            this.targetPosition.set(
                targetPos.x + targetVel.x * predictTime,
                targetPos.y,
                targetPos.z + targetVel.z * predictTime
            );
        } else {
            this.targetPosition.set(targetPos.x, targetPos.y, targetPos.z);
        }

        this.applyAIControls();
    }

    applyAIControls() {
        // Only apply controls if activated
        if (!this.isActivated) {
            // Keep car stationary when inactive
            this.car.setSteeringValue(0, 2);
            this.car.setSteeringValue(0, 3);
            this.car.applyEngineForce(0, 0);
            this.car.applyEngineForce(0, 1);
            this.car.applyEngineForce(0, 2);
            this.car.applyEngineForce(0, 3);
            return;
        }

        // Apply smooth steering to front wheels only
        this.car.setSteeringValue(this.currentSteer, 2);
        this.car.setSteeringValue(this.currentSteer, 3);

        // Apply throttle to all wheels
        const force = this.currentThrottle * (this.isAttacking && !this.isRecovering ? 1.2 : 1);
        this.car.applyEngineForce(-force, 0);
        this.car.applyEngineForce(-force, 1);
        this.car.applyEngineForce(-force, 2);
        this.car.applyEngineForce(-force, 3);

        // Reduced randomness when attacking to maintain better control (skip during recovery)
        if (this.isAttacking && !this.isRecovering && Math.random() < 0.05) {
            const randomSteer = (Math.random() - 0.5) * this.maxSteerVal * 0.2;
            const finalSteer = THREE.MathUtils.clamp(
                this.currentSteer + randomSteer,
                -this.maxSteerVal,
                this.maxSteerVal
            );
            this.car.setSteeringValue(finalSteer, 2);
            this.car.setSteeringValue(finalSteer, 3);
        }
    }

    reset(position = this.startPosition) {
        this.car.chassisBody.position.set(position.x, position.y, position.z);
        this.car.chassisBody.angularVelocity.set(0, 0, 0);
        this.car.chassisBody.velocity.set(0, 0, 0);
        
        // Reset orientation to upright
        this.car.chassisBody.quaternion.set(0, 0, 0, 1);
        
        this.currentSteer = 0;
        this.currentThrottle = 0;
        this.targetSteer = 0;
        
        // Reset collision recovery state
        this.isRecovering = false;
        this.recoveryPhase = 'reverse';
        this.collisionForce = 0;
        this.stuckCounter = 0;
        this.positionHistory = [];
        
        // Reset flip detection state
        this.isFlipped = false;
        this.flipStartTime = 0;
        
        // Reset activation state (optional - set to true if you want AI to stay active after reset)
        // this.isActivated = false;
        // this.hitDetected = false;
        
        // Restore inactive appearance if deactivated
        if (!this.isActivated) {
            this.setInactiveAppearance();
        }
    }

    setInactiveAppearance() {

        this.deactivatePoliceLight();
        this.activateBrakeLight();
        // Set chassis to inactive appearance
        if (this.chassis) {
            this.chassis.traverse((object) => {
                if (object.isMesh) {
                    object.material = this.inactiveMaterial.clone();
                }
            });
        }
        
        // Set wheels to inactive appearance
        this.wheels.forEach(wheel => {
            if (wheel) {
                wheel.traverse((object) => {
                    if (object.isMesh) {
                        object.material = this.inactiveMaterial.clone();
                    }
                });
            }
        });
    }

    update() {


        const updateWorld = () => {

                            if (this.isActivated && this.policeLightsSetup) {
            this.updatePoliceLight();
        }
        this.updateBrakeLightFlarePositions();

            if (this.car.wheelInfos && this.chassis.position && this.wheels[0]?.position) {
                this.chassis.position.set(
                    this.car.chassisBody.position.x + this.chassisModelPos.x,
                    this.car.chassisBody.position.y + this.chassisModelPos.y,
                    this.car.chassisBody.position.z + this.chassisModelPos.z
                );
                this.chassis.quaternion.copy(this.car.chassisBody.quaternion);
                
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

    // Method to get distance to target (useful for debugging)
    getDistanceToTarget() {
        if (!this.targetCar || !this.targetCar.car || !this.targetCar.car.chassisBody) return Infinity;
        
        const aiPos = this.car.chassisBody.position;
        const targetPos = this.targetCar.car.chassisBody.position;
        
        return Math.sqrt(
            Math.pow(targetPos.x - aiPos.x, 2) + 
            Math.pow(targetPos.z - aiPos.z, 2)
        );
    }

    // Method to check current recovery status (useful for debugging)
    getRecoveryStatus() {
        return {
            isActivated: this.isActivated,
            hitDetected: this.hitDetected,
            isRecovering: this.isRecovering,
            recoveryPhase: this.recoveryPhase,
            stuckCounter: this.stuckCounter,
            collisionForce: this.collisionForce,
            isFlipped: this.isFlipped,
            flipDuration: this.isFlipped ? Date.now() - this.flipStartTime : 0
        };
    }

    // Method to manually activate AI (useful for testing)
    forceActivate() {
        if (!this.isActivated) {
            this.hitDetected = true;
            this.activationTime = Date.now() - this.activationDelay; // Immediate activation
            this.activateAI();
        }
    }

    // Method to manually deactivate AI (useful for testing)
    forceDeactivate() {
        this.isActivated = false;
        this.hitDetected = false;
        this.setInactiveAppearance();
        
        // Stop the car
        this.currentSteer = 0;
        this.currentThrottle = 0;
        this.applyAIControls();
    }

    // Method to manually trigger flip reset (useful for testing)
    forceFlipReset() {
        this.resetFromFlip();
    }

    // Method to check if AI is activated (useful for external systems)
    isAIActivated() {
        return this.isActivated;
    }

    // Add this cleanup method to your AIInactiveCar class

cleanup() {
    console.log("🧹 Cleaning up AI Car...");
    
    // Clear intervals
    if (this.activationInterval) {
        clearInterval(this.activationInterval);
        this.activationInterval = null;
    }
    
    // Remove event listeners from chassis body
    if (this.car && this.car.chassisBody) {
        // Remove all event listeners
        this.car.chassisBody.removeEventListener('beginContact');
        this.car.chassisBody.removeEventListener('collide');
        
        // Remove from physics world
        if (this.world) {
            this.car.removeFromWorld(this.world);
        }
    }
    
    // Remove 3D models from scene
    if (this.chassis && this.scene) {
        this.scene.remove(this.chassis);
        
        // Dispose of geometries and materials
        this.chassis.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
    }
    
    // Remove wheels from scene
    if (this.wheels && this.scene) {
        this.wheels.forEach(wheel => {
            if (wheel) {
                this.scene.remove(wheel);
                
                // Dispose of wheel geometries and materials
                wheel.traverse((object) => {
                    if (object.isMesh) {
                        if (object.geometry) {
                            object.geometry.dispose();
                        }
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => material.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    }
                });
            }
        });
    }
    
    // Clear references
    this.scene = null;
    this.world = null;
    this.targetCar = null;
    this.car = null;
    this.chassis = null;
    this.wheels = [];
    
    // Clear arrays and objects
    this.positionHistory = [];
    this.targetPosition = null;
    this.lastPosition = null;
    
    // Reset state flags
    this.isActivated = false;
    this.hitDetected = false;
    this.isRecovering = false;
    this.isFlipped = false;
    this.isAttacking = false;
    
    // Clear any remaining timers or intervals
    this.activationInterval = null;
    
    console.log("✅ AI Inactive Car cleanup completed");
}

// Optional: Add a dispose method that calls cleanup (common pattern)
dispose() {
    this.cleanup();
}

    

}