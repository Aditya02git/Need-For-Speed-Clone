import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class LapSystem {
  constructor(
    world,
    scene,
    playerCar,
    aiCars = [],
    checkpointConfig = {},
    referenceBoxes = []
  ) {
    this.world = world;
    this.scene = scene;

    this.playerCar = playerCar;
    this.aiCars = aiCars;
      this.completionOrder = []; // Track order of lap completions

    // Race tracking
    this.playerProgress = {
      currentCheckpointIndex: 0,
      cycleCompletions: 0,
      lapCompleted: false,
      lapTime: 0,
      totalTime: 0,
    };

  this.aiProgress = this.aiCars.map((car, index) => ({
    carIndex: index,
    currentCheckpointIndex: 0,
    cycleCompletions: 0,
    lapCompleted: false,
    lapTime: 0,
    totalTime: 0,
  }));

    this.raceWinner = null;
    this.raceFinished = false;

    // Lap tracking
    this.currentLap = 0;
    this.totalLaps = 0;
    this.lapCompleted = false;

    // Cyclic checkpoint system
    this.checkpointSequence = ["A", "B", "C", "D","E","F","G","H","I","J","K","L","M","N","O","P","R","S","T"]; // Required order
    this.currentCheckpointIndex = 0; // Index of next expected checkpoint
    this.cycleCompletions = 0; // How many complete A->B->C cycles
    this.requiredCycles = 2; // How many complete cycles needed per lap

    // Checkpoint configuration - now expects 3 checkpoints A, B, C
    this.checkpointConfigs = [
      {
        id: "A",
        position: { x: -10, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint A",
        color: 0xff0000, // Red
        ...checkpointConfig.A,
      },
      {
        id: "B",
        position: { x: 0, y: 0, z: 10 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint B",
        color: 0x00ff00, // Green
        ...checkpointConfig.B,
      },
      {
        id: "C",
        position: { x: 10, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint C",
        color: 0x0000ff, // Blue
        ...checkpointConfig.C,
      },
      {
        id: "D",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint D",
        color: 0x0000ff, // Blue
        ...checkpointConfig.D,
      },
      {
        id: "E",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint E",
        color: 0x0000ff, // Blue
        ...checkpointConfig.E,
      },
      {
        id: "F",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint F",
        color: 0x0000ff, // Blue
        ...checkpointConfig.F,
      },
      {
        id: "G",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint G",
        color: 0x0000ff, // Blue
        ...checkpointConfig.G,
      },
      {
        id: "H",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint H",
        color: 0x0000ff, // Blue
        ...checkpointConfig.H,
      },
      {
        id: "I",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint I",
        color: 0x0000ff, // Blue
        ...checkpointConfig.I,
      },
      {
        id: "J",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint J",
        color: 0x0000ff, // Blue
        ...checkpointConfig.J,
      },
      {
        id: "K",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint K",
        color: 0x0000ff, // Blue
        ...checkpointConfig.K,
      },
      {
        id: "L",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint L",
        color: 0x0000ff, // Blue
        ...checkpointConfig.L,
      },
      {
        id: "M",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint M",
        color: 0x0000ff, // Blue
        ...checkpointConfig.M,
      },
      {
        id: "N",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint N",
        color: 0x0000ff, // Blue
        ...checkpointConfig.N,
      },
      {
        id: "O",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint O",
        color: 0x0000ff, // Blue
        ...checkpointConfig.O,
      },
      {
        id: "P",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint P",
        color: 0x0000ff, // Blue
        ...checkpointConfig.P,
      },
      {
        id: "Q",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint Q",
        color: 0x0000ff, // Blue
        ...checkpointConfig.Q,
      },
      {
        id: "R",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint R",
        color: 0x0000ff, // Blue
        ...checkpointConfig.R,
      },
      {
        id: "S",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint S",
        color: 0x0000ff, // Blue
        ...checkpointConfig.S,
      },
      {
        id: "T",
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        name: "Checkpoint T",
        color: 0x0000ff, // Blue
        ...checkpointConfig.T,
      },
    ];

    // Reference boxes configuration (optional additional boxes)
    this.referenceBoxConfigs = referenceBoxes.map((config, index) => ({
      id: `reference_${index}`,
      position: config.position || { x: 20, y: 0, z: 0 },
      rotation: config.rotation || { x: 0, y: 0, z: 0 },
      size: config.size || { x: 2, y: 2, z: 2 },
      name: config.name || `Reference Box ${index + 1}`,
      visible: config.visible !== undefined ? config.visible : false,
      color: config.color || 0xffff00,
      ...config,
    }));

    // Box objects
    this.checkpoints = []; // A, B, C checkpoints
    this.referenceBoxes = [];
    this.allBoxes = [];

    // Visit tracking
    this.visitHistory = []; // Track sequence of visits
    this.invalidVisits = 0; // Count of out-of-order visits

    // UI elements
    this.lapCounter = null;
    this.progressIndicator = null;
    this.statusDisplay = null;
    this.detailsDisplay = null;
    this.sequenceDisplay = null;

    // Callbacks
    this.onLapComplete = null;
    this.onBoxOverlap = null;
    this.onProgressUpdate = null;
    this.onInvalidVisit = null;

    // Debug
    this.showDebugInfo = false;
  }

  init() {
    this.createCheckpoints();
    this.createReferenceBoxes();
    this.createLapUI();
    this.createRaceUI();
    this.setupCollisionDetection();
    this.startUpdateLoop();

    console.log(
      `Lap system initialized with cyclic checkpoints: ${this.checkpointSequence.join(
        " → "
      )}`
    );
    console.log(`Each lap requires ${this.requiredCycles} complete cycles`);
  }

  // Create the three main checkpoints A, B, C
  createCheckpoints() {
    this.checkpointConfigs.forEach((config, index) => {
      const checkpoint = new CheckpointBox(
        this.world,
        this.scene,
        this.playerCar, // Pass playerCar
        this.aiCars, // Pass aiCar
        config.id,
        config.position,
        config.rotation,
        config.size,
        true, // Always visible
        config.color
      );

      checkpoint.init();
      checkpoint.setName(config.name);

      this.checkpoints.push(checkpoint);
      this.allBoxes.push(checkpoint);

      console.log(
        `Checkpoint ${config.id} created at position:`,
        config.position
      );
    });
  }

  // Create reference boxes with configurable visibility
  createReferenceBoxes() {
    this.referenceBoxConfigs.forEach((config, index) => {
      const referenceBox = new CheckpointBox(
        this.world,
        this.scene,
        this.playerCar, // Pass playerCar
        this.aiCars, // Pass aiCar
        config.id,
        config.position,
        config.rotation,
        config.size,
        config.visible,
        config.color
      );

      referenceBox.init();
      referenceBox.setName(config.name);

      this.referenceBoxes.push(referenceBox);
      this.allBoxes.push(referenceBox);

      console.log(
        `Reference box ${index + 1} created at position:`,
        config.position,
        `(visible: ${config.visible})`
      );
    });
  }

  // Create lap UI
  createLapUI() {

    // Status display
    this.statusDisplay = document.createElement("div");
    this.statusDisplay.style.position = "fixed";
    this.statusDisplay.style.top = "10px";
    this.statusDisplay.style.right = "10px";
    this.statusDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.statusDisplay.style.color = "#ffffff";
    this.statusDisplay.style.padding = "8px 12px";
    this.statusDisplay.style.borderRadius = "5px";
    this.statusDisplay.style.fontFamily = "Arial, sans-serif";
    this.statusDisplay.style.fontSize = "12px";
    this.statusDisplay.style.border = "2px solid #0088ff";
    this.statusDisplay.style.zIndex = "10000";
    this.statusDisplay.style.maxWidth = "250px";
    this.statusDisplay.style.wordWrap = "break-word";
    document.body.appendChild(this.statusDisplay);

    this.updateUI();
  }

  // Setup collision detection for all boxes
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

    const { boxBody, otherBody } = this.identifyBodies(bodyA, bodyB);
    if (!boxBody || !otherBody) return;

    const carCheck = this.isValidCar(otherBody);
    if (carCheck.isValid) {
      const boxId = boxBody.userData?.boxId;
      const box = this.findBoxById(boxId);

      if (box) {
        const carType = carCheck.carType;
        const stateKey = `${carType}Inside`;

        if (!box[stateKey]) {
          box[stateKey] = true;
          this.handleBoxVisit(boxId, box, carType);
        }
      }
    }
  }

  // 4. UPDATE handleCollisionExit METHOD - Replace existing method
  handleCollisionExit(event) {
    const { bodyA, bodyB } = this.getCollisionBodies(event);
    if (!bodyA || !bodyB) return;

    const { boxBody, otherBody } = this.identifyBodies(bodyA, bodyB);
    if (!boxBody || !otherBody) return;

    const carCheck = this.isValidCar(otherBody);
    if (carCheck.isValid) {
      const boxId = boxBody.userData?.boxId;
      const box = this.findBoxById(boxId);

      if (box) {
        const carType = carCheck.carType;
        const stateKey = `${carType}Inside`;

        if (box[stateKey]) {
          box[stateKey] = false;
          // console.log(`${carType} car exited ${boxId}`);
        }
      }
    }
  }

  // Add this new method to your LapSystem class
isValidCar(body) {
  // Check for player car
  if (
    this.playerCar &&
    (body === this.playerCar.body || body.userData?.belongsTo === "player")
  ) {
    return { isValid: true, carType: "player" };
  }

  // Check for AI cars
  for (let i = 0; i < this.aiCars.length; i++) {
    const aiCar = this.aiCars[i];
    if (
      aiCar &&
      (body === aiCar.body ||
        body.userData?.car === `aiCar${i}` ||
        body.userData?.type === `aicar${i}`)
    ) {
      return { isValid: true, carType: `aicar${i}` };
    }
  }

  return { isValid: false, carType: null };
}
  // Handle box visit with cyclic validation
  handleBoxVisit(boxId, box, carType) {
    const isCheckpoint = this.checkpointSequence.includes(boxId);

    if (isCheckpoint) {
      this.handleCheckpointVisit(boxId, box, carType);
    } else {
      this.handleReferenceBoxVisit(boxId, box, carType);
    }
  }

handleCheckpointVisit(checkpointId, box, carType) {
  if (this.raceFinished) return;

  let progress;
  
  if (carType === "player") {
    progress = this.playerProgress;
  } else if (carType.startsWith("aicar")) {
    const aiIndex = parseInt(carType.replace("aicar", ""));
    progress = this.aiProgress[aiIndex];
  }

  if (!progress) return;

  const expectedCheckpoint = this.checkpointSequence[progress.currentCheckpointIndex];

  if (checkpointId === expectedCheckpoint) {
    // console.log(`${carType} - Valid checkpoint: ${checkpointId}`);

    progress.currentCheckpointIndex =
      (progress.currentCheckpointIndex + 1) % this.checkpointSequence.length;

    if (progress.currentCheckpointIndex === 0) {
      progress.cycleCompletions++;

      // Check if lap is completed
      if (
        progress.cycleCompletions >= this.requiredCycles &&
        checkpointId === this.checkpointSequence[this.checkpointSequence.length - 1] && // Last checkpoint (D)
        !progress.lapCompleted
      ) {
        progress.lapCompleted = true;
        progress.lapTime = Date.now() - (this.lapStartTime || Date.now());
        
        // Record completion order for ranking
        if (!this.completionOrder) {
          this.completionOrder = [];
        }
        this.completionOrder.push({
          carType: carType,
          completionTime: Date.now(),
          lapTime: progress.lapTime
        });
        
        console.log(`${carType.toUpperCase()} COMPLETED THE LAP! (Position: ${this.completionOrder.length})`);
        
        // ONLY set raceFinished to true when PLAYER completes the lap
        if (carType === "player") {
          this.raceFinished = true;
          this.raceWinner = "player";
          console.log("PLAYER WINS THE RACE! Race is now finished.");
        }
        
        this.showLapCompletion(carType);
      }
    }

    box.setValidVisit(true);
  } else {
    // console.log(
    //   `${carType} - Invalid checkpoint: ${checkpointId} (expected: ${expectedCheckpoint})`
    // );
    box.setValidVisit(false);
  }

  this.updateUI();
}
  // Handle reference box visit (non-cyclic)
  handleReferenceBoxVisit(boxId, box) {
    // console.log(`Reference box visited: ${boxId}`);

    // Reference boxes don't affect lap completion but can be tracked
    this.visitHistory.push({
      id: boxId,
      timestamp: Date.now(),
      valid: true,
      type: "reference",
    });

    // Visual feedback
    box.setValidVisit(true);

    // Call callbacks
    if (this.onBoxOverlap) {
      this.onBoxOverlap(boxId, box, 1, 1);
    }
  }

  // Update checkpoint visual states based on current progress
  updateCheckpointStates() {
    this.checkpoints.forEach((checkpoint, index) => {
      const checkpointId = checkpoint.getId();
      const isNext = index === this.currentCheckpointIndex;
      const isCompleted =
        this.hasCompletedCheckpointInCurrentCycle(checkpointId);

      checkpoint.setAsNext(isNext);
      checkpoint.setCompleted(isCompleted);
    });
  }

  // Check if a checkpoint has been completed in the current cycle
  hasCompletedCheckpointInCurrentCycle(checkpointId) {
    const currentCycleStart = this.cycleCompletions * 3;
    const validVisitsInCurrentCycle = this.visitHistory
      .slice(currentCycleStart)
      .filter((visit) => visit.valid && visit.id === checkpointId);

    return validVisitsInCurrentCycle.length > 0;
  }

  // Complete a lap
  completeLap() {
    if (this.lapCompleted) return;

    this.lapCompleted = true;
    this.currentLap++;
    this.totalLaps++;

    // Record lap time
    if (this.lapStartTime) {
      const lapTime = Date.now() - this.lapStartTime;
      this.lapTimes = this.lapTimes || [];
      this.lapTimes.push(lapTime);
      console.log(
        `Lap ${this.currentLap} completed in ${this.formatTime(lapTime)}!`
      );
    } else {
      console.log(`Lap ${this.currentLap} completed!`);
    }

    console.log(
      `Cycles completed: ${this.cycleCompletions}/${this.requiredCycles}`
    );
    console.log(`Invalid visits: ${this.invalidVisits}`);

    // Check if race is complete
    if (this.isRaceComplete()) {
      this.completeRace();
      return;
    }

    // Show completion effect
    this.showLapCompletionEffect();

    // Call lap completion callback
    if (this.onLapComplete) {
      this.onLapComplete(this.currentLap, this.getProgress());
    }

    // Reset for next lap
    setTimeout(() => {
      this.resetLap();
    }, 2000);
  }

  // Complete the entire race
  completeRace() {
    console.log(`RACE COMPLETE! Finished ${this.currentLap} laps!`);

    if (this.lapTimes && this.lapTimes.length > 0) {
      const totalTime = this.getTotalTime();
      const averageLapTime =
        this.lapTimes.reduce((sum, time) => sum + time, 0) /
        this.lapTimes.length;
      const bestLapTime = Math.min(...this.lapTimes);

      console.log(`Total time: ${this.formatTime(totalTime)}`);
      console.log(`Average lap time: ${this.formatTime(averageLapTime)}`);
      console.log(`Best lap time: ${this.formatTime(bestLapTime)}`);
    }

    // Show race completion effect
    this.showRaceCompletionEffect();

    // Call race completion callback
    // if (this.onRaceComplete) {
    //   this.onRaceComplete(this.currentLap, this.lapTimes || []);
    // }
  }

  // Show race completion effect
  showRaceCompletionEffect() {
    // Flash all boxes multiple times
    this.allBoxes.forEach((box) => {
      if (box.showCompletionEffect) {
        box.showCompletionEffect();
      }
    });

    // Update UI with race completion message
    if (this.statusDisplay) {
      this.statusDisplay.textContent = `RACE COMPLETE! ${this.currentLap} LAPS FINISHED!`;
      this.statusDisplay.style.color = "#ffd700";
      this.statusDisplay.style.borderColor = "#ffd700";
      this.statusDisplay.style.fontSize = "14px";
      this.statusDisplay.style.fontWeight = "bold";
    }

    // Show final statistics
    if (this.detailsDisplay) {
      let statsText = `FINAL RESULTS:\n`;
      statsText += `Laps: ${this.currentLap}/${
        this.targetLaps || this.currentLap
      }\n`;
      statsText += `Invalid Visits: ${this.invalidVisits}\n`;

      if (this.lapTimes && this.lapTimes.length > 0) {
        const totalTime = this.getTotalTime();
        const averageLapTime =
          this.lapTimes.reduce((sum, time) => sum + time, 0) /
          this.lapTimes.length;
        const bestLapTime = Math.min(...this.lapTimes);

        statsText += `Total: ${this.formatTime(totalTime)}\n`;
        statsText += `Average: ${this.formatTime(averageLapTime)}\n`;
        statsText += `Best: ${this.formatTime(bestLapTime)}`;
      }

      this.detailsDisplay.textContent = statsText;
      this.detailsDisplay.style.color = "#ffd700";
      this.detailsDisplay.style.borderColor = "#ffd700";
    }
  }

  // Reset lap progress
  resetLap() {
    this.lapCompleted = false;
    this.currentCheckpointIndex = 0;
    this.cycleCompletions = 0;
    this.visitHistory = [];
    this.invalidVisits = 0;

    // Reset visual states
    this.allBoxes.forEach((box) => {
      box.reset();
    });

    this.updateCheckpointStates();

    // Start timer for next lap
    if (!this.isRaceComplete()) {
      this.lapStartTime = Date.now();
      console.log("Lap reset - ready for next lap");
    }

    this.updateUI();
  }

  // Show lap completion effect
  showLapCompletionEffect() {
    // Flash all boxes
    this.allBoxes.forEach((box) => {
      if (box.showCompletionEffect) {
        box.showCompletionEffect();
      }
    });

    // Update UI with completion message
    if (this.statusDisplay) {
      this.statusDisplay.textContent = `LAP ${this.currentLap} COMPLETE!`;
      this.statusDisplay.style.color = "#ffd700";
      this.statusDisplay.style.borderColor = "#ffd700";

      setTimeout(() => {
        this.statusDisplay.style.color = "#ffffff";
        this.statusDisplay.style.borderColor = "#0088ff";
      }, 2000);
    }
  }

  // 7. ADD NEW completeLap METHOD - Add this new method
// Complete a lap - only for player
completeLap(carType) {
  // This method is now called from handleCheckpointVisit
  // Most logic moved there for better organization
  if (this.raceFinished) return;

  // Set race winner if this is the first completion
  if (!this.raceWinner) {
    this.raceWinner = carType;
    this.raceFinished = true;
    console.log(`${carType.toUpperCase()} WINS THE RACE!`);
  }

  this.updateUI();
}

showLapCompletion(carType) {
  const completionPosition = this.completionOrder.length;
  const isPlayer = carType === "player";
  
  // Calculate player's ranking
  const playerRanking = this.getPlayerRanking();
  
  // Show completion effects
  this.allBoxes.forEach((box) => {
    if (box.showCompletionEffect) {
      box.showCompletionEffect();
    }
  });

  // Update race status display
  if (this.raceStatusDisplay) {
    if (isPlayer) {
      this.raceStatusDisplay.innerHTML = `
        <div style="font-size: 18px; font-weight: bold; color: #ffd700;">
           LAPS COMPLETED!
        </div>
        <div style="font-size: 12px; margin-top: 4px;">
          ${this.completionOrder.length} cars finished
        </div>
      `;
    } else {
      // Show when AI car completes
      this.raceStatusDisplay.innerHTML = `
        <div style="font-size: 16px; font-weight: bold; color: #ff8800;">
          ${carType.toUpperCase()} COMPLETED LAP!
        </div>
        <div style="font-size: 14px; margin-top: 8px;">
          Position: ${completionPosition}/${this.getTotalCars()}
        </div>
        <div style="font-size: 12px; margin-top: 4px;">
          Player Ranking: ${playerRanking}/${this.getTotalCars()}
        </div>
      `;
    }
    this.raceStatusDisplay.style.borderColor = isPlayer ? "#ffd700" : "#ff8800";
  }

  // Update detailed ranking in status display
  if (this.statusDisplay) {
    this.updateRankingDisplay();
  }
}

// 4. NEW method to get player's current ranking
getPlayerRanking() {
  const playerCompleted = this.playerProgress.lapCompleted;
  
  if (playerCompleted) {
    // Player completed - find their position in completion order
    const playerCompletionIndex = this.completionOrder.findIndex(
      entry => entry.carType === "player"
    );
    return playerCompletionIndex + 1; // 1-based ranking
  } else {
    // Player hasn't completed - count how many have completed + 1
    const completedCount = this.completionOrder.length;
    return completedCount + 1;
  }
}

// 5. NEW method to get total number of cars
getTotalCars() {
  return 1 + this.aiCars.length; // 1 player + AI cars
}

// 6. NEW method to update ranking display
updateRankingDisplay() {
  if (!this.statusDisplay) return;

  let rankingText = "CURRENT RANKING:\n";
  
  // Show completed cars first
  this.completionOrder.forEach((entry, index) => {
    const rank = index + 1;
    const displayName = entry.carType === "player" ? "PLAYER" : entry.carType.toUpperCase();
    const lapTime = this.formatTime(entry.lapTime);
    
    rankingText += `${rank}. ${displayName} ✓ (${lapTime})`;
    if (entry.carType === "player") rankingText += " ";
    rankingText += "\n";
  });
  
  // Show remaining cars (not completed)
  const allCars = ["player", ...this.aiCars.map((_, i) => `aicar${i}`)];
  const remainingCars = allCars.filter(carType => 
    !this.completionOrder.some(entry => entry.carType === carType)
  );
  
  remainingCars.forEach(carType => {
    const rank = this.completionOrder.length + 1;
    const displayName = carType === "player" ? "PLAYER" : carType.toUpperCase();
    let progress;
    
    if (carType === "player") {
      progress = this.playerProgress;
    } else {
      const aiIndex = parseInt(carType.replace("aicar", ""));
      progress = this.aiProgress[aiIndex];
    }
    
    const cycles = progress.cycleCompletions;
    const nextCheckpoint = this.checkpointSequence[progress.currentCheckpointIndex];
    
    rankingText += `${rank}. ${displayName}: ${cycles}/${this.requiredCycles} cycles → ${nextCheckpoint}`;
    if (carType === "player") rankingText += "";
    rankingText += "\n";
  });
  
  this.statusDisplay.innerHTML = rankingText.replace(/\n/g, '<br>');
  this.statusDisplay.style.color = "#ffffff";
  this.statusDisplay.style.borderColor = "#0088ff";
}

// Show player lap completion with ranking
showPlayerLapCompletion() {
  // Calculate final ranking based on progress
  const allProgress = [
    { type: "PLAYER", progress: this.playerProgress },
    ...this.aiProgress.map((prog, index) => ({
      type: `AI${index + 1}`,
      progress: prog
    }))
  ];

  // Sort by cycle completions and current checkpoint index
  allProgress.sort((a, b) => {
    if (a.progress.cycleCompletions !== b.progress.cycleCompletions) {
      return b.progress.cycleCompletions - a.progress.cycleCompletions;
    }
    return b.progress.currentCheckpointIndex - a.progress.currentCheckpointIndex;
  });

  // Find player ranking
  const playerRank = allProgress.findIndex(entry => entry.type === "PLAYER") + 1;

  // Show completion effects
  this.allBoxes.forEach((box) => {
    if (box.showCompletionEffect) {
      box.showCompletionEffect();
    }
  });

  // Update race status display with final ranking
  if (this.raceStatusDisplay) {
    this.raceStatusDisplay.innerHTML = `
      <div style="font-size: 18px; font-weight: bold; color: #ffd700;">
       PLAYER COMPLETED LAP!
      </div>
      <div style="font-size: 14px; margin-top: 8px;">
        Player Ranking: ${playerRank}/${allProgress.length}
      </div>
    `;
    this.raceStatusDisplay.style.borderColor = "#ffd700";
  }

  // Show detailed ranking in status display
  if (this.statusDisplay) {
    let rankingText = "FINAL RANKING:\n";
    allProgress.forEach((entry, index) => {
      const rank = index + 1;
      const cycles = entry.progress.cycleCompletions;
      const nextCheckpoint = this.checkpointSequence[entry.progress.currentCheckpointIndex];
      const isPlayer = entry.type === "PLAYER";
      
      rankingText += `${rank}. ${entry.type}: ${cycles}/${this.requiredCycles} cycles → ${nextCheckpoint}`;
      if (isPlayer) rankingText += "";
      rankingText += "\n";
    });
    
    this.statusDisplay.innerHTML = rankingText.replace(/\n/g, '<br>');
    this.statusDisplay.style.color = "#ffd700";
    this.statusDisplay.style.borderColor = "#ffd700";
  }

  console.log(`Player finished in position ${playerRank} out of ${allProgress.length}`);
}

  // 8. ADD NEW showRaceWinner METHOD - Add this new method
  showRaceWinner() {
    this.allBoxes.forEach((box) => {
      if (box.showCompletionEffect) {
        box.showCompletionEffect();
      }
    });
  }

  // 9. ADD NEW createRaceUI METHOD - Add this new method (call it in init() after createLapUI())
  createRaceUI() {
    // Race status display
    this.raceStatusDisplay = document.createElement("div");
    this.raceStatusDisplay.style.position = "fixed";
    this.raceStatusDisplay.style.top = "20px";
    this.raceStatusDisplay.style.left = "20px";
    this.raceStatusDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.raceStatusDisplay.style.color = "#ffffff";
    this.raceStatusDisplay.style.padding = "12px 16px";
    this.raceStatusDisplay.style.borderRadius = "5px";
    this.raceStatusDisplay.style.fontFamily = "Arial, sans-serif";
    this.raceStatusDisplay.style.fontSize = "16px";
    this.raceStatusDisplay.style.border = "2px solid #00ff00";
    this.raceStatusDisplay.style.zIndex = "10000";
    this.raceStatusDisplay.style.textAlign = "center";
    this.raceStatusDisplay.style.minWidth = "200px";
    document.body.appendChild(this.raceStatusDisplay);
  }

  // Update UI displays
// Update UI displays - focus on player
updateUI() {
  const playerRanking = this.getPlayerRanking();
  
  // Update race status - focus on player progress
  if (this.raceStatusDisplay && !this.raceFinished) {
    const playerCycles = this.playerProgress.cycleCompletions;
    const playerNext = this.checkpointSequence[this.playerProgress.currentCheckpointIndex];
    
    
    let statusHTML = `<div>Laps: ${playerCycles}/${this.requiredCycles}</div>`;
    
    
    // Show current ranking
    // statusHTML += `<div style="margin-top: 4px; color: #ffff00;">Rank: ${playerRanking}/${this.getTotalCars()}</div>`;
    
    // Show completed cars count
    if (this.completionOrder && this.completionOrder.length > 0) {
      statusHTML += `<div style="font-size: 12px; margin-top: 2px;">${this.completionOrder.length} cars finished</div>`;
    }

    this.raceStatusDisplay.innerHTML = statusHTML;
  }

  // Update sequence display - player focused
  if (this.sequenceDisplay) {
    const playerNext = this.checkpointSequence[this.playerProgress.currentCheckpointIndex];
    const playerCurrent = this.playerProgress.currentCheckpointIndex;
    
    let sequenceHTML = `<div style="font-weight: bold;">NEXT CHECKPOINT</div>`;
    sequenceHTML += `<div style="font-size: 18px; color: #ffff00;">${playerNext}</div>`;
    sequenceHTML += `<div style="font-size: 12px;">(${playerCurrent + 1}/${this.checkpointSequence.length})</div>`;
    
    this.sequenceDisplay.innerHTML = sequenceHTML;
  }
  
  // Update detailed ranking
  if (this.statusDisplay) {
    this.updateRankingDisplay();
  }
}
  // Helper methods
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
      return { bodyA: null, bodyB: null };
    }

    return { bodyA, bodyB };
  }

  identifyBodies(bodyA, bodyB) {
    let boxBody = null;
    let otherBody = null;

    if (bodyA?.userData?.type === "lapBox") {
      boxBody = bodyA;
      otherBody = bodyB;
    } else if (bodyB?.userData?.type === "lapBox") {
      boxBody = bodyB;
      otherBody = bodyA;
    }

    return { boxBody, otherBody };
  }

  findBoxById(boxId) {
    return this.allBoxes.find((box) => box.getId() === boxId);
  }

  // Update loop
  startUpdateLoop() {
    const update = () => {
      this.allBoxes.forEach((box) => {
        if (box.update) {
          box.update();
        }
      });
      requestAnimationFrame(update);
    };
    update();
  }

  // Public methods
  getCurrentLap() {
    return this.currentLap;
  }

  getTotalLaps() {
    return this.totalLaps;
  }

  getProgress() {
    return {
      currentCheckpointIndex: this.currentCheckpointIndex,
      nextCheckpoint: this.checkpointSequence[this.currentCheckpointIndex],
      cycleCompletions: this.cycleCompletions,
      requiredCycles: this.requiredCycles,
      progressPercent: (this.cycleCompletions / this.requiredCycles) * 100,
      visitHistory: [...this.visitHistory],
      invalidVisits: this.invalidVisits,
      checkpointSequence: [...this.checkpointSequence],
    };
  }

  getVisitHistory() {
    return [...this.visitHistory];
  }

  getInvalidVisits() {
    return this.invalidVisits;
  }

  setRequiredCycles(cycles) {
    this.requiredCycles = cycles;
    console.log(`Required cycles per lap set to: ${cycles}`);
    this.updateUI();
  }

  getRequiredCycles() {
    return this.requiredCycles;
  }

  // Advanced features
  setTargetLaps(targetLaps) {
    this.targetLaps = targetLaps;
    console.log(`Target laps set to: ${targetLaps}`);
    this.updateUI();
  }

  getTargetLaps() {
    return this.targetLaps || 0;
  }

  isRaceComplete() {
    return this.targetLaps && this.currentLap >= this.targetLaps;
  }

  // Get detailed statistics
  getStatistics() {
    return {
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      targetLaps: this.targetLaps || 0,
      cycleCompletions: this.cycleCompletions,
      requiredCycles: this.requiredCycles,
      progressPercent: (this.cycleCompletions / this.requiredCycles) * 100,
      visitHistory: [...this.visitHistory],
      invalidVisits: this.invalidVisits,
      checkpointSequence: [...this.checkpointSequence],
      currentCheckpointIndex: this.currentCheckpointIndex,
      nextCheckpoint: this.checkpointSequence[this.currentCheckpointIndex],
      raceComplete: this.isRaceComplete(),
      lapComplete: this.cycleCompletions >= this.requiredCycles,
    };
  }

  // Time tracking
  startTimer() {
    this.startTime = Date.now();
    this.lapStartTime = Date.now();
    this.lapTimes = [];
  }

  getLapTime() {
    if (!this.lapStartTime) return 0;
    return Date.now() - this.lapStartTime;
  }

  getTotalTime() {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms
      .toString()
      .padStart(2, "0")}`;
  }

  getCompletionStats() {
  return {
    completionOrder: [...this.completionOrder],
    playerRanking: this.getPlayerRanking(),
    totalCars: this.getTotalCars(),
    completedCars: this.completionOrder.length,
    remainingCars: this.getTotalCars() - this.completionOrder.length,
    raceFinished: this.raceFinished,
    raceWinner: this.raceWinner
  };
}

  // Cleanup
// Cleanup
cleanup() {
  // Remove UI elements
  if (this.lapCounter) {
    document.body.removeChild(this.lapCounter);
    this.lapCounter = null;
  }
  if (this.progressIndicator) {
    document.body.removeChild(this.progressIndicator);
    this.progressIndicator = null;
  }
  if (this.statusDisplay) {
    document.body.removeChild(this.statusDisplay);
    this.statusDisplay = null;
  }
  if (this.detailsDisplay) {
    document.body.removeChild(this.detailsDisplay);
    this.detailsDisplay = null;
  }
  if (this.sequenceDisplay) {
    document.body.removeChild(this.sequenceDisplay);
    this.sequenceDisplay = null;
  }
  // ADD THIS BLOCK - Fix for raceStatusDisplay cleanup
  if (this.raceStatusDisplay) {
    document.body.removeChild(this.raceStatusDisplay);
    this.raceStatusDisplay = null;
  }

  // Cleanup boxes
  this.allBoxes.forEach((box) => {
    if (box.cleanup) {
      box.cleanup();
    }
  });

  // Clear arrays
  this.checkpoints = [];
  this.referenceBoxes = [];
  this.allBoxes = [];
  this.visitHistory = [];
}

  // Reset entire system
  reset() {
    this.currentLap = 0;
    this.totalLaps = 0;
    this.lapCompleted = false;
    this.currentCheckpointIndex = 0;
    this.cycleCompletions = 0;
    this.visitHistory = [];
    this.invalidVisits = 0;
    this.lapTimes = [];
    this.startTime = null;
    this.lapStartTime = null;

    // Reset all boxes
    this.allBoxes.forEach((box) => {
      box.reset();
    });

    this.updateCheckpointStates();
    this.updateUI();

    console.log("Lap system reset");
  }

  // Enable/disable debug info
  setDebugMode(enabled) {
    this.showDebugInfo = enabled;
    console.log(`Debug mode ${enabled ? "enabled" : "disabled"}`);
  }

  // Get debug information
  getDebugInfo() {
    return {
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      lapCompleted: this.lapCompleted,
      currentCheckpointIndex: this.currentCheckpointIndex,
      cycleCompletions: this.cycleCompletions,
      requiredCycles: this.requiredCycles,
      visitHistory: this.visitHistory,
      invalidVisits: this.invalidVisits,
      checkpointSequence: this.checkpointSequence,
      nextCheckpoint: this.checkpointSequence[this.currentCheckpointIndex],
      allBoxes: this.allBoxes.map((box) => ({
        id: box.getId(),
        name: box.getName(),
        isPlayerInside: box.isPlayerInside,
        position: box.getPosition(),
      })),
    };
  }
}

// CheckpointBox class for individual checkpoint/reference boxes
class CheckpointBox {
  constructor(
    world,
    scene,
    playerCar,
    aiCars = [],
    id,
    position,
    rotation,
    size,
    visible = false,
    color = 0x00ff00
  ) {
    this.world = world;
    this.scene = scene;
    this.playerCar = playerCar; // Store playerCar
    this.aiCars = aiCars; // Store aiCar
    this.id = id;
    this.position = position;
    this.rotation = rotation;
    this.size = size;
    this.visible = visible;
    this.color = color;
    this.name = `${id}`;

    // State
    this.playerInside = false;
    this.aiInside = false;
    this.isNext = false;
    this.isCompleted = false;
    this.lastValidVisit = false;

    // Three.js objects
    this.mesh = null;
    this.body = null;
    this.originalColor = color;
    this.material = null;

    // Visual effects
    this.pulseIntensity = 0;
    this.pulseSpeed = 0.05;
    this.flashTimer = 0;
    this.isFlashing = false;

    // Animation
    this.rotationSpeed = 0.01;
    this.bobSpeed = 0.02;
    this.bobAmplitude = 0.1;
    this.time = 0;
    this.originalY = position.y;

        this.playerInside = false;
    this.aiInside = this.aiCars.map(() => false); 
  }

  init() {
    this.createMesh();
    this.createPhysicsBody();
    console.log(
      `CheckpointBox ${this.id} initialized at position:`,
      this.position
    );
  }

createMesh() {
  // Remove box mesh creation but keep text labels
  this.mesh = null; // No mesh created
  this.material = null; // No material created
  this.wireframe = null; // No wireframe created
  
  // Create text label - KEEP THIS
  this.createTextLabel();
  
  console.log(`CheckpointBox ${this.id} created (label only) at position:`, this.position);
}

createTextLabel() {
  // Create high-res canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 2048;
  canvas.height = 1024;

  // Clear and draw text with transparent background
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'white';
  context.font = 'bold 1000px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(this.name, canvas.width / 2, canvas.height / 2);

  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Create sprite material
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: this.visible ? 1.0 : 0.8,
    depthTest: false,
    depthWrite: false
  });

  // Create sprite
  this.textLabel = new THREE.Sprite(spriteMaterial);
  this.textLabel.position.set(
    this.position.x,
    this.position.y + this.size.y / 2 + 1,
    this.position.z
  );

  // Make it visually bigger (adjust scale as needed)
  this.textLabel.scale.set(8, 4, 1); // Wider and taller

  // Add to scene
  this.scene.add(this.textLabel);
}


  createPhysicsBody() {
    // Create physics body as a trigger (sensor)
    const shape = new CANNON.Box(
      new CANNON.Vec3(this.size.x / 2, this.size.y / 2, this.size.z / 2)
    );
    this.body = new CANNON.Body({
      mass: 0, // Static body
      shape: shape,
      position: new CANNON.Vec3(
        this.position.x,
        this.position.y,
        this.position.z
      ),
      isTrigger: true, // Make it a trigger/sensor
    });

    // Set user data for identification
    this.body.userData = {
      type: "lapBox",
      boxId: this.id,
      belongsTo: "lapSystem",
    };

    // Add to world
    this.world.addBody(this.body);
  }

update() {
  this.time += 0.016;
  
  // Keep label animations if text label exists
  if (this.textLabel) {
    // Floating animation
    const bobOffset = Math.sin(this.time * this.bobSpeed) * this.bobAmplitude;
    this.textLabel.position.y = this.originalY + this.size.y / 2 + 1 + bobOffset;
    
    // Gentle rotation
    this.textLabel.rotation.y += this.rotationSpeed;
    
    // Pulse effect based on state
    if (this.isNext) {
      this.pulseIntensity = (Math.sin(this.time * 0.1) + 1) * 0.5;
      this.textLabel.material.opacity = 0.7 + this.pulseIntensity * 0.3;
    }
    
    // Flash effect
    if (this.isFlashing && this.flashTimer > 0) {
      this.flashTimer--;
      const flashIntensity = (this.flashTimer % 10) < 5 ? 1.0 : 0.3;
      this.textLabel.material.opacity = flashIntensity;
      
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
        this.textLabel.material.opacity = this.visible ? 1.0 : 0.7;
      }
    }
  }
}

  updateAnimations() {
    if (!this.mesh) return;

    // Rotation animation
    // this.mesh.rotation.y += this.rotationSpeed;
    this.labelMesh.rotation.y += this.rotationSpeed;
    // if (this.wireframe) {
    //   this.wireframe.rotation.y += this.rotationSpeed;
    // }

    // Bobbing animation
    const bobOffset = Math.sin(this.time * this.bobSpeed) * this.bobAmplitude;
    this.mesh.position.y = this.originalY + bobOffset;
    if (this.wireframe) {
      this.wireframe.position.y = this.originalY + bobOffset;
    }
    if (this.labelMesh) {
      this.labelMesh.position.y =
        this.originalY + this.size.y / 2 + 0.5 + bobOffset;
    }

    // Update physics body position
    if (this.body) {
      this.body.position.set(
        this.mesh.position.x,
        this.mesh.position.y,
        this.mesh.position.z
      );
    }
  }

  updateVisualEffects() {
    if (!this.material) return;

    // Note: Visual effects now only affect the label since the mesh is hidden
    // The mesh effects are kept for state tracking but won't be visible

    // Pulse effect for next checkpoint - Apply to label
    if (this.isNext && this.labelMesh) {
      this.pulseIntensity = Math.sin(this.time * this.pulseSpeed) * 0.3 + 0.7;
      this.labelMesh.material.opacity = this.visible ? this.pulseIntensity : 0.0;
    }

    // Flash effect - Keep for state but not visible on mesh
    if (this.isFlashing) {
      this.flashTimer += 0.1;
      const flashIntensity = Math.sin(this.flashTimer * 10) * 0.5 + 0.5;
      // Apply flash to label color instead of mesh
      if (this.labelMesh) {
        this.labelMesh.material.opacity = this.visible ? flashIntensity : 0.0;
      }

      if (this.flashTimer > Math.PI * 4) {
        // Flash for 4 cycles
        this.isFlashing = false;
        this.flashTimer = 0;
        if (this.labelMesh) {
          this.labelMesh.material.opacity = this.visible ? 1.0 : 0.0;
        }
      }
    }

    // Inside effect - Apply subtle glow to label
    if ((this.playerInside || this.aiInside) && this.labelMesh && !this.isFlashing) {
      // Could add a subtle glow or color change to the label here if desired
    }
  }

  forceShowAllBoxes() {
    this.allBoxes.forEach((box) => {
      // Only show labels, not the actual box meshes
      if (box.labelMesh && box.labelMesh.material) {
        box.labelMesh.material.opacity = 1.0;
        box.labelMesh.material.visible = true;
      }
    });
    console.log(`Forced visibility for ${this.allBoxes.length} box labels`);
  }

setAsNext(isNext) {
  this.isNext = isNext;
  
  // Keep label visual changes
  if (this.textLabel) {
    if (isNext) {
      this.textLabel.material.color.setHex(0xffff00); // Yellow for next
      this.textLabel.scale.set(1.2, 1.2, 1.2); // Slightly larger
    } else {
      this.textLabel.material.color.setHex(0xffffff); // White
      this.textLabel.scale.set(1.0, 1.0, 1.0); // Normal size
    }
  }
}

setCompleted(completed) {
  this.isCompleted = completed;
  
  // Keep label visual changes
  if (this.textLabel) {
    if (completed) {
      this.textLabel.material.color.setHex(0x00ff00); // Green for completed
      this.textLabel.material.opacity = 0.6; // Slightly transparent
    } else {
      this.textLabel.material.color.setHex(0xffffff); // White
      this.textLabel.material.opacity = this.visible ? 1.0 : 0.7;
    }
  }
}

setValidVisit(valid) {
  this.lastValidVisit = valid;
  
  // Keep label color changes
  if (this.textLabel) {
    if (valid) {
      this.textLabel.material.color.setHex(0x00ff00); // Green for valid
    } else {
      this.textLabel.material.color.setHex(0xff0000); // Red for invalid
    }
    
    // Reset to original color after delay
    setTimeout(() => {
      if (this.textLabel) {
        this.textLabel.material.color.setHex(0xffffff); // White
      }
    }, 1000);
  }
  
  console.log(`${this.id} visit: ${valid ? 'valid' : 'invalid'}`);
}

showCompletionEffect() {
  // Keep label flashing effects
  if (this.textLabel) {
    this.isFlashing = true;
    this.flashTimer = 60; // Flash for 1 second at 60fps
    this.textLabel.material.color.setHex(0xffd700); // Gold color for completion
  }
  
  console.log(`${this.id} completion effect triggered`);
}

reset() {
  this.playerInside = false;
  this.aiInside = this.aiCars.map(() => false);
  this.isNext = false;
  this.isCompleted = false;
  this.lastValidVisit = false;
  this.isFlashing = false;
  this.flashTimer = 0;
  this.pulseIntensity = 0;
  this.time = 0;
  
  // Reset label visuals
  if (this.textLabel) {
    this.textLabel.material.color.setHex(0xffffff); // White
    this.textLabel.material.opacity = this.visible ? 1.0 : 0.7;
    this.textLabel.scale.set(1.0, 1.0, 1.0); // Normal size
    this.textLabel.rotation.y = 0; // Reset rotation
    this.textLabel.position.y = this.originalY + this.size.y / 2 + 1; // Reset position
  }
}

  // Getters
getId() {
  return this.id;
}

getName() {
  return this.name;
}

getPosition() {
  return { ...this.position };
}

  getSize() {
    return { ...this.size };
  }

  // Setters
setName(name) {
  this.name = name;
}

  setVisible(visible) {
    this.visible = visible;
    // Only label visibility changes
    if (this.labelMesh) {
      this.labelMesh.material.opacity = visible ? 1.0 : 0.0;
    }
  }

  setColor(color) {
    this.originalColor = color;
    this.color = color;
    // Color changes don't affect the hidden mesh, but we keep this for consistency
    if (this.material) {
      this.material.color.setHex(color);
    }
    if (this.wireframe) {
      this.wireframe.material.color.setHex(color);
    }
  }

cleanup() {
  // Remove label from scene
  if (this.textLabel) {
    this.scene.remove(this.textLabel);
    this.textLabel = null;
  }
  
  // Keep physics body cleanup
  if (this.body) {
    this.world.removeBody(this.body);
    this.body = null;
  }
  
  console.log(`CheckpointBox ${this.id} cleaned up`);
}
}