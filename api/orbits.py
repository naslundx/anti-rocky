from functools import lru_cache

import numpy as np
import astropy.units as u
from astropy.constants import G, M_sun
from astropy.time import Time


def generate_epochs(start_epoch, dt=1, n_steps=10):
    dt_days = (dt * u.day).to(u.day).value
    offsets = np.arange(n_steps) * dt_days
    return [start_epoch + offset * u.day for offset in offsets]


@lru_cache(maxsize=10000)
def propagateKeplerToHeliocentricXYZ(a, e, i, raan, argp, M0, epoch0, epoch):
    """
    Propagate a Keplerian orbit around the Sun using Astropy.

    Parameters
    ----------
    a : ~astropy.units.Quantity
        Semi-major axis (e.g. in AU)
    e : float
        Eccentricity
    i : ~astropy.units.Quantity
        Inclination
    raan : ~astropy.units.Quantity
        Right ascension of ascending node
    argp : ~astropy.units.Quantity
        Argument of periapsis
    M0 : ~astropy.units.Quantity
        Mean anomaly at epoch0
    epoch0 : ~astropy.time.Time
        Reference epoch
    epoch : ~astropy.time.Time
        Target epoch

    Returns
    -------
    r_xyz : ~astropy.units.Quantity
        Heliocentric position vector [x, y, z] in AU
    """

    # Gravitational parameter (Sun) in AU³/day²
    mu = (G * M_sun).to(u.AU**3 / u.day**2).value

    # Mean motion (rad/day)
    n = np.sqrt(mu / a.to(u.AU).value**3)

    # Time since epoch0 [days]
    dt = (epoch - epoch0).to(u.day).value

    # Mean anomaly at target epoch
    M = np.deg2rad(M0.value) + n * dt

    # --- Solve Kepler's equation for E ---
    E = M.copy()
    for _ in range(20):
        E -= (E - e * np.sin(E) - M) / (1 - e * np.cos(E))

    # True anomaly
    nu = 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2),
                        np.sqrt(1 - e) * np.cos(E / 2))

    # Radius
    r_mag = a.to(u.AU).value * (1 - e * np.cos(E))

    # --- Convert to heliocentric inertial coordinates ---
    Ω = np.deg2rad(raan.value)
    ω = np.deg2rad(argp.value)
    i_rad = np.deg2rad(i.value)

    x = r_mag * (np.cos(Ω) * np.cos(ω + nu) - np.sin(Ω) * np.sin(ω + nu) * np.cos(i_rad))
    y = r_mag * (np.sin(Ω) * np.cos(ω + nu) + np.cos(Ω) * np.sin(ω + nu) * np.cos(i_rad))
    z = r_mag * (np.sin(i_rad) * np.sin(ω + nu))

    return np.array([x, y, z]) * u.AU


def compute_orbit(data, start, dt=1, steps=1000):
    epochs = generate_epochs(Time(start, scale="tdb"), dt=dt, n_steps=steps)

    orbit = []
    for epoch in epochs:
        position = propagateKeplerToHeliocentricXYZ(
            a=data["a"],
            e=data["e"],
            i=data["i"],
            raan=data["raan"],
            argp=data["argp"],
            M0=data["M0"],
            epoch0=Time(data["epoch0"], scale="tdb"),
            epoch=epoch,
        )
        orbit.append((float(position[0].value), float(position[1].value), float(position[2].value)))

    return orbit


@lru_cache()
def compute_earth_orbit(start, dt=1, steps=366):
    data = {
        "a": 1.00000018 * u.AU,
        "e": 0.01671123,
        "i": -0.00054346 * u.deg,
        "raan": -11.26064 * u.deg,
        "argp": 114.20783 * u.deg,
        "M0": -2.48284 * u.deg,
        "epoch0": Time(2451545.0, format='jd'),
    }

    orbit = compute_orbit(data, start, dt, steps)
    return orbit
