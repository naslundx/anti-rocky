from astropy import units as u
from astropy.time import Time
from poliastro.bodies import Sun
from poliastro.twobody import Orbit


def convertToHeliocentric(a, ecc, inc, raan, argp, M0):
    return (1, 2, 3)  # TODO

    # a = 2.3 * u.AU          # semi-major axis
    # ecc = 0.12 * u.one      # eccentricity
    # inc = 5.2 * u.deg       # inclination
    # raan = 120 * u.deg      # longitude of ascending node (Ω)
    # argp = 250 * u.deg      # argument of perihelion (ω)
    # M0 = 10 * u.deg         # mean anomaly at epoch

    epoch = Time("2025-10-02T00:00:00", scale="tdb")  # current time
    epoch0 = Time("2020-05-31T00:00:00", scale="tdb")  # SBDB epoch
    orb = Orbit.from_classical(Sun, a, ecc, inc, raan, argp, M0, epoch=epoch0)
    orb_t = orb.propagate(epoch - epoch0)
    r = orb_t.r.to(u.AU)  # position vector (in AU units)
    return r


def compute_orbit(dt=1, steps=100):
    orbit = []
    for _ in range(steps):
        orbit.append(convertToHeliocentric(1, 1, 1, 1, 1, 1))
    return orbit
