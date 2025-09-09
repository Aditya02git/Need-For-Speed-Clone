import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import Loader from '../loader/Loader';

export default class AIRacingCar {
    constructor(scene, world, path, startPoint, endPoint, carId = 0, carVariant = null, playerCar = null, loadingManager) {
        this.scene = scene;
        this.world = world;
        this.loadingManager = loadingManager;
        this.path = path;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.carId = carId;
        // Add this after the existing properties in the constructor
this.isControlDisabled = false;
        
        // Car variant configuration
        this.carVariants = {
            lamborghini_hurracan: {
                chassisModel: "./car/Lamborghini_Hu.glb",
                wheelModel: "./car/Lamborghini_Wheel.glb",
                mass: 250,
                chassisDimension: { x: 2.7, y: 1, z: 7 },
                chassisModelPos: { x: 0, y: 0, z: 0 },
                wheelScale: { frontWheel: 1.1, hindWheel: 1.1 },
                wheelPositions: [
                    new CANNON.Vec3(1.35, -0.5, -2.15), // Front right - LOWERED Y position
                    new CANNON.Vec3(-1.35, -0.5, -2.15), // Front left - LOWERED Y position
                    new CANNON.Vec3(1.32, -0.5, 1.8), // Rear right - LOWERED Y position
                    new CANNON.Vec3(-1.32, -0.5, 1.8), // Rear left - LOWERED Y position
                ],
                wheelRadius: 0.5,
                maxSpeed: 90,
                maxForce: 900,
                // color: 0x3498db // Blue
            },
            ferrari_spyder: {
                chassisModel: "./car/Ferrari_Spy.glb",
                wheelModel: "./car/Ferrari_Spy_Wheel.glb",
                mass: 250,
                chassisDimension: { x: 2.7, y: 1, z: 7 },
                chassisModelPos: { x: 0, y: 0, z: 0 },
                wheelScale: { frontWheel: 1.1, hindWheel: 1.1 },
                wheelPositions: [
                    new CANNON.Vec3(1.25, -0.5, -2.25), // Front right - LOWERED Y position
                    new CANNON.Vec3(-1.25, -0.5, -2.25), // Front left - LOWERED Y position
                    new CANNON.Vec3(1.2, -0.5, 1.75), // Rear right - LOWERED Y position
                    new CANNON.Vec3(-1.2, -0.5, 1.75), // Rear left - LOWERED Y position
                ],
                wheelRadius: 0.5,
                maxSpeed: 80,
                maxForce: 900,
                // color: 0xe74c3c // Red
            },
            bmw_m4: {
                chassisModel: "./car/bmw_m4.glb",
                wheelModel: "./car/bmw_m4_wheel.glb",
                mass: 250,
                chassisDimension: { x: 2.7, y: 1, z: 7 },
                chassisModelPos: { x: 0, y: 0.1, z: 0 },
                wheelScale: { frontWheel: 1.1, hindWheel: 1.1 },
                wheelPositions: [
                    new CANNON.Vec3(1.15, -0.5, -1.9), // Front right - LOWERED Y position
                    new CANNON.Vec3(-1.15, -0.5, -1.9), // Front left - LOWERED Y position
                    new CANNON.Vec3(1.15, -0.5, 2.2), // Rear right - LOWERED Y position
                    new CANNON.Vec3(-1.15, -0.5, 2.2), // Rear left - LOWERED Y position
                ],
                wheelRadius: 0.5,
                maxSpeed: 90,
                maxForce: 700,
                // color: 0x2ecc71 // Green
            },
            toyota_supra: {
                chassisModel: "./car/toyota_supra.glb",
                wheelModel: "./car/supra_wheels.glb",
                mass: 250,
                chassisDimension: { x: 2.7, y: 1, z: 7 },
                chassisModelPos: { x: 0, y: 0, z: 0 },
                wheelScale: { frontWheel: 1.1, hindWheel: 1.1 },
                wheelPositions: [
                    new CANNON.Vec3(1.25, -0.5, -1.9), // Front right - LOWERED Y position
                    new CANNON.Vec3(-1.25, -0.5, -1.9), // Front left - LOWERED Y position
                    new CANNON.Vec3(1.1, -0.5, 1.95), // Rear right - LOWERED Y position
                    new CANNON.Vec3(-1.1, -0.5, 1.95), // Rear left - LOWERED Y position
                ],
                wheelRadius: 0.45,
                maxSpeed: 80,
                maxForce: 900,
                // color: 0x9b59b6 // Purple
            },
            chevrolet_corvette: {
                chassisModel: "./car/Chevrolet_Corvette.glb",
                wheelModel: "./car/supra_wheels.glb",
                mass: 250,
                chassisDimension: { x: 2.7, y: 1, z: 7 },
                chassisModelPos: { x: 0, y: 0, z: 0 },
                wheelScale: { frontWheel: 1.1, hindWheel: 1.1 },
                wheelPositions: [
                    new CANNON.Vec3(1.27, -0.5, -2.08), // Front right - LOWERED Y position
                    new CANNON.Vec3(-1.27, -0.5, -2.08), // Front left - LOWERED Y position
                    new CANNON.Vec3(1.25, -0.5, 2.05), // Rear right - LOWERED Y position
                    new CANNON.Vec3(-1.25, -0.5, 2.05), // Rear left - LOWERED Y position
                ],
                wheelRadius: 0.5,
                maxSpeed: 75,
                maxForce: 850,
                // color: 0xf39c12 // Orange
            }
        };
        
        // Select car variant
        this.currentVariant = carVariant || this.getRandomVariant();
        this.carConfig = this.carVariants[this.currentVariant];
        
        // Apply variant-specific properties
        this.mass = this.carConfig.mass;
        this.chassisDimension = this.carConfig.chassisDimension;
        this.chassisModelPos = this.carConfig.chassisModelPos;
        this.wheelScale = this.carConfig.wheelScale;
        this.wheelPositions = this.carConfig.wheelPositions;
        this.wheelRadius = this.carConfig.wheelRadius;
        
        // Path following properties
        this.currentPathIndex = 0;
        this.reachedDestination = false;
        this.pathTolerance = 3.0;
        this.destinationTolerance = 5.0;
        
        // AI driving parameters (adjusted based on variant)
        this.maxSpeed = this.carConfig.maxSpeed;
        this.maxForce = this.carConfig.maxForce;
        this.maxSteerAngle = 0.4;
        this.lookAheadDistance = 8.0;
        
        // Steering smoothing
        this.currentSteer = 0;
        this.steerSmoothness = 0.15;
        this.steerDeadZone = 0.02;
        
        // Collision avoidance and obstacle handling
        this.obstacleAvoidanceRadius = 12.0;
        this.avoidanceForce = 0.6;
        this.isAvoiding = false;
        this.avoidanceTimer = 0;
        this.isReversing = false;
        this.reverseTimer = 0.6;
        this.reverseDirection = 1;
        this.stuckTimer = 0;
        this.lastPosition = new THREE.Vector3();
        this.stuckThreshold = 0.8;
        this.stuckCheckInterval = 60;
        this.frameCounter = 0;
        
        // Path debugging
        this.debugMode = true;
        
        // Car components
        this.car = {};
        this.chassis = {};
        this.wheels = [];
        
        // Initialize targets
        this.targetSteer = 0;
        this.targetThrottle = 0;

        // Upside down detection
        this.upsideDownThreshold = 0.3;
        this.upsideDownTimer = 0;
        this.upsideDownCheckInterval = 30;
        this.upsideDownResetDelay = 1000;

        this.isDestroyed = false;
        this.updateWorldHandler = null;

            this.playerCar = playerCar; // Reference to player car for distance calculation
    this.isActivated = true; // Set to true to enable audio
    this.audio = null;
    this.audioLoaded = false;
    this.audioPlayIntent = false;
    this.minDistance = 5;
    this.maxDistance = 50;
    this.baseVolume = 1; // Reduced from 1.0 to avoid too loud audio
    this.currentVolume = 0;
    this.audioStartTime = 0.1; // Start from beginning
    this.audioEndOffset = 0.1;

        // Enhanced collision and stuck detection
    this.collisionDetected = false;
    this.collisionTimer = 0;
    this.collisionThreshold = 3.0; // Distance threshold for collision detection
    this.velocityThreshold = 1.0; // Minimum velocity to consider movement
    this.impactForceThreshold = 50; // Force threshold to detect impacts
    this.lastVelocity = new CANNON.Vec3(0, 0, 0);
    
    // Improved stuck detection
    this.positionHistory = []; // Store last few positions
    this.historySize = 10;
    this.movementThreshold = 0.5; // Minimum movement over history
    
    // Enhanced reversing
    this.reverseIntensity = 0.8; // How hard to reverse
    this.reverseDuration = 120; // Frames to reverse
    this.postReverseDelay = 60; // Frames to wait after reversing
    this.postReverseTimer = 0;

            // Initialize loader
        this.loader = new Loader(5, 'Loading Car Models...');
        this.isLoaded = false;
        
        // Set up completion callback
        this.loader.setOnComplete(() => {
            this.isLoaded = true;
            console.log('Car models loaded successfully!');
        });
        
        this.init();
    }
    
