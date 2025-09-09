import * as THREE from "three";
import * as CANNON from "cannon-es";

// RoadBoundary.js - Performance optimized version

export default class RoadBoundary {
  constructor(scene, world, car, options = {}) {
    this.scene = scene;
    this.world = world;
    this.car = car;
    
    // Default road boundary settings
    this.options = {
      // Road path settings
      startPosition: options.startPosition || { x: 0, y: 0, z: 0 },
      endPosition: options.endPosition || { x: 0, y: 0, z: 100 },
      roadWidth: options.roadWidth || 20,
      
      // Alternative: Use waypoints for curved roads
      waypoints: options.waypoints || null,
      
      // Barrier settings
      barrierHeight: options.barrierHeight || 5,
      barrierThickness: options.barrierThickness || 2,
      
      // Visual settings
      showVisualBarriers: options.showVisualBarriers !== false,
      barrierColor: options.barrierColor || 0xff0000,
      barrierOpacity: options.barrierOpacity || 0.8,
      showRoadSurface: options.showRoadSurface !== false,
      roadColor: options.roadColor || 0x333333,
      
      // Physics settings
      barrierMaterial: options.barrierMaterial || {
        friction: 0.3,
        restitution: 0.4,
        frictionEquationStiffness: 1e6,
        frictionEquationRelaxation: 3,
        contactEquationStiffness: 1e6,
        contactEquationRelaxation: 3
      },
      
      carBarrierMaterial: options.carBarrierMaterial || {
        friction: 0.2,
        restitution: 0.3,
        frictionEquationStiffness: 1e6,
        frictionEquationRelaxation: 3,
        contactEquationStiffness: 1e6,
        contactEquationRelaxation: 3
      },
      
      // Warning settings
      enableWarning: options.enableWarning !== false,
      warningDistance: options.warningDistance || 5,
      
      enableGentleCorrection: false,
      barrierExtension: options.barrierExtension || 10,
      
      // Sound settings
      enableCollisionSound: options.enableCollisionSound !== false,
      collisionSoundVolume: options.collisionSoundVolume || 0.5,
      
      // Performance settings
      boundaryCheckInterval: options.boundaryCheckInterval || 33, // ~30 FPS instead of 60
      maxParticles: options.maxParticles || 3, // Reduce particles
      particleLifetime: options.particleLifetime || 300, // Shorter lifetime
      enableLOD: options.enableLOD !== false, // Level of Detail
      lodDistance: options.lodDistance || 100
    };
    
    // Performance optimization: Pre-allocated objects
    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.tempVector3 = new THREE.Vector3();
    
    this.roadSegments = [];
    this.leftBarriers = [];
    this.rightBarriers = [];
    this.visualElements = [];
    this.roadPath = [];
    this.warningUI = null;
    this.isWarningActive = false;
    this.barrierMaterial = null;
    this.carBarrierMaterial = null;
    this.contactMaterial = null;
    this.collisionSound = null;
    
    // Performance: Cache frequently accessed values
    this.cachedCarPosition = null;
    this.cachedCarBody = null;
    this.lastCarPositionUpdate = 0;
    this.carPositionUpdateInterval = 16; // Update every 16ms
    
    // Performance: Reduce collision particle pool
    this.particlePool = [];
    this.activeParticles = [];
    this.particleGeometry = null;
    this.particleMaterial = null;
    
    // Performance: Throttle warning updates
    this.lastWarningUpdate = 0;
    this.warningUpdateInterval = 100; // Update every 100ms
    
    this.generateRoadPath();
  }

  init() {
    this.setupPhysicsMaterials();
    this.createRoadBarriers();
    
    // Create particle system once
    this.initParticleSystem();
    
    if (this.options.showVisualBarriers) {
      this.createVisualBarriers();
    }
    if (this.options.showRoadSurface) {
      this.createRoadSurface();
    }
    if (this.options.enableWarning) {
      this.createWarningSystem();
    }
    if (this.options.enableCollisionSound) {
      this.setupCollisionSound();
    }
    
    this.startBoundaryCheck();
    this.setupCollisionDetection();
    
    console.log("Optimized Road Boundary System initialized with", this.roadPath.length, "segments");
  }

