SMART SOLAR ADVISOR: IoT-Enabled Hybrid ML for Location-Aware Solar Prediction

Component Overview
Smart Solar Advisor is a **location-aware solar energy prediction system** that uses a hybrid machine learning approach combined with IoT integration and GIS mapping to estimate solar energy potential for any selected location.

The system integrates:

# Hybrid ML Model (KNN + XGBoost)
# XGBoost-based predictive modeling
# NASA POWER solar irradiance API
# Interactive map coordinates
# IoT device simulation for real-time solar readings
# Roof-based features

It helps homeowners, engineers, and solar planners estimate solar energy generation, optimize installation parameters, and improve decision-making.

Key Features
1.Interactive Map Location Selection
# Users can click any location on the map.
# Latitude & Longitude automatically captured

2.Solar Irradiance Data Integration
# Weather API fetches 30-day average solar irradiance.
# Converts results into kWh/m²/day for accurate prediction.

3.Hybrid ML Model
# Combines KNN (30%) and XGBoost (70%) for accurate predictions
Inputs:
# Latitude
# Longitude
# System size
# Panel efficiency
# Orientation score

Output:
# Predicted daily solar energy generation (kWh/day)

4.IoT Data Integration
# Simulated IoT sensors can feed real-time data (Temp, Humidity, Irradiance, Dust, Rainfall) for accurate predictions.

5.Modern Frontend
# Responsive User Interface(UI)
# Real-time feedback and input validation
# Instant Solar Output predictions

How to Run the Project

1. Clone the repository
   # git clone <repo-url>
   # cd project-folder
2. Go to backend folder 
   # cd ml-engine
3. Install dependencies
   # pip install -r requirements2.txt
4. Add Firebase configuration
   Place your file: serviceAccountKey.json
5. Train the model
   # python -m venv venv  
   # venv\Scripts\activate

6. Run Backend
   # python app.py

7. Go to frontend folder 
   # cd webapp
8. Install dependencies
   # npm install
9. Run Component
   # npm run dev   

# Backend Running on http://127.0.0.1:5007
# Frontend Running on  
 #  Local:   http://localhost:8083/
 #  Network: http://192.168.8.138:8083/

10. To Run App 
  # cd SmartSolar_Backend 
  # nodemon server.js
  # Backend Running on http://127.0.0.1:5001


  # cd SmartSolar_WebApp
  # npm run dev
  # Frontend Running on  
   #  Local:   http://localhost:8081/
   #  Network: http://192.168.8.138:8081/

