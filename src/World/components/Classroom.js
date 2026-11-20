import * as THREE from 'three';
import { Scene } from './Scene.js';
import { Light } from './Light.js';
import { Primitives } from './Primitives.js';
import { TubeLight } from './TubeLight.js';
import { Blind } from './Blind.js';

const { material: mat, box, plane } = Primitives;

// CENA OBRIGATÓRIA (70%): sala branca com parede escura, janelas, cortina animada (Rapier),
// ar-condicionado, sofá com almofadas, poltrona, planta e luminária feita do zero.
class Classroom {
  static create({ RAPIER }) {
    const scene = Scene.create();
    Scene.setBackgroundColor(scene, 0x20232a);
    const white = mat(0xf2f2f0);

    // ---- Sala (5 x 3.2 x 4) ----
    scene.add(plane(5, 4, mat(0xffffff, { map: Primitives.tileTexture(8, 6), roughness: 0.35 }), [0, 0, 0], [-Math.PI / 2, 0, 0]));
    scene.add(plane(5, 4, mat(0xdcdcd8, { roughness: 1 }), [0, 3.2, 0], [Math.PI / 2, 0, 0]));
    scene.add(plane(5, 3.2, white, [0, 1.6, -2]));
    scene.add(plane(4, 3.2, white, [-2.5, 1.6, 0], [0, Math.PI / 2, 0]));
    scene.add(plane(4, 3.2, mat(0x1b1f26), [2.5, 1.6, 0], [0, -Math.PI / 2, 0])); // parede escura

    // ---- Janelas (3 vãos) ----
    const frame = mat(0xffffff);
    const glass = mat(0x14171c, { roughness: 0.1, metalness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const x = -1.9 + i * 0.95;
      scene.add(box(0.9, 1.3, 0.03, glass, x, 1.55, -1.97));
      scene.add(box(0.9, 0.04, 0.06, frame, x, 1.55, -1.95));
      for (const dx of [-0.45, 0.45]) scene.add(box(0.04, 1.3, 0.06, frame, x + dx, 1.55, -1.95));
      scene.add(box(0.94, 0.04, 0.06, frame, x, 0.9, -1.95));
      scene.add(box(0.94, 0.04, 0.06, frame, x, 2.2, -1.95));
    }

    // ---- Ar-condicionado ----
    const ac = new THREE.Group();
    ac.add(box(1.0, 0.3, 0.25, mat(0xe8dcc0)));
    ac.add(box(0.8, 0.06, 0.02, mat(0x333333), -0.05, -0.1, 0.13));
    ac.position.set(-1.5, 2.55, -1.85);
    scene.add(ac);

    // ---- Cortina com Rapier ----
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const blind = Blind.create(RAPIER, world, {
      x: -0.95, z: -1.9, width: 1.8, topY: 2.35, minY: 0.95, maxY: 2.25,
    });
    scene.add(blind.group);

    // ---- Luminária + iluminação ----
    const lamp = TubeLight.create(1.6);
    lamp.position.set(1.0, 3.1, -0.4);
    scene.add(lamp);
    scene.add(Light.createAmbientLight(0xffffff, 0.35));

    // ---- Sofá preto + almofadas ----
    const black = mat(0x0e0e10, { roughness: 0.45 });
    const sofa = new THREE.Group();
    sofa.add(box(2.4, 0.4, 0.9, black, 0, 0.25, 0));
    sofa.add(box(2.4, 0.45, 0.2, black, 0, 0.6, -0.35));
    for (const dx of [-1.15, 1.15]) sofa.add(box(0.15, 0.6, 0.9, black, dx, 0.4, 0));
    [[0xb28cf0, -0.8, 0.55, 0.3], [0xe83f9b, -0.15, 0.62, 0.1], [0x7cc4f2, 0.25, 0.63, -0.1],
     [0xf5a58f, 0.6, 0.62, 0.15], [0xf5a58f, 0.45, 0.68, -0.2]].forEach(([c, x, y, rz]) => {
      const p = box(0.4, 0.4, 0.1, mat(c), x, y, -0.15);
      p.rotation.z = rz;
      sofa.add(p);
    });
    sofa.position.set(-1.0, 0, -1.4);
    scene.add(sofa);

    // ---- Poltrona marrom ----
    const brown = mat(0x4a2f22, { roughness: 1 });
    const chair = new THREE.Group();
    chair.add(box(0.9, 0.35, 0.8, brown, 0, 0.3, 0));
    chair.add(box(0.9, 0.5, 0.2, brown, 0, 0.65, -0.3));
    for (const dx of [-0.4, 0.4]) chair.add(box(0.15, 0.55, 0.8, brown, dx, 0.45, 0));
    chair.position.set(1.8, 0, -1.3);
    chair.rotation.y = -0.3;
    scene.add(chair);

    // ---- Planta no vaso ----
    const plant = new THREE.Group();
    plant.add(box(0.4, 0.5, 0.4, mat(0xffffff), 0, 0.25, 0));
    plant.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 8), mat(0x4b3621)).translateY(1.0));
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), mat(0x3d7a3a));
      leaf.position.set(Math.sin(i * 1.7) * 0.25, 1.1 + (i % 3) * 0.2, Math.cos(i * 1.7) * 0.25);
      leaf.castShadow = true;
      plant.add(leaf);
    }
    plant.position.set(0.9, 0, -1.6);
    scene.add(plant);

    return {
      scene,
      update: (dt, t) => blind.update(t),
      cameraPos: new THREE.Vector3(0.8, 1.5, 1.9),
      cameraTarget: new THREE.Vector3(-0.3, 1.4, -1.8),
      dispose: () => { Primitives.dispose(scene); world.free(); },
    };
  }
}

export { Classroom };
