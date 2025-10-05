import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js";

const infoBox = document.getElementById("info-box");
const select = document.getElementById("obj-select");
const sort = document.getElementById("obj-sorting");
const container = document.getElementById("three-container");
const btnBack = document.getElementById("btnBack");
const btnForward = document.getElementById("btnForward");
const btnPlayPause = document.getElementById("btnPlayPause");
const simulationDate = document.getElementById("simulationDate");

const AU = 30;
let rawAsteroidList = [];
let ASTEROIDS = {};
let circleLayers = [];
let currentKey = null;
let asteroidClosestDistanceDate = null;
let simulationRunning = true;
let simulationReady = false;

function addDaysToDate(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

async function updateList() {
  if (rawAsteroidList.length === 0) {
    await fetch("/api/objects/")
      .then((result) => result.json())
      .then((json) => {
        rawAsteroidList = json;
      });
  }

  const sortCriteria = sort.value;

  let sortedAsteroidList;
  if (sortCriteria === "Name") {
    sortedAsteroidList = rawAsteroidList.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } else if (sortCriteria === "Diameter") {
    sortedAsteroidList = rawAsteroidList.sort(
      (a, b) => a.max_diameter_km - b.max_diameter_km,
    );
  } else if (sortCriteria === "Closest approach date") {
    sortedAsteroidList = rawAsteroidList.sort((a, b) =>
      a.closest_approach_date.localeCompare(b.closest_approach_date),
    );
  } else if (sortCriteria === "Closest approach distance") {
    sortedAsteroidList = rawAsteroidList.sort(
      (a, b) => a.closest_miss_km - b.closest_miss_km,
    );
  }

  ASTEROIDS = [];
  select.innerHTML = "";

  sortedAsteroidList.forEach((obj) => {
    ASTEROIDS[obj.id] = { ...obj };
    const option = document.createElement("option");
    option.value = obj.id;
    option.textContent = obj.name;
    select.appendChild(option);
  });

  updateInfo(Object.keys(ASTEROIDS)[0]);
}

updateList();

async function updateImpact(key, lat, lon) {
  let data = ASTEROIDS[key];

  let tempLayer = L.circle([lat, lon], {
    radius: 10000,
    color: "#FFF",
    fillColor: "#FFF",
    fillOpacity: 0.5,
  })
    .addTo(map)
    .bindPopup("Calculating...")
    .openPopup();
  circleLayers.push(tempLayer);

  const impactData = await fetch(
    `/api/objects/${key}/impact/?lat=${lat}&lon=${lon}`,
  ).then((response) => response.json());

  if (circleLayers) {
    circleLayers.forEach((layer) => map.removeLayer(layer));
  }
  circleLayers = [];

  document.querySelector("#impact-casualties").innerText =
    impactData.casualties;
  document.querySelector("#impact-energy").innerText =
    `${Math.floor(impactData.energy_megaton)} MT`;
  document.querySelector("#impact-other").innerText = impactData.other;

  impactData.circles?.forEach((data) => {
    let layer = L.circle([data.lat, data.lon], {
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

async function updateInfo(key) {
  simulationRunning = false;
  simulationReady = false;
  updateBtnPlayPauseUI();

  currentKey = key;
  let data = ASTEROIDS[key];

  if (data.size_m === undefined) {
    let response = await fetch(`/api/objects/${key}/`).then((response) =>
      response.json(),
    );
    ASTEROIDS[key] = {
      ...ASTEROIDS[key],
      ...response,
    };
  }

  data = ASTEROIDS[key];
  const diameter = `${Math.floor(data.estimated_diameter.meters.estimated_diameter_min)}–${Math.floor(data.estimated_diameter.meters.estimated_diameter_max)}`;
  const today = new Date();

  let closestDistance = data.closest_miss_km;
  let closestDistanceDate = data.closest_approach_date;
  let relativeVelocity = data.relative_velocity_km_s;
  const moonDistance = 384_400;

  let closestDistanceMoonMultiplier = closestDistance / moonDistance;
  let roundingFactor = closestDistanceMoonMultiplier < 10 ? 10 : 1;
  closestDistanceMoonMultiplier =
    Math.round((closestDistance * roundingFactor) / moonDistance) /
    roundingFactor;
  asteroidClosestDistanceDate = closestDistanceDate;

  infoBox.innerHTML = `
    <div class="info-row"><div class="info-label">SPK ID</div><div><a href="${data.links.self}">${data.object.spkid}</a></div></div>
    <div class="info-row"><div class="info-label">Name</div><div>${data.name}</div></div>
    <div class="info-row"><div class="info-label">Full name</div><div>${data.object.fullname || "-"}</div></div>
    <div class="info-row"><div class="info-label">Diameter</div><div>${diameter} meters</div></div>
    <div class="info-row"><div class="info-label">Orbit length</div><div>${Math.floor(data.orbital_data.orbital_period)} days</div></div>
    <div class="info-row"><div class="info-label">Closest distance</div><div>${Math.floor(closestDistance)} km (${closestDistanceMoonMultiplier} x 🌙)</div></div>
    <div class="info-row"><div class="info-label">Date</div><div>${closestDistanceDate}</div></div>
    <div class="info-row"><div class="info-label">Relative velocity:</div><div>${Math.floor(relativeVelocity)} km/s</div></div>
  `;

  await Promise.all([
    window.asteroidOrbit?.updateOrbit(data),
    window.earthOrbit?.updateOrbit(data),
  ]);

  simulationRunning = true;
  simulationReady = true;
  updateBtnPlayPauseUI();
}

select.addEventListener("change", (e) => updateInfo(e.target.value));
sort.addEventListener("change", (e) => updateList());

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
      this._firstDate = "2000-01-01";
    }
    async generateEllipse(data) {
      let url = this.isPlanet
        ? "/api/earth/orbit/"
        : `/api/objects/${data.id}/orbit/`;

      if (asteroidClosestDistanceDate) {
        const closestDate = new Date(asteroidClosestDistanceDate);
        const threeMonthsEarlier = new Date(
          closestDate.setMonth(closestDate.getMonth() - 3),
        );
        const earlyDateAsStr = threeMonthsEarlier.toISOString().split("T")[0];
        this._firstDate = earlyDateAsStr;
        url += "?start_date=" + earlyDateAsStr;
      }

      const steps = Math.ceil(data.orbital_data.orbital_period);
      url += "&steps=" + steps;

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
      if (!this._pts) return;
      this._t = (this._t + step) % this._pts.length;
      this.mesh.position.copy(this._pts[Math.floor(this._t)]);
      simulationDate.innerText = addDaysToDate(this._firstDate, -90 + this._t);
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

function stepAnimation(direction) {
  window.asteroidOrbit.animate(direction);
  window.earthOrbit.animate(direction);
}

function autoStepAnimation() {
  setTimeout(() => {
    if (simulationRunning) {
      stepAnimation(1.0);
    }
    autoStepAnimation();
  }, 250);
}

autoStepAnimation();

btnBack.addEventListener("click", () => {
  stepAnimation(-1.0);
});

btnForward.addEventListener("click", () => {
  stepAnimation(1.0);
});

function updateBtnPlayPauseUI() {
  if (simulationRunning) {
    document.querySelector("#btnPlayPause i").classList.add("fa-pause");
    document.querySelector("#btnPlayPause i").classList.remove("fa-play");
  } else {
    document.querySelector("#btnPlayPause i").classList.remove("fa-pause");
    document.querySelector("#btnPlayPause i").classList.add("fa-play");
  }

  btnPlayPause.disabled = !simulationReady;
  btnBack.disabled = !simulationReady;
  btnForward.disabled = !simulationReady;
}

btnPlayPause.addEventListener("click", () => {
  simulationRunning = !simulationRunning;
  updateBtnPlayPauseUI();
});

var map;
(function initMap() {
  map = L.map("map", { center: [20, 0], zoom: 2 });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  map.on("click", function (e) {
    const { lat, lng } = e.latlng;
    updateImpact(currentKey, lat, lng);
  });

  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function (map) {
    var div = L.DomUtil.create("div", "info legend"),
      grades = ["Red", "Orange", "Yellow", "Green"],
      labels = ["Death", "Kinda death", "Not so bad", "Meh"];

    // Add semi-transparent background to the legend
    div.innerHTML += "<h4>Legend</h4>";

    for (var i = 0; i < grades.length; i++) {
      div.innerHTML +=
        '<i style="background:' +
        grades[i] +
        '">&nbsp;&nbsp;&nbsp;&nbsp;</i> ' +
        labels[i] +
        "<br>";
    }

    return div;
  };

  legend.addTo(map);
})();
