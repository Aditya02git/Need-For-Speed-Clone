import { LoadingComponent } from "../loader/loadingComponent.js";
import startGame from "./map1.js";
import startGame1 from "./map2.js";
import mapDevelopment from "./mapDevelopment.js";
import { stopTrimmedAudio } from "./playMusic.js";
import { selectCar } from "./selectCar.js";
import { showPlayButton } from "./showPlayButton.js";

export function selectMap() {
  const loader = new LoadingComponent();
const showMap = document.createElement("div");
  showMap.id = "showMap";
  showMap.style.position = "fixed";
  showMap.style.top = "0";
  showMap.style.left = "0";
  showMap.style.width = "100%";
  showMap.style.height = "100%";
  showMap.style.backgroundColor = "rgb(0, 0, 0)";
  
  // Add background image with fade effect on left and right edges
  showMap.style.background = `
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
  showMap.style.backgroundSize = "80%";
  showMap.style.backgroundPosition = "center center";
  showMap.style.backgroundRepeat = "no-repeat";
  
  showMap.style.display = "flex";
  showMap.style.justifyContent = "center";
  showMap.style.alignItems = "center";
  showMap.style.zIndex = "1000";
  showMap.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
  
  showMap.innerHTML = `
    <div style="display: flex; gap: 50px; align-items: center;">
      <!-- Button Section -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <button id="map1" style="
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
        " 
        onmouseover="this.style.backgroundColor='rgba(0, 0, 0, 0.3)'; this.style.transform='scale(1.05)'"
        onmouseout="this.style.backgroundColor='rgba(0, 0, 0, 0.3)'; this.style.transform='scale(1)'">
          Map-1
        </button>
        
        <button id="map2" style="
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
        "
        onmouseover="this.style.backgroundColor='rgba(0, 0, 0, 0.3)'; this.style.transform='scale(1.05)'"
        onmouseout="this.style.backgroundColor='rgba(0, 0, 0, 0.3)'; this.style.transform='scale(1)'">
          Map-2
        </button>
        
        <button disabled id="dev" style="
          padding: 20px 40px;
          font-size: 24px;
          background-color: #ff00007f;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: not-allowed;
          transition: background-color 0.3s;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        ">
          Dev ⚒
        </button>
        
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
        "
        onmouseover="this.style.backgroundColor='rgba(0, 0, 0, 0.3)'; this.style.transform='scale(1.05)'"
        onmouseout="this.style.backgroundColor='rgba(0, 0, 0, 0.3)'; this.style.transform='scale(1)'">
          Back
        </button>
      </div>
      
      <!-- Image Preview Section -->
      <div id="imagePreview" style="
        width: 800px;
        height: 600px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 15px;
        background-color: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 18px;
        text-align: center;
        box-shadow: 0 8px 16px rgba(0,0,0,0.4);
        transition: all 0.3s ease;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      ">
        <div id="previewText" style="
          background-color: rgba(0, 0, 0, 0.7);
          padding: 20px;
          border-radius: 10px;
          backdrop-filter: blur(5px);
        ">
          Select a Map to Start!
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(showMap);

  // Get references to elements
  const map1Btn = document.getElementById("map1");
  const map2Btn = document.getElementById("map2");
  const imagePreview = document.getElementById("imagePreview");
  const previewText = document.getElementById("previewText");

  // Map hover event listeners
  map1Btn.addEventListener("mouseenter", () => {
    imagePreview.style.backgroundImage = "url('./image/map_preview_1.png')"; // Replace with your map1 image path
    previewText.style.display = "none";
    imagePreview.style.borderColor = "rgba(255, 255, 255, 0.3)";
    imagePreview.style.transform = "scale(1.02)";
  });

  map1Btn.addEventListener("mouseleave", () => {
    imagePreview.style.backgroundImage = "";
    previewText.style.display = "block";
    imagePreview.style.borderColor = "rgba(255, 255, 255, 0.3)";
    imagePreview.style.transform = "scale(1)";
  });

  map2Btn.addEventListener("mouseenter", () => {
    imagePreview.style.backgroundImage = "url('./image/map_preview_2.png')"; // Replace with your map2 image path
    previewText.style.display = "none";
    imagePreview.style.borderColor = "rgba(255, 255, 255, 0.3)";
    imagePreview.style.transform = "scale(1.02)";
  });

  map2Btn.addEventListener("mouseleave", () => {
    imagePreview.style.backgroundImage = "";
    previewText.style.display = "block";
    imagePreview.style.borderColor = "rgba(255, 255, 255, 0.3)";
    imagePreview.style.transform = "scale(1)";
  });

  // Button click event listeners
  document.getElementById("map1").addEventListener("click", () => {
    showMap.remove();
    stopTrimmedAudio();
    loader.showFor(5000);
    
            setTimeout(() => {
          startGame();
        }, 5000);
    
  });

  document.getElementById("map2").addEventListener("click", () => {
    showMap.remove();
    stopTrimmedAudio();
    loader.showFor(5000);
    
            setTimeout(() => {
          startGame1();
        }, 5000);
    
  });

  document.getElementById("dev").addEventListener("click", () => {
    showMap.remove();
      loader.showFor(5000);
    
            setTimeout(() => {
          mapDevelopment();
        }, 5000);
    
  });

  document.getElementById("back").addEventListener("click", () => {
    showMap.remove();
    selectCar();
  });
}