import resetGame from "./script";


// Function to show game over screen
export default function showGameOverScreen() {
  // Create a game over overlay
  const gameOverDiv = document.createElement("div");
  gameOverDiv.style.position = "fixed";
  gameOverDiv.style.top = "0";
  gameOverDiv.style.left = "0";
  gameOverDiv.style.width = "100%";
  gameOverDiv.style.height = "100%";
  // gameOverDiv.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; // Semi-transparent dark overlay
  gameOverDiv.style.display = "flex";
  gameOverDiv.style.justifyContent = "center";
  gameOverDiv.style.alignItems = "center";
  gameOverDiv.style.color = "white";
  gameOverDiv.style.fontSize = "48px";
  gameOverDiv.style.fontFamily = "Arial, sans-serif";
  gameOverDiv.style.zIndex = "1000";
  gameOverDiv.innerHTML = `
    <div style="text-align: center; background-color: rgba(0, 0, 0, 0.8);opacity: 0.01; padding: 40px; border-radius: 10px;">
      <h1>GAME OVER</h1>
      <p style="font-size: 24px;">You are Busted!</p>
      <button onclick="resetGame()" style="
        padding: 10px 20px;
        font-size: 20px;
        background-color: #ff4444;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 20px;
      ">Restart Game</button>
    </div>
  `;

  document.body.appendChild(gameOverDiv);
}
