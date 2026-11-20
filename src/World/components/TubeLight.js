import * as THREE from 'three';
import { Primitives } from './Primitives.js';

// Luminária tubular criada do zero: tubo emissivo + suportes + luzes
class TubeLight {
  static create(length = 1.6) {
    const group = new THREE.Group();

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, length, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 })
    );
    tube.rotation.z = Math.PI / 2;
    group.add(tube);

    const bracketMat = Primitives.material(0xdddddd);
    for (const dx of [-length / 2, length / 2]) {
      group.add(Primitives.box(0.06, 0.08, 0.08, bracketMat, dx, 0.03, 0));
    }

    // Luz de área ao longo do tubo, apontando para baixo
    const rect = new THREE.RectAreaLight(0xffffff, 6, length, 0.1);
    rect.position.y = -0.06;
    rect.rotation.x = -Math.PI / 2;
    group.add(rect);

    // Luz pontual que projeta sombras
    const point = new THREE.PointLight(0xffffff, 8, 8);
    point.position.y = -0.2;
    point.castShadow = true;
    group.add(point);

    return group;
  }
}

export { TubeLight };
