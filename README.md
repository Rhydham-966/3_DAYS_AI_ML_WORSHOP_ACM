# 🚀 ACM AI/ML Workshop


A comprehensive collection of learning materials, Jupyter notebooks, datasets, presentations, and hands-on projects developed and used during a **3-day AI/ML Workshop**

This repository is designed to help students build a strong foundation in Python, data analysis, machine learning, and practical problem-solving through a structured, hands-on learning experience. Starting with essential Python libraries such as NumPy and Pandas, the workshop progresses through data visualization using Matplotlib and Seaborn, followed by core machine learning concepts and algorithms.

Topics covered include:

- **Python Fundamentals:** Programming basics and essential tools for working with data.
- **Data Analysis:** NumPy and Pandas for numerical computing and data manipulation.
- **Data Visualization:** Matplotlib and Seaborn for exploring and communicating insights from data.
- **Machine Learning:** Supervised learning concepts, classification, regression, and K-Nearest Neighbors (KNN).
- **Unsupervised Learning:** K-Means clustering, dimensionality reduction using PCA, and practical applications such as image compression.
- **Reinforcement Learning:** Introduction to learning through interactions, rewards, and decision-making.
- **Hands-on Projects:** Practical implementations that connect theoretical concepts to real-world applications.
- **Machine Learning Competition:** Three problem statements designed to challenge participants to apply their knowledge, experiment with different approaches, and develop effective solutions.

The repository includes educational notebooks with explanations and code, datasets for experimentation, visual learning resources, project implementations, and supporting presentations.

Rather than focusing solely on theory, the workshop emphasizes **learning by doing**—understanding the mathematics behind algorithms, implementing them in code, interpreting results, and applying machine learning to meaningful problems.

The experience culminates in an exciting competition where participants put their skills to the test, transforming three days of learning into a practical challenge of creativity, analytical thinking, and technical execution.

Created for students taking their first steps into AI/ML and aspiring to turn their curiosity into practical skills.



## 📑 Repository Structure & Roadmap

| Module | Core Topic | Primary Algorithms / Tools | Resources & Cheatsheets |
|---|---|---|---|
| [`python/`](./python/) | Python Fundamentals | Syntax, Data Structures, Control Flow, Functions | 2 Notebooks (Basics + Speedrun) |
| [`numpy/`](./numpy/) | Numerical Computing | Vectorization, Broadcasting, Matrix Math | `NumPy_Cheatsheet.pdf` + Slides |
| [`pandas/`](./pandas/) | Data Wrangling | Series, DataFrames, Missing Values, GroupBy | `Pandas_cheatsheet.pdf` + Datasets |
| [`data_visualization/`](./data_visualization/) | Data Visualization | Matplotlib & Seaborn, Custom Plot Aesthetics | `data_visualisation_cheatsheet.pdf` |
| [`regression/`](./regression/) | Supervised Learning | Linear Regression, OLS, Gradient Descent, $R^2$ / RMSE | Notebook + Student Performance Data |
| [`classification/`](./classification/) | Supervised Learning | K-Nearest Neighbors (KNN), Decision Boundaries | 8×8 Digit Recognition + CSV |
| [`PCA/`](./PCA/) | Dimensionality Reduction | PCA from scratch (Covariance, Eigenvalues, 2D Projection) | `pca.pdf` + Wine Dataset |
| [`Kmeans/`](./Kmeans/) | Unsupervised Clustering | K-Means, Centroid Updates, Elbow Method, Silhouette | Image Compression + Spotify Pipeline |
| [`reinforcement_learning/`](./reinforcement_learning/) | Reinforcement Learning | Q-Learning, $\epsilon$-Greedy Policy, Bellman Update | Interactive Web Visualizer App |
| [`competition/`](./competition/) | Hackathon Track | Regression (PS1), Classification (PS2), Clustering (PS3) | Problem Presentations (`.pptx`) + CSVs |

> 📊 **Master Presentation**: Workshop slide deck available at [`ACM_ML_Workshop.pptx`](./ACM_ML_Workshop.pptx).

---

## ⚡ Running Notebooks on Google Colab

Google Colab runs directly in the browser with pre-installed machine learning libraries.

