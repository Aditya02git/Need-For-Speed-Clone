import { stopCurrentAnimation } from "../script";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import AICar from "./policeaicar.js";
// import AIInactiveCar from "./world/inactivecar.js";
// import AIInactiveCar from "./world/policeaicar_ford.js";
// import AIInactiveCar from "./policeai_mustang.js";
// import SpeedCarSpawner from "./spawner.js";
import Ferrari from "./Ferrari_Spy.js";
import Toyota_Supra from "./toyota_supra.js";

// import AICar from "./world/aicar.js"; // // it is for test

// import Spike from "./spikes.js";

import AIHelicopter from "./helicopter.js";

import Assets from "./assets.js";

import { AICarManager, AIRacingCar } from "./aiCarManager.js";
import { AssetsFix } from "./map.js";
// import { Background } from "./world/sky.js";
import { Background } from "./hdr.js";
// In your main script
import EnhancedSmoke from "./smoke.js";
import Nitro from "./nitro.js";

import Health from "./health.js";
// import Objective from "./world/objective.js";
import LapSystem from "./referenceObjective.js";
// import Objective from "./timeObjectives.js";
import Speedometer from "./speedometer.js";
import BMW from "./bmw.js";
import Lamborghini_Hurracan from "./Lamborghini_Huracan.js";
import Chevrolet_Corvette from "./chevrolet_corvette.js";
import Lamborghini_Centenario from "./Lamborghini_Centenario.js";
import { showPlayButton } from "./showPlayButton.js";
import { selectedCar } from "./selectCar.js";
import { showCountdown } from "./countDown.js";

let gameInstances = [];
let currentAnimationId = null;

export function cleanupGameInstances() {
  // Clean up all game instances
  gameInstances.forEach((instance) => {
    if (instance && typeof instance.cleanup === "function") {
      instance.cleanup();
    }
  });
  gameInstances = [];

  // Cancel any running animation
  if (currentAnimationId) {
    cancelAnimationFrame(currentAnimationId);
    currentAnimationId = null;
  }
}

