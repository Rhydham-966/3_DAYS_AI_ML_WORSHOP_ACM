# PS1 — Food Delivery Time Prediction Using Linear Regression

Welcome to Problem Statement 1 (PS1) of the ACM AI/ML hackathon! In this challenge, your goal is to build a Linear Regression model that accurately predicts how long a food delivery will take from the moment an order is placed.

## Dataset Schema

The `food_delivery_time.csv` dataset contains exactly 1,000 rows (each representing a single food delivery order) and the following 9 columns:

| Column | Type | Meaning |
|---|---|---|
| `order_id` | Integer | Unique order identifier |
| `distance_km` | Float | Delivery distance in kilometres |
| `distance_miles` | Float | Equivalent distance in miles |
| `prep_time_min` | Float | Food preparation time in minutes |
| `courier_experience_years` | Float | Courier experience in years |
| `order_items` | Integer | Number of items in the order |
| `traffic_delay_min` | Float | Traffic-related delay in minutes |
| `courier_wait_min` | Float | Additional pickup/waiting time in minutes |
| `delivery_time_min` | Float | **Target**: total delivery time in minutes |