  setupPhysicsMaterials() {
    this.barrierMaterial = new CANNON.Material('barrier');
    Object.assign(this.barrierMaterial, this.options.barrierMaterial);
    
    this.carBarrierMaterial = new CANNON.Material('carBarrier');
    Object.assign(this.carBarrierMaterial, this.options.carBarrierMaterial);
    
    this.contactMaterial = new CANNON.ContactMaterial(
      this.carBarrierMaterial,
      this.barrierMaterial,
      {
        friction: this.options.carBarrierMaterial.friction,
        restitution: this.options.carBarrierMaterial.restitution,
        frictionEquationStiffness: this.options.carBarrierMaterial.frictionEquationStiffness,
        frictionEquationRelaxation: this.options.carBarrierMaterial.frictionEquationRelaxation,
        contactEquationStiffness: this.options.carBarrierMaterial.contactEquationStiffness,
        contactEquationRelaxation: this.options.carBarrierMaterial.contactEquationRelaxation
      }
    );
    
    this.world.addContactMaterial(this.contactMaterial);
    this.applyCarMaterial();
  }

  applyCarMaterial() {
    const carBody = this.getCarBody();
    if (carBody) {
      carBody.material = this.carBarrierMaterial;
    }
  }

  generateRoadPath() {
    if (this.options.waypoints && this.options.waypoints.length > 1) {
      this.generatePathFromWaypoints();
    } else {
      this.generateStraightPath();
    }
  }

  generateStraightPath() {
    const { startPosition, endPosition } = this.options;
    
    // Use temp vectors to avoid creating new objects
    this.tempVector1.set(
      endPosition.x - startPosition.x,
      endPosition.y - startPosition.y,
      endPosition.z - startPosition.z
    );
    
    const length = this.tempVector1.length();
    this.tempVector1.normalize();
    
    const segment = {
      start: startPosition,
      end: endPosition,
      direction: { x: this.tempVector1.x, y: this.tempVector1.y, z: this.tempVector1.z },
      length: length,
      center: {
        x: (startPosition.x + endPosition.x) / 2,
        y: (startPosition.y + endPosition.y) / 2,
        z: (startPosition.z + endPosition.z) / 2
      },
      rotation: Math.atan2(this.tempVector1.x, this.tempVector1.z)
    };
    
    this.roadPath.push(segment);
  }

