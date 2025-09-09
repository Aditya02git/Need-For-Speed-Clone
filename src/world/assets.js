import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import Loader from "../loader/Loader";

export default class Assets {
  followTarget = new THREE.Object3D();

  constructor(scene, world, position = { x: 0, y: 0, z: 0 }, options = {}, loadingManager) {
    this.scene = scene;
    this.world = world;
    this.position = position;

    // Asset properties
    this.mesh = null;
    this.body = null;
    this.mass = options.mass || 1;
    this.friction = options.friction || 0.4;
    this.restitution = options.restitution || 0.3;
    this.modelPath = options.modelPath || null;
    this.scale = options.scale || { x: 1, y: 1, z: 1 };
    this.rotation = options.rotation || { x: 0, y: 0, z: 0 };

    // Physics shape options
    this.shapeType = options.shapeType || "auto"; // 'auto', 'box', 'sphere', 'cylinder', 'convex', 'trimesh'
    this.customDimensions = options.customDimensions || null;

    // Wireframe properties
    this.showWireframe = options.showWireframe || false;
    this.wireframeMesh = null;

    // Visibility property
    this.visible = options.visible !== undefined ? options.visible : true;

    // Damping properties
    this.linearDamping = options.linearDamping || 0.1;
    this.angularDamping = options.angularDamping || 0.1;

    // Collision properties
    this.collisionGroup = options.collisionGroup || 1;
    this.collisionMask = options.collisionMask || -1;

    // State tracking
    this.isLoaded = false;
    this.isPhysicsReady = false;

    // Fixed loading manager setup
    if (loadingManager && loadingManager instanceof THREE.LoadingManager) {
      this.loadingManager = loadingManager;
      this.useCustomLoader = false;
    } else {
      this.loadingManager = new THREE.LoadingManager();
      this.useCustomLoader = true;
      
      // Initialize custom loader
      this.loader = new Loader(5, 'Loading Asset Models...');
      
      // Set up completion callback
      this.loader.setOnComplete(() => {
        this.isLoaded = true;
        console.log('Asset models loaded successfully!');
      });
    }
  }

  init() {
    if (this.useCustomLoader) {
      this.loader.show();
    }
    this.loadModel();
    this.update();
  }

