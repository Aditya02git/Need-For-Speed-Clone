import * as THREE from "three";
import * as CANNON from "cannon-es";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Color } from "three/src/math/Color.js";
import Loader from "../loader/Loader";

export default class Lamborghini_Centenario {
  followTarget = new THREE.Object3D();
  pivot;
  constructor(
    scene,
    world,
    pivot,
    startPosition = { x: 0, y: 1, z: 0 },
    health = null,
    loadingManager
  ) {
    this.scene = scene;
    this.world = world;
    this.loadingManager = loadingManager;
    this.startPosition = new CANNON.Vec3(
      startPosition.x,
      startPosition.y,
      startPosition.z
    );

    this.car = {};
    this.chassis = {};
    this.wheels = [];
    this.chassisDimension = {
      x: 2.7,
      y: 1,
      z: 7,
    };
    this.chassisModelPos = {
      x: 0,
      y: 0,
      z: 0,
    };
    this.wheelScale = {
      frontWheel: 1.1,
      hindWheel: 1.1,
    };
    this.mass = 500; // change the mass to get effect => less it will be a super car & more  it will be a bulldozer
    this.pivot = pivot;
    this.maxForce = 1800;
    this.speedMultiplier = 1.5;

    // Brake light properties
    this.brakeLight = null;
    this.originalBrakeLightMaterial = null;
    this.isBraking = false;
    this.isReversing = false;

    // NEW: Animation properties
    this.mixer = null;
    this.boostAnimation = null;
    this.isBoostAnimationPlaying = false;
    this.animationClock = new THREE.Clock();

    // NEW: Drifting properties
    this.isDrifting = false;
    this.normalFriction = 2; // Original frictionSlip value
    this.driftFriction = 0.05; // Reduced friction for drifting
    this.driftSteerMultiplier = 1; // Increased steering sensitivity while drifting

    // Flip detection properties
    this.flipCheckInterval = 100; // Check every 100ms
    this.flipThreshold = Math.PI / 3; // 60 degrees - better for catching sideways flips
    this.timeUpsideDown = 0;
    this.flipResetDelay = 2000; // 2 seconds upside down before reset
    this.lastFlipCheck = 0;
    this.isFlipped = false;
    this.currentFlipType = "upright";

    this.health = health;
    this.wasDestroyed = false; // Track previous destroyed state
    this.controlsDisabled = false; // Track if controls are disabled

            // Initialize loader
        this.loader = new Loader(5, 'Loading Car Models...');
        this.isLoaded = false;
        
        // Set up completion callback
        this.loader.setOnComplete(() => {
            this.isLoaded = true;
            console.log('Car models loaded successfully!');
        });
  }

  // NEW: Setup animation mixer and boost animation
  setupAnimations(gltf) {
    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.chassis);

      // Find the "Boost" animation
      const boostAnimationClip = gltf.animations.find((clip) =>
        clip.name.includes("Boost")
      );

