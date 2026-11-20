import * as THREE from "three";
import RAPIER from '@dimforge/rapier3d-compat';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { GuiControls } from './systems/GuiControls.js';

import { Camera } from './components/Camera.js';
import { Classroom } from './components/Classroom.js';
import { OrangeRoom } from './components/OrangeRoom.js';

import { Renderer } from './systems/Renderer.js';
import { Resizer } from './systems/Resizer.js';

// These variables are module-scoped: we cannot access them
// from outside the module
let camera;
let renderer;
let controls;
let resizer;
let guiControls;
let current; // cena atual: { scene, update, cameraPos, cameraTarget, dispose }

class World {
  constructor(container) {
    camera = Camera.create();
    renderer = Renderer.create();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.append(renderer.domElement);
    resizer = new Resizer(container, camera, renderer);

    // Permite controle da camera com mouse e teclado
    controls = new OrbitControls(camera, renderer.domElement);
    controls.listenToKeyEvents(window);

    // Mostra controle de propriedades na tela (dat.GUI)
    guiControls = new GuiControls();

    this.clock = new THREE.Clock();
  }

  // Rapier é WASM: precisa ser inicializado de forma assíncrona antes de criar o mundo físico
  async init() {
    await RAPIER.init();
    RectAreaLightUniformsLib.init();

    document.querySelectorAll('#ui button').forEach((b) =>
      b.addEventListener('click', () => this.loadScene(Number(b.dataset.scene))));

    const initial = Number(new URLSearchParams(location.search).get('scene')) || 1;
    this.loadScene(initial);
  }

  loadScene(n) {
    current?.dispose();
    current = (n === 2)
      ? OrangeRoom.create({ renderer })
      : Classroom.create({ RAPIER });

    camera.far = 50;
    camera.position.copy(current.cameraPos);
    controls.target.copy(current.cameraTarget);
    controls.update();
    camera.updateProjectionMatrix();

    // dat.GUI não aceita pastas repetidas: a de câmera é criada só uma vez
    if (!this.cameraFolderAdded) {
      guiControls.addCameraFolder(camera, controls);
      this.cameraFolderAdded = true;
    }
    try { guiControls.addSceneFolder(current.scene); } catch (e) { /* pasta já existe */ }
  }

  render() {
    renderer.setAnimationLoop(() => {
      current.update(this.clock.getDelta(), this.clock.elapsedTime);
      controls.update();
      renderer.render(current.scene, camera);
    });
  }
}

export { World };