    getRandomVariant() {
        const variantKeys = Object.keys(this.carVariants);
        const randomIndex = Math.floor(Math.random() * variantKeys.length);
        return variantKeys[randomIndex];
    }
    
    // Static method to get random variant name (for external use)
    static getRandomVariantName() {
        const variants = ['lamborghini_hurracan', 'ferrari_spyder', 'bmw_m4', 'toyota_supra', 'chevrolet_corvette'];
        return variants[Math.floor(Math.random() * variants.length)];
    }
    
    // Static method to get all available variants
    static getAllVariants() {
        return ['lamborghini_hurracan', 'ferrari_spyder', 'bmw_m4', 'toyota_supra', 'chevrolet_corvette'];
    }
    
    init() {
        console.log(`AI Car ${this.carId} initialized with variant: ${this.currentVariant}`);
        this.loader.show();
        this.loadModels();
        this.setChassis();
        this.setWheels();
        this.loadAudio();
        this.startAI();
        
        if (this.debugMode) {
            console.log(`AI Car ${this.carId} (${this.currentVariant}) initialized with path:`, this.path);
            console.log(`Start: (${this.startPoint.x}, ${this.startPoint.y}, ${this.startPoint.z})`);
            console.log(`End: (${this.endPoint.x}, ${this.endPoint.y}, ${this.endPoint.z})`);
            console.log(`Mass: ${this.mass}, Max Speed: ${this.maxSpeed}, Max Force: ${this.maxForce}`);
        }
    }
    