export default function mapDevelopment() {
  // Stop any existing animation loop first
  stopCurrentAnimation();
  cleanupGameInstances();

  // Canvas & Scene
  let canvas = document.querySelector("canvas.webgl");
  if (!canvas) {
    // Create new canvas if it doesn't exist
    canvas = document.createElement("canvas");
    canvas.className = "webgl";
    document.body.appendChild(canvas);
  }
  const scene = new THREE.Scene();
  // scene.fog = new THREE.Fog(0xffffff, 10, 50);
  // scene.background = new THREE.Color(0xffffff);

  // Physics World
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
  });
  world.broadphase = new CANNON.SAPBroadphase(world);

  //   world.solver.iterations = 10; // Default: 10, Higher = more accurate but slower
  // world.solver.tolerance = 0.1;

  // Floor
  const floorGeo = new THREE.PlaneGeometry(1890, 725);
  const floorMesh = new THREE.Mesh(
    floorGeo,
    new THREE.MeshToonMaterial({ color: 0x2a2a2a })
  );
  floorMesh.rotation.x = -Math.PI * 0.5;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const floorShape = new CANNON.Plane();
  const floorBody = new CANNON.Body({ mass: 0 });
  floorBody.addShape(floorShape);
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floorBody);

  let light = new THREE.DirectionalLight(0xffffff, Math.PI * 1.75);
  light.position.set(1, 1, -1);
  scene.add(light, new THREE.AmbientLight(0xffffff, Math.PI * 0.25));

  // Game Map

  let wireframe = false;

  const bumpers = new AssetsFix(
    scene,
    world,
    { x: 30, y: 0, z: 0 },
    {
      modelPath: "./assets/bumpers.glb",
      mass: 0, // Static (default)
      friction: 0.8, // High friction for realistic contact
      restitution: 0.1, // Low bounce
      showWireframe: wireframe,
      wireframeColor: 0x00ff00,
    }
  );

  bumpers.init();

  const trianglebox = new AssetsFix(
    scene,
    world,
    { x: -133, y: 7.5, z: 178 },
    {
      modelPath: "./assets/trianglebox.glb",
      mass: 0, // Static (default)
      friction: 0.8, // High friction for realistic contact
      restitution: 0.1, // Low bounce
      showWireframe: wireframe,
      wireframeColor: 0x00ff00,
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    }
  );

  trianglebox.init();

  const ground = new AssetsFix(
    scene,
    world,
    { x: 0, y: 0.05, z: 0 },
    {
      modelPath: "./map1/ground.glb",
      mass: 0, // Static (default)
      friction: 0.8, // High friction for realistic contact
      restitution: 0.1, // Low bounce
      showWireframe: wireframe,
      wireframeColor: 0x00ff00,
      scale: { x: 1, y: 1, z: 1 },
    }
  );

  ground.init();

  const bgImage = new AssetsFix(
    scene,
    world,
    { x: 0, y: -8, z: 0 },
    {
      modelPath: "./map1/background1.glb",
      mass: 0, // Static (default)
      friction: 0.8, // High friction for realistic contact
      restitution: 0.1, // Low bounce
      showWireframe: wireframe,
      wireframeColor: 0x00ff00,
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: Math.PI, z: 0 },
    }
  );

  bgImage.init();

  // Generate all 42 roads
  const roads = [];

  for (let i = 1; i <= 15; i++) {
    const road = new AssetsFix(
      scene,
      world,
      { x: 0, y: 0.1, z: 0 },
      {
        modelPath: `./map1/road${i}.glb`,
        mass: 0, // Static (default)
        friction: 0.8, // High friction for realistic contact
        restitution: 0.1, // Low bounce
        rotation: { x: 0, y: 0, z: 0 },
        showWireframe: false,
        // wireframeColor: 0x00ff00,
        // rotation: { x: 0, y: Math.PI, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }
    );
    road.init();
    roads.push(road);
  }

  // // If you need to access individual roads later, you can use:
  // // roads[0] for road1, roads[1] for road2, etc.
  // // Or create individual variables:
  const [
    road1,
    road2,
    road3,
    road4,
    road5,
    road6,
    road7,
    road8,
    road9,
    road10,
    road11,
    road12,
    road13,
    road14,
    road15,
  ] = roads;

  //---------------------------------------------------------------

  //------------------------- Player Car --------------------------

  let car;
  let nitro;
  let nitro1;
  let nitro2;

  // Create car based on selection
  switch (selectedCar) {
    case 1:
      console.log("Creating Ferrari");
      car = new Ferrari(scene, world, null, { x: 452, y: 1, z: 180 });
      nitro = new Nitro(scene, world, car, car, { x: 4, y: -4, z: -18 }); // Offset behind vehicle
      nitro.setSize(0.2);
      break;
    case 2:
      console.log("Creating Toyota Supra");
      car = new Toyota_Supra(scene, world, null, { x: 452, y: 1, z: 180 });
      nitro = new Nitro(scene, world, car, car, { x: 4, y: -4, z: -18 }); // Offset behind vehicle
      nitro.setSize(0.2);
      nitro.init();
      break;
    case 3:
      console.log("Creating BMW");
      car = new BMW(scene, world, null, { x: 452, y: 1, z: 180 });
      nitro = new Nitro(scene, world, car, car, { x: 4, y: -4, z: -18 }); // Offset behind vehicle
      nitro.setSize(0.2);
      break;
    case 4:
      console.log("Creating Lamborghini Hurracan");
      car = new Lamborghini_Hurracan(scene, world, null, {
        x: 452,
        y: 1,
        z: 180,
      });
      nitro1 = new Nitro(scene, world, car, car, { x: 2, y: -2, z: -18 }); // Offset behind vehicle
      nitro1.setSize(0.2);
      nitro2 = new Nitro(scene, world, car, car, { x: -2, y: -2, z: -18 }); // Offset behind vehicle
      nitro2.setSize(0.2);
      nitro1.init();
      nitro2.init();
      break;
    case 5:
      console.log("Creating Chevrolet_Corvette");
      car = new Chevrolet_Corvette(scene, world, null, {
        x: 452,
        y: 1,
        z: 180,
      });
      nitro1 = new Nitro(scene, world, car, car, { x: 1, y: -4, z: -18 }); // Offset behind vehicle
      nitro1.setSize(0.2);
      nitro2 = new Nitro(scene, world, car, car, { x: -1, y: -4, z: -18 }); // Offset behind vehicle
      nitro2.setSize(0.2);
      nitro1.init();
      nitro2.init();
      break;
    case 6:
      console.log("Creating Lamborghini Centenario");
      car = new Lamborghini_Centenario(scene, world, null, {
        x: 452,
        y: 1,
        z: 180,
      });
      nitro1 = new Nitro(scene, world, car, car, { x: 1, y: -4, z: -18 }); // Offset behind vehicle
      nitro1.setSize(0.2);
      nitro2 = new Nitro(scene, world, car, car, { x: -1, y: -4, z: -18 }); // Offset behind vehicle
      nitro2.setSize(0.2);
      nitro1.init();
      nitro2.init();
      break;
    default:
      console.log("Creating default Ferrari");
      car = new Ferrari(scene, world, null, { x: 452, y: 1, z: 180 }); // Default to Ferrari
      nitro = new Nitro(scene, world, car, car, { x: 4, y: -4, z: -18 }); // Offset behind vehicle
      nitro.setSize(0.2);
  }
  car.init();
  // After creating your car
  // Initialize the enhanced system
  const smokeSystem = new EnhancedSmoke(scene, world, car, {
    x: 0.7, // Exhaust offset from vehicle center
    y: -1.5, // Height above ground
    z: -2.5, // Behind vehicle
  });
  smokeSystem.setTrailWidth(0.3);
  smokeSystem.init();

  const health = new Health(world, scene, car, 100); // 100 HP
  health.init();

  car.setHealthSystem(health);

  //---------------------------Speedometer-----------------------------

  // Initialize speedometer
  const speedometer = new Speedometer(car, {
    maxSpeed: 280,
    unit: "km/h",
    size: 300,
    position: { x: 1200, y: 400 },
    color: "#999999",
  });

  // Start the speedometer
  speedometer.init();

  // const speedCarSpawner = new SpeedCarSpawner(scene, world, car);

  // setInterval(() => {
  //   speedCarSpawner.update();
  // }, 5000);

  // Store game instances for cleanup
  gameInstances.push(
    car,
    health,
    bumpers,
    speedometer,
    nitro,
    smokeSystem,
    canvas
  );
  gameInstances.push(
    road1,
    road2,
    road3,
    road4,
    road5,
    road6,
    road7,
    road8,
    road9,
    road10,
    road11,
    road12,
    road13,
    road14,
    road15
  );
  // gameInstances.push(square1, square2);

  // ------------------------- AI Police Car ------------------------------

  // const aiCar3 = new AICar(scene, world, car, { x: -100, y: 10, z: 179 });
  // aiCar3.init();
  //   const smoke1 = new Smoke(scene, world, aiCar3, { x: 0.8, y: -0.9, z: -3.5 }); // Positioned behind the car
  // smoke1.init();

  // const aiCar4 = new AICar(scene, world, car, { x: -80, y: 10, z: 179 });
  // aiCar4.init();
  //   const smoke2 = new Smoke(scene, world, aiCar4, { x: 0.8, y: -0.9, z: -3.5 }); // Positioned behind the car
  // smoke2.init();

  // gameInstances.push(aiCar3, aiCar4);

  //------------------------- AI Inactive Police Car ------------------------------
  // const aiPoliceCar1 = new AIInactiveCar(
  //   scene,
  //   world,
  //   car,
  //   { x: 6, y: 4, z: 25 },
  //   { x: 0, y: Math.PI / 2, z: 0 }
  // );
  // aiPoliceCar1.init();

  // const aiPoliceCar2 = new AIInactiveCar(
  //   scene,
  //   world,
  //   car,
  //   { x: -6, y: 4, z: 25 },
  //   { x: 0, y: -Math.PI / 2, z: 0 }
  // );
  // aiPoliceCar2.init();

  // gameInstances.push(aiPoliceCar1, aiPoliceCar2);

  //------------------------- Spikes -------------------------------

  // const spike = new Spike(scene, world, { x: 0, y: 0, z: 25 } , wireframe);
  // spike.init();

  //------------------------- AI Police Helicipter --------------------------

  const aiHelicopter = new AIHelicopter(scene, world, car, {
    x: -540,
    y: 150,
    z: 203,
  });
  aiHelicopter.init();
  aiHelicopter.setFollowDistance(15); // Stay 10 units ahead
  aiHelicopter.setFollowHeight(20); // Fly at 18 units height
  aiHelicopter.setRotationSpeed(0.00001); // helicopter moving speed
  aiHelicopter.setShootingDistance(50);

  // Customize timing
  aiHelicopter.setActiveTime(60000); // 20 seconds active 3*60
  aiHelicopter.setBreakTime(8000); // 10 seconds break

  // Monitor status
  console.log(aiHelicopter.getStateInfo());

  gameInstances.push(aiHelicopter);

  //--------------------------------Objectives OR Laps------------------------------------

  //     const checkpoint = new Objective(
  //   world,
  //   scene,
  //   car,
  //   { x: 596.498, y: 2, z: 206.883 },        // position
  //   { x: 0, y: Math.PI/4, z: 0 },  // rotation (45° around Y-axis)
  //   { x: 3, y: 3, z: 3 },          // size
  //   1                               // required overlaps
  // );

  // // Set callbacks
  // checkpoint.setOnOverlapProgress((current, required) => {
  //   console.log(`Progress: ${current}/${required}`);
  // });

  // checkpoint.setOnObjectiveComplete((checkpoint) => {
  //   console.log("Checkpoint completed!");
  // });

  // // Initialize
  // checkpoint.init();

  // // Check status
  // console.log(checkpoint.getCurrentOverlaps()); // Current overlap count
  // console.log(checkpoint.isCompleted());        // Returns isFinished

  //------------------Moving Checkpoint-----------------

  // const positions = [
  //   { x: 596.498, y: 2, z: 206.883 },
  //   { x: 500, y: 1, z: 206.883 },
  //   { x: 400, y: 1, z: 206.883 },
  // ];

  // const movingCheckpoint = new Objective(
  //   world,
  //   scene,
  //   car,
  //   positions, // Multiple positions - will move between them
  //   { x: 0, y: Math.PI / 4, z: 0 }, // 45-degree Y rotation
  //   { x: 3, y: 6, z: 3 }, // 3x6x3 size
  //   3 // Requires 3 overlaps
  // );

  // // Set timer limit (60 seconds by default)
  // movingCheckpoint.timeLimit = 45; // 45 seconds to complete

  // // Set movement interval (5 seconds by default)
  // movingCheckpoint.moveIntervalTime = 3000; // Move every 3 seconds

  // // Set up callbacks
  // movingCheckpoint.setOnObjectiveComplete((obj) => {
  //   console.log("Moving checkpoint completed!");
  //   // Award bonus points for completing moving checkpoint
  // });

  // movingCheckpoint.setOnObjectiveFailed = (obj) => {
  //   console.log("Moving checkpoint failed - time ran out!");
  //   // Handle failure (restart level, show game over, etc.)
  // };

  // movingCheckpoint.onPositionChange = (positionIndex, newPosition) => {
  //   console.log(
  //     `Checkpoint moved to position ${positionIndex + 1}: ${JSON.stringify(
  //       newPosition
  //     )}`
  //   );
  // };

  // movingCheckpoint.onTimerUpdate = (timeRemaining, timeLimit) => {
  //   // Update your game's main timer display if needed
  //   console.log(`Time remaining: ${timeRemaining.toFixed(1)}s`);
  // };

  // movingCheckpoint.init();

  //--------------------------------------Assets--------------------------------------

  const block1 = new Assets(
    scene,
    world,
    { x: -6, y: 1.5, z: 22 },
    {
      modelPath: "./car/assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      showWireframe: true,
    }
  );

  const block2 = new Assets(
    scene,
    world,
    { x: -2, y: 1.5, z: 22 },
    {
      modelPath: "./car/assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      showWireframe: true,
    }
  );

  const block3 = new Assets(
    scene,
    world,
    { x: 2, y: 1.5, z: 22 },
    {
      modelPath: "./car/assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      showWireframe: true,
    }
  );

  const block4 = new Assets(
    scene,
    world,
    { x: 6, y: 1.5, z: 22 },
    {
      modelPath: "./car/assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      showWireframe: true,
    }
  );

  const cone1 = new Assets(
    scene,
    world,
    { x: 0, y: 1.5, z: 20 },
    {
      modelPath: "./car/assets/cone1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      showWireframe: true,
    }
  );

  const cone2 = new Assets(
    scene,
    world,
    { x: 6, y: 1.5, z: 20 },
    {
      modelPath: "./car/assets/cone2.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      showWireframe: true,
    }
  );

  const cone3 = new Assets(
    scene,
    world,
    { x: -6, y: 1.5, z: 20 },
    {
      modelPath: "./car/assets/cone1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      showWireframe: true,
    }
  );

  block1.init();
  block2.init();
  block3.init();
  block4.init();
  cone1.init();
  cone2.init();
  cone3.init();

  gameInstances.push(block1, block2, block3, block4, cone1, cone2, cone3);

  //---------------------------------------- AI Racing Car --------------------------------------

  const aiCarManager = new AICarManager(scene, world);

  const startPoint = new THREE.Vector3(500.87, 1, 167.065);
  const startPoint1 = new THREE.Vector3(600, 1, 167.065);
  const endPoint = new THREE.Vector3(445.676, 1, 184.068);

  // // Option 1: Create a straight path
  // const straightPath = aiCarManager.createStraightPath(startPoint, endPoint, 8);

  // Option 2: Create a curved path with control points
  const controlPoints = [
    new THREE.Vector3(451.87, 1, 167.065),
    new THREE.Vector3(351.345, 1, 172.96),
    new THREE.Vector3(1.57239, 1, 172.96),
    new THREE.Vector3(-501.558, 1, 172.96),
    new THREE.Vector3(-576.438, 1, 176.729),
    new THREE.Vector3(-619.345, 1, 142.481),
    new THREE.Vector3(-634.234, 1, 111.938),
    new THREE.Vector3(-631.562, 1, 68.5428),
    new THREE.Vector3(-604.71, 1, 37.746),
    new THREE.Vector3(-553.933, 1, 21.4567),
    new THREE.Vector3(-491.109, 1, 43.3721),
    new THREE.Vector3(-362.539, 1, 84.2808),
    new THREE.Vector3(-292.552, 1, 105.929),
    new THREE.Vector3(-222.317, 1, 125.252),
    new THREE.Vector3(-168.99, 1, 125.252),
    new THREE.Vector3(-48.4554, 1, 125.252),
    new THREE.Vector3(202.841, 1, 125.252),
    new THREE.Vector3(257.076, 1, 124.372),
    new THREE.Vector3(300.395, 1, 103.472),
    new THREE.Vector3(321.295, 1, 68.1328),
    new THREE.Vector3(318.635, 1, 29.3733),
    new THREE.Vector3(292.035, 1, -7.1063),
    new THREE.Vector3(257.076, 1, -22.3061),
    new THREE.Vector3(216.167, 1, -22.3061),
    new THREE.Vector3(158.456, 1, -22.3061),
    new THREE.Vector3(112.297, 1, -22.3061),
    new THREE.Vector3(70.4979, 1, -53.0858),
    new THREE.Vector3(56.058, 1, -91.8453),
    new THREE.Vector3(65.9379, 1, -138.965),
    new THREE.Vector3(116.857, 1, -170.504),
    new THREE.Vector3(186.986, 1, -170.504),
    new THREE.Vector3(326.514, 1, -170.504),
    new THREE.Vector3(409.062, 1, -170.504),
    new THREE.Vector3(493.813, 1, -170.504),
    new THREE.Vector3(536.752, 1, -148.085),
    new THREE.Vector3(551.339, 1, -122.235),
    new THREE.Vector3(554.992, 1, -93.7453),
    new THREE.Vector3(546.956, 1, -61.6027),
    new THREE.Vector3(535.998, 1, -22.155),
    new THREE.Vector3(525.353, 1, 19.8734),
    new THREE.Vector3(530.672, 1, 55.593),
    new THREE.Vector3(544.552, 1, 79.6999),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(590.879, 1, 99.3481),
    new THREE.Vector3(615.031, 1, 101.952),
    new THREE.Vector3(635.171, 1, 123.992),
    new THREE.Vector3(633.651, 1, 154.772),
    new THREE.Vector3(601.732, 1, 172.252),
    //------------ 1-cycle ---------------

    new THREE.Vector3(1.57239, 1, 172.96),
    new THREE.Vector3(-501.558, 1, 172.96),
    new THREE.Vector3(-576.438, 1, 176.729),
    new THREE.Vector3(-619.345, 1, 142.481),
    new THREE.Vector3(-634.234, 1, 111.938),
    new THREE.Vector3(-631.562, 1, 68.5428),
    new THREE.Vector3(-604.71, 1, 37.746),
    new THREE.Vector3(-553.933, 1, 21.4567),
    new THREE.Vector3(-491.109, 1, 43.3721),
    new THREE.Vector3(-362.539, 1, 84.2808),
    new THREE.Vector3(-292.552, 1, 105.929),
    new THREE.Vector3(-222.317, 1, 125.252),
    new THREE.Vector3(-168.99, 1, 125.252),
    new THREE.Vector3(-48.4554, 1, 125.252),
    new THREE.Vector3(202.841, 1, 125.252),
    new THREE.Vector3(257.076, 1, 124.372),
    new THREE.Vector3(300.395, 1, 103.472),
    new THREE.Vector3(321.295, 1, 68.1328),
    new THREE.Vector3(318.635, 1, 29.3733),
    new THREE.Vector3(292.035, 1, -7.1063),
    new THREE.Vector3(257.076, 1, -22.3061),
    new THREE.Vector3(216.167, 1, -22.3061),
    new THREE.Vector3(158.456, 1, -22.3061),
    new THREE.Vector3(112.297, 1, -22.3061),
    new THREE.Vector3(70.4979, 1, -53.0858),
    new THREE.Vector3(56.058, 1, -91.8453),
    new THREE.Vector3(65.9379, 1, -138.965),
    new THREE.Vector3(116.857, 1, -170.504),
    new THREE.Vector3(186.986, 1, -170.504),
    new THREE.Vector3(326.514, 1, -170.504),
    new THREE.Vector3(409.062, 1, -170.504),
    new THREE.Vector3(493.813, 1, -170.504),
    new THREE.Vector3(536.752, 1, -148.085),
    new THREE.Vector3(551.339, 1, -122.235),
    new THREE.Vector3(554.992, 1, -93.7453),
    new THREE.Vector3(546.956, 1, -61.6027),
    new THREE.Vector3(535.998, 1, -22.155),
    new THREE.Vector3(525.353, 1, 19.8734),
    new THREE.Vector3(530.672, 1, 55.593),
    new THREE.Vector3(544.552, 1, 79.6999),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(590.879, 1, 99.3481),
    new THREE.Vector3(615.031, 1, 101.952),
    new THREE.Vector3(635.171, 1, 123.992),
    new THREE.Vector3(633.651, 1, 154.772),
    new THREE.Vector3(601.732, 1, 172.252),

    //------------ 2nd cycle ----------------

    new THREE.Vector3(1.57239, 1, 172.96),
    new THREE.Vector3(-501.558, 1, 172.96),
    new THREE.Vector3(-576.438, 1, 176.729),
    new THREE.Vector3(-619.345, 1, 142.481),
    new THREE.Vector3(-634.234, 1, 111.938),
    new THREE.Vector3(-631.562, 1, 68.5428),
    new THREE.Vector3(-604.71, 1, 37.746),
    new THREE.Vector3(-553.933, 1, 21.4567),
    new THREE.Vector3(-491.109, 1, 43.3721),
    new THREE.Vector3(-362.539, 1, 84.2808),
    new THREE.Vector3(-292.552, 1, 105.929),
    new THREE.Vector3(-222.317, 1, 125.252),
    new THREE.Vector3(-168.99, 1, 125.252),
    new THREE.Vector3(-48.4554, 1, 125.252),
    new THREE.Vector3(202.841, 1, 125.252),
    new THREE.Vector3(257.076, 1, 124.372),
    new THREE.Vector3(300.395, 1, 103.472),
    new THREE.Vector3(321.295, 1, 68.1328),
    new THREE.Vector3(318.635, 1, 29.3733),
    new THREE.Vector3(292.035, 1, -7.1063),
    new THREE.Vector3(257.076, 1, -22.3061),
    new THREE.Vector3(216.167, 1, -22.3061),
    new THREE.Vector3(158.456, 1, -22.3061),
    new THREE.Vector3(112.297, 1, -22.3061),
    new THREE.Vector3(70.4979, 1, -53.0858),
    new THREE.Vector3(56.058, 1, -91.8453),
    new THREE.Vector3(65.9379, 1, -138.965),
    new THREE.Vector3(116.857, 1, -170.504),
    new THREE.Vector3(186.986, 1, -170.504),
    new THREE.Vector3(326.514, 1, -170.504),
    new THREE.Vector3(409.062, 1, -170.504),
    new THREE.Vector3(493.813, 1, -170.504),
    new THREE.Vector3(536.752, 1, -148.085),
    new THREE.Vector3(551.339, 1, -122.235),
    new THREE.Vector3(554.992, 1, -93.7453),
    new THREE.Vector3(546.956, 1, -61.6027),
    new THREE.Vector3(535.998, 1, -22.155),
    new THREE.Vector3(525.353, 1, 19.8734),
    new THREE.Vector3(530.672, 1, 55.593),
    new THREE.Vector3(544.552, 1, 79.6999),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(566.772, 1, 91.3125),
    new THREE.Vector3(590.879, 1, 99.3481),
    new THREE.Vector3(615.031, 1, 101.952),
    new THREE.Vector3(635.171, 1, 123.992),
    new THREE.Vector3(633.651, 1, 154.772),
    new THREE.Vector3(601.732, 1, 172.252),
  ];

  const curvedPath = aiCarManager.createCurvedPath(
    startPoint,
    endPoint,
    controlPoints,
    100
  );

  // Create AI car with the path
  // const aiCar = aiCarManager.createAICar(curvedPath, startPoint, endPoint);
  const aiCar1 = aiCarManager.createAICar(curvedPath, startPoint, endPoint);
  aiCar1.carId = "r_1";
  aiCar1.setRotation(0, -Math.PI / 2, 0);
  const aiCar2 = aiCarManager.createAICar(curvedPath, startPoint1, endPoint);
  aiCar2.carId = "r_2";
  aiCar2.setRotation(0, -Math.PI / 2, 0);

  // Optional: Visualize the path for debugging
  const pathLine = aiCarManager.visualizePath(curvedPath, 0x00ff00);

  gameInstances.push(aiCarManager, aiCar1, aiCar2, pathLine, curvedPath);

  //---------------------------------------------
  //------------------------------- Create the lap system --------------------------------
  // Create lap system instance

  const lapSystem = new LapSystem(world, scene, car, [aiCar1, aiCar2]);

  // Checkpoint configuration
  const checkpointConfig = {
    A: {
      position: { x: 451.87, y: 2, z: 167.065 },
      size: { x: 50, y: 50, z: 50 },
      name: "Start/Finish",
      color: 0xff0000, // Red
    },
    B: {
      position: { x: 1.57239, y: 1, z: 172.96 },
      size: { x: 50, y: 50, z: 50 },
      name: "Turn Point 1",
      color: 0x00ff00, // Green
      visible: true,
    },
    C: {
      position: { x: -576.438, y: 1, z: 176.729 },
      size: { x: 50, y: 50, z: 50 },
      name: "Turn Point 2",
      color: 0x0000ff, // Blue
      visible: true,
    },
    D: {
      position: { x: -619.345, y: 1, z: 142.481 },
      size: { x: 50, y: 15, z: 50 },
      name: "Turn Point 2",
      color: 0x0000ff, // Blue
      visible: true,
    },
  };

  // Configure the lap system with checkpoint config
  lapSystem.checkpointConfigs = [
    {
      id: "A",
      ...lapSystem.checkpointConfigs[0], // Keep defaults
      ...checkpointConfig.A, // Override with your config
    },
    {
      id: "B",
      ...lapSystem.checkpointConfigs[1],
      ...checkpointConfig.B,
    },
    {
      id: "C",
      ...lapSystem.checkpointConfigs[2],
      ...checkpointConfig.C,
    },
    {
      id: "C",
      ...lapSystem.checkpointConfigs[3],
      ...checkpointConfig.D,
    },
  ];

  // Set required cycles (this means 3 complete A→B→C cycles per lap)
  lapSystem.setRequiredCycles(2);

  // Optional: Set target laps for race completion
  lapSystem.setTargetLaps(1); // Race ends after 5 laps

  // Initialize the system (this must be called after configuration)
  lapSystem.init();

  // Optional: Start the timer
  lapSystem.startTimer();

  // Optional: Set up event callbacks
  lapSystem.onLapComplete = (lapNumber, progress) => {
    console.log(`Lap ${lapNumber} completed!`, progress);
  };

  lapSystem.onInvalidVisit = (
    visitedCheckpoint,
    expectedCheckpoint,
    invalidCount
  ) => {
    console.log(
      `Invalid visit: hit ${visitedCheckpoint}, expected ${expectedCheckpoint}`
    );
  };

  lapSystem.onProgressUpdate = (cycleCompletions, requiredCycles, progress) => {
    console.log(`Progress: ${cycleCompletions}/${requiredCycles} cycles`);
  };

  gameInstances.push(lapSystem);
  //---------------------------------------------

  // Camera
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    10000
  );
  camera.position.set(0, 2, -6);

  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2;
  controls.enablePan = false;
  controls.target.set(0, 1.5, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ✅ Add tone mapping & exposure for brighter, more realistic lighting
  // renderer.outputEncoding = THREE.sRGBEncoding;
  //  renderer.toneMapping = THREE.ACESFilmicToneMapping; // You can also try ReinhardToneMapping
  //  renderer.toneMappingExposure = 0.4; // Increase to brighten the scene (default is 1.0)

  // const background = new Background(renderer);
  // scene.add(background);
  // background.addSunToScene(scene);

  const background = new Background(
    renderer,
    "./rustig_koppie_puresky_4k.hdr",
    2
  );
  scene.add(background);
  background.setExposure(1.5); // Increase brightness
  // background.setExposure(0.1); // Decrease brightness

  // Handle Resize
  const handleResize = () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  window.addEventListener("resize", handleResize);

  // Reduced from 40000ms to 100ms

  // Animation Loop with destruction handling
  const timeStep = 1 / 60;
  let lastCallTime;
  let gameRunning = true;
  let gamePaused = false;
  let destructionTime = null;
  car.controlsDisabled = true;
  aiCar1.isControlDisabled = true;
  aiCar2.isControlDisabled = true;

  setTimeout(() => {
    car.controlsDisabled = false;
    aiCar1.isControlDisabled = false;
    aiCar2.isControlDisabled = false;
  }, 3000); // 3000 milliseconds = 3 seconds

  showCountdown(() => {});

  // Show Game Over/Pause UI
  function showGameOverScreen(isPaused = false) {
    if (document.getElementById("gameOverScreen")) return;

    const gameOverDiv = document.createElement("div");
    gameOverDiv.id = "gameOverScreen";
    gameOverDiv.style.position = "fixed";
    gameOverDiv.style.top = "0";
    gameOverDiv.style.left = "0";
    gameOverDiv.style.width = "100%";
    gameOverDiv.style.height = "100%";
    gameOverDiv.style.display = "flex";
    gameOverDiv.style.justifyContent = "center";
    gameOverDiv.style.alignItems = "center";
    gameOverDiv.style.color = "white";
    gameOverDiv.style.fontSize = "48px";
    gameOverDiv.style.fontFamily = "Arial, sans-serif";
    gameOverDiv.style.zIndex = "1000";

    const title = isPaused ? "GAME PAUSED" : "GAME OVER";
    const subtitle = isPaused
      ? "Press ESC to resume or use the buttons below"
      : "Your car has been destroyed!";

    gameOverDiv.innerHTML = `
      <div style="text-align: center; background-color: rgba(0, 0, 0, 0.8); padding: 40px; border-radius: 10px;">
        <h1>${title}</h1>
        <p style="font-size: 24px;">${subtitle}</p>
        ${
          isPaused
            ? `
          <button id="resumeButton" style="
            padding: 10px 20px;
            font-size: 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 20px;
          ">Resume Game</button>
          <br>
        `
            : ""
        }
        <button id="restartButton" style="
          padding: 10px 20px;
          font-size: 20px;
          background-color: #ff4444;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 20px;
        ">Restart Game</button>
        <br>
        <button id="returnToMenu" style="
          padding: 10px 20px;
          font-size: 20px;
          background-color: #ff4444;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        ">Main Menu</button>
      </div>
    `;

    document.body.appendChild(gameOverDiv);

    // Resume button (only shown when paused)
    if (isPaused) {
      document.getElementById("resumeButton").addEventListener("click", () => {
        gameOverDiv.remove();

        car.controlsDisabled = false;
        //  car.playSound("idle");
        gamePaused = false;
      });
    }

    // Replace the existing restart button handler (around line 650-660)
    document.getElementById("restartButton").addEventListener("click", () => {
      // Set health as destroyed
      health.isDestroyed = true;

      // Remove game over UI
      if (gameOverDiv && gameOverDiv.parentNode) {
        gameOverDiv.remove();
      }

      // Single comprehensive cleanup
      // gameCleanup(); // This should handle everything
      cleanupGameInstances();

      // Small delay to ensure cleanup completes
      setTimeout(() => {
        startGame();
      }, 40000);
    });

    // Replace the existing main menu button handler (around line 665-675)
    document.getElementById("returnToMenu").addEventListener("click", () => {
      // FIRST THING: Set health as destroyed
      health.isDestroyed = true;

      // Then do the remaining main menu logic
      gameOverDiv.remove();
      // Clean up current game before returning to menu
      stopCurrentAnimation();
      window.removeEventListener("resize", handleResize);
      // gameCleanup();
      cleanupGameInstances();
      setTimeout(() => {
        showPlayButton();
      }, 40000);
      // Show main menu
    });
  }

  function showCheckPointReached() {
    if (document.getElementById("CheckpointReached")) return;

    const checkPointReachedDiv = document.createElement("div");
    checkPointReachedDiv.id = "CheckpointReached";
    checkPointReachedDiv.style.position = "fixed";
    checkPointReachedDiv.style.top = "0";
    checkPointReachedDiv.style.left = "0";
    checkPointReachedDiv.style.width = "100%";
    checkPointReachedDiv.style.height = "100%";
    checkPointReachedDiv.style.display = "flex";
    checkPointReachedDiv.style.justifyContent = "center";
    checkPointReachedDiv.style.alignItems = "center";
    checkPointReachedDiv.style.color = "white";
    checkPointReachedDiv.style.fontSize = "48px";
    checkPointReachedDiv.style.fontFamily = "Arial, sans-serif";
    checkPointReachedDiv.style.zIndex = "1000";

    checkPointReachedDiv.innerHTML = `
    <div style="text-align: center; background-color: rgba(0, 0, 0, 0.8); padding: 40px; border-radius: 10px;">
      <h1>CheckPoint Reached</h1>
      <button id="restartButton" style="
        padding: 10px 20px;
        font-size: 20px;
        background-color: #ff4444;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 20px;
        margin-right: 10px;
      ">Restart Game</button>
      <button id="returnToMenu" style="
        padding: 10px 20px;
        font-size: 20px;
        background-color: #ff4444;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 20px;
      ">Main Menu</button>
    </div>
  `;

    document.body.appendChild(checkPointReachedDiv);

    // Restart button event listener
    const restartButton = document.getElementById("restartButton");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        // FIRST THING: Set health as destroyed
        health.isDestroyed = true;

        // Then do the remaining restart logic
        checkPointReachedDiv.remove();
        // Clean up current game before restarting
        stopCurrentAnimation();
        window.removeEventListener("resize", handleResize);
        // gameCleanup();
        cleanupGameInstances();
        setTimeout(() => {
          startGame();
        }, 40000);
        // Restart game logic here
      });
    }

    // Main menu button event listener
    const returnToMenuButton = document.getElementById("returnToMenu");
    if (returnToMenuButton) {
      returnToMenuButton.addEventListener("click", () => {
        // FIRST THING: Set health as destroyed
        health.isDestroyed = true;

        // Then do the remaining main menu logic
        checkPointReachedDiv.remove();
        // Clean up current game before returning to menu
        stopCurrentAnimation();
        window.removeEventListener("resize", handleResize);
        // gameCleanup();
        cleanupGameInstances();
        setTimeout(() => {
          showPlayButton();
        }, 40000);

        // Show main menu
      });
    }
  }

  const tick = () => {
    currentAnimationId = requestAnimationFrame(tick);

    //   if(car.isDrifting){
    // nitro.playAnimation();
    // } else {
    //   nitro.pauseAnimation();
    // }

    // Game Over Logic
    if (health.isDestroyed && gameRunning) {
      if (!destructionTime) {
        destructionTime = Date.now();
        canvas.style.display = "block";
      }

      // vehicleCollider.update();
      const elapsed = Date.now() - destructionTime;

      if (elapsed >= 10000) {
        showGameOverScreen(false);
        gameRunning = false;
      }
    }

    // Checkpoint Failed Logic -- movingCheckpoint.isFailed
    // if (movingCheckpoint.isFailed && gameRunning) {
    //   if (!destructionTime) {
    //     destructionTime = Date.now();
    //     canvas.style.display = "block";
    //   }

    //   car.onCarDestroyed();
    //   const elapsed = Date.now() - destructionTime;

    //   if (elapsed >= 10000) {
    //     showGameOverScreen(false);
    //     gameRunning = false;
    //   }
    // }

    // Checkpoint Success Logic  -- movingCheckpoint.isFinished
    if (lapSystem.raceFinished && gameRunning) {
      // console.log(LapSystem.lapCompleted)
      if (!destructionTime) {
        destructionTime = Date.now();
        canvas.style.display = "block";
      }

      car.onCarDestroyed();
      aiCar1.stopCar();
      aiCar2.stopCar();
      //   aiHelicopter.isReturning = true;
      const elapsed = Date.now() - destructionTime;

      if (elapsed >= 10000) {
        showCheckPointReached(false);
        gameRunning = false;
      }
    }

    // Render scene when game is paused
    if (!gameRunning || gamePaused) {
      scene.traverse((child) => {
        if (child instanceof THREE.LOD) {
          child.update(camera);
        }
      });

      renderer.render(scene, camera);
      return;
    }

    // Physics update
    const time = performance.now() / 1000;
    if (!lastCallTime) {
      world.step(timeStep);
    } else {
      const dt = time - lastCallTime;
      world.step(timeStep, dt);
    }
    lastCallTime = time;

    // Camera follow for car
    if (car.car && car.car.chassisBody) {
      const pos = car.car.chassisBody.position;
      controls.target.set(pos.x, pos.y + 2, pos.z);
      controls.minDistance = 8;
      controls.maxDistance = 10;
      controls.update();
      // updateSeparators();
    }

    // Camera follow for truck
    if (car.truck && car.truck.chassisBody) {
      const pos = car.truck.chassisBody.position;
      controls.target.set(pos.x, pos.y + 5, pos.z);
      controls.minDistance = 20;
      controls.maxDistance = 35;
      controls.update();
    }

    // 🔄 Update LODs before rendering
    scene.traverse((child) => {
      if (child instanceof THREE.LOD) {
        child.update(camera);
      }
    });

    renderer.render(scene, camera);
  };

  // Helper function to update separators
  // const updateSeparators = () => {
  //   const separators = [
  //     seperator_1, seperator_2, seperator_3, seperator_4, seperator_5,seperator_6,seperator_7,seperator_8,seperator_9,seperator_10,seperator_11,seperator_12
  //   ];

  //   separators.forEach(separator => {
  //     if (separator && separator.update) {
  //       separator.update();
  //     }
  //   });
  // };

  // Key event listeners
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (gamePaused) {
        // Resume game
        const gameOverDiv = document.getElementById("gameOverScreen");
        if (gameOverDiv) {
          gameOverDiv.remove();
        }

        car.controlsDisabled = false;
        // car.stopAllSounds = false;
        gamePaused = false;
      } else {
        // Pause game
        // car.stopAllSounds = true;
        car.controlsDisabled = true;
        gamePaused = true;
        showGameOverScreen(true);
      }
    }

    if (e.key.toLowerCase() === "t") {
      // Fixed: Added safety checks for reset functions
      if (car && car.reset) {
        car.reset({
          x: Math.random() * 30 - 15,
          y: 4,
          z: Math.random() * 30 - 15,
        });
      }

      if (aiCar3 && aiCar3.reset) {
        aiCar3.reset({
          x: Math.random() * 30 - 15,
          y: 4,
          z: Math.random() * 30 - 15,
        });
      }

      if (aiCar4 && aiCar4.reset) {
        aiCar4.reset({
          x: Math.random() * 30 - 15,
          y: 4,
          z: Math.random() * 30 - 15,
        });
      }

      if (health && health.reset) {
        health.reset();
      }

      gameRunning = true;
      gamePaused = false;
      destructionTime = null;
      canvas.style.display = "block";

      // Fixed: Added safety checks for car methods
      if (car) {
        if (car.stopCar) car.stopCar();
        if (car.stopSound) car.stopSound();
      }

      const gameOverDiv = document.getElementById("gameOverScreen");
      if (gameOverDiv) {
        gameOverDiv.remove();
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  // Store cleanup function for this game instance
  const gameCleanup = () => {
    // Fixed: Cancel animation frame when cleaning up
    if (currentAnimationId) {
      cancelAnimationFrame(currentAnimationId);
    }

    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("resize", handleResize);

    // Clean up Three.js objects
    if (scene) {
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      scene.clear();
    }

    if (renderer) {
      renderer.clear();
      renderer.dispose();
    }

    if (controls) {
      controls.dispose();
    }
    console.log("Game Cleaned-Up Successfully");
  };

  // Add cleanup function to the global cleanup array
  // Add cleanup to gameInstances instead
  gameInstances.push({ cleanup: gameCleanup });

  tick(); // Start the loop
}
