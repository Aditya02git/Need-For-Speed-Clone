export default function playSoundOnClick(audioPath) {
  // Preload the audio
  const clickAudio = new Audio(audioPath);

  document.addEventListener("click", (e) => {
    // Check for left-click (button === 0)
    if (e.button === 0) {
      // Clone audio to allow overlapping playback
      const audioClone = clickAudio.cloneNode();
      audioClone.play().catch((err) => {
        console.warn("Autoplay blocked or error playing sound:", err);
      });
    }
  });
}