    loadModels() {
        const gltfLoader = new GLTFLoader(this.loadingManager);
        const dracoLoader = new DRACOLoader(this.loadingManager);
        
        dracoLoader.setDecoderConfig({ type: 'js' });
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        gltfLoader.setDRACOLoader(dracoLoader);
        
        // Load chassis with variant-specific model
        gltfLoader.load(this.carConfig.chassisModel, gltf => {
            this.chassis = gltf.scene;
            this.chassis.traverse(object => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                    
                    // Apply variant color if material allows
                    // if (object.material && object.material.color) {
                    //     object.material.color.setHex(this.carConfig.color);
                    // }
                }
            });
            this.chassis.scale.set(1, 1, 1);
            this.scene.add(this.chassis);
            this.loader.updateProgress(1, 'Chassis');
        },
                    progress => {
                // Optional: Handle individual model loading progress
                console.log('Chassis loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            error => {
                console.error('Error loading chassis:', error);
                this.loader.setTitle('Error loading chassis model');
                this.loader.setDetails('Please check the model file path');
            },

         undefined, (error) => {
            console.warn(`Failed to load chassis model ${this.carConfig.chassisModel}, falling back to default`);
            // Fallback to default omni model
            gltfLoader.load("./car/omni.glb", gltf => {
                this.chassis = gltf.scene;
                this.chassis.traverse(object => {
                    if (object.isMesh) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }
                });
                this.chassis.scale.set(1.5, 1.5, 1.5);
                this.scene.add(this.chassis);
            });
        });
        
        // Load wheels with variant-specific model
        this.wheels = [];
        for (let i = 0; i < 4; i++) {
            gltfLoader.load(this.carConfig.wheelModel, gltf => {
                const model = gltf.scene;
                this.wheels[i] = model;
                
                // Apply variant-specific scaling
                const scale = (i === 0 || i === 2) ? this.wheelScale.frontWheel : this.wheelScale.hindWheel;
                if (i === 1 || i === 3) {
                    this.wheels[i].scale.set(-1.5 * scale, 1.5 * scale, -1.5 * scale);
                } else {
                    this.wheels[i].scale.set(1.5 * scale, 1.5 * scale, 1.5 * scale);
                }
                this.scene.add(this.wheels[i]);
                this.loader.updateProgress(1, `Wheel ${i + 1}`);
            },
                            progress => {
                    // Optional: Handle individual wheel loading progress
                    console.log(`Wheel ${i} loading progress:`, (progress.loaded / progress.total * 100) + '%');
                },
                error => {
                    console.error(`Error loading wheel ${i}:`, error);
                    this.loader.setTitle(`Error loading wheel ${i + 1}`);
                    this.loader.setDetails('Please check the wheel model file path');
                },

             undefined, (error) => {
                console.warn(`Failed to load wheel model ${this.carConfig.wheelModel}, falling back to default`);
                // Fallback to default wheel
                gltfLoader.load("./car/wheel.gltf", gltf => {
                    const model = gltf.scene;
                    this.wheels[i] = model;
                    const scale = (i === 0 || i === 2) ? this.wheelScale.frontWheel : this.wheelScale.hindWheel;
                    if (i === 1 || i === 3) {
                        this.wheels[i].scale.set(-1.5 * scale, 1.5 * scale, -1.5 * scale);
                    } else {
                        this.wheels[i].scale.set(1.5 * scale, 1.5 * scale, 1.5 * scale);
                    }
                    this.scene.add(this.wheels[i]);
                });
            });
        }
    }
    
    setChassis() {
        const chassisShape = new CANNON.Box(new CANNON.Vec3(
            this.chassisDimension.x * 0.5, 
            this.chassisDimension.y * 0.5, 
            this.chassisDimension.z * 0.5
        ));
        
        const chassisBody = new CANNON.Body({ 
            mass: this.mass, 
            material: new CANNON.Material({ friction: 0.3 })
        });
        
        chassisBody.linearDamping = 0.15;
        chassisBody.angularDamping = 0.15;
        chassisBody.addShape(chassisShape);
        
        // Set initial position
        chassisBody.position.set(this.startPoint.x, this.startPoint.y, this.startPoint.z);
        this.lastPosition.copy(chassisBody.position);
        
        
        this.car = new CANNON.RaycastVehicle({
            chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 2
        });
        
        // Combined user data for collision detection
        chassisBody.userData = { 
            type: `aicar${this.carId}`, 
            car: this, 
            id: this.carId,
            variant: this.currentVariant,
            belongsTo: 'aiCar'
        };
        
        this.car.addToWorld(this.world);
    }
    
    setWheels() {
        this.car.wheelInfos = [];
        
        for (let i = 0; i < 4; i++) {
            this.car.addWheel({
                radius: this.wheelRadius,
                directionLocal: new CANNON.Vec3(0, -1, 0),
                suspensionStiffness: 80,
                suspensionRestLength: 0.15,
                frictionSlip: 25,
                dampingRelaxation: 2.3,
                dampingCompression: 4.3,
                maxSuspensionForce: 100000,
                rollInfluence: 0.01,
                axleLocal: new CANNON.Vec3(-1, 0, 0),
                chassisConnectionPointLocal: this.wheelPositions[i],
                maxSuspensionTravel: 0.1,
                customSlidingRotationalSpeed: 30,
            });
        }
        
        this.car.wheelInfos.forEach((wheel, index) => {
            const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
            const wheelBody = new CANNON.Body({
                mass: 1,
                material: new CANNON.Material({ friction: 0.7 }),
            });
            wheelBody.linearDamping = 0.4;
            wheelBody.angularDamping = 0.4;
            const quaternion = new CANNON.Quaternion().setFromEuler(0, Math.PI/2, 0);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
        });
    }

// Fixed loadAudio method - call this in init()
loadAudio() {
    console.log("Loading AI car engine audio...");
    this.audio = new Audio('./sounds/policecar_sound.mp3');
    
    this.audio.loop = true; // Enable native looping for simplicity
    this.audio.volume = 0;
    this.audio.preload = 'auto';
    
    // Audio loading event handlers
    this.audio.addEventListener('loadedmetadata', () => {
        // console.log(`AI Car ${this.carId} audio loaded successfully. Duration: ${this.audio.duration.toFixed(2)}s`);
        this.audioLoaded = true;
    });
    
    this.audio.addEventListener('canplaythrough', () => {
        // console.log(`AI Car ${this.carId} audio ready to play`);
        // Auto-start playing if activated
        if (this.isActivated) {
            this.startAudioPlayback();
        }
    });
    
    this.audio.addEventListener('error', (e) => {
        // console.error(`Error loading AI car ${this.carId} siren audio:`, e);
        // console.error("Audio error details:", {
        //     code: this.audio.error?.code,
        //     message: this.audio.error?.message
        // });
    });
}

setupAudioLoop() {
    if (!this.audioLoaded) return;
    
    const duration = this.audio.duration;
    const loopEnd = duration - this.audioEndOffset;
    
    // Set up seamless looping
    this.audio.addEventListener('timeupdate', () => {
        if (this.audio.currentTime >= loopEnd && this.isActivated) {
            this.audio.currentTime = this.audioStartTime;
        }
    });
    
    console.log(`Audio loop configured: ${this.audioStartTime}s to ${loopEnd.toFixed(2)}s`);
}

// Enhanced audio update method - call this in your main update loop
updateAudio() {
    if (!this.audioLoaded || !this.audio || !this.isActivated) return;

    // Calculate distance to player car
    const distance = this.getDistanceToPlayer();
    
    // Calculate volume based on distance
    const targetVolume = this.calculateVolumeFromDistance(distance);
    
    // Handle audio playback
    if (targetVolume > 0) {
        this.startAudioPlayback();
        this.smoothVolumeTransition(targetVolume);
    } else {
        this.stopAudioPlayback();
    }
}

getDistanceToPlayer() {
    if (!this.playerCar || !this.playerCar.car || !this.playerCar.car.chassisBody || 
        !this.car || !this.car.chassisBody) {
        return this.maxDistance;
    }
    
    const aiPos = this.car.chassisBody.position;
    const playerPos = this.playerCar.car.chassisBody.position;
    
    return Math.sqrt(
        Math.pow(playerPos.x - aiPos.x, 2) + 
        Math.pow(playerPos.y - aiPos.y, 2) + 
        Math.pow(playerPos.z - aiPos.z, 2)
    );
}

calculateVolumeFromDistance(distance) {
    if (distance <= this.minDistance) {
        return this.baseVolume;
    } else if (distance >= this.maxDistance) {
        return 0;
    } else {
        const normalizedDistance = (distance - this.minDistance) / (this.maxDistance - this.minDistance);
        const exponentialFalloff = Math.pow(1 - normalizedDistance, 2);
        return this.baseVolume * exponentialFalloff;
    }
}

startAudioPlayback() {
    if (!this.audio || !this.audio.paused) return;
    
    this.audio.currentTime = this.audioStartTime;
    
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                // console.log(`AI Car ${this.carId} audio started successfully`);
            })
            .catch(error => {
                // console.warn(`AI Car ${this.carId} audio play failed:`, error.name);
                this.audioPlayIntent = true;
            });
    }
}

