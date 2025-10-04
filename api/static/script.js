import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js";

const infoBox = document.getElementById("info-box");
const select = document.getElementById("obj-select");
const container = document.getElementById("three-container");
const btnBack = document.getElementById("btnBack");
const btnForward = document.getElementById("btnForward");

const AU = 30;
let animationIndex = 0;
let ASTEROIDS = {};
let circleLayers = null;

fetch("/api/objects/")
  .then((result) => result.json())
  .then((json) => {
    localStorage.setItem("objects", JSON.stringify(json));
    select.innerHTML = "";
    json.forEach((obj) => {
      const option = document.createElement("option");
      option.value = obj.id;
      option.textContent = obj.name;
      select.appendChild(option);
      ASTEROIDS[obj.id] = { ...obj };
    });

    updateInfo(select.value);
  });

async function updateInfo(key) {
  const data = ASTEROIDS[key];

  if (data.size_m === undefined) {
    let response = await fetch(`/api/objects/${key}/`).then((response) =>
      response.json(),
    );
    ASTEROIDS[key] = {
      ...ASTEROIDS[key],
      ...response,
    };
  }

  let size = `${Math.floor(ASTEROIDS[key].estimated_diameter.meters.estimated_diameter_min)}–${Math.floor(ASTEROIDS[key].estimated_diameter.meters.estimated_diameter_max)}`

  infoBox.innerHTML = `
    <div class="info-row"><div class="info-label">Name</div><div>${data.name}</div></div>
    <div class="info-row"><div class="info-label">Full name</div><div>${data.fullname || "-"}</div></div>
    <div class="info-row"><div class="info-label">Diameter</div><div>${size} meters</div></div>
    <div class="info-row"><div class="info-label">Notes</div><div>?</div></div>
    <div class="info-row"><div class="info-label">Closest distance</div><div>?</div></div>
    <div class="info-row"><div class="info-label">Current distance</div><div>?</div></div>
  `;

  window.asteroidOrbit?.updateOrbit(data);
  window.earthOrbit?.updateOrbit(data);

  const COLLISION = true;

  if (COLLISION) {
    const impactData = await fetch(`/api/objects/${key}/impact`).then(
      (response) => response.json(),
    );

    if (circleLayers) {
      circleLayers.forEach((layer) => map.removeLayer(layer));
    }
    circleLayers = [];

    document.querySelector("#impact-casualties").innerText =
      impactData.casualties;
    document.querySelector("#impact-other").innerText = impactData.other;

    impactData.circles?.forEach((data) => {
      let layer = L.circle([data.x, data.y], {
        radius: data.radius,
        color: data.color,
        fillColor: data.color,
        fillOpacity: 0.3,
      })
        .addTo(map)
        .bindPopup(data.note)
        .openPopup();

      circleLayers.push(layer);
    });
  }
}

select.addEventListener("change", (e) => updateInfo(e.target.value));

(function initThree() {
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
          p.b * AU * Math.sin(theta),
          0,
        ),
      );
    }
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x555555 }),
    );
    scene.add(orbit);
  });

  class Orbit {
    constructor(scene, isPlanet = false) {
      this.isPlanet = isPlanet;
      this.scene = scene;
      this.line = null;
      this.mesh = null;
      this._pts = null;
      this._t = 0;
    }
    async generateEllipse(data) {
      const url = this.isPlanet
        ? "/api/earth/orbit/"
        : `/api/objects/${data.id}/orbit/`;
      const json = await fetch(url)
        .then((response) => response.json())
        .then((json) =>
          json.map((p) => new THREE.Vector3(p[0] * AU, p[1] * AU, p[2] * AU)),
        );
      return json;
    }
    async updateOrbit(data) {
      if (this.line) {
        this.scene.remove(this.line);
        this.line.geometry.dispose();
      }
      if (this.mesh) {
        this.scene.remove(this.mesh);
      }

      const pts = await this.generateEllipse(data);
      if (pts.length === 0) return;
      this.line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: this.isPlanet ? 0x3366ff : 0xff4444,
        }),
      );
      this.scene.add(this.line);
      this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 12),
        new THREE.MeshLambertMaterial({
          color: this.isPlanet ? 0x3366ff : 0xff5555,
        }),
      );
      this.mesh.position.copy(pts[0]);
      this.scene.add(this.mesh);
      this._pts = pts;
      this._t = 0;
    }
    animate(step) {
      console.log(step);
      if (!this._pts) return;
      this._t = (this._t + step) % this._pts.length;
      this.mesh.position.copy(this._pts[Math.floor(this._t)]);
    }
  }

  const asteroidOrbit = new Orbit(scene);
  window.asteroidOrbit = asteroidOrbit;
  const earthOrbit = new Orbit(scene, true);
  window.earthOrbit = earthOrbit;

  // Lights
  const ambient = new THREE.AmbientLight(0x666666, 6.5);
  scene.add(ambient);
  const pointLight = new THREE.PointLight(0xffffff, 1.5, 0);
  scene.add(pointLight);

  // Animation loop
  function animate() {
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

btnBack.addEventListener("click", () => {
  window.asteroidOrbit.animate(-1.0);
  window.earthOrbit.animate(-1.0);
});

btnForward.addEventListener("click", () => {
  window.asteroidOrbit.animate(1.0);
  window.earthOrbit.animate(1.0);
});

var map;
(function initMap() {
  map = L.map("map", { center: [20, 0], zoom: 2 });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
})();
