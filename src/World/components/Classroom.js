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

    // Almofadas como na foto. [cor, x, modo, inclinação, giro, rotação no plano, texto]
    // modo: 'lean' = apoiada no encosto, 'lie' = deitada no assento, 'top' = deitada por cima das outras
    // y e z são calculados a partir da superfície real do sofá (assento e encosto), sem flutuar.
    const PW = 0.42, PT = 0.13; // largura e espessura
    const SINK = 0.01;          // quanto as almofadas afundam no tecido ao encostar (m). Deixe pequeno (0.01).
    const LIFT = 0.0;           // ALTURA: sobe (+) ou desce (-) as almofadas encostadas em relação à base da roxa (m). 0 = mesma altura.
    // [cor, x, modo, inclinação, giro, rotação no plano, texto, dz (avanço em relação ao encosto)]
    const pillowSpecs = [
      // (em 'lie', giro + rotação no plano se somam: -0.78 = losango a 45° como na foto)
      // ORDEM = de trás para frente: cada almofada se apoia nas que já foram colocadas.
      // rosa, azul e pêssego: mesma inclinação, giro e altura, lado a lado (0.41 m de passo), rentes ao encosto.
      // Texto da azul e da pêssego girado 90° (-π/2), o da rosa na horizontal.
      // A roxa vem PRIMEIRO: a altura da base dela (apoiada no assento) é a referência para as outras.
      [0xb28cf0, -0.62, 'lie', -1.45, -0.78, 0.0, 'Inovação', 0],             // roxa deitada no assento, girada ~45°
      [0xf5a58f, 0.77, 'lean', -0.30, -0.30, -Math.PI / 2, 'Ação', 0],        // pêssego (direita)
      [0x7cc4f2, 0.36, 'lean', -0.30, -0.30, -Math.PI / 2, 'Ação', 0],        // azul (meio)
      [0xe83f9b, -0.05, 'lean', -0.30, -0.30, 0.0, 'Colaboração', 0],         // rosa (esquerda)
      [0xf5a58f, 0.72, 'top', -1.10, -0.30, -0.15, '', 0],                    // 2ª pêssego: por cima das três e do topo do encosto
    ];
    let pillowGroup = null;

    // Encosta a almofada no sofá medindo com raios (pontos da malha da almofada -> superfície do sofá):
    // desce até tocar o assento, recua até tocar o encosto (ou a almofada de trás) e desce de novo.
    // 'top' só desce, apoiando-se nas outras almofadas. Sem sofá medido (probe nulo) não faz nada.
    // `baseY`: altura (y local do sofá) da base da roxa; as 'lean' são niveladas por ela. Retorna a base desta almofada.
    const snapPillow = (p, probe, mode, others, baseY = null) => {
      if (!probe) return null;
      const v = new THREE.Vector3();
      const points = () => {
        sofa.updateMatrixWorld(true);
        const meshes = [];
        let total = 0;
        p.traverse((o) => {
          const n = o.isMesh && o.geometry.attributes.position?.count;
          if (n > 4) { meshes.push(o); total += n; }          // ignora o plano do texto
        });
        const step = Math.max(1, Math.floor(total / 800));     // ~800 pontos por almofada (só os da borda são lançados)
        const pts = [];
        meshes.forEach((o) => {
          const pos = o.geometry.attributes.position;
          for (let i = 0; i < pos.count; i += step) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
            pts.push(sofa.worldToLocal(v.clone()));
          }
        });
        return pts;
      };
      // menor folga entre os pontos da almofada e a superfície atingida pelo raio (aceita penetração de até 12 cm)
      // `edge`: só a borda de baixo (eixo y) ou de trás (eixo z) conta; senão o topo da almofada, que fica
      // dentro/acima do encosto, "apoiaria" no encosto e levantaria a almofada inteira.
      const gap = (cast, axis, edge = false) => {
        let g = Infinity;
        const pts = points();
        const lim = edge ? Math.min(...pts.map((q) => q[axis])) + 0.08 : Infinity;
        for (const q of pts) {
          if (q[axis] > lim) continue;
          const hit = cast(q);
          if (!hit) continue;
          const d = axis === 'y' ? q.y - hit.y : q.z - hit.z;
          if (d > -0.12 && d < 0.8) g = Math.min(g, d);
        }
        return g;
      };
      const drop = (extra, edge = true) => {
        const g = gap((q) => probe.down(q.x, q.y, q.z, extra), 'y', edge);
        if (Number.isFinite(g)) p.position.y -= g - SINK;
      };
      // ponto mais baixo da almofada (usa todos os vértices)
      const bottom = () => {
        sofa.updateMatrixWorld(true);
        let m = Infinity;
        p.traverse((o) => {
          const pos = o.isMesh && o.geometry.attributes.position;
          if (!pos || pos.count <= 4) return;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
            m = Math.min(m, sofa.worldToLocal(v).y);
          }
        });
        return m;
      };
      if (mode === 'top') { drop(others, false); return null; } // a de cima conta todos os pontos e se apoia nas outras
      drop([]);
      if (mode === 'lean') {
        const g = gap((q) => probe.back(q.x, q.y, q.z), 'z', true);   // só o sofá: as três ficam coladas no encosto
        if (Number.isFinite(g)) p.position.z -= g - SINK;
        drop([]);
        // mesma altura de base da roxa (a de cima acompanha, pois se apoia nestas)
        if (baseY !== null) p.position.y += baseY - bottom() + LIFT;
      }
      return mode === 'lie' ? bottom() : null;
    };
    const buildPillows = (probe, pillowModel) => {
      if (pillowGroup) sofa.remove(pillowGroup);
      pillowGroup = new THREE.Group();
      sofa.add(pillowGroup);
      const placed = []; // malhas das almofadas já colocadas (servem de apoio para as próximas)
      const leans = [];  // almofadas encostadas no encosto (rosa, azul, pêssego)
      let baseY = null;  // altura da base da roxa (referência)
      const dflt = probe ? { seat: 0.42, back: -0.08 } : { seat: 0.45, back: -0.25 };
      pillowSpecs.forEach(([c, x, mode, rx, ry, rz, label, dz]) => {
        const a = Math.abs(rx);
        const hh = (PW / 2) * (Math.abs(Math.cos(rz)) + Math.abs(Math.sin(rz))); // meia altura da almofada girada
        const seat = probe?.seatY(x, dflt.back + 0.3) ?? dflt.seat;
        // z do encosto medido na altura do topo da almofada (o encosto é inclinado); se errar, mede mais baixo
        const back = probe?.backZ(x, seat + 2 * hh * Math.cos(a) * 0.9)
          ?? probe?.backZ(x, seat + 0.2) ?? dflt.back;
        let y = seat + hh * Math.cos(a) + (PT / 2) * Math.sin(a) + 0.005;
        let z = back + hh * Math.sin(a) + (PT / 2) * Math.cos(a) + 0.02;
        if (mode === 'lie') z = back + 0.28;
        else z += dz;
        if (mode === 'top') {
          y = seat + 0.52;    // começa um pouco acima e desce até se apoiar nas três e no encosto
          z = back - 0.03;    // parte de baixo sobre o topo das três, parte de cima atrás do encosto
        }

        let p;
        try {
          p = pillowModel ? Assets.cushion(pillowModel, PW, PW, PT, c, label) : Assets.pillow(PW, PT, c, label);
        } catch (e) {
          console.error('almofada: erro ao montar, usando a procedural', e);
          p = Assets.pillow(PW, PT, c, label);
        }
        p.position.set(x, y, z);
        p.rotation.set(rx, ry, rz, 'YXZ');
        pillowGroup.add(p);
        if (mode === 'top' && leans.length) {
          // iguala altura e profundidade das três almofadas encostadas (o assento pode variar de uma almofada à outra)
          const ly = Math.max(...leans.map((q) => q.position.y));
          const lz = Math.max(...leans.map((q) => q.position.z));
          leans.forEach((q) => { q.position.y = ly; q.position.z = lz; });
        }
        const base = snapPillow(p, probe, mode, placed.slice(), baseY);
        if (mode === 'lie' && base !== null) baseY = base;
        if (mode === 'lean') leans.push(p);
        p.traverse((o) => { if (o.isMesh) placed.push(o); });
      });
    };
    buildPillows(null, null);
    sofa.position.set(-0.9, 0, -1.2);
    scene.add(sofa);

    // ---- Poltrona marrom giratória (suede) ----
    const brown = mat(0x5a3b2b, { roughness: 1 });
    const chair = new THREE.Group();
    const chairBody = new THREE.Group(); // corpo procedural (substituído pelo asset)
    chairBody.add(box(0.9, 0.28, 0.8, brown, 0, 0.29, 0));
    chairBody.add(box(0.56, 0.16, 0.6, mat(0x65422f, { roughness: 1 }), 0, 0.5, 0.05));  // almofada do assento
    chairBody.add(box(0.9, 0.6, 0.2, brown, 0, 0.65, -0.3));
    for (const dx of [-0.365, 0.365]) chairBody.add(box(0.17, 0.6, 0.8, brown, dx, 0.45, 0));
    const dark = mat(0x111111, { metalness: 0.6 });
    chairBody.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), dark).translateY(0.08));
    [0, 2.1, 4.2].forEach((a) => {
      const leg = box(0.4, 0.02, 0.04, dark, 0, 0.02, 0);
      leg.rotation.y = a;
      chairBody.add(leg);
    });
    chair.add(chairBody);
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

    // Sofá (.dae + texturas PBR) e almofadas (.3ds): carregam juntos, e as almofadas são
    // posicionadas medindo a superfície do sofá. Se o sofá ficar de costas: fitLength(model, 2.3, Math.PI)
    const sofaP = Assets.loadDAE(`${MODELS}sofa/sofa.dae`).then((model) => {
      Assets.pbr(model, `${MODELS}sofa/textures/`, '01___Default');
      const root = Assets.fitLength(model, 2.3);
      return root;
    }).catch((e) => { console.warn('sofa.dae não carregou, mantendo o procedural', e); return null; });
    const pillowP = Assets.load3DS(`${MODELS}almofada/almofada.3ds`, `${MODELS}almofada/textures/`)
      .catch((e) => { console.warn('almofada.3ds não carregou, mantendo as procedurais', e); return null; });

    Promise.all([sofaP, pillowP]).then(([sofaRoot, pillowModel]) => {
      if (disposed) return;
      let probe = null;
      try {
        if (sofaRoot) {
          sofa.remove(sofaBody);
          sofa.add(sofaRoot);
          scene.updateMatrixWorld(true);
          probe = Assets.sofaProbe(sofa, sofaRoot);
        }
      } catch (e) { console.error('sofá: erro ao medir a superfície', e); }
      console.info('almofadas -> modelo .3ds:', !!pillowModel, '| sofá medido:', !!probe);
      buildPillows(probe, pillowModel);
    }).catch((e) => console.error('erro ao montar sofá/almofadas', e));

    // Poltrona (.3ds, Z para cima): gira para Y para cima e ajusta a 0.95 m de largura
    Assets.load3DS(`${MODELS}poltrona/poltrona.3ds`, `${MODELS}poltrona/textures/`).then((model) => {
      if (disposed) return;
      Assets.paint(model, 0x6a4a3a); // marrom suede da foto (cor lisa)
      model.rotation.x = -Math.PI / 2;
      const upright = new THREE.Group();
      upright.add(model);
      chair.remove(chairBody);
      chair.add(Assets.fitLength(upright, 0.95));
    }).catch((e) => console.warn('poltrona.3ds não carregou, mantendo a procedural', e));

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