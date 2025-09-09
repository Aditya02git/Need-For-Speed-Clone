import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export default class AIHelicopter {
constructor(scene, world, targetCar, startPosition = { x: 0, y: 20, z: 0 }) {
  this.scene = scene;
  this.world = world;
  this.targetCar = targetCar; // Reference to the player's car
  this.startPosition = startPosition;

  // Helicopter physics body
  this.helicopterBody = null;
  this.helicopterMesh = null;

  // Animation system
  this.mixer = null;
  this.clock = new THREE.Clock(); // Add clock for animation timing

  // Helicopter parameters
  this.mass = 500;
  this.followHeight = 12; // Height above car
  this.followDistance = 8; // Distance ahead of car
  this.maxForce = 8000; // Maximum force to apply
  
  // Movement parameters
  this.targetPosition = new THREE.Vector3();
  this.currentVelocity = new THREE.Vector3();
  this.maxSpeed = 15;
  
  // NEW: Add minimum return height to prevent ground touching
  this.minReturnHeight = 8; // Minimum height during return (above ground)
  
  // Rotation parameters for directional facing
  this.targetQuaternion = new THREE.Quaternion();
  this.currentQuaternion = new THREE.Quaternion();
  this.rotationSpeed = 0.01; // How fast the helicopter rotates to face direction
  this.lastVelocity = new THREE.Vector3();
  this.velocitySmoothing = 0.1; // Smoothing factor for velocity changes

  // Box shooting system
  this.lastShotTime = 0;
  this.shotInterval = 250; // Shoot box every 1.5 seconds
  this.boxSize = 0.8;
  this.shotBoxes = [];
  this.maxBoxes = 1;
  this.shotSpeed = 150; // Speed at which boxes are shot
  this.shootingDistance = 10; // Distance threshold for shooting

  // Rotor references
  this.mainRotor = null;
  this.tailRotor = null;
  this.rotorSpeed = 0;

  // AI state
  this.isActive = true;
  this.isInitialized = false;

  // Active time management
  this.activeTime = 15000; // 15 seconds active time (in milliseconds)
  this.breakTime = 10000; // 10 seconds break time (in milliseconds)
  this.activationStartTime = 0;
  this.breakStartTime = 0;
  this.currentState = "active"; // 'active', 'returning', 'break'
  this.returnSpeed = 0.02; // Speed of return to initial position
  this.isReturning = false;

  // Audio system
  this.audio = null;
  this.audioLoaded = false;
  this.minDistance = 5; // Distance at which volume starts decreasing
  this.maxDistance = 50; // Distance at which volume becomes 0
  this.baseVolume = 1.0; // Maximum volume (100%)
  this.currentVolume = 0;
  this.audioStartTime = 0.3; // Start loop at 0.3 seconds
  this.audioEndOffset = 0.3; // End loop 0.3 seconds before total duration

  // Debug
  this.debugCounter = 0;
}

  init() {
    console.log("🚁 Initializing AI Helicopter");
    this.loadModel();
    this.loadAudio();
    this.initAudio();
    this.createPhysicsBody();
    this.startMovementLoop();
    this.update();

    // Start the activation timer
    this.activationStartTime = Date.now();
    console.log(
      `🚁 Helicopter activated for ${this.activeTime / 1000} seconds`
    );
  }

  loadModel() {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      "./car/heli.glb",
      (gltf) => {
        this.helicopterMesh = gltf.scene;

        // Create animation mixer
        this.mixer = new THREE.AnimationMixer(this.helicopterMesh);

        // Find and play the "Rotor" animation
        let rotorAnimationFound = false;
        gltf.animations.forEach((clip) => {
          console.log("Found animation clip:", clip.name); // Debug log
          if (
            clip.name === "Rotor" ||
            clip.name.toLowerCase().includes("rotor")
          ) {
            const action = this.mixer.clipAction(clip);
            action.timeScale = 8; // 🔥 2x faster
            action.play();
            action.setLoop(THREE.LoopRepeat);
            rotorAnimationFound = true;
            console.log("🎞️ Playing 'Rotor' animation at 2x speed:", clip.name);
          }
        });

        if (!rotorAnimationFound) {
          console.warn(
            "⚠️ No 'Rotor' animation found. Available animations:",
            gltf.animations.map((clip) => clip.name)
          );
        }

        this.helicopterMesh.traverse((object) => {
          if (object.isMesh) {
            if (object.name === "Object_7") {
              object.castShadow = true;
              object.receiveShadow = false; // Optional: skip receiving shadows
              console.log("☀️ 'Object_7' will cast shadow.");
            } else {
              object.castShadow = false;
              object.receiveShadow = false;
            }
          }

          const name = object.name.toLowerCase();
          if (
            name.includes("rotor") ||
            name.includes("blade") ||
            name.includes("prop")
          ) {
            if (object.position.y > 0.5 || name.includes("main")) {
              this.mainRotor = object;
              console.log("Found main rotor:", object.name);
            } else if (name.includes("tail")) {
              this.tailRotor = object;
              console.log("Found tail rotor:", object.name);
            }
          }
        });

        this.helicopterMesh.scale.set(5, 5, 5);
        this.helicopterMesh.position.copy(this.startPosition);
        this.scene.add(this.helicopterMesh);

        this.isInitialized = true;
        console.log("✅ Helicopter model loaded");
      },
      undefined,
      (error) => {
        console.error("❌ Error loading helicopter model:", error);
      }
    );
  }

  loadAudio() {
  console.log("🔊 Loading helicopter audio...");
  this.audio = new Audio('./sounds/helicopter_sound.mp3'); // Adjust path as needed
  
  this.audio.loop = false; // We'll handle looping manually
  this.audio.volume = 0;
  this.audio.preload = 'auto';
  
  this.audio.addEventListener('loadedmetadata', () => {
    console.log(`🔊 Audio loaded. Duration: ${this.audio.duration.toFixed(2)}s`);
    this.audioLoaded = true;
    this.setupAudioLoop();
  });
  
  this.audio.addEventListener('error', (e) => {
    // console.error("Error loading helicopter audio:", e);
  });
}

