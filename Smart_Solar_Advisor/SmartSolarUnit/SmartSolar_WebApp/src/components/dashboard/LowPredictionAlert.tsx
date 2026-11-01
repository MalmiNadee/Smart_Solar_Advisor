import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { LowPredictionExplanation } from "@/types/solar";
import { cn } from "@/lib/utils";

interface LowPredictionAlertProps {
  explanation: LowPredictionExplanation | null;
  loading?: boolean;
  onDismiss?: () => void;
}

export const LowPredictionAlert: React.FC<LowPredictionAlertProps> = ({
  explanation,
  loading,
  onDismiss,
}) => {
  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-card border border-border">
        <p className="text-sm text-muted-foreground">Analyzing prediction...</p>
      </div>
    );
  }

  if (!explanation || !explanation.isLow) {
    return null;
  }

  return (
    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div className="flex-1">
          {/* <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Low Energy Prediction Detected
          </h4> */}
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            Today's prediction ({explanation.predictedKwh.toFixed(2)} kWh) is{" "}
            {explanation.percentage.toFixed(1)}% of the average ({explanation.averageKwh.toFixed(2)} kWh).
          </p>

          {explanation.factors && explanation.factors.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Contributing Factors:
              </p>
              {explanation.factors.slice(0, 3).map((factor, idx) => (
                <div
                  key={idx}
                  className="text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded"
                >
                  <span className="font-medium">{factor.name}:</span> {factor.explanation}
                </div>
              ))}
            </div>
          )}

          {explanation.recommendations && explanation.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Recommendations:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {explanation.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