// Simplified stopAudioPlayback method
stopAudioPlayback() {
    if (!this.audio || this.audio.paused) return;
    
    this.audio.pause();
    this.audio.currentTime = this.audioStartTime;
    // console.log(`AI Car ${this.carId} audio stopped`);
}

smoothVolumeTransition(targetVolume) {
    if (!this.audio || this.audio.paused) return;
    
    const currentVolume = this.audio.volume;
    const volumeDifference = targetVolume - currentVolume;
    
    if (Math.abs(volumeDifference) > 0.01) {
        const volumeStep = volumeDifference * 0.1;
        const newVolume = Math.max(0, Math.min(1, currentVolume + volumeStep));
        
        this.audio.volume = newVolume;
        this.currentVolume = newVolume;
    }
}

// Handle user interaction for audio autoplay restrictions
handleUserInteraction() {
    // This should be called when user clicks/interacts with the page
    if (this.audioPlayIntent && this.audioLoaded && this.isActivated) {
        this.startAudio(this.calculateVolumeFromDistance(this.getDistanceToPlayer()));
        this.audioPlayIntent = false;
    }
}
    
startAI() {
    this.update();
    this.aiLoop();
}

setPlayerCar(playerCar) {
    this.playerCar = playerCar;
    console.log(`AI Car ${this.carId} player car reference set`);
}

activateAudio() {
    this.isActivated = true;
    if (this.audioLoaded) {
        this.startAudioPlayback();
    }
}

deactivateAudio() {
    this.isActivated = false;
    this.stopAudioPlayback();
}

    checkIfUpsideDown() {
        if (!this.car.chassisBody) return;
        
        this.frameCounter++;
        
        if (this.frameCounter % this.upsideDownCheckInterval !== 0) return;
        
        const carUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.car.chassisBody.quaternion);
        
        if (carUp.y < this.upsideDownThreshold) {
            this.upsideDownTimer++;
            
            if (this.debugMode) {
                console.log(`AI Car ${this.carId} (${this.currentVariant}) upside down check: ${this.upsideDownTimer}, up vector Y: ${carUp.y.toFixed(2)}`);
            }
            
            if (this.upsideDownTimer >= (this.upsideDownResetDelay / this.upsideDownCheckInterval)) {
                this.resetUpsideDownCar();
                this.upsideDownTimer = 0;
            }
        } else {
            this.upsideDownTimer = 0;
        }
    }

    resetUpsideDownCar() {
        if (!this.car.chassisBody) return;
        
        if (this.debugMode) {
            console.log(`AI Car ${this.carId} (${this.currentVariant}) is upside down, resetting position`);
        }
        
        const currentPos = this.car.chassisBody.position;
        
        this.car.chassisBody.position.set(currentPos.x, currentPos.y + 2, currentPos.z);
        this.car.chassisBody.quaternion.set(0, 0, 0, 1);
        this.car.chassisBody.angularVelocity.set(0, 0, 0);
        this.car.chassisBody.velocity.set(0, 0, 0);
        
        this.targetSteer = 0;
        this.targetThrottle = 0;
        this.currentSteer = 0;
        this.isReversing = false;
        this.reverseTimer = 0;
        this.stuckTimer = 0;
    }
    
aiLoop() {
    if (this.reachedDestination || this.isDestroyed) return;
    
    if (this.isControlDisabled) {
        this.stopCar();
        if (!this.isDestroyed) {
            requestAnimationFrame(() => this.aiLoop());
        }
        return;
    }
    
    // Use enhanced detection methods
    this.checkIfStuckEnhanced(); // Replace checkIfStuck()
    this.checkIfUpsideDown();
    this.handleEnhancedReversing(); // Replace handleReversing()
    
    // Only follow path if not in post-reverse delay
    if (this.postReverseTimer <= 0) {
        this.followPath();
        this.avoidObstacles();
    }
    
    this.updateCarMovement();
    
    if (!this.isDestroyed) {
        requestAnimationFrame(() => this.aiLoop());
    }
}

// Add this method after the existing methods
setRotation(x = 0, y = 0, z = 0) {
    if (!this.car.chassisBody) return;
    
    // Convert Euler angles to quaternion
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromEuler(x, y, z);
    
    // Set the chassis body rotation
    this.car.chassisBody.quaternion.copy(quaternion);
    
    // Clear angular velocity to prevent spinning
    this.car.chassisBody.angularVelocity.set(0, 0, 0);
    
    if (this.debugMode) {
        console.log(`AI Car ${this.carId} (${this.currentVariant}) rotation set to: x=${x}, y=${y}, z=${z}`);
    }
}

// Alternative method using quaternion directly
setRotationQuaternion(quaternion) {
    if (!this.car.chassisBody) return;
    
    this.car.chassisBody.quaternion.copy(quaternion);
    this.car.chassisBody.angularVelocity.set(0, 0, 0);
    
    if (this.debugMode) {
        console.log(`AI Car ${this.carId} (${this.currentVariant}) rotation set via quaternion`);
    }
}

// Method to rotate by a specific amount (relative rotation)
rotateBy(x = 0, y = 0, z = 0) {
    if (!this.car.chassisBody) return;
    
    const currentQuat = this.car.chassisBody.quaternion;
    const rotationQuat = new CANNON.Quaternion();
    rotationQuat.setFromEuler(x, y, z);
    
    // Multiply current rotation by the additional rotation
    const newQuat = currentQuat.mult(rotationQuat);
    this.car.chassisBody.quaternion.copy(newQuat);
    
    // Clear angular velocity
    this.car.chassisBody.angularVelocity.set(0, 0, 0);
    
    if (this.debugMode) {
        console.log(`AI Car ${this.carId} (${this.currentVariant}) rotated by: x=${x}, y=${y}, z=${z}`);
    }
}

// Method to face a specific direction (useful for AI)
faceDirection(targetX, targetZ) {
    if (!this.car.chassisBody) return;
    
    const carPos = this.car.chassisBody.position;
    const direction = new THREE.Vector3(targetX - carPos.x, 0, targetZ - carPos.z);
    direction.normalize();
    
    // Calculate the Y rotation needed to face the target
    const angle = Math.atan2(direction.x, direction.z);
    
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromEuler(0, angle, 0);
    
    this.car.chassisBody.quaternion.copy(quaternion);
    this.car.chassisBody.angularVelocity.set(0, 0, 0);
    
    if (this.debugMode) {
        console.log(`AI Car ${this.carId} (${this.currentVariant}) facing direction: (${targetX}, ${targetZ})`);
    }
}
    
