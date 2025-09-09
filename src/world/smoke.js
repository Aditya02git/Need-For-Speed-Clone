import * as THREE from 'three';

class SmokeParticle {
    constructor(x, y, z, lifetime, scene, smokeMaterial) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 1
        );
        this.age = 0;
        this.lifetime = lifetime;
        this.startScale = Math.random() * 0.3 + 0.15;
        this.finalScale = this.startScale + Math.random() * 0.6 + 0.4;
        
        this.sprite = new THREE.Sprite(smokeMaterial.clone());
        this.sprite.position.copy(this.position);
        this.sprite.scale.setScalar(this.startScale);
        scene.add(this.sprite);
    }

    update(deltaTime) {
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime * 0.001));
        this.age += deltaTime;
        
        const lifeFrac = this.age / this.lifetime;
        this.velocity.multiplyScalar(Math.pow(0.95, deltaTime * 0.06));
        
        const currentScale = this.startScale + lifeFrac * (this.finalScale - this.startScale);
        const opacity = lifeFrac < 0.2 ? lifeFrac * 3.5 : (1 - lifeFrac) * 0.875;
        
        this.sprite.position.copy(this.position);
        this.sprite.scale.setScalar(currentScale);
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

class WheelTrail {
    constructor(scene, maxPoints = 25) {
        this.scene = scene;
        this.maxPoints = maxPoints;
        this.points = [];
        this.mesh = null;
        this.isActive = false;
        this.fadeStart = 0;
        this.duration = 800; // Reduced from 2000ms
        this.width = 0.12; // Reduced from 0.15
        
        this.material = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.6, // Reduced from 0.8
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.geometry = new THREE.PlaneGeometry(1, 1);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
        this.mesh.visible = false;
    }

    addPoint(position) {
        if (!this.isActive) return;
        
        this.points.push({
            position: position.clone(),
            time: Date.now()
        });
        
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
        
        this.updateGeometry();
    }

    updateGeometry() {
        const now = Date.now();
        this.points = this.points.filter(p => now - p.time < this.duration);
        
        if (this.points.length < 2) {
            this.mesh.visible = false;
            return;
        }
        
        const curve = new THREE.CatmullRomCurve3(this.points.map(p => p.position));
        const tubeGeometry = new THREE.TubeGeometry(curve, this.points.length, this.width, 6, false);
        
        this.mesh.geometry.dispose();
        this.mesh.geometry = tubeGeometry;
        this.mesh.visible = true;
    }

    start() {
        this.isActive = true;
        this.material.opacity = 0.6;
    }

    stop() {
        this.isActive = false;
        this.fadeStart = Date.now();
    }

    update() {
        if (!this.isActive) {
            const fadeTime = (Date.now() - this.fadeStart) / 500; // 500ms fade
            this.material.opacity = 0.6 * Math.max(0, 1 - fadeTime);
            
            if (fadeTime >= 1) {
                this.points = [];
                this.mesh.visible = false;
            }
        }
        this.updateGeometry();
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.material.dispose();
        }
    }

    setWidth(width) {
        this.width = width;
    }
}