setupAudioLoop() {
  if (!this.audioLoaded) return;
  
  const duration = this.audio.duration;
  const loopEnd = duration - this.audioEndOffset;
  
  this.audio.addEventListener('timeupdate', () => {
    if (this.audio.currentTime >= loopEnd) {
      this.audio.currentTime = this.audioStartTime;
    }
  });
  
  // Start playing from the specified start time
  this.audio.currentTime = this.audioStartTime;
}


initAudio() {
  this.audio3 = new Audio('./sounds/fire.mp3');
  this.audio3.loop = true;
  this.audio3.volume = 1; // Adjust volume as needed (0.0 to 1.0)
  
  // Handle audio loading errors
  this.audio3.onerror = () => {
    console.warn('Could not load audio.mp3');
  };
  
  // Preload the audio
  this.audio3.preload = 'auto';
}
  createPhysicsBody() {
    // Create helicopter physics body
    const shape = new CANNON.Box(new CANNON.Vec3(1.5, 0.8, 3));

    this.helicopterBody = new CANNON.Body({
      mass: this.mass,
      material: new CANNON.Material({ friction: 0.2, restitution: 0.1 }),
    });

    this.helicopterBody.addShape(shape);
    this.helicopterBody.position.set(
      this.startPosition.x,
      this.startPosition.y,
      this.startPosition.z
    );

    // Less damping for more responsive movement
    this.helicopterBody.linearDamping = 0.3;
    this.helicopterBody.angularDamping = 0.7;

    this.world.addBody(this.helicopterBody);
    console.log("✅ Helicopter physics body created");
  }

  startMovementLoop() {
    // Main movement and behavior loop
    const moveLoop = () => {
      if (this.isActive) {
        this.updateActiveTimeState(); // NEW: Check active time state

        if (this.currentState === "active") {
          this.updateMovement();
          this.updateRotation();
          this.updateRotors();
          this.updateAnimations();
          this.checkShootBox();
        } else if (this.currentState === "returning") {
          this.updateReturnToStart();
          this.updateRotors();
          this.updateAnimations();
        } else if (this.currentState === "break") {
          this.updateBreakTime();
          this.updateRotors();
          this.updateAnimations();
        }
      }
      requestAnimationFrame(moveLoop);
    };
    moveLoop();
    console.log("✅ Movement loop started");
  }

  // NEW: Update active time state management
updateActiveTimeState() {
  const now = Date.now();

  if (this.currentState === "active") {
    // Check if active time has expired
    if (now - this.activationStartTime >= this.activeTime) {
      this.currentState = "returning";
      this.isReturning = true;
      console.log(`🚁 Active time expired, returning to start position`);
    }
  } else if (this.currentState === "returning") {
    // Check if helicopter has returned to start position (with proper height consideration)
    if (this.helicopterBody) {
      const safeReturnHeight = Math.max(this.startPosition.y, this.minReturnHeight);
      const horizontalDistance = Math.sqrt(
        Math.pow(this.helicopterBody.position.x - this.startPosition.x, 2) +
        Math.pow(this.helicopterBody.position.z - this.startPosition.z, 2)
      );
      const verticalDistance = Math.abs(this.helicopterBody.position.y - safeReturnHeight);
      const totalDistance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);

      if (totalDistance < 2.5) {
        // Close enough to start position (with safe height)
        this.currentState = "break";
        this.breakStartTime = now;
        this.isReturning = false;
        console.log(
          `🚁 Reached start position at safe height (${safeReturnHeight.toFixed(1)}m), starting break for ${
            this.breakTime / 1000
          } seconds`
        );
      }
    }
  } else if (this.currentState === "break") {
    // Check if break time has expired
    if (now - this.breakStartTime >= this.breakTime) {
      this.currentState = "active";
      this.activationStartTime = now;
      console.log(
        `🚁 Break time over, helicopter reactivated for ${
          this.activeTime / 1000
        } seconds`
      );
    }
  }
  
  // Update audio for active state
  if (this.currentState === "active") {
    this.updateAudio();
  }
}

