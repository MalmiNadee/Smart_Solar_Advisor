from predictor.energy_predictor import predict_5min_energy


def calculate_5min_system_energy(
    model_features: dict,
    panel_area_m2: float
) -> float:
    energy_per_m2 = predict_5min_energy(model_features)
    system_energy = energy_per_m2 * panel_area_m2
    return round(system_energy, 6)
