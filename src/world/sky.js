import * as THREE from "three";
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

export class Background extends THREE.Mesh {
  constructor(renderer) {
    super(
      new THREE.SphereGeometry(1500),
      new THREE.MeshBasicMaterial({
        fog: false,
        side: THREE.BackSide,
        map: (() => {
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
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

          return tex;
        })()
      })
    );

    // Create the sun lensflare
    this.createSun();
  }

  createSun() {
    let textureLoader = new THREE.TextureLoader();
    const textureFlare0 = textureLoader.load(
      "https://threejs.org/examples/textures/lensflare/lensflare0.png"
    );
    const textureFlare3 = textureLoader.load(
      "https://threejs.org/examples/textures/lensflare/lensflare3.png"
    );
    
    this.lensflare = new Lensflare();
    this.lensflare.addElement(new LensflareElement(textureFlare0, 300, 0));
    this.lensflare.addElement(new LensflareElement(textureFlare3, 100, 0.4));
    this.lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
    this.lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
    this.lensflare.addElement(new LensflareElement(textureFlare3, 512, 0));
    this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 1));
    
    // Position the sun higher in the sky
    this.lensflare.position.set(1, 1, -1).setLength(700);
  }

  // Method to add the sun to the scene (call this from your main script)
  addSunToScene(scene) {
    if (this.lensflare) {
      scene.add(this.lensflare);
    }
  }
}