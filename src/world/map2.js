import { stopCurrentAnimation } from "../script";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import AICar from "./policeaicar.js";
// import AIInactiveCar from "./world/inactivecar.js";
// import AIInactiveCar from "./world/policeaicar_ford.js";
import AIInactiveCar from "./policeai_mustang.js";
// import SpeedCarSpawner from "./spawner.js";
import Ferrari from "./Ferrari_Spy.js";
import Toyota_Supra from "./toyota_supra.js";

// import AICar from "./world/aicar.js"; // // it is for test

import Spike from "./spikes.js";

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
import Speedometer from "./speedometer.js";
import BMW from "./bmw.js";
import Lamborghini_Hurracan from "./Lamborghini_Huracan.js";
import Chevrolet_Corvette from "./chevrolet_corvette.js";
import Lamborghini_Centenario from "./Lamborghini_Centenario.js";
import { showPlayButton } from "./showPlayButton.js";
import { selectedCar } from "./selectCar.js";
import { showCountdown } from "./countDown.js";
import GameBoundary from "./fence.js";
import Sound from "./soundSystem.js";
import { Timer } from "./timer.js";
import Minimap from "./minimap.js";
import { LoadingComponent } from "../loader/loadingComponent.js";
import { getAntialias } from "./antialiasing.js";

let gameInstances = [];
let currentAnimationId = null;

export function getDebug() {
  return localStorage.getItem("debug") === "true";
}

export function setDebug(value) {
  localStorage.setItem("debug", value);
}

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

export default function startGame1() {
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


    canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
  hideCursor();
});

