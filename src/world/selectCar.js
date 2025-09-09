import startGame from "./map1.js";
import { selectMap } from "./selectMap.js";
import { showPlayButton } from "./showPlayButton.js";

import carData from './carData.json';

let selectedCar = null;
let currentCarIndex = 0;

export { selectedCar };

export function selectCar() {
  const showCar = document.createElement("div");
  showCar.id = "showMap";
  showCar.style.position = "fixed";
  showCar.style.top = "0";
  showCar.style.left = "0";
  showCar.style.width = "100%";
  showCar.style.height = "100%";
  showCar.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  showCar.style.display = "flex";
  showCar.style.justifyContent = "center";
  showCar.style.alignItems = "center";
  showCar.style.zIndex = "1000";
  
  // Add dark overlay for better text readability
  showCar.style.backgroundSize = "80%";
  showCar.style.backgroundPosition = "center center";
  showCar.style.backgroundRepeat = "no-repeat";
  showCar.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
  
  showCar.innerHTML = `
  <div style="position: relative; width: 100%; height: 100%;">
    <!-- Fullscreen Video -->
    <video id="carVideo" style="
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.3s ease-in-out;
    " muted loop preload="metadata" autoplay>
      <source id="videoSource" src="" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    
    <!-- Loading overlay -->
    <div id="videoLoader" style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    ">
      <div style="color: white; font-size: 24px;">Loading...</div>
    </div>
    
    <!-- Top UI Overlay -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      padding: 40px;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
      z-index: 10;
    ">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <h2 style="color: white; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">Select Your Car</h2>
        <div style="text-align: center;">
          <h3 id="carTitle" style="color: white; font-size: 28px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);"></h3>
          <div id="carCounter" style="color: #ccc; font-size: 16px; margin-top: 5px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);"></div>
        </div>
      </div>
    </div>
    
    <!-- Left Navigation Button -->
    <button id="leftBtn" style="
      position: absolute;
      left: 30px;
      top: 50%;
      transform: translateY(-50%);
      padding: 20px 25px;
      font-size: 48px;
      background-color: rgba(0, 0, 0, 0.3);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.3s;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      z-index: 20;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    ">‹</button>
    
    <!-- Right Side Car Details Panel -->
    <div id="carDetailsPanel" style="
      position: absolute;
      right: 0;
      top: 0;
      width: 400px;
      height: 100%;
      background: linear-gradient(270deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 70%, transparent 100%);
      padding: 40px 30px;
      overflow-y: auto;
      z-index: 15;
      backdrop-filter: blur(15px);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
    ">
      <div style="color: white;">
        <h2 id="detailCarName" style="font-size: 28px; margin: 0 0 10px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">Ferrari</h2>
        <h3 id="detailCarModel" style="font-size: 20px; margin: 0 0 20px 0; color: #ccc; font-weight: 300; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">F8 Tributo</h3>
        
        <div id="detailDescription" style="
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 30px;
          color: #e0e0e0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
          border-left: 3px solid #000000ff;
          padding-left: 15px;
        ">
          The Ferrari F8 Tributo is a masterpiece of Italian engineering, delivering exceptional performance with its twin-turbocharged V8 engine.
        </div>
        
        <div style="margin-top: 30px;">
          <h4 style="font-size: 20px; margin: 0 0 20px 0; color: #ffffffff; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Specifications</h4>
          <div id="detailSpecs" style="display: flex; flex-direction: column; gap: 12px;">
            <!-- Specs will be populated dynamically -->
          </div>
        </div>
      </div>
    </div>
    <!-- Right Navigation Button -->
    <button id="rightBtn" style="
      position: absolute;
      right: 420px;
      top: 50%;
      transform: translateY(-50%);
      padding: 20px 25px;
      font-size: 48px;
      background-color: rgba(0, 0, 0, 0.3);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.3s;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      z-index: 20;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    ">›</button>
    
    <!-- Bottom UI Overlay -->
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 40px;
      background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
      z-index: 10;
    ">
      <div style="display: flex; gap: 20px; justify-content: center; align-items: center;">
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
        
        <div id="videoStatus" style="color: white; font-size: 16px; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);"></div>
        
        <button id="next" style="
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
        ">Next</button>
      </div>
    </div>
  </div>
  `;

  document.body.appendChild(showCar);

  const carVideo = document.getElementById('carVideo');
  const videoSource = document.getElementById('videoSource');
  const carTitle = document.getElementById('carTitle');
  const carCounter = document.getElementById('carCounter');
  const videoStatus = document.getElementById('videoStatus');
  const videoLoader = document.getElementById('videoLoader');
  const nextButton = document.getElementById('next');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  

  // Function to show loading state
  function showLoading() {
    videoLoader.style.opacity = '1';
    carVideo.style.opacity = '0.3';
  }

  // Function to hide loading state
  function hideLoading() {
    videoLoader.style.opacity = '0';
    carVideo.style.opacity = '1';
  }

function updateCarDetails(car) {
    if (!car) {
        console.error('No car data provided to updateCarDetails');
        return;
    }

    const elements = {
        'detailCarName': car.name || 'Unknown',
        'detailCarModel': car.model || 'Unknown', 
        'detailDescription': car.description || 'No description available'
    };

    // Update text elements
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            // console.error(`Element with ID "${id}" not found`);
        }
    }

    // Handle specs separately since it uses innerHTML
    const specsContainer = document.getElementById('detailSpecs');
    if (!specsContainer) {
        // console.error('Element with ID "detailSpecs" not found');
        return;
    }
    
    // Clear existing specs
    specsContainer.innerHTML = '';
    
    // Check if car has specs and it's an object
    if (!car.specs || typeof car.specs !== 'object') {
        console.warn('No specs found for car:', car.name);
        const noSpecsMessage = document.createElement('div');
        noSpecsMessage.textContent = 'No specifications available';
        noSpecsMessage.style.cssText = `
            color: #ccc;
            font-size: 14px;
            text-align: center;
            padding: 20px 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        `;
        specsContainer.appendChild(noSpecsMessage);
        return;
    }
    
    // Create specification items
    Object.entries(car.specs).forEach(([key, value]) => {
      const specItem = document.createElement('div');
      specItem.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      `;
      
      const specLabel = document.createElement('span');
      specLabel.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      specLabel.style.cssText = `
        color: #ccc;
        font-size: 14px;
        flex: 1;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      `;
      
      const specValue = document.createElement('span');
      specValue.textContent = value || 'N/A';
      specValue.style.cssText = `
        color: white;
        font-size: 14px;
        font-weight: 500;
        text-align: right;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      `;
      
      specItem.appendChild(specLabel);
      specItem.appendChild(specValue);
      
      // Only append if specsContainer still exists
      if (specsContainer && specsContainer.parentNode) {
        specsContainer.appendChild(specItem);
      }
    });
  }

  function loadVideo(videoPath, carName) {
    showLoading();
    videoStatus.textContent = "";
    
    // Clear current video
    carVideo.pause();
    videoSource.src = "";
    carVideo.load();
    
    // Set new video source
    videoSource.src = videoPath;
    
    // Handle different video formats
    if (videoPath.endsWith('.mkv')) {
      videoSource.type = "video/x-matroska";
    } else if (videoPath.endsWith('.mp4')) {
      videoSource.type = "video/mp4";
    } else if (videoPath.endsWith('.webm')) {
      videoSource.type = "video/webm";
    }
    
    carVideo.load();
    
    // Add event listeners for video loading
    carVideo.addEventListener('loadstart', () => {
      videoStatus.textContent = "";
    });
    
    carVideo.addEventListener('canplay', () => {
      hideLoading();
      videoStatus.textContent = "";
      carVideo.play().catch(err => {
        console.log('Video autoplay failed:', err);
        videoStatus.textContent = "";
        hideLoading();
      });
    });
    
    carVideo.addEventListener('error', (e) => {
      console.error('Video error:', e);
      videoStatus.textContent = "";
      hideLoading();
    });
    
    carVideo.addEventListener('loadeddata', () => {
      videoStatus.textContent = "";
    });
  }

  // Function to update car display
  function updateCarDisplay() {
    // Add safety check for carData
    if (!carData || carData.length === 0) {
        console.error('No car data available');
        return;
    }
    
    // Ensure currentCarIndex is within bounds
    if (currentCarIndex < 0 || currentCarIndex >= carData.length) {
        console.error('Invalid car index:', currentCarIndex);
        currentCarIndex = 0;
    }
    
    const currentCar = carData[currentCarIndex];
    if (!currentCar) {
        console.error('No car found at index:', currentCarIndex);
        return;
    }
    
    selectedCar = currentCar.id;
    
    // Update title and counter
    if (carTitle) carTitle.textContent = currentCar.name || 'Unknown Car';
    if (carCounter) carCounter.textContent = `${currentCarIndex + 1} / ${carData.length}`;
    
    // Update car details panel
    updateCarDetails(currentCar);
    
    // Update navigation buttons
    if (leftBtn) {
        leftBtn.style.opacity = currentCarIndex === 0 ? '0.3' : '0.7';
        leftBtn.style.pointerEvents = currentCarIndex === 0 ? 'none' : 'auto';
    }
    
    if (rightBtn) {
        rightBtn.style.opacity = currentCarIndex === carData.length - 1 ? '0.3' : '0.7';
        rightBtn.style.pointerEvents = currentCarIndex === carData.length - 1 ? 'none' : 'auto';
    }
    
    // Load the video
    if (currentCar.video) {
        loadVideo(currentCar.video, currentCar.name);
    } else {
        console.warn('No video found for car:', currentCar.name);
    }
  }

  // Left button functionality
  leftBtn.addEventListener('click', () => {
    if (currentCarIndex > 0) {
      currentCarIndex--;
      updateCarDisplay();
    }
  });

  // Right button functionality
  rightBtn.addEventListener('click', () => {
    if (currentCarIndex < carData.length - 1) {
      currentCarIndex++;
      updateCarDisplay();
    }
  });

  // Add hover effects for navigation buttons
  [leftBtn, rightBtn].forEach(btn => {
    btn.addEventListener('mouseenter', (e) => {
      if (e.target.style.pointerEvents !== 'none') {
        e.target.style.transform = 'translateY(-50%) scale(1.1)';
        e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
      }
    });
    
    btn.addEventListener('mouseleave', (e) => {
      e.target.style.transform = 'translateY(-50%) scale(1)';
      e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
  });

  // Add hover effects for back and next buttons
  document.getElementById("back").addEventListener('mouseenter', (e) => {
    e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
  });
  
  document.getElementById("back").addEventListener('mouseleave', (e) => {
    e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
  });
  
  document.getElementById("next").addEventListener('mouseenter', (e) => {
    e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
  });
  
  document.getElementById("next").addEventListener('mouseleave', (e) => {
    e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && currentCarIndex > 0) {
      currentCarIndex--;
      updateCarDisplay();
    } else if (e.key === 'ArrowRight' && currentCarIndex < carData.length - 1) {
      currentCarIndex++;
      updateCarDisplay();
    }
  });

  // Back button functionality
  document.getElementById("back").addEventListener("click", () => {
    // Stop video before removing
    carVideo.pause();
    showCar.remove();
    showPlayButton();
  });
  
  // Next button functionality
  nextButton.addEventListener("click", () => {
    if (selectedCar) {
      // Stop video before removing
      carVideo.pause();
      showCar.remove();
      selectMap();
    }
  });

  // Initialize the first car
  updateCarDisplay();
}