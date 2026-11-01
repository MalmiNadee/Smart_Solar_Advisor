import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import PredictionForm from "./PredictionForm";
import PredictionResults from "./PredictionResults";
import ScenarioSimulator from "./ScenarioSimulator";
import { predictionsAPI, exportAPI } from "../services/api";
import "../styles/Dashboard.css";
import Footer from "./Footer";

function Dashboard({ user, onLogout }) {
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionType, setPredictionType] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await predictionsAPI.getHistory();
      setHistory(response.data.predictions || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionComplete = (result, type) => {
    setPredictionResult(result);
    setPredictionType(type);
    loadHistory();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleDeletePrediction = async (id) => {
    if (window.confirm("Are you sure you want to delete this prediction?")) {
      try {
        await predictionsAPI.deletePrediction(id);
        loadHistory();
      } catch (error) {
        console.error("Failed to delete prediction:", error);
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await exportAPI.exportPredictionsCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `solar_predictions_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Failed to export predictions");
      console.error("Export error:", error);
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await exportAPI.exportPredictionsJSON();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `solar_predictions_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Failed to export predictions");
      console.error("Export error:", error);
    }
  };

  const groupHistoryByDate = () => {
    const grouped = {};
    history.forEach((pred) => {
      const date = new Date(pred.created_at).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(pred);
    });
    return grouped;
  };

  const groupedHistory = groupHistoryByDate();

  return (
    <div className="dashboard">
      <Navbar user={user} onLogout={onLogout} />

      <div className="dashboard-container">
        <div className="welcome-section">
          <h1>Welcome back, {user.username}!</h1>
          <p>
            Generate accurate solar energy predictions using our hybrid model
          </p>
        </div>

        <div className="dashboard-content">
          <div className="main-section">
            <PredictionForm onPredictionComplete={handlePredictionComplete} />

            {predictionResult && (
              <PredictionResults
                result={predictionResult}
                type={predictionType}
              />
            )}

            {predictionResult && predictionResult.prediction && (
              <ScenarioSimulator
                baseFormData={{
                  latitude: predictionResult.prediction.latitude,
                  longitude: predictionResult.prediction.longitude,
                  year: predictionResult.prediction.year,
                  month: predictionResult.prediction.month,
                  tilt_deg: predictionResult.prediction.tilt_deg,
                  azimuth_deg: predictionResult.prediction.azimuth_deg,
                  installed_capacity_kw:
                    predictionResult.prediction.installed_capacity_kw,
                  panel_efficiency:
                    predictionResult.prediction.panel_efficiency,
                  system_loss: predictionResult.prediction.system_loss,
                  shading_factor: predictionResult.prediction.shading_factor,
                  electricity_rate:
                    predictionResult.financial?.electricity_rate_lkr ||
                    predictionResult.financial?.electricity_rate ||
                    49.0, // LKR/kWh
                  system_cost_per_kw:
                    (predictionResult.financial?.system_cost_lkr ||
                      predictionResult.financial?.system_cost_usd ||
                      0) / predictionResult.prediction.installed_capacity_kw ||
                    325000, // LKR/kW
                }}
                onScenarioComplete={(scenario) => {
                  console.log("Scenario completed:", scenario);
                }}
              />
            )}
          </div>

          <div className="sidebar">
            <div className="history-section">
              <div className="history-header">
                <h3> Prediction History</h3>
                <button
                  className="toggle-history-btn"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? "Hide" : "Show"}
                </button>
              </div>

              {showHistory && history.length > 0 && (
                <div
                  className="export-buttons"
                  style={{ marginBottom: "15px", display: "flex", gap: "10px" }}
                >
                  <button
                    onClick={handleExportCSV}
                    style={{
                      padding: "8px 16px",
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.transform = "translateY(-2px)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.transform = "translateY(0)")
                    }
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    style={{
                      padding: "8px 16px",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.transform = "translateY(-2px)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.transform = "translateY(0)")
                    }
                  >
                    Export JSON
                  </button>
                </div>
              )}

              {showHistory && (
                <div className="history-content">
                  {loading ? (
                    <p className="loading-text">Loading...</p>
                  ) : history.length === 0 ? (
                    <p className="no-history">No predictions yet</p>
                  ) : (
                    <div className="history-list">
                      {Object.entries(groupedHistory).map(
                        ([date, predictions]) => (
                          <div key={date} className="history-date-group">
                            <h4 className="history-date">{date}</h4>
                            {predictions.map((pred) => (
                              <div key={pred.id} className="history-item">
                                <div className="history-item-header">
                                  <span className="history-location">
                                    {pred.latitude.toFixed(2)},{" "}
                                    {pred.longitude.toFixed(2)}
                                  </span>
                                  <button
                                    className="delete-btn"
                                    onClick={() =>
                                      handleDeletePrediction(pred.id)
                                    }
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </div>
                                <div className="history-item-details">
                                  <span>
                                    {new Date(
                                      2000,
                                      pred.month - 1
                                    ).toLocaleString("default", {
                                      month: "short",
                                    })}{" "}
                                    {pred.year}
                                  </span>
                                  <span className="history-energy">
                                    {pred.predicted_energy_kwh.toFixed(2)} kWh
                                  </span>
                                </div>
                                <div className="history-confidence">
                                  Confidence:{" "}
                                  {(pred.confidence_score * 100).toFixed(1)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="info-card">
              <h3> System Optimization</h3>
              <ul>
                <li>
                  Tilt angle close to the site latitude maximizes annual energy
                  output.
                </li>
                <li>
                  An azimuth of <strong>180° (south-facing)</strong> provides
                  optimal solar exposure in the northern hemisphere.
                </li>
                <li>
                  Higher-efficiency panels generate more energy for the same
                  installed capacity.
                </li>
                <li>
                  A shading factor of <strong>1.0</strong> indicates no shading,
                  while <strong>0.5</strong> represents approximately 50%
                  shading loss.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Dashboard;