document.addEventListener("pointerlockchange", () => {
  const isLocked = document.pointerLockElement === canvas;
  if (!isLocked) {
    showCursor(); // Unlock = show cursor
  }
});





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

  const bumpers = new AssetsFix(
    scene,
    world,
    { x: 30, y: 0, z: 0 },
    {
      modelPath: "./assets/bumpers.glb",
      mass: 0, // Static (default)
      friction: 0.8, // High friction for realistic contact
      restitution: 0.1, // Low bounce
      showWireframe: getDebug(),
      wireframeColor: 0x00ff00,
    }
  );

  bumpers.init();

  const ground = new AssetsFix(
    scene,
    world,
    { x: 0, y: 0.05, z: 0 },
    {
      modelPath: "./map2/ground.glb",
      mass: 0, // Static (default)
      friction: 0.8, // High friction for realistic contact
      restitution: 0.1, // Low bounce
      showWireframe: getDebug(),
      wireframeColor: 0x00ff00,
      scale: { x: 1, y: 1, z: 1 },
    }
  );

  ground.init();


  const asset1 = new AssetsFix(
    scene,
    world,
    { x: 0, y: 0.05, z: 0 },
    {
      modelPath: "./map2/asset1.glb",
      mass: 0, // Static (default)
      friction: 0.8, // High friction for realistic contact
      restitution: 0.1, // Low bounce
      showWireframe: getDebug(),
      wireframeColor: 0x00ff00,
      scale: { x: 1, y: 1, z: 1 },
    }
  );

  asset1.init();


  //---------------------------------------------------------------

  //------------------------- Player Car --------------------------

  let car;
  let nitro;
  let nitro1;
  let nitro2;
  let smoke;
  let smoke1;
  let smoke2;
  let engineSound;
  let carLoc = {x:-500,y:1,z:0};

  // Create car based on selection
  switch (selectedCar) {
    case 1:
      console.log("Creating Ferrari");
      car = new Ferrari(scene, world, null, carLoc);
      gameInstances.push(car);
      nitro1 = new Nitro(scene, world, car, car, { x: 2, y: -3.5, z: -18 }); // Offset behind vehicle
      nitro1.setSize(0.2);
      nitro2 = new Nitro(scene, world, car, car, { x: -2, y: -3.5, z: -18 }); // Offset behind vehicle
      nitro2.setSize(0.2);
      nitro1.init();
      nitro2.init();

      smoke1 = new EnhancedSmoke(scene, world, car, {
      x: 0.7, y: -1, z: -3.5
        });
        smoke1.setTrailWidth(0.4);
        smoke1.init();
      smoke2 = new EnhancedSmoke(scene, world, car, {
      x: -0.7, y: -1, z: -3.5
        });
        smoke2.setTrailWidth(0.3);
        smoke2.init();

      engineSound = new Sound(car, {
      unit: "kmh", // or "mph"
      maxSpeed: 200, // Speed that corresponds to 100% pitch
      audioFile: "./sounds/ferrari_sound.mp3", // or File object
      autoPlay: true // Start playing when initialized
    });
      break;
    case 2:
      console.log("Creating Toyota Supra");
      car = new Toyota_Supra(scene, world, null, carLoc);
      gameInstances.push(car);
      nitro = new Nitro(scene, world, car, car, { x: 4, y: -4, z: -18 }); // Offset behind vehicle
      nitro.setSize(0.2);
      nitro.init();

      smoke = new EnhancedSmoke(scene, world, car, {
      x: 0.7, y: -1.5, z: -2.5
      });
      smoke.setTrailWidth(0.3);
      smoke.init();
      engineSound = new Sound(car, {
      unit: "kmh", // or "mph"
      maxSpeed: 200, // Speed that corresponds to 100% pitch
      audioFile: "./sounds/tsupra_sound.mp3", // or File object
      autoPlay: true // Start playing when initialized
    });
      break;
    case 3:
      console.log("Creating BMW");
      car = new BMW(scene, world, null, carLoc);
      gameInstances.push(car);
      nitro = new Nitro(scene, world, car, car, { x: -6.5, y: -5, z: -1.5 }); // Offset behind vehicle
      nitro.setSize(0.2);
      nitro.init();

      smoke = new EnhancedSmoke(scene, world, car, {
      x: -1.35, y: -1.2, z: -0.5
      });
      smoke.setTrailWidth(0.3);
      smoke.init();
      engineSound = new Sound(car, {
      unit: "kmh", // or "mph"
      maxSpeed: 200, // Speed that corresponds to 100% pitch
      audioFile: "./sounds/bmw_sound.mp3", // or File object
      autoPlay: true // Start playing when initialized
    });
      break;
    case 4:
      console.log("Creating Lamborghini Hurracan");
      car = new Lamborghini_Hurracan(scene, world, null, carLoc);
      gameInstances.push(car);
      nitro1 = new Nitro(scene, world, car, car, { x: 2, y: -2, z: -18 }); // Offset behind vehicle
      nitro1.setSize(0.2);
      nitro2 = new Nitro(scene, world, car, car, { x: -2, y: -2, z: -18 }); // Offset behind vehicle
      nitro2.setSize(0.2);
      nitro1.init();
      nitro2.init();

      smoke1 = new EnhancedSmoke(scene, world, car, {
      x: 0.6, y: -0.8, z: -3.3
        });
        smoke1.setTrailWidth(0.3);
        smoke1.init();
      smoke2 = new EnhancedSmoke(scene, world, car, {
      x: -0.6, y: -0.8, z: -3.3
        });
        smoke2.setTrailWidth(0.3);
        smoke2.init();

      engineSound = new Sound(car, {
      unit: "kmh", // or "mph"
      maxSpeed: 200, // Speed that corresponds to 100% pitch
      audioFile: "./sounds/lamborghini_sound.mp3", // or File object
      autoPlay: true // Start playing when initialized
    });
      break;
    case 5:
      console.log("Creating Chevrolet_Corvette");
      car = new Chevrolet_Corvette(scene, world, null, carLoc);
      gameInstances.push(car);
      nitro1 = new Nitro(scene, world, car, car, { x: 1, y: -4, z: -18 }); // Offset behind vehicle
      nitro1.setSize(0.2);
      nitro2 = new Nitro(scene, world, car, car, { x: -1, y: -4, z: -18 }); // Offset behind vehicle
      nitro2.setSize(0.2);
      nitro1.init();
      nitro2.init();

      smoke1 = new EnhancedSmoke(scene, world, car, {
      x: 0.3, y: -1.5, z: -2.5
        });
        smoke1.setTrailWidth(0.3);
        smoke1.init();
      smoke2 = new EnhancedSmoke(scene, world, car, {
      x: -0.3, y: -1.5, z: -2.5
        });
        smoke2.setTrailWidth(0.3);
        smoke2.init();

            engineSound = new Sound(car, {
            unit: "kmh", // or "mph"
            maxSpeed: 200, // Speed that corresponds to 100% pitch
            audioFile: "./sounds/corvette_sound.mp3", // or File object
            autoPlay: true // Start playing when initialized
          });
      break;
    case 6:
      console.log("Creating Lamborghini Centenario");
      car = new Lamborghini_Centenario(scene, world, null, carLoc);
      gameInstances.push(car);
      nitro1 = new Nitro(scene, world, car, car, { x: 1, y: -4, z: -18 }); // Offset behind vehicle
      nitro1.setSize(0.2);
      nitro2 = new Nitro(scene, world, car, car, { x: -1, y: -4, z: -18 }); // Offset behind vehicle
      nitro2.setSize(0.2);
      nitro1.init();
      nitro2.init();

      smoke1 = new EnhancedSmoke(scene, world, car, {
      x: 0.2, y: -1.5, z: -2.5
        });
        smoke1.setTrailWidth(0.3);
        smoke1.init();
      smoke2 = new EnhancedSmoke(scene, world, car, {
      x: -0.2, y: -1.5, z: -2.5
        });
        smoke2.setTrailWidth(0.3);
        smoke2.init();

      engineSound = new Sound(car, {
      unit: "kmh", // or "mph"
      maxSpeed: 200, // Speed that corresponds to 100% pitch
      audioFile: "./sounds/lamborghini_sound.mp3", // or File object
      autoPlay: true // Start playing when initialized
    });
      break;
    default:
      console.log("Creating default Ferrari");
      car = new Ferrari(scene, world, null, carLoc); // Default to Ferrari
      gameInstances.push(car);
  }
  car.init();
  // After creating your car
  // Initialize the enhanced system
  // const smokeSystem = new EnhancedSmoke(scene, world, car, {
  //   x: 0.7, // Exhaust offset from vehicle center
  //   y: -1.5, // Height above ground
  //   z: -2.5, // Behind vehicle
  // });
  // smokeSystem.setTrailWidth(0.3);
  // smokeSystem.init();

  const health = new Health(world, scene, car, 100, {
    healthBarWidth : 500,
    healthBarHeight : 20
  }); // 100 HP
  health.init();

