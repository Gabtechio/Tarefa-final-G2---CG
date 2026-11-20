import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Scene } from './Scene.js';
import { Light } from './Light.js';
import { Primitives } from './Primitives.js';

const { material: mat, box, plane } = Primitives;

// OPÇÃO 2 (30%): sala laranja com degraus, janelão, fita de LED, piso e puff.
// Fora do escopo (enunciado): parte da mesa à esquerda e as almofadas grandes.
class OrangeRoom {
  static create({ renderer }) {
    const scene = Scene.create();
    Scene.setBackgroundColor(scene, 0x1a1a1a);

    // Ambiente suave só para reflexos nos materiais lisos (teto/piso)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;

    const orange = mat(0xd9561a, { roughness: 0.6 });
    const ceilingMat = mat(0xd9561a, { roughness: 0.18, metalness: 0.1 }); // brilhante: reflexo da fita de LED
    const W = 6, D = 5, H = 3;

    scene.add(plane(W, D, mat(0xffffff, { map: Primitives.tileTexture(8, 7), roughness: 0.25 }), [0, 0, 0], [-Math.PI / 2, 0, 0]));
    scene.add(plane(W, D, ceilingMat, [0, H, 0], [Math.PI / 2, 0, 0]));
    scene.add(plane(W, H, orange, [0, H / 2, -D / 2]));
    scene.add(plane(D, H, orange, [W / 2, H / 2, 0], [0, -Math.PI / 2, 0]));
    scene.add(plane(D, H, orange, [-W / 2, H / 2, 0], [0, Math.PI / 2, 0]));

    // ---- Janela 4 x 2 painéis ----
    const frame = mat(0xffffff);
    const glass = mat(0x15181d, { roughness: 0.08, metalness: 0.5 });
    const wx = -0.3, wy = 1.7, ww = 3.4, wh = 1.0, z = -D / 2 + 0.02;
    scene.add(box(ww, wh, 0.03, glass, wx, wy, z));
    for (let i = 0; i <= 4; i++) scene.add(box(0.05, wh, 0.06, frame, wx - ww / 2 + (ww / 4) * i, wy, z + 0.02));
    for (let j = 0; j <= 2; j++) scene.add(box(ww, 0.05, 0.06, frame, wx, wy - wh / 2 + (wh / 2) * j, z + 0.02));

    // ---- Degraus: polígonos (x, z) extrudados ----
    const step = (points, height, material) => {
      const shape = new THREE.Shape(points.map(([x, zz]) => new THREE.Vector2(x, -zz)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2); // shape.y -> -z ; profundidade -> altura
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    scene.add(step([[-3, -2.5], [2.6, -2.5], [2.6, -0.2], [1.2, -0.2], [-0.9, -0.9], [-3, -0.9]], 0.4, mat(0xb5491a, { roughness: 0.5 })));
    scene.add(step([[-3, -2.5], [2.6, -2.5], [2.6, -1.4], [2.2, -1.0], [-0.6, -1.0], [-1.0, -1.4], [-3, -1.4]], 0.8, orange));

    // Almofadas pequenas sobre o degrau alto
    const cushion = mat(0xc4501f, { roughness: 1 });
    [[-1.6, 0.35], [0.35, 0.4], [1.2, 0.4]].forEach(([x, w]) => scene.add(box(w + 0.45, 0.07, 0.4, cushion, x, 0.835, -2.2)));

    // ---- Puff cinza ----
    const pouf = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 40), mat(0x8f95a3, { roughness: 1 }));
    pouf.position.set(-2.0, 0.27, 0.3);
    pouf.castShadow = pouf.receiveShadow = true;
    scene.add(pouf);

    // ---- Fita de LED na junção parede/teto ----
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.2, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xfff1cc, emissive: 0xffe2a0, emissiveIntensity: 3 })
    );
    led.position.set(0, H - 0.15, -D / 2 + 0.1);
    scene.add(led);

    const strip = new THREE.RectAreaLight(0xffe2a0, 5, W - 0.2, 0.05);
    strip.position.copy(led.position);
    strip.lookAt(0, 0, -D / 2 + 1);
    scene.add(strip);

    const key = new THREE.PointLight(0xffe8c8, 10, 10);
    key.position.set(0, H - 0.4, 0);
    key.castShadow = true;
    scene.add(key, Light.createAmbientLight(0xffffff, 0.3));

    return {
      scene,
      update: () => {},
      cameraPos: new THREE.Vector3(0.3, 1.3, 2.2),
      cameraTarget: new THREE.Vector3(0, 1.0, -2),
      dispose: () => { Primitives.dispose(scene); pmrem.dispose(); },
    };
  }
}

export { OrangeRoom };