updateReturnToStart() {
  if (!this.helicopterBody) return;

  const heliPos = this.helicopterBody.position;
  
  // Calculate safe return position (ensure minimum height)
  const safeReturnHeight = Math.max(this.startPosition.y, this.minReturnHeight);
  const safeStartPos = {
    x: this.startPosition.x,
    y: safeReturnHeight,
    z: this.startPosition.z
  };

  // Calculate distances separately for better control
  const horizontalDist = Math.sqrt(
    Math.pow(safeStartPos.x - heliPos.x, 2) +
    Math.pow(safeStartPos.z - heliPos.z, 2)
  );
  const verticalDist = Math.abs(safeStartPos.y - heliPos.y);

  // Reset forces
  this.helicopterBody.force.set(0, 0, 0);

  // Horizontal return force (X and Z)
  if (horizontalDist > 0.5) {
    const horizontalForce = Math.min(horizontalDist * 350, this.maxForce * 0.7);
    const forceX = ((safeStartPos.x - heliPos.x) / horizontalDist) * horizontalForce;
    const forceZ = ((safeStartPos.z - heliPos.z) / horizontalDist) * horizontalForce;

    this.helicopterBody.force.x = forceX;
    this.helicopterBody.force.z = forceZ;
  }

  // Vertical return force (Y) - maintain safe height
  const baseGravityForce = this.mass * 9.82; // Counter gravity
  let verticalForce = baseGravityForce;

  // Height correction force
  if (verticalDist > 0.5) {
    const heightDifference = safeStartPos.y - heliPos.y;
    let verticalAdjustment = heightDifference * 250;
    
    // If helicopter is below minimum return height, apply stronger upward force
    if (heliPos.y < this.minReturnHeight) {
      const emergencyLift = (this.minReturnHeight - heliPos.y) * 400;
      verticalAdjustment = Math.max(verticalAdjustment, emergencyLift);
      console.log(`🚁 Emergency lift applied: ${emergencyLift.toFixed(1)}N (height: ${heliPos.y.toFixed(1)}m)`);
    }
    
    verticalForce += verticalAdjustment;
  }

  // Ensure minimum upward force if too low
  if (heliPos.y < this.minReturnHeight - 1) {
    verticalForce = Math.max(verticalForce, baseGravityForce * 1.5);
  }

  // Limit vertical force to prevent excessive movement
  verticalForce = Math.max(
    baseGravityForce * 0.3,
    Math.min(baseGravityForce * 2.5, verticalForce)
  );
  this.helicopterBody.force.y = verticalForce;

  // Apply stabilization (reduced Y-axis damping to allow rotation)
  const angVel = this.helicopterBody.angularVelocity;
  const torque = new CANNON.Vec3(
    -angVel.x * 100,
    -angVel.y * 50,  // Reduced to allow Y-axis rotation
    -angVel.z * 100
  );
  this.helicopterBody.torque.set(torque.x, torque.y, torque.z);

  // Apply velocity damping
  const currentVel = this.helicopterBody.velocity;
  const speed = currentVel.length();
  const maxReturnSpeed = 10;
  if (speed > maxReturnSpeed) {
    const dampingFactor = maxReturnSpeed / speed;
    this.helicopterBody.velocity.scale(dampingFactor);
  }

  // Update rotation to face movement direction during return
  this.updateRotationDuringReturn();
  
  // Update audio during return
  this.updateAudio();

  // Debug info for return state
  if (this.debugCounter % 120 === 0) { // Every 2 seconds
    // console.log(
    //   `RETURNING - Current: (${heliPos.x.toFixed(1)},${heliPos.y.toFixed(1)},${heliPos.z.toFixed(1)}) | ` +
    //   `Target: (${safeStartPos.x.toFixed(1)},${safeStartPos.y.toFixed(1)},${safeStartPos.z.toFixed(1)}) | ` +
    //   `H-Dist: ${horizontalDist.toFixed(1)} | V-Dist: ${verticalDist.toFixed(1)} | ` +
    //   `Safe Height: ${safeReturnHeight.toFixed(1)}m`
    // );
  }
}

  // NEW METHOD: Update helicopter rotation during return to face movement direction
  updateRotationDuringReturn() {
    if (!this.helicopterBody || !this.helicopterMesh) {
      return;
    }

    // Get current velocity
    const velocity = this.helicopterBody.velocity;
    const currentVel = new THREE.Vector3(velocity.x, velocity.y, velocity.z);

    // Smooth the velocity to avoid jittery rotation
    this.lastVelocity.lerp(currentVel, this.velocitySmoothing);

    // Only rotate if moving with significant speed (avoid rotation when stationary)
    const speed = this.lastVelocity.length();
    if (speed > 1.0) {  // Lower threshold for return movement
      // Calculate the direction vector (normalize velocity)
      const direction = this.lastVelocity.clone().normalize();

      // Create a quaternion that looks in the direction of movement
      const lookAtMatrix = new THREE.Matrix4();
      const up = new THREE.Vector3(0, 1, 0);
      const position = new THREE.Vector3(0, 0, 0);
      const target = direction.clone();

      lookAtMatrix.lookAt(position, target, up);
      this.targetQuaternion.setFromRotationMatrix(lookAtMatrix);

      // Get current rotation
      this.currentQuaternion.copy(this.helicopterMesh.quaternion);

      // Smoothly interpolate to the target rotation (slightly faster during return)
      this.currentQuaternion.slerp(this.targetQuaternion, this.rotationSpeed * 1.5);

      // Apply the rotation to the mesh
      this.helicopterMesh.quaternion.copy(this.currentQuaternion);

      // Optional: Add slight banking/tilting effect based on turn rate
      const turnRate = this.getTurnRate();
      if (Math.abs(turnRate) > 0.1) {
        // Add banking rotation around the forward axis
        const bankAngle = Math.max(-0.3, Math.min(0.3, turnRate * 0.5));
        const bankQuaternion = new THREE.Quaternion();
        bankQuaternion.setFromAxisAngle(direction, bankAngle);
        this.helicopterMesh.quaternion.multiplyQuaternions(
          this.helicopterMesh.quaternion,
          bankQuaternion
        );
      }
    }
  }

updateBreakTime() {
  if (!this.helicopterBody) return;

  const heliPos = this.helicopterBody.position;
  
  // Calculate safe break position (ensure minimum height)
  const safeBreakHeight = Math.max(this.startPosition.y, this.minReturnHeight);
  const safeStartPos = {
    x: this.startPosition.x,
    y: safeBreakHeight,
    z: this.startPosition.z
  };

  // Keep helicopter at safe start position during break
  this.helicopterBody.force.set(0, 0, 0);

  // Position maintenance forces
  const positionForce = 250;
  this.helicopterBody.force.x = (safeStartPos.x - heliPos.x) * positionForce;
  this.helicopterBody.force.z = (safeStartPos.z - heliPos.z) * positionForce;

  // Vertical force with safe height consideration
  const baseGravityForce = this.mass * 9.82;
  let verticalForce = (safeStartPos.y - heliPos.y) * positionForce + baseGravityForce;
  
  // Emergency lift if too low during break
  if (heliPos.y < this.minReturnHeight) {
    const emergencyLift = (this.minReturnHeight - heliPos.y) * 500;
    verticalForce = Math.max(verticalForce, baseGravityForce + emergencyLift);
  }

  this.helicopterBody.force.y = verticalForce;

  // Strong stabilization during break
  const angVel = this.helicopterBody.angularVelocity;
  const torque = new CANNON.Vec3(
    -angVel.x * 200,
    -angVel.y * 200,
    -angVel.z * 200
  );
  this.helicopterBody.torque.set(torque.x, torque.y, torque.z);

  // Limit velocity during break
  const currentVel = this.helicopterBody.velocity;
  const speed = currentVel.length();
  const maxBreakSpeed = 3;
  if (speed > maxBreakSpeed) {
    const dampingFactor = maxBreakSpeed / speed;
    this.helicopterBody.velocity.scale(dampingFactor);
  }

  // Update audio during break
  this.updateAudio();
}

