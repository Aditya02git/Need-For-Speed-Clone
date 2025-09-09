import "./style.css";
import playSoundOnClick from "./world/click_Music.js";
import { showPlayButton } from "./world/showPlayButton.js";

let currentAnimationId = null;

// Function to stop current animation loop
export function stopCurrentAnimation() {
  if (currentAnimationId) {
    cancelAnimationFrame(currentAnimationId);
    currentAnimationId = null;
  }
}

showPlayButton(); // Initial menu
playSoundOnClick("./sounds/click.mp3");
