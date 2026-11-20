import * as THREE from 'three';

// Helpers para criar malhas simples reutilizadas nas cenas
class Primitives {
  static material(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });
  }

  static box(w, h, d, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  static plane(w, h, material, pos, rot = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.receiveShadow = true;
    return mesh;
  }

  // Piso de cerâmica branca com rejunte, gerado em canvas (sem arquivo externo)
  static tileTexture(repeatX, repeatY) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d');
    g.fillStyle = '#e9e9e6';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#9a9a96';
    g.lineWidth = 6;
    g.strokeRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  static dispose(root) {
    root.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material ?? []).forEach((m) => m.dispose());
    });
  }
}

export { Primitives };