setMinReturnHeight(height) {
  this.minReturnHeight = Math.max(3, height); // Minimum 3 meters above ground
  console.log(`🚁 Minimum return height set to: ${this.minReturnHeight}m`);
}

  // NEW METHOD: Update animations
  updateAnimations() {
    if (this.mixer) {
      const delta = this.clock.getDelta();
      this.mixer.update(delta);
    }
  }

  updateAudio() {
  if (!this.audioLoaded || !this.audio || !this.helicopterBody || !this.targetCar?.car?.chassisBody) {
    return;
  }

  // Calculate distance between helicopter and car
  const heliPos = this.helicopterBody.position;
  const carPos = this.targetCar.car.chassisBody.position;
  const distance = Math.sqrt(
    Math.pow(carPos.x - heliPos.x, 2) +
    Math.pow(carPos.y - heliPos.y, 2) +
    Math.pow(carPos.z - heliPos.z, 2)
  );

  // Calculate volume based on distance (inverse relationship)
  let volumeRatio = 1.0;
  if (distance > this.minDistance) {
    if (distance >= this.maxDistance) {
      volumeRatio = 0;
    } else {
      // Linear interpolation between minDistance and maxDistance
      volumeRatio = 1.0 - ((distance - this.minDistance) / (this.maxDistance - this.minDistance));
    }
  }

  this.currentVolume = volumeRatio * this.baseVolume;
  this.audio.volume = this.currentVolume;

  // Start/stop audio based on helicopter state and volume
  if (this.currentState === "active" || this.currentState === "returning") {
    if (this.audio.paused && this.currentVolume > 0) {
      this.audio.currentTime = this.audioStartTime;
      this.audio.play().catch(e => console.warn("Audio play failed:", e));
    }
  } else if (this.currentState === "break") {
    if (!this.audio.paused) {
      this.audio.pause();
    }
  }
}

  // NEW METHOD: Update helicopter rotation to face movement direction
  updateRotation() {
    if (!this.helicopterBody || !this.helicopterMesh) {
      return;
    }

    // Get current velocity
    const velocity = this.helicopterBody.velocity;
    const currentVel = new THREE.Vector3(velocity.x, velocity.y, velocity.z);

    // Smooth the velocity to avoid jittery rotation
    this.lastVelocity.lerp(currentVel, this.velocitySmoothing);

    // Only rotate if moving with significant speed (avoid rotation when stationary)
    const speed = this.lastVelocity.length();
    if (speed > 2.0) {
      // Calculate the direction vector (normalize velocity)
      const direction = this.lastVelocity.clone().normalize();

      // Create a quaternion that looks in the direction of movement
      // We use lookAt to create the rotation matrix, then extract quaternion
      const lookAtMatrix = new THREE.Matrix4();
      const up = new THREE.Vector3(0, 1, 0);
      const position = new THREE.Vector3(0, 0, 0);
      const target = direction.clone();

      lookAtMatrix.lookAt(position, target, up);
      this.targetQuaternion.setFromRotationMatrix(lookAtMatrix);

      // Get current rotation
      this.currentQuaternion.copy(this.helicopterMesh.quaternion);

      // Smoothly interpolate to the target rotation
      this.currentQuaternion.slerp(this.targetQuaternion, this.rotationSpeed);

      // Apply the rotation to the mesh (not the physics body to avoid conflicts)
      this.helicopterMesh.quaternion.copy(this.currentQuaternion);

      // Optional: Add slight banking/tilting effect based on turn rate
      const turnRate = this.getTurnRate();
      if (Math.abs(turnRate) > 0.1) {
        // Add banking rotation around the forward axis
        const bankAngle = Math.max(-0.3, Math.min(0.3, turnRate * 0.5));
        const bankQuaternion = new THREE.Quaternion();
        bankQuaternion.setFromAxisAngle(direction, bankAngle);
        this.helicopterMesh.quaternion.multiplyQuaternions(
          this.helicopterMesh.quaternion,
          bankQuaternion
        );
      }
    }
  }

  // Helper method to calculate turn rate for banking effect
  getTurnRate() {
    if (!this.helicopterBody) return 0;

    const velocity = this.helicopterBody.velocity;
    const angularVelocity = this.helicopterBody.angularVelocity;

    // Simple approximation of turn rate based on angular velocity
    return angularVelocity.y;
  }

  updateMovement() {
    if (!this.helicopterBody || !this.targetCar?.car?.chassisBody) {
      return;
    }

    // Get car position and velocity
    const carPos = this.targetCar.car.chassisBody.position;
    const carVel = this.targetCar.car.chassisBody.velocity;
    const heliPos = this.helicopterBody.position;

    // Calculate where car will be (much shorter prediction for closer following)
    const carSpeed = Math.sqrt(carVel.x * carVel.x + carVel.z * carVel.z);
    const predictionTime = Math.max(0.2, Math.min(1.0, carSpeed * 0.05));

    // Get car's forward direction
    const carQuat = this.targetCar.car.chassisBody.quaternion;
    const carForward = new CANNON.Vec3(0, 0, 1);
    carQuat.vmult(carForward, carForward);

    // Calculate target position (directly above and slightly behind car)
    this.targetPosition.set(
      carPos.x + carForward.x * this.followDistance + carVel.x * predictionTime,
      carPos.y + this.followHeight,
      carPos.z + carForward.z * this.followDistance + carVel.z * predictionTime
    );

    // Calculate distance in 3D and separate horizontal/vertical distances
    const horizontalDist = Math.sqrt(
      Math.pow(this.targetPosition.x - heliPos.x, 2) +
        Math.pow(this.targetPosition.z - heliPos.z, 2)
    );
    const verticalDist = Math.abs(this.targetPosition.y - heliPos.y);
    const totalDistance = Math.sqrt(
      horizontalDist * horizontalDist + verticalDist * verticalDist
    );

    // Reset forces
    this.helicopterBody.force.set(0, 0, 0);

    // Horizontal movement force (X and Z)
    if (horizontalDist > 2.0) {
      const horizontalForce = Math.min(horizontalDist * 400, this.maxForce);
      const forceX =
        ((this.targetPosition.x - heliPos.x) / horizontalDist) *
        horizontalForce;
      const forceZ =
        ((this.targetPosition.z - heliPos.z) / horizontalDist) *
        horizontalForce;

      this.helicopterBody.force.x = forceX;
      this.helicopterBody.force.z = forceZ;
    }

    // Vertical movement force (Y) - separate control for height
    const baseGravityForce = this.mass * 9.82; // Counter gravity
    let verticalForce = baseGravityForce;

    if (verticalDist > 1.0) {
      const heightDifference = this.targetPosition.y - heliPos.y;
      const verticalAdjustment = heightDifference * 200; // Adjust this multiplier as needed
      verticalForce += verticalAdjustment;
    }

    // Limit vertical force to prevent excessive climbing/diving
    verticalForce = Math.max(
      baseGravityForce * 0.5,
      Math.min(baseGravityForce * 2.0, verticalForce)
    );
    this.helicopterBody.force.y = verticalForce;

    // Reduced stabilization to allow for rotation
    const angVel = this.helicopterBody.angularVelocity;
    const torque = new CANNON.Vec3(
      -angVel.x * 100, // Reduced from 150
      -angVel.y * 50, // Greatly reduced from 100 to allow Y-axis rotation
      -angVel.z * 100 // Reduced from 150
    );
    this.helicopterBody.torque.set(torque.x, torque.y, torque.z);

    // Apply velocity damping if too fast
    const currentVel = this.helicopterBody.velocity;
    const speed = currentVel.length();
    if (speed > this.maxSpeed) {
      const dampingFactor = this.maxSpeed / speed;
      this.helicopterBody.velocity.scale(dampingFactor);
    }

    // Debug info (every 60 frames ≈ 1 second)
    // this.debugCounter++;
    // if (this.debugCounter % 60 === 0) {
    //   console.log(
    //     `🚁 Heli: (${heliPos.x.toFixed(1)},${heliPos.y.toFixed(
    //       1
    //     )},${heliPos.z.toFixed(1)}) | Car: (${carPos.x.toFixed(
    //       1
    //     )},${carPos.y.toFixed(1)},${carPos.z.toFixed(
    //       1
    //     )}) | H-Dist: ${horizontalDist.toFixed(
    //       1
    //     )} | V-Dist: ${verticalDist.toFixed(1)} | State: ${this.currentState}`
    //   );
    // }
  }

  updateRotors() {
    if (!this.helicopterBody) return;

    const speed = this.helicopterBody.velocity.length();
    this.rotorSpeed = Math.min(30 + speed * 2, 60);

    // Manual rotor rotation (backup if animation doesn't work)
    if (this.mainRotor) {
      this.mainRotor.rotation.y += this.rotorSpeed * 0.02;
    }

    if (this.tailRotor) {
      this.tailRotor.rotation.x += this.rotorSpeed * 0.025;
    }
  }

