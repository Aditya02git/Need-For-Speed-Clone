// countdown.js
export function showCountdown() {
  // Create countdown overlay
  const countdownOverlay = document.createElement('div');
  countdownOverlay.id = 'countdown-overlay';
  countdownOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    font-family: Arial, sans-serif;
    color: white;
    font-size: 120px;
    font-weight: bold;
    text-shadow: 
      -2px -2px 0 #000,
      2px -2px 0 #000,
      -2px 2px 0 #000,
      2px 2px 0 #000,
      0 0 10px rgba(0,0,0,0.8);
    pointer-events: none;
    transition: transform 0.3s ease-out;
  `;
  document.body.appendChild(countdownOverlay);

  // Countdown function
  let count = 10;
  const countdownTexts = ['10','9','8','7','6','5', '4', '3', '2', '1', 'GO!'];
  
  function updateCountdown() {
    if (count >= 0) {
      countdownOverlay.textContent = countdownTexts[10 - count];
      
      // Add animation effect
      countdownOverlay.style.transform = 'scale(1.2)';
      countdownOverlay.style.opacity = '1';
      
      setTimeout(() => {
        countdownOverlay.style.transform = 'scale(1)';
      }, 100);
      
      if (count === 0) {
        // Show "GO!" for a brief moment then remove overlay
        setTimeout(() => {
          countdownOverlay.remove();
        }, 500);
      } else {
        count--;
        setTimeout(updateCountdown, 1000);
      }
    }
  }
  
  updateCountdown();
}