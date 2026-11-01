import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, Sun, Thermometer, Droplets, Wind, CloudRain, Zap } from 'lucide-react-native';
import { BarChart, LineChart } from '../components/Charts';
import { useSolarSite, useDailyPerformance, useDaily5MinuteIntervals, useDailySensorData } from '../hooks/useBackendAPI';
import { useTheme } from '../contexts/ThemeContext';

export default function DailyPerformanceScreen() {
  const route = useRoute<any>();
  const { id, customerName } = route.params || {};
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { site } = useSolarSite(id, 10000);
  const effectiveCustomerName = customerName || site?.customerName || null;

  const { hourlyData, totalEnergy, loading, error } = useDailyPerformance(
    effectiveCustomerName,
    id,
    selectedDate,
    30000 // Poll every 30 seconds
  );

  // Fetch 5-minute interval predictions with sensor data
  const { intervals: fiveMinIntervals, loading: intervalsLoading } = useDaily5MinuteIntervals(
    effectiveCustomerName,
    id,
    selectedDate,
    60000
  );

  // Fetch sensor data for the selected date
  const { sensorData: dailySensorData, loading: sensorLoading } = useDailySensorData(
    site?.deviceId || null,
    selectedDate,
    60000
  );

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const chartData = hourlyData.map(item => ({
    x: item.hour,
    y: item.energy,
  }));

  // Prepare sensor chart data
  const irradianceChartData = useMemo(() => {
    return dailySensorData.map((data: { timestamp: Date; irradiance: number }, index: number) => ({
      x: index,
      y: data.irradiance,
      timestamp: data.timestamp,
    }));
  }, [dailySensorData]);

  const tempHumidityChartData = useMemo(() => {
    return dailySensorData.map((data: { timestamp: Date; temperature: number }, index: number) => ({
      x: index,
      y: data.temperature,
      timestamp: data.timestamp,
    }));
  }, [dailySensorData]);

  const humidityChartData = useMemo(() => {
    return dailySensorData.map((data: { timestamp: Date; humidity: number }, index: number) => ({
      x: index,
      y: data.humidity,
      timestamp: data.timestamp,
    }));
  }, [dailySensorData]);

  const dustRainChartData = useMemo(() => {
    return dailySensorData.map((data: { timestamp: Date; dustLevel: number }, index: number) => ({
      x: index,
      y: data.dustLevel,
      timestamp: data.timestamp,
    }));
  }, [dailySensorData]);

  const rainChartData = useMemo(() => {
    return dailySensorData.map((data: { timestamp: Date; rainLevel: number }, index: number) => ({
      x: index,
      y: data.rainLevel,
      timestamp: data.timestamp,
    }));
  }, [dailySensorData]);

  // Prepare predictions chart data
  const predictionsChartData = useMemo(() => {
    return fiveMinIntervals.map((interval: { timestamp: string; predicted: number }, index: number) => ({
      x: index,
      y: interval.predicted * 1000, // Convert to Wh for better visualization
      timestamp: interval.timestamp,
    }));
  }, [fiveMinIntervals]);

  // Format time from timestamp (YYYYMMDD_HHMMSS)
  const formatTime = (timestamp: string) => {
    if (!timestamp || timestamp.length < 13) return '';
    return `${timestamp.substring(9, 11)}:${timestamp.substring(11, 13)}`;
  };

  const peakHour = hourlyData.length > 0
    ? hourlyData.reduce((max, item) => item.energy > max.energy ? item : max).hour
    : 0;
  const peakOutput = hourlyData.length > 0
    ? Math.max(...hourlyData.map(h => h.energy))
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => changeDate(-1)}
            >
              <ChevronLeft size={24} color={colors.white} />
            </TouchableOpacity>
           
            <View style={[styles.dateInfo, { backgroundColor: colors.card }]}>
              <Calendar size={20} color={colors.solarOrange} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => changeDate(1)}
            >
              <ChevronRight size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        {loading && hourlyData.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.solarOrange} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading daily performance...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Energy Generated</Text>
              <Text style={[styles.totalValue, { color: colors.solarOrange }]}>{totalEnergy.toFixed(2)}</Text>
              <Text style={[styles.totalUnit, { color: colors.textSecondary }]}>kWh</Text>
            </View>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Hourly Breakdown</Text>
              <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                <BarChart data={chartData} height={300} color={colors.solarOrange} />
              </View>
            </View>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Peak Performance</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peak Hour</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {peakHour}:00
                  </Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peak Output</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {peakOutput.toFixed(2)} kWh
                  </Text>
                </View>
              </View>
            </View>

            {/* Sensor Charts */}
            {dailySensorData.length > 0 && (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Sensor Charts</Text>
                  
                  {/* Irradiance Chart */}
                  <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.chartHeader}>
                      <Sun size={20} color={colors.solarOrange} />
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Solar Irradiance</Text>
                    </View>
                    <LineChart data={irradianceChartData} color={colors.solarOrange} unit=" lux" height={200} />
                  </View>

                  {/* Temperature Chart */}
                  <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.chartHeader}>
                      <Thermometer size={20} color={colors.danger} />
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Temperature</Text>
                    </View>
                    <LineChart data={tempHumidityChartData} color={colors.danger} unit=" °C" height={200} />
                  </View>

                  {/* Humidity Chart */}
                  <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.chartHeader}>
                      <Droplets size={20} color={colors.success} />
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Humidity</Text>
                    </View>
                    <LineChart data={humidityChartData} color={colors.success} unit=" %" height={200} />
                  </View>

                  {/* Dust Level Chart */}
                  <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.chartHeader}>
                      <Wind size={20} color={colors.warning} />
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Dust Level</Text>
                    </View>
                    <LineChart data={dustRainChartData} color={colors.warning} unit=" mg/m³" height={200} />
                  </View>

                  {/* Rain Level Chart */}
                  <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.chartHeader}>
                      <CloudRain size={20} color={colors.primary} />
                      <Text style={[styles.chartTitle, { color: colors.text }]}>Rain Level</Text>
                    </View>
                    <LineChart data={rainChartData} color={colors.primary} unit=" %" height={200} />
                  </View>
                </View>
              </>
            )}

            {/* Predictions Chart */}
            {predictionsChartData.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>5-Minute Energy Predictions</Text>
                <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                  <View style={styles.chartHeader}>
                    <Zap size={20} color={colors.success} />
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Predicted Energy (Wh)</Text>
                  </View>
                  <LineChart data={predictionsChartData} color={colors.success} unit=" Wh" height={200} />
                </View>
              </View>
            )}

            {/* 5-Minute Interval Details Table */}
            {fiveMinIntervals.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  5-Minute Interval Details ({fiveMinIntervals.length} readings)
                </Text>
                <View style={[styles.tableContainer, { backgroundColor: colors.card }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      {/* Table Header */}
                      <View style={[styles.tableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                        <Text style={[styles.tableHeaderText, { width: 70, color: colors.textSecondary }]}>Time</Text>
                        <Text style={[styles.tableHeaderText, { width: 100, color: colors.textSecondary }]}>Predicted (kWh)</Text>
                        <Text style={[styles.tableHeaderText, { width: 90, color: colors.textSecondary }]}>Irradiance</Text>
                        <Text style={[styles.tableHeaderText, { width: 100, color: colors.textSecondary }]}>Temperature</Text>
                        <Text style={[styles.tableHeaderText, { width: 80, color: colors.textSecondary }]}>Humidity</Text>
                        <Text style={[styles.tableHeaderText, { width: 90, color: colors.textSecondary }]}>Dust Level</Text>
                        <Text style={[styles.tableHeaderText, { width: 80, color: colors.textSecondary }]}>Rainfall</Text>
                      </View>
                      {/* Table Rows */}
                      <ScrollView style={styles.tableBody} nestedScrollEnabled>
                        {fiveMinIntervals.map((interval: { timestamp: string; predicted: number; irradiance?: number; temperature?: number; humidity?: number; dustLevel?: number; rainLevel?: number }, idx: number) => (
                          <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.tableCell, { width: 70, color: colors.text }]}>
                              {formatTime(interval.timestamp)}
                            </Text>
                            <Text style={[styles.tableCell, { width: 100, color: colors.text }]}>
                              {interval.predicted.toFixed(4)}
                            </Text>
                            <Text style={[styles.tableCell, { width: 90, color: colors.text }]}>
                              {interval.irradiance !== undefined ? interval.irradiance.toFixed(2) : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCell, { width: 100, color: colors.text }]}>
                              {interval.temperature !== undefined ? `${interval.temperature.toFixed(1)}°C` : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCell, { width: 80, color: colors.text }]}>
                              {interval.humidity !== undefined ? `${interval.humidity.toFixed(1)}%` : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCell, { width: 90, color: colors.text }]}>
                              {interval.dustLevel !== undefined ? interval.dustLevel.toFixed(3) : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCell, { width: 80, color: colors.text }]}>
                              {interval.rainLevel !== undefined ? interval.rainLevel.toFixed(2) : 'N/A'}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  totalCard: {
    margin: 20,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  totalValue: {
    fontSize: 48,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  totalUnit: {
    fontSize: 18,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tableContainer: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderBottomWidth: 2,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 11,
    textAlign: 'center',
  },
});
