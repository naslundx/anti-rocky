import math

def get_float(prompt, min_value=None, max_value=None, default=None):
    """Prompt for a float. If the user presses Enter and `default` is not None,
    return the default value."""
    while True:
        try:
            prompt_text = prompt
            if default is not None:
                prompt_text = f"{prompt} [default {default}]: "
            else:
                prompt_text = prompt
            raw = input(prompt_text).strip()

            if raw == "":
                if default is not None:
                    value = float(default)
                    if min_value is not None and value < min_value:
                        print(f"Value must be at least {min_value}.")
                        continue
                    if max_value is not None and value > max_value:
                        print(f"Value must be at most {max_value}.")
                        continue
                    return value
                else:
                    print("Please enter a valid number.")
                    continue

            value = float(raw)
            if min_value is not None and value < min_value:
                print(f"Value must be at least {min_value}.")
                continue
            if max_value is not None and value > max_value:
                print(f"Value must be at most {max_value}.")
                continue
            return value
        except ValueError:
            print("Please enter a valid number.")      

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


def main():
    print("Impact Event Input")
    diameter = get_float("Projectile Diameter (m): ", min_value=0)
    density = get_float("Projectile Density (kg/m³): ", min_value=0, default=3000)
    velocity = get_float("Impact Velocity (km/s): ", min_value=0)
   
    results = simulate_impact(diameter, density, velocity)

    print("\nSimulated Effects (ground impact):")
    print(f"- Kinetic Energy: {results['energy_megaton']:.2f} megatons TNT")
    print(f"- Projectile Mass: {results['mass_kg']:.3e} kg")
    print(f"- Shelter-destroying Radius (3000 psi): {results['radius_shelter_destroying_km']:.2f} km")
    print(f"- Extreme Damage Radius (200 psi):      {results['radius_extreme_km']:.2f} km")
    print(f"- Heavy Damage Radius (20 psi):         {results['radius_heavy_km']:.2f} km")
    print(f"- Medium Damage Radius (5 psi):         {results['radius_medium_km']:.2f} km")
    print(f"- Light Damage Radius (1 psi):          {results['radius_light_km']:.2f} km")
    print(f"- Thermal 1st-degree burn radius:  {results['thermal_radius_first_deg_km']:.2f} km")
    print(f"- Thermal 2nd-degree burn radius:  {results['thermal_radius_second_deg_km']:.2f} km")
    print(f"- Thermal 3rd-degree burn radius:  {results['thermal_radius_third_deg_km']:.2f} km")
    print(f"- Thermal wood ignition radius:      {results['thermal_radius_wood_ignition_km']:.2f} km")
    print(f"- Estimated Crater Radius: {results['crater_radius']:.0f} meters")

if __name__ == "__main__":
    main()