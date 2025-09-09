import startGame, { getDebug, setDebug } from "./map1.js";
import startGame1 from "./map2.js";
import mapDevelopment from "./mapDevelopment.js";
import { selectCar } from "./selectCar.js";
import { showPlayButton } from "./showPlayButton.js";
import { stopTrimmedAudio, toggleMusic } from "./playMusic.js";
import { getAntialias, setAntialias } from "./antialiasing.js";

export function Option() {
const showOption = document.createElement("div");
  showOption.id = "showOption";
  showOption.style.position = "fixed";
  showOption.style.top = "0";
  showOption.style.left = "0";
  showOption.style.width = "100%";
  showOption.style.height = "100%";
  showOption.style.backgroundColor = "rgb(0, 0, 0)";
  
  // Add background image with fade effect on left and right edges
  showOption.style.background = `
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
  showOption.style.backgroundSize = "80%";
  showOption.style.backgroundPosition = "center center";
  showOption.style.backgroundRepeat = "no-repeat";
  
  showOption.style.display = "flex";
  showOption.style.justifyContent = "center";
  showOption.style.alignItems = "center";
  showOption.style.zIndex = "1000";
  showOption.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
  const isDebug = getDebug();
  const isAntialiasOn = getAntialias();

  showOption.innerHTML = `
    <div style="
      background-color: rgba(0, 0, 0, 0.35);
      width: 1000px;
      height: 500px;
      padding: 40px 60px;
      border-radius: 16px;
      text-align: center;
      color: white;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 2px solid rgba(255, 255, 255, 0.5);
    ">
      <h2 style="font-size: 28px; margin-bottom: 40px;">Options</h2>
      
      <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 30px;">
        <p style="font-size: 20px; margin: 0;">Game Mode</p>
        <div style="display: flex; flex-direction: row; gap: 30px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
            cursor: pointer;
          ">
            <input type="radio" name="gameMode" value="normal" id="normalRadio" ${
              !isDebug ? "checked" : ""
            } style="width: 20px; height: 20px; accent-color: #00bcd4;">
            Normal Mode
          </label>

          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
            cursor: pointer;
          ">
            <input type="radio" name="gameMode" value="debug" id="debugRadio" ${
              isDebug ? "checked" : ""
            } style="width: 20px; height: 20px; accent-color: #ff9800;">
            Debug Mode
          </label>
        </div>
      </div>
      
      <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 30px;">
        <p style="font-size: 20px; margin: 0;">Music</p>
        <button id="music" style="
          padding: 12px 24px;
          margin: 0;
          font-size: 18px;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          font-style: normal;
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
        ">
          Toggle Music
        </button>
      </div>

      <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 40px;">
        <p style="font-size: 20px; margin: 0;">Antialias</p>
        <div style="display: flex; flex-direction: row; gap: 30px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
            cursor: pointer;
          ">
            <input type="radio" name="antialias" value="on" id="onRadio" ${
              isAntialiasOn ? "checked" : ""
            } style="width: 20px; height: 20px; accent-color: #00bcd4;">
            On
          </label>

          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
            cursor: pointer;
          ">
            <input type="radio" name="antialias" value="off" id="offRadio" ${
              !isAntialiasOn ? "checked" : ""
            } style="width: 20px; height: 20px; accent-color: #ff9800;">
            Off
          </label>
        </div>
      </div>
      
      <div style="display: flex; justify-content: center; width: 100%;">
        <button id="back" style="
          padding: 20px 40px;
          font-size: 24px;
          background-color: rgba(0, 0, 0, 0.3);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        ">Back</button>
      </div>
    </div>
  `;

  document.body.appendChild(showOption);

  // Event listeners
  const backButton = document.getElementById("back");
  const normalRadio = document.getElementById("normalRadio");
  const debugRadio = document.getElementById("debugRadio");
  const antialiasOnRadio = document.getElementById("onRadio");
  const antialiasOffRadio = document.getElementById("offRadio");
  const musicButton = document.getElementById("music");

  // Back button hover effects
  backButton.addEventListener("mouseover", () => {
    backButton.style.backgroundColor = "rgba(58, 58, 58, 0.8)";
    backButton.style.borderColor = "rgba(255, 255, 255, 0.5)";
  });
  
  backButton.addEventListener("mouseout", () => {
    backButton.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    backButton.style.borderColor = "rgba(255, 255, 255, 0.3)";
  });

  // Music button hover effects
  musicButton.addEventListener("mouseover", () => {
    musicButton.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
  });
  
  musicButton.addEventListener("mouseout", () => {
    musicButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  });

  // Game mode change handlers
  normalRadio.addEventListener("change", () => {
    if (normalRadio.checked) {
      setDebug(false);
    }
  });
  
  debugRadio.addEventListener("change", () => {
    if (debugRadio.checked) {
      setDebug(true);
    }
  });

  // Antialias change handlers
  antialiasOnRadio.addEventListener("change", () => {
    if (antialiasOnRadio.checked) {
      setAntialias(true);
    }
  });
  
  antialiasOffRadio.addEventListener("change", () => {
    if (antialiasOffRadio.checked) {
      setAntialias(false);
    }
  });

  // Music toggle handler
  musicButton.addEventListener("click", () => {
    toggleMusic();
  });

  // Back button handler
  backButton.addEventListener("click", () => {
    showOption.remove();
    showPlayButton();

  });
}