checkIfStuckEnhanced() {
    if (!this.car.chassisBody) return;
    
    this.frameCounter++;
    
    // Store position history
    const currentPos = this.car.chassisBody.position.clone();
    this.positionHistory.push(currentPos);
    
    if (this.positionHistory.length > this.historySize) {
        this.positionHistory.shift();
    }
    
    // Check every 30 frames instead of 60 for more responsive detection
    if (this.frameCounter % 30 !== 0) return;
    
    const currentSpeed = this.car.chassisBody.velocity.length();
    
    // Calculate movement over history
    let totalMovement = 0;
    if (this.positionHistory.length >= 2) {
        for (let i = 1; i < this.positionHistory.length; i++) {
            totalMovement += this.positionHistory[i].distanceTo(this.positionHistory[i-1]);
        }
    }
    
    const averageMovement = totalMovement / Math.max(1, this.positionHistory.length - 1);
    const isMovingSlowly = currentSpeed < this.velocityThreshold;
    const isBarelylMoving = averageMovement < this.movementThreshold;
    const isTryingToMove = Math.abs(this.targetThrottle) > 0.1;
    
    // Detect collision
    const hasCollision = this.detectCollisions();
    
    // Trigger reverse if stuck, slow, or colliding
    if ((isMovingSlowly && isBarelylMoving && isTryingToMove) || hasCollision) {
        this.stuckTimer++;
        
        if (this.debugMode) {
            console.log(`AI Car ${this.carId} stuck/collision check: timer=${this.stuckTimer}, speed=${currentSpeed.toFixed(2)}, movement=${averageMovement.toFixed(2)}, collision=${hasCollision}`);
        }
        
        // Reduce stuck timer threshold for faster response
        if (this.stuckTimer >= 2 || hasCollision) {
            if (this.debugMode) {
                console.log(`AI Car ${this.carId} triggering reverse maneuver - stuck=${!hasCollision}, collision=${hasCollision}`);
            }
            this.startEnhancedReverseManeuver();
            this.stuckTimer = 0;
            this.positionHistory = []; // Clear history
        }
    } else {
        this.stuckTimer = 0;
    }
}

startEnhancedReverseManeuver() {
    this.isReversing = true;
    this.reverseTimer = this.reverseDuration;
    
    // Choose reverse direction based on obstacle positions
    let bestDirection = this.calculateBestReverseDirection();
    this.reverseDirection = bestDirection;
    
    // Clear any stuck state
    this.stuckTimer = 0;
    this.collisionTimer = 0;
    this.positionHistory = [];
    
    if (this.debugMode) {
        console.log(`AI Car ${this.carId} starting enhanced reverse: direction=${this.reverseDirection}, duration=${this.reverseTimer}`);
    }
}

calculateBestReverseDirection() {
    if (!this.car.chassisBody) return Math.random() > 0.5 ? 1 : -1;
    
    const myPos = this.car.chassisBody.position;
    let leftSpace = 0;
    let rightSpace = 0;
    const checkDistance = 8.0;
    
    // Get car's right vector
    const carRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.car.chassisBody.quaternion);
    const carBack = new THREE.Vector3(0, 0, -1).applyQuaternion(this.car.chassisBody.quaternion);
    
    // Check space to the left and right
    const leftCheckPos = new CANNON.Vec3(
        myPos.x + carRight.x * -checkDistance,
        myPos.y,
        myPos.z + carRight.z * -checkDistance
    );
    
    const rightCheckPos = new CANNON.Vec3(
        myPos.x + carRight.x * checkDistance,
        myPos.y,
        myPos.z + carRight.z * checkDistance
    );
    
    // Count obstacles in each direction
    this.world.bodies.forEach(body => {
        if (body.userData && body !== this.car.chassisBody) {
            const distance = body.position.distanceTo(myPos);
            if (distance < checkDistance * 1.5) {
                const leftDist = body.position.distanceTo(leftCheckPos);
                const rightDist = body.position.distanceTo(rightCheckPos);
                
                if (leftDist < checkDistance) leftSpace++;
                if (rightDist < checkDistance) rightSpace++;
            }
        }
    });
    
    // Choose direction with more space (fewer obstacles)
    if (leftSpace < rightSpace) {
        return -1; // Turn left while reversing
    } else if (rightSpace < leftSpace) {
        return 1; // Turn right while reversing
    } else {
        return Math.random() > 0.5 ? 1 : -1; // Random if equal
    }
}
    
