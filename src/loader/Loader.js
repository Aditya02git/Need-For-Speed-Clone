export default class Loader {
    constructor(totalItems = 1, title = 'Loading...') {
        this.totalItems = totalItems;
        this.loadedItems = 0;
        this.title = title;
        this.isVisible = false;
        this.onComplete = null;
        
        // LoadingComponent style configuration
        this.colors = {
            primary: '#FFDF00',
            secondary: '#FFD700', 
            tertiary: '#B8860B',
            quaternary: '#DAA520'
        };
        this.animationDuration = '3s';
        this.size = '60px';
        
        // Random text set for loading messages
        this.textSet = [
            'Just a moment...',
            'Almost there...',
            'Finalizing details...',
        ];
        
        this.createLoader();
    }

    getRandomText() {
        const randomIndex = Math.floor(Math.random() * this.textSet.length);
        return this.textSet[randomIndex];
    }

    createLoader() {
        // Create loader overlay
        this.loaderOverlay = document.createElement('div');
        this.loaderOverlay.id = 'model-loader';
        this.loaderOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
            color: white;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Create custom loading spinner (LoadingComponent style)
        this.loadingSpinner = document.createElement('div');
        this.loadingSpinner.className = 'custom-loader-enhanced';
        
        const spinnerItem = document.createElement('section');
        spinnerItem.className = 'custom-loader-item-enhanced';
        this.loadingSpinner.appendChild(spinnerItem);

        // Add CSS animation if not already added
        if (!document.getElementById('loader-styles')) {
            const style = document.createElement('style');
            style.id = 'loader-styles';
            style.textContent = `
                .custom-loader-enhanced {
                    height: ${this.size};
                    aspect-ratio: 1;
                    box-sizing: border-box;
                    transform: rotate(45deg);
                    display: grid;
                    place-content: center;
                    mask: conic-gradient(#000 0 10%), conic-gradient(#000 0 0) content-box exclude;
                    overflow: hidden;
                    margin-bottom: 30px;
                }
                
                .custom-loader-enhanced:before {
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
                
                .custom-loader-item-enhanced {
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
                
                @keyframes custom-loader-spin {
                    to {
                        rotate: 1turn;
                    }
                }
                
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
                
                @keyframes text-fade {
                    0% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
                
                .loader-pulse {
                    animation: pulse 1.5s ease-in-out infinite;
                }

                .random-loading-text {
                    animation: text-fade 2s ease-in-out infinite alternate;
                    margin-bottom: 15px;
                    font-size: 16px;
                    opacity: 0.8;
                }
            `;
            document.head.appendChild(style);
        }

        // Create random loading text
        this.randomText = document.createElement('div');
        this.randomText.className = 'random-loading-text';
        this.randomText.style.cssText = `
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: 400;
            opacity: 0.8;
        `;
        this.randomText.textContent = this.getRandomText();

        // Create loading text (main title)
        this.loadingText = document.createElement('div');
        this.loadingText.style.cssText = `
            font-size: 18px;
            margin-bottom: 20px;
            font-weight: 500;
        `;
        this.loadingText.textContent = this.title;

        // Create progress bar container
        this.progressContainer = document.createElement('div');
        this.progressContainer.style.cssText = `
            width: 300px;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
        `;

        // Create progress bar with LoadingComponent colors
        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, ${this.colors.primary}, ${this.colors.secondary}, ${this.colors.tertiary});
            border-radius: 4px;
            transition: width 0.4s ease;
            box-shadow: 0 0 10px rgba(255, 223, 0, 0.4);
        `;

        // Create progress percentage
        this.progressText = document.createElement('div');
        this.progressText.style.cssText = `
            font-size: 14px;
            opacity: 0.8;
            font-weight: 300;
            margin-bottom: 10px;
        `;
        this.progressText.textContent = '0%';

        // Create details text (optional)
        this.detailsText = document.createElement('div');
        this.detailsText.style.cssText = `
            font-size: 12px;
            opacity: 0.6;
            text-align: center;
        `;
        this.detailsText.textContent = `Loading ${this.totalItems} items...`;

        // Assemble loader
        this.progressContainer.appendChild(this.progressBar);
        this.loaderOverlay.appendChild(this.loadingSpinner);
        this.loaderOverlay.appendChild(this.randomText);
        this.loaderOverlay.appendChild(this.loadingText);
        this.loaderOverlay.appendChild(this.progressContainer);
        this.loaderOverlay.appendChild(this.progressText);
        this.loaderOverlay.appendChild(this.detailsText);
    }

    show() {
        if (!this.isVisible) {
            document.body.appendChild(this.loaderOverlay);
            this.isVisible = true;
            // Trigger fade in
            setTimeout(() => {
                this.loaderOverlay.style.opacity = '1';
            }, 10);
            
            // Update random text periodically
            this.textInterval = setInterval(() => {
                if (this.isVisible && this.randomText) {
                    this.randomText.textContent = this.getRandomText();
                }
            }, 3000); // Change every 3 seconds
        }
    }

    hide() {
        if (this.isVisible) {
            this.loaderOverlay.style.opacity = '0';
            
            // Clear text interval
            if (this.textInterval) {
                clearInterval(this.textInterval);
                this.textInterval = null;
            }
            
            setTimeout(() => {
                if (this.loaderOverlay && this.loaderOverlay.parentNode) {
                    this.loaderOverlay.parentNode.removeChild(this.loaderOverlay);
                    this.isVisible = false;
                }
            }, 300);
        }
    }

    updateProgress(increment = 1, itemName = '') {
        this.loadedItems += increment;
        const progress = Math.min((this.loadedItems / this.totalItems) * 100, 100);
        
        // Update progress bar
        this.progressBar.style.width = `${progress}%`;
        this.progressText.textContent = `${Math.round(progress)}%`;
        
        // Update details if item name provided
        if (itemName) {
            this.detailsText.textContent = `Loaded: ${itemName}`;
        } else {
            this.detailsText.textContent = `${this.loadedItems}/${this.totalItems} items loaded`;
        }
        
        // Check if complete
        if (this.loadedItems >= this.totalItems) {
            this.complete();
        }
    }

    complete() {
        this.loadingText.textContent = 'Complete!';
        this.detailsText.textContent = 'All models loaded successfully';
        this.randomText.textContent = 'Ready to go!';
        this.loadingSpinner.style.display = 'none';
        
        // Clear text interval
        if (this.textInterval) {
            clearInterval(this.textInterval);
            this.textInterval = null;
        }
        
        // Call completion callback if provided
        if (this.onComplete && typeof this.onComplete === 'function') {
            this.onComplete();
        }
        
        // Auto-hide after short delay
        setTimeout(() => {
            this.hide();
        }, 800);
    }

    setTitle(title) {
        this.title = title;
        if (this.loadingText) {
            this.loadingText.textContent = title;
        }
    }

    setDetails(details) {
        if (this.detailsText) {
            this.detailsText.textContent = details;
        }
    }

    setProgress(percentage) {
        const clampedProgress = Math.max(0, Math.min(100, percentage));
        this.progressBar.style.width = `${clampedProgress}%`;
        this.progressText.textContent = `${Math.round(clampedProgress)}%`;
    }

    setOnComplete(callback) {
        this.onComplete = callback;
    }

    isComplete() {
        return this.loadedItems >= this.totalItems;
    }

    reset() {
        this.loadedItems = 0;
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '0%';
        this.loadingText.textContent = this.title;
        this.detailsText.textContent = `Loading ${this.totalItems} items...`;
        this.loadingSpinner.style.display = 'block';
        this.randomText.textContent = this.getRandomText();
        
        // Restart text interval if loader is visible
        if (this.isVisible && !this.textInterval) {
            this.textInterval = setInterval(() => {
                if (this.isVisible && this.randomText) {
                    this.randomText.textContent = this.getRandomText();
                }
            }, 3000);
        }
    }

    cleanup() {
        // Clear text interval
        if (this.textInterval) {
            clearInterval(this.textInterval);
            this.textInterval = null;
        }
        
        this.hide();
        // Remove styles if no other loaders exist
        const existingLoaders = document.querySelectorAll('[id^="model-loader"]');
        if (existingLoaders.length <= 1) {
            const styles = document.getElementById('loader-styles');
            if (styles) {
                styles.remove();
            }
        }
    }
}