// MODIFIED: Check if should shoot based on distance and active state
  checkShootBox() {
    if (
      !this.helicopterBody ||
      !this.targetCar?.car?.chassisBody ||
      this.currentState !== "active"
    ) {
      // Stop shooting sound if not in active state or no valid targets
      this.stopShootingSound();
      return;
    }

    // Calculate distance between helicopter and car
    const heliPos = this.helicopterBody.position;
    const carPos = this.targetCar.car.chassisBody.position;
    const distance = Math.sqrt(
      Math.pow(carPos.x - heliPos.x, 2) +
        Math.pow(carPos.y - heliPos.y, 2) +
        Math.pow(carPos.z - heliPos.z, 2)
    );

    // Only shoot if distance is less than shooting distance threshold
    if (distance < this.shootingDistance) {
      const now = Date.now();
      if (now - this.lastShotTime > this.shotInterval) {
        this.shootBoxAtCar();
        this.lastShotTime = now;
      }
    } else {
      // Stop shooting sound if target is out of range
      this.stopShootingSound();
    }
  }

shootBoxAtCar() {
  if (!this.helicopterBody || !this.targetCar?.car?.chassisBody) {
    return;
  }

  // Play sound when shooting (only if not already playing)
  if (this.audio3 && this.audio3.paused) {
    this.audio3.play().catch(error => {
      console.warn('Audio play failed:', error);
    });
  }

  // Get current time for box creation
  const now = Date.now();

  // Clean up old boxes
  this.cleanupOldBoxes();

  // Get helicopter and car positions
  const heliPos = this.helicopterBody.position;
  const carPos = this.targetCar.car.chassisBody.position;

  // Calculate direction from helicopter to car
  const direction = new THREE.Vector3(
    carPos.x - heliPos.x,
    carPos.y - heliPos.y,
    carPos.z - heliPos.z
  );

  // Normalize the direction vector
  const distance = direction.length();
  direction.normalize();

  // Create box at helicopter position (slightly below)
  const boxStartPos = new THREE.Vector3(
    heliPos.x,
    heliPos.y - 2, // Start slightly below helicopter
    heliPos.z
  );

  // Create box visual
  const boxGeometry = new THREE.BoxGeometry(
    this.boxSize * 0.05,
    this.boxSize * 1.5,
    this.boxSize *0.05
  );
  const boxMaterial = new THREE.MeshPhongMaterial({
    color: 0xff4500,       // OrangeRed
  emissive: 0xff8c00,    // DarkOrange glow
  shininess: 80,
  specular: 0xffd700     // Golden specular highlights
  });
  const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
  boxMesh.position.copy(boxStartPos);
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;

  // Create box physics
  const boxShape = new CANNON.Box(
    new CANNON.Vec3(
      this.boxSize * 0.5,
      this.boxSize * 0.5,
      this.boxSize * 0.5
    )
  );

  const boxBody = new CANNON.Body({
    mass: 15,
    material: new CANNON.Material({ friction: 0.9, restitution: 0.2 }),
  });

  boxBody.addShape(boxShape);
  boxBody.position.set(boxStartPos.x, boxStartPos.y, boxStartPos.z);

  boxBody.userData = { type: "bomb", car: this };

  // Set velocity to shoot toward car
  const shotVelocity = new CANNON.Vec3(
    direction.x * this.shotSpeed,
    direction.y * this.shotSpeed,
    direction.z * this.shotSpeed
  );

  boxBody.velocity.copy(shotVelocity);

  // Add to scene and physics world
  this.scene.add(boxMesh);
  this.world.addBody(boxBody);

  // Store for updates and cleanup
  this.shotBoxes.push({
    mesh: boxMesh,
    body: boxBody,
    createdTime: now,
  });

  // console.log(
  //   `🎯 Box shot at car! Distance: ${distance.toFixed(
  //     1
  //   )}m, Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(
  //     2
  //   )}, ${direction.z.toFixed(2)})`
  // );
}

