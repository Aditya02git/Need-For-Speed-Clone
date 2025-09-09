import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import Loader from '../loader/Loader';

export default class Spike {
    constructor(scene, world, position = { x: 0, y: 0, z: 0 }, showWireframe = false, loadingManager) {
        this.scene = scene;
        this.world = world;
        this.loadingManager = loadingManager;
        this.position = position;
        this.model = null;
        this.body = null;
        this.debugMesh = null;
        this.hasCollided = false;
        this.showWireframe = showWireframe;

        // Initialize loader
        this.loader = new Loader(1, 'Loading Spike Models...');
        this.isLoaded = false;
        
        // Set up completion callback
        this.loader.setOnComplete(() => {
            this.isLoaded = true;
            console.log('Spike models loaded successfully!');
        });
        
        this.init();
    }

    init() {
        this.loader.show();
        this.loadModel();
        this.createPhysicsBody();
        this.setupCollisionDetection();
    }

    loadModel() {
        const gltfLoader = new GLTFLoader(this.loadingManager);
        const dracoLoader = new DRACOLoader();

        dracoLoader.setDecoderConfig({ type: 'js' });
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load(
            "./car/spikes.glb", 
            (gltf) => {
                this.model = gltf.scene;
                
                // Enable shadows for the spike model
                this.model.traverse((object) => {
                    if (object.isMesh) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }
                });

                // Position the model
                this.model.position.set(this.position.x, this.position.y, this.position.z);
                
                // Add to scene
                this.scene.add(this.model);
                
                // Update loader progress
                this.loader.updateProgress(1, 'spikes');
                
                console.log('Spike model loaded successfully');
            },
            (progress) => {
                // Handle loading progress
                const percentComplete = progress.loaded / progress.total * 100;
                console.log('Spike loading progress:', percentComplete + '%');
            },
            (error) => {
                console.error('Error loading spike model:', error);
                this.loader.setTitle('Error loading spike model');
                this.loader.setDetails('Please check the model file path');
            }
        );
    }

    createPhysicsBody() {
        const spikeShape = new CANNON.Box(new CANNON.Vec3(2, 0.35, 0.25));
        
        this.body = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.KINEMATIC,
            material: new CANNON.Material({ friction: 0.1 })
        });

        this.body.addShape(spikeShape);
        this.body.position.set(this.position.x, this.position.y, this.position.z);
        this.body.userData = { type: 'spike', spike: this };
        this.world.addBody(this.body);

        // Add wireframe debug mesh
        const debugGeometry = new THREE.BoxGeometry(4, 0.7, 0.5); // Match physics body dimensions (Vec3 * 2)
        const debugMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        this.debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        this.debugMesh.position.copy(this.body.position);
        this.debugMesh.visible = this.showWireframe;
        this.scene.add(this.debugMesh);
    }

    updateDebugMesh() {
        if (this.debugMesh && this.body) {
            this.debugMesh.position.copy(this.body.position);
            this.debugMesh.quaternion.copy(this.body.quaternion);
        }
    }

    // Method to toggle wireframe visibility
    toggleWireframe() {
        this.showWireframe = !this.showWireframe;
        if (this.debugMesh) {
            this.debugMesh.visible = this.showWireframe;
        }
    }

    // Method to set wireframe visibility
    setWireframeVisible(visible) {
        this.showWireframe = visible;
        if (this.debugMesh) {
            this.debugMesh.visible = this.showWireframe;
        }
    }

    setupCollisionDetection() {
        // Listen for collision events
        this.body.addEventListener('collide', (event) => {
            const { target, body } = event;
            
            // Check if the collision is with a car wheel instead of the car body
            if (body.userData && body.userData.type === 'wheel' && !this.hasCollided) {
                // Get the car reference from the wheel
                const car = body.userData.car;
                if (car) {
                    this.onWheelCollision(car, body.userData.wheelIndex);
                }
            }
        });
    }

    onWheelCollision(car, wheelIndex) {
        if (this.hasCollided) return; // Prevent multiple triggers
        
        console.log(`Car wheel ${wheelIndex} hit spike! Reducing max force to 150`);
        
        // Reduce car's max force
        car.maxForce = 150;
        
        // Optional: You could also damage specific wheel or add wheel-specific effects
        if (car.wheels && car.wheels[wheelIndex]) {
            console.log(`Wheel ${wheelIndex} damaged by spike`);
            // Add wheel-specific damage logic here if needed
            // For example: car.wheels[wheelIndex].damaged = true;
        }
        
        // Mark this spike as triggered
        this.hasCollided = true;
        
        // Visual feedback - change spike color or add effect
        this.showCollisionEffect();
    }

    showCollisionEffect() {
        if (this.model) {
            // Change spike color to indicate it's been triggered
            this.model.traverse((object) => {
                if (object.isMesh) {
                    object.material = object.material.clone();
                    object.material.color.setHex(0xff0000); // Red color
                    object.material.emissive.setHex(0x330000); // Slight glow
                }
            });
        }

        // Also change debug wireframe color when collision occurs
        if (this.debugMesh) {
            this.debugMesh.material.color.setHex(0x00ff00); // Green to indicate triggered
        }
    }

    remove() {
        // Remove from scene
        if (this.model) {
            this.scene.remove(this.model);
        }
        
        // Remove debug mesh from scene
        if (this.debugMesh) {
            this.scene.remove(this.debugMesh);
        }
        
        // Remove from physics world
        if (this.body) {
            this.world.removeBody(this.body);
        }
    }

    // Method to reset spike (useful for game restart)
    reset() {
        this.hasCollided = false;
        
        // Reset visual appearance
        if (this.model) {
            this.model.traverse((object) => {
                if (object.isMesh && object.material.color) {
                    object.material.color.setHex(0xffffff); // Reset to white
                    object.material.emissive.setHex(0x000000); // Remove glow
                }
            });
        }

        // Reset debug wireframe color
        if (this.debugMesh) {
            this.debugMesh.material.color.setHex(0xff0000); // Reset to red
        }
    }

    // Update method to be called in your main render loop
    update() {
        this.updateDebugMesh();
    }

    // Static method to create multiple spikes at different positions
    static createMultipleSpikes(scene, world, positions, showWireframe = false, loadingManager) {
        const spikes = [];
        positions.forEach(pos => {
            spikes.push(new Spike(scene, world, pos, showWireframe, loadingManager));
        });
        return spikes;
    }
}