handleEnhancedReversing() {
    if (!this.isReversing) {
        // Handle post-reverse delay
        if (this.postReverseTimer > 0) {
            this.postReverseTimer--;
            this.targetThrottle = 0; // Don't accelerate immediately after reversing
            this.targetSteer = 0;
            return;
        }
        return;
    }
    
    this.reverseTimer--;
    
    if (this.reverseTimer <= 0) {
        this.isReversing = false;
        this.postReverseTimer = this.postReverseDelay;
        this.stuckTimer = 0;
        
        if (this.debugMode) {
            console.log(`AI Car ${this.carId} finished reverse maneuver, entering post-reverse delay`);
        }
        return;
    }
    
    // Enhanced reverse behavior
    const reverseProgress = 1 - (this.reverseTimer / this.reverseDuration);
    
    // Start with strong reverse, then ease off
    if (reverseProgress < 0.5) {
        this.targetThrottle = -this.reverseIntensity;
    } else {
        this.targetThrottle = -this.reverseIntensity * 0.5;
    }
    
    // Vary steering during reverse for better maneuvering
    if (reverseProgress < 0.3) {
        this.targetSteer = this.reverseDirection * 0.5; // Strong initial turn
    } else if (reverseProgress < 0.7) {
        this.targetSteer = this.reverseDirection * 0.3; // Moderate turn
    } else {
        this.targetSteer = this.reverseDirection * 0.1; // Slight turn to straighten
    }
    
    // Check if we've moved enough to stop reversing early
    if (this.positionHistory.length >= 3) {
        const moveDistance = this.positionHistory[0].distanceTo(this.car.chassisBody.position);
        if (moveDistance > 4.0) { // Moved far enough
            this.reverseTimer = Math.min(this.reverseTimer, 30); // End soon
        }
    }
}
    
    followPath() {
        if (this.isReversing) return;
        
        if (!this.car.chassisBody) return;
        
        const carPos = this.car.chassisBody.position;
        
        const distToEnd = this.getDistanceToPoint(this.endPoint);
        if (distToEnd < this.destinationTolerance) {
            this.reachedDestination = true;
            this.stopCar();
            if (this.debugMode) {
                console.log(`AI Car ${this.carId} (${this.currentVariant}) reached final destination!`);
            }
            return;
        }
        
        let targetPoint = this.endPoint;
        
        if (this.path && this.path.length > 0) {
            if (this.currentPathIndex < this.path.length) {
                const currentWaypoint = this.path[this.currentPathIndex];
                const distanceToWaypoint = this.getDistanceToPoint(currentWaypoint);
                
                if (distanceToWaypoint < this.pathTolerance) {
                    this.currentPathIndex++;
                    if (this.debugMode) {
                        // console.log(`AI Car ${this.carId} (${this.currentVariant}) reached waypoint ${this.currentPathIndex}/${this.path.length}`);
                    }
                } else {
                    if (this.currentPathIndex < this.path.length - 1) {
                        const nextWaypoint = this.path[this.currentPathIndex + 1];
                        const distToNext = this.getDistanceToPoint(nextWaypoint);
                        
                        if (distToNext < distanceToWaypoint && distToNext < this.pathTolerance * 1.5) {
                            this.currentPathIndex++;
                            if (this.debugMode) {
                                console.log(`AI Car ${this.carId} (${this.currentVariant}) skipped to waypoint ${this.currentPathIndex}/${this.path.length} (overshoot)`);
                            }
                        }
                    }
                }
            }
            
            if (this.currentPathIndex < this.path.length) {
                targetPoint = this.path[this.currentPathIndex];
                
                const lookAheadIndex = Math.min(this.currentPathIndex + 2, this.path.length - 1);
                if (lookAheadIndex > this.currentPathIndex) {
                    const currentWaypoint = this.path[this.currentPathIndex];
                    const lookAheadWaypoint = this.path[lookAheadIndex];
                    const distToCurrent = this.getDistanceToPoint(currentWaypoint);
                    
                    if (distToCurrent < this.lookAheadDistance) {
                        let blendFactor = Math.max(0, Math.min(1, (this.lookAheadDistance - distToCurrent) / this.lookAheadDistance));
                        
                        if (this.currentPathIndex > 0 && this.currentPathIndex < this.path.length - 1) {
                            const prevPoint = this.path[this.currentPathIndex - 1];
                            const currPoint = this.path[this.currentPathIndex];
                            const nextPoint = this.path[this.currentPathIndex + 1];
                            
                            const v1 = new THREE.Vector3().subVectors(currPoint, prevPoint).normalize();
                            const v2 = new THREE.Vector3().subVectors(nextPoint, currPoint).normalize();
                            const curvature = 1 - v1.dot(v2);
                            
                            blendFactor *= (1 - curvature * 0.5);
                        }
                        
                        targetPoint = new THREE.Vector3().lerpVectors(currentWaypoint, lookAheadWaypoint, blendFactor);
                    }
                }
            }
        }
        
        this.targetSteer = this.calculateSmoothSteering(targetPoint);
        this.targetThrottle = this.calculateThrottle(this.getDistanceToPoint(targetPoint));
        
        // if (this.debugMode && this.frameCounter % 120 === 0) {
        //     console.log(`AI Car ${this.carId} (${this.currentVariant}): Target (${targetPoint.x.toFixed(1)}, ${targetPoint.z.toFixed(1)}), Distance: ${this.getDistanceToPoint(targetPoint).toFixed(1)}, Waypoint: ${this.currentPathIndex}/${this.path.length}`);
        // }
    }
    
    calculateSmoothSteering(target) {
        if (!this.car.chassisBody) return 0;
        
        const carPos = this.car.chassisBody.position;
        const carQuat = this.car.chassisBody.quaternion;
        
        const targetDir = new THREE.Vector3()
            .subVectors(target, carPos)
            .normalize();
        
        const carForward = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(carQuat);
        
        const dot = carForward.dot(targetDir);
        const cross = new THREE.Vector3().crossVectors(carForward, targetDir);
        const angle = Math.atan2(cross.y, dot);
        
        let rawSteer = Math.max(-1, Math.min(1, angle / (Math.PI * 0.3)));
        
        if (Math.abs(rawSteer) < this.steerDeadZone) {
            rawSteer = 0;
        }
        
        const targetSteerValue = rawSteer * this.maxSteerAngle;
        this.currentSteer += (targetSteerValue - this.currentSteer) * this.steerSmoothness;
        
        return this.currentSteer;
    }

    detectCollisions() {
    if (!this.car.chassisBody) return;
    
    const myPosition = this.car.chassisBody.position;
    const myVelocity = this.car.chassisBody.velocity;
    let collisionDetected = false;
    
    // Check collision with player car specifically
    if (this.playerCar && this.playerCar.car && this.playerCar.car.chassisBody) {
        const playerPos = this.playerCar.car.chassisBody.position;
        const distance = myPosition.distanceTo(playerPos);
        
        if (distance < this.collisionThreshold) {
            // Calculate relative velocity to determine if it's an impact
            const playerVelocity = this.playerCar.car.chassisBody.velocity;
            const relativeVelocity = new CANNON.Vec3().copy(playerVelocity).vsub(myVelocity);
            const impactForce = relativeVelocity.length();
            
            if (impactForce > this.impactForceThreshold / 10) { // Adjusted threshold
                collisionDetected = true;
                if (this.debugMode) {
                    console.log(`AI Car ${this.carId} collision with player! Distance: ${distance.toFixed(2)}, Impact: ${impactForce.toFixed(2)}`);
                }
            }
        }
    }
    
    // Check collision with other AI cars
    this.world.bodies.forEach(body => {
        if (body.userData && 
            body.userData.type && 
            body.userData.type.startsWith('aicar') && 
            body.userData.id !== this.carId) {
            
            const otherPos = body.position;
            const distance = myPosition.distanceTo(otherPos);
            
            if (distance < this.collisionThreshold) {
                const otherVelocity = body.velocity;
                const relativeVelocity = new CANNON.Vec3().copy(otherVelocity).vsub(myVelocity);
                const impactForce = relativeVelocity.length();
                
                if (impactForce > this.impactForceThreshold / 20) {
                    collisionDetected = true;
                    if (this.debugMode) {
                        console.log(`AI Car ${this.carId} collision with AI car ${body.userData.id}! Distance: ${distance.toFixed(2)}`);
                    }
                }
            }
        }
    });
    
    // Check for static obstacles (walls, barriers, etc.)
    this.world.bodies.forEach(body => {
        if (body.userData && 
            (body.userData.type === 'wall' || 
             body.userData.type === 'barrier' || 
             body.userData.type === 'obstacle')) {
            
            const obstaclePos = body.position;
            const distance = myPosition.distanceTo(obstaclePos);
            
            if (distance < this.collisionThreshold) {
                collisionDetected = true;
                if (this.debugMode) {
                    console.log(`AI Car ${this.carId} collision with obstacle! Distance: ${distance.toFixed(2)}`);
                }
            }
        }
    });
    
    return collisionDetected;
}
    