// Stop the shooting sound
stopShootingSound() {
  if (this.audio3 && !this.audio3.paused) {
    this.audio3.pause();
    this.audio3.currentTime = 0; // Reset to beginning
  }
}

  cleanupOldBoxes() {
    const now = Date.now();
    const maxAge = 100; // 1 seconds

    // Remove old boxes
    this.shotBoxes = this.shotBoxes.filter((boxData) => {
      const age = now - boxData.createdTime;
      const shouldRemove =
        age > maxAge || this.shotBoxes.length > this.maxBoxes;

      if (shouldRemove) {
        this.scene.remove(boxData.mesh);
        this.world.removeBody(boxData.body);
        boxData.mesh.geometry.dispose();
        boxData.mesh.material.dispose();
        return false;
      }
      return true;
    });
  }

  update() {
    const updateWorld = () => {
      // Update helicopter mesh position (but not rotation - handled in updateRotation)
      if (this.helicopterMesh && this.helicopterBody) {
        this.helicopterMesh.position.copy(this.helicopterBody.position);
        // Don't copy quaternion here anymore - we handle rotation separately
      }

      // Update all shot boxes
      this.shotBoxes.forEach((boxData) => {
        if (boxData.mesh && boxData.body) {
          boxData.mesh.position.copy(boxData.body.position);
          boxData.mesh.quaternion.copy(boxData.body.quaternion);
        }
      });
    };

    this.world.addEventListener("postStep", updateWorld);
  }

  // Control methods
  setFollowDistance(distance) {
    this.followDistance = Math.max(3, distance);
    console.log(`🚁 Follow distance set to: ${this.followDistance}`);
  }

  setFollowHeight(height) {
    this.followHeight = Math.max(8, height);
    console.log(`🚁 Follow height set to: ${this.followHeight}`);
  }

  setShotInterval(interval) {
    this.shotInterval = Math.max(500, interval);
    console.log(`🚁 Shot interval set to: ${this.shotInterval}ms`);
  }

  setShotSpeed(speed) {
    this.shotSpeed = Math.max(5, Math.min(50, speed));
    console.log(`🚁 Shot speed set to: ${this.shotSpeed}`);
  }

  setRotationSpeed(speed) {
    this.rotationSpeed = Math.max(0.01, Math.min(0.2, speed));
    console.log(`🚁 Rotation speed set to: ${this.rotationSpeed}`);
  }

  // NEW: Method to set shooting distance threshold
  setShootingDistance(distance) {
    this.shootingDistance = Math.max(1, distance);
    console.log(`🚁 Shooting distance set to: ${this.shootingDistance}`);
  }

  // NEW: Methods to control active and break times
  setActiveTime(time) {
    this.activeTime = Math.max(5000, time); // Minimum 5 seconds
    console.log(`🚁 Active time set to: ${this.activeTime / 1000} seconds`);
  }

  setBreakTime(time) {
    this.breakTime = Math.max(2000, time); // Minimum 2 seconds
    console.log(`🚁 Break time set to: ${this.breakTime / 1000} seconds`);
  }

  // NEW: Force state change
  forceReturn() {
    this.currentState = "returning";
    this.isReturning = true;
    console.log(`🚁 Forced return to start position`);
  }

  forceActivate() {
    this.currentState = "active";
    this.activationStartTime = Date.now();
    console.log(`🚁 Forced activation`);
  }

  setActive(active) {
    this.isActive = active;
    console.log(`🚁 Helicopter ${active ? "activated" : "deactivated"}`);
  }