      if (boostAnimationClip) {
        this.boostAnimation = this.mixer.clipAction(boostAnimationClip);
        this.boostAnimation.setLoop(THREE.LoopRepeat);
        this.boostAnimation.clampWhenFinished = false;
        console.log(
          "Boost animation found and setup:",
          boostAnimationClip.name
        );
      } else {
        console.warn(
          "Boost animation not found. Available animations:",
          gltf.animations.map((anim) => anim.name)
        );
      }
    } else {
      console.warn("No animations found in the GLTF model");
    }
  }

  // NEW: Play boost animation
  playBoostAnimation() {
    if (this.boostAnimation && !this.isBoostAnimationPlaying) {
      this.boostAnimation.reset();
      this.boostAnimation.play();
      this.isBoostAnimationPlaying = true;
      console.log("Boost animation started");
    }
  }

  // NEW: Stop boost animation
  stopBoostAnimation() {
    if (this.boostAnimation && this.isBoostAnimationPlaying) {
      this.boostAnimation.stop();
      this.isBoostAnimationPlaying = false;
      console.log("Boost animation stopped");
    }
  }

  // NEW: Update animation mixer
  updateAnimations() {
    if (this.mixer) {
      const delta = this.animationClock.getDelta();
      this.mixer.update(delta);
    }
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
      color: 0xff0000, // Red color
      wireframe: true, // Enable wireframe mode
      transparent: true, // Make it semi-transparent
      opacity: 0.8, // Set opacity
    });

    // Create the wireframe mesh
    this.chassisWireframe = new THREE.Mesh(
      wireframeGeometry,
      wireframeMaterial
    );

    // Add to scene
    this.chassisWireframe.visible = false;
    this.scene.add(this.chassisWireframe);

    console.log(
      "Chassis wireframe created with dimensions:",
      this.chassisDimension
    );
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
      color: 0x00ff00, // Green color
      linewidth: 2, // Line thickness (may not work on all systems)
    });

    // Create the wireframe using LineSegments
    this.chassisWireframe = new THREE.LineSegments(edges, lineMaterial);

    // Add to scene
    this.scene.add(this.chassisWireframe);

    console.log(
      "Chassis wireframe edges created with dimensions:",
      this.chassisDimension
    );
  }

  // NEW: Drifting functions
  startDrift() {
    if (!this.isDrifting) {
      this.isDrifting = true;

      // Reduce rear wheel friction for drifting (wheels 0 and 1 are rear)
      if (this.car.wheelInfos && this.car.wheelInfos.length >= 4) {
        this.car.wheelInfos[0].frictionSlip = this.driftFriction;
        this.car.wheelInfos[1].frictionSlip = this.driftFriction;
        // Keep front wheels with normal friction for control
        this.car.wheelInfos[2].frictionSlip = this.normalFriction;
        this.car.wheelInfos[3].frictionSlip = this.normalFriction;
      }

      console.log("Drift mode activated!");
    }
  }

  stopDrift() {
    if (this.isDrifting) {
      this.isDrifting = false;

      // Restore normal friction to all wheels
      if (this.car.wheelInfos && this.car.wheelInfos.length >= 4) {
        for (let i = 0; i < 4; i++) {
          this.car.wheelInfos[i].frictionSlip = this.normalFriction;
        }
      }

      console.log("Drift mode deactivated.");
    }
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
    const rollAngle = Math.abs(euler.z); // Side-to-side flip (90° sideways)
    const pitchAngle = Math.abs(euler.x); // Front-to-back flip

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
          if (wheelY > chassisY + 0.5) {
            // Wheel is significantly above chassis
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
    if (!this.car.chassisBody) return "none";

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
      return "upside_down";
    } else if (Math.abs(rollAngle) > Math.PI / 3) {
      return rollAngle > 0 ? "right_side" : "left_side";
    } else if (Math.abs(pitchAngle) > Math.PI / 3) {
      return pitchAngle > 0 ? "nose_down" : "nose_up";
    } else if (upVector.y < 0.3) {
      return "tilted";
    }

    return "upright";
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
          const remainingTime =
            (this.flipResetDelay - this.timeUpsideDown) / 1000;
          console.log(
            `Auto-reset in ${remainingTime} seconds... (${flipType})`
          );
        }

        if (this.timeUpsideDown >= this.flipResetDelay) {
          console.log(
            `Car has been ${flipType} for too long. Auto-resetting...`
          );
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
  autoReset(flipType = "unknown") {
    // Get current position
    const currentPos = this.car.chassisBody.position;

    // Determine lift height based on flip type
    let liftHeight = 3;
    if (flipType === "upside_down") {
      liftHeight = 4; // Need more height when fully upside down
    } else if (flipType === "left_side" || flipType === "right_side") {
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

    console.log(
      `Car auto-reset completed. Was: ${flipType}, now upright at:`,
      currentPos
    );
  }

  // Front Light System with Dual Flares - Toggle with "L" key
  setupFrontLight() {
    if (!this.chassis) {
      console.warn("Chassis not loaded yet, cannot setup front light");
      return;
    }

    const flareTexture = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/lensflare/lensflare0.png"
    );

    this.frontLights = [];
    this.originalFrontLightMaterials = new Map();
    this.frontLightObjects = [];
    this.frontLightFlares = [];
    this.isFrontLightOn = false; // Track front light state

    this.chassis.traverse((child) => {
      // Add your front light object names here (e.g., "Object_XX" for headlights)
      if (child.name === "Object_87") {
        // Replace with actual names
        this.frontLights.push(child);
        this.frontLightObjects.push(child);

        if (child.material) {
          this.originalFrontLightMaterials.set(child, child.material.clone());
        }

        // Create TWO lens flare sprites with proper transparency settings
        const flareMaterial1 = new THREE.SpriteMaterial({
          map: flareTexture,
          color: 0xffffff, // White light for front lights
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
          alphaTest: 0.01,
        });

        const flareMaterial2 = new THREE.SpriteMaterial({
          map: flareTexture,
          color: 0xffffaa, // Slightly warm white for variation
          transparent: true,
          opacity: 0.7, // Slightly different opacity for variation
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
          alphaTest: 0.01,
        });

        // FIRST FLARE - Main flare (bright core)
        const flare1 = new THREE.Sprite(flareMaterial1);
        flare1.scale.set(1.5, 1.5, 1.5);
        flare1.visible = false;

        // SECOND FLARE - Secondary flare (larger halo)
        const flare2 = new THREE.Sprite(flareMaterial2);
        flare2.scale.set(1.5, 1.5, 1.5); // Larger halo effect
        flare2.visible = false;

        // Manual positioning with fixed offsets
        // Get the local position of the light object
        const localPos = child.position.clone();

        // Position FIRST FLARE - closer to the light
        const offset1 = new THREE.Vector3(0, 0, 0.5); // Forward offset for front lights
        flare1.position.copy(localPos).add(offset1);

        // Position SECOND FLARE - slightly further forward
        const offset2 = new THREE.Vector3(0, 0, 0.8); // Further forward
        flare2.position.copy(localPos).add(offset2);

        // Add both flares to the chassis (moves with car)
        this.chassis.add(flare1);
        this.chassis.add(flare2);
        // Store both flares in an array for this light
        this.frontLightFlares.push([flare1, flare2]);

        console.log(
          `Front light (${child.name}) setup with TWO lens flares at positions:`,
          [flare1.position, flare2.position]
        );
        console.log(`Light object position:`, child.position);
      }
    });

    if (this.frontLights.length === 0) {
      console.warn(
        "Front lights not found in chassis model - check object names"
      );
    }
  }

  // Toggle front lights (called by "L" key)
  toggleFrontLight() {
    if (this.isFrontLightOn) {
      this.deactivateFrontLight();
    } else {
      this.activateFrontLight();
    }
  }

  activateFrontLight() {
    if (this.frontLights && !this.isFrontLightOn) {
      this.isFrontLightOn = true;

      const emissiveColor = new THREE.Color(1, 1, 0.9).multiplyScalar(0.6); // Warm white
      const whiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: emissiveColor,
        emissiveIntensity: 15, // Bright for headlights
      });

      this.frontLights.forEach((mesh) => {
        mesh.material = whiteMaterial;
      });

      // Show both flares for each light
      this.frontLightFlares.forEach((flareArray) => {
        flareArray.forEach((flare) => {
          flare.visible = true;
        });
      });

      console.log("Front lights activated (with lens flare)");
    }
  }

  deactivateFrontLight() {
    if (this.frontLights && this.isFrontLightOn) {
      this.isFrontLightOn = false;

      this.frontLights.forEach((mesh) => {
        const original = this.originalFrontLightMaterials.get(mesh);
        if (original) mesh.material = original;
      });

      // Hide both flares for each light
      this.frontLightFlares.forEach((flareArray) => {
        flareArray.forEach((flare) => {
          flare.visible = false;
        });
      });

      console.log("Front lights deactivated (original state)");
    }
  }

  // IMPROVED: More precise flare position updating for TWO flares
  updateFrontLightFlarePositions() {
    if (!this.frontLights || !this.frontLightFlares) return;

    this.frontLights.forEach((light, index) => {
      if (this.frontLightFlares[index]) {
        const [flare1, flare2] = this.frontLightFlares[index];

        // METHOD 1: If flares are children of chassis, use local positioning
        if (flare1.parent === this.chassis) {
          const localPos = light.position.clone();

          // Update both flares with their respective offsets
          const offset1 = new THREE.Vector3(-1, -0.35, 3); // Forward for front lights
          const offset2 = new THREE.Vector3(1, -0.35, 3); // Further forward

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

          // Position flares in front of the car (front lights are at the front)
          const offset1 = carForward.clone().multiplyScalar(0.5);
          const offset2 = carForward.clone().multiplyScalar(0.8);

          flare1.position.copy(worldPos).add(offset1);
          flare2.position.copy(worldPos).add(offset2);
        }

        // METHOD 3: If flares are children of light object, no update needed
        // (they will automatically follow the light)
      }
    });
  }

  // BONUS: Helper method to manually adjust flare positions for TWO flares
  adjustFrontFlarePosition(lightIndex, flareIndex, offsetX, offsetY, offsetZ) {
    if (this.frontLightFlares && this.frontLightFlares[lightIndex]) {
      const flareArray = this.frontLightFlares[lightIndex];
      if (flareArray[flareIndex]) {
        const flare = flareArray[flareIndex];
        const light = this.frontLights[lightIndex];

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
          `Front Light ${lightIndex}, Flare ${flareIndex} adjusted to position:`,
          flare.position
        );
      }
    }
  }

  // BONUS: Helper method to adjust both flares at once
  adjustBothFrontFlares(lightIndex, offset1, offset2) {
    this.adjustFrontFlarePosition(
      lightIndex,
      0,
      offset1.x,
      offset1.y,
      offset1.z
    );
    this.adjustFrontFlarePosition(
      lightIndex,
      1,
      offset2.x,
      offset2.y,
      offset2.z
    );
  }

  // Key event handler for "L" key toggle
  handleFrontLightToggle(event) {
    if (event.key === "l" || event.key === "L") {
      this.toggleFrontLight();
    }
  }

  // Call this in your main initialization to set up the key listener
  setupFrontLightKeyListener() {
    document.addEventListener("keydown", (event) => {
      this.handleFrontLightToggle(event);
    });

    console.log(
      "Front light key listener setup - Press 'L' to toggle front lights"
    );
  }

  // NEW: Setup brake light functionality
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
      if (child.name === "Object_96") {
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
        flare1.scale.set(3, 1, 1);
        flare1.visible = false;

        // SECOND FLARE - Secondary flare (larger)
        const flare2 = new THREE.Sprite(flareMaterial2);
        flare2.scale.set(3, 1, 1); // Larger than first flare
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
        "Brake lights (Object_29 / Object_33) not found in chassis model"
      );
    }
  }

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
          const offset1 = new THREE.Vector3(0.8, 0, -3.4);
          const offset2 = new THREE.Vector3(-0.8, 0, -3.4);

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

  //--------------For Reverse Light----------------

  setupReverseLight() {
    if (!this.chassis) {
      console.warn("Chassis not loaded yet, cannot setup reverse light");
      return;
    }

    const flareTexture = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/lensflare/lensflare0.png"
    );

    this.reverseLights = [];
    this.originalReverseLightMaterials = new Map();
    this.reverseLightObjects = [];
    this.reverseLightFlares = [];

    this.chassis.traverse((child) => {
      if (child.name === "Object_96") {
        this.reverseLights.push(child);
        this.reverseLightObjects.push(child);

        if (child.material) {
          this.originalReverseLightMaterials.set(child, child.material.clone());
        }

        // Create TWO lens flare sprites with proper transparency settings
        const flareMaterial1 = new THREE.SpriteMaterial({
          map: flareTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
          alphaTest: 0.01,
        });

        const flareMaterial2 = new THREE.SpriteMaterial({
          map: flareTexture,
          color: 0xffffff,
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

        // SECOND FLARE - Secondary flare (smaller)
        const flare2 = new THREE.Sprite(flareMaterial2);
        flare2.scale.set(1, 1, 1); // Smaller than first flare
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
        this.reverseLightFlares.push([flare1, flare2]);

        console.log(
          `Reverse light (${child.name}) setup with TWO lens flares at positions:`,
          [flare1.position, flare2.position]
        );
        console.log(`Light object position:`, child.position);
      }
    });

    if (this.reverseLights.length === 0) {
      console.warn("Reverse lights not found in chassis model");
    }
  }

  activateReverseLight() {
    if (this.reverseLights && !this.isReversing) {
      this.isReversing = true;

      const emissiveColor = new THREE.Color(1, 0, 0).multiplyScalar(0.5);
      const whiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: emissiveColor,
        emissiveIntensity: 50,
      });

      this.reverseLights.forEach((mesh) => {
        mesh.material = whiteMaterial;
      });

      // Show both flares for each light
      this.reverseLightFlares.forEach((flareArray) => {
        flareArray.forEach((flare) => {
          flare.visible = true;
        });
      });

      console.log("Reverse lights activated (with lens flare)");
    }
  }

  deactivateReverseLight() {
    if (this.reverseLights && this.isReversing) {
      this.isReversing = false;

      this.reverseLights.forEach((mesh) => {
        const original = this.originalReverseLightMaterials.get(mesh);
        if (original) mesh.material = original;
      });

      // Hide both flares for each light
      this.reverseLightFlares.forEach((flareArray) => {
        flareArray.forEach((flare) => {
          flare.visible = false;
        });
      });

      console.log("Reverse lights deactivated (original state)");
    }
  }

  // IMPROVED: More precise flare position updating for TWO flares
  updateReverseLightFlarePositions() {
    if (!this.reverseLights || !this.reverseLightFlares) return;

    this.reverseLights.forEach((light, index) => {
      if (this.reverseLightFlares[index]) {
        const [flare1, flare2] = this.reverseLightFlares[index];

        // METHOD 1: If flares are children of chassis, use local positioning
        if (flare1.parent === this.chassis) {
          const localPos = light.position.clone();

          // Update both flares with their respective offsets
          const offset1 = new THREE.Vector3(1.2, 0, -3.2);
          const offset2 = new THREE.Vector3(-1.2, 0, -3.2);

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

          // Position flares behind the car (reverse lights are at the back)
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
  adjustFlarePosition(lightIndex, flareIndex, offsetX, offsetY, offsetZ) {
    if (this.reverseLightFlares && this.reverseLightFlares[lightIndex]) {
      const flareArray = this.reverseLightFlares[lightIndex];
      if (flareArray[flareIndex]) {
        const flare = flareArray[flareIndex];
        const light = this.reverseLights[lightIndex];

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
          `Light ${lightIndex}, Flare ${flareIndex} adjusted to position:`,
          flare.position
        );
      }
    }
  }

  // BONUS: Helper method to adjust both flares at once
  adjustBothFlares(lightIndex, offset1, offset2) {
    this.adjustFlarePosition(lightIndex, 0, offset1.x, offset1.y, offset1.z);
    this.adjustFlarePosition(lightIndex, 1, offset2.x, offset2.y, offset2.z);
  }

  init(health = null) {
    this.health = health;
    this.loader.show();
    this.loadModels();
    this.setChassis();
    this.setWheels();
    this.controls();
    this.update();
    this.createChassisWireframe();
  }

  loadModels() {
    const gltfLoader = new GLTFLoader(this.loadingManager);
    const dracoLoader = new DRACOLoader(this.loadingManager);

    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load("./car/Lamborghini_Cen.glb", (gltf) => {
      this.chassis = gltf.scene;

      this.chassis.traverse(function (object) {
        if (object.isMesh) {
          object.castShadow = true;
          object.recieveShadow = true;
        }
      });
      this.chassis.scale.set(1, 1, 1);

      // Optional visual-only rotation (disabled because we're rotating the physics body)
      // this.chassis.position.z = 5;

      this.scene.add(this.chassis);

      // Setup brake light after chassis is loaded
      this.setupBrakeLight();
      this.setupReverseLight();
      // In your car class initialization
      this.setupFrontLight();
      this.setupFrontLightKeyListener();

      // NEW: Setup animations after chassis is loaded
      this.setupAnimations(gltf);
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
            });

    this.wheels = [];
    for (let i = 0; i < 4; i++) {
      gltfLoader.load("./car/Lamborghini_Cen_Wheel.glb", (gltf) => {
        const model = gltf.scene;
        this.wheels[i] = model;
        if (i === 1 || i === 3)
          this.wheels[i].scale.set(
            -1.5 * this.wheelScale.frontWheel,
            1.5 * this.wheelScale.frontWheel,
            -1.5 * this.wheelScale.frontWheel
          );
        else
          this.wheels[i].scale.set(
            1.5 * this.wheelScale.frontWheel,
            1.5 * this.wheelScale.frontWheel,
            1.5 * this.wheelScale.frontWheel
          );
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
                });
    }
  }

  setChassis() {
    const chassisShape = new CANNON.Box(
      new CANNON.Vec3(
        this.chassisDimension.x * 0.5,
        this.chassisDimension.y * 0.5,
        this.chassisDimension.z * 0.5
      )
    );

    // Create chassis material
    const chassisMaterial = new CANNON.Material({
      friction: 0.3,
      restitution: 0.1,
    });

    // Create chassis body
    const chassisBody = new CANNON.Body({
      mass: this.mass,
      material: chassisMaterial,
      type: CANNON.Body.DYNAMIC,
      // For chassis collisions with other objects (not ground)
      collisionFilterGroup: 1,
      collisionFilterMask: 1, // Only collide with other cars/objects, not ground
    });

    chassisBody.linearDamping = 0.1;
    chassisBody.angularDamping = 0.1;
    chassisBody.addShape(chassisShape);

    // Set initial position
    chassisBody.position.set(
      this.startPosition.x,
      this.startPosition.y,
      this.startPosition.z
    );

    // Initial rotation
    const euler = new CANNON.Vec3(0, -Math.PI / 2, 0);
    const q = new CANNON.Quaternion();
    q.setFromEuler(euler.x, euler.y, euler.z);
    chassisBody.quaternion.copy(q);

    // Add chassis to world
    this.world.addBody(chassisBody);

    // Create raycast vehicle - THIS handles ground collision via wheel rays
    this.car = new CANNON.RaycastVehicle({
      chassisBody,
      indexRightAxis: 0, // X-axis for right
      indexUpAxis: 1, // Y-axis for up (CRITICAL!)
      indexForwardAxis: 2, // Z-axis for forward
    });

    chassisBody.userData = { type: "car", car: this };

    // Add vehicle to world - this enables the raycasting system
    this.car.addToWorld(this.world);

    // Store reference
    this.chassisBody = chassisBody;
    // After chassis model is loaded
  }

  // FIXED: Proper wheel setup for ground contact
  setWheels() {
    this.car.wheelInfos = [];

    // CRITICAL: These positions must be correct relative to chassis center
    const wheelPositions = [
      new CANNON.Vec3(1.45, -0.5, -2.12), // Front right - LOWERED Y position
      new CANNON.Vec3(-1.45, -0.5, -2.12), // Front left - LOWERED Y position
      new CANNON.Vec3(1.32, -0.5, 1.8), // Rear right - LOWERED Y position
      new CANNON.Vec3(-1.32, -0.5, 1.8), // Rear left - LOWERED Y position
    ];

    for (let i = 0; i < 4; i++) {
      this.car.addWheel({
radius: 0.5,
directionLocal: new CANNON.Vec3(0, -1, 0), // Ray direction (down)
suspensionStiffness: 80, // Much stiffer
suspensionRestLength: 0.15, // Much shorter
frictionSlip: 2.5, // Increased for better grip
dampingRelaxation: 2.3,
dampingCompression: 4.3,
maxSuspensionForce: 100000, // Increased
rollInfluence: 0.01,
axleLocal: new CANNON.Vec3(-1, 0, 0),
chassisConnectionPointLocal: wheelPositions[i],
maxSuspensionTravel: 0.1, // Much less travel
customSlidingRotationalSpeed: 30,
// CRITICAL: These affect ground contact
useCustomSlidingRotationalSpeed: true,
      });
    }

    // NOTE: Don't create separate wheel bodies for raycast vehicles!
    // The raycasting system handles ground contact, not wheel bodies.
  }

  // CRITICAL: Ensure your world has a ground body for rays to hit
  ensureGroundExists() {
    if (!this.groundBody) {
      // Create ground plane
      const groundShape = new CANNON.Plane();
      this.groundBody = new CANNON.Body({
        mass: 0, // Static body
        material: new CANNON.Material({ friction: 0.4, restitution: 0.3 }),
      });

      this.groundBody.addShape(groundShape);
      this.groundBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        -Math.PI / 2
      );

      // CRITICAL: Ground must be in collision group that wheels can hit
      this.groundBody.collisionFilterGroup = 2;
      this.groundBody.collisionFilterMask = -1;

      this.world.addBody(this.groundBody);
    }
  }

  setHealthSystem(health) {
    this.health = health;
    console.log("Health system attached to car");
  }

  // UPDATED: Enhanced controls with drifting functionality and boost animation
controls() {
    const maxSteerVal = 0.5;
    const brakeForce = 45;
    const slowDownCar = 25;
    const keysPressed = [];

    // Speed calculation properties
    this.previousPosition = null;
    this.previousTime = null;
    this.currentSpeed = 0;
    this.maxReachedSpeed = 0;
    this.speedHistory = [];
    this.maxHistoryLength = 10;
    this.averageSpeed = 0;
    this.options = { unit: "mph", maxSpeed: 180 }; // Default options
    this.needleSmoothing = 0.1;
    this.currentNeedleAngle = -135;
    this.targetNeedleAngle = -135;

    // Realistic acceleration system
    this.accelerationPhase = 0;
    this.isInGearShift = false;
    this.gearShiftTimer = 0;
    this.gearShiftDuration = 150; // Faster, more realistic shift time
    this.lastGearShiftTime = 0;
    this.accelerationStartTime = 0;
    this.wasAcceleratingPreviously = false;

    // More realistic acceleration phases with diminishing returns
    this.accelerationPhases = [
      { maxForce: 2800, duration: 600 }, // 1st gear - high torque, short duration
      { maxForce: 2600, duration: 1200 }, // 2nd gear - still strong
      { maxForce: 2400, duration: 1800 }, // 3rd gear - moderate power
      { maxForce: 2200, duration: 2400 }, // 4th gear - less torque
      { maxForce: 2000, duration: Infinity }, // 5th+ gear - highway cruising
    ];

    // Enhanced sound system with overlapping capabilities
    this.sounds = {
      drifting: null,
      gearShift: null,
      brake: null,
      backfire: null,
    };

    // Track multiple active sounds with improved state management
    this.activeSounds = new Set();
    this.soundStates = {
      drifting: false,
      brake: false,
    };

    // Backfire system
    this.backfireSystem = {
      lastBackfireTime: 0,
      backfireChance: 0.3, // 30% chance
      backfireCooldown: 2000, // 2 seconds between backfires
      highSpeedBackfireChance: 0.6, // 60% chance at high speeds
      highSpeedThreshold: 60, // mph
      gearShiftBackfireChance: 0.4, // 40% chance on gear shifts
      engineOffBackfireChance: 0.7, // 70% chance when engine turns off
      lastEngineState: false,
      wasAcceleratingRecently: false,
      recentAccelerationTime: 0,
    };

    // Audio transition system
    this.fadeOutTimer = null;
    this.fadeOutDuration = 300; // Faster fade out for better responsiveness
    this.fadeInDuration = 150; // Faster fade in
    this.speedThreshold = 2; // Increased threshold for better detection
    this.lastSoundChangeTime = 0;
    this.soundChangeDelay = 50; // Reduced delay for better responsiveness
    this.isMoving = false;
    this.wasMoving = false;

    // IMPROVED: Clear drift state management
    this.isDriftingNow = false;
    this.wasDriftingPreviously = false;
    this.driftStartTime = 0;
    this.driftMinDuration = 100; // Minimum drift duration to prevent flickering
    this.lastDriftEndTime = 0;
    this.driftCooldown = 200; // Cooldown period after drift ends

    // Speed-based audio thresholds
    this.speedThresholds = {
      deceleration: { min: 0, max: 50 },
    };

    // Initialize sounds with overlapping support
    this.initSounds = () => {
      this.sounds.drifting = new Audio("./sounds/fer_drift.wav");
      this.sounds.gearShift = new Audio("./sounds/fer_gear.mp3");
      this.sounds.brake = new Audio("./sounds/fer_brake.mp3");
      this.sounds.backfire = new Audio("./sounds/backfire.mp3");

      // Set loop for continuous sounds
      this.sounds.drifting.loop = true;
      this.sounds.brake.loop = false;
      this.sounds.backfire.loop = false;

      // Set volumes
      this.sounds.drifting.volume = 0.6;
      this.sounds.gearShift.volume = 0.3;
      this.sounds.brake.volume = 1.0;
      this.sounds.backfire.volume = 0.8;

      // Add error handling for sound loading
      Object.keys(this.sounds).forEach(soundName => {
        if (this.sounds[soundName]) {
          this.sounds[soundName].addEventListener('error', (e) => {
            console.warn(`Failed to load ${soundName} sound:`, e);
          });
        }
      });
    };

    this.initSounds();

    // Speed calculation methods
    this.calculateSpeed = () => {
      if (!this.car || !this.car.chassisBody) return 0;

      const currentTime = Date.now();
      const currentPosition = this.car.chassisBody.position;

      if (!this.previousPosition) {
        this.previousPosition = currentPosition.clone();
        this.previousTime = currentTime;
        return 0;
      }

      // Calculate distance moved
      const distance = currentPosition.distanceTo(this.previousPosition);
      const timeElapsed = (currentTime - this.previousTime) / 1000;

      if (timeElapsed === 0) return this.currentSpeed;

      // Calculate speed in m/s
      const speedMPS = distance / timeElapsed;

      // Convert to km/h or mph
      let speed;
      if (this.options.unit === "mph") {
        speed = speedMPS * 2.237;
      } else {
        speed = speedMPS * 3.6;
      }

      // Update previous values
      this.previousPosition = currentPosition.clone();
      this.previousTime = currentTime;

      return Math.max(0, speed);
    };

    // Update speed and UI
    this.updateSpeed = () => {
      const newSpeed = this.calculateSpeed();

      // Smooth speed changes
      this.currentSpeed =
        this.currentSpeed + (newSpeed - this.currentSpeed) * 0.1;

      // Update max speed
      if (this.currentSpeed > this.maxReachedSpeed) {
        this.maxReachedSpeed = this.currentSpeed;
        if (this.onMaxSpeedReached) {
          this.onMaxSpeedReached(this.maxReachedSpeed);
        }
      }

      // Update speed history for average calculation
      this.speedHistory.push(this.currentSpeed);
      if (this.speedHistory.length > this.maxHistoryLength) {
        this.speedHistory.shift();
      }

      // Calculate average speed
      this.averageSpeed =
        this.speedHistory.reduce((sum, speed) => sum + speed, 0) /
        this.speedHistory.length;

      // Update needle angle
      const speedPercent = Math.min(
        this.currentSpeed / this.options.maxSpeed,
        1
      );
      this.targetNeedleAngle = -135 + speedPercent * 270;

      // Smooth needle movement
      this.currentNeedleAngle =
        this.currentNeedleAngle +
        (this.targetNeedleAngle - this.currentNeedleAngle) *
          this.needleSmoothing;

      // Update UI
      if (this.updateSpeedometerUI) {
        this.updateSpeedometerUI();
      }

      // Call speed change callback
      if (this.onSpeedChange) {
        this.onSpeedChange(
          this.currentSpeed,
          this.maxReachedSpeed,
          this.averageSpeed
        );
      }
    };

    // IMPROVED: Start a sound with better fade in control
    this.startSound = (soundName, targetVolume = null, force = false) => {
      if (!this.sounds[soundName] || (!force && this.soundStates[soundName])) return;

      const sound = this.sounds[soundName];
      const volume = targetVolume || this.getOriginalVolume(soundName);

      // Stop any existing fade operations
      sound.fadeInterval && clearInterval(sound.fadeInterval);

      sound.volume = 0;
      sound.currentTime = 0;
      
      const playPromise = sound.play();
      if (playPromise) {
        playPromise.catch((e) => console.log(`${soundName} audio play failed:`, e));
      }

      this.soundStates[soundName] = true;
      this.activeSounds.add(soundName);

      // Fade in
      const fadeStep = volume / (this.fadeInDuration / 20);
      sound.fadeInterval = setInterval(() => {
        sound.volume = Math.min(volume, sound.volume + fadeStep);
        if (sound.volume >= volume) {
          clearInterval(sound.fadeInterval);
          sound.fadeInterval = null;
        }
      }, 20);
    };

    // IMPROVED: Stop a sound with better fade out control
    this.stopSound = (soundName, callback = null, force = false) => {
      if (!this.sounds[soundName] || (!force && !this.soundStates[soundName])) {
        if (callback) callback();
        return;
      }

      const sound = this.sounds[soundName];
      
      // Stop any existing fade operations
      sound.fadeInterval && clearInterval(sound.fadeInterval);

      if (sound.paused || sound.volume === 0) {
        this.soundStates[soundName] = false;
        this.activeSounds.delete(soundName);
        if (callback) callback();
        return;
      }

      const originalVolume = sound.volume;
      const fadeStep = originalVolume / (this.fadeOutDuration / 20);
      
      sound.fadeInterval = setInterval(() => {
        sound.volume = Math.max(0, sound.volume - fadeStep);

        if (sound.volume <= 0) {
          clearInterval(sound.fadeInterval);
          sound.fadeInterval = null;
          sound.pause();
          sound.currentTime = 0;
          sound.volume = this.getOriginalVolume(soundName); // Reset volume
          this.soundStates[soundName] = false;
          this.activeSounds.delete(soundName);
          if (callback) callback();
        }
      }, 20);
    };

    // Play overlapping gear shift sound
    this.playGearShiftSound = () => {
      if (this.sounds.gearShift) {
        // Create a temporary audio element for overlapping
        const gearSound = new Audio("./sounds/fer_gear.mp3");
        gearSound.volume = 0.3;
        gearSound.currentTime = 0;
        gearSound
          .play()
          .catch((e) => console.log("Gear shift sound failed:", e));

        // Chance for backfire on gear shift at high RPM/speed
        this.tryPlayBackfire('gearshift');
      }
    };

    // NEW: Backfire sound system
    this.tryPlayBackfire = (trigger = 'random') => {
      const currentTime = Date.now();
      const timeSinceLastBackfire = currentTime - this.backfireSystem.lastBackfireTime;
      
      // Respect cooldown period
      if (timeSinceLastBackfire < this.backfireSystem.backfireCooldown) {
        return;
      }

      let chance = 0;
      
      // Determine backfire chance based on trigger
      switch(trigger) {
        case 'gearshift':
          chance = this.backfireSystem.gearShiftBackfireChance;
          break;
        case 'engineoff':
          chance = this.backfireSystem.engineOffBackfireChance;
          break;
        case 'deceleration':
          // Higher chance at higher speeds
          if (this.currentSpeed > this.backfireSystem.highSpeedThreshold) {
            chance = this.backfireSystem.highSpeedBackfireChance;
          } else {
            chance = this.backfireSystem.backfireChance;
          }
          break;
        default:
          chance = this.backfireSystem.backfireChance;
      }

      // Roll the dice
      if (Math.random() < chance) {
        this.playBackfireSound();
        this.backfireSystem.lastBackfireTime = currentTime;
        console.log(`BACKFIRE triggered by: ${trigger}`); // Debug log
      }
    };

    this.playBackfireSound = () => {
      if (this.sounds.backfire) {
        // Create a temporary audio element for overlapping backfires
        const backfireSound = new Audio("./sounds/backfire.mp3");
        backfireSound.volume = 0.8;
        backfireSound.currentTime = 0;
        backfireSound
          .play()
          .catch((e) => console.log("Backfire sound failed:", e));
      }
    };

    // Helper function to get original volume
    this.getOriginalVolume = (soundName) => {
      const volumes = {
        drifting: 0.6,
        gearShift: 0.3,
        brake: 1.0,
        backfire: 0.8,
      };
      return volumes[soundName] || 0.5;
    };

    // IMPROVED: Force stop all sounds with immediate effect
    this.stopAllSounds = (immediate = false) => {
      Object.keys(this.sounds).forEach((soundName) => {
        if (this.sounds[soundName]) {
          const sound = this.sounds[soundName];
          
          // Clear any fade intervals
          sound.fadeInterval && clearInterval(sound.fadeInterval);
          
          if (immediate) {
            sound.pause();
            sound.currentTime = 0;
            sound.volume = this.getOriginalVolume(soundName);
            this.soundStates[soundName] = false;
          } else {
            this.stopSound(soundName, null, true);
          }
        }
      });
      this.activeSounds.clear();
    };

    // Check if car speed is low enough
    this.isCarSpeedLow = () => {
      const speed = this.currentSpeed;
      return speed < 5; // Speed less than 5
    };

    // COMPLETELY REWRITTEN: Enhanced drift detection and sound management
    this.updateSound = () => {
      const currentTime = Date.now();
      const speed = this.currentSpeed;
      this.isMoving = speed > this.speedThreshold;

      // Get current key states
      const isAccelerating = keysPressed.includes("w") || keysPressed.includes("arrowup");
      const isReversing = keysPressed.includes("s") || keysPressed.includes("arrowdown");
      const spacePressed = keysPressed.includes(" ");
      const leftPressed = keysPressed.includes("a") || keysPressed.includes("arrowleft");
      const rightPressed = keysPressed.includes("d") || keysPressed.includes("arrowright");

      // Track engine state for backfire
      const currentEngineState = isAccelerating || isReversing;
      
      // Check for engine turning off (was accelerating, now not)
      if (this.backfireSystem.lastEngineState && !currentEngineState && this.isMoving) {
        this.tryPlayBackfire('engineoff');
      }
      
      // Track recent acceleration for deceleration backfire
      if (isAccelerating) {
        this.backfireSystem.wasAcceleratingRecently = true;
        this.backfireSystem.recentAccelerationTime = currentTime;
      } else if (this.backfireSystem.wasAcceleratingRecently) {
        // Check if we just stopped accelerating while moving at decent speed
        const timeSinceAcceleration = currentTime - this.backfireSystem.recentAccelerationTime;
        if (timeSinceAcceleration < 1000 && this.isMoving && speed > 20) {
          this.tryPlayBackfire('deceleration');
          this.backfireSystem.wasAcceleratingRecently = false;
        } else if (timeSinceAcceleration > 2000) {
          this.backfireSystem.wasAcceleratingRecently = false;
        }
      }
      
      this.backfireSystem.lastEngineState = currentEngineState;

      // CRITICAL: Very strict drift detection - ALL conditions must be met
      const isDriftingNow = (
        spacePressed && 
        (leftPressed || rightPressed) && 
        isAccelerating && 
        this.isMoving
      );

      // Check if we're just braking (space without steering or acceleration)
      const isBrakingOnly = (
        spacePressed && 
        !leftPressed && 
        !rightPressed && 
        this.isMoving &&
        !isAccelerating
      );

      // Handle drift state transitions with hysteresis
      if (isDriftingNow && !this.isDriftingNow) {
        // Starting to drift
        const timeSinceLastDriftEnd = currentTime - this.lastDriftEndTime;
        
        if (timeSinceLastDriftEnd > this.driftCooldown) {
          this.isDriftingNow = true;
          this.driftStartTime = currentTime;
          
          // Stop other sounds immediately and start drift sound
          this.stopSound("brake", null, true);
          this.startSound("drifting", null, true);
          
          console.log("DRIFT START"); // Debug log
        }
      } else if (!isDriftingNow && this.isDriftingNow) {
        // Stopping drift
        const driftDuration = currentTime - this.driftStartTime;
        
        if (driftDuration > this.driftMinDuration) {
          this.isDriftingNow = false;
          this.lastDriftEndTime = currentTime;
          
          // Stop drift sound immediately
          this.stopSound("drifting", null, true);
          
          console.log("DRIFT STOP"); // Debug log
        }
      }

      // Handle brake sound (only when not drifting)
      if (isBrakingOnly && !this.isDriftingNow && !this.soundStates.brake) {
        this.startSound("brake");
        console.log("BRAKE START"); // Debug log
      } else if ((!isBrakingOnly || this.isDriftingNow) && this.soundStates.brake) {
        this.stopSound("brake");
        console.log("BRAKE STOP"); // Debug log
      }

      // Safety check: Force stop drift sound if conditions are clearly not met
      if (this.soundStates.drifting && (!spacePressed || !this.isMoving || speed < 3)) {
        this.stopSound("drifting", null, true);
        this.isDriftingNow = false;
        console.log("DRIFT FORCE STOP - Safety check"); // Debug log
      }

      // Update previous states
      this.wasDriftingPreviously = this.isDriftingNow;
      this.wasMoving = this.isMoving;
    };

    // Acceleration management
    this.updateAcceleration = () => {
      const currentTime = Date.now();
      const isAccelerating =
        keysPressed.includes("w") || keysPressed.includes("arrowup");

      if (isAccelerating && !this.wasAcceleratingPreviously) {
        this.accelerationPhase = 0;
        this.accelerationStartTime = currentTime;
        this.isInGearShift = false;
        this.gearShiftTimer = 0;
      }

      if (isAccelerating) {
        const timeSinceStart = currentTime - this.accelerationStartTime;

        if (!this.isInGearShift && this.accelerationPhase < 4) {
          const currentPhase = this.accelerationPhases[this.accelerationPhase];

          if (
            this.accelerationPhase > 0 &&
            timeSinceStart >= currentPhase.duration
          ) {
            this.startGearShift();
          } else if (this.accelerationPhase === 0 && timeSinceStart >= 100) {
            this.startGearShift();
          }
        }

        if (this.isInGearShift) {
          if (currentTime - this.lastGearShiftTime >= this.gearShiftDuration) {
            this.completeGearShift();
          }
        }

        this.wasAcceleratingPreviously = true;
      } else {
        this.accelerationPhase = 0;
        this.isInGearShift = false;
        this.wasAcceleratingPreviously = false;
      }
    };

    // Use the overlapping gear shift sound method
    this.startGearShift = () => {
      this.isInGearShift = true;
      this.lastGearShiftTime = Date.now();

      // Play gear shift sound without stopping current sound
      this.playGearShiftSound();
    };

    this.completeGearShift = () => {
      this.isInGearShift = false;
      this.accelerationPhase = Math.min(this.accelerationPhase + 1, 4);
      this.accelerationStartTime = Date.now();
    };

    this.getCurrentMaxForce = () => {
      if (this.isInGearShift) {
        return this.accelerationPhases[this.accelerationPhase].maxForce * 0.3;
      }
      return this.accelerationPhases[this.accelerationPhase].maxForce;
    };

    // Event listeners
    window.addEventListener("keydown", (e) => {
      if (!this.isLoaded) return;
      if (!keysPressed.includes(e.key.toLowerCase()))
        keysPressed.push(e.key.toLowerCase());
      hindMovement();
    });

    window.addEventListener("keyup", (e) => {
      if (!this.isLoaded) return;
      keysPressed.splice(keysPressed.indexOf(e.key.toLowerCase()), 1);
      hindMovement();
    });

    const hindMovement = () => {
      if (this.controlsDisabled) {
        return;
      }

      // Update speed first
      this.updateSpeed();

      // Update acceleration system
      this.updateAcceleration();

      // if (keysPressed.includes("r")) resetCar();

      if (keysPressed.includes("f")) {
        this.toggleWireframe();
        keysPressed.splice(keysPressed.indexOf("f"), 1);
      }

      const wPressed = keysPressed.includes("w") || keysPressed.includes("arrowup");
      const spacePressed = keysPressed.includes(" ");
      const leftPressed = keysPressed.includes("a") || keysPressed.includes("arrowleft");
      const rightPressed = keysPressed.includes("d") || keysPressed.includes("arrowright");
      
      // Use the same strict drift detection as in updateSound
      const shouldDrift = (
        spacePressed && 
        (leftPressed || rightPressed) && 
        wPressed &&
        this.isMoving
      );

      if (shouldDrift && !this.isDrifting) {
        this.startDrift();
      } else if (!shouldDrift && this.isDrifting) {
        this.stopDrift();
      }

      if (!spacePressed || shouldDrift) {
        if (!spacePressed) {
          this.deactivateBrakeLight();
        } else if (shouldDrift) {
          this.activateBrakeLight();
        }

        this.car.setBrake(0, 0);
        this.car.setBrake(0, 1);
        this.car.setBrake(0, 2);
        this.car.setBrake(0, 3);

        const steerMultiplier = this.isDrifting ? this.driftSteerMultiplier : 1;

        if (leftPressed) {
          this.car.setSteeringValue(maxSteerVal * steerMultiplier, 2);
          this.car.setSteeringValue(maxSteerVal * steerMultiplier, 3);
        } else if (rightPressed) {
          this.car.setSteeringValue(maxSteerVal * -steerMultiplier, 2);
          this.car.setSteeringValue(maxSteerVal * -steerMultiplier, 3);
        } else stopSteer();

        if (keysPressed.includes("w") || keysPressed.includes("arrowup")) {
          const currentForce = this.getCurrentMaxForce();
          this.car.applyEngineForce(currentForce * -1, 0);
          this.car.applyEngineForce(currentForce * -1, 1);
          this.car.applyEngineForce(currentForce * -1, 2);
          this.car.applyEngineForce(currentForce * -1, 3);
        } else if (
          keysPressed.includes("s") ||
          keysPressed.includes("arrowdown")
        ) {
          if (!shouldDrift) {
            this.activateReverseLight();
          }

          this.car.applyEngineForce(this.maxForce * 1, 0);
          this.car.applyEngineForce(this.maxForce * 1, 1);
          this.car.applyEngineForce(this.maxForce * 1, 2);
          this.car.applyEngineForce(this.maxForce * 1, 3);
        } else {
          this.car.applyEngineForce(0, 0);
          this.car.applyEngineForce(0, 1);
          this.car.applyEngineForce(0, 2);
          this.car.applyEngineForce(0, 3);

          this.deactivateReverseLight();

          if (!shouldDrift) {
            stopCar();
          }
        }
      } else {
        this.activateBrakeLight();
        brake();
      }

      // Update sound based on key presses - ALWAYS call this
      this.updateSound();
    };

    const resetCar = () => {
      this.car.chassisBody.position.set(0, 4, 0);

      const euler = new CANNON.Vec3(0, Math.PI / 2, 0);
      const q = new CANNON.Quaternion();
      q.setFromEuler(euler.x, euler.y, euler.z);
      this.car.chassisBody.quaternion.copy(q);

      this.car.chassisBody.angularVelocity.set(0, 0, 0);
      this.car.chassisBody.velocity.set(0, 0, 0);

      this.stopDrift();

      // Reset acceleration system
      this.accelerationPhase = 0;
      this.isInGearShift = false;
      this.gearShiftTimer = 0;
      this.wasAcceleratingPreviously = false;

      // Reset speed tracking
      this.currentSpeed = 0;
      this.previousPosition = null;
      this.previousTime = null;
      this.speedHistory = [];

      // Reset sound states completely
      this.isMoving = false;
      this.wasMoving = false;
      this.isDriftingNow = false;
      this.wasDriftingPreviously = false;
      this.driftStartTime = 0;
      this.lastDriftEndTime = 0;

      // Force stop all sounds immediately
      this.stopAllSounds(true);

      this.maxForce = 1500;

      console.log("CAR RESET - All sounds stopped"); // Debug log
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

    // IMPROVED: Enhanced cleanup with force stop
    this.cleanup = () => {
      // Force stop all sounds immediately during cleanup
      Object.keys(this.sounds).forEach((soundName) => {
        if (this.sounds[soundName]) {
          const sound = this.sounds[soundName];
          
          // Clear any fade intervals
          sound.fadeInterval && clearInterval(sound.fadeInterval);
          
          sound.pause();
          sound.currentTime = 0;
          sound.volume = this.getOriginalVolume(soundName);
        }
      });
      
      this.activeSounds.clear();
      Object.keys(this.soundStates).forEach((key) => {
        this.soundStates[key] = false;
      });

      // Reset all drift states
      this.isDriftingNow = false;
      this.wasDriftingPreviously = false;
      this.driftStartTime = 0;
      this.lastDriftEndTime = 0;

      if (this.fadeOutTimer) {
        clearTimeout(this.fadeOutTimer);
      }

      console.log("CLEANUP COMPLETE - All sounds stopped"); // Debug log
    };
}

  // 2. Add this new method to check health status
  checkHealthStatus() {
    if (!this.health) return; // No health system attached

    const isCurrentlyDestroyed = this.health.isDestroyed;

    // Check if car just got destroyed
    if (isCurrentlyDestroyed && !this.wasDestroyed) {
      console.log("Car destroyed! Stopping all sounds and disabling controls.");
      this.onCarDestroyed();
    }
    // Check if car was repaired/respawned
    else if (!isCurrentlyDestroyed && this.wasDestroyed) {
      console.log("Car repaired! Re-enabling controls.");
      this.onCarRepaired();
    }

    this.wasDestroyed = isCurrentlyDestroyed;
  }

  // 3. Add method to handle car destruction
  onCarDestroyed() {
    // Stop all sounds immediately
    this.stopAllSounds();

    // Disable controls
    this.controlsDisabled = true;

    if (this.car && this.car.chassisBody) {
      // METHOD 1: Gentler approach - reduce velocities gradually
      // Instead of harsh braking, smoothly reduce velocity
      // const currentVelocity = this.car.chassisBody.velocity;
      // this.car.chassisBody.velocity.set(
      //   currentVelocity.x * 0.1,
      //   currentVelocity.y * 0.1,
      //   currentVelocity.z * 0.1
      // );

      // // Reduce angular velocity as well
      // const currentAngularVelocity = this.car.chassisBody.angularVelocity;
      // this.car.chassisBody.angularVelocity.set(
      //   currentAngularVelocity.x * 0.1,
      //   currentAngularVelocity.y * 0.1,
      //   currentAngularVelocity.z * 0.1
      // );

      // Apply moderate brakes instead of extreme ones
      this.car.setBrake(0, 0); // Reduced from 1000
      this.car.setBrake(100, 1);
      this.car.setBrake(500, 2);
      this.car.setBrake(0, 3);

      // Stop engine
      this.car.applyEngineForce(0, 0);
      this.car.applyEngineForce(0, 1);
      this.car.applyEngineForce(0, 2);
      this.car.applyEngineForce(0, 3);

      // Stop steering
      this.car.setSteeringValue(0, 2);
      this.car.setSteeringValue(0, 3);
    }

    // Stop any ongoing animations
    this.stopDrift();

    // Deactivate brake light
    this.activateBrakeLight();
  }

  // 4. Add method to handle car repair
  onCarRepaired() {
    // Re-enable controls
    this.controlsDisabled = false;

    // Release brakes
    if (this.car) {
      this.car.setBrake(0, 0);
      this.car.setBrake(0, 1);
      this.car.setBrake(0, 2);
      this.car.setBrake(0, 3);
    }

    // Start idle sound
    this.playSound("idle");
  }

  update() {
    const updateWorld = () => {
      // NEW: Update animations first
      this.updateAnimations();

      // NEW: Add flip detection to the update loop
      this.handleFlipDetection();
      this.checkHealthStatus();
      // In your render/update loop
      this.updateReverseLightFlarePositions();
      this.updateBrakeLightFlarePositions();
      this.updateFrontLightFlarePositions();

      // Skip updates if car is destroyed
      // if (this.controlsDisabled) {
      //   return;
      // }

      if (
        this.car.wheelInfos &&
        this.chassis.position &&
        this.wheels[0]?.position
      ) {
        this.chassis.position.set(
          this.car.chassisBody.position.x + this.chassisModelPos.x,
          this.car.chassisBody.position.y + this.chassisModelPos.y,
          this.car.chassisBody.position.z + this.chassisModelPos.z
        );
        this.chassis.quaternion.copy(this.car.chassisBody.quaternion);

        if (this.chassisWireframe) {
          // Position wireframe exactly where physics chassis is
          this.chassisWireframe.position.copy(this.car.chassisBody.position);
          this.chassisWireframe.quaternion.copy(
            this.car.chassisBody.quaternion
          );
        }
        for (let i = 0; i < 4; i++) {
          if (this.car.wheelInfos[i]) {
            this.car.updateWheelTransform(i);
            this.wheels[i].position.copy(
              this.car.wheelInfos[i].worldTransform.position
            );
            this.wheels[i].quaternion.copy(
              this.car.wheelInfos[i].worldTransform.quaternion
            );
          }
        }
      }
    };
    this.world.addEventListener("postStep", updateWorld);
  }

  // Add method to toggle wireframe visibility
  toggleWireframe(visible = null) {
    if (this.chassisWireframe) {
      if (visible !== null) {
        this.chassisWireframe.visible = visible;
      } else {
        this.chassisWireframe.visible = !this.chassisWireframe.visible;
      }
      console.log(
        "Chassis wireframe visibility:",
        this.chassisWireframe.visible
      );
    }
  }

  // Add method to remove wireframe (useful for cleanup)
  removeWireframe() {
    if (this.chassisWireframe) {
      this.scene.remove(this.chassisWireframe);
      this.chassisWireframe.geometry.dispose();
      this.chassisWireframe.material.dispose();
      this.chassisWireframe = null;
      console.log("Chassis wireframe removed");
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
      resetProgress: this.timeUpsideDown / this.flipResetDelay,
    };
  }

  // Add this method to your Car class
  cleanup() {
    console.log("Starting car cleanup...");

    // 1. Stop all sounds and clean up audio resources
    this.stopAllSounds();
    if (this.sounds) {
      Object.values(this.sounds).forEach((sound) => {
        if (sound) {
          sound.pause();
          sound.currentTime = 0;
          sound.src = ""; // Clear the source
          sound.removeEventListener("ended", sound.onended); // Remove event listeners
        }
      });
      this.sounds = {};
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = null;
    }
    this.boostAnimation = null;

    // 4. Remove physics bodies from world
    if (this.car && this.car.chassisBody) {
      // Remove vehicle from world first
      this.car.removeFromWorld(this.world);
      // Then remove chassis body
      this.world.removeBody(this.car.chassisBody);
    }

    // 5. Clean up 3D models and geometries
    if (this.chassis) {
      this.chassis.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.scene.remove(this.chassis);
      this.chassis = null;
    }

    // 6. Clean up wheels
    if (this.wheels && this.wheels.length > 0) {
      this.wheels.forEach((wheel) => {
        if (wheel) {
          wheel.traverse((child) => {
            if (child.geometry) {
              child.geometry.dispose();
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
          this.scene.remove(wheel);
        }
      });
      this.wheels = [];
    }

    // 7. Clean up wireframe
    this.removeWireframe();

    // 8. Clean up brake light references
    this.brakeLight = null;
    if (this.originalBrakeLightMaterial) {
      this.originalBrakeLightMaterial.dispose();
      this.originalBrakeLightMaterial = null;
    }

    // 9. Remove event listeners (if you have any custom ones)
    // Note: The keydown/keyup listeners are added to window in controls()
    // You might want to store references to these functions to remove them
    // For now, they'll be cleaned up when the page unloads

    // 10. Clean up follow target
    if (this.followTarget) {
      this.scene.remove(this.followTarget);
      this.followTarget = null;
    }

    // 11. Reset all state variables
    this.isDrifting = false;
    this.isBraking = false;
    this.isFlipped = false;
    this.controlsDisabled = false;
    this.wasDestroyed = false;
    this.timeUpsideDown = 0;

    // 12. Clear timers and intervals
    this.lastFlipCheck = 0;

    // 13. Clean up references
    this.car = null;
    this.scene = null;
    this.world = null;
    this.health = null;
    this.pivot = null;

    console.log("Car cleanup completed");
  }
}
