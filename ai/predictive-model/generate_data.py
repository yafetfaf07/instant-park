from datetime import datetime, timedelta

import numpy as np
import pandas as pd

parking_lots = [
    {
        "id": "cd4a8ff2-b67d-4817-8b83-f9604c1ad406",
        "type": "OFF_STREET",
        "totalSpots": 120,
        "peak_hour": 17,
    },
    {
        "id": "8c1b62d2-a591-4dc0-a9a9-1eb22ba33a0e",
        "type": "ON_STREET",
        "totalSpots": 45,
        "peak_hour": 10,
    },
]

# Setup the timeframe (Last 3 months, hourly)
end_date = datetime.now()
start_date = end_date - timedelta(days=90)
timestamps = pd.date_range(start=start_date, end=end_date, freq="h")

data = []

for lot in parking_lots:
    for ts in timestamps:
        hour = ts.hour
        day_of_week = ts.dayofweek  # 0=Monday, 6=Sunday

        base_occupancy = 0.1

        # Increase occupancy if it's near the "peak_hour"
        distance_from_peak = abs(hour - lot["peak_hour"])
        time_factor = max(0, 1 - (distance_from_peak * 0.15))

        weekend_factor = (
            1.2 if day_of_week >= 5 and lot["type"] == "OFF_STREET" else 0.8
        )

        occupancy_rate = min(0.98, base_occupancy + (time_factor * weekend_factor))

        # Add a little randomness so it's not perfectly predictable
        noise = np.random.normal(0, 0.05)
        final_rate = np.clip(occupancy_rate + noise, 0, 1)

        occupied_spots = int(final_rate * lot["totalSpots"])

        data.append(
            {
                "timestamp": ts,
                "parkingAvenueId": lot["id"],
                "hour": hour,
                "dayOfWeek": day_of_week,
                "isWeekend": 1 if day_of_week >= 5 else 0,
                "totalSpots": lot["totalSpots"],
                "currentSpots": lot["totalSpots"] - occupied_spots,
                "occupancyRate": final_rate,
            }
        )

df = pd.DataFrame(data)
df.to_csv("parking_mock_data.csv", index=False)
print("✅ Generated parking_mock_data.csv successfully!")
