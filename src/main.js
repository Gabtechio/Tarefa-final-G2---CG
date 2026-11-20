import { World } from './World/World.js';

async function main() {
  // Get a reference to the container element
  const container = document.querySelector('#scene-container');

  // 1. Create an instance of the World app
  const world = new World(container);

  // 2. Inicializa o Rapier (WASM) e carrega a cena inicial
  await world.init();

  // 3. Start the animation loop
  world.render();
}

main();
