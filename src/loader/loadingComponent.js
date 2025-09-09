export class LoadingComponent {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.position = { right: '50px', bottom: '600px' };
    this.size = '50px';
    this.colors = options.colors || {
      primary: '#FFDF00',
      secondary: '#FFD700', 
      tertiary: '#B8860B',
      quaternary: '#DAA520'
    };
    this.animationDuration = options.animationDuration || '3s';
    this.loader = null;
    this.textElement = null;
    this.isVisible = false;
    
    // Text options
    this.textSet = options.textSet || [
      'For Drifting Press W, A or D and SPACE ..',
      'Press L for Front Light ..',
      'Follow the A,B,C,D.... marks for completing the race , cheating will not work ..',
      'AI Police car can damage your car & reduce your health ..',
      'Try to get out of the AI Helicopter shooting Range ..',
      'Heads up! This was built by just one developer, so there might be a few bugs here and there. Appreciate your support and feedback!',
      'Press F to toggle wireframe of your car ...',
    ];
    this.textStyles = options.textStyles || {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal'
    };
    this.showText = options.showText !== false; // Default to true
  }

  // Get random text from the text set
  getRandomText() {
    const randomIndex = Math.floor(Math.random() * this.textSet.length);
    return this.textSet[randomIndex];
  }

  // Create the loader element structure
  createElement() {
    // Main loader container
    const loader = document.createElement('div');
    loader.className = 'custom-loader';
    
    // Item element
    const item = document.createElement('section');
    item.className = 'custom-loader-item';
    
    loader.appendChild(item);
    return loader;
  }

  // Create the text element
  createTextElement() {
    const textElement = document.createElement('div');
    textElement.className = 'custom-loader-text';
    textElement.textContent = this.getRandomText();
    return textElement;
  }

  // Inject CSS styles
  injectStyles() {
    if (document.getElementById('loading-component-styles')) {
      return; // Styles already injected
    }

    const style = document.createElement('style');
    style.id = 'loading-component-styles';
    style.textContent = `
      .custom-loader {
        height: ${this.size};
        aspect-ratio: 1;
        box-sizing: border-box;
        position: fixed;
        right: ${this.position.right};
        top: ${this.position.bottom};
        transform: rotate(45deg);
        display: grid;
        place-content: center;
        mask: conic-gradient(#000 0 10%), conic-gradient(#000 0 0) content-box exclude;
        overflow: hidden;
        z-index: 9999;
      }
      
      .custom-loader:before {
        content: "";
        position: absolute;
        inset: 0;
        transform: scale(1.5);
        background: linear-gradient(
          0,
          transparent 0%,
          transparent 10%,
          transparent 40%,
          ${this.colors.quaternary} 50%,
          ${this.colors.primary} 60%,
          ${this.colors.tertiary} 60%
        );
        filter: blur(8px);
        animation: custom-loader-spin ${this.animationDuration} linear infinite;
      }
      
      @keyframes custom-loader-spin {
        to {
          rotate: 1turn;
        }
      }
      
      .custom-loader-item {
        background: linear-gradient(45deg, 
          ${this.colors.primary}, 
          ${this.colors.secondary}, 
          ${this.colors.tertiary}, 
          ${this.colors.quaternary}, 
          ${this.colors.tertiary}
        );
        height: 5px;
        width: 5px;
        border: 5px solid #000;
        box-shadow: inset -8px -8px 0 black, inset 8px 8px 0 black;
        aspect-ratio: 1;
        z-index: 2;
        filter: unset;
        position: relative;
      }

      .custom-loader-text {
        position: fixed;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        font-size: ${this.textStyles.fontSize};
        color: ${this.textStyles.color};
        font-family: ${this.textStyles.fontFamily};
        font-weight: ${this.textStyles.fontWeight};
        text-align: center;
        white-space: nowrap;
        animation: custom-loader-text-fade 2s ease-in-out infinite alternate;
      }

      @keyframes custom-loader-text-fade {
        0% { opacity: 0.6; }
        100% { opacity: 1; }
      }
    `;
    
    document.head.appendChild(style);
  }

  // Show the loader
  show() {
    if (this.isVisible) return;
    
    this.injectStyles();
    this.loader = this.createElement();
    this.container.appendChild(this.loader);
    
    if (this.showText) {
      this.textElement = this.createTextElement();
      this.container.appendChild(this.textElement);
    }
    
    this.isVisible = true;
  }

  // Hide the loader
  hide() {
    if (!this.isVisible) return;
    
    if (this.loader) {
      this.loader.remove();
      this.loader = null;
    }
    
    if (this.textElement) {
      this.textElement.remove();
      this.textElement = null;
    }
    
    this.isVisible = false;
  }

  // Toggle loader visibility
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // Update position (for the spinner only)
  setPosition(position) {
    this.position = { ...this.position, ...position };
    if (this.isVisible && this.loader) {
      this.loader.style.right = this.position.right;
      this.loader.style.top = this.position.top;
    }
  }

  // Update colors
  setColors(colors) {
    this.colors = { ...this.colors, ...colors };
    if (this.isVisible) {
      this.hide();
      this.show();
    }
  }

  // Update text set
  setTextSet(textSet) {
    this.textSet = textSet;
    if (this.isVisible && this.textElement) {
      this.textElement.textContent = this.getRandomText();
    }
  }

  // Update text styles
  setTextStyles(textStyles) {
    this.textStyles = { ...this.textStyles, ...textStyles };
    if (this.isVisible) {
      this.hide();
      this.show();
    }
  }

  // Change to a new random text
  updateText() {
    if (this.isVisible && this.textElement) {
      this.textElement.textContent = this.getRandomText();
    }
  }

  // Show for a specific duration then hide
  showFor(duration) {
    this.show();
    setTimeout(() => {
      this.hide();
    }, duration);
  }

  // Destroy the component and clean up
  destroy() {
    this.hide();
    const styles = document.getElementById('loading-component-styles');
    if (styles) {
      styles.remove();
    }
  }

  // Static method to create and show loader quickly
  static create(options = {}) {
    const loader = new LoadingComponent(options);
    loader.show();
    return loader;
  }
}