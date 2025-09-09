import * as THREE from "three";

class NitroFireParticle {
  constructor(
    x,
    y,
    z,
    lifetime,
    scene,
    fireMaterial,
    type = "fire",
    sizeMultiplier = 1
  ) {
    this.position = new THREE.Vector3(x, y, z);
    this.type = type;
    this.sizeMultiplier = sizeMultiplier;

    // Different velocity patterns for fire and sparks
    if (type === "fire") {
      this.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4 * sizeMultiplier,
        Math.random() * 3 + 2,
        (Math.random() - 0.5) * 2 * sizeMultiplier
      );
    } else if (type === "spark") {
      this.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8 * sizeMultiplier,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 6 * sizeMultiplier
      );
    } else {
      // 'smoke'
      this.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3 * sizeMultiplier,
        Math.random() * 2 + 1.5,
        (Math.random() - 0.5) * 2 * sizeMultiplier
      );
    }

    this.startVelocity = this.velocity.clone();
    this.age = 0;
    this.lifetime = lifetime;

    // Different scale patterns with size multiplier
    if (type === "fire") {
      this.startScale = (Math.random() * 0.6 + 0.3) * sizeMultiplier;
      this.finalScale =
        this.startScale + (Math.random() * 0.4 + 0.2) * sizeMultiplier;
    } else if (type === "spark") {
      this.startScale = (Math.random() * 0.3 + 0.1) * sizeMultiplier;
      this.finalScale = this.startScale * 0.5;
    } else {
      // 'smoke'
      this.startScale = (Math.random() * 0.5 + 0.2) * sizeMultiplier;
      this.finalScale =
        this.startScale + (Math.random() * 0.8 + 0.4) * sizeMultiplier;
    }

    this.currentScale = this.startScale;

    // Create the sprite for this particle
    this.sprite = new THREE.Sprite(fireMaterial.clone());
    this.sprite.position.copy(this.position);
    this.sprite.scale.setScalar(this.currentScale);
    scene.add(this.sprite);
  }

  update(deltaTime) {
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime * 0.001));

    // Age the particle
    this.age += deltaTime;
    const lifeFrac = this.age / this.lifetime;

    // Update velocity based on type
    if (this.type === "fire") {
      const dampingFactor = Math.pow(0.92, deltaTime * 0.06);
      this.velocity.multiplyScalar(dampingFactor);
      this.velocity.y += deltaTime * 0.002;
    } else if (this.type === "spark") {
      this.velocity.y -= deltaTime * 0.008;
      const dampingFactor = Math.pow(0.98, deltaTime * 0.06);
      this.velocity.multiplyScalar(dampingFactor);
    } else {
      // 'smoke'
      const dampingFactor = Math.pow(0.95, deltaTime * 0.06);
      this.velocity.multiplyScalar(dampingFactor);
    }

    // Update scale
    this.currentScale =
      this.startScale + lifeFrac * (this.finalScale - this.startScale);

    // Calculate opacity based on type
    let opacity;
    if (this.type === "fire") {
      if (lifeFrac < 0.1) {
        opacity = lifeFrac / 0.1;
      } else {
        opacity = (1 - lifeFrac) / 0.9;
      }
      opacity = Math.max(0, opacity * 0.9);
    } else if (this.type === "spark") {
      opacity = Math.max(0, (1 - lifeFrac) * 0.8);
    } else {
      // 'smoke'
      if (lifeFrac < 0.2) {
        opacity = (lifeFrac / 0.2) * 0.6;
      } else {
        opacity = ((1 - lifeFrac) / 0.8) * 0.6;
      }
    }

    // Update sprite
    this.sprite.position.copy(this.position);
    this.sprite.scale.setScalar(this.currentScale);
    this.sprite.material.opacity = Math.max(0, opacity);
  }

  isAlive() {
    return this.age < this.lifetime;
  }

  destroy(scene) {
    scene.remove(this.sprite);
    this.sprite.material.dispose();
  }
}

export default class Nitro {
  constructor(scene, world, vehicle, car, offset = { x: 0, y: 0, z: 0 }) {
    this.scene = scene;
    this.world = world;
    this.vehicle = vehicle;
    this.car = car; // Reference to the car object with isDrifting property
    this.offset = offset;
    this.size = 1.0; // Size multiplier for the entire effect

    this.particles = [];
    this.isActive = false;
    this.lastEmissionTime = 0;
    this.emissionRate = 10;
    this.particlesPerEmission = 4;
    this.duration = 500; // 5 seconds duration

    // Track drift state
    this.wasDrifting = false;
    this.activationStartTime = 0;
    this.canActivate = true;

    this.fireMaterial = null;
    this.sparkMaterial = null;
    this.smokeMaterial = null;

    this.vehicleType = this.detectVehicleType();
    this.audioContext = null;
    this.nitroSound = null;

    this.nitroTimeout = null; // For managing the 5-second timeout
  }

