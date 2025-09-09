import { stopCurrentAnimation } from "../script.js";
import { cleanupGameInstances } from "./map1.js";
import { Option } from "./options.js";
import playAudioWithTrimmedLoop from "./playMusic.js";
import { selectCar } from "./selectCar.js";
import { selectMap } from "./selectMap.js";

export function showPlayButton() {
  // Stop current animation and cleanup
  stopCurrentAnimation();
  cleanupGameInstances();
  playAudioWithTrimmedLoop("./sounds/bg_music.mp3");

  // Check if overlay already exists to avoid duplicates
  if (document.getElementById("playOverlay")) return;

  const playOverlay = document.createElement("div");
  playOverlay.id = "playOverlay";
  playOverlay.style.position = "fixed";
  playOverlay.style.top = "0";
  playOverlay.style.left = "0";
  playOverlay.style.width = "100%";
  playOverlay.style.height = "100%";
  playOverlay.style.backgroundColor = "rgb(0, 0, 0)";
  
  // Add background image with fade effect on left and right edges
  playOverlay.style.background = `
    linear-gradient(90deg, 
      rgba(0, 0, 0, 1) 0%, 
      rgba(0, 0, 0, 0.8) 5%, 
      rgba(0, 0, 0, 0.3) 15%, 
      rgba(0, 0, 0, 0.3) 85%, 
      rgba(0, 0, 0, 0.8) 95%, 
      rgba(0, 0, 0, 1) 100%
    ),
    url('./image/menu.png')
  `;
  playOverlay.style.backgroundSize = "80%";
  playOverlay.style.backgroundPosition = "center center";
  playOverlay.style.backgroundRepeat = "no-repeat";
  
  playOverlay.style.display = "flex";
  playOverlay.style.justifyContent = "center";
  playOverlay.style.alignItems = "center";
  playOverlay.style.zIndex = "1000";
  playOverlay.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;

  // Use a container div for spacing buttons
              playOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
                    <div style="position: relative; margin-bottom: 40px;">
                
                        <h1 style="position: relative; top: -20px; left: -150px; margin: 0; font-size: 40px; letter-spacing: 10px; font-family: 'Bad Script', cursive; color: #fff; text-shadow: 0 0 20px #fff, 0 0 30px #fff, 0 0 40px #228DFF, 0 0 70px #228DFF, 0 0 80px #228DFF, 0 0 100px #228DFF, 0 0 150px #228DFF;">
                            <span style="animation: neon1 linear infinite 2s;">Cold </span><span style="animation: blink linear infinite 2s;">Pursuit</span>
                        </h1>
                    </div>
                    <div style="display: flex; flex-direction: column; position: relative; left: -200px; top: -70px; ">
                    <button id="goToMap" class="neon-button play-btn" style="
                        padding: 5px 10px;
                        font-size: 24px;
                        border: none;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                        font-family: 'Bad Script', cursive;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                        background: transparent;
                        color: #4CAF50;
                        text-shadow: 0 0 10px #4CAF50, 0 0 20px #4CAF50, 0 0 30px #4CAF50;
                    ">
                        <span style="animation: neon1 linear infinite 2.5s;">P</span><span style="animation: blink linear infinite 3s;">L</span><span>A</span><span>Y</span>
                    </button>

                    <button id="goToOptions" class="neon-button options-btn" style="
                        padding: 5px 10px;
                        font-size: 24px;
                        border: none;
                        cursor: pointer;
                        transition: all 0.3s ease; 
                        position: relative;
                        overflow: hidden;
                        font-family: 'Bad Script', cursive;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                        background: transparent;
                        color: #2196F3;
                        text-shadow: 0 0 10px #2196F3, 0 0 20px #2196F3, 0 0 30px #2196F3;
                    ">
                        <span style="animation: neon1 linear infinite 2.2s;">O</span><span>P</span><span style="animation: blink linear infinite 2.8s;">T</span><span>I</span><span>O</span><span>N</span><span>S</span>
                    </button>

                    <button id="exit" class="neon-button exit-btn" style="
                        padding: 5px 10px;
                        font-size: 24px;
                        border: none;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                        font-family: 'Bad Script', cursive;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                        background: transparent;
                        color: #f44336;
                        text-shadow: 0 0 10px #f44336, 0 0 20px #f44336, 0 0 30px #f44336;
                  
                    ">
                        <span style="animation: blink linear infinite 2.3s;">E</span><span style="animation: neon1 linear infinite 2.7s;">X</span><span>I</span><span>T</span>
                    </button>
                    </div>

                          <div style="width: 100%; bottom: 60px; left: 650px; text-align: center; position: fixed;">
                          <p style="font-style: italic; color: #999999ff;">Follow me on :</p>
                          </div>
                   
                      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
                        <footer style="
                          width: 100%;
                          padding: 20px 0;
                          background-color: #12121201;
                          color: white;
                          text-align: center;
                          position: fixed;
                          bottom: 0;
                          left: 650px;
                        ">
                          <ul style="
                            list-style: none;
                            padding: 0;
                            margin: 0;
                            display: flex;
                            justify-content: center;
                            gap: 30px;
                            font-size: 18px;
                          ">
                            <li>
                              <a href="https://github.com/Aditya02git" target="_blank" style="text-decoration: none; color: #ffffff;">
                                <i class="fab fa-github"></i> GitHub
                              </a>
                            </li>
                            <li>
                              <a href="https://www.linkedin.com/in/aditya-mondal-aa9658288/" target="_blank" style="text-decoration: none; color: #0077B5;">
                                <i class="fab fa-linkedin"></i> LinkedIn
                              </a>
                            </li>
                          </ul>
                        </footer>
                      </div>
                  `;

  document.body.appendChild(playOverlay);

  // Event listeners
  document.getElementById("goToMap").addEventListener("click", () => {
    playOverlay.remove();
    selectCar(); // make sure this function exists
  });

  document.getElementById("goToOptions").addEventListener("click", () => {
    Option();// Replace with actual logic
  });

  document.getElementById("exit").addEventListener("click", () => {
    playOverlay.remove(); // Or redirect, close game, etc.
    window.close();
  });
}