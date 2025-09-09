import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
// import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

export class Background extends THREE.Mesh {
  constructor(renderer, hdrPath, exposure = 1.0) {
    // Create initial geometry with a basic material
    super(
      new THREE.SphereGeometry(2000),
      new THREE.MeshBasicMaterial({
        fog: false,
        side: THREE.BackSide,
        color: 0x87ceeb, // Temporary sky blue color while HDR loads
      })
    );

    this.renderer = renderer;
    this.hdrPath = hdrPath;
    this.exposure = exposure;

    // Set up tone mapping for HDR
    this.setupToneMapping();

    // Load HDR texture
    this.loadHDRTexture();

    // Create the sun lensflare
    // this.createSun();
  }

  setupToneMapping() {
    // Configure tone mapping for HDR
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  loadHDRTexture() {
    if (!this.hdrPath) {
      console.warn("No HDR path provided, using default gradient");
      this.createGradientTexture();
      return;
    }

    const rgbeLoader = new RGBELoader();

    rgbeLoader.load(
      this.hdrPath,
      (texture) => {
        // Configure the HDR texture
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.LinearSRGBColorSpace; // Changed for HDR
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        // Update the material with the HDR texture
        this.material.map = texture;
        this.material.color.setHex(0xffffff); // Reset color to white
        this.material.needsUpdate = true;

        console.log("HDR texture loaded successfully");
      },
      (progress) => {
        console.log(
          "HDR loading progress:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading HDR texture:", error);
        console.log("Falling back to gradient texture");
        this.createGradientTexture();
      }
    );
  }

  createGradientTexture() {
    let c = document.createElement("canvas");
    c.width = 1;
    c.height = 1024;
    let ctx = c.getContext("2d");
    let grd = ctx.createLinearGradient(0, c.height, 0, 0);
    grd.addColorStop(0.5, "white");
    grd.addColorStop(0.65, "#00bfff");
    grd.addColorStop(0.9, "#007fff");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, c.width, c.height);

    let tex = new THREE.CanvasTexture(c);
    tex.colorSpace = "srgb";
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.material.map = tex;
    this.material.color.setHex(0xffffff);
    this.material.needsUpdate = true;
  }

  //   createSun() {
  //     let textureLoader = new THREE.TextureLoader();
  //     const textureFlare0 = textureLoader.load(
  //       "https://threejs.org/examples/textures/lensflare/lensflare0.png"
  //     );
  //     const textureFlare3 = textureLoader.load(
  //       "https://threejs.org/examples/textures/lensflare/lensflare3.png"
  //     );

  // //     this.lensflare = new Lensflare();
  // //     this.lensflare.addElement(new LensflareElement(textureFlare0, 300, 0));
  // //     this.lensflare.addElement(new LensflareElement(textureFlare3, 100, 0.4));
  // //     this.lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
  // //     this.lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
  // //     this.lensflare.addElement(new LensflareElement(textureFlare3, 512, 0));
  // //     this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 1));

  // //     // Position the sun higher in the sky
  // //     this.lensflare.position.set(1, 1, -1).setLength(700);
  // //   }

  //   // Method to add the sun to the scene (call this from your main script)
  // //   addSunToScene(scene) {
  // //     if (this.lensflare) {
  // //       scene.add(this.lensflare);
  // //     }
  // //   }

  //   // Method to update HDR texture after instantiation
  updateHDRTexture(hdrPath) {
    this.hdrPath = hdrPath;
    this.loadHDRTexture();
  }

  //   // Method to adjust exposure
  setExposure(exposure) {
    this.exposure = exposure;
    this.renderer.toneMappingExposure = exposure;
  }

  // Method to get current exposure
  getExposure() {
    return this.exposure;
  }
}