avoidObstacles() {
    if (!this.car.chassisBody || this.isReversing || this.postReverseTimer > 0) return;
    
    const myPosition = this.car.chassisBody.position;
    
    this.isAvoiding = false;
    let avoidanceSteer = 0;
    let closestDistance = this.obstacleAvoidanceRadius;
    
    // Check player car with priority
    if (this.playerCar && this.playerCar.car && this.playerCar.car.chassisBody) {
        const playerPos = this.playerCar.car.chassisBody.position;
        const distance = myPosition.distanceTo(playerPos);
        
        if (distance < this.obstacleAvoidanceRadius * 1.2) { // Slightly larger radius for player
            const carForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.car.chassisBody.quaternion);
            const toPlayer = new THREE.Vector3().subVectors(playerPos, myPosition).normalize();
            const forwardDot = carForward.dot(toPlayer);
            
            if (forwardDot > 0.1) { // More sensitive to player car
                const carRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.car.chassisBody.quaternion);
                const rightDot = toPlayer.dot(carRight);
                
                const weight = (this.obstacleAvoidanceRadius * 1.2 - distance) / (this.obstacleAvoidanceRadius * 1.2);
                const steerDirection = rightDot > 0 ? -1 : 1;
                
                avoidanceSteer += steerDirection * this.avoidanceForce * weight * 1.5; // Stronger avoidance for player
                this.isAvoiding = true;
                closestDistance = Math.min(closestDistance, distance);
            }
        }
    }
    
    // Check other AI cars
    this.world.bodies.forEach(body => {
        if (body.userData && 
            body.userData.type && 
            body.userData.type.startsWith('aicar') && 
            body.userData.id !== this.carId) {
            
            const otherPos = body.position;
            const distance = myPosition.distanceTo(otherPos);
            
            if (distance < this.obstacleAvoidanceRadius && distance > 0.1) {
                const carForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.car.chassisBody.quaternion);
                const toObstacle = new THREE.Vector3().subVectors(otherPos, myPosition).normalize();
                const forwardDot = carForward.dot(toObstacle);
                
                if (forwardDot > 0.2) {
                    const carRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.car.chassisBody.quaternion);
                    const rightDot = toObstacle.dot(carRight);
                    
                    const weight = (this.obstacleAvoidanceRadius - distance) / this.obstacleAvoidanceRadius;
                    const steerDirection = rightDot > 0 ? -1 : 1;
                    
                    avoidanceSteer += steerDirection * this.avoidanceForce * weight;
                    this.isAvoiding = true;
                    closestDistance = Math.min(closestDistance, distance);
                }
            }
        }
    });
    
    if (this.isAvoiding) {
        this.targetSteer += avoidanceSteer;
        this.targetSteer = Math.max(-this.maxSteerAngle, Math.min(this.maxSteerAngle, this.targetSteer));
        
        // More aggressive reversing trigger
        if (closestDistance < 4.0 && !this.isReversing && this.postReverseTimer <= 0) {
            if (this.debugMode) {
                console.log(`AI Car ${this.carId} very close to obstacle (${closestDistance.toFixed(2)}), triggering immediate reverse`);
            }
            this.startEnhancedReverseManeuver();
        } else {
            this.targetThrottle *= Math.max(0.2, closestDistance / this.obstacleAvoidanceRadius);
        }
    }
}
    
    calculateThrottle(distanceToTarget) {
        if (this.isReversing) return this.targetThrottle;
        
        const currentSpeed = this.car.chassisBody.velocity.length();
        
        // Adaptive speed based on distance to target
        let targetSpeed = this.maxSpeed;
        
        // Slow down as approaching target
        if (distanceToTarget < 20) {
            targetSpeed = Math.max(10, this.maxSpeed * (distanceToTarget / 20));
        }
        
        // Further reduce speed when very close
        if (distanceToTarget < 8) {
            targetSpeed = Math.max(5, targetSpeed * 0.5);
        }
        
        // Reduce speed when avoiding obstacles
        if (this.isAvoiding) {
            targetSpeed *= 0.6;
        }
        
        // Calculate throttle based on speed difference
        if (currentSpeed < targetSpeed) {
            return Math.min(1.0, (targetSpeed - currentSpeed) / 15);
        } else {
            return Math.max(0.0, (targetSpeed - currentSpeed) / 20);
        }
    }
    
    updateCarMovement() {
        if (!this.car.chassisBody || this.reachedDestination) return;
        
        // Apply smooth steering to front wheels
        this.car.setSteeringValue(this.targetSteer, 2);
        this.car.setSteeringValue(this.targetSteer, 3);
        
        // Apply throttle/reverse to all wheels
        const force = Math.abs(this.targetThrottle) * this.maxForce;
        const forceDirection = this.targetThrottle >= 0 ? -1 : 1;
        
        this.car.applyEngineForce(forceDirection * force, 0);
        this.car.applyEngineForce(forceDirection * force, 1);
        this.car.applyEngineForce(forceDirection * force, 2);
        this.car.applyEngineForce(forceDirection * force, 3);
        
        // Apply braking when not accelerating
        if (Math.abs(this.targetThrottle) < 0.1) {
            this.car.setBrake(30, 0);
            this.car.setBrake(30, 1);
            this.car.setBrake(30, 2);
            this.car.setBrake(30, 3);
        } else {
            this.car.setBrake(0, 0);
            this.car.setBrake(0, 1);
            this.car.setBrake(0, 2);
            this.car.setBrake(0, 3);
        }
    }
    
    stopCar() {
        this.car.applyEngineForce(0, 0);
        this.car.applyEngineForce(0, 1);
        this.car.applyEngineForce(0, 2);
        this.car.applyEngineForce(0, 3);
        
        this.car.setBrake(10, 0);
        this.car.setBrake(10, 1);
        this.car.setBrake(10, 2);
        this.car.setBrake(10, 3);
    }
    
    getDistanceToPoint(point) {
        if (!this.car.chassisBody) return Infinity;
        return this.car.chassisBody.position.distanceTo(point);
    }
    
    update() {
        const updateWorld = () => {

            this.updateAudio();

            if (this.isDestroyed) return;
            if (this.car.wheelInfos && this.chassis.position && this.wheels[0]?.position) {
                // Update chassis position and rotation
                this.chassis.position.set(
                    this.car.chassisBody.position.x + this.chassisModelPos.x,
                    this.car.chassisBody.position.y + this.chassisModelPos.y,
                    this.car.chassisBody.position.z + this.chassisModelPos.z
                );
                this.chassis.quaternion.copy(this.car.chassisBody.quaternion);
                
                // Update wheel positions and rotations
                for (let i = 0; i < 4; i++) {
                    if (this.car.wheelInfos[i] && this.wheels[i]) {
                        this.car.updateWheelTransform(i);
                        this.wheels[i].position.copy(this.car.wheelInfos[i].worldTransform.position);
                        this.wheels[i].quaternion.copy(this.car.wheelInfos[i].worldTransform.quaternion);
                    }
                }
            }
        };
        this.world.addEventListener('postStep', updateWorld);
    }
    
    // Method to reset car to start position