let gameTimer;  

    setTimeout(() => {
      gameTimer = new Timer(health);
      gameInstances.push(gameTimer);
    }, 4000);

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
    nitro1,
    nitro2,
    smoke,
    smoke1,
    smoke2,
    canvas,
    ground,
    engineSound,
  );
  // gameInstances.push(square1, square2);

  //-------------Game Boundary ------------------
  
    const gameBoundary = new GameBoundary(scene, world, car, {
    // Boundary dimensions (adjust these based on your track size)
    width: 1600,    // Should be slightly larger than your track width
    depth: 800,     // Should be slightly larger than your track depth
    height: 50,    // Height of invisible walls
    
    // Center the boundary around your track
    position: { x: 0, y: 0, z: 0 }, // Adjust if your track is not centered at origin
    
    // Visual settings
    showVisualBoundary: getDebug(),     // Set to false in production
    boundaryColor: 0xff0000,      // Red boundary lines
    boundaryOpacity: 0.2,         // Semi-transparent
    
    // Physics wall settings
    wallThickness: 15,            // Thickness of invisible walls
    wallHeight: 40,               // Height of invisible walls
    
    // Behavior settings
  forceStrength: 10,    // Instead of 3000
  damping: 1,          // Instead of 0.7
    enableWarning: true,          // Show warning when approaching boundary
    warningDistance: 80,          // Distance to show warning
    
    // Auto-reset settings
    enableAutoReset: true,        // Reset car if it goes too far out
    resetPosition: { x: 452, y: 5, z: 180 }, // Same as your car spawn position
    resetDistance: 60             // Distance beyond boundary to trigger reset
  });
  
  // Initialize the boundary system
  gameBoundary.init();

