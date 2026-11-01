import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, TrendingUp, Zap, Sun, AlertCircle, Activity, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSolarSites, usePredictionData, useDailyEnergy30Days } from '../hooks/useBackendAPI';
import { CandleChart } from '../components/Charts';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const logoImage = require('../assets/Logo.png');

export default function CustomerAnalysisScreen() {
  const { user } = useAuth();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();
  const { colors } = useTheme();
  const { sites, loading, error, refetch } = useSolarSites(10000);
  const navigation = useNavigation<any>();

  // Calculate aggregated statistics across all sites
  const aggregatedStats = useMemo(() => {
    let totalCapacity = 0;
    let totalPanels = 0;
    let totalInverters = 0;
    let activeSites = 0;
    let completedSites = 0;

    sites.forEach((site) => {
      totalCapacity += site.systemCapacity;
      totalPanels += site.panelCount;
      totalInverters += site.inverterCapacity;
      if (site.status === 'running') {
        activeSites++;
      } else {
        completedSites++;
      }
    });

    return {
      totalCapacity,
      totalPanels,
      totalInverters,
      activeSites,
      completedSites,
      totalSites: sites.length,
    };
  }, [sites]);

  // Get first site for summary data (or aggregate if needed)
  const firstSite = sites.length > 0 ? sites[0] : null;
  const { dailyTotal, monthlyTotal } = usePredictionData(
    firstSite?.customerName || null,
    firstSite?.id || null,
    15000
  );

  // Get 30-day chart data
  const startDate = firstSite?.created_at || null;
  const { dailyData: dailyEnergy30Days, loading: chartLoading } = useDailyEnergy30Days(
    firstSite?.customerName || null,
    firstSite?.id || null,
    30,
    startDate
  );

  const chartData = useMemo(() => {
    return dailyEnergy30Days.map(item => ({
      label: item.label,
      value: item.totalKwh,
    }));
  }, [dailyEnergy30Days]);

  // Calculate average daily energy
  const averageDailyEnergy = useMemo(() => {
    if (dailyEnergy30Days.length === 0) return 0;
    const total = dailyEnergy30Days.reduce((sum, item) => sum + item.totalKwh, 0);
    return total / dailyEnergy30Days.length;
  }, [dailyEnergy30Days]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (aggregatedStats.totalCapacity === 0) {
      return {
        avgEfficiency: 0,
        peakDay: 0,
        avgMonthlyProjection: monthlyTotal,
      };
    }

    // Estimate efficiency (kWh per kW capacity)
    const avgEfficiency = dailyTotal / aggregatedStats.totalCapacity;
    
    // Find peak day from chart data
    const peakDay = Math.max(...dailyEnergy30Days.map(item => item.totalKwh), 0);

    return {
      avgEfficiency: avgEfficiency || 0,
      peakDay,
      avgMonthlyProjection: monthlyTotal,
    };
  }, [dailyTotal, aggregatedStats.totalCapacity, dailyEnergy30Days, monthlyTotal]);

  if (loading && sites.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.logoContainer}>
            <Image 
              source={logoImage} 
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.title, { color: colors.white }]}>Customer Analysis</Text>
          <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
            {isOpen ? (
              <X size={24} color={colors.white} />
            ) : (
              <HamburgerIcon size={24} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.solarOrange} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analysis data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={logoImage} 
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: colors.white }]}>Customer Analysis</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>{user?.customerName || user?.email || 'Customer'}</Text>
        </View>
        <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
          {isOpen ? (
            <X size={24} color={colors.white} />
          ) : (
            <HamburgerIcon size={24} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.topButtonsRow}>
        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: colors.card, borderColor: colors.solarOrange }]}
          onPress={() => navigation.navigate('SeasonalPrediction')}
        >
          <Text style={[styles.topButtonText, { color: colors.text }]}>Seasonal Prediction</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: colors.card, borderColor: colors.gray }]}
          onPress={() => navigation.navigate('XAIInsights')}
        >
          <Text style={[styles.topButtonText, { color: colors.text }]}>XAI Insights</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && sites.length > 0}
            onRefresh={refetch}
            tintColor={colors.solarOrange}
          />
        }
      >
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
            <AlertCircle size={24} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Customer Overview Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Activity size={24} color={colors.solarOrange} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Overview</Text>
            </View>
          </View>
          <View style={styles.overviewGrid}>
            <View style={[styles.overviewItem, { backgroundColor: colors.lightGray }]}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total Systems</Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>{aggregatedStats.totalSites}</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: colors.lightGray }]}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Active Systems</Text>
              <Text style={[styles.overviewValue, { color: colors.success }]}>{aggregatedStats.activeSites}</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: colors.lightGray }]}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total Capacity</Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>{aggregatedStats.totalCapacity.toFixed(1)} kW</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: colors.lightGray }]}>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total Panels</Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>{aggregatedStats.totalPanels}</Text>
            </View>
          </View>
        </View>

        {/* Energy Statistics */}
        {sites.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Zap size={28} color={colors.solarOrange} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's Energy</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{dailyTotal.toFixed(2)}</Text>
              <Text style={[styles.statUnit, { color: colors.textSecondary }]}>kWh</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <TrendingUp size={28} color={colors.success} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Monthly Energy</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{monthlyTotal.toFixed(2)}</Text>
              <Text style={[styles.statUnit, { color: colors.textSecondary }]}>kWh</Text>
            </View>
          </View>
        )}

        {/* Performance Metrics */}
        {sites.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <BarChart3 size={24} color={colors.solarOrange} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Performance Metrics</Text>
              </View>
            </View>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricItem, { backgroundColor: colors.lightGray }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg Daily Energy</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{averageDailyEnergy.toFixed(2)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>kWh/day</Text>
              </View>
              <View style={[styles.metricItem, { backgroundColor: colors.lightGray }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Peak Day</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{performanceMetrics.peakDay.toFixed(2)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>kWh</Text>
              </View>
              <View style={[styles.metricItem, { backgroundColor: colors.lightGray }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>System Efficiency</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{performanceMetrics.avgEfficiency.toFixed(2)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>kWh/kW</Text>
              </View>
              <View style={[styles.metricItem, { backgroundColor: colors.lightGray }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Monthly Projection</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{performanceMetrics.avgMonthlyProjection.toFixed(0)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>kWh</Text>
              </View>
            </View>
          </View>
        )}

        {/* 30-Day Energy Chart */}
        {sites.length > 0 && chartData.length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <View style={styles.chartHeader}>
              <Sun size={24} color={colors.solarOrange} />
              <Text style={[styles.chartTitle, { color: colors.text }]}>Energy Generation Trend (30 Days)</Text>
            </View>
            <View style={[styles.chartContainer, { backgroundColor: colors.background }]}>
              {chartLoading ? (
                <View style={styles.chartLoading}>
                  <ActivityIndicator size="large" color={colors.solarOrange} />
                </View>
              ) : (
                <CandleChart data={chartData} height={250} color={colors.solarOrange} />
              )}
            </View>
          </View>
        )}

        {/* System Status Summary */}
        {sites.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Sun size={24} color={colors.solarOrange} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>System Status</Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: colors.success }]} />
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Active Systems</Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>{aggregatedStats.activeSites}</Text>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: colors.gray }]} />
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Completed Systems</Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>{aggregatedStats.completedSites}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Total Inverter Capacity</Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>{aggregatedStats.totalInverters.toFixed(1)} kW</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {sites.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={colors.gray} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No data available</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Customer analysis will appear here once solar systems are configured
            </Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    flex: 1,
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  topButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  topButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  activeValue: {
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 11,
  },
  chartSection: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  chartLoading: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusOnline: {
  },
  statusOffline: {
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  errorContainer: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

