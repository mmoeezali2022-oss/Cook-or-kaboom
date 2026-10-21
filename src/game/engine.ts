import * as THREE from 'three';
import { AudioMixer } from './audio';
import { COLLIDERS, createChef, createHand, createItem, createKitchen, material } from './models';
import type { Chef, Kitchen } from './models';
import { newRound, nextObjective, recipeReducer } from './recipe';
import { STATIONS } from './types';
import type { Action, CameraMode, ChefPreset, RoundState, Settings, StationId } from './types';
export interface GameView {
  round: RoundState; nearest: StationId | null; camera: CameraMode; paused: boolean;
  timing: 'egg' | 'milk' | null; timingValue: number; cooldown: number; moving: boolean;
}
interface Particle { mesh: THREE.Mesh; velocity: THREE.Vector3; age: number; life: number }
interface Projectile { group: THREE.Group; velocity: THREE.Vector3; age: number; egg: boolean }
const DESTINATIONS: Record<StationId, THREE.Vector2> = {
  pantry: new THREE.Vector2(-3.7, -1.68), fridge: new THREE.Vector2(-4.4, -1.3), bowl: new THREE.Vector2(0, -1.68),
  stove: new THREE.Vector2(3.4, -1.68), serve: new THREE.Vector2(4.3, 0.65), sink: new THREE.Vector2(-4.4, 2.2),
};
export class KitchenEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(43, 1, 0.08, 100);
  private kitchen: Kitchen;
  private chef: Chef;
  private friend: Chef;
  private hands = new THREE.Group();
  private firstHeld = new THREE.Group();
  private audio: AudioMixer;
  private settings: Settings;
  private state = newRound();
  private active = false;
  private paused = false;
  private disposed = false;
  private frame = 0;
  private last = performance.now();
  private elapsed = 0;
  private reportTime = 0;
  private keys = new Set<string>();
  private yaw = 0.25;
  private pitch = 0.15;
  private zoom = 10;
  private mode: CameraMode = 'back';
  private nearest: StationId | null = null;
  private timing: 'egg' | 'milk' | null = null;
  private timingStart = 0;
  private nextAction = 0;
  private cooldown = 0;
  private emoteUntil = 0;
  private emote = 'wave';
  private vertical = 0;
  private jumpVelocity = 0;
  private lastHeld: string | null = null;
  private lastServed = -1;
  private particles: Particle[] = [];
  private projectiles: Projectile[] = [];
  private destination: THREE.Vector2 | null = null;
  private joystick = new THREE.Vector2();
  private drag = { active: false, x: 0, y: 0 };
  private slipUntil = 0;
  private hazard?: THREE.Mesh;
  private observer: ResizeObserver;
  private onView: (view: GameView) => void;
  private onPause: () => void;
  private onPhoto: () => void;
  private onEmote: () => void;
  private readonly listeners: (() => void)[] = [];
  constructor(private canvas: HTMLCanvasElement, settings: Settings, callbacks: {
    onView: (view: GameView) => void; onPause: () => void; onPhoto: () => void; onEmote: () => void;
  }) {
    this.settings = settings; this.onView = callbacks.onView; this.onPause = callbacks.onPause; this.onPhoto = callbacks.onPhoto; this.onEmote = callbacks.onEmote;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.quality !== 'low', alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio()); this.renderer.shadowMap.enabled = settings.quality !== 'low'; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.35;
    this.scene.background = new THREE.Color('#eee2c9'); this.scene.fog = new THREE.Fog('#eee2c9', 32, 65);
    this.scene.add(new THREE.HemisphereLight('#fff4d9', '#c1b68f', 2.8));
    const sun = new THREE.DirectionalLight('#ffe4b1', 4.2); sun.position.set(-3, 11, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: 1, far: 35 });
    sun.shadow.normalBias = 0.045; sun.shadow.bias = -0.0002; sun.shadow.radius = 3; this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#d8e7e0', 1.2); fill.position.set(6, 5, -3); this.scene.add(fill);
    this.kitchen = createKitchen(); this.scene.add(this.kitchen.root);
    this.chef = createChef('marcus'); this.friend = createChef('lina', '#719b80'); this.scene.add(this.chef.root, this.friend.root);
    this.chef.root.position.set(-1.2, 0, 0.8); this.friend.root.position.set(1.5, 0, 0.3);
    this.chef.root.rotation.y = 0.25; this.friend.root.rotation.y = -0.55;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material('#eee2c9')); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true; this.scene.add(ground);
    for (const sign of [-1, 1]) {
      const hand = createHand(); hand.scale.setScalar(0.55); hand.position.set(sign * 0.25, -0.17, -0.9); hand.rotation.x = -0.45; hand.rotation.z = -sign * 0.25; this.hands.add(hand);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.37, 4, 10), material('#e3a074'));
      arm.position.set(sign * 0.28, -0.29, -0.61); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-sign * 0.03, 0.12, -0.4).normalize()); this.hands.add(arm);
    }
    this.firstHeld.position.set(0, -0.2, -0.88); this.firstHeld.scale.setScalar(0.42); this.hands.add(this.firstHeld);
    this.camera.add(this.hands); this.scene.add(this.camera); this.hands.visible = false;
    this.audio = new AudioMixer(settings);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize();
    this.listen(window, 'keydown', (e: KeyboardEvent) => this.keyDown(e));
    this.listen(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    this.listen(window, 'blur', () => { this.keys.clear(); this.joystick.set(0, 0); this.drag.active = false; if (this.active && !this.paused) this.onPause(); });
    this.listen(canvas, 'pointerdown', (e: PointerEvent) => { if (e.button !== 0) return; this.drag = { active: true, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
    this.listen(canvas, 'pointermove', (e: PointerEvent) => { if (!this.drag.active) return; const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; this.yaw -= dx * 0.006 * this.settings.sensitivity; this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.003 * this.settings.sensitivity, -0.22, 0.65); this.drag.x = e.clientX; this.drag.y = e.clientY; });
    this.listen(canvas, 'pointerup', () => { this.drag.active = false; }); this.listen(canvas, 'pointercancel', () => { this.drag.active = false; });
    this.listen(canvas, 'contextmenu', (e: Event) => e.preventDefault());
    this.listen(canvas, 'wheel', (e: WheelEvent) => { if (this.active) { e.preventDefault(); this.zoom = THREE.MathUtils.clamp(this.zoom + e.deltaY * 0.01, 5, 14); } }, { passive: false });
    this.listen(canvas, 'webglcontextlost', (e: Event) => { e.preventDefault(); if (this.active) this.onPause(); });
    this.loop();
  }
  private pixelRatio() { return Math.min(window.devicePixelRatio, this.settings.quality === 'low' ? 0.7 : this.settings.quality === 'high' ? 2 : 1.5); }
  private listen(target: EventTarget, name: string, handler: (event: any) => void, options?: AddEventListenerOptions) { target.addEventListener(name, handler, options); this.listeners.push(() => target.removeEventListener(name, handler, options)); }
  private resize() { const { width, height } = this.canvas.getBoundingClientRect(); if (!width || !height) return; this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); }
  private keyDown(e: KeyboardEvent) {
    if (!this.active || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
    if (['F5', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') { this.onPause(); return; }
    if (this.paused || this.state.status !== 'playing') return;
    this.keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyE') this.interact();
    if (e.code === 'KeyT') this.throwItem();
    if (e.code === 'F5' || e.code === 'KeyC') this.cycleCamera();
    if (e.code === 'Space') this.jump();
    if (e.code === 'KeyQ') this.prank('flour');
    if (e.code === 'KeyG') this.onEmote();
    if (e.code === 'KeyP') this.onPhoto();
  }
  begin(chef: ChefPreset, mode: 'classic' | 'cozy', apronColor: string) {
    this.active = true; this.paused = false; this.mode = 'back'; this.yaw = 0.25; this.pitch = 0.15; this.zoom = window.innerWidth < 700 ? 12 : 10;
    this.state = newRound(mode); this.timing = null; this.cooldown = 0; this.destination = null; this.lastHeld = '__reset'; this.lastServed = -1; this.vertical = 0; this.jumpVelocity = 0;
    this.scene.remove(this.chef.root); this.disposeObject(this.chef.root, false); this.chef = createChef(chef, apronColor); this.scene.add(this.chef.root);
    this.chef.root.position.set(0, 0, 2); this.friend.root.visible = false; this.chef.root.rotation.y = Math.PI;
    this.kitchen.labels.forEach(l => l.visible = true); this.kitchen.ring.visible = true;
    if (this.hazard) { this.scene.remove(this.hazard); this.hazard.geometry.dispose(); this.hazard = undefined; }
    for (const p of this.projectiles) { this.scene.remove(p.group); this.disposeObject(p.group, false); } this.projectiles = [];
    this.audio.start(); this.emit();
  }
  home() {
    this.active = false; this.paused = false; this.timing = null; this.state = newRound(); this.lastHeld = '__reset'; this.lastServed = -1;
    this.chef.root.visible = true; this.chef.root.position.set(-1.2, 0, 0.8); this.chef.root.rotation.y = 0.25;
    this.friend.root.visible = true; this.kitchen.labels.forEach(l => l.visible = false); this.kitchen.ring.visible = false;
    this.audio.pause(); this.keys.clear(); this.destination = null;
  }
  updateSettings(settings: Settings) {
    this.settings = settings; this.audio.update(settings); this.renderer.setPixelRatio(this.pixelRatio()); this.renderer.shadowMap.enabled = settings.quality !== 'low';
    if (!settings.pranks && this.hazard) { this.scene.remove(this.hazard); this.hazard.geometry.dispose(); this.hazard = undefined; } this.resize();
  }
  setPaused(paused: boolean) { this.paused = paused; this.keys.clear(); this.joystick.set(0, 0); this.drag.active = false; if (paused) this.audio.pause(); else if (this.active) this.audio.start(); this.emit(); }
  private dispatch(action: Action) {
    const oldEvent = this.state.event; this.state = recipeReducer(this.state, action);
    if (action.type === 'interact' && action.station === 'sink' && this.hazard) { this.scene.remove(this.hazard); this.hazard.geometry.dispose(); this.hazard = undefined; }
    if (this.state.event !== oldEvent) {
      this.audio.effect(this.state.lastEvent);
      if (this.state.lastEvent === 'pour') this.burst(this.chef.root.position.clone().add(new THREE.Vector3(0, 1.8, -0.8)), '#f6dea1', 15);
      if (this.state.lastEvent === 'serve') this.burst(new THREE.Vector3(5.8, 2, 0.6), '#f6bd54', 22);
      if (this.state.lastEvent === 'disaster') { this.burst(new THREE.Vector3(0, 2.3, -1), '#fff6d9', 70); this.emoteUntil = this.elapsed + 2; this.emote = 'panic'; }
      if (this.state.lastEvent === 'mistake') { this.emoteUntil = this.elapsed + 1.5; this.emote = 'facepalm'; }
    }
    this.emit();
  }
  interact(displayedTiming?: number) {
    if (!this.active || this.paused || this.state.status !== 'playing' || performance.now() < this.nextAction) return;
    this.nextAction = performance.now() + 140;
    if (!this.nearest) { this.state = { ...this.state, message: 'Walk closer to a station, chef. The kitchen map can guide you.' }; this.emit(); return; }
    if (this.nearest === 'bowl' && (this.state.held === 'egg' || this.state.held === 'milk')) {
      if (!this.timing) { this.timing = this.state.held; this.timingStart = this.elapsed; this.emit(); return; }
      // Pointer input uses the marker actually shown in the HUD, avoiding a slow-frame visual/input mismatch.
      const value = displayedTiming ?? this.timingValue(); this.timing = null; this.dispatch({ type: 'interact', station: this.nearest, timing: value }); return;
    }
    this.timing = null; this.dispatch({ type: 'interact', station: this.nearest });
  }
  cancelTiming() { this.timing = null; this.emit(); }
  private timingValue() { return (Math.sin((this.elapsed - this.timingStart) * 1.6 - Math.PI / 2) + 1) / 2; }
  goTo(station: StationId) { if (!this.paused && this.state.status === 'playing') { this.destination = DESTINATIONS[station].clone(); this.timing = null; this.emit(); } }
  moveJoystick(x: number, y: number) { this.joystick.set(x, y); }
  cycleCamera() { this.mode = this.mode === 'back' ? 'front' : this.mode === 'front' ? 'first' : 'back'; this.emit(); }
  jump() { if (!this.paused && this.vertical === 0) this.jumpVelocity = 5.2; }
  throwItem() {
    if (!this.active || this.paused || !this.state.held) return;
    const item = this.state.held, group = createItem(item); group.position.copy(this.chef.root.position).add(new THREE.Vector3(0, 1.9, 0));
    this.scene.add(group); const angle = this.chef.root.rotation.y;
    this.projectiles.push({ group, velocity: new THREE.Vector3(Math.sin(angle) * 8, 5, Math.cos(angle) * 8), age: 0, egg: item === 'egg' });
    this.timing = null; this.dispatch({ type: 'throw' });
  }
  prank(kind: 'flour' | 'butter') {
    if (this.paused || this.cooldown > 0 || this.state.status !== 'playing') return;
    const enabled = this.settings.pranks && this.state.mode !== 'cozy';
    this.dispatch({ type: 'prank', prank: kind, enabled });
    if (!enabled) return; this.cooldown = 6;
    if (kind === 'flour') { this.burst(this.chef.root.position.clone().add(new THREE.Vector3(0, 2, 0)), '#fff5d7', 36); this.emote = 'panic'; this.emoteUntil = this.elapsed + 1.2; }
    else {
      if (this.hazard) { this.scene.remove(this.hazard); this.hazard.geometry.dispose(); }
      this.hazard = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.025, 24), material('#eac64c'));
      this.hazard.position.copy(this.chef.root.position); this.hazard.position.y = 0.035; this.hazard.position.z += 1; this.scene.add(this.hazard);
      this.hazard.userData.expires = this.elapsed + 18;
    }
    this.emit();
  }
  playEmote(emote: string) { this.emote = emote; this.emoteUntil = this.elapsed + 3; }
  private emit() { this.onView({ round: this.state, nearest: this.nearest, camera: this.mode, paused: this.paused, timing: this.timing, timingValue: this.timingValue(), cooldown: this.cooldown, moving: !!this.destination }); }
  private blocked(x: number, z: number) {
    const radius = 0.32; if (x < -6.8 || x > 6.75 || z < -4.5 || z > 4.55) return true;
    return COLLIDERS.some(c => x + radius > c.x1 && x - radius < c.x2 && z + radius > c.z1 && z - radius < c.z2);
  }
  private updateMovement(dt: number) {
    let x = this.joystick.x, z = this.joystick.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    let direction = new THREE.Vector3(x, 0, z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw + (this.mode === 'front' ? Math.PI : 0));
    if (Math.abs(x) + Math.abs(z) > 0.05) this.destination = null;
    if (this.destination) {
      direction.set(this.destination.x - this.chef.root.position.x, 0, this.destination.y - this.chef.root.position.z);
      if (direction.length() < 0.1) { this.destination = null; direction.set(0, 0, 0); }
    }
    const moving = direction.length() > 0.08; direction.normalize();
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = this.elapsed < this.slipUntil ? 0.8 : sprint ? 5.1 : 3.3;
    const pos = this.chef.root.position;
    if (!this.blocked(pos.x + direction.x * speed * dt, pos.z)) pos.x += direction.x * speed * dt;
    if (!this.blocked(pos.x, pos.z + direction.z * speed * dt)) pos.z += direction.z * speed * dt;
    if (moving) {
      const angle = Math.atan2(direction.x, direction.z); const diff = Math.atan2(Math.sin(angle - this.chef.root.rotation.y), Math.cos(angle - this.chef.root.rotation.y)); this.chef.root.rotation.y += diff * Math.min(1, dt * 12);
      if (this.timing) this.timing = null;
    }
    this.jumpVelocity -= 14 * dt; this.vertical = Math.max(0, this.vertical + this.jumpVelocity * dt); if (this.vertical === 0) this.jumpVelocity = 0;
    pos.y = this.vertical;
    const target = STATIONS.reduce<{ id: StationId | null; dist: number }>((a, s) => { const d = Math.hypot(pos.x - s.x, pos.z - s.z); return d < a.dist ? { id: s.id, dist: d } : a; }, { id: null, dist: 2.3 });
    this.nearest = target.id;
    if (this.hazard && this.hazard.position.distanceTo(pos) < 0.75 && this.elapsed > this.slipUntil + 3) {
      this.slipUntil = this.elapsed + 1.4; this.state = { ...this.state, message: 'An extremely dignified butter ballet. You’ll be back on your feet in a second.' }; this.audio.effect('mistake');
    }
    this.animateChef(this.chef, moving ? sprint ? 1.5 : 1 : 0, dt);
    if (this.elapsed < this.slipUntil && !this.settings.reducedMotion) { this.chef.body.rotation.z = Math.sin((this.slipUntil - this.elapsed) * Math.PI / 1.4) * 1.1; this.chef.arms[0].rotation.z = Math.sin(this.elapsed * 18); this.chef.arms[1].rotation.z = -Math.sin(this.elapsed * 18); }
  }
  private animateChef(chef: Chef, speed: number, _dt: number) {
    const t = this.elapsed, amount = this.settings.reducedMotion ? 0.15 : 1;
    const walk = Math.sin(t * 9 * Math.max(1, speed)) * speed;
    chef.body.position.y = Math.abs(walk) * 0.065 * amount + Math.sin(t * 2) * 0.012;
    chef.body.rotation.z = walk * 0.035 * amount; chef.body.rotation.x = speed ? -0.055 : 0;
    chef.head.rotation.y = Math.sin(t * 1.1) * 0.04 * amount; chef.hat.rotation.z = Math.sin(t * 7 - 0.7) * (speed ? 0.09 : 0.025) * amount;
    chef.legs.forEach((leg, i) => { leg.rotation.x = walk * 0.65 * (i ? -1 : 1) * amount; });
    chef.arms.forEach((arm, i) => { arm.rotation.x = (this.state.held && chef === this.chef) ? -0.8 : walk * 0.5 * (i ? 1 : -1) * amount; arm.rotation.z = i ? -0.08 : 0.08; });
    const blink = Math.sin(t * 0.9) > 0.997; chef.eyes.forEach(eye => eye.scale.y = blink ? 0.1 : 1.2);
    if (this.emoteUntil > t && chef === this.chef) {
      if (this.emote === 'wave') { chef.arms[1].rotation.z = -2.2 + Math.sin(t * 9) * 0.3; }
      else if (this.emote === 'dance') { chef.body.rotation.y = Math.sin(t * 5) * 0.4; chef.arms.forEach((a, i) => a.rotation.z = (i ? -1 : 1) * (1.4 + Math.sin(t * 6) * 0.3)); chef.body.position.y += Math.abs(Math.sin(t * 5)) * 0.12; }
      else if (this.emote === 'facepalm') { chef.arms[1].rotation.x = -2.3; chef.head.rotation.x = 0.2; }
      else { chef.arms.forEach((a, i) => a.rotation.z = (i ? -1 : 1) * 1.8); chef.mouth.scale.y = 1.8; }
    } else { chef.body.rotation.y *= 0.9; chef.head.rotation.x *= 0.9; chef.mouth.scale.y = 0.65; }
  }
  private updateKitchen() {
    const s = this.state;
    if (s.held !== this.lastHeld) {
      this.chef.held.children.forEach(o => this.disposeObject(o, false)); this.chef.held.clear();
      this.firstHeld.children.forEach(o => this.disposeObject(o, false)); this.firstHeld.clear();
      if (s.held) { this.chef.held.add(createItem(s.held)); this.firstHeld.add(createItem(s.held)); } this.lastHeld = s.held;
    }
    this.kitchen.bowlFill.visible = this.active ? s.ingredients.length > 0 : true;
    this.kitchen.bowlFill.position.y = 1.74 + s.ingredients.length * 0.09;
    if (s.lastEvent === 'mix' && this.active) { this.kitchen.whisk.rotation.z = Math.sin(this.elapsed * 12) * 0.35; this.kitchen.whisk.rotation.y = this.elapsed * 6; }
    else { this.kitchen.whisk.rotation.z = -0.35; }
    if (this.timing) { this.chef.held.rotation.z = Math.sin((this.elapsed - this.timingStart) * 3) * 0.4; }
    else this.chef.held.rotation.z = 0;
    this.kitchen.pancake.visible = this.active ? s.pan !== 'empty' : true;
    this.kitchen.pancake.traverse(o => { if (o instanceof THREE.Mesh) o.material = material(s.pan === 'burned' ? '#594536' : s.pan === 'first' && s.heat < 4 ? '#f0d697' : '#df9c45'); });
    const flip = s.lastEvent === 'flip' && s.heat < 0.8 ? Math.sin(s.heat / 0.8 * Math.PI) : 0;
    this.kitchen.pancake.position.y = 1.84 + flip * 1.3; this.kitchen.pancake.rotation.x = flip * Math.PI * 2;
    this.kitchen.smoke.children.forEach((o, i) => { o.visible = s.pan === 'burned' || ((s.pan === 'first' || s.pan === 'second') && s.heat > 3 && i < 3); o.position.y = ((this.elapsed * 0.6 + i * 0.3) % 2); o.scale.setScalar(0.5 + o.position.y * 0.6); });
    this.kitchen.stoveGlow.visible = s.pan !== 'empty';
    const count = this.active ? s.served : 3;
    if (this.lastServed !== count) {
      this.kitchen.plate.children.forEach(o => this.disposeObject(o, false)); this.kitchen.plate.clear();
      for (let i = 0; i < count; i++) { const cake = createItem('pancake'); cake.position.y = i * 0.115; cake.scale.setScalar(1.15); cake.rotation.y = i; this.kitchen.plate.add(cake); }
      this.lastServed = count;
    }
    if (this.active) {
      const target = nextObjective(s).station; const d = DESTINATIONS[target]; this.kitchen.ring.position.set(d.x, 0.04, d.y);
      this.kitchen.ring.scale.setScalar(1 + Math.sin(this.elapsed * 3) * (this.settings.reducedMotion ? 0 : 0.09));
      this.kitchen.labels.forEach((label, i) => { label.visible = this.mode !== 'first'; label.material.opacity = STATIONS[i].id === this.nearest ? 1 : 0.95; });
    }
  }
  private updateCamera(dt: number) {
    const target = new THREE.Vector3(), desired = new THREE.Vector3();
    if (!this.active) {
      const sway = this.settings.reducedMotion ? 0 : Math.sin(this.elapsed * 0.13) * 0.4;
      desired.set(12.4 + sway, 10, 14.6); target.set(0, 1.05, -0.6); this.hands.visible = false;
    } else {
      const pos = this.chef.root.position; target.copy(pos).add(new THREE.Vector3(0, this.mode === 'first' ? 2.4 : 1.35, 0));
      if (this.mode === 'first') {
        desired.copy(target); target.add(new THREE.Vector3(-Math.sin(this.yaw) * 5, -this.pitch * 2, -Math.cos(this.yaw) * 5));
        this.chef.root.visible = false; this.hands.visible = true;
        this.hands.position.y = this.settings.reducedMotion ? 0 : Math.sin(this.elapsed * 6) * 0.008;
      } else {
        this.chef.root.visible = true; this.hands.visible = false;
        const angle = this.yaw + (this.mode === 'front' ? Math.PI : 0);
        desired.copy(pos).add(new THREE.Vector3(Math.sin(angle) * this.zoom, 5.5 + this.pitch * 5, Math.cos(angle) * this.zoom));
        // Keep the follow camera on the room side of the back and side walls.
        desired.x = THREE.MathUtils.clamp(desired.x, -8.1, 8.1); desired.z = Math.max(-4.55, desired.z); desired.y = Math.max(desired.y, 4.8);
      }
    }
    if (this.mode === 'first' && this.active) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, this.settings.reducedMotion ? 1 : 1 - Math.exp(-dt * 7));
    this.camera.lookAt(target);
  }
  private burst(position: THREE.Vector3, color: string, count: number) {
    const n = this.settings.quality === 'low' ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 + Math.random() * 0.08, 0), material(color)); m.position.copy(position); this.scene.add(m);
      this.particles.push({ mesh: m, velocity: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 5 + 1, (Math.random() - 0.5) * 5), age: 0, life: 1.1 + Math.random() });
    }
  }
  private updatePhysics(dt: number) {
    this.projectiles = this.projectiles.filter(p => {
      p.age += dt; p.velocity.y -= 9.8 * dt; p.group.position.addScaledVector(p.velocity, dt); p.group.rotation.x += dt * 3;
      if (p.group.position.y < 0.18 || Math.abs(p.group.position.x) > 7 || p.group.position.z < -4.6 || p.group.position.z > 4.7) {
        this.burst(p.group.position, p.egg ? '#f4ce56' : '#fff4d1', 16); this.audio.effect('splash'); this.scene.remove(p.group); this.disposeObject(p.group, false); return false;
      }
      if (p.age > 5) { this.scene.remove(p.group); this.disposeObject(p.group, false); return false; } return true;
    });
    this.particles = this.particles.filter(p => { p.age += dt; p.velocity.y -= 6 * dt; p.mesh.position.addScaledVector(p.velocity, dt); p.mesh.scale.setScalar(Math.max(0.01, 1 - p.age / p.life)); if (p.age > p.life) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); return false; } return true; });
    if (this.hazard && this.elapsed > this.hazard.userData.expires) { this.scene.remove(this.hazard); this.hazard.geometry.dispose(); this.hazard = undefined; }
  }
  private loop = () => {
    if (this.disposed) return;
    const now = performance.now();
    if ((this.paused || !this.active) && now - this.last < (this.paused ? 100 : 33)) { this.frame = requestAnimationFrame(this.loop); return; }
    const dt = Math.min((now - this.last) / 1000, 0.25); this.last = now;
    if (!this.paused) {
      this.elapsed += dt;
      if (this.active && this.state.status === 'playing') { this.updateMovement(dt); const oldEvent = this.state.event; this.state = recipeReducer(this.state, { type: 'tick', dt }); if (oldEvent !== this.state.event) { this.audio.effect(this.state.lastEvent); if (this.state.lastEvent === 'disaster') this.burst(new THREE.Vector3(0, 2, 0), '#fff6dc', 70); } this.cooldown = Math.max(0, this.cooldown - dt); }
      else { this.animateChef(this.chef, 0, dt); this.animateChef(this.friend, 0, dt); if (!this.active && !this.settings.reducedMotion) this.friend.arms[1].rotation.z = -0.9 + Math.sin(this.elapsed * 2) * 0.2; }
      this.updateKitchen(); this.updatePhysics(dt);
    }
    this.updateCamera(dt); this.renderer.render(this.scene, this.camera);
    this.reportTime += dt; if (this.active && this.reportTime > 0.08) { this.emit(); this.reportTime = 0; }
    this.frame = requestAnimationFrame(this.loop);
  };
  capture(format: 'wide' | 'square' | 'story', filter: 'warm' | 'original' | 'mono', caption: string): string {
    const size = format === 'wide' ? [1920, 1080] : format === 'square' ? [1080, 1080] : [1080, 1920];
    const output = document.createElement('canvas'); [output.width, output.height] = size;
    const ctx = output.getContext('2d')!; const oldSize = new THREE.Vector2(); this.renderer.getSize(oldSize); const oldRatio = this.renderer.getPixelRatio(), oldAspect = this.camera.aspect;
    // Re-render the real scene at export resolution/aspect instead of upscaling the viewport.
    try { this.renderer.setPixelRatio(1); this.renderer.setSize(size[0], size[1], false); this.camera.aspect = size[0] / size[1]; this.camera.updateProjectionMatrix(); this.renderer.render(this.scene, this.camera);
      ctx.filter = filter === 'warm' ? 'sepia(.22) saturate(1.12)' : filter === 'mono' ? 'grayscale(1)' : 'none'; ctx.drawImage(this.canvas, 0, 0); ctx.filter = 'none';
      if (caption.trim()) { ctx.fillStyle = '#fff5e4'; ctx.fillRect(0, size[1] - 120, size[0], 120); ctx.fillStyle = '#503b30'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(caption.slice(0, 60), size[0] / 2, size[1] - 48, size[0] - 80); }
      return output.toDataURL('image/png');
    } finally { this.renderer.setPixelRatio(oldRatio); this.renderer.setSize(oldSize.x, oldSize.y, false); this.camera.aspect = oldAspect; this.camera.updateProjectionMatrix(); this.renderer.render(this.scene, this.camera); }
  }
  /** Dispose geometry per object; shared palette materials stay alive until engine shutdown. */
  private disposeObject(object: THREE.Object3D, materials: boolean) { object.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); if (materials) { for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose(); } } if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); } }); }
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); this.listeners.forEach(fn => fn()); this.observer.disconnect(); this.audio.dispose(); this.disposeObject(this.scene, false); this.renderer.dispose(); }
}
