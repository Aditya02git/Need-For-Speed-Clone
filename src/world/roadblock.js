import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export default class Asset {
    constructor(scene, world, modelPath) {
        this.scene = scene;
        this.world = world;
        this.modelPath = modelPath;
        this.meshes = [];
        this.physicsBodies = [];
        this.loader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        
        // Setup DRACO loader
        this.dracoLoader.setDecoderConfig({ type: 'js' });
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        this.loader.setDRACOLoader(this.dracoLoader);
    }

    init() {
        this.loadModel();
    }

    loadModel() {
        console.log(`Loading GLB model: ${this.modelPath}`);
        
        this.loader.load(
            this.modelPath,
            (gltf) => {
                console.log('GLB model loaded successfully');
                this.processModel(gltf.scene);
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading GLB model:', error);
            }
        );
    }

    processModel(model) {
        console.log('=== PROCESSING GLB MODEL ===');
        console.log('Model:', model);
        
        // Add the visual model to the scene
        model.traverse((child) => {
            if (child.isMesh) {
                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(model);
        
        // Find and log all meshes
        this.findMeshes(model);
        
        // Convert meshes to physics bodies
        this.createPhysicsBodies();
    }

    findMeshes(object) {
        console.log('=== FINDING MESHES ===');
        let meshCount = 0;
        
        object.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                console.log(`Mesh ${meshCount}:`, {
                    name: child.name || 'Unnamed',
                    type: child.type,
                    geometry: child.geometry.type,
                    vertices: child.geometry.attributes.position?.count || 0,
                    material: child.material.name || child.material.type,
                    position: {
                        x: child.position.x,
                        y: child.position.y,
                        z: child.position.z
                    },
                    scale: {
                        x: child.scale.x,
                        y: child.scale.y,
                        z: child.scale.z
                    },
                    boundingBox: child.geometry.boundingBox
                });
                
                this.meshes.push(child);
            }
        });
        
        console.log(`Total meshes found: ${meshCount}`);
    }

    createPhysicsBodies() {
        console.log('=== CREATING PHYSICS BODIES ===');
        console.log(`Processing ${this.meshes.length} meshes...`);
        
        this.meshes.forEach((mesh, index) => {
            console.log(`Converting mesh ${index + 1}/${this.meshes.length}: ${mesh.name}`);
            
            try {
                // Get geometry - ensure it exists and has position attribute
                if (!mesh.geometry || !mesh.geometry.attributes.position) {
                    console.warn(`⚠ Mesh ${index + 1} has no valid geometry, skipping...`);
                    return;
                }

                // Clone and prepare geometry
                const geometry = mesh.geometry.clone();
                
                // Compute bounding box if not present
                if (!geometry.boundingBox) {
                    geometry.computeBoundingBox();
                }
                
                // Get world matrix for transformations
                mesh.updateMatrixWorld(true);
                const worldMatrix = mesh.matrixWorld.clone();
                
                // Apply world transformations to geometry
                geometry.applyMatrix4(worldMatrix);
                
                // Get vertices and faces for trimesh
                const vertices = this.getVertices(geometry);
                const indices = this.getIndices(geometry);
                
                // Validate data
                if (vertices.length === 0 || indices.length === 0) {
                    console.warn(`⚠ Mesh ${index + 1} has no valid vertices/indices, skipping...`);
                    return;
                }
                
                console.log(`  → Vertices: ${vertices.length/3}, Faces: ${indices.length/3}`);
                
                // Create Cannon trimesh
                const trimesh = new CANNON.Trimesh(vertices, indices);
                
                // Create physics body
                const body = new CANNON.Body({ 
                    mass: 0, // Static body (immovable)
                    type: CANNON.Body.STATIC
                });
                
                // Add material with friction
                body.material = new CANNON.Material({
                    name: `asset_material_${index}`,
                    friction: 0.4,
                    restitution: 0.3
                });
                
                body.addShape(trimesh);
                
                // Position is already applied to geometry, so body stays at origin
                body.position.set(0, 0, 0);
                body.quaternion.set(0, 0, 0, 1);
                
                // Add user data for identification
                body.userData = { 
                    type: 'asset', 
                    name: mesh.name || `asset_${index}`,
                    meshIndex: index,
                    originalMesh: mesh
                };
                
                // Add to world
                this.world.addBody(body);
                this.physicsBodies.push(body);
                
                console.log(`✓ Physics body created for: ${mesh.name}`);
                
            } catch (error) {
                console.error(`✗ Failed to create physics body for mesh ${index + 1} (${mesh.name}):`, error);
                console.error('Error details:', error.stack);
            }
        });
        
        console.log(`=== PHYSICS SETUP COMPLETE ===`);
        console.log(`Total physics bodies created: ${this.physicsBodies.length}/${this.meshes.length}`);
        
        if (this.physicsBodies.length > 0) {
            // Setup collision detection
            this.setupCollisionDetection();
        } else {
            console.warn('⚠ No physics bodies were created!');
        }
    }

    getVertices(geometry) {
        try {
            const positions = geometry.attributes.position;
            if (!positions || !positions.array) {
                console.error('No position attribute found in geometry');
                return [];
            }
            
            const positionArray = positions.array;
            const vertices = [];
            
            for (let i = 0; i < positionArray.length; i += 3) {
                vertices.push(
                    positionArray[i],     // x
                    positionArray[i + 1], // y
                    positionArray[i + 2]  // z
                );
            }
            
            return vertices;
        } catch (error) {
            console.error('Error extracting vertices:', error);
            return [];
        }
    }

    getIndices(geometry) {
        try {
            if (geometry.index && geometry.index.array) {
                // Has indices
                return Array.from(geometry.index.array);
            } else {
                // No indices, create them sequentially
                const vertexCount = geometry.attributes.position.count;
                const indices = [];
                
                for (let i = 0; i < vertexCount; i += 3) {
                    // Make sure we don't exceed vertex count
                    if (i + 2 < vertexCount) {
                        indices.push(i, i + 1, i + 2);
                    }
                }
                
                return indices;
            }
        } catch (error) {
            console.error('Error extracting indices:', error);
            return [];
        }
    }

    setupCollisionDetection() {
        console.log('Setting up collision detection...');
        
        // Listen for collisions between car and assets
        this.world.addEventListener('beginContact', (event) => {
            // Get bodies from the event - different ways depending on cannon-es version
            let bodyA, bodyB;
            
            if (event.contact) {
                bodyA = event.contact.bi;
                bodyB = event.contact.bj;
            } else if (event.bodyA && event.bodyB) {
                bodyA = event.bodyA;
                bodyB = event.bodyB;
            } else {
                // Try alternative event structure
                bodyA = event.target;
                bodyB = event.body;
            }
            
            // Safety check
            if (!bodyA || !bodyB) {
                console.warn('Could not get collision bodies from event:', event);
                return;
            }
            
            // Check if collision involves car and asset
            const carBody = bodyA.userData?.type === 'car' ? bodyA : 
                           bodyB.userData?.type === 'car' ? bodyB : null;
            const assetBody = bodyA.userData?.type === 'asset' ? bodyA : 
                             bodyB.userData?.type === 'asset' ? bodyB : null;
            
            if (carBody && assetBody) {
                console.log(`Collision detected: Car hit ${assetBody.userData.name}`);
                this.handleCarAssetCollision(carBody, assetBody);
            }
        });
        
        // Also listen for endContact if needed
        this.world.addEventListener('endContact', (event) => {
            // Handle collision end if needed
            // console.log('Collision ended');
        });
    }

    handleCarAssetCollision(carBody, assetBody) {
        // You can customize collision behavior here
        console.log('Car-Asset collision details:', {
            carPosition: carBody.position,
            assetName: assetBody.userData.name,
            carVelocity: carBody.velocity.length()
        });
        
        // Example: Reduce car speed on collision
        if (carBody.userData.car) {
            // Access the car instance and reduce max force temporarily
            const car = carBody.userData.car;
            const originalMaxForce = car.maxForce;
            
            // Reduce power for 1 second after collision
            car.maxForce = originalMaxForce * 0.5;
            
            setTimeout(() => {
                car.maxForce = originalMaxForce;
                console.log('Car power restored after collision');
            }, 1000);
        }
    }

    // Method to remove all physics bodies (cleanup)
    removePhysicsBodies() {
        this.physicsBodies.forEach(body => {
            this.world.removeBody(body);
        });
        this.physicsBodies = [];
        console.log('All asset physics bodies removed');
    }
    
    // Method to get collision info
    getCollisionInfo() {
        return {
            meshCount: this.meshes.length,
            physicsBodyCount: this.physicsBodies.length,
            bodies: this.physicsBodies.map(body => ({
                name: body.userData.name,
                position: {
                    x: body.position.x,
                    y: body.position.y,
                    z: body.position.z
                },
                type: body.userData.type
            }))
        };
    }
    
    // Method to debug a specific mesh
    debugMesh(index) {
        if (index >= 0 && index < this.meshes.length) {
            const mesh = this.meshes[index];
            console.log(`=== DEBUG MESH ${index} ===`);
            console.log('Mesh:', mesh);
            console.log('Geometry:', mesh.geometry);
            console.log('Position attribute:', mesh.geometry.attributes.position);
            console.log('Index:', mesh.geometry.index);
            console.log('Matrix World:', mesh.matrixWorld);
            console.log('Bounding Box:', mesh.geometry.boundingBox);
        }
    }
}