export default class Sound {
  constructor(car, options = {}) {
    this.car = car;
    this.options = {
      unit: options.unit || "kmh", // "kmh" or "mph"
      maxSpeed: options.maxSpeed || 200, // Maximum speed for 100% pitch
      minPitch: options.minPitch || 0, // Minimum pitch percentage
      maxPitch: options.maxPitch || 200, // Maximum pitch percentage
      audioFile: options.audioFile || null,
      autoPlay: options.autoPlay || false,
      // Balanced smoothing options - responsive but not jarring
      pitchSmoothness: options.pitchSmoothness || 0.08, // Moderately smooth
      volumeSmoothness: options.volumeSmoothness || 0.12, // More responsive volume
      transitionTime: options.transitionTime || 0.15, // Shorter transition time
      // Speed calculation smoothing
      speedSmoothness: options.speedSmoothness || 0.15, // More responsive speed
      speedSampleSize: options.speedSampleSize || 3, // Fewer samples for faster response
      // Keyboard input options
      throttleBoost: options.throttleBoost || 0.3,
      brakeReduction: options.brakeReduction || 0.2,
      idleVolume: options.idleVolume || 0.15,
      throttleVolume: options.throttleVolume || 0.4,
      // Reduced minimum change thresholds for better responsiveness
      minPitchChange: options.minPitchChange || 0.5, // More sensitive to pitch changes
      minVolumeChange: options.minVolumeChange || 0.02, // More sensitive to volume changes
      ...options
    };

    // Speed calculation variables with smoothing
    this.previousPosition = null;
    this.previousTime = null;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.speedHistory = []; // New: for averaging speed over time

    // Audio variables
    this.audioContext = null;
    this.audioBuffer = null;
    this.source = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.isInitialized = false;

    // Enhanced smoothing variables
    this.targetPitch = 0;
    this.currentPitch = 0;
    this.previousTargetPitch = 0; // New: track previous target for rate limiting
    this.targetVolume = 0.7;
    this.currentVolume = 0.7;
    this.previousTargetVolume = 0.7; // New: track previous target for rate limiting
    this.lastUpdateTime = 0;

    // Keyboard input tracking with debouncing
    this.keys = {
      w: false,
      s: false
    };
    this.keyChangeTime = { // New: track when keys were pressed/released
      w: 0,
      s: 0
    };

    // Initialize keyboard listeners
    this.initKeyboardListeners();

    // Initialize if audio file is provided
    if (this.options.audioFile) {
      this.initAudio();
    }
  }

  /**
   * Initialize keyboard event listeners for W and S keys
   */
  initKeyboardListeners() {
    this.onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const currentTime = performance.now();
      
      if ((key === 'w' || key === 'arrowup') && !this.keys.w) {
        this.keys.w = true;
        this.keyChangeTime.w = currentTime;
      } else if ((key === 's' || key === 'arrowdown') && !this.keys.s) {
        this.keys.s = true;
        this.keyChangeTime.s = currentTime;
      }
    };

    this.onKeyUp = (event) => {
      const key = event.key.toLowerCase();
      const currentTime = performance.now();
      
      if ((key === 'w' || key === 'arrowup') && this.keys.w) {
        this.keys.w = false;
        this.keyChangeTime.w = currentTime;
      } else if ((key === 's' || key === 'arrowdown') && this.keys.s) {
        this.keys.s = false;
        this.keyChangeTime.s = currentTime;
      }
    };

