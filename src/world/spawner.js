// Import both AI car types
import AICar from "./policeaicar.js"; 

// Updated implementation with correct timing sequence
class SpeedCarSpawner {
  constructor(scene, world, car) {
    this.scene = scene;
    this.world = world;
    this.car = car;
    
    // Core properties
    this.speedThreshold = 180;
    this.thresholdReached = false;
    this.startTime = null;
    
    // Car spawning states
    this.immediateCarSpawned = false;    // Car spawned immediately when speed hits 180
    this.firstCarSpawned = false;        // Car spawned after 60 seconds
    this.secondCarSpawned = false;       // Car spawned after 180 seconds (60+120)
    
    // Speed tracking
    this.previousPosition = null;
    this.previousTime = null;
    this.currentSpeed = 0;
    
    console.log("🚀 SpeedCarSpawner ready. Waiting for speed >= 180");
  }

  // Simple speed calculation
  calculateSpeed() {
    if (!this.car?.chassisBody?.position) {
      console.log("❌ Car or chassis body not found");
      return 0;
    }

    const now = Date.now();
    const pos = this.car.chassisBody.position;
    
    if (!this.previousPosition) {
      this.previousPosition = pos.clone();
      this.previousTime = now;
      return 0;
    }

    const distance = pos.distanceTo(this.previousPosition);
    const timeElapsed = (now - this.previousTime) / 1000;
    
    if (timeElapsed === 0) return this.currentSpeed;

    const speedMPS = distance / timeElapsed;
    const speed = speedMPS * 3.6; // Convert to km/h
    
    this.previousPosition = pos.clone();
    this.previousTime = now;
    
    return Math.max(0, speed);
  }

  // Main update method - call this periodically
  update() {
    // Calculate current speed
    this.currentSpeed = this.calculateSpeed();
    
    // Debug speed
    if (this.currentSpeed > 0) {
      console.log(`🏎️ Current Speed: ${this.currentSpeed.toFixed(1)} km/h`);
    }
    
    // Check if threshold reached for first time
    if (this.currentSpeed >= this.speedThreshold && !this.thresholdReached) {
      this.thresholdReached = true;
      this.startTime = Date.now();
      console.log(`🚨 SPEED THRESHOLD REACHED! ${this.currentSpeed.toFixed(1)} km/h`);
      console.log("⚡ Spawning car IMMEDIATELY!");
      
      // Spawn car immediately when speed hits 180
      this.spawnImmediateCar();
      this.immediateCarSpawned = true;
      
      console.log("⏱️ Starting timers for remaining cars...");
    }
    
    // If threshold reached, check timers for remaining cars
    if (this.thresholdReached && this.startTime) {
      const elapsed = Date.now() - this.startTime;
      const seconds = Math.floor(elapsed / 1000);
      
      // Spawn first car after 60 seconds
      if (elapsed >= 60000 && !this.firstCarSpawned) {
        this.spawnFirstCar();
        this.firstCarSpawned = true;
      }
      
      // Spawn second car after 180 seconds (60 + 120)
      if (elapsed >= 180000 && !this.secondCarSpawned) {
        this.spawnSecondCar();
        this.secondCarSpawned = true;
      }
      
      // Show countdown every 10 seconds
      if (seconds % 10 === 0 && seconds > 0) {
        if (!this.firstCarSpawned) {
          console.log(`⏱️ ${60 - seconds} seconds until next car spawn`);
        } else if (!this.secondCarSpawned) {
          console.log(`⏱️ ${180 - seconds} seconds until final car spawn`);
        }
      }
    }
  }

  spawnImmediateCar() {
    try {
      console.log("🚔 Spawning IMMEDIATE car (Police Car)...");
      
      const position = {
        x: -50 + Math.random() * 25,
        y: 10,
        z: 200 + Math.random() * 30
      };
      
      const policeCar = new AICar(this.scene, this.world, this.car, position);
      policeCar.init();
      
      console.log("✅ Immediate car spawned successfully at:", position);
    } catch (error) {
      console.error("❌ Error spawning immediate car:", error);
    }
  }

  spawnFirstCar() {
    try {
      console.log("🚔 Spawning first timed car (Ford)...");
      
      const position = {
        x: -5000,
        y: 10,
        z: -5000
      };
      
      const fordCar = new AICar(this.scene, this.world, this.car, position);
      fordCar.init();
      
      console.log("✅ First timed car spawned successfully at:", position);
    } catch (error) {
      console.error("❌ Error spawning first timed car:", error);
    }
  }

  spawnSecondCar() {
    try {
      console.log("🚗 Spawning final car...");
      
      const position = {
        x: 5000,
        y: 10,
        z: 5000
      };
      
      const finalCar = new AICar(this.scene, this.world, this.car, position);
      finalCar.init();
      
      console.log("✅ Final car spawned successfully at:", position);
      console.log("🎉 ALL 3 CARS SPAWNED! Sequence complete.");
    } catch (error) {
      console.error("❌ Error spawning final car:", error);
    }
  }

  // Get current status
  getStatus() {
    const elapsed = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    
    return {
      currentSpeed: this.currentSpeed.toFixed(1),
      thresholdReached: this.thresholdReached,
      timeElapsed: elapsed.toFixed(1),
      immediateCarSpawned: this.immediateCarSpawned,
      firstCarSpawned: this.firstCarSpawned,
      secondCarSpawned: this.secondCarSpawned,
      isComplete: this.immediateCarSpawned && this.firstCarSpawned && this.secondCarSpawned,
      totalCarsSpawned: [this.immediateCarSpawned, this.firstCarSpawned, this.secondCarSpawned].filter(Boolean).length
    };
  }

  // Reset for testing
  reset() {
    this.thresholdReached = false;
    this.immediateCarSpawned = false;
    this.firstCarSpawned = false;
    this.secondCarSpawned = false;
    this.startTime = null;
    this.previousPosition = null;
    this.previousTime = null;
    this.currentSpeed = 0;
    console.log("🔄 SpeedCarSpawner reset");
  }
}

export default SpeedCarSpawner;

// USAGE EXAMPLE:
// 
// 1. Initialize:
// const spawner = new SpeedCarSpawner(scene, world, playerCar);
// 
// 2. In your game loop or update function:
// spawner.update();
// 
// 3. Check status anytime:
// console.log(spawner.getStatus());
// 
// 4. Reset if needed:
// spawner.reset();

// TIMING SEQUENCE:
// Speed reaches 180 km/h → Car spawns IMMEDIATELY
// After 60 seconds → Car spawns  
// After 120 seconds total → Car spawns
// After 240 seconds total → Car spawns (final car)