import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class Health {
  constructor(world, scene, car, initialHealth = 100, renderer = null, options = {}) {
    this.world = world;
    this.scene = scene;
    this.car = car;
    this.renderer = renderer; // Add renderer reference for canvas manipulation
    this.maxHealth = initialHealth;
    this.currentHealth = initialHealth;

    // Add isDestroyed boolean property
    this.isDestroyed = false;

    // Collision detection properties
    this.healthBody = null;
    this.healthBox = null;
    this.collisionCooldown = 500; // 500ms cooldown between damage
    this.lastCollisionTime = 0;

    // Damage values
    this.aiCarDamage = 1;
    this.bombDamage = 5; // Significant damage from AI cars
    this.environmentDamage = 0; // Negligible damage from environment
    this.aiSportsCarDamage = 0;

    // Sound properties - arrays to hold multiple sounds for each type
    this.sounds = {
      aiCarCollision: [],
      bombCollision: []
    };
    this.soundUrls = {
      aiCarCollision: [
        './sounds/car_hit_1.mp3',
        './sounds/car_hit_2.mp3',
        './sounds/car_hit_3.mp3',
        './sounds/car_hit_4.mp3',
        './sounds/car_hit_5.mp3'
      ],
      bombCollision: [
        './sounds/bullet_hit_1.mp3',
        './sounds/bullet_hit_2.mp3',
        './sounds/bullet_hit_3.mp3',
        './sounds/bullet_hit_4.mp3',
        './sounds/bullet_hit_5.mp3'
      ]
    };
    this.soundVolume = 0.5; // Default volume
    this.soundsEnabled = true;

    // Health bar properties with default values and proper options handling
    this.healthBarWidth = options.healthBarWidth || 200; // Default width: 200px
    this.healthBarHeight = options.healthBarHeight || 20; // Default height: 20px
    this.healthBarContainer = null;
    this.healthBarFill = null;

    // Visual feedback properties
    this.damageFlashDuration = 300;
    this.isDamageFlashing = false;
    this.originalCameraFov = null;

    // Game restart properties
    this.gameOverScreen = null;
    this.playAgainButton = null;
    this.onRestart = null; // Callback for game restart

    // Callbacks
    this.onHealthChange = null;
    this.onDeath = null;
    this.onDamage = null;

    // Debug wireframe (optional)
    this.debugWireframe = null;
    this.showDebugWireframe = false;
  }

  // Method to update health bar dimensions dynamically
  updateHealthBarDimensions(width, height) {
    this.healthBarWidth = width;
    this.healthBarHeight = height;
    
    // If health bar already exists, update its styling
    if (this.healthBarContainer) {
      this.healthBarContainer.style.width = `${width}px`;
      this.healthBarContainer.style.height = `${height}px`;
    }
    
    if (this.healthBarFill) {
      this.healthBarFill.style.height = `${height}px`;
      // Update width based on current health percentage
      const healthPercentage = (this.currentHealth / this.maxHealth) * 100;
      this.healthBarFill.style.width = `${healthPercentage}%`;
    }
  }

  // Method to get current health bar dimensions
  getHealthBarDimensions() {
    return {
      width: this.healthBarWidth,
      height: this.healthBarHeight
    };
  }

  init() {
    this.createHealthCollisionBox();
    this.createHealthBar();
    this.setupCollisionDetection();
    this.setupEventListeners();
    this.loadSounds();
    this.startUpdateLoop();

    console.log("Health system initialized with", this.maxHealth, "HP");
  }

  // Load sound effects - modified to handle multiple sounds
  loadSounds() {
    // Create audio loader
    const audioLoader = new THREE.AudioLoader();
    const listener = new THREE.AudioListener();

    // Load AI car collision sounds
    this.soundUrls.aiCarCollision.forEach((url, index) => {
      const sound = new THREE.Audio(listener);
      audioLoader.load(
        url,
        (buffer) => {
          sound.setBuffer(buffer);
          sound.setVolume(this.soundVolume);
          this.sounds.aiCarCollision[index] = sound;
          console.log(`AI car collision sound ${index + 1} loaded`);
        },
        (progress) => {
          console.log(`Loading AI car collision sound ${index + 1}...`, (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.warn(`Failed to load AI car collision sound ${index + 1}:`, error);
          this.sounds.aiCarCollision[index] = null;
        }
      );
    });

    // Load bomb collision sounds
    this.soundUrls.bombCollision.forEach((url, index) => {
      const sound = new THREE.Audio(listener);
      audioLoader.load(
        url,
        (buffer) => {
          sound.setBuffer(buffer);
          sound.setVolume(this.soundVolume);
          this.sounds.bombCollision[index] = sound;
          console.log(`Bomb collision sound ${index + 1} loaded`);
        },
        (progress) => {
          console.log(`Loading bomb collision sound ${index + 1}...`, (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.warn(`Failed to load bomb collision sound ${index + 1}:`, error);
          this.sounds.bombCollision[index] = null;
        }
      );
    });
  }

  // Play sound effect - modified to randomly select from available sounds
  playSound(soundType) {
    if (!this.soundsEnabled) return;

    const soundArray = this.sounds[soundType];
    if (!soundArray || soundArray.length === 0) {
      console.warn(`No sounds available for ${soundType}`);
      return;
    }

    // Filter out null sounds (failed to load)
    const availableSounds = soundArray.filter(sound => sound && sound.buffer);
    
    if (availableSounds.length === 0) {
      console.warn(`No loaded sounds available for ${soundType}`);
      return;
    }

    // Randomly select one of the available sounds
    const randomIndex = Math.floor(Math.random() * availableSounds.length);
    const selectedSound = availableSounds[randomIndex];

    if (selectedSound && selectedSound.buffer) {
      // Stop the sound if it's already playing
      if (selectedSound.isPlaying) {
        selectedSound.stop();
      }
      
      try {
        selectedSound.play();
        console.log(`Playing ${soundType} sound (variant ${randomIndex + 1})`);
      } catch (error) {
        console.warn(`Failed to play ${soundType} sound:`, error);
      }
    }
  }

  // Create invisible collision box that follows the car
  createHealthCollisionBox() {
    // Create collision box slightly larger than car chassis
    const boxShape = new CANNON.Box(new CANNON.Vec3(1.5, 0.8, 3.8));

    this.healthBody = new CANNON.Body({
      mass: 0, // Kinematic body (no physics simulation)
      isTrigger: true, // This makes it a trigger/sensor
      type: CANNON.Body.KINEMATIC,
    });

    this.healthBody.addShape(boxShape);

    // Add user data to identify this as health collision box
    this.healthBody.userData = {
      type: "healthCollision",
      health: this,
      belongsTo: "player",
    };

    // Add to physics world
    this.world.addBody(this.healthBody);

    // Optional: Create debug wireframe
    if (this.showDebugWireframe) {
      this.createDebugWireframe();
    }

    console.log("Health collision box created");
  }

  // Create debug wireframe for visualization
  createDebugWireframe() {
    const wireframeGeometry = new THREE.BoxGeometry(3, 1.6, 7.6);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });

    this.debugWireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    this.scene.add(this.debugWireframe);
  }

  // Create health progress bar UI
  createHealthBar() {
    // Create container div
    this.healthBarContainer = document.createElement("div");
    this.healthBarContainer.style.position = "fixed";
    this.healthBarContainer.style.top = "20px";
    this.healthBarContainer.style.left = "20px";
    this.healthBarContainer.style.width = this.healthBarWidth + "px";
    this.healthBarContainer.style.height = this.healthBarHeight + "px";
    this.healthBarContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.healthBarContainer.style.border = "2px solid #ffffff";
    this.healthBarContainer.style.borderRadius = "10px";
    this.healthBarContainer.style.overflow = "hidden";
    this.healthBarContainer.style.zIndex = "1000";
    this.healthBarContainer.style.fontFamily = "Arial, sans-serif";
    this.healthBarContainer.style.fontSize = "12px";
    this.healthBarContainer.style.color = "#ffffff";
    this.healthBarContainer.style.textAlign = "center";
    this.healthBarContainer.style.lineHeight = this.healthBarHeight + "px";

    // Create health bar fill
    this.healthBarFill = document.createElement("div");
    this.healthBarFill.style.position = "absolute";
    this.healthBarFill.style.top = "0";
    this.healthBarFill.style.left = "0";
    this.healthBarFill.style.width = "100%";
    this.healthBarFill.style.height = "100%";
    this.healthBarFill.style.backgroundColor = this.getHealthColor();
    this.healthBarFill.style.transition = "all 0.3s ease";
    this.healthBarFill.style.borderRadius = "8px";

    // Create health text
    this.healthText = document.createElement("div");
    this.healthText.style.position = "relative";
    this.healthText.style.zIndex = "1001";
    this.healthText.style.textShadow = "1px 1px 2px rgba(0,0,0,0.8)";
    this.healthText.style.fontWeight = "bold";
    this.healthText.textContent = `${this.currentHealth}/${this.maxHealth}`;

    // Assemble health bar
    this.healthBarContainer.appendChild(this.healthBarFill);
    this.healthBarContainer.appendChild(this.healthText);
    document.body.appendChild(this.healthBarContainer);

    console.log("Health bar UI created");
  }

  // Get health bar color based on current health percentage
  getHealthColor() {
    const healthPercent = this.currentHealth / this.maxHealth;

    if (healthPercent > 0.6) {
      return "#00ff00"; // Green
    } else if (healthPercent > 0.3) {
      return "#ffff00"; // Yellow
    } else {
      return "#ff0000"; // Red
    }
  }

  // Setup collision detection
  setupCollisionDetection() {
    this.world.addEventListener("beginContact", (event) => {
      this.handleCollision(event);
    });
  }

  // Handle collision events - UPDATED with sound effects
// Handle collision events - FIXED to play sounds even with 0 damage
handleCollision(event) {
  // Check if event has the expected structure
  let bodyA, bodyB;

  if (event.contact) {
    // Standard cannon-es structure
    bodyA = event.contact.bi;
    bodyB = event.contact.bj;
  } else if (event.bodyA && event.bodyB) {
    // Alternative structure
    bodyA = event.bodyA;
    bodyB = event.bodyB;
  } else if (event.bi && event.bj) {
    // Another possible structure
    bodyA = event.bi;
    bodyB = event.bj;
  } else {
    // Fallback - log the event structure for debugging
    console.warn("Unknown collision event structure:", event);
    return;
  }

  let healthBody = null;
  let otherBody = null;

  // Determine which body is our health collision box
  if (
    bodyA?.userData?.type === "healthCollision" &&
    bodyA?.userData?.health === this
  ) {
    healthBody = bodyA;
    otherBody = bodyB;
  } else if (
    bodyB?.userData?.type === "healthCollision" &&
    bodyB?.userData?.health === this
  ) {
    healthBody = bodyB;
    otherBody = bodyA;
  }

  // If neither body is our health box, ignore
  if (!healthBody || !otherBody) return;

  // Check collision cooldown
  const currentTime = Date.now();
  if (currentTime - this.lastCollisionTime < this.collisionCooldown) {
    return;
  }

  // Determine damage amount and sound based on what we collided with
  let damageAmount = 0;
  let collisionType = "unknown";
  let soundToPlay = null;

  if (otherBody.userData?.type === "aiCar") {
    damageAmount = this.aiCarDamage;
    collisionType = "aiCar";
    soundToPlay = "aiCarCollision";
    console.log("Collision with AI car detected!");
  } else if (otherBody.userData?.type?.startsWith("aicar")) {
    damageAmount = this.aiSportsCarDamage;
    collisionType = "aiSportsCar"; // Changed for better identification
    soundToPlay = "aiCarCollision";
    console.log("Collision with AI Sports Car detected!");
  } else if (otherBody.userData?.type === "bomb") {
    damageAmount = this.bombDamage;
    collisionType = "bomb";
    soundToPlay = "bombCollision";
    console.log("Collision with Bomb detected!");
  } else if (
    otherBody.userData?.type === "car" &&
    otherBody.userData?.car !== this.car
  ) {
    // Another player car (if multiplayer)
    damageAmount = this.aiCarDamage;
    collisionType = "playerCar";
    soundToPlay = "aiCarCollision";
    console.log("Collision with another player car detected!");
  } else {
    // Environment collision (walls, obstacles, etc.)
    damageAmount = this.environmentDamage;
    collisionType = "environment";
    console.log("Collision with environment detected!");
  }

  // FIXED: Play sound for ANY collision that has a sound defined, regardless of damage
  if (soundToPlay) {
    this.playSound(soundToPlay);
    console.log(`Playing sound: ${soundToPlay} for collision type: ${collisionType}`);
  }

  // Apply damage only if there is damage to apply
  if (damageAmount > 0) {
    this.takeDamage(damageAmount, collisionType);
  }
  
  // Update collision time regardless of damage amount
  this.lastCollisionTime = currentTime;
}

  // Apply damage to health
  takeDamage(amount, source = "unknown") {
    if (this.currentHealth <= 0) return; // Already dead

    const previousHealth = this.currentHealth;
    this.currentHealth = Math.max(0, this.currentHealth - amount);

    console.log(
      `Took ${amount} damage from ${source}. Health: ${this.currentHealth}/${this.maxHealth}`
    );

    // Update health bar
    this.updateHealthBar();

    // Visual feedback
    this.showDamageEffect(amount);

    // Call damage callback
    if (this.onDamage) {
      this.onDamage(amount, source, this.currentHealth, previousHealth);
    }

    // Call health change callback
    if (this.onHealthChange) {
      this.onHealthChange(this.currentHealth, previousHealth);
    }

    // Check for death
    if (this.currentHealth <= 0) {
      this.handleDeath();
    }
  }

  // Handle death - MODIFIED to set isDestroyed to true
  handleDeath() {
    console.log("Player car destroyed!");

    // Set isDestroyed to true when car is destroyed
    this.isDestroyed = true;
    console.log(this.isDestroyed);

    // Stop the game loop and hide canvas
    this.stopGameAndShowRestart();

    // Call death callback
    if (this.onDeath) {
      this.onDeath();
    }
  }

  // NEW METHOD: Stop game and show restart screen
  stopGameAndShowRestart() {
    // Hide the canvas
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.display = "none";
    }

    // Hide health bar
    if (this.healthBarContainer) {
      this.healthBarContainer.style.display = "none";
    }

    // Create game over screen
    // this.createGameOverScreen();
  }

  // NEW METHOD: Restart the game - MODIFIED to reset isDestroyed
  restartGame() {
    console.log("Restarting game...");

    // Reset isDestroyed flag
    this.isDestroyed = false;

    // Call restart callback if provided
    if (this.onRestart) {
      this.onRestart();
    }

    // Reset health
    this.currentHealth = this.maxHealth;
    this.updateHealthBar();

    // Show canvas again
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.display = "block";
    }

    // Show health bar again
    if (this.healthBarContainer) {
      this.healthBarContainer.style.display = "block";
    }

    // Remove game over screen
    if (this.gameOverScreen && this.gameOverScreen.parentNode) {
      this.gameOverScreen.parentNode.removeChild(this.gameOverScreen);
      this.gameOverScreen = null;
      this.playAgainButton = null;
    }

    console.log("Game restarted successfully");
  }

  // Update health bar visual
  updateHealthBar() {
    if (!this.healthBarFill || !this.healthText) return;

    const healthPercent = (this.currentHealth / this.maxHealth) * 100;

    this.healthBarFill.style.width = healthPercent + "%";
    this.healthBarFill.style.backgroundColor = this.getHealthColor();
    this.healthText.textContent = `${Math.ceil(this.currentHealth)}/${
      this.maxHealth
    }`;

    // Add pulsing effect for low health
    if (healthPercent < 20) {
      this.healthBarContainer.style.animation = "healthPulse 1s infinite";
    } else {
      this.healthBarContainer.style.animation = "none";
    }
  }

  // Show damage visual effect
  showDamageEffect(damageAmount) {
    if (this.isDamageFlashing) return;

    this.isDamageFlashing = true;

    // Screen flash effect
    const flashOverlay = document.createElement("div");
    flashOverlay.style.position = "fixed";
    flashOverlay.style.top = "0";
    flashOverlay.style.left = "0";
    flashOverlay.style.width = "100%";
    flashOverlay.style.height = "100%";
    flashOverlay.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
    flashOverlay.style.pointerEvents = "none";
    flashOverlay.style.zIndex = "9999";
    flashOverlay.style.animation = `damageFlash ${this.damageFlashDuration}ms ease-out`;

    document.body.appendChild(flashOverlay);

    // Show damage number
    this.showDamageNumber(damageAmount);

    // Remove flash overlay after animation
    setTimeout(() => {
      if (flashOverlay.parentNode) {
        flashOverlay.parentNode.removeChild(flashOverlay);
      }
      this.isDamageFlashing = false;
    }, this.damageFlashDuration);
  }

  // Show floating damage number
  showDamageNumber(damage) {
    const damageNumber = document.createElement("div");
    damageNumber.textContent = `-${Math.ceil(damage)}`;
    damageNumber.style.position = "fixed";
    damageNumber.style.left = "50%";
    damageNumber.style.top = "50%";
    damageNumber.style.transform = "translate(-50%, -50%)";
    damageNumber.style.color = "#ff0000";
    damageNumber.style.fontSize = "24px";
    damageNumber.style.fontWeight = "bold";
    damageNumber.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
    damageNumber.style.pointerEvents = "none";
    damageNumber.style.zIndex = "10000";
    damageNumber.style.animation = "damageNumber 1s ease-out forwards";

    document.body.appendChild(damageNumber);

    setTimeout(() => {
      if (damageNumber.parentNode) {
        damageNumber.parentNode.removeChild(damageNumber);
      }
    }, 1000);
  }

  // Setup CSS animations - UPDATED with new animations
  setupEventListeners() {
    // Add CSS animations to document
    const style = document.createElement("style");
    style.textContent = `
      @keyframes healthPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes damageFlash {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      
      @keyframes damageNumber {
        0% { 
          opacity: 1; 
          transform: translate(-50%, -50%) scale(1); 
        }
        100% { 
          opacity: 0; 
          transform: translate(-50%, -200%) scale(1.5); 
        }
      }
      
      @keyframes gameOverPulse {
        0%, 100% { 
          opacity: 1; 
          transform: scale(1); 
        }
        50% { 
          opacity: 0.8; 
          transform: scale(1.05); 
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Update loop to sync collision box with car
  startUpdateLoop() {
    const updateHealth = () => {
      this.updateHealthCollisionBox();
      requestAnimationFrame(updateHealth);
    };
    updateHealth();
  }

  // Update collision box position to match car
  updateHealthCollisionBox() {
    if (!this.healthBody || !this.car?.car?.chassisBody) return;

    // Copy car's position and rotation
    this.healthBody.position.copy(this.car.car.chassisBody.position);
    this.healthBody.quaternion.copy(this.car.car.chassisBody.quaternion);

    // Update debug wireframe if it exists
    if (this.debugWireframe) {
      this.debugWireframe.position.copy(this.car.car.chassisBody.position);
      this.debugWireframe.quaternion.copy(this.car.car.chassisBody.quaternion);
    }
  }

  // Public methods for external use

  // Heal the car
  heal(amount) {
    const previousHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);

    console.log(
      `Healed ${amount} HP. Health: ${this.currentHealth}/${this.maxHealth}`
    );

    this.updateHealthBar();

    if (this.onHealthChange) {
      this.onHealthChange(this.currentHealth, previousHealth);
    }
  }

  // Set health to full
  fullHeal() {
    this.heal(this.maxHealth - this.currentHealth);
  }

  // Get current health percentage
  getHealthPercent() {
    return (this.currentHealth / this.maxHealth) * 100;
  }

  // Check if car is dead
  isDead() {
    return this.currentHealth <= 0;
  }

  // Get current health
  getCurrentHealth() {
    return this.currentHealth;
  }

  // Get max health
  getMaxHealth() {
    return this.maxHealth;
  }

  // NEW METHOD: Get destruction status
  getIsDestroyed() {
    return this.isDestroyed;
  }

  // NEW METHOD: Set destruction status (for manual control if needed)
  setIsDestroyed(destroyed) {
    this.isDestroyed = destroyed;
  }

  // Sound control methods - updated to handle arrays of sounds
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    
    // Update existing sounds volume
    Object.values(this.sounds).forEach(soundArray => {
      if (Array.isArray(soundArray)) {
        soundArray.forEach(sound => {
          if (sound && sound.setVolume) {
            sound.setVolume(this.soundVolume);
          }
        });
      }
    });
  }

  enableSounds() {
    this.soundsEnabled = true;
    console.log("Sounds enabled");
  }

  disableSounds() {
    this.soundsEnabled = false;
    console.log("Sounds disabled");
  }

  toggleSounds() {
    this.soundsEnabled = !this.soundsEnabled;
    console.log("Sounds", this.soundsEnabled ? "enabled" : "disabled");
  }

  // Set callback functions
  setOnHealthChange(callback) {
    this.onHealthChange = callback;
  }

  setOnDeath(callback) {
    this.onDeath = callback;
  }

  setOnDamage(callback) {
    this.onDamage = callback;
  }

  // NEW METHOD: Set restart callback
  setOnRestart(callback) {
    this.onRestart = callback;
  }

  // Toggle debug wireframe
  toggleDebugWireframe() {
    this.showDebugWireframe = !this.showDebugWireframe;

    if (this.showDebugWireframe && !this.debugWireframe) {
      this.createDebugWireframe();
    } else if (!this.showDebugWireframe && this.debugWireframe) {
      this.scene.remove(this.debugWireframe);
      this.debugWireframe.geometry.dispose();
      this.debugWireframe.material.dispose();
      this.debugWireframe = null;
    }
  }

  // Cleanup method - UPDATED to clean up sounds
  cleanup() {
    // Stop and dispose of sounds
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        if (sound.isPlaying) {
          sound.stop();
        }
        if (sound.disconnect) {
          sound.disconnect();
        }
      }
    });

    // Remove physics body
    if (this.healthBody) {
      this.world.removeBody(this.healthBody);
    }

    // Remove UI elements
    if (this.healthBarContainer && this.healthBarContainer.parentNode) {
      this.healthBarContainer.parentNode.removeChild(this.healthBarContainer);
    }

    // Remove game over screen
    if (this.gameOverScreen && this.gameOverScreen.parentNode) {
      this.gameOverScreen.parentNode.removeChild(this.gameOverScreen);
    }

    // Remove debug wireframe
    if (this.debugWireframe) {
      this.scene.remove(this.debugWireframe);
      this.debugWireframe.geometry.dispose();
      this.debugWireframe.material.dispose();
    }

    console.log("Health system cleaned up");
  }
}