1. **Upload Notebook**:
   - Open [Google Colab](https://colab.research.google.com/).
   - Click **File** ➔ **Upload notebook** and choose the target `.ipynb` file.
2. **Mount Google Drive** *(if dataset is saved on Drive)*:
   ```python
   from google.colab import drive
   drive.mount('/content/drive')
   ```
3. **Configure File Path**:
   - Update `DATA_PATH` or `CSV_PATH` to point to your uploaded file:
   ```python
   # Direct upload to Colab session:
   DATA_PATH = "/yourpath/your_data_file.csv"

   # Stored inside Google Drive:
   DATA_PATH = "/yourpath/your_data_file.csv"
   ```
4. **Execute Cells**:
   - Run cells sequentially using `Shift + Enter` or select **Runtime** ➔ **Run all**.

---

## 💻 Running Locally

### 1. Environment Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# 2. Install required packages
pip install numpy pandas matplotlib seaborn scikit-learn jupyter

# 3. Start Jupyter
jupyter notebook
```

---

### 2. Folder-by-Folder Guide & Local Data Paths

Each folder is self-contained. When running locally, set the data path variables to your local relative file paths as shown below.

#### 🐍 `python/` — Python Programming
* **Contents**: `python_basics.ipynb` (step-by-step beginner guide) & `python_speedrun.ipynb` (quick syntax refresher).
* **What You'll Learn**: Variables, conditionals, loops, functions, lists, and dictionaries.
* **Data Path**: No external datasets needed.

#### 🔢 `numpy/` — High-Performance Array Computing
* **Contents**: `Numpy_Workshop.ipynb`, `NumPy_Cheatsheet.pdf`, and presentation slides.
* **What You'll Learn**: Array creation, slicing, vectorization over loops, broadcasting rules, dot products, and matrix operations.
* **Data Path**: No external datasets needed.

#### 🐼 `pandas/` — Data Manipulation & Cleaning
* **Contents**: `Pandas_Workshop.ipynb`, `Pandas_cheatsheet.pdf`, and sample data (`data/`).
* **What You'll Learn**: Series & DataFrames, column filtering, handling null values, group aggregation, and CSV/Excel I/O.
* **Local Data Path**:
  ```python
  # Set relative paths to the datasets in pandas/data/:
  df = pd.read_csv("data/data.csv")
  df2 = pd.read_csv("data/student.csv")
  ```

#### 📊 `data_visualization/` — Matplotlib & Seaborn
* **Contents**: `Data_Visualization_Matplotlib_Seaborn.ipynb` & `data_visualisation_cheatsheet.pdf`.
* **What You'll Learn**: Plot anatomy, line charts, scatter plots, bar charts, distribution histograms, heatmaps, and aesthetic theming.
* **Data Path**: Generates synthetic sample data directly within notebook cells.

#### 📈 `regression/` — Linear Regression (Theory & Math)
* **Contents**: `Regression.ipynb` & student grade dataset (`data/student-por.csv`).
* **What You'll Learn**:
  * Mathematical derivation of Ordinary Least Squares (OLS).
  * Mean Squared Error (MSE) cost surface & Gradient Descent step updates.
  * Multi-variable linear regression, feature scaling, and evaluation metrics ($R^2$, MAE, RMSE).
* **Local Data Path**:
  ```python
  # Set relative path inside regression folder:
  DATA_PATH = "data/"
  raw = pd.read_csv(DATA_PATH + "student-por.csv", sep=";")
  ```

#### 🏷️ `classification/` — K-Nearest Neighbors (KNN)
* **Contents**: `Classification_KNN.ipynb` & handwritten digits dataset (`data/digits.csv` and `data/images/`).
* **What You'll Learn**:
  * Distance metrics (Euclidean, Manhattan) and decision boundaries.
  * Image feature extraction from 8×8 pixel matrices.
  * Hyperparameter tuning for $K$, stratified splits, cross-validation, and confusion matrices.
* **Local Data Path**:
  ```python
  from pathlib import Path
  BASE_DIR = Path("./data")
  DATA_DIR = BASE_DIR / "images"
  CSV_PATH = BASE_DIR / "digits.csv"
  ```

#### 📐 `PCA/` — Principal Component Analysis From Scratch
* **Contents**: `PCA_Wine.ipynb`, `pca.pdf` (theoretical summary), and `data/wine.csv`.
* **What You'll Learn**:
  * Full step-by-step linear algebra derivation of PCA without black-box libraries.
  * Standardization ➔ Covariance Matrix ($C = \frac{1}{n-1} Z^T Z$) ➔ Eigenvalues & Eigenvectors ($Cv = \lambda v$).
  * Calculating explained variance ratio and projecting 13-feature wine data into 2D.
  * Verifying manual scratch implementation against scikit-learn's `PCA`.
* **Local Data Path**:
  ```python
  # Set relative path inside PCA folder:
  DATA_PATH = "data/"
  df = pd.read_csv(DATA_PATH + "wine.csv")
  ```

#### 🎯 `Kmeans/` — K-Means Clustering & Applications
* **Contents**:
  * `nbk_kmeans/KMeans_Mathematics_Tutorial.ipynb`: Centroid math, Voronoi tessellations, Elbow method, and image compression (color quantization).
  * `nbk_kmeans/spotify_kmeans.ipynb`: Real-world audio features clustering for song cohort discovery.
* **What You'll Learn**: Unsupervised partitioning, Within-Cluster Sum of Squares (WCSS / Inertia), outlier handling, and PCA visualization of clusters.
* **Local Data Path**:
  ```python
  # Set path to rolling stones spotify dataset:
  DATA_PATH = "../data/rolling_stones_spotify.csv"  # when running from nbk_kmeans/
  df = pd.read_csv(DATA_PATH)
  ```

#### 🤖 `reinforcement_learning/` — Q-Learning Robot Simulation
* **Contents**:
  * `robot.py`: Student implementation file (implement `random_move`, `choose_move`, and `learn`).
  * `engine.py`: Built-in warehouse simulation engine and local HTTP server.
  * `web/`: Modern HTML/CSS/JS frontend visualizer.
* **What You'll Learn**:
  * Reinforcement learning loop: States, actions, rewards, and next states.
  * Exploration vs. Exploitation ($\epsilon$-greedy policy).
  * Q-table updating using the Bellman equation:
    $$Q_{new}(s, a) = Q(s, a) + \alpha \cdot \big[R + \gamma \max Q(s', a') - Q(s, a)\big]$$
* **How to Run**:
  * Uses standard library only (zero extra pip packages required).
  * Run in terminal:
    ```bash
    python robot.py
    ```
  * Automatically opens the warehouse visualizer in your web browser (`http://localhost:8000`).

---

## 🏆 Hackathon Competition Track (`competition/`)

> [!IMPORTANT]
> **Competition Participant Guideline**  
> For each problem statement, **participants are provided ONLY with the Problem Statement slides (`.pptx`) and the problem dataset (`.csv`)**.  
> The `sample_solution_*.ipynb` notebooks are **organizer benchmarks** for validation and reference, and are **NOT** provided to participants during the hackathon.

### Problem Statements Breakdown:

* **🚗 PS1 — Food Delivery Time Prediction (`competition/ps1/`)**
  * **Task**: Predict delivery times in minutes from order attributes using Linear Regression.
  * **Participant Files**: `PS1_Problem_Statement.pptx` & `food_delivery_time.csv` (1,000 rows).
  * **Data Loading**:
    ```python
    df = pd.read_csv("food_delivery_time.csv")
    ```

* **🚌 PS2 — Commuter Transport Mode Classification (`competition/ps2/`)**
  * **Task**: Classify trip commute mode (`Metro`, `Bus`, `Two_Wheeler`, `Car`) using K-Nearest Neighbors.
  * **Participant Files**: `PS2_Problem_Statement.pptx` & `commuter_transport.csv` (1,000 rows).
  * **Data Loading**:
    ```python
    df = pd.read_csv("commuter_transport.csv")
    ```

* **🎬 PS3 — Movie-Watching Behaviour Segmentation (`competition/ps3/`)**
  * **Task**: Discover distinct viewer cohorts from viewing habits using K-Means Clustering.
  * **Participant Files**: `PS3_Problem_Statement.pptx` & `movie_watching.csv` (1,000 rows).
  * **Data Loading**:
    ```python
    df = pd.read_csv("movie_watching.csv")
    ```

---

## 📚 Cheatsheets & Reference Materials

Quick-reference PDFs are included across the repository for fast lookup:

* 📊 **Data Visualization Cheatsheet**: [`data_visualization/data_visualisation_cheatsheet.pdf`](./data_visualization/data_visualisation_cheatsheet.pdf)
* 🔢 **NumPy Quick Reference**: [`numpy/NumPy_Cheatsheet.pdf`](./numpy/NumPy_Cheatsheet.pdf)
* 🐼 **Pandas Quick Reference**: [`pandas/Pandas_cheatsheet.pdf`](./pandas/Pandas_cheatsheet.pdf)
* 📐 **PCA Mathematics Guide**: [`PCA/pca.pdf`](./PCA/pca.pdf)

---

## 💡 Key Takeaways & Best Practices

* **Always Visualize First**: Inspect feature distributions and correlation heatmaps prior to model training.
* **Prevent Data Leakage**: Fit scalers and encoders exclusively on training folds; never on the full dataset before splitting.
* **Understand the Loss**: Keep track of training vs. validation loss curves to diagnose overfitting or underfitting early.
* **Tune Systematically**: Use cross-validation and hyperparameter grids rather than arbitrary manual parameter guesses.
