// Move variables outside functions to maintain state
let currentLoopAudio = null;
let loopInterval = null;
let isMusicEnabled = true; // Global music state
let currentAudioPath = null; // Store current audio path for resume

export default function playAudioWithTrimmedLoop(audioPath) {
  // Store the audio path for potential resume
  currentAudioPath = audioPath;
  
  // Don't play if music is disabled
  if (!isMusicEnabled) {
    return;
  }

  stopTrimmedAudio(); // Stop if already playing

  const audio = new Audio(audioPath);
  currentLoopAudio = audio;

  const startTime = 0.1;

  audio.addEventListener("loadedmetadata", () => {
    const endTime = audio.duration - 0.1;

    audio.currentTime = startTime;
    audio.play().catch(err => console.warn('Audio play failed:', err));

    loopInterval = setInterval(() => {
      if (audio.currentTime >= endTime) {
        audio.currentTime = startTime;
        audio.play().catch(err => console.warn('Audio loop play failed:', err));
      }
    }, 50);
  });

  // Handle loading errors
  audio.addEventListener("error", (e) => {
    console.error('Audio loading failed:', e);
    stopTrimmedAudio();
  });

  // Optional: handle end in case metadata fails
  audio.addEventListener("ended", () => {
    audio.currentTime = startTime;
    audio.play().catch(err => console.warn('Audio ended play failed:', err));
  });
}

export function stopTrimmedAudio() {
  if (currentLoopAudio) {
    currentLoopAudio.pause();
    currentLoopAudio.currentTime = 0;
    currentLoopAudio = null;
  }
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
}

// Toggle music on/off
export function toggleMusic() {
  isMusicEnabled = !isMusicEnabled;
  
  if (isMusicEnabled) {
    // Music turned ON - resume playing if there was a current track
    if (currentAudioPath) {
      playAudioWithTrimmedLoop(currentAudioPath);
    }
    console.log('Music enabled');
  } else {
    // Music turned OFF - stop current audio
    stopTrimmedAudio();
    console.log('Music disabled');
  }
  
  return isMusicEnabled;
}

// Get current music state
export function isMusicOn() {
  return isMusicEnabled;
}

// Set music state directly
export function setMusicState(enabled) {
  const wasEnabled = isMusicEnabled;
  isMusicEnabled = enabled;
  
  if (enabled && !wasEnabled && currentAudioPath) {
    // Turning music back on
    playAudioWithTrimmedLoop(currentAudioPath);
  } else if (!enabled && wasEnabled) {
    // Turning music off
    stopTrimmedAudio();
  }
  
  return isMusicEnabled;
}