  loadModel() {
    const gltfLoader = new GLTFLoader(this.loadingManager);
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    gltfLoader.setDRACOLoader(dracoLoader);

    if (this.modelPath) {
      gltfLoader.load(
        this.modelPath,
        (gltf) => {
          this.mesh = gltf.scene;
          this.setupMesh();
          this.createPhysicsBody();
          this.isLoaded = true;
          
          // Complete the custom loader
          if (this.useCustomLoader) {
            this.loader.complete();
          }
        },
        (progress) => {
          // Progress callback - update custom loader if being used
          if (this.useCustomLoader && progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`Loading progress: ${percent.toFixed(2)}%`);
            // Update loader progress (assuming it expects 0-1 range)
            this.loader.updateProgress(progress.loaded / progress.total, 'Loading Model');
          }
        },
        (error) => {
          console.error("Error loading GLB model:", error);
          this.createFallbackMesh();
        }
      );
    } else {
      this.createFallbackMesh();
    }
  }

  createFallbackMesh() {
    // Create a default box mesh if no model is provided
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.setupMesh();
    this.createPhysicsBody();
    this.isLoaded = true;
    
    // Complete the custom loader
    if (this.useCustomLoader) {
      this.loader.complete();
    }
  }

  setupMesh() {
    if (!this.mesh) return;

    // Apply transformations
    this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
    this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);

    // Set initial visibility
    this.mesh.visible = this.visible;

    // Setup shadows and materials
    this.mesh.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.visible = this.visible;

        // Add user data for identification
        object.userData = {
          type: "asset",
          asset: this,
          id: this.generateId(),
        };
      }
    });

    this.scene.add(this.mesh);
  }

  createPhysicsBody() {
    if (!this.mesh) return;

    const shape = this.createCollisionShape();
    const material = new CANNON.Material({
      friction: this.friction,
      restitution: this.restitution,
    });

    this.body = new CANNON.Body({
      mass: this.mass,
      material: material,
      shape: shape,
      position: new CANNON.Vec3(
        this.position.x,
        this.position.y,
        this.position.z
      ),
      collisionFilterGroup: this.collisionGroup,
      collisionFilterMask: this.collisionMask,
    });

    // Apply initial rotation
    if (
      this.rotation.x !== 0 ||
      this.rotation.y !== 0 ||
      this.rotation.z !== 0
    ) {
      const euler = new CANNON.Vec3(
        this.rotation.x,
        this.rotation.y,
        this.rotation.z
      );
      const quaternion = new CANNON.Quaternion();
      quaternion.setFromEuler(euler.x, euler.y, euler.z);
      this.body.quaternion.copy(quaternion);
    }

    // Set damping
    this.body.linearDamping = this.linearDamping;
    this.body.angularDamping = this.angularDamping;

    // Add user data for collision detection
    this.body.userData = {
      type: "asset",
      asset: this,
      id: this.generateId(),
    };

    this.world.addBody(this.body);
    this.isPhysicsReady = true;

    // Create wireframe if enabled
    if (this.showWireframe && shape instanceof CANNON.Trimesh) {
      this.createWireframe(shape);
    }
  }

  createWireframe(trimeshShape) {
    if (!trimeshShape || !(trimeshShape instanceof CANNON.Trimesh)) {
      return;
    }

    // Create wireframe geometry from trimesh data
    const wireframeGeometry = new THREE.BufferGeometry();

    // Get vertices from trimesh
    const vertices = trimeshShape.vertices;
    const indices = trimeshShape.indices;

    // Convert CANNON vertices to THREE.js format
    const positions = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      positions[i * 3] = vertices[i].x;
      positions[i * 3 + 1] = vertices[i].y;
      positions[i * 3 + 2] = vertices[i].z;
    }

    wireframeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    if (indices) {
      wireframeGeometry.setIndex(indices);
    }

    // Create wireframe material in green
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });

    // Create wireframe mesh
    this.wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);

    // Set wireframe visibility to match asset visibility
    this.wireframeMesh.visible = this.visible;

    // Position wireframe mesh to match the physics body
    this.wireframeMesh.position.copy(this.body.position);
    this.wireframeMesh.quaternion.copy(this.body.quaternion);

    // Add to scene
    this.scene.add(this.wireframeMesh);
  }

  createCollisionShape() {
    if (this.customDimensions) {
      return this.createCustomShape();
    }

    // Auto-detect shape based on geometry
    if (this.shapeType === "auto") {
      return this.autoDetectShape();
    }

    return this.createShapeByType();
  }

  createCustomShape() {
    const dims = this.customDimensions;

    switch (this.shapeType) {
      case "box":
        return new CANNON.Box(
          new CANNON.Vec3(dims.x * 0.5, dims.y * 0.5, dims.z * 0.5)
        );
      case "sphere":
        return new CANNON.Sphere(dims.radius);
      case "cylinder":
        return new CANNON.Cylinder(
          dims.radiusTop,
          dims.radiusBottom,
          dims.height,
          dims.segments || 8
        );
      default:
        return new CANNON.Box(
          new CANNON.Vec3(dims.x * 0.5, dims.y * 0.5, dims.z * 0.5)
        );
    }
  }

  autoDetectShape() {
    if (!this.mesh.geometry) {
      // For complex models, compute bounding box
      const box = new THREE.Box3().setFromObject(this.mesh);
      const size = box.getSize(new THREE.Vector3());
      return new CANNON.Box(
        new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
      );
    }

    const geometry = this.mesh.geometry;

    if (geometry.type === "BoxGeometry") {
      const params = geometry.parameters;
      return new CANNON.Box(
        new CANNON.Vec3(
          params.width * 0.5 * this.scale.x,
          params.height * 0.5 * this.scale.y,
          params.depth * 0.5 * this.scale.z
        )
      );
    } else if (geometry.type === "SphereGeometry") {
      const params = geometry.parameters;
      return new CANNON.Sphere(
        params.radius * Math.max(this.scale.x, this.scale.y, this.scale.z)
      );
    } else if (geometry.type === "CylinderGeometry") {
      const params = geometry.parameters;
      return new CANNON.Cylinder(
        params.radiusTop * this.scale.x,
        params.radiusBottom * this.scale.x,
        params.height * this.scale.y,
        params.radialSegments || 8
      );
    } else {
      // For complex geometries, create bounding box or convex hull
      return this.createComplexShape();
    }
  }

  createShapeByType() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());

    switch (this.shapeType) {
      case "box":
        return new CANNON.Box(
          new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
        );
      case "sphere":
        const radius = Math.max(size.x, size.y, size.z) * 0.5;
        return new CANNON.Sphere(radius);
      case "cylinder":
        return new CANNON.Cylinder(size.x * 0.5, size.x * 0.5, size.y, 8);
      case "convex":
        return this.createConvexHull();
      case "trimesh":
        return this.createTrimesh();
      default:
        return new CANNON.Box(
          new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
        );
    }
  }

  createComplexShape() {
    if (this.mass === 0) {
      // For static objects, use trimesh for accurate collision
      return this.createTrimesh();
    } else {
      // For dynamic objects, use convex hull or bounding box
      return this.createConvexHull() || this.createBoundingBox();
    }
  }

  createConvexHull() {
    if (!this.mesh.geometry || !this.mesh.geometry.attributes.position) {
      return this.createBoundingBox();
    }

    try {
      const positions = this.mesh.geometry.attributes.position.array;
      const points = [];

      for (let i = 0; i < positions.length; i += 3) {
        points.push(
          new CANNON.Vec3(
            positions[i] * this.scale.x,
            positions[i + 1] * this.scale.y,
            positions[i + 2] * this.scale.z
          )
        );
      }

      return new CANNON.ConvexPolyhedron({ vertices: points });
    } catch (error) {
      console.warn("Failed to create convex hull, using bounding box:", error);
      return this.createBoundingBox();
    }
  }

  createTrimesh() {
    if (!this.mesh.geometry || !this.mesh.geometry.attributes.position) {
      return this.createBoundingBox();
    }

    try {
      const geometry = this.mesh.geometry;
      const vertices = geometry.attributes.position.array;
      const indices = geometry.index ? geometry.index.array : null;

      // Scale vertices
      const scaledVertices = new Float32Array(vertices.length);
      for (let i = 0; i < vertices.length; i += 3) {
        scaledVertices[i] = vertices[i] * this.scale.x;
        scaledVertices[i + 1] = vertices[i + 1] * this.scale.y;
        scaledVertices[i + 2] = vertices[i + 2] * this.scale.z;
      }

      return new CANNON.Trimesh(scaledVertices, indices);
    } catch (error) {
      console.warn("Failed to create trimesh, using bounding box:", error);
      return this.createBoundingBox();
    }
  }

  createBoundingBox() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());
    return new CANNON.Box(
      new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
    );
  }

  // Utility methods similar to Car class
  setMass(mass) {
    this.mass = mass;
    if (this.body) {
      this.body.mass = mass;
      this.body.updateMassProperties();
    }
  }

  setFriction(friction) {
    this.friction = friction;
    if (this.body && this.body.material) {
      this.body.material.friction = friction;
    }
  }

  setRestitution(restitution) {
    this.restitution = restitution;
    if (this.body && this.body.material) {
      this.body.material.restitution = restitution;
    }
  }

  // Visibility control methods
  setVisible(visible) {
    this.visible = visible;

    // Update mesh visibility
    if (this.mesh) {
      this.mesh.visible = visible;

      // Update all child meshes
      this.mesh.traverse((object) => {
        if (object.isMesh) {
          object.visible = visible;
        }
      });
    }

    // Update wireframe visibility
    if (this.wireframeMesh) {
      this.wireframeMesh.visible = visible;
    }
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }

  toggleVisibility() {
    this.setVisible(!this.visible);
  }

  isVisible() {
    return this.visible;
  }

  // Wireframe control methods
  setShowWireframe(show) {
    this.showWireframe = show;

    if (
      show &&
      !this.wireframeMesh &&
      this.body &&
      this.body.shapes[0] instanceof CANNON.Trimesh
    ) {
      this.createWireframe(this.body.shapes[0]);
    } else if (!show && this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh = null;
    }
  }

  toggleWireframe() {
    this.setShowWireframe(!this.showWireframe);
  }

  applyForce(force, worldPoint = null) {
    if (!this.body) return;

    const forceVec = new CANNON.Vec3(force.x, force.y, force.z);
    const pointVec = worldPoint
      ? new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z)
      : this.body.position;

    this.body.applyForce(forceVec, pointVec);
  }

  applyImpulse(impulse, worldPoint = null) {
    if (!this.body) return;

    const impulseVec = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);
    const pointVec = worldPoint
      ? new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z)
      : this.body.position;

    this.body.applyImpulse(impulseVec, pointVec);
  }

  setPosition(x, y, z) {
    this.position = { x, y, z };
    if (this.body) {
      this.body.position.set(x, y, z);
    }
    if (this.mesh) {
      this.mesh.position.set(x, y, z);
    }
    if (this.wireframeMesh) {
      this.wireframeMesh.position.set(x, y, z);
    }
  }

  setRotation(x, y, z) {
    this.rotation = { x, y, z };
    if (this.body) {
      const euler = new CANNON.Vec3(x, y, z);
      const quaternion = new CANNON.Quaternion();
      quaternion.setFromEuler(euler.x, euler.y, euler.z);
      this.body.quaternion.copy(quaternion);
    }
    if (this.mesh) {
      this.mesh.rotation.set(x, y, z);
    }
    if (this.wireframeMesh) {
      this.wireframeMesh.rotation.set(x, y, z);
    }
  }

  reset(position = this.position, rotation = this.rotation) {
    if (this.body) {
      this.body.position.set(position.x, position.y, position.z);
      this.body.angularVelocity.set(0, 0, 0);
      this.body.velocity.set(0, 0, 0);

      if (rotation) {
        const euler = new CANNON.Vec3(rotation.x, rotation.y, rotation.z);
        const quaternion = new CANNON.Quaternion();
        quaternion.setFromEuler(euler.x, euler.y, euler.z);
        this.body.quaternion.copy(quaternion);
      }
    }
  }

  cleanup() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh = null;
    }
    if (this.body) {
      this.world.removeBody(this.body);
      this.body = null;
    }
    
    // Clean up custom loader if used
    if (this.useCustomLoader && this.loader) {
      this.loader.hide();
      this.loader = null;
    }
    
    this.isLoaded = false;
    this.isPhysicsReady = false;
    console.log("Asset Cleaned Up");
  }

  generateId() {
    return "asset_" + Math.random().toString(36).substr(2, 9);
  }

  update() {
    const updateWorld = () => {
      if (this.body && this.mesh && this.isLoaded && this.isPhysicsReady) {
        // Sync mesh position and rotation with physics body
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Sync wireframe mesh if it exists
        if (this.wireframeMesh) {
          this.wireframeMesh.position.copy(this.body.position);
          this.wireframeMesh.quaternion.copy(this.body.quaternion);
        }
      }
    };

    if (this.world) {
      this.world.addEventListener("postStep", updateWorld);
    }
  }

  // Collision detection methods
  onCollision(callback) {
    if (!this.body) return;

    this.body.addEventListener("collide", (event) => {
      const { target, body, contact } = event;
      callback({
        otherBody: body,
        contact: contact,
        asset: this,
      });
    });
  }

  // Get current physics state
  getVelocity() {
    return this.body ? this.body.velocity : new CANNON.Vec3(0, 0, 0);
  }

  getAngularVelocity() {
    return this.body ? this.body.angularVelocity : new CANNON.Vec3(0, 0, 0);
  }

  getPosition() {
    return this.body ? this.body.position : new CANNON.Vec3(0, 0, 0);
  }

  getRotation() {
    return this.body ? this.body.quaternion : new CANNON.Quaternion();
  }
}