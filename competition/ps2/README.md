# Commuter Transport Mode Classification

## Problem Statement
Urban transport planners often rely on travel survey data to understand how commuters traverse the city. Your task in this 3-4 hour hackathon is to analyze a dataset of commuter trips, clean any data anomalies, select the most informative features, and build a **K-Nearest Neighbors (KNN)** classification model to predict the commuter's `transport_mode`.

---

## Dataset Overview

- **Total Rows**: 1,000
- **Total Columns**: 9

### Schema and Column Dictionary

| Column | Type | Meaning |
|---|---|---|
| `trip_id` | Integer | Unique identifier for the commuter trip |
| `trip_distance_km` | Float | Trip distance in kilometres |
| `trip_distance_miles` | Float | Equivalent trip distance converted to miles |
| `trip_duration_min` | Float | Total trip duration in minutes |
| `travel_cost_inr` | Float | Total travel cost in Indian rupees (INR) |
| `walking_distance_m` | Float | Walking distance associated with the trip (e.g., accessing transit), in metres |
| `departure_hour` | Integer | Departure hour from 0 to 23 |
| `traffic_level` | Integer | Traffic congestion level (1 = Low, 2 = Medium, 3 = High) |
| `transport_mode` | Categorical | **Target**: Transport mode used (`Metro`, `Bus`, `Two_Wheeler`, `Car`) |

