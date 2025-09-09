import * as THREE from "three";
import * as CANNON from "cannon-es";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export default class AICar {
  constructor(scene, world, targetCar, startPosition = { x: 10, y: 4, z: 10 }) {
    this.scene = scene;
    this.world = world;
    this.targetCar = targetCar; // Reference to the player's car
    this.startPosition = startPosition;
    this.aiInterval = null;

    this.car = {};
    this.chassis = {};
    this.wheels = [];
    this.chassisDimension = {
      x: 3.5,
      y: 1,
      z: 6.5,
    };
    this.chassisModelPos = {
      x: 0,
      y: -0.9,
      z: 0,
    };
    this.wheelScale = {
      frontWheel: 1.1,
      hindWheel: 1.1,
    };
    this.mass = 400; // Slightly lighter for more aggressive movement

    // AI behavior parameters
    this.maxSpeed = 1000; // Slightly faster than player
    this.maxSteerVal = 0.6; // Reduced for smoother steering
    this.followDistance = 5; // Minimum distance to maintain
    this.attackDistance = 15; // Distance at which AI becomes aggressive
    this.updateInterval = 100; // AI decision making interval (ms)
    this.lastUpdate = 0;

    // AI state
    this.targetPosition = new THREE.Vector3();
    this.currentSteer = 0;
    this.currentThrottle = 0;
    this.isAttacking = false;

    // Enhanced steering smoothing parameters
    this.steerDeadZone = 0.08; // Larger dead zone for straighter movement
    this.steerSmoothFactor = 0.15; // Faster response but still smooth
    this.targetSteer = 0; // Target steering value
    this.straightThreshold = 0.02; // Very small angle for "straight enough"
    this.alignmentBonus = 0.95; // Dot product threshold for good alignment

    // Collision detection and recovery parameters
    this.isRecovering = false;
    this.recoveryStartTime = 0;
    this.recoveryDuration = 2000; // 2 seconds recovery time
    this.stuckThreshold = 2; // Speed below which car is considered stuck
    this.stuckCheckInterval = 500; // Check every 500ms
    this.lastStuckCheck = 0;
    this.stuckCounter = 0;
    this.maxStuckChecks = 3; // Number of consecutive stuck checks before recovery
    this.lastPosition = new THREE.Vector3();
    this.positionHistory = [];
    this.maxHistoryLength = 5;
    this.collisionForce = 0;
    this.minCollisionForce = 500; // Minimum force to trigger collision recovery

    // Recovery behavior parameters
    this.recoveryPhase = "reverse"; // 'reverse', 'turn', 'forward'
    this.reverseTime = 1000; // Time to reverse (ms)
    this.turnTime = 800; // Time to turn (ms)
    this.recoveryDirection = 1; // 1 or -1 for turn direction

    // Flip detection parameters
    this.flipCheckInterval = 200; // Check for flips every 200ms
    this.lastFlipCheck = 0;
    this.flipThreshold = 0.3; // If up vector Y component is below this, car is considered flipped
    this.flipTimeThreshold = 1000; // Time in ms the car must be flipped before auto-reset
    this.flipStartTime = 0; // When the flip was first detected
    this.isFlipped = false;
    this.flipResetCooldown = 2000; // Cooldown period after reset to prevent immediate re-flip detection
    this.lastFlipReset = 0;
  }

  init() {
    this.loadModels();
    this.setChassis();
    this.setWheels();
    this.setupCollisionDetection();
    this.startAI();
    this.update();
  }

  loadModels() {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

    gltfLoader.setDRACOLoader(dracoLoader);

    // Load AI car with different color
    gltfLoader.load("./car/Police_Lamborghini_Aventador.glb", (gltf) => {
      this.chassis = gltf.scene;

      this.chassis.traverse(function (object) {
        if (object.isMesh) {
          object.castShadow = true;
          // Make AI car red to distinguish it
          // object.material = new THREE.MeshPhongMaterial({color: 0xFF0000});
        }
      });
      this.chassis.scale.set(1, 1, 1);
      this.chassis.rotation.y = Math.PI / 2;
      this.scene.add(this.chassis);
    });

    // Load wheels
    this.wheels = [];
    for (let i = 0; i < 4; i++) {
      gltfLoader.load("./car/Lamborghini_Wheel.glb", (gltf) => {
        const model = gltf.scene;
        this.wheels[i] = model;
        if (i === 1 || i === 3)
          this.wheels[i].scale.set(
            -1.4 * this.wheelScale.frontWheel,
            1.4 * this.wheelScale.frontWheel,
            -1.4 * this.wheelScale.frontWheel
          );
        else
          this.wheels[i].scale.set(
            1.4 * this.wheelScale.frontWheel,
            1.4 * this.wheelScale.frontWheel,
            1.4 * this.wheelScale.frontWheel
          );
        this.scene.add(this.wheels[i]);
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
    const chassisBody = new CANNON.Body({
      mass: this.mass,
      material: new CANNON.Material({ friction: 0.3 }),
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

    chassisBody.userData = { type: "aiCar", car: this };

    this.car = new CANNON.RaycastVehicle({
      chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });
    this.car.addToWorld(this.world);
  }

  setWheels() {
    this.car.wheelInfos = [];
    const wheelPositions = [
      new CANNON.Vec3(1.4, 0.06, -2),
      new CANNON.Vec3(-1.3, 0.06, -2),
      new CANNON.Vec3(1.4, 0.06, 1.9),
      new CANNON.Vec3(-1.3, 0.06, 1.9),
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

    this.car.wheelInfos.forEach(
      function (wheel, index) {
        const cylinderShape = new CANNON.Cylinder(
          wheel.radius,
          wheel.radius,
          wheel.radius / 2,
          20
        );
        const wheelBody = new CANNON.Body({
          mass: 1,
          material: new CANNON.Material({ friction: 0.8 }),
        });

        wheelBody.linearDamping = 0.4;
        wheelBody.angularDamping = 0.4;

        const quaternion = new CANNON.Quaternion().setFromEuler(
          -Math.PI / 2,
          0,
          0
        );
        wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
      }.bind(this)
    );
  }

  setupCollisionDetection() {
    // Listen for collision events
    this.car.chassisBody.addEventListener("collide", (event) => {
      const contact = event.contact;
      const other =
        event.target === this.car.chassisBody ? event.body : event.target;

      // Skip collision recovery if colliding with the player car (target car)
      if (
        this.targetCar &&
        this.targetCar.car &&
        other === this.targetCar.car.chassisBody
      ) {
        console.log("Collision with player car detected - skipping recovery");
        // alert("You are busted!");
        return;
      }

      // Calculate collision force magnitude
      const impactVelocity = contact.getImpactVelocityAlongNormal();
      this.collisionForce = Math.abs(impactVelocity);

      // Check if collision is significant enough to trigger recovery
      if (this.collisionForce > this.minCollisionForce && !this.isRecovering) {
        console.log(
          `AI Car collision detected with non-player object! Force: ${this.collisionForce}`
        );
        this.startCollisionRecovery();
      }
    });
  }

  checkFlipStatus() {
    const currentTime = Date.now();

    // Don't check flip status too frequently or during cooldown
    if (
      currentTime - this.lastFlipCheck < this.flipCheckInterval ||
      currentTime - this.lastFlipReset < this.flipResetCooldown
    ) {
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
        console.log(
          `AI Car has been flipped for ${flipDuration}ms, auto-resetting...`
        );
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
      z: currentPos.z,
    };

    // Reset the car
    this.reset(resetPosition);

    // Set the flip reset timestamp and clear flip state
    this.lastFlipReset = Date.now();
    this.isFlipped = false;
    this.flipStartTime = 0;

    // Also clear any recovery state since we're doing a full reset
    this.isRecovering = false;
    this.recoveryPhase = "reverse";
    this.collisionForce = 0;
    this.stuckCounter = 0;
    this.positionHistory = [];
  }

  startCollisionRecovery() {
    if (this.isRecovering) return;

    console.log("Starting collision recovery sequence");
    this.isRecovering = true;
    this.recoveryStartTime = Date.now();
    this.recoveryPhase = "reverse";

    // Randomize recovery direction to avoid repeated collisions
    this.recoveryDirection = Math.random() < 0.5 ? -1 : 1;

    // Reset stuck counter
    this.stuckCounter = 0;
  }

  checkIfStuck() {
    const currentTime = Date.now();

    if (currentTime - this.lastStuckCheck < this.stuckCheckInterval) {
      return;
    }

    this.lastStuckCheck = currentTime;

    const currentPos = this.car.chassisBody.position;
    const currentSpeed = this.car.chassisBody.velocity.length();

    // Check if we're close to the player car - if so, don't consider it "stuck"
    if (
      this.targetCar &&
      this.targetCar.car &&
      this.targetCar.car.chassisBody
    ) {
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
      time: currentTime,
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
          console.log(
            "AI Car appears to be stuck (not near player), starting recovery"
          );
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
      case "reverse":
        // Reverse while turning slightly
        this.currentThrottle = -this.maxSpeed * 0.6; // Reverse at 60% speed
        this.currentSteer = this.recoveryDirection * this.maxSteerVal * 0.3;

        if (recoveryElapsed > this.reverseTime) {
          this.recoveryPhase = "turn";
          this.recoveryStartTime = currentTime;
        }
        break;

      case "turn":
        // Turn sharply while stopped
        this.currentThrottle = 0;
        this.currentSteer = this.recoveryDirection * this.maxSteerVal;

        if (recoveryElapsed > this.turnTime) {
          this.recoveryPhase = "forward";
          this.recoveryStartTime = currentTime;
        }
        break;

      case "forward":
        // Move forward briefly to clear the obstacle
        this.currentThrottle = this.maxSpeed * 0.4;
        this.currentSteer = 0;

        if (recoveryElapsed > 500) {
          // 500ms forward movement
          this.finishRecovery();
        }
        break;
    }
  }

  finishRecovery() {
    console.log("Collision recovery completed");
    this.isRecovering = false;
    this.recoveryPhase = "reverse";
    this.collisionForce = 0;
    this.stuckCounter = 0;
    this.positionHistory = [];

    // Resume normal AI behavior
    this.currentSteer = 0;
    this.currentThrottle = 0;
    this.targetSteer = 0;
  }

  startAI() {
    // AI decision making loop
    this.aiInterval = setInterval(() => {
      this.makeAIDecision();
    }, this.updateInterval);
  }

  makeAIDecision() {
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

    if (
      !this.targetCar ||
      !this.targetCar.car ||
      !this.targetCar.car.chassisBody
    )
      return;

    const aiPos = this.car.chassisBody.position;
    const targetPos = this.targetCar.car.chassisBody.position;

    // Calculate distance to target
    const distance = Math.sqrt(
      Math.pow(targetPos.x - aiPos.x, 2) + Math.pow(targetPos.z - aiPos.z, 2)
    );

    // Determine if we should attack or follow
    this.isAttacking = distance < this.attackDistance;

    // Calculate direction to target
    const directionX = targetPos.x - aiPos.x;
    const directionZ = targetPos.z - aiPos.z;

    // Get AI car's forward direction using the chassis body's quaternion
    const chassisQuaternion = this.car.chassisBody.quaternion;
    const forwardVector = new THREE.Vector3(0, 0, 1);
    forwardVector.applyQuaternion(
      new THREE.Quaternion(
        chassisQuaternion.x,
        chassisQuaternion.y,
        chassisQuaternion.z,
        chassisQuaternion.w
      )
    );

    // Calculate desired direction (normalized)
    const desiredDirection = new THREE.Vector3(
      directionX,
      0,
      directionZ
    ).normalize();

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
    const smoothFactor =
      alignment > 0.8 ? this.steerSmoothFactor * 2 : this.steerSmoothFactor;
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
    if (
      this.isAttacking &&
      Math.abs(this.currentSteer) > 0.1 &&
      this.targetCar.car.chassisBody.velocity
    ) {
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
    // Apply smooth steering to front wheels only
    this.car.setSteeringValue(this.currentSteer, 2);
    this.car.setSteeringValue(this.currentSteer, 3);

    // Apply throttle to all wheels
    const force =
      this.currentThrottle * (this.isAttacking && !this.isRecovering ? 1.2 : 1);
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
    this.recoveryPhase = "reverse";
    this.collisionForce = 0;
    this.stuckCounter = 0;
    this.positionHistory = [];

    // Reset flip detection state
    this.isFlipped = false;
    this.flipStartTime = 0;
  }

  update() {
    const updateWorld = () => {
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

  // Method to get distance to target (useful for debugging)
  getDistanceToTarget() {
    if (
      !this.targetCar ||
      !this.targetCar.car ||
      !this.targetCar.car.chassisBody
    )
      return Infinity;

    const aiPos = this.car.chassisBody.position;
    const targetPos = this.targetCar.car.chassisBody.position;

    return Math.sqrt(
      Math.pow(targetPos.x - aiPos.x, 2) + Math.pow(targetPos.z - aiPos.z, 2)
    );
  }

  // Method to check current recovery status (useful for debugging)
  getRecoveryStatus() {
    return {
      isRecovering: this.isRecovering,
      recoveryPhase: this.recoveryPhase,
      stuckCounter: this.stuckCounter,
      collisionForce: this.collisionForce,
      isFlipped: this.isFlipped,
      flipDuration: this.isFlipped ? Date.now() - this.flipStartTime : 0,
    };
  }

  // Method to manually trigger flip reset (useful for testing)
  forceFlipReset() {
    this.resetFromFlip();
  }

  cleanup() {
    console.log("Cleaning up AI Car...");
    
    // Clear the AI decision making interval
    if (this.aiInterval) {
      clearInterval(this.aiInterval);
      this.aiInterval = null;
    }
    
    // Remove the car from the physics world
    if (this.car && this.world) {
      this.car.removeFromWorld(this.world);
    }
    
    // Remove chassis from the scene
    if (this.chassis && this.scene) {
      this.scene.remove(this.chassis);
      
      // Dispose of chassis materials and geometries
      this.chassis.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
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
    
    // Remove wheels from the scene
    if (this.wheels) {
      this.wheels.forEach((wheel) => {
        if (wheel && this.scene) {
          this.scene.remove(wheel);
          
          // Dispose of wheel materials and geometries
          wheel.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) {
                child.geometry.dispose();
              }
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
    }
    
    // Remove collision event listener
    if (this.car && this.car.chassisBody) {
      this.car.chassisBody.removeEventListener("collide");
    }
    
    // Clear references
    this.chassis = null;
    this.wheels = [];
    this.car = null;
    this.targetCar = null;
    this.scene = null;
    this.world = null;
    this.positionHistory = [];
    this.targetPosition = null;
    
    console.log("AI Car cleanup completed");
  }
}

