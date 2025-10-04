function datetimeToJD(year, month, day, hour = 0, minute = 0, second = 0) {
  // Convert a Gregorian calendar date to Julian Date
  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  const dayFraction = (hour + (minute + second / 60) / 60) / 24;

  const JD =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    dayFraction +
    B -
    1524.5;

  return JD;
}

function sbdbToHeliocentricXYZ(elements, tJD) {
  // elements = {a, e, i, Ω, ω, M0, epoch} (all numbers)
  // a in AU, i/Ω/ω/M0 in degrees, epoch in JD
  // tJD = target Julian Date

  const deg2rad = Math.PI / 180;
  const k = 0.01720209895; // Gaussian gravitational constant (AU^(3/2)/day)

  const a = elements.a;
  const e = elements.e;
  const i = elements.i * deg2rad;
  const Ω = elements.Ω * deg2rad;
  const ω = elements.ω * deg2rad;
  const M0 = elements.M0 * deg2rad;
  const t0 = elements.epoch;

  // mean motion (rad/day)
  const n = k / Math.sqrt(a * a * a);

  // propagate mean anomaly
  let M = M0 + n * (tJD - t0);
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // wrap 0..2pi

  // solve Kepler's equation (elliptic)
  function solveKepler(M, e, tol = 1e-12, maxIter = 100) {
    let E = e < 0.8 ? M : Math.PI;
    for (let iter = 0; iter < maxIter; iter++) {
      const f = E - e * Math.sin(E) - M;
      const fprime = 1 - e * Math.cos(E);
      const dE = -f / fprime;
      E += dE;
      if (Math.abs(dE) < tol) return E;
    }
    throw new Error("Kepler equation did not converge");
  }

  const E = solveKepler(M, e);

  // true anomaly
  const nu =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    );

  // distance
  const r = a * (1 - e * Math.cos(E));

  // perifocal coordinates
  const x_pf = r * Math.cos(nu);
  const y_pf = r * Math.sin(nu);
  const z_pf = 0;

  // rotation to ecliptic heliocentric coordinates
  const cosO = Math.cos(Ω),
    sinO = Math.sin(Ω);
  const cosi = Math.cos(i),
    sini = Math.sin(i);
  const cosw = Math.cos(ω),
    sinw = Math.sin(ω);

  const X =
    (cosO * cosw - sinO * sinw * cosi) * x_pf +
    (-cosO * sinw - sinO * cosw * cosi) * y_pf;
  const Y =
    (sinO * cosw + cosO * sinw * cosi) * x_pf +
    (-sinO * sinw + cosO * cosw * cosi) * y_pf;
  const Z = sinw * sini * x_pf + cosw * sini * y_pf;

  return { X, Y, Z }; // in AU
}

// Example usage
const elements = {
  a: 3.16, // AU
  e: 0.117,
  i: 7.01, // degrees
  Ω: 329, // degrees
  ω: 308, // degrees
  M0: 299, // degrees
  epoch: 2459000.5, // JD
};

function getOrbit(dt = 1, steps = 1) {
  let jd = datetimeToJD(2025, 11, 4, 14, 0, 0);
  let result = [];

  for (let step = 0; step < steps; step++) {
    const pos = sbdbToHeliocentricXYZ(elements, jd);
    result.push(pos);
    jd += dt;
  }

  return result;
}
