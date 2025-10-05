import geopandas as gpd
import math
from shapely.geometry import Point

from population import get_population_worldpop

LAND_DATA = gpd.read_file("ne_110m_land.shp")


def is_on_land(lat, lon):
    point = Point(lon, lat)
    return LAND_DATA.contains(point).any()


def simulate_impact( diameter, density, velocity):
    radius = diameter / 2
    volume = (4/3) * 3.1415 * radius**3
    mass = density * volume
    velocity_m_s = velocity * 1000
    energy_joules = 0.5 * mass * velocity_m_s**2
    energy_megaton = energy_joules / 4.184e15

    r_psi_3000 = 0.25 * (energy_megaton)**(1/3)
    r_psi_200 = 0.45 * (energy_megaton)**(1/3)
    r_psi_20 = 0.75 * (energy_megaton)**(1/3)
    r_psi_5  = 1.9  * (energy_megaton)**(1/3)
    r_psi_1  = 4.6  * (energy_megaton)**(1/3)

    # Thermals
    eta_th = 0.005   # Thermal energy out of total energy
    f_los  = 0.5     # Line of sight estimation (dust/debris blocking part of the radiation)
    E_th = eta_th * energy_joules * f_los

    # Burn degree threshholds (J/m²)
    F1, F2, F3 = 84_000.0, 209_000.0, 418_000.0
    Fwood = 1_464_400.0  # dry wood ignites (~35 cal/cm²)

    def r_for_fluence(F):
        return math.sqrt(E_th / (4 * math.pi * F)) / 1000.0

    r_th_1deg = r_for_fluence(F1)
    r_th_2deg = r_for_fluence(F2)
    r_th_3deg = r_for_fluence(F3)
    r_th_wood = r_for_fluence(Fwood)

    c_diameter = 74 * (energy_megaton **0.294)
    c_radius = c_diameter / 2

    return {
        "mass_kg": mass,
        "energy_joules": energy_joules,
        "energy_megaton": energy_megaton,
        "radius_shelter_destroying_km": r_psi_3000,
        "radius_extreme_km": r_psi_200,
        "radius_heavy_km": r_psi_20,
        "radius_medium_km": r_psi_5,
        "radius_light_km": r_psi_1,
        "thermal_radius_first_deg_km":  r_th_1deg,
        "thermal_radius_second_deg_km": r_th_2deg,
        "thermal_radius_third_deg_km":  r_th_3deg,
        "thermal_radius_wood_ignition_km": r_th_wood,
        "crater_radius": c_radius,
    }


def calculate_impact(data, lat ,lon):
    diameter = float(data["estimated_diameter"]["meters"]["estimated_diameter_max"])
    velocity = float(data["relative_velocity_km_s"])
    density = 3000  # TODO
    on_land = is_on_land(lat, lon)

    scale = 1 if on_land else 0.1

    calculations = simulate_impact(diameter, density, velocity)
    energy_megaton = calculations["energy_megaton"]
    radius_extreme_km = calculations["radius_extreme_km"]
    radius_heavy_km = calculations["radius_heavy_km"]
    radius_medium_km = calculations["radius_medium_km"]
    radius_light_km = calculations["radius_light_km"]

    population = get_population_worldpop(lon, lat, radius_extreme_km * 1000)

    circles = []

    if on_land:
        circles.append(
            {"lat": lat, "lon": lon, "radius": radius_extreme_km * 1000, "note": "BOOOOOM", "color": "red"})

    circles.append({"lat": lat, "lon": lon, "radius": radius_heavy_km * 1000, "note": "DANGER", "color": "orange"})
    circles.append({"lat": lat, "lon": lon, "radius": radius_medium_km * 1000, "note": "less danger", "color": "yellow"})
    circles.append({"lat": lat, "lon": lon, "radius": radius_light_km * 1000, "note": "not too bad", "color": "green"})

    return {
        "casualties": population,
        "other": "You should probably take cover",
        "circles": circles,
        "energy_megaton": energy_megaton,
    }
