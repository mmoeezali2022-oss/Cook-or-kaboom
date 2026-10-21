import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { ChefPreset, HeldItem } from './types';

/** Batch fixed geometry by palette material, preserving separately animated groups. */
function batchStatic(root: THREE.Object3D, exclude = new Set<THREE.Object3D>()) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals: THREE.Mesh[] = [];
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    let ancestor: THREE.Object3D | null = object;
    while (ancestor && ancestor !== root) { if (exclude.has(ancestor)) return; ancestor = ancestor.parent; }
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    const mat = object.material as THREE.Material;
    const list = groups.get(mat) || []; list.push(geometry); groups.set(mat, list); originals.push(object);
  });
  for (const [mat, geometries] of groups) {
    const merged = mergeGeometries(geometries, false);
    if (merged) { const m = new THREE.Mesh(merged, mat); m.castShadow = true; m.receiveShadow = true; root.add(m); }
    geometries.forEach(g => g.dispose());
  }
  originals.forEach(o => { o.removeFromParent(); o.geometry.dispose(); });
}

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function material(color: string, roughness = 0.65, metalness = 0) {
  const key = color + roughness + metalness;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return mats.get(key)!;
}
export function mesh(geometry: THREE.BufferGeometry, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export function box(p: THREE.Object3D, w: number, h: number, d: number, c: string, x = 0, y = 0, z = 0, radius = 0.06) {
  return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), c, p, x, y, z);
}
export function ball(p: THREE.Object3D, r: number, c: string, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = mesh(new THREE.SphereGeometry(r, 16, 12), c, p, x, y, z); m.scale.set(sx, sy, sz); return m;
}
export function cylinder(p: THREE.Object3D, rt: number, rb: number, h: number, c: string, x = 0, y = 0, z = 0, sides = 24) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, sides), c, p, x, y, z);
}
export function torus(p: THREE.Object3D, r: number, t: number, c: string, x = 0, y = 0, z = 0) {
  return mesh(new THREE.TorusGeometry(r, t, 8, 28), c, p, x, y, z);
}
export function textSprite(text: string, bg = '#fff6e7', color = '#503c32', width = 2.3, fontSize = 38) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(8, 8, 496, 112, 30); ctx.fill();
  ctx.fillStyle = color; ctx.font = `bold ${fontSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, toneMapped: false })); s.scale.set(width, width / 4, 1); s.renderOrder = 10; return s;
}
export interface Chef {
  root: THREE.Group; body: THREE.Group; head: THREE.Group; hat: THREE.Group;
  arms: THREE.Group[]; legs: THREE.Group[]; hands: THREE.Group[]; held: THREE.Group;
  eyes: THREE.Mesh[]; apron: THREE.Mesh; mouth: THREE.Mesh;
}
export function createChef(preset: ChefPreset, apronColor = '#ed795a'): Chef {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = preset === 'lina' ? '#e8ac82' : '#e3a074', hair = '#483021';
  const legs: THREE.Group[] = [], arms: THREE.Group[] = [], hands: THREE.Group[] = [], eyes: THREE.Mesh[] = [];
  for (const x of [-0.23, 0.23]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.96, 0); body.add(leg);
    box(leg, 0.35, 0.8, 0.4, '#414344', 0, -0.34); box(leg, 0.42, 0.26, 0.64, '#352e2a', 0, -0.78, 0.12); legs.push(leg);
  }
  ball(body, 0.58, '#fff8e6', 0, 1.46, 0, 1, 1.18, 0.67);
  box(body, 0.81, 0.64, 0.15, '#e9d3ae', 0, 1.01, 0.3, 0.07);
  const apron = box(body, 0.75, 0.91, 0.12, apronColor, 0, 1.33, 0.4, 0.04);
  box(body, 0.44, 0.22, 0.04, '#fbe9ce', 0, 1.07, 0.48, 0.03);
  for (const x of [-0.37, 0.37]) box(body, 0.08, 0.72, 0.07, apronColor, x, 1.72, 0.33).rotation.z = x * 0.4;
  for (const x of [-0.18, 0.18]) for (const y of [1.6, 1.8]) ball(body, 0.035, '#695849', x, y, 0.38);
  cylinder(body, 0.15, 0.17, 0.3, skin, 0, 2.02);
  // Neckerchief and a soft triangular knot.
  torus(body, 0.19, 0.07, '#d04e38', 0, 1.99, 0).rotation.x = Math.PI / 2;
  ball(body, 0.1, '#d04e38', 0, 1.95, 0.26); box(body, 0.14, 0.3, 0.06, '#d04e38', 0.09, 1.79, 0.35).rotation.z = 0.4;
  const head = new THREE.Group(); head.position.y = 2.35; body.add(head);
  ball(head, 0.48, skin, 0, 0, 0, 0.86, 1.12, 0.87);
  for (const x of [-0.42, 0.42]) { ball(head, 0.12, skin, x, -0.02, 0); ball(head, 0.065, '#cf896f', x, -0.02, 0.06); }
  ball(head, 0.39, hair, 0, 0.2, -0.08, 1, 0.9, 0.83);
  for (let i = 0; i < 5; i++) ball(head, 0.13, hair, -0.3 + i * 0.14, 0.29 + Math.sin(i) * 0.05, 0.2, 1.2, 0.85, 1);
  if (preset === 'lina') { ball(head, 0.26, hair, 0.1, 0.18, -0.43); for (const x of [-0.34, 0.34]) ball(head, 0.1, hair, x, -0.12, -0.15, 1, 1.9, 1); }
  for (const x of [-0.15, 0.15]) {
    ball(head, 0.105, '#fffef6', x, 0.03, 0.354, 0.88, 1.15, 0.6);
    eyes.push(ball(head, 0.048, '#433328', x, 0.035, 0.409, 0.85, 1.2, 0.4));
    ball(head, 0.016, '#ffffff', x - 0.012, 0.054, 0.427);
    box(head, 0.17, 0.045, 0.05, hair, x, 0.18, 0.37, 0.02).rotation.z = x > 0 ? -0.12 : 0.12;
    ball(head, 0.09, '#e98977', x * 1.6, -0.14, 0.33, 1, 0.45, 0.25);
  }
  ball(head, 0.105, skin, 0, -0.055, 0.43, 0.9, 1.1, 1.4);
  const mouth = ball(head, 0.11, '#813e31', 0, -0.25, 0.356, 1.3, 0.65, 0.28);
  box(head, 0.15, 0.035, 0.02, '#fff7df', 0, -0.22, 0.386, 0.008);
  const hat = new THREE.Group(); hat.position.y = 0.44; head.add(hat);
  cylinder(hat, 0.37, 0.39, 0.23, '#fffbee', 0, 0.02);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ball(hat, 0.27, '#fffbee', Math.cos(a) * 0.21, 0.3 + (i % 2) * 0.05, Math.sin(a) * 0.15, 1, 1.15, 1); }
  ball(hat, 0.28, '#fffbee', 0, 0.38, 0, 1, 1, 0.9);
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sign * 0.51, 1.81, 0); body.add(arm);
    ball(arm, 0.21, '#fff6e3', 0, -0.19, 0, 0.9, 1.6, 1);
    cylinder(arm, 0.19, 0.19, 0.14, '#e8ddc6', 0, -0.39, 0);
    ball(arm, 0.18, skin, 0, -0.53, 0, 1.05, 1.3, 1);
    const hand = createHand(skin); hand.position.set(0, -0.76, 0.03); arm.add(hand); arms.push(arm); hands.push(hand);
  }
  const held = new THREE.Group(); held.position.set(0, 1.42, 0.76); body.add(held);
  batchStatic(hat); batchStatic(head, new Set<THREE.Object3D>([...eyes, hat, mouth]));
  arms.forEach((arm, i) => batchStatic(arm, new Set([hands[i]])));
  batchStatic(body, new Set<THREE.Object3D>([...legs, ...arms, head, held, apron]));
  root.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, head, hat, arms, legs, hands, held, eyes, apron, mouth };
}
export function createHand(skin = '#e3a074') {
  const hand = new THREE.Group(); ball(hand, 0.17, skin, 0, 0, 0, 1, 1.1, 0.75);
  for (let i = 0; i < 4; i++) ball(hand, 0.055, skin, -0.11 + i * 0.073, -0.13, 0.025, 1, 1.6, 1);
  ball(hand, 0.073, skin, 0.15, 0, 0.08, 1, 1.4, 1); batchStatic(hand); return hand;
}
export function createItem(type: HeldItem) {
  const g = new THREE.Group();
  if (type === 'egg') ball(g, 0.2, '#fff1d1', 0, 0, 0, 0.86, 1.25, 0.86);
  if (type === 'flour') {
    box(g, 0.47, 0.6, 0.29, '#f2deae'); box(g, 0.48, 0.18, 0.3, '#d06947', 0, -0.14); box(g, 0.33, 0.14, 0.31, '#fff6df', 0, 0.12);
  }
  if (type === 'milk') {
    box(g, 0.35, 0.6, 0.35, '#fff7dd'); box(g, 0.36, 0.22, 0.36, '#85b7ba', 0, -0.05); cylinder(g, 0.07, 0.07, 0.07, '#d96840', 0, 0.34);
  }
  if (type === 'butter') { box(g, 0.48, 0.18, 0.32, '#f2c04a'); box(g, 0.6, 0.03, 0.4, '#fff5d4', 0, -0.1); }
  if (type === 'batter') { const bowl = ball(g, 0.34, '#d57c54', 0, 0, 0, 1, 0.5, 1); bowl.geometry = new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); cylinder(g, 0.29, 0.29, 0.02, '#f4ce79', 0, -0.02); }
  if (type === 'pancake') { cylinder(g, 0.36, 0.36, 0.09, '#da9a41'); cylinder(g, 0.31, 0.31, 0.012, '#edb556', 0, 0.048); }
  return g;
}
export interface Kitchen {
  root: THREE.Group; bowlFill: THREE.Mesh; whisk: THREE.Group; pancake: THREE.Group;
  plate: THREE.Group; smoke: THREE.Group; labels: THREE.Sprite[]; ring: THREE.Mesh; stoveGlow: THREE.Mesh;
}
export const COLLIDERS = [
  { x1: -6.8, x2: 5.3, z1: -4.9, z2: -2.55 },
  { x1: -6.9, x2: -5.2, z1: -2.8, z2: -0.65 },
  { x1: -6.9, x2: -5.2, z1: 1.3, z2: 3.1 },
  { x1: 5.0, x2: 6.8, z1: -0.3, z2: 1.6 },
];
export function createKitchen(): Kitchen {
  const root = new THREE.Group();
  box(root, 15, 0.36, 11, '#b98a64', 0, -0.25, 0, 0.16);
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.97, 0.06, 0.97), material('#eadbbd'), 150);
  const matrix = new THREE.Matrix4(), color = new THREE.Color(); let idx = 0;
  for (let x = 0; x < 15; x++) for (let z = 0; z < 10; z++) {
    matrix.makeTranslation(x - 7, -0.04, z - 4.5); tiles.setMatrixAt(idx, matrix); tiles.setColorAt(idx, color.set((x + z) % 2 ? '#f7e8cb' : '#acd0b6')); idx++;
  }
  tiles.receiveShadow = true; root.add(tiles);
  box(root, 15, 4.4, 0.22, '#f4d5a3', 0, 2.1, -5.1);
  box(root, 0.2, 3.8, 6, '#edd4ae', -7.4, 1.8, -2.2);
  box(root, 15, 0.14, 0.13, '#9e7659', 0, 0.2, -4.94);
  // Mint subway backsplash, done as one instanced draw call.
  const backsplash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.74, 0.35, 0.03), material('#fff2d5'), 80);
  idx = 0; for (let row = 0; row < 4; row++) for (let col = 0; col < 20; col++) { matrix.makeTranslation(-7.1 + col * 0.76 + (row % 2) * 0.2, 1.7 + row * 0.38, -4.96); backsplash.setMatrixAt(idx++, matrix); } root.add(backsplash);
  // Back worktop, paneled cupboards, brass handles.
  box(root, 10.8, 1.25, 1.55, '#7ba38a', -0.3, 0.69, -3.68);
  box(root, 11.1, 0.16, 1.77, '#fff4d8', -0.3, 1.39, -3.68);
  for (let i = 0; i < 7; i++) {
    const x = -4.9 + i * 1.52; box(root, 1.38, 1.04, 0.07, '#8fb298', x, 0.75, -2.88);
    box(root, 1.14, 0.8, 0.04, '#82a98f', x, 0.75, -2.825); box(root, 0.32, 0.055, 0.08, '#ba8b48', x, 1.06, -2.77, 0.02);
  }
  // Refrigerator with soft rounded enamel, separate freezer and chrome handles.
  box(root, 1.65, 3.05, 1.8, '#b8d7c3', -6.05, 1.53, -1.7, 0.18);
  box(root, 1.52, 0.78, 0.12, '#d5e3cd', -6.05, 2.56, -0.77, 0.09);
  box(root, 1.52, 2.05, 0.12, '#d5e3cd', -6.05, 1.07, -0.77, 0.09);
  for (const y of [1.45, 2.52]) box(root, 0.09, 0.46, 0.12, '#c79553', -5.5, y, -0.63, 0.04);
  const note = textSprite('MILK + BUTTER', '#fff4cd', '#53654d', 1.15, 35); note.position.set(-6.05, 2.1, -0.61); root.add(note);
  // Sunlit arched-ish window, gingham curtains, herb on the sill.
  box(root, 3.45, 2.24, 0.22, '#8b684c', 0.2, 3.13, -4.82, 0.15);
  box(root, 3.17, 1.95, 0.1, '#aad5d3', 0.2, 3.13, -4.65, 0.13);
  ball(root, 0.32, '#ffe49a', 1.06, 3.65, -4.54, 1, 1, 0.07);
  for (const x of [-0.7, 0.3, 1]) ball(root, 0.4, '#d9e9cc', x, 2.55, -4.55, 1.8, 0.9, 0.07);
  box(root, 0.09, 2.04, 0.12, '#fff1d8', 0.2, 3.13, -4.49); box(root, 3.15, 0.09, 0.12, '#fff1d8', 0.2, 3.13, -4.49);
  box(root, 3.8, 0.15, 0.53, '#fff0d1', 0.2, 2.06, -4.57);
  for (const sign of [-1, 1]) {
    const x = 0.2 + sign * 1.4; box(root, 0.66, 1.9, 0.1, '#e99579', x, 3.2, -4.45);
    for (let i = 0; i < 4; i++) box(root, 0.07, 1.9, 0.04, '#f3b49a', x - 0.25 + i * 0.16, 3.2, -4.37);
    box(root, 0.73, 0.12, 0.13, '#be7353', x, 2.78, -4.32);
  }
  // Pantry shelf, jars, eggs and sacks.
  for (const y of [2.5, 3.35]) {
    box(root, 2.7, 0.13, 0.6, '#a6754f', -3.75, y, -4.65);
    for (const x of [-4.75, -2.75]) box(root, 0.12, 0.3, 0.5, '#9b6b45', x, y - 0.15, -4.7);
    for (let i = 0; i < 5; i++) { const x = -4.7 + i * 0.47; cylinder(root, 0.17, 0.18, 0.42, ['#d4b47a', '#b5ca91', '#ead8a7', '#d29167', '#e7bd6d'][i], x, y + 0.27, -4.65); cylinder(root, 0.19, 0.19, 0.07, '#a06f46', x, y + 0.51, -4.65); box(root, 0.17, 0.13, 0.02, '#fff2d5', x, y + 0.29, -4.47); }
  }
  box(root, 1.12, 0.08, 0.67, '#b69970', -3.7, 1.51, -3.25);
  for (let i = 0; i < 4; i++) { const egg = createItem('egg'); egg.position.set(-4.08 + (i % 2) * 0.35, 1.68, -3.38 + Math.floor(i / 2) * 0.29); egg.scale.setScalar(0.7); root.add(egg); }
  const flour = createItem('flour'); flour.position.set(-2.8, 1.76, -3.6); root.add(flour);
  // Mixing bowl, actual batter surface, articulated whisk.
  const bowl = ball(root, 0.65, '#e99975', 0, 1.77, -3.45); bowl.geometry = new THREE.SphereGeometry(0.65, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); bowl.position.y = 2.08;
  torus(root, 0.64, 0.045, '#f5be93', 0, 2.08, -3.45).rotation.x = Math.PI / 2;
  const bowlFill = cylinder(root, 0.57, 0.4, 0.035, '#f4d595', 0, 1.96, -3.45); bowlFill.visible = false;
  const whisk = new THREE.Group(); whisk.position.set(0, 2.05, -3.45); root.add(whisk);
  cylinder(whisk, 0.045, 0.045, 0.72, '#a47b4f', 0, 0.37);
  for (let i = 0; i < 4; i++) { const wire = torus(whisk, 0.15, 0.013, '#c7c4b1', 0, -0.02); wire.scale.y = 1.7; wire.rotation.y = i * Math.PI / 4; }
  whisk.rotation.z = -0.35;
  // Stove and oven.
  box(root, 2.05, 1.32, 1.6, '#404b45', 3.45, 0.76, -3.65);
  box(root, 1.58, 0.76, 0.08, '#2f3934', 3.45, 0.67, -2.82); box(root, 1.3, 0.48, 0.04, '#6f7a6b', 3.45, 0.68, -2.76);
  box(root, 1.1, 0.08, 0.12, '#c6b593', 3.45, 1.08, -2.68);
  for (const x of [2.95, 3.45, 3.95]) cylinder(root, 0.075, 0.075, 0.09, '#ded5b6', x, 1.28, -2.74).rotation.x = Math.PI / 2;
  box(root, 2.12, 0.13, 1.65, '#e5e5cf', 3.45, 1.46, -3.65);
  for (const x of [2.97, 3.94]) for (const z of [-3.25, -4.05]) { cylinder(root, 0.33, 0.33, 0.04, '#303b34', x, 1.56, z); torus(root, 0.22, 0.025, '#77766a', x, 1.59, z).rotation.x = Math.PI / 2; }
  const stoveGlow = torus(root, 0.31, 0.04, '#e99344', 3.4, 1.63, -3.32); stoveGlow.rotation.x = Math.PI / 2;
  cylinder(root, 0.53, 0.44, 0.13, '#303631', 3.4, 1.72, -3.32); cylinder(root, 0.48, 0.48, 0.02, '#474a3a', 3.4, 1.79, -3.32);
  box(root, 0.18, 0.12, 0.75, '#604b39', 3.4, 1.77, -2.7);
  const pancake = createItem('pancake'); pancake.position.set(3.4, 1.84, -3.32); pancake.scale.setScalar(1.15); root.add(pancake); pancake.visible = false;
  box(root, 2.6, 0.28, 1.1, '#9cae9c', 3.5, 3.2, -4.5); box(root, 0.8, 1.2, 0.6, '#91a38f', 3.5, 3.9, -4.85);
  // Rail and hanging tools.
  box(root, 1.9, 0.045, 0.06, '#96744c', 5.5, 2.76, -4.83);
  for (let i = 0; i < 4; i++) {
    const x = 4.84 + i * 0.43; cylinder(root, 0.025, 0.025, 0.6, '#a78052', x, 2.39, -4.76);
    if (i % 2) { box(root, 0.24, 0.24, 0.055, '#c2b99f', x, 2.04, -4.76); for (let n = 0; n < 3; n++) box(root, 0.018, 0.17, 0.06, '#7d8067', x - 0.06 + n * 0.06, 2.04, -4.71); }
    else ball(root, 0.14, '#b3b6a0', x, 2.01, -4.76, 1, 1.4, 0.3);
  }
  // Serving island and stack plate.
  box(root, 1.55, 1.25, 1.85, '#d88c67', 5.85, 0.7, 0.6); box(root, 1.85, 0.14, 2.15, '#f4dcb3', 5.85, 1.4, 0.6);
  box(root, 1.48, 0.88, 0.05, '#cb7c58', 5.85, 0.7, 1.55); box(root, 0.32, 0.055, 0.07, '#e9c17f', 5.85, 1.01, 1.61);
  cylinder(root, 0.67, 0.6, 0.08, '#fff6de', 5.83, 1.54, 0.58); torus(root, 0.59, 0.025, '#ddc59e', 5.83, 1.59, 0.58).rotation.x = Math.PI / 2;
  const plate = new THREE.Group(); plate.position.set(5.83, 1.62, 0.58); root.add(plate);
  const syrup = cylinder(root, 0.17, 0.22, 0.53, '#a56736', 6.24, 1.76, -0.1); syrup.rotation.z = -0.1;
  cylinder(root, 0.1, 0.1, 0.1, '#ebd49e', 6.26, 2.07, -0.1);
  // Sink and faucet.
  box(root, 1.7, 1.3, 1.8, '#83a68f', -6.05, 0.68, 2.2); box(root, 1.83, 0.14, 1.99, '#f5e8c7', -6.05, 1.38, 2.2);
  box(root, 1.2, 0.035, 1.17, '#758e83', -6, 1.47, 2.2); box(root, 1.02, 0.04, 0.98, '#a7c8bc', -6, 1.49, 2.2);
  const tap = torus(root, 0.24, 0.035, '#c6bca1', -6, 1.82, 1.64); tap.geometry = new THREE.TorusGeometry(0.24, 0.035, 8, 20, Math.PI); tap.rotation.y = Math.PI / 2;
  cylinder(root, 0.036, 0.036, 0.35, '#c6bca1', -6, 1.65, 1.4);
  box(root, 0.19, 0.27, 0.15, '#d5aa6c', -5.5, 1.6, 1.61);
  // Small props make the kitchen a place, not a graybox.
  const plant = (x: number, y: number, z: number, s = 1) => {
    cylinder(root, 0.2 * s, 0.14 * s, 0.3 * s, '#b87850', x, y, z);
    for (let i = 0; i < 7; i++) { const a = i * 2.4; const leaf = ball(root, 0.15 * s, i % 2 ? '#779a53' : '#527b49', x + Math.cos(a) * 0.18 * s, y + (0.25 + i * 0.025) * s, z + Math.sin(a) * 0.14 * s, 0.55, 1.8, 0.4); leaf.rotation.z = Math.sin(a) * 0.6; }
  };
  plant(-1.1, 2.3, -4.5); plant(6.2, 1.69, -3.7, 1.2);
  box(root, 1.1, 0.06, 0.66, '#b58855', 1.4, 1.51, -3.64); const butter = createItem('butter'); butter.position.set(1.45, 1.66, -3.64); root.add(butter);
  const towel = box(root, 0.4, 0.63, 0.045, '#fff1d3', -1.2, 1.16, -2.73);
  for (let i = 0; i < 3; i++) box(towel, 0.04, 0.61, 0.01, '#d77a5e', -0.12 + i * 0.12, 0, 0.027);
  // Chalkboard sign.
  box(root, 1.85, 1.26, 0.13, '#956c45', 5.7, 3.45, -4.87);
  box(root, 1.65, 1.06, 0.06, '#465b4c', 5.7, 3.45, -4.75);
  const sign = textSprite('PANCAKE CLUB', '#465b4c', '#fff0cb', 1.5, 40); sign.position.set(5.7, 3.66, -4.64); root.add(sign);
  const sign2 = textSprite('a little whisk & a wish', '#465b4c', '#e9ca8b', 1.47, 28); sign2.position.set(5.7, 3.3, -4.64); root.add(sign2);
  const smoke = new THREE.Group(); smoke.position.set(3.4, 1.8, -3.32); root.add(smoke);
  for (let i = 0; i < 7; i++) { const puff = ball(smoke, 0.2, '#b8b7a4', Math.sin(i * 2) * 0.3, i * 0.28, Math.cos(i * 2) * 0.15); puff.visible = false; }
  const labels: THREE.Sprite[] = [];
  for (const [i, name, x, z] of [[1, 'EGGS & FLOUR', -3.7, -3], [2, 'MILK & BUTTER', -6, -1.6], [3, 'MIXING BOWL', 0, -3], [4, 'STOVE', 3.4, -3], [5, 'SERVE HERE', 5.7, 0.6], [6, 'WASH UP', -5.8, 2.2]] as const) {
    const label = textSprite(`${i}  ${name}`, '#fff7e6', '#574333', 1.9, 34); label.position.set(x, 2.65, z); label.visible = false; root.add(label); labels.push(label);
  }
  const ring = torus(root, 0.58, 0.045, '#ed7044'); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04;
  batchStatic(root, new Set<THREE.Object3D>([bowlFill, whisk, pancake, plate, smoke, ring, stoveGlow]));
  return { root, bowlFill, whisk, pancake, plate, smoke, labels, ring, stoveGlow };
}
