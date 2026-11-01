import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "../styles/PredictionResults.css";
import { reportsAPI } from "../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function PredictionResults({ result, type }) {
  if (!result) return null;

  if (type === "daily") {
    const pred = result.prediction || result;
    const details = result.details || {};
    const financial = result.financial || {};
    const carbon = result.carbon_footprint || {};

    return (
      <div className="prediction-results">
        <h2>Daily Prediction Results</h2>

        <div className="summary-cards">
          <div className="summary-card highlight">
            <div className="card-content">
              <h3>Daily Energy</h3>
              <p className="card-value">
                {(
                  pred.daily_energy_kwh ||
                  details.daily_energy_kwh ||
                  0
                ).toFixed(2)}{" "}
                kWh
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <h3>Monthly Equivalent</h3>
              <p className="card-value">
                {(
                  pred.monthly_energy_kwh ||
                  details.monthly_energy_kwh ||
                  0
                ).toFixed(2)}{" "}
                kWh
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <h3>Confidence</h3>
              <p className="card-value">
                {(
                  (details.confidence_score || pred.confidence_score || 0.85) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>
        </div>

        {financial && (
          <div className="financial-details">
            <h3>Financial Impact</h3>
            <div className="financial-grid">
              <div className="financial-item">
                <span className="financial-label">Daily Savings:</span>
                <span className="financial-value">
                  LKR{" "}
                  {(financial.daily_savings_lkr || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="financial-item">
                <span className="financial-label">Monthly Savings:</span>
                <span className="financial-value">
                  LKR{" "}
                  {(financial.monthly_savings_lkr || 0).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </span>
              </div>
              <div className="financial-item">
                <span className="financial-label">Electricity Rate:</span>
                <span className="financial-value">
                  LKR{" "}
                  {(
                    financial.electricity_rate_lkr ||
                    financial.electricity_rate ||
                    0
                  ).toFixed(2)}
                  /kWh
                </span>
              </div>
            </div>
          </div>
        )}

        {carbon && (
          <div className="carbon-footprint">
            <h3>Environmental Impact</h3>
            <div className="carbon-grid">
              {carbon.daily && (
                <>
                  <div className="carbon-item">
                    <span className="carbon-label">Daily CO₂ Avoided:</span>
                    <span className="carbon-value">
                      {carbon.daily.co2_avoided_kg?.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="carbon-item">
                    <span className="carbon-label">Trees Equivalent:</span>
                    <span className="carbon-value">
                      {carbon.daily.trees_equivalent?.toFixed(1)} trees
                    </span>
                  </div>
                </>
              )}
              {carbon.monthly && (
                <div className="carbon-item">
                  <span className="carbon-label">Monthly CO₂ Avoided:</span>
                  <span className="carbon-value">
                    {carbon.monthly.co2_avoided_kg?.toFixed(2)} kg
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="prediction-details">
          <h3>Input Parameters</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Location:</span>
              <span className="detail-value">
                {pred.latitude?.toFixed(2)}°, {pred.longitude?.toFixed(2)}°
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Month/Year:</span>
              <span className="detail-value">
                {new Date(
                  2000,
                  (pred.month || details.month || 1) - 1
                ).toLocaleString("default", { month: "long" })}{" "}
                {pred.year || details.year}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Tilt / Azimuth:</span>
              <span className="detail-value">
                {pred.tilt_deg?.toFixed(1)}° / {pred.azimuth_deg?.toFixed(1)}°
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Capacity:</span>
              <span className="detail-value">
                {pred.installed_capacity_kw?.toFixed(1)} kW
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Panel Efficiency:</span>
              <span className="detail-value">
                {(pred.panel_efficiency * 100)?.toFixed(1)}%
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">System Loss:</span>
              <span className="detail-value">
                {(pred.system_loss * 100)?.toFixed(1)}%
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Shading Factor:</span>
              <span className="detail-value">
                {(pred.shading_factor ?? pred.shading ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "annual") {
    const monthlyData = result.predictions || result.monthly_predictions || [];
    const summary = result.summary || {};

    // Sort monthly data by month number (1-12)
    const sortedMonthlyData = [...monthlyData].sort((a, b) => {
      const monthA = a.month || a.prediction?.month || 1;
      const monthB = b.month || b.prediction?.month || 1;
      return monthA - monthB;
    });

    const chartData = {
      labels: sortedMonthlyData.map((p) => {
        const month = p.month || p.prediction?.month || 1;
        return new Date(2000, month - 1).toLocaleString("default", {
          month: "short",
        });
      }),
      datasets: [
        {
          label: "Predicted Energy (kWh)",
          data: sortedMonthlyData.map(
            (p) => p.predicted_energy_kwh || p.prediction?.predicted_energy_kwh
          ),
          borderColor: "rgb(102, 126, 234)",
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        title: {
          display: true,
          text: "Monthly Energy Production Forecast",
          font: {
            size: 16,
            weight: "bold",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy (kWh)",
          },
        },
      },
    };

    const handleDownloadPDF = async () => {
      try {
        const firstPrediction =
          sortedMonthlyData[0]?.prediction || sortedMonthlyData[0];

        if (!firstPrediction?.id) {
          alert("No prediction ID available");
          return;
        }

        const year =
          firstPrediction.year || summary.year || new Date().getFullYear();
        const response = await reportsAPI.downloadAnnualPDF(
          year,
          firstPrediction.latitude,
          firstPrediction.longitude
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `annual_solar_report_${year}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error("PDF download error:", error);
        alert("Failed to download PDF. Please try again.");
      }
    };

    return (
      <div className="prediction-results">
        <h2>Annual Prediction Results</h2>

        <div className="summary-cards">
          <div className="summary-card highlight">
            <div className="card-content">
              <h3>Total Annual Energy</h3>
              <p className="card-value">
                {(summary.total_annual_energy_kwh || 0).toFixed(2)} kWh
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <h3>Average Monthly</h3>
              <p className="card-value">
                {((summary.total_annual_energy_kwh || 0) / 12).toFixed(2)} kWh
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <h3>Avg Confidence</h3>
              <p className="card-value">
                {((summary.average_confidence || 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="pdf-actions">
          <button className="btn-primary" onClick={() => handleDownloadPDF()}>
            Download Annual PDF Report
          </button>
        </div>

        <div className="monthly-table">
          <h3>Monthly Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Energy (kWh)</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((pred, idx) => (
                <tr key={idx}>
                  <td>
                    {new Date(
                      2000,
                      Number(pred.month || idx + 1) - 1
                    ).toLocaleString("default", { month: "long" })}
                  </td>
                  <td>{pred.predicted_energy_kwh.toFixed(2)}</td>
                  <td>
                    <span className="confidence-badge">
                      {(pred.confidence_score * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Monthly prediction
  const pred = result.prediction || result;
  const details = result.details || {};

  return (
    <div className="prediction-results">
      <h2> Monthly Prediction Results</h2>

      <div className="pdf-actions">
        <button
          className="btn-primary"
          onClick={async () => {
            try {
              const response = await reportsAPI.downloadPredictionPDF(pred.id);
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement("a");
              link.href = url;
              link.setAttribute(
                "download",
                `solar_prediction_${pred.month}_${pred.year}.pdf`
              );
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch {
              alert("Failed to download PDF");
            }
          }}
        >
          Download PDF Report
        </button>
      </div>

      <div className="summary-cards">
        <div className="summary-card highlight">
          <div className="card-content">
            <h3>Predicted Energy</h3>
            <p className="card-value">
              {(pred.predicted_energy_kwh || 0).toFixed(2)} kWh
            </p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-content">
            <h3>Confidence Score</h3>
            <p className="card-value">
              {((pred.confidence_score || 0) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {result.financial && (
          <>
            <div className="summary-card financial">
              <div className="card-content">
                <h3>Monthly Savings</h3>
                <p className="card-value">
                  LKR{" "}
                  {(
                    result.financial.monthly_savings_lkr ||
                    result.financial.monthly_savings_usd ||
                    0
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <div className="summary-card financial">
              <div className="card-content">
                <h3>Annual Savings</h3>
                <p className="card-value">
                  LKR{" "}
                  {(
                    result.financial.annual_savings_lkr ||
                    result.financial.annual_savings_usd ||
                    0
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {result.financial.roi_percentage && (
              <div className="summary-card financial">
                <div className="card-content">
                  <h3>ROI</h3>
                  <p className="card-value">
                    {result.financial.roi_percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {result.financial.payback_period_years && (
              <div className="summary-card financial">
                <div className="card-content">
                  <h3>Payback Period</h3>
                  <p className="card-value">
                    {result.financial.payback_period_years.toFixed(1)} years
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {result.financial && (
        <div className="financial-details">
          <h3>Financial Analysis</h3>
          <div className="financial-grid">
            <div className="financial-item">
              <span className="financial-label">System Cost:</span>
              <span className="financial-value">
                LKR{" "}
                {(
                  result.financial.system_cost_lkr ||
                  result.financial.system_cost_usd ||
                  0
                ).toLocaleString("en-US")}
              </span>
            </div>
            <div className="financial-item">
              <span className="financial-label">Monthly Savings:</span>
              <span className="financial-value">
                LKR{" "}
                {(
                  result.financial.monthly_savings_lkr ||
                  result.financial.monthly_savings_usd ||
                  0
                ).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="financial-item">
              <span className="financial-label">Annual Savings:</span>
              <span className="financial-value">
                LKR{" "}
                {(
                  result.financial.annual_savings_lkr ||
                  result.financial.annual_savings_usd ||
                  0
                ).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="financial-item">
              <span className="financial-label">ROI:</span>
              <span className="financial-value">
                {result.financial.roi_percentage?.toFixed(1) || "N/A"}%
              </span>
            </div>
            <div className="financial-item">
              <span className="financial-label">Payback Period:</span>
              <span className="financial-value">
                {result.financial.payback_period_years?.toFixed(1) || "N/A"}{" "}
                years
              </span>
            </div>
            <div className="financial-item">
              <span className="financial-label">Electricity Rate:</span>
              <span className="financial-value">
                LKR{" "}
                {(
                  result.financial.electricity_rate_lkr ||
                  result.financial.electricity_rate ||
                  0
                ).toFixed(2)}
                /kWh
              </span>
            </div>
          </div>
        </div>
      )}

      {result.carbon_footprint && (
        <div className="carbon-footprint">
          <h3>Environmental Impact</h3>
          <div className="carbon-grid">
            {result.carbon_footprint.monthly && (
              <>
                <div className="carbon-item">
                  <span className="carbon-label">Monthly CO₂ Avoided:</span>
                  <span className="carbon-value">
                    {result.carbon_footprint.monthly.co2_avoided_kg.toFixed(2)}{" "}
                    kg
                  </span>
                </div>
                <div className="carbon-item">
                  <span className="carbon-label">
                    Equivalent Trees Planted:
                  </span>
                  <span className="carbon-value">
                    {result.carbon_footprint.monthly.trees_equivalent.toFixed(
                      1
                    )}{" "}
                    trees
                  </span>
                </div>
              </>
            )}
            {result.carbon_footprint.annual && (
              <>
                <div className="carbon-item">
                  <span className="carbon-label">Annual CO₂ Avoided:</span>
                  <span className="carbon-value">
                    {result.carbon_footprint.annual.co2_avoided_tonnes.toFixed(
                      3
                    )}{" "}
                    tonnes
                  </span>
                </div>
                <div className="carbon-item">
                  <span className="carbon-label">Equivalent Cars Removed:</span>
                  <span className="carbon-value">
                    {result.carbon_footprint.annual.cars_equivalent.toFixed(2)}{" "}
                    cars
                  </span>
                </div>
              </>
            )}
            {result.carbon_footprint.lifetime && (
              <div className="carbon-item highlight">
                <span className="carbon-label">
                  Lifetime CO₂ Avoided (25 years):
                </span>
                <span className="carbon-value">
                  {result.carbon_footprint.lifetime.co2_avoided_tonnes.toFixed(
                    2
                  )}{" "}
                  tonnes
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {details.knn_prediction && details.xgb_prediction && (
        <div className="model-comparison">
          <h3> Model Breakdown</h3>
          <div className="model-cards">
            <div className="model-card">
              <h4>KNN Model</h4>
              <p>{details.knn_prediction.toFixed(2)} kWh</p>
              <span className="weight">Weight: 30%</span>
            </div>
            <div className="model-card">
              <h4>XGBoost Model</h4>
              <p>{details.xgb_prediction.toFixed(2)} kWh</p>
              <span className="weight">Weight: 70%</span>
            </div>
          </div>
        </div>
      )}

      <div className="prediction-details">
        <h3> Input Parameters</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Location:</span>
            <span className="detail-value">
              {pred.latitude?.toFixed(2)}°, {pred.longitude?.toFixed(2)}°
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Period:</span>
            <span className="detail-value">
              {new Date(2000, pred.month - 1).toLocaleString("default", {
                month: "long",
              })}{" "}
              {pred.year}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Tilt / Azimuth:</span>
            <span className="detail-value">
              {pred.tilt_deg?.toFixed(1)}° / {pred.azimuth_deg?.toFixed(1)}°
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Capacity:</span>
            <span className="detail-value">
              {pred.installed_capacity_kw?.toFixed(1)} kW
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Panel Efficiency:</span>
            <span className="detail-value">
              {(pred.panel_efficiency * 100)?.toFixed(1)}%
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">System Loss:</span>
            <span className="detail-value">
              {(pred.system_loss * 100)?.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PredictionResults;
