import logging

import requests
from datetime import date


import utils


class MissionDesignClient:
    AU = 149_597_870_700
    BASE_URL = "https://ssd-api.jpl.nasa.gov/mdesign.api"

    def get_from_id(self, key, date_start: date | str, date_end: date | str):
        date_start = date.fromisoformat(date_start) if isinstance(date_start, str) else date_start
        date_end = date.fromisoformat(date_end) if isinstance(date_end, str) else date_end

        julian_start_day = utils.modified_julian_day(date_start)
        julian_end_day = utils.modified_julian_day(date_end)

        span = julian_end_day - julian_start_day

        url = f"{self.BASE_URL}?sstr={key}&mjd0={julian_start_day}&span={span}&step=2&tof-min=10&tof-max={span}"
        response = requests.get(url)

        if response.status_code != 200:
            logging.error(f"Error: Mission Design API returned {response.status_code}. Response: {response.json()}")

        data = response.json()
        parsed_missions = [MissionDesignClient.parse_mission(mission) for mission in data["selectedMissions"]]
        return {
            "dv_lowthrust": data["dv_lowthrust"],
            "missions": [
                mission for mission in parsed_missions
                if mission["departure_date"] >= date_start
                and mission["arrival_date"] <= date_end
            ],
        }


    @staticmethod
    def parse_mission(mission):
        return {
            # Departure date
            "departure_date": utils.from_modified_julian_day(mission[0]),
            # Arrival date
            "arrival_date": utils.from_modified_julian_day(mission[1]),
            # Speed leaving Earth (km/s)
            "departure_speed": mission[2],
            # Speed relative to asteroid on arrival (km/s)
            "arrival_relative_speed": mission[3],
            # Phase angle at departure/arrival (deg)
            "phase_angle": mission[4],
            # Distance from Earth (AU)
            "earth_distance": mission[5] * MissionDesignClient.AU,
            # Solar elongation at arrival (deg)
            "arrival_solar_elongation": mission[6],
            # Declination of departure (deg)
            "departure_declination": mission[7],
            # Arrival approach geometry (deg)
            "arrival_approach_geometry": mission[8],
            # Time of flight (days)
            "time_of_flight": mission[9]
        }
