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

/**
 * Convert SBDB orbital elements to heliocentric coordinates (AU)
 *
 * SBDB elements object should include:
 *  - a  : semi-major axis (AU)
 *  - e  : eccentricity
 *  - i  : inclination (deg)
 *  - node : longitude of ascending node (deg)
 *  - peri : argument of perihelion (deg)
 *  - M   : mean anomaly at epoch (deg) [optional if tp is given]
 *  - epoch : epoch of M (JD) [required if M is given]
 *  - tp  : time of perihelion passage (JD) [optional if M is given]
 *
 * tJD : target Julian Date
 * Returns {X,Y,Z} in AU in heliocentric ecliptic frame
 */
function sbdbToHeliocentricXYZ(sbdb, tJD) {
  const deg2rad = Math.PI / 180;
  const k = 0.01720209895; // Gaussian gravitational constant (AU^(3/2)/day)

  const a = sbdb.a;
  const e = sbdb.e;
  const i = sbdb.i * deg2rad;
  const Ω = sbdb.node * deg2rad;
  const ω = sbdb.peri * deg2rad;

  // mean motion (rad/day)
  const n = k / Math.sqrt(a * a * a);

  // compute mean anomaly at tJD
  let M;
  if (sbdb.tp) {
    // use time of perihelion
    M = n * (tJD - sbdb.tp);
  } else if (sbdb.M !== undefined && sbdb.epoch !== undefined) {
    M = sbdb.M * deg2rad + n * (tJD - sbdb.epoch);
  } else {
    throw new Error("Need either tp or M+epoch to compute mean anomaly");
  }

  // wrap M to 0..2pi
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // solve Kepler's equation for E (elliptic)
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

  // rotation to heliocentric ecliptic
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
const sbdb = {
  a: 3.15887342, // AU
  e: 0.11763735,
  i: 7.0106288, // deg
  node: 328.860282, // Ω in deg
  peri: 308.599079, // ω in deg
  M: 298.8497976, // deg, optional if tp is given
  epoch: 2461000.5, // JD
  // tp: 2459005.0 // optional alternative
};

// target JD
const tJD = 2460600.5;

function getOrbit(dt = 1, steps = 1) {
  let jd = tJD;
  //let jd = datetimeToJD(2025, 11, 4, 14, 0, 0);
  let result = [];

  for (let step = 0; step < steps; step++) {
    const pos = sbdbToHeliocentricXYZ(sbdb, jd);
    result.push(pos);
    jd += dt;
  }

  return result;
}
