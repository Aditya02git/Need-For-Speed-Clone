import * as THREE from "three";

export default class Speedometer {
  constructor(car, options = {}) {
    this.car = car;
    
    // Configuration options
    this.options = {
      maxSpeed: options.maxSpeed || 280, // Maximum speed for the gauge (km/h or mph)
      unit: options.unit || "km/h", // "km/h" or "mph"
      size: options.size || 150, // Size of the speedometer in pixels
      position: options.position || { x: 20, y: 20 }, // Position on screen
      updateInterval: options.updateInterval || 16, // Update every 16ms (~60fps)
      showNeedle: options.showNeedle !== false, // Show needle by default
      showDigital: options.showDigital !== false, // Show digital display by default
      showBackground: options.showBackground !== false, // Show background by default
      color: options.color || "#999999", // Primary color
      backgroundColor: options.backgroundColor || "rgba(0, 0, 0, 0.8)",
      redZoneColor: options.redZoneColor || "#ff0000", // Red zone color
      orangeZoneColor: options.orangeZoneColor || "#ffa500", // Orange zone color
      greenZoneColor: options.greenZoneColor || "#2bd71b", // Green zone color
      whiteZoneColor: options.whiteZoneColor || "#ffffff", // White zone color
      ...options
    };
    
    // Speed tracking
    this.currentSpeed = 0;
    this.maxReachedSpeed = 0;
    this.averageSpeed = 0;
    this.speedHistory = [];
    this.maxHistoryLength = 100;
    
    // Previous position for speed calculation
    this.previousPosition = null;
    this.previousTime = Date.now();
    
    // UI elements
    this.speedometerContainer = null;
    this.speedometerCanvas = null;
    this.digitalDisplay = null;
    this.ctx = null;
    
    // Animation properties
    this.targetNeedleAngle = 0;
    this.currentNeedleAngle = 0;
    this.needleSmoothing = 0.1;
    
    // Update loop
    this.updateLoop = null;
    this.isRunning = false;
    
    // Loading state tracking
    this.wasCarLoaded = false;
    this.speedometerVisible = false;
    
    // Callbacks
    this.onSpeedChange = null;
    this.onMaxSpeedReached = null;
    
    // Performance tracking
    this.lastUpdateTime = Date.now();
    this.frameCount = 0;
    this.fps = 120;
  }

  // Initialize the speedometer
  init() {
    this.createSpeedometerUI();
    this.startUpdateLoop();
    this.isRunning = true;
    
    // Initially hide the speedometer until car is loaded
    this.setVisible(false);
    
    console.log("Speedometer initialized (hidden until car loads)");
  }

  // Check if car is loaded and show/hide speedometer accordingly
  checkCarLoadedState() {
    const isCarLoaded = this.car && this.car.isLoaded === true;
    
    // If car just became loaded, show speedometer
    if (isCarLoaded && !this.wasCarLoaded) {
      this.setVisible(true);
      this.speedometerVisible = true;
      console.log("Car loaded - Speedometer now visible");
    }
    // If car was loaded but now isn't, hide speedometer
    else if (!isCarLoaded && this.wasCarLoaded) {
      this.setVisible(false);
      this.speedometerVisible = false;
      console.log("Car unloaded - Speedometer hidden");
    }
    
    this.wasCarLoaded = isCarLoaded;
    return isCarLoaded;
  }

