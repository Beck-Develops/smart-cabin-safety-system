# train_prescriptive_model.py (Modified for NWS Heat Index Scale)

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder

# --- 1. Heat Index Calculation (Official NOAA/NWS Formula) ---
# NOTE: The formula uses Fahrenheit. T is temp_f, R is relative_humidity (%)
def calculate_heat_index(T, R):
    # This is a common regression equation for the Heat Index in F
    HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094))
    
    # Check if the simple formula is too low, then use the full formula
    if HI < 80.0:
        return HI
    
    # Full Steadman/NWS regression equation (approximate)
    HI = (-42.379 + 2.04901523*T + 10.14333127*R - 0.22475541*T*R - 6.83783e-3*T**2 
          - 5.481717e-2*R**2 + 1.22874e-3*T**2*R + 8.5282e-4*T*R**2 - 1.99e-6*T**2*R**2)
    
    return HI

# --- 2. Simulated Data Generation (Using F and %) ---
np.random.seed(42)
N_SAMPLES = 1000

# Input features (realistic range for heat-related illness)
# Convert your input temp_c (10-45C) to temp_f (50-113F)
temp_f = np.random.uniform(70, 110, N_SAMPLES)
humidity = np.random.uniform(30, 95, N_SAMPLES)

# Calculate Heat Index for each data point
heat_index = np.array([calculate_heat_index(tf, rh) for tf, rh in zip(temp_f, humidity)])

# --- 3. Labeling based on NWS Heat Index Categories ---
# 0: Caution (80-90)
# 1: Extreme Caution (90-103)
# 2: Danger (103-125)
# 3: Extreme Danger (125+)

def get_risk_category(hi):
    if hi >= 125:
        return 3 # Extreme Danger (Heat stroke highly likely)
    elif hi >= 103:
        return 2 # Danger (Heat exhaustion/stroke likely/possible)
    elif hi >= 90:
        return 1 # Extreme Caution (Heat exhaustion possible)
    else:
        return 0 # Caution / Safe

risk_categories = np.array([get_risk_category(hi) for hi in heat_index])

# --- 4. Prepare Data for Multi-Class Classification ---
# Inputs: [temp_f, humidity] (You could also use just [heat_index] but combining 
# both original features is often better for a neural network to learn the relationship).
X = np.column_stack([temp_f, humidity])

# Output: One-Hot Encode the Categories
encoder = OneHotEncoder(sparse_output=False)
y_encoded = encoder.fit_transform(risk_categories.reshape(-1, 1))
# y_encoded will look like [[1, 0, 0, 0], [0, 1, 0, 0], ...]

# --- 5. Normalize and Split Data ---
# Scaling is crucial for NNs
X_norm = np.column_stack([temp_f / 120.0, humidity / 100.0]) 

X_train, X_test, y_train, y_test = train_test_split(X_norm, y_encoded, test_size=0.2, random_state=42)

# --- 6. Build and Train Multi-Class Model ---
# Output layer now has 4 units (one for each category) and 'softmax' activation
model = keras.Sequential([
    layers.Dense(16, activation='relu', input_shape=(2,)),
    layers.Dense(8, activation='relu'),
    layers.Dense(y_encoded.shape[1], activation='softmax') # 4 classes, softmax for probability
])

# Use 'categorical_crossentropy' for multi-class problems
model.compile(optimizer='adam', 
              loss='categorical_crossentropy', 
              metrics=['accuracy'])

print("\n--- Training Model ---")
model.fit(X_train, y_train, epochs=100, batch_size=32, verbose=0, validation_data=(X_test, y_test))
print("Model trained.")

# --- 7. Test and Interpret Sample Prediction ---
# Test 1: Danger (104F, 70% RH -> HI ~ 130F)
sample_1_f = 104
sample_1_rh = 70
sample_1_norm = np.array([[sample_1_f / 120.0, sample_1_rh / 100.0]])
prediction_1 = model.predict(sample_1_norm, verbose=0)
predicted_category_1 = np.argmax(prediction_1)

# Test 2: Extreme Caution (92F, 50% RH -> HI ~ 100F)
sample_2_f = 92
sample_2_rh = 50
sample_2_norm = np.array([[sample_2_f / 120.0, sample_2_rh / 100.0]])
prediction_2 = model.predict(sample_2_norm, verbose=0)
predicted_category_2 = np.argmax(prediction_2)

category_names = ["Caution (HI < 90F)", "Extreme Caution (90-103F)", "Danger (103-125F)", "Extreme Danger (HI > 125F)"]

print("\n--- Sample Predictions ---")
print(f"Sample 1 ({sample_1_f}F, {sample_1_rh}%): HI is ~{calculate_heat_index(sample_1_f, sample_1_rh):.1f}F")
print(f"Prediction Probabilities: {prediction_1[0].round(2)}")
print(f"Predicted Category: {category_names[predicted_category_1]}")
print("---")
print(f"Sample 2 ({sample_2_f}F, {sample_2_rh}%): HI is ~{calculate_heat_index(sample_2_f, sample_2_rh):.1f}F")
print(f"Prediction Probabilities: {prediction_2[0].round(2)}")
print(f"Predicted Category: {category_names[predicted_category_2]}")

# --- 8. Save Model ---
model.save('prescriptive_model_nws.h5')
print("\n✅ Saved model as prescriptive_model_nws.h5")