reset(position = this.startPosition) {
  // Ensure reset position has safe height
  const safeResetHeight = Math.max(position.y, this.minReturnHeight);
  const safePosition = {
    x: position.x,
    y: safeResetHeight,
    z: position.z
  };

  if (this.helicopterBody) {
    this.helicopterBody.position.set(safePosition.x, safePosition.y, safePosition.z);
    this.helicopterBody.velocity.set(0, 0, 0);
    this.helicopterBody.angularVelocity.set(0, 0, 0);
  }

  // Reset rotation tracking
  this.lastVelocity.set(0, 0, 0);
  this.currentQuaternion.set(0, 0, 0, 1);
  this.targetQuaternion.set(0, 0, 0, 1);

  // Reset state management
  this.currentState = "active";
  this.activationStartTime = Date.now();
  this.breakStartTime = 0;
  this.isReturning = false;

  // Clean up all boxes
  this.shotBoxes.forEach((boxData) => {
    this.scene.remove(boxData.mesh);
    this.world.removeBody(boxData.body);
    boxData.mesh.geometry.dispose();
    boxData.mesh.material.dispose();
  });
  this.shotBoxes = [];

  this.lastShotTime = 0;
  console.log(`🚁 Helicopter reset to safe position: (${safePosition.x}, ${safePosition.y}, ${safePosition.z})`);
}

  destroy() {
    this.isActive = false;

    if (this.helicopterMesh) {
      this.scene.remove(this.helicopterMesh);
    }

    if (this.helicopterBody) {
      this.world.removeBody(this.helicopterBody);
    }

    // Clean up all boxes
    this.shotBoxes.forEach((boxData) => {
      this.scene.remove(boxData.mesh);
      this.world.removeBody(boxData.body);
      boxData.mesh.geometry.dispose();
      boxData.mesh.material.dispose();
    });

    console.log("🚁 Helicopter destroyed");
  }

  // Audio control methods
setAudioVolume(volume) {
  this.baseVolume = Math.max(0, Math.min(1, volume));
  console.log(`🔊 Base volume set to: ${(this.baseVolume * 100).toFixed(0)}%`);
}

setAudioDistances(minDistance, maxDistance) {
  this.minDistance = Math.max(1, minDistance);
  this.maxDistance = Math.max(this.minDistance + 1, maxDistance);
  console.log(`🔊 Audio distances set - Min: ${this.minDistance}m, Max: ${this.maxDistance}m`);
}

setAudioLoop(startTime, endOffset) {
  this.audioStartTime = Math.max(0, startTime);
  this.audioEndOffset = Math.max(0, endOffset);
  console.log(`🔊 Audio loop set - Start: ${this.audioStartTime}s, End offset: ${this.audioEndOffset}s`);
  
  if (this.audioLoaded) {
    this.setupAudioLoop();
  }
}

  // Utility methods
getStatus() {
  const now = Date.now();
  let timeRemaining = 0;

  if (this.currentState === "active") {
    timeRemaining = Math.max(
      0,
      this.activeTime - (now - this.activationStartTime)
    );
  } else if (this.currentState === "break") {
    timeRemaining = Math.max(0, this.breakTime - (now - this.breakStartTime));
  }

  return {
    isActive: this.isActive,
    isInitialized: this.isInitialized,
    currentState: this.currentState,
    timeRemaining: Math.round(timeRemaining / 1000), // in seconds
    shotBoxes: this.shotBoxes.length,
    rotorSpeed: this.rotorSpeed,
    shotSpeed: this.shotSpeed,
    rotationSpeed: this.rotationSpeed,
    shootingDistance: this.shootingDistance,
    activeTime: this.activeTime / 1000,
    breakTime: this.breakTime / 1000,
    minReturnHeight: this.minReturnHeight, // NEW
    position: this.helicopterBody
      ? {
          x: this.helicopterBody.position.x,
          y: this.helicopterBody.position.y,
          z: this.helicopterBody.position.z,
        }
      : null,
    audio: {
      loaded: this.audioLoaded,
      playing: this.audio ? !this.audio.paused : false,
      currentVolume: Math.round(this.currentVolume * 100),
      baseVolume: Math.round(this.baseVolume * 100),
      minDistance: this.minDistance,
      maxDistance: this.maxDistance
    }
  };
}

  // NEW: Get time remaining in current state
  getTimeRemaining() {
    const now = Date.now();

    if (this.currentState === "active") {
      return Math.max(0, this.activeTime - (now - this.activationStartTime));
    } else if (this.currentState === "break") {
      return Math.max(0, this.breakTime - (now - this.breakStartTime));
    }

    return 0;
  }

  // NEW: Get current state info
  getStateInfo() {
    return {
      state: this.currentState,
      timeRemaining: Math.round(this.getTimeRemaining() / 1000),
      isReturning: this.isReturning,
      distanceToStart: this.helicopterBody
        ? Math.sqrt(
            Math.pow(this.helicopterBody.position.x - this.startPosition.x, 2) +
              Math.pow(
                this.helicopterBody.position.y - this.startPosition.y,
                2
              ) +
              Math.pow(this.helicopterBody.position.z - this.startPosition.z, 2)
          ).toFixed(1)
        : 0,
    };
  }


pauseSound() {

  // Clean up audio3
  if (this.audio3) {
    this.audio3.pause();
    // Only remove listeners if we have stored function references
    if (this.audio3TimeUpdateHandler) {
      this.audio3.removeEventListener('timeupdate', this.audio3TimeUpdateHandler);
    }
    if (this.audio3LoadedMetadataHandler) {
      this.audio3.removeEventListener('loadedmetadata', this.audio3LoadedMetadataHandler);
    }
    if (this.audio3ErrorHandler) {
      this.audio3.removeEventListener('error', this.audio3ErrorHandler);
    }
    this.audio3.src = '';
    this.audio3 = null;
  }

  // Clear handler references
  this.audioTimeUpdateHandler = null;
  this.audioLoadedMetadataHandler = null;
  this.audioErrorHandler = null;
  this.audio3TimeUpdateHandler = null;
  this.audio3LoadedMetadataHandler = null;
  this.audio3ErrorHandler = null;
  
  this.audioLoaded = false;
}  