  // Create the speedometer UI
  createSpeedometerUI() {
    // Main container
    this.speedometerContainer = document.createElement("div");
    this.speedometerContainer.style.position = "fixed";
    this.speedometerContainer.style.left = this.options.position.x + "px";
    this.speedometerContainer.style.top = this.options.position.y + "px";
    this.speedometerContainer.style.width = this.options.size + "px";
    this.speedometerContainer.style.height = this.options.size + "px";
    this.speedometerContainer.style.zIndex = "10000";
    this.speedometerContainer.style.pointerEvents = "none";
    this.speedometerContainer.style.fontFamily = "Arial, sans-serif";

    // Canvas for the speedometer gauge
    if (this.options.showBackground || this.options.showNeedle) {
      this.speedometerCanvas = document.createElement("canvas");
      this.speedometerCanvas.width = this.options.size;
      this.speedometerCanvas.height = this.options.size;
      this.speedometerCanvas.style.position = "absolute";
      this.speedometerCanvas.style.top = "-30px";
      this.speedometerCanvas.style.left = "0";
      this.ctx = this.speedometerCanvas.getContext("2d");
      this.speedometerContainer.appendChild(this.speedometerCanvas);
    }

    // Digital display
    if (this.options.showDigital) {
      this.digitalDisplay = document.createElement("div");
      this.digitalDisplay.style.position = "absolute";
      this.digitalDisplay.style.bottom = "90px";
      this.digitalDisplay.style.left = "50%";
      this.digitalDisplay.style.transform = "translateX(-50%)";
      this.digitalDisplay.style.color = this.options.color;
      this.digitalDisplay.style.fontSize = "18px";
      this.digitalDisplay.style.fontWeight = "bold";
      this.digitalDisplay.style.textAlign = "center";
      this.digitalDisplay.style.padding = "5px 10px";
      this.digitalDisplay.style.minWidth = "80px";
      this.digitalDisplay.textContent = `0 ${this.options.unit}`;
      this.speedometerContainer.appendChild(this.digitalDisplay);
    }

    // Additional info display (max speed, average speed)
    this.infoDisplay = document.createElement("div");
    this.infoDisplay.style.position = "absolute";
    this.infoDisplay.style.top = (this.options.size - 65) + "px";
    this.infoDisplay.style.left = (this.options.size - 1490) + "px";
    this.infoDisplay.style.color = this.options.color;
    this.infoDisplay.style.fontSize = "12px";
    this.infoDisplay.style.fontWeight = "bold";
    this.infoDisplay.style.textAlign = "left";
    this.infoDisplay.style.textShadow = `0 0 3px ${this.options.color}`;
    this.infoDisplay.style.backgroundColor = this.options.backgroundColor;
    this.infoDisplay.style.padding = "5px";
    this.infoDisplay.style.borderRadius = "3px";
    this.infoDisplay.style.border = `1px solid ${this.options.color}`;
    this.infoDisplay.style.minWidth = this.options.size + "px";
    this.infoDisplay.style.boxSizing = "border-box";
    this.speedometerContainer.appendChild(this.infoDisplay);

    document.body.appendChild(this.speedometerContainer);
  }

  // Calculate speed based on car movement
  calculateSpeed() {
    if (!this.car || !this.car.chassisBody || !this.car.isLoaded) return 0;

    const currentTime = Date.now();
    const currentPosition = this.car.chassisBody.position;
    
    if (!this.previousPosition) {
      this.previousPosition = currentPosition.clone();
      this.previousTime = currentTime;
      return 0;
    }

    // Calculate distance moved
    const distance = currentPosition.distanceTo(this.previousPosition);
    const timeElapsed = (currentTime - this.previousTime) / 1000; // Convert to seconds
    
    if (timeElapsed === 0) return this.currentSpeed;

    // Calculate speed in m/s
    const speedMPS = distance / timeElapsed;
    
    // Convert to km/h or mph
    let speed;
    if (this.options.unit === "mph") {
      speed = speedMPS * 2.237; // m/s to mph
    } else {
      speed = speedMPS * 3.6; // m/s to km/h
    }

    // Update previous values
    this.previousPosition = currentPosition.clone();
    this.previousTime = currentTime;

    return Math.max(0, speed); // Ensure speed is never negative
  }