gameInstances.push(gameBoundary);

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
  const aiPoliceCar1 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: 60 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar1.init();

  const aiPoliceCar2 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: -60 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar2.init();
  const aiPoliceCar3 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: 120 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar3.init();

  const aiPoliceCar4 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: -120 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar4.init();
  const aiPoliceCar5 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: 180 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar5.init();

  const aiPoliceCar6 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: -180 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar6.init();
  const aiPoliceCar7 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: 240 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar7.init();

  const aiPoliceCar8 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: -240 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar8.init();
  const aiPoliceCar9 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: 300 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar9.init();

  const aiPoliceCar10 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: -300 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar10.init();

  const aiPoliceCar11 = new AIInactiveCar(
    scene,
    world,
    car,
    { x: -600, y: 4, z: 0 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );
  aiPoliceCar11.init();

  gameInstances.push(aiPoliceCar1, aiPoliceCar2,aiPoliceCar3,aiPoliceCar4,aiPoliceCar5,aiPoliceCar6,aiPoliceCar7,aiPoliceCar8,aiPoliceCar9,aiPoliceCar10,aiPoliceCar11);


let aiPoliceCars = [
  aiPoliceCar1, aiPoliceCar2, aiPoliceCar3, aiPoliceCar4,
  aiPoliceCar5, aiPoliceCar6, aiPoliceCar7, aiPoliceCar8,
  aiPoliceCar9, aiPoliceCar10, aiPoliceCar11,
];

// const smokeSystems = [];

// for (let i = 0; i < aiPoliceCars.length; i++) {
//   const smoke = new EnhancedSmoke(scene, world, aiPoliceCars[i], {
//     x: 0.7,
//     y: -1.5,
//     z: -2.5,
//   });

//   smoke.setTrailWidth(0.3);
//   smoke.init();

//   smokeSystems.push(smoke); // Save it for later reference
// }

// gameInstances.push(smokeSystems);

  //------------------------- Spikes ------------------------------- (Not fixed)

  // const spike = new Spike(scene, world, { x: -550, y: 0, z: 0 } , getDebug());
  // spike.init();

  //------------------------- AI Police Helicipter --------------------------

  const aiHelicopter = new AIHelicopter(scene, world, car, {
    x: -540,
    y: 150,
    z: 203,
  }, "./sound/helicopter_sound.mp3");
  aiHelicopter.init();
  aiHelicopter.setFollowDistance(15); // Stay 10 units ahead
  aiHelicopter.setFollowHeight(35); // Fly at 18 units height
  aiHelicopter.setRotationSpeed(0.00001); // helicopter moving speed
  aiHelicopter.setShootingDistance(50);

  // Customize timing
  aiHelicopter.setActiveTime(60000); // 20 seconds active 3*60
  aiHelicopter.setBreakTime(8000); // 10 seconds break

  // Monitor status
  // console.log(aiHelicopter.getStateInfo());

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
    { x: -580, y: 1.5, z: -5 },
    {
      modelPath: "./assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI/2, z: 0 },
      showWireframe: getDebug(),
    }
  );

  const block2 = new Assets(
    scene,
    world,
    { x: -580, y: 1.5, z: 5 },
    {
      modelPath: "./assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI/2, z: 0 },
      showWireframe: getDebug(),
    }
  );

  const block3 = new Assets(
    scene,
    world,
    { x: -580, y: 1.5, z: 10 },
    {
      modelPath: "./assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI/2, z: 0 },
      showWireframe: getDebug(),
    }
  );

  const block4 = new Assets(
    scene,
    world,
    { x: -580, y: 1.5, z: -10 },
    {
      modelPath: "./assets/block1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: Math.PI/2, z: 0 },
      showWireframe: getDebug(),
    }
  );

  const cone1 = new Assets(
    scene,
    world,
    { x: -570, y: 1.5, z: 0 },
    {
      modelPath: "./assets/cone1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      showWireframe: getDebug(),
    }
  );

  const cone2 = new Assets(
    scene,
    world,
    { x: -570, y: 1.5, z: -7 },
    {
      modelPath: "./assets/cone2.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      showWireframe: getDebug(),
    }
  );

  const cone3 = new Assets(
    scene,
    world,
    { x: -570, y: 1.5, z: 7 },
    {
      modelPath: "./assets/cone1.glb",
      mass: 10,
      shapeType: "box",
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      showWireframe:getDebug(),
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

 
  //---------------------------------------------


  const minimap = new Minimap({
    mapWidth: 2400,
    mapHeight: 1200,
    minimapWidth: 200,
    minimapHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
});

gameInstances.push(minimap);


  //---------------------------------------------


  const loader = new LoadingComponent();

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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: getAntialias(), alpha: true, powerPreference: "high-performance"});
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
    "./mud_road_puresky_4k.hdr",
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

  setTimeout(() => {
    car.controlsDisabled = false;

  }, 10000); // 3000 milliseconds = 3 seconds

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
      ${
  !isPaused
    ? (() => {
        const totalSeconds = Math.floor(gameTimer.totalTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `<p>You Survived ${minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}</p>`;
      })()
    : ""
}

      <p style="font-size: 24px;">${subtitle}</p>

      ${
        isPaused
          ? `
        <button id="resumeButton" style="
          padding: 10px 20px;
          font-size: 24px;
          background-color: rgba(110, 199, 114, 0.3);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        ">Resume Game</button>
        <br>

        <button id="restartButton" style="
          padding: 10px 20px;
          font-size: 24px;
          background-color: rgba(0, 0, 0, 0.3);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        ">Restart Game</button>
        <br>
      `
          : ""
      }

      <button id="returnToMenu" style="
          padding: 10px 20px;
          font-size: 24px;
          background-color: rgba(184, 95, 95, 0.3);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      ">Main Menu</button>
    </div>
  `;

  document.body.appendChild(gameOverDiv);

  // Resume button
  if (isPaused) {
    document.getElementById("resumeButton").addEventListener("click", () => {
      gameOverDiv.remove();
      car.controlsDisabled = false;
      gamePaused = false;
    });

    // Restart button only exists when paused
    document.getElementById("restartButton").addEventListener("click", () => {
      health.isDestroyed = true;
      if (gameOverDiv && gameOverDiv.parentNode) {
        gameOverDiv.remove();
      }
      cleanupGameInstances();
      loader.showFor(5000)
      setTimeout(() => {
        startGame1();
      }, 5000);
    });
  }

  // Main menu button
  document.getElementById("returnToMenu").addEventListener("click", () => {
    health.isDestroyed = true;
    gameOverDiv.remove();
    stopCurrentAnimation();
    window.removeEventListener("resize", handleResize);
    cleanupGameInstances();
    loader.showFor(5000);
    setTimeout(() => {
      showPlayButton();
    }, 5000);
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
          font-size: 24px;
          background-color: rgba(110, 199, 114, 0.3);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      ">Restart Game</button>
      <button id="returnToMenu" style="
          padding: 10px 20px;
          font-size: 24px;
          background-color: rgba(110, 199, 114, 0.3);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
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
          startGame1();
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

    engineSound.update();

        minimap.scanForCars(world);
    
    // Update the minimap
    minimap.update();
    // Register cars manuall
    



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
// Only call cleanup once per police car

if (elapsed >= 5000) {
  showGameOverScreen(false);
cleanupGameInstances();

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

    // 🔄 Update LODs before rendering
    scene.traverse((child) => {
      if (child instanceof THREE.LOD) {
        child.update(camera);
      }
    });

    renderer.render(scene, camera);
  };

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
        // aiHelicopter.playSound();
        aiPoliceCars.forEach(car => car.playSound());
        engineSound.resume();
        gameTimer.resume();
        // car.stopAllSounds = false;
        gamePaused = false;
      } else {
        // Pause game
        car.controlsDisabled = true;
        engineSound.pause();
        gameTimer.pause();
        aiHelicopter.reset();
        aiPoliceCars.forEach(car => car.pauseSound());
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