  generatePathFromWaypoints() {
    const { waypoints } = this.options;
    
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      
      this.tempVector1.set(
        end.x - start.x,
        end.y - start.y,
        end.z - start.z
      );
      
      const length = this.tempVector1.length();
      this.tempVector1.normalize();
      
      const segment = {
        start: start,
        end: end,
        direction: { x: this.tempVector1.x, y: this.tempVector1.y, z: this.tempVector1.z },
        length: length,
        center: {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2,
          z: (start.z + end.z) / 2
        },
        rotation: Math.atan2(this.tempVector1.x, this.tempVector1.z)
      };
      
      this.roadPath.push(segment);
    }
  }

  createRoadBarriers() {
    const { roadWidth, barrierHeight, barrierThickness, barrierExtension } = this.options;
    
    // Create barriers using instanced geometry for better performance
    this.roadPath.forEach((segment, index) => {
      const perpendicular = { x: -segment.direction.z, y: 0, z: segment.direction.x };
      const extendedLength = segment.length + barrierExtension;
      
      const leftBarrierPos = {
        x: segment.center.x + perpendicular.x * (roadWidth / 2 + barrierThickness / 2),
        y: segment.center.y + barrierHeight / 2,
        z: segment.center.z + perpendicular.z * (roadWidth / 2 + barrierThickness / 2)
      };
      
      const rightBarrierPos = {
        x: segment.center.x - perpendicular.x * (roadWidth / 2 + barrierThickness / 2),
        y: segment.center.y + barrierHeight / 2,
        z: segment.center.z - perpendicular.z * (roadWidth / 2 + barrierThickness / 2)
      };
      
      const leftBarrier = this.createBarrierBody(
        leftBarrierPos,
        extendedLength,
        barrierHeight,
        barrierThickness,
        segment.rotation,
        'left'
      );
      this.leftBarriers.push(leftBarrier);
      
      const rightBarrier = this.createBarrierBody(
        rightBarrierPos,
        extendedLength,
        barrierHeight,
        barrierThickness,
        segment.rotation,
        'right'
      );
      this.rightBarriers.push(rightBarrier);
      
      this.roadSegments.push({
        ...segment,
        leftBarrier,
        rightBarrier,
        leftBarrierPos,
        rightBarrierPos,
        extendedLength
      });
    });
  }

  createBarrierBody(position, length, height, thickness, rotation, side) {
    const barrierShape = new CANNON.Box(new CANNON.Vec3(thickness / 2, height / 2, length / 2));
    
    const barrierBody = new CANNON.Body({
      mass: 0,
      material: this.barrierMaterial,
      type: CANNON.Body.KINEMATIC
    });
    
    barrierBody.addShape(barrierShape);
    barrierBody.position.set(position.x, position.y, position.z);
    barrierBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
    
    barrierBody.userData = {
      type: 'roadBarrier',
      side: side
    };
    
    this.world.addBody(barrierBody);
    return barrierBody;
  }

  createVisualBarriers() {
    const { barrierHeight, barrierThickness, barrierColor, barrierOpacity } = this.options;
    
    // Use instanced geometry for better performance
    const barrierGeometry = new THREE.BoxGeometry(barrierThickness, barrierHeight, 1);
    const barrierMaterial = new THREE.MeshLambertMaterial({
      color: barrierColor,
      transparent: true,
      opacity: barrierOpacity
    });
    
    this.roadSegments.forEach((segment) => {
      // Left barrier
      const leftBarrierMesh = new THREE.Mesh(barrierGeometry, barrierMaterial);
      leftBarrierMesh.position.set(
        segment.leftBarrierPos.x,
        segment.leftBarrierPos.y,
        segment.leftBarrierPos.z
      );
      leftBarrierMesh.rotation.y = segment.rotation;
      leftBarrierMesh.scale.z = segment.extendedLength;
      leftBarrierMesh.castShadow = true;
      leftBarrierMesh.receiveShadow = true;
      this.scene.add(leftBarrierMesh);
      this.visualElements.push(leftBarrierMesh);
      
      // Right barrier
      const rightBarrierMesh = new THREE.Mesh(barrierGeometry, barrierMaterial);
      rightBarrierMesh.position.set(
        segment.rightBarrierPos.x,
        segment.rightBarrierPos.y,
        segment.rightBarrierPos.z
      );
      rightBarrierMesh.rotation.y = segment.rotation;
      rightBarrierMesh.scale.z = segment.extendedLength;
      rightBarrierMesh.castShadow = true;
      rightBarrierMesh.receiveShadow = true;
      this.scene.add(rightBarrierMesh);
      this.visualElements.push(rightBarrierMesh);
    });
  }

  createRoadSurface() {
    const { roadWidth, roadColor } = this.options;
    
    // Create single merged geometry for road surface
    const roadGeometry = new THREE.BoxGeometry(roadWidth, 0.1, 1);
    const roadMaterial = new THREE.MeshLambertMaterial({
      color: roadColor,
      transparent: true,
      opacity: 0.9
    });
    
    this.roadSegments.forEach((segment) => {
      const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
      roadMesh.position.set(
        segment.center.x,
        segment.center.y,
        segment.center.z
      );
      roadMesh.rotation.y = segment.rotation;
      roadMesh.scale.z = segment.length;
      roadMesh.receiveShadow = true;
      
      this.scene.add(roadMesh);
      this.visualElements.push(roadMesh);
    });
  }

  createWarningSystem() {
    this.warningUI = document.createElement('div');
    this.warningUI.id = 'roadBoundaryWarning';
    this.warningUI.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: orange;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      z-index: 1000;
      display: none;
      pointer-events: none;
    `;
    this.warningUI.innerHTML = '⚠️ APPROACHING BARRIER ⚠️';
    
    document.body.appendChild(this.warningUI);
  }

  setupCollisionSound() {
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
      try {
        const AudioCtx = AudioContext || webkitAudioContext;
        this.audioContext = new AudioCtx();
        
        this.collisionSound = {
          play: () => {
            if (this.audioContext.state === 'suspended') {
              this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(this.options.collisionSoundVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
          }
        };
      } catch (e) {
        console.warn('Audio not supported for collision sounds');
      }
    }
  }

  initParticleSystem() {
    this.particleGeometry = new THREE.SphereGeometry(0.1, 6, 6); // Reduced detail
    this.particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    
    // Pre-create particle pool
    for (let i = 0; i < this.options.maxParticles; i++) {
      const particle = new THREE.Mesh(this.particleGeometry, this.particleMaterial);
      particle.visible = false;
      this.scene.add(particle);
      this.particlePool.push(particle);
    }
  }

  setupCollisionDetection() {
    this.world.addEventListener('beginContact', (event) => {
      const bodyA = event.bodyA;
      const bodyB = event.bodyB;
      
      const carBody = this.getCarBody();
      if (!carBody) return;
      
      const isCarBarrierCollision = 
        (bodyA === carBody && bodyB.userData?.type === 'roadBarrier') ||
        (bodyB === carBody && bodyA.userData?.type === 'roadBarrier');
      
      if (isCarBarrierCollision) {
        this.handleBarrierCollision(event);
      }
    });
  }

  handleBarrierCollision(event) {
    if (this.collisionSound) {
      this.collisionSound.play();
    }
    
    this.showCollisionWarning();
    this.addCollisionEffect(event);
  }

  showCollisionWarning() {
    if (this.warningUI) {
      this.warningUI.innerHTML = '💥 BARRIER COLLISION! 💥';
      this.warningUI.style.color = 'red';
      this.warningUI.style.display = 'block';
      
      setTimeout(() => {
        this.warningUI.style.display = 'none';
        this.warningUI.style.color = 'orange';
        this.warningUI.innerHTML = '⚠️ APPROACHING BARRIER ⚠️';
      }, 2000);
    }
  }

  addCollisionEffect(event) {
    const carPos = this.getCarPosition();
    if (!carPos) return;
    
    const contactPoint = {
      x: carPos.x,
      y: carPos.y + 1,
      z: carPos.z
    };
    
    // Use particle pool instead of creating new particles
    const particlesNeeded = Math.min(this.options.maxParticles, this.particlePool.length);
    
    for (let i = 0; i < particlesNeeded; i++) {
      const particle = this.particlePool.pop();
      if (!particle) break;
      
      particle.position.set(
        contactPoint.x + (Math.random() - 0.5) * 2,
        contactPoint.y + (Math.random() - 0.5) * 2,
        contactPoint.z + (Math.random() - 0.5) * 2
      );
      particle.visible = true;
      this.activeParticles.push(particle);
      
      // Return particle to pool after lifetime
      setTimeout(() => {
        particle.visible = false;
        const index = this.activeParticles.indexOf(particle);
        if (index > -1) {
          this.activeParticles.splice(index, 1);
          this.particlePool.push(particle);
        }
      }, this.options.particleLifetime);
    }
  }

  startBoundaryCheck() {
    this.boundaryCheckInterval = setInterval(() => {
      this.checkRoadBoundary();
    }, this.options.boundaryCheckInterval);
  }

  checkRoadBoundary() {
    const now = Date.now();
    
    // Update car position cache less frequently
    if (now - this.lastCarPositionUpdate > this.carPositionUpdateInterval) {
      this.cachedCarPosition = this.getCarPosition();
      this.lastCarPositionUpdate = now;
    }
    
    if (!this.car || !this.cachedCarPosition) return;
    
    const roadInfo = this.getClosestRoadInfo(this.cachedCarPosition);
    if (!roadInfo) return;
    
    const { distanceFromRoad } = roadInfo;
    
    // Throttle warning updates
    if (now - this.lastWarningUpdate > this.warningUpdateInterval) {
      if (this.options.enableWarning && distanceFromRoad > this.options.warningDistance) {
        this.showWarning();
      } else {
        this.hideWarning();
      }
      this.lastWarningUpdate = now;
    }
  }

  getClosestRoadInfo(carPosition) {
    let closestDistance = Infinity;
    let closestSegment = null;
    
    // Performance: Early exit if car is far from all segments
    for (const segment of this.roadSegments) {
      const roughDistance = Math.abs(carPosition.x - segment.center.x) + 
                           Math.abs(carPosition.z - segment.center.z);
      
      if (roughDistance < closestDistance) {
        closestDistance = roughDistance;
        closestSegment = segment;
      }
    }
    
    if (!closestSegment) return null;
    
    const distanceFromRoad = this.getPerpendicularDistanceFromRoad(carPosition, closestSegment);
    const isOffRoad = Math.abs(distanceFromRoad) > this.options.roadWidth / 2;
    
    return {
      distanceFromRoad: Math.abs(distanceFromRoad),
      isOffRoad,
      closestSegment,
      side: distanceFromRoad > 0 ? 'left' : 'right'
    };
  }

  getPerpendicularDistanceFromRoad(carPosition, segment) {
    const { direction } = segment;
    
    // Use temp vectors to avoid object creation
    this.tempVector1.set(
      carPosition.x - segment.center.x,
      carPosition.y - segment.center.y,
      carPosition.z - segment.center.z
    );
    
    this.tempVector2.set(-direction.z, 0, direction.x);
    
    return this.tempVector1.dot(this.tempVector2);
  }

  getCarPosition() {
    // Cache car body reference
    if (!this.cachedCarBody) {
      this.cachedCarBody = this.getCarBody();
    }
    
    if (this.cachedCarBody) {
      return this.cachedCarBody.position;
    }
    
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
      
      // Use CSS animation instead of JavaScript animation
      if (!document.getElementById('roadBoundaryWarningStyle')) {
        const style = document.createElement('style');
        style.id = 'roadBoundaryWarningStyle';
        style.textContent = `
          @keyframes pulse {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.05); }
          }
          #roadBoundaryWarning.pulse {
            animation: pulse 0.8s infinite alternate;
          }
        `;
        document.head.appendChild(style);
      }
      
      this.warningUI.classList.add('pulse');
    }
  }

  hideWarning() {
    if (this.isWarningActive && this.warningUI) {
      this.isWarningActive = false;
      this.warningUI.style.display = 'none';
      this.warningUI.classList.remove('pulse');
    }
  }

  // Utility methods
  isCarOnRoad() {
    if (!this.cachedCarPosition) return false;
    
    const roadInfo = this.getClosestRoadInfo(this.cachedCarPosition);
    return roadInfo && !roadInfo.isOffRoad;
  }

  getCarRoadStatus() {
    if (!this.cachedCarPosition) return null;
    
    const roadInfo = this.getClosestRoadInfo(this.cachedCarPosition);
    
    return {
      position: this.cachedCarPosition,
      isOnRoad: roadInfo ? !roadInfo.isOffRoad : false,
      distanceFromRoad: roadInfo ? roadInfo.distanceFromRoad : null,
      closestSegment: roadInfo ? roadInfo.closestSegment : null,
      side: roadInfo ? roadInfo.side : null,
      isWarningActive: this.isWarningActive
    };
  }

  updateRoadPath(newWaypoints) {
    this.cleanup();
    this.options.waypoints = newWaypoints;
    this.roadPath = [];
    this.generateRoadPath();
    this.init();
  }

cleanup() {
  try {
    // Clear intervals first
    if (this.boundaryCheckInterval) {
      clearInterval(this.boundaryCheckInterval);
      this.boundaryCheckInterval = null;
    }
    
    // Remove physics bodies safely
    if (this.world) {
      [...this.leftBarriers, ...this.rightBarriers].forEach(barrier => {
        if (barrier && this.world.bodies.includes(barrier)) {
          this.world.removeBody(barrier);
        }
      });
    }
    this.leftBarriers = [];
    this.rightBarriers = [];
    this.roadSegments = [];
    
    // Remove contact material safely
    if (this.contactMaterial && this.world) {
      try {
        this.world.removeContactMaterial(this.contactMaterial);
      } catch (e) {
        console.warn('Contact material already removed or not found:', e);
      }
      this.contactMaterial = null;
    }
    
    // Remove visual elements safely
    if (this.scene) {
      this.visualElements.forEach(element => {
        if (element && element.parent) {
          this.scene.remove(element);
          // Dispose of geometry and material to prevent memory leaks
          if (element.geometry) element.geometry.dispose();
          if (element.material) {
            if (Array.isArray(element.material)) {
              element.material.forEach(mat => mat.dispose());
            } else {
              element.material.dispose();
            }
          }
        }
      });
    }
    this.visualElements = [];
    
    // Clean up particle system safely
    if (this.scene) {
      [...this.particlePool, ...this.activeParticles].forEach(particle => {
        if (particle && particle.parent) {
          this.scene.remove(particle);
          // Dispose of particle geometry and material
          if (particle.geometry) particle.geometry.dispose();
          if (particle.material) particle.material.dispose();
        }
      });
    }
    this.particlePool = [];
    this.activeParticles = [];
    
    // Dispose of shared particle geometry and material
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
      this.particleGeometry = null;
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
      this.particleMaterial = null;
    }
    
    // Remove warning UI safely
    if (this.warningUI) {
      try {
        if (this.warningUI.parentNode) {
          this.warningUI.parentNode.removeChild(this.warningUI);
        }
      } catch (e) {
        console.warn('Warning UI already removed:', e);
      }
      this.warningUI = null;
    }
    
    // Remove warning styles safely
    try {
      const warningStyle = document.getElementById('roadBoundaryWarningStyle');
      if (warningStyle && warningStyle.parentNode) {
        warningStyle.parentNode.removeChild(warningStyle);
      }
    } catch (e) {
      console.warn('Warning style already removed:', e);
    }
    
    // Clean up audio context
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn('Audio context cleanup failed:', e);
      }
      this.audioContext = null;
    }
    this.collisionSound = null;
    
    // Clear cached references
    this.cachedCarPosition = null;
    this.cachedCarBody = null;
    this.lastCarPositionUpdate = 0;
    this.lastWarningUpdate = 0;
    this.isWarningActive = false;
    
    // Clear road path
    this.roadPath = [];
    
    console.log('RoadBoundary cleanup completed successfully');
    
  } catch (error) {
    console.error('Error during RoadBoundary cleanup:', error);
    // Continue cleanup even if some parts fail
    this.leftBarriers = [];
    this.rightBarriers = [];
    this.roadSegments = [];
    this.visualElements = [];
    this.particlePool = [];
    this.activeParticles = [];
    this.warningUI = null;
    this.cachedCarPosition = null;
    this.cachedCarBody = null;
  }
}
}