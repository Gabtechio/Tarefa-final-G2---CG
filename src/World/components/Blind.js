import * as THREE from 'three';
import { Primitives } from './Primitives.js';

// Cortina (rolô): a barra inferior é um corpo cinemático do Rapier que sobe e desce em loop;
// o tecido é esticado entre a caixa do rolô (topo) e a barra.
class Blind {
  static create(RAPIER, world, { x, z, width, topY, minY, maxY }) {
    const group = new THREE.Group();

    const bar = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, maxY, z)
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, 0.02, 0.02), bar);

    const barMesh = Primitives.box(width, 0.04, 0.04, Primitives.material(0xcfcfcf, { metalness: 0.5 }));

    const fabric = Primitives.box(width, 1, 0.01, Primitives.material(0xdadad8, { roughness: 1 }));
    fabric.geometry.translate(0, -0.5, 0); // origem no topo: a escala só estica para baixo
    fabric.position.set(x, topY, z);

    const box = Primitives.box(width + 0.05, 0.1, 0.1, Primitives.material(0xbdbdbd), x, topY + 0.05, z);
    group.add(barMesh, fabric, box);

    function update(t) {
      const y = (minY + maxY) / 2 + Math.sin(t * 0.6) * (maxY - minY) / 2;
      bar.setNextKinematicTranslation({ x, y, z });
      world.step();
      const p = bar.translation();
      barMesh.position.set(p.x, p.y, p.z);
      fabric.scale.y = Math.max(topY - p.y, 0.01);
    }

    return { group, update };
  }
}

export { Blind };