  // Update speed and UI
  updateSpeed() {
    // Check if car is loaded before updating
    const isCarLoaded = this.checkCarLoadedState();
    
    if (!isCarLoaded) {
      // Reset speed when car is not loaded
      this.currentSpeed = 0;
      this.targetNeedleAngle = -135;
      this.currentNeedleAngle = -135;
      return;
    }

    const newSpeed = this.calculateSpeed();
    
    // Smooth speed changes
    this.currentSpeed = this.currentSpeed + (newSpeed - this.currentSpeed) * 0.1;
    
    // Update max speed
    if (this.currentSpeed > this.maxReachedSpeed) {
      this.maxReachedSpeed = this.currentSpeed;
      if (this.onMaxSpeedReached) {
        this.onMaxSpeedReached(this.maxReachedSpeed);
      }
    }

    // Update speed history for average calculation
    this.speedHistory.push(this.currentSpeed);
    if (this.speedHistory.length > this.maxHistoryLength) {
      this.speedHistory.shift();
    }

    // Calculate average speed
    this.averageSpeed = this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length;

    // Update needle angle
    const speedPercent = Math.min(this.currentSpeed / this.options.maxSpeed, 1);
    this.targetNeedleAngle = -135 + (speedPercent * 270); // -135° to 135° range

    // Smooth needle movement
    this.currentNeedleAngle = this.currentNeedleAngle + 
      (this.targetNeedleAngle - this.currentNeedleAngle) * this.needleSmoothing;

    // Update UI only if speedometer is visible
    if (this.speedometerVisible) {
      this.updateSpeedometerUI();
    }

    // Call speed change callback
    if (this.onSpeedChange) {
      this.onSpeedChange(this.currentSpeed, this.maxReachedSpeed, this.averageSpeed);
    }
  }

  // Update speedometer UI
  updateSpeedometerUI() {
    // Update canvas gauge
    if (this.ctx) {
      this.drawSpeedometer();
    }

    // Update digital display
    if (this.digitalDisplay) {
      this.digitalDisplay.textContent = `${Math.round(this.currentSpeed)} ${this.options.unit}`;
    }

    // Update info display
    if (this.infoDisplay) {
      this.infoDisplay.innerHTML = `
        <div>Max: ${Math.round(this.maxReachedSpeed)} ${this.options.unit}</div>
        <div>Avg: ${Math.round(this.averageSpeed)} ${this.options.unit}</div>
        <div>FPS: ${this.fps}</div>
      `;
    }
  }

  // Draw the speedometer gauge
  drawSpeedometer() {
    if (!this.ctx) return;

    const centerX = this.options.size / 2;
    const centerY = this.options.size / 2;
    const radius = this.options.size / 2 - 20;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.options.size, this.options.size);

    // Draw background
    if (this.options.showBackground) {
      this.drawBackground(centerX, centerY, radius);
    }

    // Draw speed markings
    this.drawSpeedMarkings(centerX, centerY, radius);

    // Draw needle
    if (this.options.showNeedle) {
      this.drawNeedle(centerX, centerY, radius);
    }