playSound() {
  // Stop any currently playing audio first
  this.pauseSound();

  // Set up audio3 with fire sound
  this.audio3 = new Audio('./sounds/fire.mp3');
  
  this.audio3ErrorHandler = (error) => {
    console.error('Error playing fire sound:', error);
    this.onAudioError(error);
  };
  
  // Add event listeners for audio3
  this.audio3.addEventListener('timeupdate', this.audio3TimeUpdateHandler);
  this.audio3.addEventListener('loadedmetadata', this.audio3LoadedMetadataHandler);
  this.audio3.addEventListener('error', this.audio3ErrorHandler);
  
  this.audio3.play().catch(error => {
    console.error('Error playing fire sound:', error);
    this.onAudioError(error);
  });
}

cleanup() {
  console.log("🧹 Starting helicopter cleanup...");

  // Clean up audio
  if (this.audio) {
    this.audio.pause();
    // Only remove listeners if we have stored function references
    if (this.audioTimeUpdateHandler) {
      this.audio.removeEventListener('timeupdate', this.audioTimeUpdateHandler);
    }
    if (this.audioLoadedMetadataHandler) {
      this.audio.removeEventListener('loadedmetadata', this.audioLoadedMetadataHandler);
    }
    if (this.audioErrorHandler) {
      this.audio.removeEventListener('error', this.audioErrorHandler);
    }
    this.audio.src = '';
    this.audio = null;
  }

  // Clean up audio3
  if (this.audio3) {
    this.audio3.pause();
    // Only remove listeners if we have stored function references
    if (this.audio3TimeUpdateHandler) {
      this.audio3.removeEventListener('timeupdate', this.audio3TimeUpdateHandler);
    }
    if (this.audio3LoadedMetadataHandler) {
      this.audio3.removeEventListener('loadedmetadata', this.audio3LoadedMetadataHandler);
    }
    if (this.audio3ErrorHandler) {
      this.audio3.removeEventListener('error', this.audio3ErrorHandler);
    }
    this.audio3.src = '';
    this.audio3 = null;
  }

  // Clear handler references
  this.audioTimeUpdateHandler = null;
  this.audioLoadedMetadataHandler = null;
  this.audioErrorHandler = null;
  this.audio3TimeUpdateHandler = null;
  this.audio3LoadedMetadataHandler = null;
  this.audio3ErrorHandler = null;
  
  this.audioLoaded = false;
  
  // Stop the helicopter activity
  this.isActive = false;
  this.isInitialized = false;
  
  // Clean up all shot boxes first
  if (this.shotBoxes && Array.isArray(this.shotBoxes)) {
    this.shotBoxes.forEach((boxData) => {
      if (boxData.mesh) {
        if (this.scene) {
          this.scene.remove(boxData.mesh);
        }
        if (boxData.mesh.geometry) {
          boxData.mesh.geometry.dispose();
        }
        if (boxData.mesh.material) {
          if (Array.isArray(boxData.mesh.material)) {
            boxData.mesh.material.forEach(material => {
              if (material && typeof material.dispose === 'function') {
                material.dispose();
              }
            });
          } else if (typeof boxData.mesh.material.dispose === 'function') {
            boxData.mesh.material.dispose();
          }
        }
      }
      if (boxData.body && this.world) {
        this.world.removeBody(boxData.body);
      }
    });
    this.shotBoxes = [];
  }
  
  // Clean up animation mixer
  if (this.mixer) {
    this.mixer.stopAllAction();
    if (this.mixer.getRoot) {
      this.mixer.uncacheRoot(this.mixer.getRoot());
    }
    this.mixer = null;
  }
  
  // Clean up helicopter mesh and all its children
  if (this.helicopterMesh) {
    this.helicopterMesh.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry && typeof child.geometry.dispose === 'function') {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              if (material && typeof material.dispose === 'function') {
                material.dispose();
              }
            });
          } else if (typeof child.material.dispose === 'function') {
            child.material.dispose();
          }
        }
      }
    });
    
    if (this.scene) {
      this.scene.remove(this.helicopterMesh);
    }
    this.helicopterMesh = null;
  }
  
  // Clean up physics body
  if (this.helicopterBody && this.world) {
    this.world.removeBody(this.helicopterBody);
    this.helicopterBody = null;
  }
  
  // Clear rotor references
  this.mainRotor = null;
  this.tailRotor = null;
  
  // Reset all timers and states
  this.lastShotTime = 0;
  this.activationStartTime = 0;
  this.breakStartTime = 0;
  this.currentState = "active";
  this.isReturning = false;
  this.debugCounter = 0;
  
  // Clear position tracking vectors - only if they exist
  if (this.targetPosition && typeof this.targetPosition.set === 'function') {
    this.targetPosition.set(0, 0, 0);
  }
  if (this.currentVelocity && typeof this.currentVelocity.set === 'function') {
    this.currentVelocity.set(0, 0, 0);
  }
  if (this.lastVelocity && typeof this.lastVelocity.set === 'function') {
    this.lastVelocity.set(0, 0, 0);
  }
  if (this.currentQuaternion && typeof this.currentQuaternion.set === 'function') {
    this.currentQuaternion.set(0, 0, 0, 1);
  }
  if (this.targetQuaternion && typeof this.targetQuaternion.set === 'function') {
    this.targetQuaternion.set(0, 0, 0, 1);
  }
  
  // Clear references to external objects
  this.scene = null;
  this.world = null;
  this.targetCar = null;
  
  console.log("✅ Helicopter cleanup completed successfully");
}
}