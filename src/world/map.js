import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export  class AssetsFix {
  followTarget = new THREE.Object3D();

  constructor(scene, world, position = { x: 0, y: 0, z: 0 }, options = {}) {
    this.scene = scene;
    this.world = world;
    this.position = position;

    // Asset properties
    this.mesh = null;
    this.wireframeMesh = null;
    this.body = null;
    this.mass = options.mass !== undefined ? options.mass : 0; // Static by default
    this.friction = options.friction || 0.4;
    this.restitution = options.restitution || 0.3;
    this.modelPath = options.modelPath || null;
    this.scale = options.scale || { x: 1, y: 1, z: 1 };
    this.rotation = options.rotation || { x: 0, y: 0, z: 0 };

    // Wireframe options
    this.showWireframe =
      options.showWireframe !== undefined ? options.showWireframe : true;
    this.wireframeColor = options.wireframeColor || 0x00ff00;
    this.wireframeOpacity = options.wireframeOpacity || 0.3;

    // Force trimesh for GLB models (ideal for static objects)
    this.shapeType = options.shapeType || "trimesh";
    this.customDimensions = options.customDimensions || null;

    // Trimesh options
    this.useConvexHullFallback =
      options.useConvexHullFallback !== undefined
        ? options.useConvexHullFallback
        : true;
    this.simplifyMesh =
      options.simplifyMesh !== undefined ? options.simplifyMesh : false;
    this.simplificationRatio = options.simplificationRatio || 0.5;

    // Damping properties
    this.linearDamping = options.linearDamping || 0.1;
    this.angularDamping = options.angularDamping || 0.1;

    // Collision properties (optimized for static objects)
    this.collisionGroup = options.collisionGroup || 2; // Different group for static objects
    this.collisionMask = options.collisionMask || -1; // Collide with everything

    // State tracking
    this.isLoaded = false;
    this.isPhysicsReady = false;
    this.combinedGeometry = null;
  }

  init() {
    this.loadModel();
    this.update();
  }

  loadModel() {
    const gltfLoader = new GLTFLoader();
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
          this.combineGeometries();
          this.createPhysicsBody();
          this.createWireframe();
          this.isLoaded = true;
        },
        undefined,
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
    this.combinedGeometry = geometry.clone();
    this.setupMesh();
    this.createPhysicsBody();
    this.createWireframe();
    this.isLoaded = true;
  }

  setupMesh() {
    if (!this.mesh) return;

    // Apply transformations
    this.mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);
    this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);

    // Setup shadows and materials
    this.mesh.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;

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

  combineGeometries() {
    if (!this.mesh) return;

    const geometries = [];
    const matrix = new THREE.Matrix4();

    this.mesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        // Clone geometry to avoid modifying original
        const geometry = child.geometry.clone();

        // Apply local transformations
        child.updateMatrixWorld();
        matrix.copy(child.matrixWorld);

        // Remove parent transformations if needed
        const parentMatrix = new THREE.Matrix4();
        if (child.parent && child.parent !== this.mesh) {
          parentMatrix.copy(child.parent.matrixWorld).invert();
          matrix.premultiply(parentMatrix);
        }

        geometry.applyMatrix4(matrix);
        geometries.push(geometry);
      }
    });

    if (geometries.length === 0) {
      console.warn("No geometries found in model");
      return;
    }

    // Merge all geometries into one
    if (geometries.length === 1) {
      this.combinedGeometry = geometries[0];
    } else {
      this.combinedGeometry = new THREE.BufferGeometry();
      this.combinedGeometry = this.mergeBufferGeometries(geometries);
    }

    // Ensure geometry has proper attributes
    if (!this.combinedGeometry.attributes.position) {
      console.error("Combined geometry has no position attribute");
      return;
    }

    // Compute normals if not present
    if (!this.combinedGeometry.attributes.normal) {
      this.combinedGeometry.computeVertexNormals();
    }

    // Simplify mesh if requested
    if (this.simplifyMesh) {
      this.simplifyGeometry();
    }

    console.log(
      `Combined geometry: ${this.combinedGeometry.attributes.position.count} vertices`
    );
  }

  mergeBufferGeometries(geometries) {
    const merged = new THREE.BufferGeometry();
    const attributes = {};
    const morphAttributes = {};
    const morphTargetsRelative = false;

    let totalVertices = 0;
    let totalIndices = 0;

    // Calculate total size needed
    for (const geometry of geometries) {
      totalVertices += geometry.attributes.position.count;
      if (geometry.index) {
        totalIndices += geometry.index.count;
      } else {
        totalIndices += geometry.attributes.position.count;
      }
    }

    // Merge positions
    const positions = new Float32Array(totalVertices * 3);
    const indices = totalIndices > 0 ? new Uint32Array(totalIndices) : null;

    let vertexOffset = 0;
    let indexOffset = 0;
    let currentIndex = 0;

    for (const geometry of geometries) {
      const positionAttribute = geometry.attributes.position;
      const geometryIndices = geometry.index;

      // Copy positions
      positions.set(positionAttribute.array, vertexOffset * 3);

      // Copy indices
      if (indices) {
        if (geometryIndices) {
          for (let i = 0; i < geometryIndices.count; i++) {
            indices[indexOffset + i] = geometryIndices.getX(i) + currentIndex;
          }
          indexOffset += geometryIndices.count;
        } else {
          // Generate indices for non-indexed geometry
          for (let i = 0; i < positionAttribute.count; i++) {
            indices[indexOffset + i] = currentIndex + i;
          }
          indexOffset += positionAttribute.count;
        }
      }

      currentIndex += positionAttribute.count;
      vertexOffset += positionAttribute.count;
    }

    merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    if (indices) {
      merged.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    return merged;
  }

  simplifyGeometry() {
    if (!this.combinedGeometry || !this.combinedGeometry.attributes.position)
      return;

    // Simple vertex reduction by sampling
    const positions = this.combinedGeometry.attributes.position.array;
    const indices = this.combinedGeometry.index
      ? this.combinedGeometry.index.array
      : null;

    const targetVertexCount = Math.floor(
      (positions.length / 3) * this.simplificationRatio
    );
    const step = Math.max(
      1,
      Math.floor(positions.length / 3 / targetVertexCount)
    );

    const newPositions = [];
    const newIndices = [];

    for (let i = 0; i < positions.length; i += step * 3) {
      newPositions.push(positions[i], positions[i + 1], positions[i + 2]);
    }

    // Create new simplified geometry
    const simplifiedGeometry = new THREE.BufferGeometry();
    simplifiedGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(newPositions, 3)
    );

    // Generate new indices for triangles
    for (let i = 0; i < newPositions.length / 9; i++) {
      const baseIndex = i * 3;
      newIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    }

    if (newIndices.length > 0) {
      simplifiedGeometry.setIndex(newIndices);
    }

    this.combinedGeometry = simplifiedGeometry;
    console.log(`Simplified geometry to ${newPositions.length / 3} vertices`);
  }

  createPhysicsBody() {
    if (!this.mesh) return;

    const shape = this.createTrimeshShape();
    const material = new CANNON.Material({
      friction: this.friction,
      restitution: this.restitution,
    });

    // Create static body (mass = 0)
    this.body = new CANNON.Body({
      mass: this.mass, // 0 for static objects
      material: material,
      shape: shape,
      position: new CANNON.Vec3(
        this.position.x,
        this.position.y,
        this.position.z
      ),
      collisionFilterGroup: this.collisionGroup,
      collisionFilterMask: this.collisionMask,
      type: this.mass === 0 ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC,
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

    // Static objects don't need damping, but set it anyway for flexibility
    if (this.mass > 0) {
      this.body.linearDamping = this.linearDamping;
      this.body.angularDamping = this.angularDamping;
    }

    // Add user data for collision detection
    this.body.userData = {
      type: "asset",
      asset: this,
      id: this.generateId(),
      isStatic: this.mass === 0,
    };

    this.world.addBody(this.body);
    this.isPhysicsReady = true;

    console.log(
      `Physics body created: ${
        this.mass === 0 ? "STATIC" : "STATIC"
      } trimesh with ${
        this.body.shapes[0].vertices
          ? this.body.shapes[0].vertices.length / 3
          : "unknown"
      } vertices`
    );
  }

  createTrimeshShape() {
    if (!this.combinedGeometry || !this.combinedGeometry.attributes.position) {
      console.warn(
        "No combined geometry available, creating bounding box fallback"
      );
      return this.createBoundingBox();
    }

    try {
      const positions = this.combinedGeometry.attributes.position.array;
      const indices = this.combinedGeometry.index
        ? this.combinedGeometry.index.array
        : null;

      // Scale vertices according to mesh scale
      const scaledVertices = new Float32Array(positions.length);
      for (let i = 0; i < positions.length; i += 3) {
        scaledVertices[i] = positions[i] * this.scale.x;
        scaledVertices[i + 1] = positions[i + 1] * this.scale.y;
        scaledVertices[i + 2] = positions[i + 2] * this.scale.z;
      }

      console.log(
        `Creating trimesh with ${scaledVertices.length / 3} vertices and ${
          indices ? indices.length / 3 : "auto-generated"
        } triangles`
      );

      const trimesh = new CANNON.Trimesh(scaledVertices, indices);

      // Update tree for better collision performance (especially important for static objects)
      trimesh.updateTree();

      // For static objects, we can use more detailed collision detection
      if (this.mass === 0) {
        trimesh.updateNormals();
      }

      return trimesh;
    } catch (error) {
      console.warn("Failed to create trimesh, using fallback:", error);

      if (this.useConvexHullFallback) {
        return this.createConvexHull();
      } else {
        return this.createBoundingBox();
      }
    }
  }

  createWireframe() {
    if (!this.showWireframe || !this.combinedGeometry) return;

    try {
      // Create wireframe geometry
      const wireframeGeometry = new THREE.WireframeGeometry(
        this.combinedGeometry
      );

      // Create wireframe material
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: this.wireframeColor,
        transparent: true,
        opacity: this.wireframeOpacity,
        depthTest: false,
        depthWrite: false,
      });

      // Create wireframe mesh
      this.wireframeMesh = new THREE.LineSegments(
        wireframeGeometry,
        wireframeMaterial
      );

      // Apply same transformations as main mesh
      this.wireframeMesh.scale.copy(this.mesh.scale);
      this.wireframeMesh.rotation.copy(this.mesh.rotation);
      this.wireframeMesh.position.copy(this.mesh.position);

      // Add to scene
      this.scene.add(this.wireframeMesh);

      console.log("Wireframe created successfully");
    } catch (error) {
      console.warn("Failed to create wireframe:", error);
    }
  }

  // Wireframe control methods
  toggleWireframe() {
    if (this.wireframeMesh) {
      this.wireframeMesh.visible = !this.wireframeMesh.visible;
    }
  }

  setWireframeColor(color) {
    this.wireframeColor = color;
    if (this.wireframeMesh && this.wireframeMesh.material) {
      this.wireframeMesh.material.color.setHex(color);
    }
  }

  setWireframeOpacity(opacity) {
    this.wireframeOpacity = opacity;
    if (this.wireframeMesh && this.wireframeMesh.material) {
      this.wireframeMesh.material.opacity = opacity;
    }
  }

  // Fallback shape creation methods
  createConvexHull() {
    if (!this.combinedGeometry || !this.combinedGeometry.attributes.position) {
      return this.createBoundingBox();
    }

    try {
      const positions = this.combinedGeometry.attributes.position.array;
      const points = [];

      // Sample points to avoid too many vertices
      const maxPoints = 256;
      const step = Math.max(1, Math.floor(positions.length / 3 / maxPoints));

      for (let i = 0; i < positions.length; i += step * 3) {
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

  createBoundingBox() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());
    return new CANNON.Box(
      new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
    );
  }

  // Utility methods
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
    // Remove event listeners first to prevent memory leaks
    if (this.body && this.world) {
      // Remove collision event listeners
      this.body.removeEventListener("collide");

      // Remove postStep event listener from world
      // Note: This removes ALL postStep listeners, might need refinement
      // if other objects are using the same world
      if (this.world.listeners && this.world.listeners.postStep) {
        this.world.removeEventListener("postStep");
      }
    }

    // Clean up physics body
    if (this.body && this.world) {
      this.world.removeBody(this.body);
      this.body = null;
    }

    // Clean up meshes and geometries
    if (this.mesh) {
      // Traverse and dispose of materials and geometries
      this.mesh.traverse((child) => {
        if (child.isMesh) {
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
        }
      });

      this.scene.remove(this.mesh);
      this.mesh = null;
    }

    // Clean up wireframe mesh
    if (this.wireframeMesh) {
      if (this.wireframeMesh.geometry) {
        this.wireframeMesh.geometry.dispose();
      }
      if (this.wireframeMesh.material) {
        this.wireframeMesh.material.dispose();
      }
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh = null;
    }

    // Clean up combined geometry
    if (this.combinedGeometry) {
      this.combinedGeometry.dispose();
      this.combinedGeometry = null;
    }

    // Reset state flags
    this.isLoaded = false;
    this.isPhysicsReady = false;

    // Clear references
    this.scene = null;
    this.world = null;

    console.log("Roads are cleaned up");
  }

  generateId() {
    return "asset_" + Math.random().toString(36).substr(2, 9);
  }

  update() {
    const updateWorld = () => {
      if (this.body && this.mesh && this.isLoaded && this.isPhysicsReady) {
        // For static objects, we usually don't need to sync position/rotation
        // unless they've been manually moved, but we'll do it for completeness
        if (this.mass > 0) {
          // Dynamic objects: sync mesh with physics body
          this.mesh.position.copy(this.body.position);
          this.mesh.quaternion.copy(this.body.quaternion);

          // Sync wireframe if it exists
          if (this.wireframeMesh) {
            this.wireframeMesh.position.copy(this.body.position);
            this.wireframeMesh.quaternion.copy(this.body.quaternion);
          }
        } else {
          // Static objects: sync physics body with mesh (in case mesh was moved manually)
          this.body.position.copy(this.mesh.position);
          this.body.quaternion.copy(this.mesh.quaternion);

          // Sync wireframe with mesh
          if (this.wireframeMesh) {
            this.wireframeMesh.position.copy(this.mesh.position);
            this.wireframeMesh.quaternion.copy(this.mesh.quaternion);
          }
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

  // Debug information
  getDebugInfo() {
    return {
      isLoaded: this.isLoaded,
      isPhysicsReady: this.isPhysicsReady,
      isStatic: this.mass === 0,
      hasWireframe: !!this.wireframeMesh,
      vertexCount: this.combinedGeometry
        ? this.combinedGeometry.attributes.position.count
        : 0,
      shapeType: "trimesh",
      mass: this.mass,
      position: this.getPosition(),
      velocity: this.mass > 0 ? this.getVelocity() : "N/A (static)",
      collisionGroup: this.collisionGroup,
      collisionMask: this.collisionMask,
    };
  }

  // Static object specific methods
  makeStatic() {
    this.setMass(0);
    if (this.body) {
      this.body.type = CANNON.Body.KINEMATIC;
      this.body.userData.isStatic = true;
    }
  }

  makeDynamic(mass = 1) {
    this.setMass(mass);
    if (this.body) {
      this.body.type = CANNON.Body.DYNAMIC;
      this.body.userData.isStatic = false;
    }
  }

  // Enhanced collision detection for static objects
  onCollisionWithDynamic(callback) {
    if (!this.body) return;

    this.body.addEventListener("collide", (event) => {
      const { target, body, contact } = event;

      // Only trigger callback if colliding with dynamic objects
      if (body.mass > 0) {
        callback({
          otherBody: body,
          contact: contact,
          asset: this,
          staticObject: this,
          dynamicObject: body.userData?.asset || body,
        });
      }
    });
  }
}