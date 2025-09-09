import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class Objective {
  constructor(world, scene, car, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, size = { x: 2, y: 2, z: 2 }, requiredOverlaps = 3) {
    this.world = world;
    this.scene = scene;
    this.car = car;
    
    // Objective completion status
    this.isFinished = false;
    this.currentOverlaps = 0;
    this.requiredOverlaps = requiredOverlaps;
    
    // Position, rotation and size (static - doesn't follow car)
    this.position = position;
    this.rotation = rotation;
    this.size = size;
    
    // Collision detection properties
    this.objectiveBody = null;
    this.objectiveMesh = null;
    this.isPlayerInside = false; // Track if player is currently inside
    
    // Visual properties
    this.rotationSpeed = 0.02;
    this.pulseSpeed = 0.03;
    this.baseScale = 1;
    this.pulseScale = 0.2;
    
    // UI elements
    this.tooltip = null;
    this.progressBar = null;
    this.progressContainer = null;
    
    // Callbacks
    this.onObjectiveComplete = null;
    this.onObjectiveTouch = null;
    this.onOverlapProgress = null;
    
    // Debug wireframe (optional)
    this.debugWireframe = null;
    this.showDebugWireframe = false;
    
    // Particle system for completion effect
    this.particles = null;
    this.particleSystem = null;
  }

  init() {
    this.createObjectiveCollisionBox();
    this.createObjectiveMesh();
    this.createParticleSystem();
    this.createTooltip();
    this.createProgressBar();
    this.setupCollisionDetection();
    this.startUpdateLoop();
    
    console.log(`Checkpoint initialized at position: ${JSON.stringify(this.position)}, requires ${this.requiredOverlaps} overlaps`);
  }

  // Create stationary collision box (trigger zone)
  createObjectiveCollisionBox() {
    // Create collision box with specified size
    const boxShape = new CANNON.Box(new CANNON.Vec3(
      this.size.x / 2, 
      this.size.y / 2, 
      this.size.z / 2
    ));

    this.objectiveBody = new CANNON.Body({
      mass: 0, // Static body
      isTrigger: true, // This makes it a trigger/sensor
      type: CANNON.Body.KINEMATIC,
      position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z)
    });

    // Apply rotation
    this.objectiveBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0), 
      this.rotation.x
    );
    const yRotation = new CANNON.Quaternion();
    yRotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.rotation.y);
    this.objectiveBody.quaternion = this.objectiveBody.quaternion.mult(yRotation);
    
    const zRotation = new CANNON.Quaternion();
    zRotation.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.rotation.z);
    this.objectiveBody.quaternion = this.objectiveBody.quaternion.mult(zRotation);

    this.objectiveBody.addShape(boxShape);

    // Add user data to identify this as objective collision box
    this.objectiveBody.userData = {
      type: "objective",
      objective: this,
      belongsTo: "checkpoint"
    };

    // Add to physics world
    this.world.addBody(this.objectiveBody);

    // Optional: Create debug wireframe
    if (this.showDebugWireframe) {
      this.createDebugWireframe();
    }

    console.log("Checkpoint collision box created");
  }

  // Create visual mesh for the checkpoint
  createObjectiveMesh() {
    // Create a glowing cube geometry
    const geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
    
    // Create a glowing material
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
      wireframe: false
    });

    // Create the mesh
    this.objectiveMesh = new THREE.Mesh(geometry, material);
    this.objectiveMesh.position.set(this.position.x, this.position.y, this.position.z);
    this.objectiveMesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    
    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(
      this.size.x * 1.2, 
      this.size.y * 1.2, 
      this.size.z * 1.2
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.objectiveMesh.add(glowMesh);

    this.scene.add(this.objectiveMesh);
    
    console.log("Checkpoint mesh created");
  }

  // Create tooltip showing "CHECKPOINT"
  createTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.textContent = "CHECKPOINT";
    this.tooltip.style.position = "fixed";
    this.tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.tooltip.style.color = "#00ff00";
    this.tooltip.style.padding = "8px 12px";
    this.tooltip.style.borderRadius = "5px";
    this.tooltip.style.fontFamily = "Arial, sans-serif";
    this.tooltip.style.fontSize = "14px";
    this.tooltip.style.fontWeight = "bold";
    this.tooltip.style.border = "2px solid #00ff00";
    this.tooltip.style.zIndex = "10000";
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.style.display = "none";
    this.tooltip.style.textAlign = "center";
    this.tooltip.style.textShadow = "0 0 5px #00ff00";
    this.tooltip.style.boxShadow = "0 0 10px rgba(0, 255, 0, 0.3)";

    document.body.appendChild(this.tooltip);
  }

  // Create progress bar showing overlap progress
  createProgressBar() {
    // Container
    this.progressContainer = document.createElement("div");
    this.progressContainer.style.position = "fixed";
    this.progressContainer.style.width = "200px";
    this.progressContainer.style.height = "20px";
    this.progressContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.progressContainer.style.border = "2px solid #00ff00";
    this.progressContainer.style.borderRadius = "10px";
    this.progressContainer.style.overflow = "hidden";
    this.progressContainer.style.zIndex = "10000";
    this.progressContainer.style.display = "none";

    // Progress fill
    this.progressBar = document.createElement("div");
    this.progressBar.style.width = "0%";
    this.progressBar.style.height = "100%";
    this.progressBar.style.backgroundColor = "#00ff00";
    this.progressBar.style.transition = "width 0.3s ease";
    this.progressBar.style.borderRadius = "8px";

    // Progress text
    this.progressText = document.createElement("div");
    this.progressText.style.position = "absolute";
    this.progressText.style.top = "0";
    this.progressText.style.left = "0";
    this.progressText.style.width = "100%";
    this.progressText.style.height = "100%";
    this.progressText.style.color = "#ffffff";
    this.progressText.style.fontSize = "12px";
    this.progressText.style.fontWeight = "bold";
    this.progressText.style.textAlign = "center";
    this.progressText.style.lineHeight = "20px";
    this.progressText.style.textShadow = "1px 1px 2px rgba(0,0,0,0.8)";
    this.progressText.style.zIndex = "10001";

    this.progressContainer.appendChild(this.progressBar);
    this.progressContainer.appendChild(this.progressText);
    document.body.appendChild(this.progressContainer);

    this.updateProgressBar();
  }

  // Update progress bar
  updateProgressBar() {
    if (!this.progressBar || !this.progressText) return;

    const progressPercent = (this.currentOverlaps / this.requiredOverlaps) * 100;
    this.progressBar.style.width = progressPercent + "%";
    this.progressText.textContent = `${this.currentOverlaps}/${this.requiredOverlaps}`;

    // Change color based on progress
    if (progressPercent >= 100) {
      this.progressBar.style.backgroundColor = "#ffd700"; // Gold when complete
    } else if (progressPercent >= 50) {
      this.progressBar.style.backgroundColor = "#ffff00"; // Yellow when halfway
    } else {
      this.progressBar.style.backgroundColor = "#00ff00"; // Green when starting
    }
  }

  // Create particle system for completion effect
  createParticleSystem() {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Random positions around the checkpoint
      positions[i3] = this.position.x + (Math.random() - 0.5) * 10;
      positions[i3 + 1] = this.position.y + (Math.random() - 0.5) * 10;
      positions[i3 + 2] = this.position.z + (Math.random() - 0.5) * 10;

      // Green/yellow colors
      colors[i3] = Math.random() * 0.5 + 0.5; // Red
      colors[i3 + 1] = 1; // Green
      colors[i3 + 2] = Math.random() * 0.5; // Blue

      sizes[i] = Math.random() * 2 + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      opacity: 0,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  // Create debug wireframe for visualization
  createDebugWireframe() {
    const wireframeGeometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });

    this.debugWireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    this.debugWireframe.position.set(this.position.x, this.position.y, this.position.z);
    this.debugWireframe.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    this.scene.add(this.debugWireframe);
  }

  // Setup collision detection for enter/exit events
  setupCollisionDetection() {
    this.world.addEventListener("beginContact", (event) => {
      this.handleCollisionEnter(event);
    });

    this.world.addEventListener("endContact", (event) => {
      this.handleCollisionExit(event);
    });
  }

  // Handle collision enter events
  handleCollisionEnter(event) {
    const { bodyA, bodyB } = this.getCollisionBodies(event);
    if (!bodyA || !bodyB) return;

    const { objectiveBody, otherBody } = this.identifyBodies(bodyA, bodyB);
    if (!objectiveBody || !otherBody) return;

    // Check if it's the player's car (health collision box)
    if (otherBody.userData?.type === "healthCollision" && 
        otherBody.userData?.belongsTo === "player") {
      
      if (!this.isPlayerInside) {
        this.isPlayerInside = true;
        this.incrementOverlap();
        console.log(`Player entered checkpoint! Overlap ${this.currentOverlaps}/${this.requiredOverlaps}`);
        
        // Show tooltip and progress bar
        this.showUI();
        
        // Call touch callback
        if (this.onObjectiveTouch) {
          this.onObjectiveTouch(this, this.currentOverlaps);
        }
      }
    }
  }

  // Handle collision exit events
  handleCollisionExit(event) {
    const { bodyA, bodyB } = this.getCollisionBodies(event);
    if (!bodyA || !bodyB) return;

    const { objectiveBody, otherBody } = this.identifyBodies(bodyA, bodyB);
    if (!objectiveBody || !otherBody) return;

    // Check if it's the player's car leaving
    if (otherBody.userData?.type === "healthCollision" && 
        otherBody.userData?.belongsTo === "player") {
      
      if (this.isPlayerInside) {
        this.isPlayerInside = false;
        console.log("Player exited checkpoint");
        
        // Hide UI when player leaves
        this.hideUI();
      }
    }
  }

  // Helper method to get collision bodies
  getCollisionBodies(event) {
    let bodyA, bodyB;

    if (event.contact) {
      bodyA = event.contact.bi;
      bodyB = event.contact.bj;
    } else if (event.bodyA && event.bodyB) {
      bodyA = event.bodyA;
      bodyB = event.bodyB;
    } else if (event.bi && event.bj) {
      bodyA = event.bi;
      bodyB = event.bj;
    } else {
      console.warn("Unknown collision event structure:", event);
      return { bodyA: null, bodyB: null };
    }

    return { bodyA, bodyB };
  }

  // Helper method to identify which body is the objective
  identifyBodies(bodyA, bodyB) {
    let objectiveBody = null;
    let otherBody = null;

    if (bodyA?.userData?.type === "objective" && bodyA?.userData?.objective === this) {
      objectiveBody = bodyA;
      otherBody = bodyB;
    } else if (bodyB?.userData?.type === "objective" && bodyB?.userData?.objective === this) {
      objectiveBody = bodyB;
      otherBody = bodyA;
    }

    return { objectiveBody, otherBody };
  }

  // Increment overlap counter
  incrementOverlap() {
    if (this.isFinished) return;

    this.currentOverlaps++;
    this.updateProgressBar();

    // Call progress callback
    if (this.onOverlapProgress) {
      this.onOverlapProgress(this.currentOverlaps, this.requiredOverlaps);
    }

    // Check if we've reached the required overlaps
    if (this.currentOverlaps >= this.requiredOverlaps) {
      this.completeObjective();
    }
  }

  // Complete the checkpoint
  completeObjective() {
    if (this.isFinished) return;

    this.isFinished = true;
    console.log("Checkpoint completed!");

    // Visual completion effects
    this.showCompletionEffect();

    // Call completion callback
    if (this.onObjectiveComplete) {
      this.onObjectiveComplete(this);
    }
  }

  // Show UI elements
  showUI() {
    if (this.tooltip) {
      this.tooltip.style.display = "block";
      this.updateTooltipPosition();
    }

    if (this.progressContainer && !this.isFinished) {
      this.progressContainer.style.display = "block";
      this.updateProgressBarPosition();
    }
  }

  // Hide UI elements
  hideUI() {
    if (this.tooltip) {
      this.tooltip.style.display = "none";
    }

    if (this.progressContainer) {
      this.progressContainer.style.display = "none";
    }
  }

  // Update tooltip position to follow the checkpoint
  updateTooltipPosition() {
    if (!this.tooltip || !this.objectiveMesh) return;

    // Convert 3D position to screen coordinates
    const vector = new THREE.Vector3(this.position.x, this.position.y + this.size.y, this.position.z);
    
    // You'll need to pass camera and renderer from your main game
    // For now, we'll position it at a fixed location
    this.tooltip.style.left = "50%";
    this.tooltip.style.top = "30%";
    this.tooltip.style.transform = "translateX(-50%)";
  }

  // Update progress bar position
  updateProgressBarPosition() {
    if (!this.progressContainer) return;

    this.progressContainer.style.left = "50%";
    this.progressContainer.style.top = "35%";
    this.progressContainer.style.transform = "translateX(-50%)";
  }

  // Show completion visual effects
  showCompletionEffect() {
    // Change checkpoint color to gold
    if (this.objectiveMesh) {
      this.objectiveMesh.material.color.setHex(0xffd700);
      this.objectiveMesh.children[0].material.color.setHex(0xffd700);
    }

    // Update tooltip
    if (this.tooltip) {
      this.tooltip.textContent = "CHECKPOINT COMPLETE!";
      this.tooltip.style.color = "#ffd700";
      this.tooltip.style.borderColor = "#ffd700";
      this.tooltip.style.textShadow = "0 0 5px #ffd700";
    }

    // Trigger particle explosion
    if (this.particleSystem) {
      this.particleSystem.material.opacity = 1;
      
      // Animate particles outward
      const positions = this.particleSystem.geometry.attributes.position.array;
      const originalPositions = [...positions];
      
      let animationTime = 0;
      const animateParticles = () => {
        animationTime += 0.016;
        
        for (let i = 0; i < positions.length; i += 3) {
          const originalX = originalPositions[i];
          const originalY = originalPositions[i + 1];
          const originalZ = originalPositions[i + 2];
          
          const expansion = Math.sin(animationTime * 2) * 5;
          positions[i] = originalX + (originalX - this.position.x) * expansion * 0.1;
          positions[i + 1] = originalY + (originalY - this.position.y) * expansion * 0.1;
          positions[i + 2] = originalZ + (originalZ - this.position.z) * expansion * 0.1;
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.material.opacity = Math.max(0, 1 - animationTime * 0.5);
        
        if (animationTime < 2) {
          requestAnimationFrame(animateParticles);
        }
      };
      
      animateParticles();
    }

    // Scale animation
    if (this.objectiveMesh) {
      const originalScale = this.objectiveMesh.scale.clone();
      let scaleTime = 0;
      
      const animateScale = () => {
        scaleTime += 0.016;
        const scale = 1 + Math.sin(scaleTime * 10) * 0.2;
        this.objectiveMesh.scale.set(scale, scale, scale);
        
        if (scaleTime < 1) {
          requestAnimationFrame(animateScale);
        } else {
          this.objectiveMesh.scale.copy(originalScale);
        }
      };
      
      animateScale();
    }

    // Hide progress bar after completion
    setTimeout(() => {
      this.hideUI();
    }, 2000);
  }

  // Update loop for animations
  startUpdateLoop() {
    const updateObjective = () => {
      this.updateAnimations();
      requestAnimationFrame(updateObjective);
    };
    updateObjective();
  }

  // Update animations
  updateAnimations() {
    if (this.objectiveMesh && !this.isFinished) {
      // Rotate the checkpoint
      this.objectiveMesh.rotation.x += this.rotationSpeed;
      this.objectiveMesh.rotation.y += this.rotationSpeed * 0.7;
      this.objectiveMesh.rotation.z += this.rotationSpeed * 0.3;

      // Pulse scale
      const time = Date.now() * 0.001;
      const scale = this.baseScale + Math.sin(time * Math.PI * 2 * this.pulseSpeed) * this.pulseScale;
      this.objectiveMesh.scale.set(scale, scale, scale);

      // Pulse opacity
      const opacity = 0.5 + Math.sin(time * Math.PI * 4 * this.pulseSpeed) * 0.2;
      this.objectiveMesh.material.opacity = opacity;
    }

    // Update UI positions if player is inside
    if (this.isPlayerInside) {
      this.updateTooltipPosition();
      this.updateProgressBarPosition();
    }
  }

  // Public methods

  // Reset checkpoint
  reset() {
    this.isFinished = false;
    this.currentOverlaps = 0;
    this.isPlayerInside = false;
    
    // Reset visual appearance
    if (this.objectiveMesh) {
      this.objectiveMesh.material.color.setHex(0x00ff00);
      this.objectiveMesh.children[0].material.color.setHex(0x00ff00);
      this.objectiveMesh.scale.set(1, 1, 1);
      this.objectiveMesh.material.opacity = 0.7;
    }

    // Reset tooltip
    if (this.tooltip) {
      this.tooltip.textContent = "CHECKPOINT";
      this.tooltip.style.color = "#00ff00";
      this.tooltip.style.borderColor = "#00ff00";
      this.tooltip.style.textShadow = "0 0 5px #00ff00";
    }

    // Reset progress bar
    this.updateProgressBar();

    // Reset particle system
    if (this.particleSystem) {
      this.particleSystem.material.opacity = 0;
    }

    // Hide UI
    this.hideUI();

    console.log("Checkpoint reset");
  }

  // Check if checkpoint is completed
  isCompleted() {
    return this.isFinished;
  }

  // Get current overlap count
  getCurrentOverlaps() {
    return this.currentOverlaps;
  }

  // Get required overlaps
  getRequiredOverlaps() {
    return this.requiredOverlaps;
  }

  // Get checkpoint position
  getPosition() {
    return { ...this.position };
  }

  // Get checkpoint rotation
  getRotation() {
    return { ...this.rotation };
  }

  // Set checkpoint position
  setPosition(x, y, z) {
    this.position = { x, y, z };
    
    if (this.objectiveBody) {
      this.objectiveBody.position.set(x, y, z);
    }
    
    if (this.objectiveMesh) {
      this.objectiveMesh.position.set(x, y, z);
    }
    
    if (this.debugWireframe) {
      this.debugWireframe.position.set(x, y, z);
    }
  }

  // Set checkpoint rotation
  setRotation(x, y, z) {
    this.rotation = { x, y, z };
    
    if (this.objectiveBody) {
      this.objectiveBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), x);
      const yRotation = new CANNON.Quaternion();
      yRotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), y);
      this.objectiveBody.quaternion = this.objectiveBody.quaternion.mult(yRotation);
      
      const zRotation = new CANNON.Quaternion();
      zRotation.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), z);
      this.objectiveBody.quaternion = this.objectiveBody.quaternion.mult(zRotation);
    }
    
    if (this.objectiveMesh) {
      this.objectiveMesh.rotation.set(x, y, z);
    }
    
    if (this.debugWireframe) {
      this.debugWireframe.rotation.set(x, y, z);
    }
  }

  // Set required overlaps
  setRequiredOverlaps(count) {
    this.requiredOverlaps = count;
    this.updateProgressBar();
  }

  // Set callback functions
  setOnObjectiveComplete(callback) {
    this.onObjectiveComplete = callback;
  }

  setOnObjectiveTouch(callback) {
    this.onObjectiveTouch = callback;
  }

  setOnOverlapProgress(callback) {
    this.onOverlapProgress = callback;
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

  // Show/hide checkpoint
  setVisible(visible) {
    if (this.objectiveMesh) {
      this.objectiveMesh.visible = visible;
    }
    if (this.debugWireframe) {
      this.debugWireframe.visible = visible;
    }
  }

  // Cleanup method
  cleanup() {
    // Remove physics body
    if (this.objectiveBody) {
      this.world.removeBody(this.objectiveBody);
    }

    // Remove mesh
    if (this.objectiveMesh) {
      this.scene.remove(this.objectiveMesh);
      this.objectiveMesh.geometry.dispose();
      this.objectiveMesh.material.dispose();
      
      // Clean up glow mesh
      if (this.objectiveMesh.children.length > 0) {
        this.objectiveMesh.children[0].geometry.dispose();
        this.objectiveMesh.children[0].material.dispose();
      }
    }

    // Remove UI elements
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    
    if (this.progressContainer && this.progressContainer.parentNode) {
      this.progressContainer.parentNode.removeChild(this.progressContainer);
    }

    // Remove particle system
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }

    // Remove debug wireframe
    if (this.debugWireframe) {
      this.scene.remove(this.debugWireframe);
      this.debugWireframe.geometry.dispose();
      this.debugWireframe.material.dispose();
    }

    console.log("Checkpoint system cleaned up");
  }
}