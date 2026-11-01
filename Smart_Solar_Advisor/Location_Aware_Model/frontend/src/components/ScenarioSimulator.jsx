import React, { useState } from "react";
import { predictionsAPI } from "../services/api";
import "../styles/ScenarioSimulator.css";

function ScenarioSimulator({ baseFormData, onScenarioComplete }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);

  const defaultScenarios = [
    {
      name: "Optimal Configuration",
      description: "Best tilt and azimuth for maximum energy",
      changes: {
        tilt_deg: 8.0,
        azimuth_deg: 180.0,
        shading_factor: 1.0,
        panel_efficiency: 0.22,
      },
    },
    {
      name: "High Efficiency Panels",
      description: "Premium panels with 22% efficiency",
      changes: {
        panel_efficiency: 0.22,
        system_loss: 0.12,
      },
    },
    {
      name: "Partial Shading",
      description: "Realistic scenario with some shading",
      changes: {
        shading_factor: 0.85,
      },
    },
    {
      name: "Low Cost Setup",
      description: "Standard panels with basic configuration",
      changes: {
        panel_efficiency: 0.18,
        system_loss: 0.16,
      },
    },
  ];

  const runScenario = async (scenario) => {
    setLoading(true);
    setActiveScenario(scenario.name);

    try {
      const scenarioData = {
        ...baseFormData,
        ...scenario.changes,
        scenario_name: scenario.name,
        electricity_rate: baseFormData.electricity_rate || 49.0, // LKR/kWh
        system_cost_per_kw: baseFormData.system_cost_per_kw || 325000, // LKR/kW
      };

      const response = await predictionsAPI.predict(scenarioData);

      const newScenario = {
        ...scenario,
        result: response.data,
        timestamp: new Date(),
      };

      setScenarios((prev) => [...prev, newScenario]);

      if (onScenarioComplete) {
        onScenarioComplete(newScenario);
      }
    } catch (error) {
      console.error("Scenario simulation failed:", error);
      alert(
        `Failed to run scenario: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setLoading(false);
      setActiveScenario(null);
    }
  };

  const runAllScenarios = async () => {
    setLoading(true);
    const results = [];

    for (const scenario of defaultScenarios) {
      try {
        setActiveScenario(scenario.name);
        const scenarioData = {
          ...baseFormData,
          ...scenario.changes,
          scenario_name: scenario.name,
          electricity_rate: baseFormData.electricity_rate || 0.15,
          system_cost_per_kw: baseFormData.system_cost_per_kw || 1000,
        };

        const response = await predictionsAPI.predict(scenarioData);
        results.push({
          ...scenario,
          result: response.data,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(`Scenario ${scenario.name} failed:`, error);
      }
    }

    setScenarios(results);
    setLoading(false);
    setActiveScenario(null);
  };

  const clearScenarios = () => {
    setScenarios([]);
  };

  return (
    <div className="scenario-simulator">
      <div className="scenario-header">
        <h3> Scenario Simulation</h3>
        <p>Compare different system configurations to find the best setup</p>
      </div>

      <div className="scenario-actions">
        <button
          className="run-all-btn"
          onClick={runAllScenarios}
          disabled={loading}
        >
          {loading ? " Running..." : " Run All Scenarios"}
        </button>
        {scenarios.length > 0 && (
          <button
            className="clear-btn"
            onClick={clearScenarios}
            disabled={loading}
          >
            🗑️ Clear Results
          </button>
        )}
      </div>

      <div className="scenario-list">
        {defaultScenarios.map((scenario, idx) => (
          <div key={idx} className="scenario-card">
            <div className="scenario-info">
              <h4>{scenario.name}</h4>
              <p>{scenario.description}</p>
              <div className="scenario-changes">
                <strong>Changes:</strong>
                <ul>
                  {Object.entries(scenario.changes).map(([key, value]) => (
                    <li key={key}>
                      {key.replace(/_/g, " ")}:{" "}
                      {typeof value === "number" ? value.toFixed(2) : value}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="scenario-actions-single">
              <button
                className="run-scenario-btn"
                onClick={() => runScenario(scenario)}
                disabled={loading}
              >
                {loading && activeScenario === scenario.name
                  ? "Running..."
                  : "Run Scenario"}
              </button>

              {scenarios.find((s) => s.name === scenario.name) && (
                <div className="scenario-result">
                  <div className="result-item">
                    <span> Monthly Energy:</span>
                    <strong>
                      {scenarios
                        .find((s) => s.name === scenario.name)
                        ?.result?.prediction?.predicted_energy_kwh?.toFixed(
                          2
                        ) || "N/A"}{" "}
                      kWh
                    </strong>
                  </div>
                  {scenarios.find((s) => s.name === scenario.name)?.result
                    ?.financial && (
                    <>
                      <div className="result-item">
                        <span>Monthly Savings:</span>
                        <strong>
                          LKR
                          {(
                            scenarios.find((s) => s.name === scenario.name)
                              ?.result?.financial?.annual_savings_lkr / 12 ||
                            scenarios.find((s) => s.name === scenario.name)
                              ?.result?.financial?.annual_savings_usd / 12 ||
                            0
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </strong>
                      </div>
                      <div className="result-item">
                        <span>ROI:</span>
                        <strong>
                          {scenarios
                            .find((s) => s.name === scenario.name)
                            ?.result?.financial?.roi_percentage?.toFixed(1) ||
                            "N/A"}
                          %
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {scenarios.length > 0 && (
        <div className="scenario-comparison">
          <h4> Scenario Comparison</h4>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Monthly Energy (kWh)</th>
                  <th>Monthly Savings</th>
                  <th>ROI (%)</th>
                  <th>Payback (years)</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario, idx) => (
                  <tr key={idx}>
                    <td>{scenario.name}</td>
                    <td>
                      {scenario.result?.prediction?.predicted_energy_kwh?.toFixed(
                        2
                      ) || "N/A"}
                    </td>
                    <td>
                      LKR{" "}
                      {(
                        scenario.result?.financial?.annual_savings_lkr / 12 ||
                        scenario.result?.financial?.annual_savings_usd / 12 ||
                        0
                      ).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      {scenario.result?.financial?.roi_percentage?.toFixed(1) ||
                        "N/A"}
                      %
                    </td>
                    <td>
                      {scenario.result?.financial?.payback_period_years?.toFixed(
                        1
                      ) || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScenarioSimulator;
