# PS3 — Movie-Watching Behaviour Segmentation

Welcome to Problem Statement 3 (PS3) of the ACM AI/ML hackathon! In this task, you will play the role of a data scientist aiming to discover user behavioural segments using K-Means clustering.

## Problem Statement

A streaming platform has collected aggregated behavioural data from a sample of its users. Your goal is to explore the data, clean it, and group the viewers into meaningful behavioural segments using K-Means clustering. Understanding these segments can help the platform tailor recommendations, improve the UI, or plan new content acquisitions.

## Dataset Schema

The file `movie_watching.csv` contains 1,000 rows (each representing one viewer).

| Column | Type | Meaning |
|---|---|---|
| `viewer_id` | Integer | Unique viewer identifier |
| `movies_watched_monthly` | Integer | Number of movies watched per month |
| `avg_movie_duration_min` | Float | Average movie duration in minutes |
| `weekend_watching_pct` | Float | Percentage of viewing time on weekends (0–100) |
| `rewatch_percentage` | Float | Percentage of watched movies that are rewatches (0–100) |
| `genre_diversity_score` | Integer | Number of distinct genres typically watched (1–12) |
| `avg_rating_given` | Float | Average rating given, from 1 to 5 |
| `monthly_streaming_hours` | Float | Total movie-streaming hours per month |