    // Add event listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * Remove keyboard event listeners
   */
  removeKeyboardListeners() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  /**
   * Initialize audio context and load audio file
   */
  async initAudio() {
    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load audio file if provided
      if (this.options.audioFile) {
        await this.loadAudioFile(this.options.audioFile);
      }

      this.isInitialized = true;

      // Auto-play if enabled
      if (this.options.autoPlay && this.audioBuffer) {
        this.startEngine();
      }

    } catch (error) {
      console.error('Error initializing audio:', error);
      throw error;
    }
  }

  /**
   * Load audio file from URL or File object
   */
  async loadAudioFile(audioFile) {
    try {
      let arrayBuffer;

      if (audioFile instanceof File) {
        arrayBuffer = await audioFile.arrayBuffer();
      } else if (typeof audioFile === 'string') {
        const response = await fetch(audioFile);
        arrayBuffer = await response.arrayBuffer();
      } else {
        throw new Error('Invalid audio file format');
      }

      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return true;

    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }

  /**
   * Calculate car speed based on position changes with improved smoothing
   */
  calculateSpeed() {
    if (!this.car || !this.car.chassisBody) return 0;

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
    let instantSpeed;
    if (this.options.unit === "mph") {
      instantSpeed = speedMPS * 2.237; // m/s to mph
    } else {
      instantSpeed = speedMPS * 3.6; // m/s to km/h
    }

    // Ensure speed is never negative
    instantSpeed = Math.max(0, instantSpeed);

    // Add to speed history for averaging
    this.speedHistory.push(instantSpeed);
    if (this.speedHistory.length > this.options.speedSampleSize) {
      this.speedHistory.shift(); // Remove oldest entry
    }

    // Calculate averaged speed from history
    const averagedSpeed = this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length;

    // Apply additional smoothing to the target speed
    this.targetSpeed = averagedSpeed;
    
    // Smooth transition from current speed to target speed
    this.currentSpeed = this.lerp(this.currentSpeed, this.targetSpeed, this.options.speedSmoothness);

    // Update previous values
    this.previousPosition = currentPosition.clone();
    this.previousTime = currentTime;

    return this.currentSpeed;
  }

  /**
   * Calculate pitch percentage based on current speed and key inputs with rate limiting
   */
  calculatePitchFromSpeed(speed = null) {
    const currentSpeed = speed !== null ? speed : this.calculateSpeed();
    const currentTime = performance.now();
    
    // Base idle pitch (always playing at minimum level)
    let pitchPercent = this.options.minPitch + 10; // Slight base pitch for idle sound
    
    // Add small delay after key press/release to prevent instant changes but keep responsive
    const keyDelay = 50; // Reduced from 100ms for faster response
    
    // Only increase pitch if W key is pressed and enough time has passed
    if (this.keys.w && (currentTime - this.keyChangeTime.w > keyDelay)) {
      // Calculate pitch based on speed when throttling
      const speedBasedPitch = Math.min(
        this.options.maxPitch,
        Math.max(
          this.options.minPitch,
          (currentSpeed / this.options.maxSpeed) * 100
        )
      );
      
      // Apply throttle boost on top of speed-based pitch
      pitchPercent = speedBasedPitch + (this.options.throttleBoost * 100);
    } else if (this.keys.s && (currentTime - this.keyChangeTime.s > keyDelay)) {
      // Brake pressed - slightly reduce from idle pitch
      pitchPercent = Math.max(this.options.minPitch, pitchPercent - (this.options.brakeReduction * 100));
    }
    // If neither W nor S is pressed, maintain idle pitch regardless of speed

    // Ensure pitch stays within bounds
    const clampedPitch = Math.min(this.options.maxPitch, Math.max(this.options.minPitch, pitchPercent));

    // Rate limiting: only change target if the change is significant enough
    if (Math.abs(clampedPitch - this.previousTargetPitch) >= this.options.minPitchChange) {
      this.previousTargetPitch = clampedPitch;
      return clampedPitch;
    }

    // Return previous target if change is too small
    return this.previousTargetPitch;
  }

  /**
   * Convert pitch percentage to playback rate
   */
  pitchToPlaybackRate(pitchPercent) {
    // Convert 0% to 100% range to 1x to 2x playback rate
    // 0% = 1x (original pitch)
    // 100% = 2x (one octave up)
    return 1 + (pitchPercent / 100);
  }

  /**
   * Start engine sound (begin audio playback)
   */
  async startEngine() {
    if (!this.isInitialized) {
      await this.initAudio();
    }

    if (!this.audioBuffer || this.isPlaying) return false;

    try {
      // Create new audio nodes
      this.source = this.audioContext.createBufferSource();
      this.gainNode = this.audioContext.createGain();

      // Configure audio source
      this.source.buffer = this.audioBuffer;
      this.source.loop = true;
      this.source.loopStart = 0.1;
      this.source.loopEnd = this.audioBuffer.duration;

      // Set initial pitch and volume
      const initialPitch = this.calculatePitchFromSpeed();
      this.currentPitch = initialPitch;
      this.targetPitch = initialPitch;
      this.previousTargetPitch = initialPitch;
      this.source.playbackRate.value = this.pitchToPlaybackRate(initialPitch);
      
      this.currentVolume = 0.7; // Default volume
      this.targetVolume = 0.7;
      this.previousTargetVolume = 0.7;
      this.gainNode.gain.value = this.currentVolume;

      // Connect audio nodes
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Start playback
      this.source.start(0);
      this.isPlaying = true;

      return true;

    } catch (error) {
      console.error('Error starting engine sound:', error);
      return false;
    }
  }

  /**
   * Stop engine sound
   */
  stopEngine() {
    if (this.source && this.isPlaying) {
      this.source.stop();
      this.isPlaying = false;
      this.source = null;
      this.gainNode = null;
    }
  }

  /**
   * Enhanced smooth interpolation function (lerp) with easing
   */
  lerp(start, end, factor, useEasing = true) {
    if (useEasing) {
      // Apply easing function for smoother transitions
      factor = this.easeInOutQuad(factor);
    }
    return start + (end - start) * factor;
  }

  /**
   * Quadratic ease-in-out function for smoother transitions
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * Update audio pitch and volume with enhanced smooth transitions
   * Call this method in your game loop/update cycle
   */
  update() {
    if (!this.isPlaying || !this.source) return;

    const currentTime = performance.now();
    const deltaTime = this.lastUpdateTime ? Math.min((currentTime - this.lastUpdateTime) / 1000, 0.1) : 0;
    this.lastUpdateTime = currentTime;

    // Calculate current speed and corresponding target pitch
    const speed = this.calculateSpeed();
    const newTargetPitch = this.calculatePitchFromSpeed(speed);

    // Only update target pitch if it's significantly different
    if (Math.abs(newTargetPitch - this.targetPitch) >= this.options.minPitchChange) {
      this.targetPitch = newTargetPitch;
    }

    // Enhanced smooth pitch transition with frame rate independence
    const pitchDifference = Math.abs(this.targetPitch - this.currentPitch);
    if (pitchDifference > 0.2) { // Reduced threshold for more responsiveness
      // Adjust smoothness based on frame rate
      const frameAdjustedPitchSmoothness = 1 - Math.pow(1 - this.options.pitchSmoothness, deltaTime * 60);
      this.currentPitch = this.lerp(
        this.currentPitch, 
        this.targetPitch, 
        frameAdjustedPitchSmoothness,
        false // Disable easing for more direct response
      );
    } else {
      this.currentPitch = this.targetPitch;
    }

    // Enhanced smooth volume transition
    const currentTime2 = performance.now();
    const keyDelay = 75; // Reduced delay for volume changes
    
    let targetVolumeFromSpeed;
    
    if (this.keys.w && (currentTime2 - this.keyChangeTime.w > keyDelay)) {
      targetVolumeFromSpeed = this.options.throttleVolume;
    } else if (this.keys.s && (currentTime2 - this.keyChangeTime.s > keyDelay)) {
      targetVolumeFromSpeed = this.options.idleVolume * 1.2;
    } else {
      targetVolumeFromSpeed = this.options.idleVolume;
    }
    
    const newTargetVolume = Math.min(1, targetVolumeFromSpeed);

    // Only update target volume if it's significantly different
    if (Math.abs(newTargetVolume - this.targetVolume) >= this.options.minVolumeChange) {
      this.targetVolume = newTargetVolume;
    }

    const volumeDifference = Math.abs(this.targetVolume - this.currentVolume);
    if (volumeDifference > 0.01) {
      // Frame rate independent volume smoothing
      const frameAdjustedVolumeSmoothness = 1 - Math.pow(1 - this.options.volumeSmoothness, deltaTime * 60);
      this.currentVolume = this.lerp(
        this.currentVolume, 
        this.targetVolume, 
        frameAdjustedVolumeSmoothness
      );
    } else {
      this.currentVolume = this.targetVolume;
    }

    // Apply smooth changes using Web Audio API automation with longer transitions
    const now = this.audioContext.currentTime;
    const transitionTime = this.options.transitionTime;

    // Smooth playback rate (pitch) change
    if (this.source.playbackRate) {
      const playbackRate = this.pitchToPlaybackRate(this.currentPitch);
      this.source.playbackRate.cancelScheduledValues(now);
      this.source.playbackRate.exponentialRampToValueAtTime(
        Math.max(0.01, playbackRate), 
        now + transitionTime
      );
    }

    // Smooth volume change
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.001, this.currentVolume), 
        now + transitionTime
      );
    }
  }

  /**
   * Set volume with smooth transition (0.0 to 1.0)
   */
  setVolume(volume, immediate = false) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (immediate) {
      this.currentVolume = clampedVolume;
      this.targetVolume = clampedVolume;
      this.previousTargetVolume = clampedVolume;
      if (this.gainNode) {
        this.gainNode.gain.value = clampedVolume;
      }
    } else {
      this.targetVolume = clampedVolume;
    }
  }

  /**
   * Set pitch smoothness (0.001 to 1.0, higher = more responsive)
   */
  setPitchSmoothness(smoothness) {
    this.options.pitchSmoothness = Math.max(0.001, Math.min(1, smoothness));
  }

  /**
   * Set volume smoothness (0.001 to 1.0, higher = more responsive)
   */
  setVolumeSmoothness(smoothness) {
    this.options.volumeSmoothness = Math.max(0.001, Math.min(1, smoothness));
  }

  /**
   * Set speed smoothness (0.001 to 1.0, higher = more responsive)
   */
  setSpeedSmoothness(smoothness) {
    this.options.speedSmoothness = Math.max(0.001, Math.min(1, smoothness));
  }

  /**
   * Set minimum pitch change threshold
   */
  setMinPitchChange(threshold) {
    this.options.minPitchChange = Math.max(0.1, threshold);
  }

  /**
   * Set minimum volume change threshold  
   */
  setMinVolumeChange(threshold) {
    this.options.minVolumeChange = Math.max(0.001, threshold);
  }

  /**
   * Set transition time for Web Audio API automation
   */
  setTransitionTime(time) {
    this.options.transitionTime = Math.max(0.01, time);
  }

  /**
   * Get current speed
   */
  getSpeed() {
    return this.currentSpeed;
  }

  /**
   * Check if throttle key (W) is pressed
   */
  isThrottlePressed() {
    return this.keys.w;
  }

  /**
   * Check if brake key (S) is pressed
   */
  isBrakePressed() {
    return this.keys.s;
  }

  /**
   * Get current key states
   */
  getKeyStates() {
    return { ...this.keys };
  }

  /**
   * Set throttle boost amount (0.0 to 1.0)
   */
  setThrottleBoost(boost) {
    this.options.throttleBoost = Math.max(0, Math.min(1, boost));
  }

  /**
   * Set brake reduction amount (0.0 to 1.0)
   */
  setBrakeReduction(reduction) {
    this.options.brakeReduction = Math.max(0, Math.min(1, reduction));
  }

  /**
   * Get current smooth pitch percentage
   */
  getCurrentPitch() {
    return this.currentPitch;
  }

  /**
   * Get target pitch percentage
   */
  getTargetPitch() {
    return this.targetPitch;
  }

  /**
   * Get current smooth volume
   */
  getCurrentVolume() {
    return this.currentVolume;
  }

  /**
   * Set maximum speed for pitch calculation
   */
  setMaxSpeed(maxSpeed) {
    this.options.maxSpeed = maxSpeed;
  }

  /**
   * Change speed unit
   */
  setSpeedUnit(unit) {
    if (unit === "kmh" || unit === "mph") {
      this.options.unit = unit;
    }
  }

  /**
   * Check if engine is running
   */
  isEngineRunning() {
    return this.isPlaying;
  }

  /**
   * Destroy sound instance and clean up resources
   */
  cleanup() {
    this.stopEngine();
    this.removeKeyboardListeners();
    
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.car = null;
    this.audioContext = null;
    this.audioBuffer = null;
  }

  /**
   * Pause engine sound (preserves state for resuming)
   */
  pause() {
    if (!this.isPlaying || !this.source) {
      console.warn('Cannot pause: engine is not currently running');
      return false;
    }

    try {
      // Store current state for resuming
      this.pausedState = {
        currentPitch: this.currentPitch,
        targetPitch: this.targetPitch,
        previousTargetPitch: this.previousTargetPitch,
        currentVolume: this.currentVolume,
        targetVolume: this.targetVolume,
        previousTargetVolume: this.previousTargetVolume,
        currentSpeed: this.currentSpeed,
        targetSpeed: this.targetSpeed,
        speedHistory: [...this.speedHistory],
        keys: { ...this.keys },
        keyChangeTime: { ...this.keyChangeTime }
      };

      // Stop current audio
      this.source.stop();
      this.isPlaying = false;
      this.source = null;
      this.gainNode = null;

      console.log('Engine sound paused successfully');
      return true;

    } catch (error) {
      console.error('Error pausing engine sound:', error);
      return false;
    }
  }

  /**
   * Resume engine sound from paused state
   */
  async resume() {
    if (this.isPlaying) {
      console.warn('Cannot resume: engine is already running');
      return false;
    }

    if (!this.pausedState) {
      console.warn('Cannot resume: no paused state found. Use startEngine() instead.');
      return false;
    }

    if (!this.isInitialized) {
      await this.initAudio();
    }

    if (!this.audioBuffer) {
      console.error('Cannot resume: no audio buffer loaded');
      return false;
    }

    try {
      // Restore state
      this.currentPitch = this.pausedState.currentPitch;
      this.targetPitch = this.pausedState.targetPitch;
      this.previousTargetPitch = this.pausedState.previousTargetPitch;
      this.currentVolume = this.pausedState.currentVolume;
      this.targetVolume = this.pausedState.targetVolume;
      this.previousTargetVolume = this.pausedState.previousTargetVolume;
      this.currentSpeed = this.pausedState.currentSpeed;
      this.targetSpeed = this.pausedState.targetSpeed;
      this.speedHistory = [...this.pausedState.speedHistory];
      this.keys = { ...this.pausedState.keys };
      this.keyChangeTime = { ...this.pausedState.keyChangeTime };

      // Create new audio nodes
      this.source = this.audioContext.createBufferSource();
      this.gainNode = this.audioContext.createGain();

      // Configure audio source
      this.source.buffer = this.audioBuffer;
      this.source.loop = true;
      this.source.loopStart = 0.1;
      this.source.loopEnd = this.audioBuffer.duration;

      // Restore pitch and volume
      this.source.playbackRate.value = this.pitchToPlaybackRate(this.currentPitch);
      this.gainNode.gain.value = this.currentVolume;

      // Connect audio nodes
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Start playback
      this.source.start(0);
      this.isPlaying = true;

      // Clear paused state
      this.pausedState = null;

      console.log('Engine sound resumed successfully');
      return true;

    } catch (error) {
      console.error('Error resuming engine sound:', error);
      return false;
    }
  }

  /**
   * Enhanced cleanup function - properly dispose of all resources
   */
  cleanup() {
    console.log('Cleaning up Sound instance...');

    try {
      // Stop engine if running
      this.stopEngine();

      // Remove keyboard listeners
      this.removeKeyboardListeners();

      // Clear all timers and intervals (if any were added in future)
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Disconnect and clean up audio nodes
      if (this.source) {
        try {
          this.source.disconnect();
        } catch (e) {
          // Node might already be disconnected
        }
        this.source = null;
      }

      if (this.gainNode) {
        try {
          this.gainNode.disconnect();
        } catch (e) {
          // Node might already be disconnected
        }
        this.gainNode = null;
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().then(() => {
          console.log('Audio context closed successfully');
        }).catch((error) => {
          console.error('Error closing audio context:', error);
        });
      }

      // Clear all references and reset state
      this.car = null;
      this.audioContext = null;
      this.audioBuffer = null;
      this.pausedState = null;
      
      // Reset state variables
      this.isPlaying = false;
      this.isInitialized = false;
      this.previousPosition = null;
      this.previousTime = null;
      this.currentSpeed = 0;
      this.targetSpeed = 0;
      this.speedHistory = [];
      this.currentPitch = 0;
      this.targetPitch = 0;
      this.previousTargetPitch = 0;
      this.currentVolume = 0.7;
      this.targetVolume = 0.7;
      this.previousTargetVolume = 0.7;
      this.lastUpdateTime = 0;

      // Reset keyboard state
      this.keys = { w: false, s: false };
      this.keyChangeTime = { w: 0, s: 0 };

      // Clear event handlers
      this.onKeyDown = null;
      this.onKeyUp = null;

      console.log('Sound instance cleaned up successfully');

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Check if engine is currently paused
   */
  isPaused() {
    return !this.isPlaying && this.pausedState !== null && this.pausedState !== undefined;
  }

  /**
   * Toggle between play/pause states
   */
  async togglePlayPause() {
    if (this.isPlaying) {
      return this.pause();
    } else if (this.isPaused()) {
      return await this.resume();
    } else {
      return await this.startEngine();
    }
  }

  /**
   * Get current engine state
   */
  getEngineState() {
    if (this.isPlaying) {
      return 'playing';
    } else if (this.isPaused()) {
      return 'paused';
    } else {
      return 'stopped';
    }
  }

  /**
   * Force stop and reset (unlike pause, this clears saved state)
   */
  forceStop() {
    this.stopEngine();
    this.pausedState = null;
    
    // Reset all state variables to initial values
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.speedHistory = [];
    this.currentPitch = 0;
    this.targetPitch = 0;
    this.previousTargetPitch = 0;
    this.currentVolume = 0.7;
    this.targetVolume = 0.7;
    this.previousTargetVolume = 0.7;
    this.keys = { w: false, s: false };
    this.keyChangeTime = { w: 0, s: 0 };
    
    return true;
  }
}