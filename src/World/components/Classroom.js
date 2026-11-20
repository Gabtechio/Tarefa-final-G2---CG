import * as THREE from 'three';
import { Scene } from './Scene.js';
import { Light } from './Light.js';
import { Primitives } from './Primitives.js';
import { TubeLight } from './TubeLight.js';
import { Blind } from './Blind.js';
import { Assets } from './Assets.js';

const { material: mat, box, plane } = Primitives;

// pseudo-aleatório determinístico (a planta fica sempre igual)
const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// CENA OBRIGATÓRIA (70%): sala branca com parede escura, janelas, cortina animada (Rapier),
// ar-condicionado, sofá com almofadas, poltrona, planta e luminária feita do zero.
// Convenção: parede das janelas em z = -2; parede escura em x = 1.9; câmera olhando para -z.
class Classroom {
  static create({ RAPIER }) {
    const scene = Scene.create();
    Scene.setBackgroundColor(scene, 0x20232a);
    const white = mat(0xf4f4f2);

    // ---- Sala (x de -2.5 a 1.9, z de -2 a 2.5, altura 3.2) ----
    const CX = -0.3, CZ = 0.25;
    scene.add(plane(4.4, 4.5, mat(0xffffff, { map: Primitives.tileTexture(7.3, 7.5), roughness: 0.3 }), [CX, 0, CZ], [-Math.PI / 2, 0, 0]));
    const ceilTex = Primitives.noiseTexture(4);
    scene.add(plane(4.4, 4.5, mat(0xffffff, { map: ceilTex, bumpMap: ceilTex, bumpScale: 2, roughness: 1 }), [CX, 3.2, CZ], [Math.PI / 2, 0, 0]));
    scene.add(plane(4.4, 3.2, white, [CX, 1.6, -2]));                                  // parede das janelas
    scene.add(plane(4.5, 3.2, white, [-2.5, 1.6, CZ], [0, Math.PI / 2, 0]));           // parede esquerda
    scene.add(box(1.0, 3.2, 0.5, white, 1.4, 1.6, -1.75));                             // pilar/quina branca
    scene.add(plane(4.0, 3.2, mat(0x181b21, { roughness: 0.9 }), [1.9, 1.6, 0.5], [0, -Math.PI / 2, 0])); // parede escura

    // ---- Janelas: 3 vãos (topo fixo + painel inferior), peitoril e friso superior ----
    const frame = mat(0xf0f0ee, { roughness: 0.5 });
    const glass = mat(0x0b0d10, { roughness: 0.1, metalness: 0.5 });
    const SILL = 1.0, MID = 1.7, TOP = 2.15, FZ = -1.95;
    const windowUnit = (x0, x1) => {
      const w = x1 - x0, cx = (x0 + x1) / 2, t = 0.05;
      scene.add(box(w, TOP - SILL, 0.03, glass, cx, (TOP + SILL) / 2, -1.98));
      scene.add(box(w, t, 0.08, frame, cx, SILL, FZ));            // base
      scene.add(box(w, t, 0.08, frame, cx, TOP, FZ));             // topo
      scene.add(box(w, t, 0.08, frame, cx, MID, FZ));             // travessa
      for (const x of [x0, x1]) scene.add(box(t, TOP - SILL, 0.08, frame, x, (TOP + SILL) / 2, FZ));
    };
    windowUnit(-2.5, -1.2);
    windowUnit(-1.15, -0.6);
    windowUnit(-0.55, 0.1);
    scene.add(box(2.75, 0.04, 0.14, frame, -1.2, SILL - 0.02, -1.92));   // peitoril
    scene.add(box(2.75, 0.04, 0.14, frame, -1.2, 2.2, -1.92));           // friso acima das janelas
    scene.add(box(0.06, 0.09, 0.03, white, -0.65, 0.8, -1.99));          // tomada

    // ---- Rolô esquerdo (estático) ----
    scene.add(box(1.3, 0.1, 0.1, mat(0xbdbdbd), -1.85, 2.27, -1.86));
    scene.add(box(1.3, 0.2, 0.01, mat(0xdadad8, { roughness: 1 }), -1.85, 2.12, -1.86));

    // ---- Ar-condicionado (sobre o rolô) ----
    const ac = new THREE.Group();
    ac.add(box(1.0, 0.33, 0.25, mat(0xe6d8b0, { roughness: 0.5 })));
    ac.add(box(0.96, 0.07, 0.04, mat(0xd4c59c), 0, -0.1, 0.13));          // aba inferior
    ac.add(box(0.8, 0.03, 0.02, mat(0x2a2a2a), -0.05, -0.12, 0.155));     // saída de ar
    ac.add(box(0.03, 0.015, 0.01, mat(0xcc0000, { emissive: 0xcc0000, emissiveIntensity: 1 }), 0.1, -0.02, 0.13)); // LED
    ac.position.set(-1.0, 2.5, -1.86);
    scene.add(ac);

    // ---- Tubulação branca no teto (da parede até a frente) ----
    const pipeMat = mat(0xffffff, { roughness: 0.4 });
    const vPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 12), pipeMat);
    vPipe.position.set(-0.55, 2.9, -1.93);
    const hPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.4, 12), pipeMat);
    hPipe.rotation.x = Math.PI / 2;
    hPipe.position.set(-0.55, 3.15, 0.2);
    scene.add(vPipe, hPipe);

    // ---- Cortina central com Rapier (cobre os dois vãos da direita) ----
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const blind = Blind.create(RAPIER, world, {
      x: -0.525, z: -1.86, width: 1.25, topY: 2.22, minY: 1.1, maxY: 2.0,
    });
    scene.add(blind.group);

    // ---- Luminária (do zero) paralela à parede escura + iluminação ----
    const lamp = TubeLight.create(1.6);
    lamp.rotation.y = Math.PI / 2;
    lamp.position.set(1.3, 3.1, 0.3);
    scene.add(lamp);
    scene.add(Light.createAmbientLight(0xffffff, 0.5));
    const fill = new THREE.PointLight(0xffffff, 4, 10);
    fill.position.set(-0.5, 2.9, 1.0);
    scene.add(fill);

    // ---- Sofá preto (procedural; substituído por sofa.dae) + almofadas ----
    const black = mat(0x0e0e10, { roughness: 0.4 });
    const sofa = new THREE.Group();
    const sofaBody = new THREE.Group();
    sofaBody.add(box(2.1, 0.4, 0.9, black, 0, 0.25, 0));
    for (let i = 0; i < 7; i++) sofaBody.add(box(0.295, 0.5, 0.2, black, -0.9 + i * 0.3, 0.6, -0.35));
    for (const dx of [-1.125, 1.125]) sofaBody.add(box(0.15, 0.6, 0.9, black, dx, 0.4, 0));
    const foot = mat(0x9a9a9a, { metalness: 0.8, roughness: 0.3 });
    for (const [x, z] of [[-1.1, 0.4], [1.1, 0.4], [-1.1, -0.4], [1.1, -0.4]]) {
      sofaBody.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), foot).translateX(x).translateY(0.03).translateZ(z));
    }
    sofa.add(sofaBody);

    // [cor, x, y, z, rotX, rotY, rotZ] — posição/inclinação de cada almofada no sofá
    const PILLOW_DZ = 0.1; // avanço das almofadas para não entrarem no encosto do sofá
    const pillowSpecs = [
      [0xb28cf0, -0.85, 0.52, -0.02, -1.0, 0.5, 0.0],   // roxa deitada
      [0xe83f9b, -0.42, 0.64, -0.14, -0.25, 0.25, 0.1],  // rosa
      [0x7cc4f2, 0.01, 0.64, -0.16, -0.25, 0.0, -0.05],  // azul
      [0xf5a58f, 0.44, 0.64, -0.15, -0.25, -0.2, 0.08],  // pêssego
      [0xf5a58f, 0.83, 0.64, -0.17, -0.3, -0.35, -0.1],  // pêssego (canto)
    ];
    const pillows = pillowSpecs.map(([c, x, y, z, rx, ry, rz]) => {
      const p = box(0.38, 0.38, 0.11, mat(c, { roughness: 1 }), x, y, z + PILLOW_DZ);
      p.rotation.set(rx, ry, rz);
      sofa.add(p);
      return p;
    });
    sofa.position.set(-0.9, 0, -1.2);
    scene.add(sofa);

    // ---- Poltrona marrom giratória (suede) ----
    const brown = mat(0x5a3b2b, { roughness: 1 });
    const chair = new THREE.Group();
    chair.add(box(0.9, 0.28, 0.8, brown, 0, 0.29, 0));
    chair.add(box(0.56, 0.16, 0.6, mat(0x65422f, { roughness: 1 }), 0, 0.5, 0.05));  // almofada do assento
    chair.add(box(0.9, 0.6, 0.2, brown, 0, 0.65, -0.3));
    for (const dx of [-0.365, 0.365]) chair.add(box(0.17, 0.6, 0.8, brown, dx, 0.45, 0));
    const dark = mat(0x111111, { metalness: 0.6 });
    chair.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), dark).translateY(0.08));
    [0, 2.1, 4.2].forEach((a) => {
      const leg = box(0.4, 0.02, 0.04, dark, 0, 0.02, 0);
      leg.rotation.y = a;
      chair.add(leg);
    });
    chair.position.set(1.15, 0, -0.4);
    chair.rotation.y = -0.6;
    scene.add(chair);

    // ---- Planta: vaso branco cônico, troncos e folhagem densa ----
    const plant = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.15, 0.6, 4), mat(0xffffff, { roughness: 0.3 }));
    pot.rotation.y = Math.PI / 4;
    pot.position.y = 0.3;
    pot.castShadow = pot.receiveShadow = true;
    plant.add(pot);
    const trunkMat = mat(0x4b3621);
    [[0, 0], [0.12, 0.18], [-0.12, -0.15]].forEach(([tz, tx], i) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.3 - i * 0.2, 8), trunkMat);
      trunk.position.set(tx * 0.5, 0.65 + 0.6 - i * 0.1, 0);
      trunk.rotation.z = tx;
      plant.add(trunk);
    });
    const leafGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const greens = [mat(0x3f7d3a), mat(0x4e8f3f), mat(0x2f6a31)];
    for (let i = 0; i < 55; i++) {
      const a = i * 2.4, r = 0.05 + 0.38 * Math.sqrt(rand(i));
      const leaf = new THREE.Mesh(leafGeo, greens[i % 3]);
      leaf.scale.set(1.6, 0.35, 0.8);
      leaf.position.set(Math.cos(a) * r, 0.85 + 0.85 * rand(i + 99), Math.sin(a) * r);
      leaf.rotation.set(rand(i + 5) * 2, a, rand(i + 17) * 1.2 - 0.6);
      leaf.castShadow = true;
      plant.add(leaf);
    }
    plant.position.set(0.6, 0, -1.65);
    scene.add(plant);

    // ---- ASSETS PRONTOS (se faltar algum arquivo, fica o objeto procedural) ----
    const MODELS = 'src/World/assets/models/';
    let disposed = false;

    // Planta (.glb): 1.45 m de altura, no mesmo lugar da planta procedural
    Assets.loadGLB(`${MODELS}planta/planta.glb`).then((model) => {
      if (disposed) return;
      const root = Assets.fitHeight(model, 1.45);
      root.position.copy(plant.position);
      scene.remove(plant);
      scene.add(root);
    }).catch((e) => console.warn('planta.glb não carregou, mantendo a procedural', e));

    // Sofá (.dae + texturas PBR): maior lado = 2.3 m. Se ficar de costas, use fitLength(model, 2.3, Math.PI)
    Assets.loadDAE(`${MODELS}sofa/sofa.dae`).then((model) => {
      if (disposed) return;
      Assets.pbr(model, `${MODELS}sofa/textures/`, '01___Default');
      sofa.remove(sofaBody);
      sofa.add(Assets.fitLength(model, 2.3));
    }).catch((e) => console.warn('sofa.dae não carregou, mantendo o procedural', e));

    // Almofadas (.3ds): cada uma é um clone do modelo com a cor de pillowSpecs
    Assets.load3DS(`${MODELS}almofada/almofada.3ds`, `${MODELS}almofada/textures/`).then((model) => {
      if (disposed) return;
      pillowSpecs.forEach(([c, x, y, z, rx, ry, rz], i) => {
        const p = Assets.cushion(model, 0.42, 0.42, 0.12, c);
        p.position.set(x, y, z + PILLOW_DZ);
        p.rotation.set(rx, ry, rz);
        sofa.remove(pillows[i]);
        sofa.add(p);
      });
    }).catch((e) => console.warn('almofada.3ds não carregou, mantendo as procedurais', e));

    return {
      scene,
      update: (dt, t) => blind.update(t),
      cameraPos: new THREE.Vector3(-0.3, 1.35, 2.6),
      cameraTarget: new THREE.Vector3(0.4, 1.7, -1.8),
      dispose: () => { disposed = true; Primitives.dispose(scene); world.free(); },
    };
  }
}

export { Classroom };