// Add this line to the existing reset() method
reset() {
    if (this.car.chassisBody) {
        this.car.chassisBody.position.set(this.startPoint.x, this.startPoint.y, this.startPoint.z);
        this.car.chassisBody.quaternion.set(0, 0, 0, 1); // Reset rotation to default
        this.car.chassisBody.angularVelocity.set(0, 0, 0);
        this.car.chassisBody.velocity.set(0, 0, 0);
    }
    this.currentPathIndex = 0;
    this.reachedDestination = false;
    this.targetSteer = 0;
    this.targetThrottle = 0;
    this.currentSteer = 0;
    this.isReversing = false;
    this.reverseTimer = 0;
    this.stuckTimer = 0;
    this.frameCounter = 0;
    this.upsideDownTimer = 0;
    this.isControlDisabled = false;
    if (this.car.chassisBody) {
        this.lastPosition.copy(this.car.chassisBody.position);
    }
}
// Add these methods after the existing methods
enableControl() {
    this.isControlDisabled = false;
    if (this.debugMode) {
        console.log(`AI Car ${this.carId} (${this.currentVariant}) control enabled`);
    }
}

disableControl() {
    this.isControlDisabled = true;
    this.stopCar();
    if (this.debugMode) {
        console.log(`AI Car ${this.carId} (${this.currentVariant}) control disabled`);
    }
}

playSound() {
    if (!this.audioLoaded || !this.isActivated) {
        return false;
    }
    
    // Calculate distance-based volume
    const distance = this.getDistanceToPlayer();
    if (distance > this.maxDistance) {
        this.pauseSound();
        return false;
    }
    
    // Calculate volume based on distance
    const volumeRatio = Math.max(0, (this.maxDistance - distance) / (this.maxDistance - this.minDistance));
    this.currentVolume = Math.min(this.baseVolume * volumeRatio, this.baseVolume);
    
    try {
        // Set audio start time and volume for both audio objects
        if (this.audio) {
            this.audio.currentTime = this.audioStartTime;
            this.audio.volume = this.currentVolume;
            
            // Play audio1 and ensure audio2 is paused (based on your isPlaying logic)
            const playPromise = this.audio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("AI Car audio playing");
                }).catch(error => {
                    console.warn("Audio play failed:", error);
                });
            }
            
            this.audioPlayIntent = true;
            return true;
        }
    } catch (error) {
        console.warn("Error playing AI Car audio:", error);
        return false;
    }
    
    return false;
}

// Pause sound
pauseSound() {
    try {
        if (this.audio && !this.audio.paused) {
            this.audio.pause();
            console.log("AI Car audio paused");
        }
        
        this.audioPlayIntent = false;
        this.currentVolume = 0;
        
        return true;
    } catch (error) {
        console.warn("Error pausing AI Car audio:", error);
        return false;
    }
}

// Optional: Stop sound (pause and reset to start)
stopSound() {
    try {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = this.audioStartTime;
        }
        
        this.audioPlayIntent = false;
        this.currentVolume = 0;
        
        console.log("AI Car audio stopped");
        return true;
    } catch (error) {
        console.warn("Error stopping AI Car audio:", error);
        return false;
    }
}

// Optional: Update volume without changing play state
updateVolume() {
    if (!this.audioLoaded) return;
    
    const distance = this.getDistanceToPlayer();
    if (distance > this.maxDistance) {
        this.pauseSound();
        return;
    }
    
    const volumeRatio = Math.max(0, (this.maxDistance - distance) / (this.maxDistance - this.minDistance));
    this.currentVolume = Math.min(this.baseVolume * volumeRatio, this.baseVolume);
    
    if (this.audio) {
        this.audio.volume = this.currentVolume;
    }
}

cleanup() {
    if (this.isDestroyed) return; // Prevent double cleanup
    
    console.log(`Cleaning up AI Car ${this.carId}`);
    
    // Mark as destroyed to stop all loops and updates
    this.isDestroyed = true;
    
    // Stop the car
    this.stopCar();

    if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
        this.audio = null;
    }
    
    this.audioLoaded = false;
    this.audioPlayIntent = false;
    this.currentVolume = 0;
    
    // Remove event listeners
    if (this.updateWorldHandler) {
        this.world.removeEventListener('postStep', this.updateWorldHandler);
        this.updateWorldHandler = null;
    }
    
    // Remove chassis from scene
    if (this.chassis) {
        this.scene.remove(this.chassis);
        // Dispose of chassis materials and geometries
        this.chassis.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        this.chassis = null;
    }
    
    // Remove wheels from scene
    this.wheels.forEach((wheel, index) => {
        if (wheel) {
            this.scene.remove(wheel);
            // Dispose of wheel materials and geometries
            wheel.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
    });
    this.wheels = [];
    
    // Remove car from physics world
    if (this.car) {
        if (this.car.chassisBody) {
            // Clear user data
            this.car.chassisBody.userData = null;
            
            // Remove from world
            this.world.removeBody(this.car.chassisBody);
        }
        
        // Remove wheel bodies if they exist
        if (this.car.wheelInfos) {
            this.car.wheelInfos.forEach((wheelInfo, index) => {
                if (wheelInfo.body) {
                    this.world.removeBody(wheelInfo.body);
                }
            });
        }
        
        // Remove the vehicle from the world
        this.car.removeFromWorld(this.world);
        this.car = null;
    }
    
    // Clear all references
    this.scene = null;
    this.world = null;
    this.path = null;
    this.startPoint = null;
    this.endPoint = null;
    this.lastPosition = null;
    
    console.log(`AI Car ${this.carId} cleanup complete`);
}

// Audio configuration methods
setAudioConfiguration(config = {}) {
    this.minDistance = config.minDistance || 5;
    this.maxDistance = config.maxDistance || 50;
    this.baseVolume = config.baseVolume || 1.0;
    this.audioStartTime = config.startTime || 0.3;
    this.audioEndOffset = config.endOffset || 0.3;
    
    console.log(`Audio config updated: Min=${this.minDistance}, Max=${this.maxDistance}, Volume=${this.baseVolume}`);
}
}