    // Draw center circle
    this.drawCenterCircle(centerX, centerY);
  }

  // Draw speedometer background
  drawBackground(centerX, centerY, radius) {
    // Outer circle
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fill();
    this.ctx.strokeStyle = this.options.color;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Inner gradient
    const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  // Draw speed markings and numbers
  drawSpeedMarkings(centerX, centerY, radius) {
    this.ctx.strokeStyle = this.options.color;
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const startAngle = -135 * Math.PI / 180;
    const endAngle = 135 * Math.PI / 180;
    const totalAngle = endAngle - startAngle;

    // Major markings (every 20 units)
    const majorStep = 20;
    const majorSteps = Math.floor(this.options.maxSpeed / majorStep) + 1;
    
    // Calculate which numbers should be red (last 3 numbers) and orange (4 numbers before red)
    const redZoneStart = Math.max(0, majorSteps - 3);
    const orangeZoneStart = Math.max(0, majorSteps - 7);
    const greenZoneStart = Math.max(0, majorSteps - 12);
    const whiteZoneStart = Math.max(0, majorSteps - 18);
    
    for (let i = 0; i < majorSteps; i++) {
      const speed = i * majorStep;
      const angle = startAngle + (speed / this.options.maxSpeed) * totalAngle;
      
      // Major tick
      const x1 = centerX + Math.cos(angle) * (radius - 15);
      const y1 = centerY + Math.sin(angle) * (radius - 15);
      const x2 = centerX + Math.cos(angle) * (radius - 5);
      const y2 = centerY + Math.sin(angle) * (radius - 5);
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Speed number - set color based on position
      const textX = centerX + Math.cos(angle) * (radius - 25);
      const textY = centerY + Math.sin(angle) * (radius - 25);
      
      // Set color: red for last 3 numbers, orange for 4 numbers before red, normal color for others
      if (i >= redZoneStart) {
        this.ctx.fillStyle = this.options.redZoneColor;
      } else if (i >= orangeZoneStart) {
        this.ctx.fillStyle = this.options.orangeZoneColor;
      } else if (i >= greenZoneStart) {
        this.ctx.fillStyle = this.options.greenZoneColor;
      } else {
        this.ctx.fillStyle = this.options.whiteZoneColor;
      }
      
      this.ctx.fillText(speed.toString(), textX, textY);
    }

    // Minor markings (every 2 units)
    const minorStep = 2;
    const minorSteps = Math.floor(this.options.maxSpeed / minorStep) + 1;
    
    for (let i = 0; i < minorSteps; i++) {
      const speed = i * minorStep;
      if (speed % majorStep !== 0) { // Skip major markings
        const angle = startAngle + (speed / this.options.maxSpeed) * totalAngle;
        
        const x1 = centerX + Math.cos(angle) * (radius - 10);
        const y1 = centerY + Math.sin(angle) * (radius - 10);
        const x2 = centerX + Math.cos(angle) * (radius - 5);
        const y2 = centerY + Math.sin(angle) * (radius - 5);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }

  // Draw speedometer needle
  drawNeedle(centerX, centerY, radius) {
    const angle = this.currentNeedleAngle * Math.PI / 180;

    const needleLength = radius - 20;
    const baseWidth = 6;
    const tailLength = 40; // how far the needle extends behind center

    // Tip of the needle
    const tipX = centerX + Math.cos(angle) * needleLength;
    const tipY = centerY + Math.sin(angle) * needleLength;

    // Tail of the needle (extends behind center)
    const baseX = centerX - Math.cos(angle) * tailLength;
    const baseY = centerY - Math.sin(angle) * tailLength;

    // Perpendicular vector (normal)
    const normalX = Math.cos(angle + Math.PI / 2);
    const normalY = Math.sin(angle + Math.PI / 2);

    // Left and right sides of the base
    const leftBaseX = baseX + normalX * baseWidth * 0.5;
    const leftBaseY = baseY + normalY * baseWidth * 0.5;

    const rightBaseX = baseX - normalX * baseWidth * 0.5;
    const rightBaseY = baseY - normalY * baseWidth * 0.5;

    // Draw needle triangle
    this.ctx.beginPath();
    this.ctx.moveTo(leftBaseX, leftBaseY);
    this.ctx.lineTo(rightBaseX, rightBaseY);
    this.ctx.lineTo(tipX, tipY);
    this.ctx.closePath();

    this.ctx.fillStyle = "#ff0000";
    this.ctx.fill();
  }

  // Draw center circle
  drawCenterCircle(centerX, centerY) {
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.options.color;
    this.ctx.fill();
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  // Start the update loop
  startUpdateLoop() {
    if (this.updateLoop) return;

    this.updateLoop = setInterval(() => {
      if (this.isRunning) {
        this.updateSpeed();
        this.updateFPS();
      }
    }, this.options.updateInterval);
  }

  // Stop the update loop
  stopUpdateLoop() {
    if (this.updateLoop) {
      clearInterval(this.updateLoop);
      this.updateLoop = null;
    }
  }

  // Update FPS calculation
  updateFPS() {
    const currentTime = Date.now();
    this.frameCount++;
    
    if (currentTime - this.lastUpdateTime >= 1000) {
      this.fps = Math.round(this.frameCount / ((currentTime - this.lastUpdateTime) / 1000));
      this.frameCount = 0;
      this.lastUpdateTime = currentTime;
    }
  }

  // Public methods

  // Start speedometer
  start() {
    this.isRunning = true;
    console.log("Speedometer started");
  }

  // Stop speedometer
  stop() {
    this.isRunning = false;
    console.log("Speedometer stopped");
  }

  // Pause speedometer
  pause() {
    this.isRunning = false;
    console.log("Speedometer paused");
  }

  // Resume speedometer
  resume() {
    this.isRunning = true;
    console.log("Speedometer resumed");
  }

  // Reset speedometer
  reset() {
    this.currentSpeed = 0;
    this.maxReachedSpeed = 0;
    this.averageSpeed = 0;
    this.speedHistory = [];
    this.currentNeedleAngle = -135;
    this.targetNeedleAngle = -135;
    this.previousPosition = null;
    this.previousTime = Date.now();
    
    this.updateSpeedometerUI();
    console.log("Speedometer reset");
  }

  // Get current speed
  getCurrentSpeed() {
    return this.currentSpeed;
  }

  // Get max reached speed
  getMaxSpeed() {
    return this.maxReachedSpeed;
  }

  // Get average speed
  getAverageSpeed() {
    return this.averageSpeed;
  }

  // Get speed history
  getSpeedHistory() {
    return [...this.speedHistory];
  }

  // Set position
  setPosition(x, y) {
    this.options.position = { x, y };
    if (this.speedometerContainer) {
      this.speedometerContainer.style.left = x + "px";
      this.speedometerContainer.style.top = y + "px";
    }
  }

  // Set max speed
  setMaxSpeed(maxSpeed) {
    this.options.maxSpeed = maxSpeed;
    this.updateSpeedometerUI();
  }

  // Set unit
  setUnit(unit) {
    this.options.unit = unit;
    this.updateSpeedometerUI();
  }

  // Set visibility
  setVisible(visible) {
    if (this.speedometerContainer) {
      this.speedometerContainer.style.display = visible ? "block" : "none";
    }
  }

  // Set color
  setColor(color) {
    this.options.color = color;
    
    if (this.digitalDisplay) {
      this.digitalDisplay.style.color = color;
      this.digitalDisplay.style.textShadow = `0 0 5px ${color}`;
      this.digitalDisplay.style.borderColor = color;
    }
    
    if (this.infoDisplay) {
      this.infoDisplay.style.color = color;
      this.infoDisplay.style.textShadow = `0 0 3px ${color}`;
      this.infoDisplay.style.borderColor = color;
    }
    
    this.updateSpeedometerUI();
  }

  // Set red zone color
  setRedZoneColor(color) {
    this.options.redZoneColor = color;
    this.updateSpeedometerUI();
  }

  // Set orange zone color
  setOrangeZoneColor(color) {
    this.options.orangeZoneColor = color;
    this.updateSpeedometerUI();
  }

  setGreenZoneColor(color) {
    this.options.greenZoneColor = color;
    this.updateSpeedometerUI();
  }

  // Set callback functions
  setOnSpeedChange(callback) {
    this.onSpeedChange = callback;
  }

  setOnMaxSpeedReached(callback) {
    this.onMaxSpeedReached = callback;
  }

  // Toggle components
  toggleDigital() {
    this.options.showDigital = !this.options.showDigital;
    if (this.digitalDisplay) {
      this.digitalDisplay.style.display = this.options.showDigital ? "block" : "none";
    }
  }

  toggleNeedle() {
    this.options.showNeedle = !this.options.showNeedle;
    this.updateSpeedometerUI();
  }

  toggleBackground() {
    this.options.showBackground = !this.options.showBackground;
    this.updateSpeedometerUI();
  }

  // Check if car is loaded (public method)
  isCarLoaded() {
    return this.car && this.car.isLoaded === true;
  }

  // Cleanup method
  cleanup() {
    this.stopUpdateLoop();
    this.isRunning = false;

    // Remove UI elements
    if (this.speedometerContainer && this.speedometerContainer.parentNode) {
      this.speedometerContainer.parentNode.removeChild(this.speedometerContainer);
    }

    // Clear references
    this.car = null;
    this.speedometerContainer = null;
    this.speedometerCanvas = null;
    this.digitalDisplay = null;
    this.infoDisplay = null;
    this.ctx = null;

    console.log("Speedometer cleaned up");
  }
}