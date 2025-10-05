from datetime import date, datetime


def modified_julian_day(_date: str | date) -> int:
    if isinstance(_date, str):
        _date = datetime.strptime(_date, "%Y-%m-%d")

    return _date.toordinal() - 678576  # 1_721_424.5 - 2_400_000.5


def from_modified_julian_day(julian_day: int) -> date:
    return date.fromordinal(julian_day + 678576)
