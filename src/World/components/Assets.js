import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TDSLoader } from 'three/addons/loaders/TDSLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

// Carrega modelos 3D prontos (.glb / .3ds) e os "encaixa" em tamanhos reais (metros),
// já que cada modelo vem com escala, pivô e orientação diferentes.
class Assets {
  static #shadows(root) {
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return root;
  }

  static async loadGLB(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    return Assets.#shadows(gltf.scene);
  }

  // .dae (Collada): vem sem texturas PBR, que são aplicadas depois com Assets.pbr()
  static async loadDAE(url) {
    const collada = await new ColladaLoader().loadAsync(url);
    return Assets.#shadows(collada.scene);
  }

  // Troca os materiais do modelo por MeshStandardMaterial com os mapas de textura
  static pbr(model, folder, prefix) {
    const tl = new THREE.TextureLoader().setPath(folder);
    const map = tl.load(`${prefix}_albedo.jpg`);
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap: tl.load(`${prefix}_normal.jpg`),
      roughnessMap: tl.load(`${prefix}_roughness.jpg`),
      aoMap: tl.load(`${prefix}_AO.jpg`),
      metalness: 0,
    });
    model.traverse((o) => { if (o.isMesh) o.material = material; });
    return model;
  }

  // .3ds: as texturas são procuradas em texturePath (se o arquivo citar a textura sem extensão, assume .jpg)
  static async load3DS(url, texturePath) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((u) => (/\.[a-z0-9]{2,4}$/i.test(u) || u.startsWith('data:') ? u : `${u}.jpg`));
    const loader = new TDSLoader(manager);
    loader.setResourcePath(texturePath);
    return Assets.#shadows(await loader.loadAsync(url));
  }

  // Escala uniforme para ter `height` metros de altura; base em y = 0, centrado em x/z
  static fitHeight(model, height) {
    const wrap = new THREE.Group();
    wrap.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.set(-c.x, -box.min.y, -c.z);
    wrap.scale.setScalar(height / (box.max.y - box.min.y));
    return wrap;
  }

  // Escala uniforme para o maior lado horizontal ter `length` metros (gira 90° se estiver em z)
  static fitLength(model, length, rotationY = 0) {
    const wrap = new THREE.Group();
    wrap.add(model);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.rotation.y = (size.z > size.x ? Math.PI / 2 : 0) + rotationY;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.set(-c.x, -box.min.y, -c.z);
    wrap.scale.setScalar(length / (box.max.x - box.min.x));
    return wrap;
  }

  // Mede a superfície do sofá com raios: altura do assento em (x, z) e z do encosto em (x, y).
  // Coordenadas locais de `parent` (o grupo do sofá). Retorna undefined se o raio não acertar.
  static sofaProbe(parent, root) {
    const meshes = [];
    root.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const ray = new THREE.Raycaster();
    const DOWN = new THREE.Vector3(0, -1, 0), BACK = new THREE.Vector3(0, 0, -1);
    const cast = (origin, dir, targets = meshes) => {
      parent.updateMatrixWorld(true);
      ray.set(parent.localToWorld(origin.clone()), dir.clone().transformDirection(parent.matrixWorld));
      const hit = ray.intersectObjects(targets, false)[0];
      return hit ? parent.worldToLocal(hit.point.clone()) : null;
    };
    return {
      seatY: (x, z) => cast(new THREE.Vector3(x, 3, z), DOWN)?.y,
      backZ: (x, y) => cast(new THREE.Vector3(x, y, 2), BACK)?.z,
      // A partir de um ponto qualquer (coords locais do sofá): primeiro ponto atingido abaixo / atrás.
      // `extra` = outras malhas (ex.: almofadas já colocadas) que também contam como superfície.
      down: (x, y, z, extra = []) => cast(new THREE.Vector3(x, y + 0.1, z), DOWN, meshes.concat(extra)),
      back: (x, y, z, extra = []) => cast(new THREE.Vector3(x, y, z + 0.1), BACK, meshes.concat(extra)),
    };
  }

  // Almofada procedural (usada se o .3ds não carregar): caixa subdividida, fina nas bordas e inflada no centro
  static pillow(w, t, color, label = '') {
    const geo = new THREE.BoxGeometry(w, w, t, 14, 14, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const u = Math.abs(x) / (w / 2), v = Math.abs(y) / (w / 2);
      const f = Math.max(0, (1 - u * u) * (1 - v * v));
      pos.setZ(i, z * (0.12 + 0.88 * f) * 1.6);                 // inflado no centro
      const pinch = 1 - 0.07 * u * v;                           // cantos puxados para dentro
      pos.setX(i, x * pinch);
      pos.setY(i, y * pinch);
    }
    geo.computeVertexNormals();
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    if (label) {
      const text = Assets.labelPlane(label, w * 0.8);
      text.position.z = t * 0.8 + 0.004;
      group.add(text);
    }
    return group;
  }

  // Multiplica a cor dos materiais (escurece/ajusta o tom da textura)
  static tint(model, color) {
    model.traverse((o) => {
      if (o.isMesh) [].concat(o.material).forEach((m) => m.color?.set(color));
    });
    return model;
  }

  // Pinta o modelo com uma cor lisa (ignora a textura) e deixa o acabamento fosco, tipo suede
  static paint(model, color) {
    model.traverse((o) => {
      if (!o.isMesh) return;
      [].concat(o.material).forEach((m) => {
        m.map = null;
        m.color?.set(color);
        if ('shininess' in m) m.shininess = 4;
        m.specular?.set(0x111111);
        m.needsUpdate = true;
      });
    });
    return model;
  }

  // Plano transparente com texto branco (as almofadas da foto têm palavras estampadas)
  static labelPlane(text, width) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 120;
    g.font = `bold ${size}px sans-serif`;
    while (g.measureText(text).width > 480 && size > 20) { size -= 4; g.font = `bold ${size}px sans-serif`; }
    g.fillText(text, 256, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, width / 2),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );
  }

  // Almofada: o eixo mais fino vira a espessura (z); depois estica para w x h x d, centrada na origem.
  // Clona o modelo e os materiais, e aplica `color` como tinta sobre a textura do tecido.
  static cushion(model, w, h, d, color, label = '') {
    const obj = model.clone(true);
    obj.traverse((o) => {
      if (o.isMesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
        [].concat(o.material).forEach((m) => m.color?.set(color));
      }
    });
    const wrap = new THREE.Group();
    wrap.add(obj);

    const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    if (size.y <= size.x && size.y <= size.z) obj.rotation.x = Math.PI / 2;        // espessura em y -> z
    else if (size.x <= size.y && size.x <= size.z) obj.rotation.y = -Math.PI / 2;  // espessura em x -> z
    obj.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(obj);
    box.getSize(size);
    obj.position.sub(box.getCenter(new THREE.Vector3()));
    wrap.scale.set(w / size.x, h / size.y, d / size.z);

    const outer = new THREE.Group();
    outer.add(wrap);
    if (label) {
      const text = Assets.labelPlane(label, w * 0.8);
      text.position.z = d / 2 + 0.004;   // logo à frente da face da almofada
      outer.add(text);
    }
    return outer;
  }
}

export { Assets };