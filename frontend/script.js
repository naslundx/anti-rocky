import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js";

/* SPACE VIEW */

const ASTEROIDS = {
  apophis: {
    name: "99942 Apophis",
    size_m: 370,
    type: "PHA",
    notes: "Near-Earth Aten-class. Famous close approaches.",
    a: 0.922,
    e: 0.191,
    i: 3.33,
  },
  bennu: {
    name: "101955 Bennu",
    size_m: 492,
    type: "NEA",
    notes: "OSIRIS-REx target.",
    a: 1.126,
    e: 0.203,
    i: 6.0,
  },
  itokawa: {
    name: "25143 Itokawa",
    size_m: 535,
    type: "NEA",
    notes: "Hayabusa target (rubble pile).",
    a: 1.324,
    e: 0.279,
    i: 1.62,
  },
};

const infoBox = document.getElementById("info-box");
const select = document.getElementById("obj-select");
const dateInput = document.getElementById("obs-date");

function updateInfo(key) {
  if (!key) {
    infoBox.innerHTML =
      '<div style="color:var(--muted)">Select a date and an object to see details here.</div>';
    return;
  }

  const data = ASTEROIDS[key];
  infoBox.innerHTML = `
    <div class="info-row"><div class="info-label">Name</div><div>${data.name}</div></div>
    <div class="info-row"><div class="info-label">Approx. size</div><div>${data.size_m} m</div></div>
    <div class="info-row"><div class="info-label">Type</div><div>${data.type}</div></div>
    <div class="info-row"><div class="info-label">Orbital hints</div><div>a=${data.a} AU · e=${data.e} · i=${data.i}°</div></div>
    <div class="info-row"><div class="info-label">Notes</div><div>${data.notes}</div></div>
  `;

  window.asteroidOrbit?.updateOrbit(data);
}

select.addEventListener("change", (e) => updateInfo(e.target.value));
dateInput.addEventListener("change", () => {
  const d = dateInput.value;
  console.log("Date chosen: ", d);
});

(function initThree() {
  const container = document.getElementById("three-container");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    2000,
  );
  camera.position.set(0, 50, 150);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.enableZoom = true;

  // Sun
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc33 }),
  );
  scene.add(sunMesh);

  // Planet orbits (hardcoded major/minor axes)
  const AU = 30;
  const planetOrbits = [
    { a: 0.39, b: 0.39 },
    { a: 0.72, b: 0.72 },
    { a: 1, b: 0.999 },
    { a: 1.52, b: 1.52 },
    { a: 5.2, b: 5.19 },
    { a: 9.58, b: 9.55 },
    { a: 19.2, b: 19.18 },
    { a: 30.05, b: 29.8 },
  ];
  planetOrbits.forEach((p) => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      pts.push(
        new THREE.Vector3(
          p.a * AU * Math.cos(theta),
          0,
          p.b * AU * Math.sin(theta),
        ),
      );
    }
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x555555 }),
    );
    scene.add(orbit);
  });

  // Earth
  const earthOrbitRadius = AU;
  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 16, 16),
    new THREE.MeshLambertMaterial({ color: 0x3366ff }),
  );
  scene.add(earthMesh);
  let earthAngle = 0;

  // Asteroid support using getOrbit() function
  class AsteroidOrbit {
    constructor(scene) {
      this.scene = scene;
      this.line = null;
      this.mesh = null;
      this._pts = null;
      this._t = 0;
    }
    generateEllipse(data) {
      const coords = getOrbit(data);
      return coords.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    }
    updateOrbit(data) {
      if (this.line) {
        this.scene.remove(this.line);
        this.line.geometry.dispose();
      }
      if (this.mesh) {
        this.scene.remove(this.mesh);
      }
      const pts = this.generateEllipse(data);
      if (pts.length === 0) return;
      this.line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xff4444 }),
      );
      this.scene.add(this.line);
      this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0xff5555 }),
      );
      this.mesh.position.copy(pts[0]);
      this.scene.add(this.mesh);
      this._pts = pts;
      this._t = 0;
    }
    animate(step) {
      if (!this._pts) return;
      this._t = (this._t + step) % this._pts.length;
      this.mesh.position.copy(this._pts[Math.floor(this._t)]);
    }
  }

  const asteroidOrbit = new AsteroidOrbit(scene);
  window.asteroidOrbit = asteroidOrbit;

  select.value = "apophis";
  updateInfo("apophis");
  asteroidOrbit.updateOrbit(ASTEROIDS["apophis"]);

  // Lights
  const ambient = new THREE.AmbientLight(0x666666);
  scene.add(ambient);
  const pointLight = new THREE.PointLight(0xffffff, 1.5, 0);
  scene.add(pointLight);

  // Animation loop
  let last = performance.now();
  function animate() {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    earthAngle += dt * 0.5;
    earthMesh.position.set(
      Math.cos(earthAngle) * earthOrbitRadius,
      0,
      Math.sin(earthAngle) * earthOrbitRadius,
    );
    asteroidOrbit.animate(0.8);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener("resize", () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  });
})();

/* MAP VIEW */

(function initMap() {
  const map = L.map("map", { center: [20, 0], zoom: 2 });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  const center = [55.6761, 12.5683];
  const radiusMeters = 500000;
  L.circle(center, { radius: radiusMeters }).addTo(map);
  L.marker(center)
    .addTo(map)
    .bindPopup("Hardcoded center (Denmark)")
    .openPopup();
})();