export default class EnhancedSmoke {
    constructor(scene, world, vehicle, offset = { x: 0, y: 0, z: 0 }) {
        this.scene = scene;
        this.world = world;
        this.vehicle = vehicle;
        this.offset = offset;
        
        this.particles = [];
        this.isActive = false;
        this.lastEmission = 0;
        this.emissionRate = 60; // Slightly increased interval
        this.particlesPerEmission = 2; // Reduced from 3
        
        this.smokeMaterial = null;
        this.vehicleType = this.detectVehicleType();
        
        // Shortened animation durations
        this.smokeAnimationDuration = 1200; // Reduced from 2000ms
        this.trailAnimationDuration = 600;  // Reduced from 1000ms
        this.animationCooldown = false;
        
        this.wKeyPressed = false;
        this.spaceKeyPressed = false;
        
        // Optimized wheel trails
        this.leftWheelTrail = new WheelTrail(this.scene, 20); // Reduced points
        this.rightWheelTrail = new WheelTrail(this.scene, 20);
        
        this.eventListenersAdded = false;
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    detectVehicleType() {
        if (this.vehicle?.truck && this.vehicle?.trailer) return 'truck-trailer';
        if (this.vehicle?.car) return 'car';
        return 'unknown';
    }

    init() {
        this.createSmokeTexture();
        this.setupControls();
        this.update();
    }

    createSmokeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32; // Reduced from 64
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(70, 70, 70, 1)');
        gradient.addColorStop(0.4, 'rgba(110, 110, 110, 0.7)');
        gradient.addColorStop(0.8, 'rgba(180, 180, 180, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        const smokeTexture = new THREE.CanvasTexture(canvas);
        smokeTexture.needsUpdate = true;
        
        this.smokeMaterial = new THREE.SpriteMaterial({
            map: smokeTexture,
            transparent: true,
            opacity: 0.6, // Reduced from 0.7
            color: new THREE.Color(0.5, 0.5, 0.5),
            blending: THREE.NormalBlending,
            depthWrite: false
        });
    }

    setupControls() {
        if (!this.eventListenersAdded) {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
            this.eventListenersAdded = true;
        }
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if ((key === 'w' || key === 'arrowup') && !this.wKeyPressed && !this.animationCooldown) {
            this.startAnimation();
            this.wKeyPressed = true;
        }
        if (key === ' ' && !this.spaceKeyPressed && !this.animationCooldown) {
            this.startAnimation();
            this.spaceKeyPressed = true;
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'arrowup') {
            this.wKeyPressed = false;
            this.animationCooldown = false;
        }
        if (key === ' ') {
            this.spaceKeyPressed = false;
            this.animationCooldown = false;
        }
    }

    startAnimation() {
        // Start smoke
        this.isActive = true;
        setTimeout(() => this.isActive = false, this.smokeAnimationDuration);
        
        // Start trails
        this.leftWheelTrail.start();
        this.rightWheelTrail.start();
        setTimeout(() => {
            this.leftWheelTrail.stop();
            this.rightWheelTrail.stop();
        }, this.trailAnimationDuration);
        
        // Cooldown
        this.animationCooldown = true;
        setTimeout(() => this.animationCooldown = false, this.trailAnimationDuration);
    }

    getVehiclePosition() {
        if (!this.vehicle) return new THREE.Vector3();
        
        try {
            if (this.vehicleType === 'truck-trailer' && this.vehicle.truck?.chassisBody) {
                const pos = this.vehicle.truck.chassisBody.position;
                return new THREE.Vector3(pos.x, pos.y, pos.z);
            }
            if (this.vehicleType === 'car' && this.vehicle.car?.chassisBody) {
                const pos = this.vehicle.car.chassisBody.position;
                return new THREE.Vector3(pos.x, pos.y, pos.z);
            }
            if (this.vehicle.position) return this.vehicle.position.clone();
        } catch (error) {
            console.warn('Error getting vehicle position:', error);
        }
        
        return new THREE.Vector3();
    }

    getVehicleRotation() {
        if (!this.vehicle) return new THREE.Quaternion();
        
        try {
            if (this.vehicleType === 'truck-trailer' && this.vehicle.truck?.chassisBody) {
                const quat = this.vehicle.truck.chassisBody.quaternion;
                return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
            }
            if (this.vehicleType === 'car' && this.vehicle.car?.chassisBody) {
                const quat = this.vehicle.car.chassisBody.quaternion;
                return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
            }
            if (this.vehicle.quaternion) return this.vehicle.quaternion.clone();
        } catch (error) {
            console.warn('Error getting vehicle rotation:', error);
        }
        
        return new THREE.Quaternion();
    }

    getRearWheelPositions() {
        const vehiclePos = this.getVehiclePosition();
        const vehicleRotation = this.getVehicleRotation();
        
        const wheelBase = -2.0; // Reduced from -2.5
        const wheelTrack = 1.3; // Reduced from 1.5
        
        const leftOffset = new THREE.Vector3(-wheelTrack/2, 0, wheelBase);
        const rightOffset = new THREE.Vector3(wheelTrack/2, 0, wheelBase);
        
        leftOffset.applyQuaternion(vehicleRotation);
        rightOffset.applyQuaternion(vehicleRotation);
        
        return {
            left: vehiclePos.clone().add(leftOffset),
            right: vehiclePos.clone().add(rightOffset)
        };
    }

    addSmoke() {
        const now = Date.now();
        if (!this.isActive || now - this.lastEmission < this.emissionRate) return;
        
        this.lastEmission = now;
        
        const vehiclePos = this.getVehiclePosition();
        const vehicleRotation = this.getVehicleRotation();
        
        const localOffset = new THREE.Vector3(this.offset.x, this.offset.y, this.offset.z);
        localOffset.applyQuaternion(vehicleRotation);
        
        const emissionPos = vehiclePos.clone().add(localOffset);

        for (let i = 0; i < this.particlesPerEmission; i++) {
            const lifetime = 1000 + Math.random() * 500; // Reduced lifetime
            const particle = new SmokeParticle(
                emissionPos.x + (Math.random() - 0.5) * 0.2,
                emissionPos.y + Math.random() * 0.1,
                emissionPos.z + (Math.random() - 0.5) * 0.2,
                lifetime,
                this.scene,
                this.smokeMaterial
            );
            
            const exhaustDir = new THREE.Vector3(0, 0, 1);
            exhaustDir.applyQuaternion(vehicleRotation);
            particle.velocity.add(exhaustDir.multiplyScalar(0.6));
            
            this.particles.push(particle);
        }
    }

    update() {
        const updateEffects = () => {
            this.addSmoke();
            
            this.particles = this.particles.filter(particle => {
                particle.update(16);
                if (particle.isAlive()) return true;
                particle.destroy(this.scene);
                return false;
            });
            
            // Update trails less frequently for better performance
            if (this.leftWheelTrail.isActive || this.rightWheelTrail.isActive) {
                const rearWheels = this.getRearWheelPositions();
                
                if (this.leftWheelTrail.isActive) {
                    const leftPos = rearWheels.left.clone();
                    leftPos.y = 0.08; // Slightly lower
                    this.leftWheelTrail.addPoint(leftPos);
                }
                
                if (this.rightWheelTrail.isActive) {
                    const rightPos = rearWheels.right.clone();
                    rightPos.y = 0.08;
                    this.rightWheelTrail.addPoint(rightPos);
                }
            }
            
            this.leftWheelTrail.update();
            this.rightWheelTrail.update();
        };

        if (this.world?.addEventListener) {
            this.world.addEventListener('postStep', updateEffects);
        } else {
            const animate = () => {
                updateEffects();
                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    start() { this.isActive = true; }
    stop() { this.isActive = false; }

    destroy() {
        if (this.eventListenersAdded) {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            this.eventListenersAdded = false;
        }
        
        this.particles.forEach(particle => particle.destroy(this.scene));
        this.particles = [];
        
        if (this.smokeMaterial) this.smokeMaterial.dispose();
        
        this.leftWheelTrail.destroy();
        this.rightWheelTrail.destroy();
    }

    setEmissionRate(rate) { this.emissionRate = rate; }
    setParticlesPerEmission(count) { this.particlesPerEmission = count; }
    setOffset(offset) { this.offset = offset; }
    
    setTrailWidth(width) {
        this.leftWheelTrail.setWidth(width);
        this.rightWheelTrail.setWidth(width);
    }
}