  detectVehicleType() {
    if (this.vehicle && this.vehicle.truck && this.vehicle.trailer) {
      return "truck-trailer";
    } else if (this.vehicle && this.vehicle.car) {
      return "car";
    }
    return "unknown";
  }

  init() {
    this.createFireTexture();
    this.createSparkTexture();
    this.createSmokeTexture();
    // this.setupAudio();
    this.update();
  }

  createFireTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.2, "rgba(255, 255, 0, 0.9)");
    gradient.addColorStop(0.4, "rgba(255, 150, 0, 0.8)");
    gradient.addColorStop(0.6, "rgba(255, 50, 0, 0.6)");
    gradient.addColorStop(0.8, "rgba(150, 0, 0, 0.3)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const fireTexture = new THREE.CanvasTexture(canvas);
    fireTexture.needsUpdate = true;

    this.fireMaterial = new THREE.SpriteMaterial({
      map: fireTexture,
      transparent: true,
      opacity: 0.9,
      color: new THREE.Color(1, 0.8, 0.6),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  createSparkTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.3, "rgba(255, 255, 0, 0.8)");
    gradient.addColorStop(0.6, "rgba(255, 100, 0, 0.4)");
    gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const sparkTexture = new THREE.CanvasTexture(canvas);
    sparkTexture.needsUpdate = true;

    this.sparkMaterial = new THREE.SpriteMaterial({
      map: sparkTexture,
      transparent: true,
      opacity: 0.8,
      color: new THREE.Color(1, 0.9, 0.7),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  createSmokeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(50, 50, 50, 1)");
    gradient.addColorStop(0.3, "rgba(80, 80, 80, 0.8)");
    gradient.addColorStop(0.6, "rgba(120, 120, 120, 0.4)");
    gradient.addColorStop(0.8, "rgba(160, 160, 160, 0.2)");
    gradient.addColorStop(1, "rgba(200, 200, 200, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const smokeTexture = new THREE.CanvasTexture(canvas);
    smokeTexture.needsUpdate = true;

    this.smokeMaterial = new THREE.SpriteMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: 0.6,
      color: new THREE.Color(0.4, 0.4, 0.4),
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
  }

  // setupAudio() {
  //     try {
  //         this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  //     } catch (error) {
  //         console.log('Audio context not supported');
  //     }
  // }

  // playNitroSound() {
  //     if (!this.audioContext) return;

  //     try {
  //         // Stop any existing sound
  //         if (this.nitroSound) {
  //             this.nitroSound.stop();
  //         }

  //         const oscillator = this.audioContext.createOscillator();
  //         const gainNode = this.audioContext.createGain();

  //         oscillator.connect(gainNode);
  //         gainNode.connect(this.audioContext.destination);

  //         // Create a 5-second sound
  //         oscillator.frequency.setValueAtTime(30, this.audioContext.currentTime);
  //         oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.5);
  //         oscillator.frequency.exponentialRampToValueAtTime(120, this.audioContext.currentTime + 2);
  //         oscillator.frequency.exponentialRampToValueAtTime(60, this.audioContext.currentTime + 4);

  //         oscillator.type = 'sawtooth';

  //         gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
  //         gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
  //         gainNode.gain.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + 4);
  //         gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 5);

  //         this.nitroSound = oscillator;
  //         oscillator.start();
  //         oscillator.stop(this.audioContext.currentTime + 5);
  //     } catch (error) {
  //         console.log('Audio playback error:', error);
  //     }
  // }

  // stopNitroSound() {
  //     if (this.nitroSound && this.audioContext) {
  //         try {
  //             this.nitroSound.stop();
  //             this.nitroSound = null;
  //         } catch (error) {
  //             console.log('Audio stop error:', error);
  //         }
  //     }
  // }

  activateNitro() {
    if (this.isActive) return;

    this.isActive = true;
    this.activationStartTime = Date.now();
    this.lastEmissionTime = 0;
    this.canActivate = false; // Prevent activation while running

    // this.playNitroSound();
    console.log("Nitro activated for 5 seconds!");

    // Clear any existing timeout
    if (this.nitroTimeout) {
      clearTimeout(this.nitroTimeout);
    }

    // Set timeout to deactivate after 5 seconds
    this.nitroTimeout = setTimeout(() => {
      this.deactivateNitro();
    }, this.duration);
  }

  deactivateNitro() {
    if (!this.isActive) return;

    this.isActive = false;
    // this.stopNitroSound();

    // Clear timeout if it exists
    if (this.nitroTimeout) {
      clearTimeout(this.nitroTimeout);
      this.nitroTimeout = null;
    }

    // Allow activation again
    this.canActivate = true;

    console.log("Nitro deactivated!");
  }

  checkDriftState() {
    // Check if car is drifting and handle state changes
    if (this.car && this.car.isDrifting !== undefined) {
      const isDrifting = this.car.isDrifting;

      // If car just started drifting and we can activate
      if (
        isDrifting &&
        !this.wasDrifting &&
        this.canActivate &&
        !this.isActive
      ) {
        this.activateNitro();
      }

      // Update the previous drift state
      this.wasDrifting = isDrifting;
    }
  }

  getVehiclePosition() {
    if (!this.vehicle) return new THREE.Vector3(0, 0, 0);

    try {
      switch (this.vehicleType) {
        case "truck-trailer":
          if (this.vehicle.truck && this.vehicle.truck.chassisBody) {
            const pos = this.vehicle.truck.chassisBody.position;
            return new THREE.Vector3(pos.x, pos.y, pos.z);
          }
          if (this.vehicle.truckChassis && this.vehicle.truckChassis.position) {
            return this.vehicle.truckChassis.position.clone();
          }
          break;

        case "car":
          if (this.vehicle.car && this.vehicle.car.chassisBody) {
            const pos = this.vehicle.car.chassisBody.position;
            return new THREE.Vector3(pos.x, pos.y, pos.z);
          }
          if (this.vehicle.chassis && this.vehicle.chassis.position) {
            return this.vehicle.chassis.position.clone();
          }
          break;

        default:
          if (this.vehicle.position) {
            return this.vehicle.position.clone();
          }
          break;
      }
    } catch (error) {
      console.warn("Error getting vehicle position:", error);
    }

    return new THREE.Vector3(0, 0, 0);
  }

  getVehicleRotation() {
    if (!this.vehicle) return new THREE.Quaternion();

    try {
      switch (this.vehicleType) {
        case "truck-trailer":
          if (this.vehicle.truck && this.vehicle.truck.chassisBody) {
            const quat = this.vehicle.truck.chassisBody.quaternion;
            return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
          }
          if (
            this.vehicle.truckChassis &&
            this.vehicle.truckChassis.quaternion
          ) {
            return this.vehicle.truckChassis.quaternion.clone();
          }
          break;

        case "car":
          if (this.vehicle.car && this.vehicle.car.chassisBody) {
            const quat = this.vehicle.car.chassisBody.quaternion;
            return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
          }
          if (this.vehicle.chassis && this.vehicle.chassis.quaternion) {
            return this.vehicle.chassis.quaternion.clone();
          }
          break;

        default:
          if (this.vehicle.quaternion) {
            return this.vehicle.quaternion.clone();
          }
          break;
      }
    } catch (error) {
      console.warn("Error getting vehicle rotation:", error);
    }

    return new THREE.Quaternion();
  }

  addNitroEffect() {
    // Only emit particles if nitro is active
    if (!this.isActive) {
      return;
    }

    const currentTime = Date.now();

    if (currentTime - this.lastEmissionTime < this.emissionRate) {
      return;
    }

    this.lastEmissionTime = currentTime;

    const vehiclePos = this.getVehiclePosition();
    const vehicleRotation = this.getVehicleRotation();

    // Scale emission points based on size
    const emissionPoints = [
      {
        x: (this.offset.x - 0.5) * this.size,
        y: this.offset.y * this.size,
        z: this.offset.z * this.size,
      },
      {
        x: (this.offset.x + 0.5) * this.size,
        y: this.offset.y * this.size,
        z: this.offset.z * this.size,
      },
      {
        x: this.offset.x * this.size,
        y: (this.offset.y - 0.2) * this.size,
        z: this.offset.z * this.size,
      },
    ];

    emissionPoints.forEach((point) => {
      const localOffset = new THREE.Vector3(point.x, point.y, point.z);
      localOffset.applyQuaternion(vehicleRotation);

      const emissionPos = new THREE.Vector3(
        vehiclePos.x + localOffset.x + (Math.random() - 0.5) * 0.3 * this.size,
        vehiclePos.y + localOffset.y + Math.random() * 0.1 * this.size,
        vehiclePos.z + localOffset.z + (Math.random() - 0.5) * 0.3 * this.size
      );

      // Create fire particles
      for (let i = 0; i < this.particlesPerEmission; i++) {
        const lifetime = 400 + Math.random() * 100;
        const particle = new NitroFireParticle(
          emissionPos.x + (Math.random() - 0.5) * 0.2 * this.size,
          emissionPos.y + Math.random() * 0.05 * this.size,
          emissionPos.z + (Math.random() - 0.5) * 0.2 * this.size,
          lifetime,
          this.scene,
          this.fireMaterial,
          "fire",
          this.size
        );

        const exhaustDirection = new THREE.Vector3(0, 0, 1);
        exhaustDirection.applyQuaternion(vehicleRotation);
        particle.velocity.add(exhaustDirection.multiplyScalar(2 * this.size));

        this.particles.push(particle);
      }

      // Create spark particles
      for (let i = 0; i < Math.floor(this.particlesPerEmission * 0.5); i++) {
        const lifetime = 300 + Math.random() * 50;
        const particle = new NitroFireParticle(
          emissionPos.x + (Math.random() - 0.5) * 0.3 * this.size,
          emissionPos.y + Math.random() * 0.1 * this.size,
          emissionPos.z + (Math.random() - 0.5) * 0.3 * this.size,
          lifetime,
          this.scene,
          this.sparkMaterial,
          "spark",
          this.size
        );

        const exhaustDirection = new THREE.Vector3(0, 0, 1);
        exhaustDirection.applyQuaternion(vehicleRotation);
        particle.velocity.add(exhaustDirection.multiplyScalar(1.5 * this.size));

        this.particles.push(particle);
      }

      // Create smoke particles
      for (let i = 0; i < Math.floor(this.particlesPerEmission * 0.3); i++) {
        const lifetime = 600 + Math.random() * 150;
        const particle = new NitroFireParticle(
          emissionPos.x + (Math.random() - 0.5) * 0.4 * this.size,
          emissionPos.y + Math.random() * 0.15 * this.size,
          emissionPos.z + (Math.random() - 0.5) * 0.4 * this.size,
          lifetime,
          this.scene,
          this.smokeMaterial,
          "smoke",
          this.size
        );

        const exhaustDirection = new THREE.Vector3(0, 0, 1);
        exhaustDirection.applyQuaternion(vehicleRotation);
        particle.velocity.add(exhaustDirection.multiplyScalar(0.8 * this.size));

        this.particles.push(particle);
      }
    });
  }

  update() {
    const updateNitro = () => {
      const deltaTime = 16;

      // Check drift state on each update
      this.checkDriftState();

      // Add particles if active
      if (this.isActive) {
        this.addNitroEffect();
      }

      // Update existing particles
      this.particles = this.particles.filter((particle) => {
        particle.update(deltaTime);

        if (particle.isAlive()) {
          return true;
        } else {
          particle.destroy(this.scene);
          return false;
        }
      });
    };

    if (this.world && this.world.addEventListener) {
      this.world.addEventListener("postStep", updateNitro);
    } else {
      const animate = () => {
        updateNitro();
        requestAnimationFrame(animate);
      };
      animate();
    }
  }

  // Size control method
  setSize(size) {
    this.size = Math.max(0.1, size); // Minimum size to prevent issues
  }

  getSize() {
    return this.size;
  }

  start() {
    this.activateNitro();
  }

  stop() {
    this.deactivateNitro();
  }

  isNitroActive() {
    return this.isActive;
  }

  getRemainingTime() {
    if (!this.isActive) return 0;
    const elapsed = Date.now() - this.activationStartTime;
    return Math.max(0, this.duration - elapsed);
  }

  destroy() {
    this.particles.forEach((particle) => particle.destroy(this.scene));
    this.particles = [];

    if (this.nitroTimeout) {
      clearTimeout(this.nitroTimeout);
    }

    if (this.fireMaterial) {
      this.fireMaterial.dispose();
    }
    if (this.sparkMaterial) {
      this.sparkMaterial.dispose();
    }
    if (this.smokeMaterial) {
      this.smokeMaterial.dispose();
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  setDuration(duration) {
    this.duration = duration;
  }

  setEmissionRate(rate) {
    this.emissionRate = rate;
  }

  setParticlesPerEmission(count) {
    this.particlesPerEmission = count;
  }

  setOffset(offset) {
    this.offset = offset;
  }
}
