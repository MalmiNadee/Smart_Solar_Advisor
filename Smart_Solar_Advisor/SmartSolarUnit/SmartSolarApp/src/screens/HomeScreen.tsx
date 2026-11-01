import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity as ActivityIcon, AlertCircle, Sun, Zap, TrendingUp, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSolarSites, usePredictionData, useDailyEnergy30Days, useSensorData } from '../hooks/useBackendAPI';
import { CandleChart } from '../components/Charts';
import { PowerGauge } from '../components/PowerGauge';
import { SolarSystem } from '../types';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';
import { useTheme } from '../contexts/ThemeContext';

const logoImage = require('../assets/Logo.png');

export default function HomeScreen() {  
  const navigation = useNavigation<any>();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();
  const { colors } = useTheme();
  const { sites, loading, error, refetch } = useSolarSites(5000);
  
  // Get first site for summary and chart (or aggregate all sites)
  const firstSite = sites.length > 0 ? sites[0] : null;
  const { data: predictions, dailyTotal, monthlyTotal, loading: predictionLoading } = usePredictionData(
    firstSite?.customerName || null,
    firstSite?.id || null,
    10000
  );
  
  // Get sensor data for device status
  const { data: sensorData } = useSensorData(firstSite?.deviceId || null, 10000);
  
  // Use site creation date as start date for the 30-day chart (like web app)
  const startDate = firstSite?.created_at || null;
  
  const { dailyData: dailyEnergy30Days, loading: chartLoading } = useDailyEnergy30Days(
    firstSite?.customerName || null,
    firstSite?.id || null,
    30,
    startDate
  );
  
  // Calculate device status and current predicted kWh 5min
  const deviceStatus = useMemo(() => {
    if (!sensorData || sensorData.length === 0) return { isActive: false, lastReadingMinutes: null };
    const sorted = [...sensorData].sort((a, b) => {
      const tsA = new Date(a.timestamp).getTime();
      const tsB = new Date(b.timestamp).getTime();
      return tsB - tsA;
    });
    const latestReading = sorted[0];
    if (!latestReading || !latestReading.timestamp) return { isActive: false, lastReadingMinutes: null };
    const lastReadingTime = new Date(latestReading.timestamp).getTime();
    const now = new Date().getTime();
    const minutesAgo = Math.floor((now - lastReadingTime) / (1000 * 60));
    const isActive = minutesAgo <= 1440; // 24 hours
    return { isActive, lastReadingMinutes: minutesAgo };
  }, [sensorData]);
  
  const currentPredictedKwh5min = useMemo(() => {
    if (!predictions || predictions.length === 0) return 0;
    const sorted = [...predictions].sort((a, b) => {
      const tsA = new Date(a.timestamp).getTime();
      const tsB = new Date(b.timestamp).getTime();
      return tsB - tsA;
    });
    const latest = sorted[0];
    const value = latest?.predictedEnergy;
    if (value === null || value === undefined || isNaN(Number(value))) return 0;
    return Number(value);
  }, [predictions]);
  
  const chartData = useMemo(() => {
    return dailyEnergy30Days.map(item => ({
      label: item.label,
      value: item.totalKwh,
    }));
  }, [dailyEnergy30Days]);

  const renderSystemCard = (system: SolarSystem) => {
    const isOnline = system.status === 'running';
    return (
      <TouchableOpacity
        key={system.id}
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('PerformanceStack', { screen: 'Performance', params: { id: system.id, title: system.siteName, customerName: system.customerName } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Sun size={24} color={colors.solarOrange} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{system.siteName}</Text>
          </View>
          <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            <Text style={[styles.statusText, { color: colors.text }]}>{isOnline ? 'Running' : 'Completed'}</Text>
          </View>
        </View>
        <View style={[styles.cardStats, { borderColor: colors.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Capacity</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{system.systemCapacity} kW</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Panels</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{system.panelCount}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inverter</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{system.inverterCapacity} kW</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <ActivityIcon size={14} color={colors.textSecondary} />
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            Updated {system.lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: colors.solarOrange }]}
          onPress={() => navigation.navigate('PerformanceStack', { screen: 'Performance', params: { id: system.id, title: system.siteName, customerName: system.customerName } })}
        >
          <Text style={[styles.viewButtonText, { color: colors.white }]}>View Live Performance</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
          <Text style={[styles.title, { color: colors.white }]}>My Solar Systems</Text>
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
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your solar systems...</Text>
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
          <Text style={[styles.title, { color: colors.white }]}>My Solar Systems</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>{sites.length} installation{sites.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={isOpen ? closeSidebar : openSidebar} style={styles.menuButton}>
          {isOpen ? (
            <X size={24} color={colors.white} />
          ) : (
            <HamburgerIcon size={24} color={colors.white} />
          )}
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
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.solarOrange }]} onPress={refetch}>
              <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Gauge Meter */}
        {firstSite && firstSite.systemCapacity > 0 && (
          <PowerGauge
            predictedKwh5min={currentPredictedKwh5min}
            capacity={firstSite.systemCapacity}
            siteName={firstSite.siteName}
            loading={predictionLoading}
            isDeviceActive={deviceStatus.isActive}
            lastReadingMinutes={deviceStatus.lastReadingMinutes}
          />
        )}
        
        {/* Energy Summary Cards */}
        {sites.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <Zap size={24} color={colors.solarOrange} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Today's Predicted Energy</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{dailyTotal.toFixed(2)}</Text>
              <Text style={[styles.summaryUnit, { color: colors.textSecondary }]}>kWh</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <TrendingUp size={24} color={colors.success} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Monthly Predicted Energy</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{monthlyTotal.toFixed(2)}</Text>
              <Text style={[styles.summaryUnit, { color: colors.textSecondary }]}>kWh</Text>
            </View>
          </View>
        )}
        
        {/* 30-Day Energy Chart */}
        {sites.length > 0 && chartData.length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Energy Generation (Last 30 Days)</Text>
            <View style={[styles.chartContainer, { backgroundColor: colors.background }]}>
              {chartLoading ? (
                <ActivityIndicator size="large" color={colors.solarOrange} />
              ) : (
                <CandleChart data={chartData} height={250} color={colors.solarOrange} />
              )}
            </View>
          </View>
        )}
        
        {sites.length > 0 ? (
          <>
            <Text style={[styles.sitesTitle, { color: colors.text }]}>My Solar Systems</Text>
            {sites.map(renderSystemCard)}
          </>
        ) : !loading ? (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={colors.gray} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No solar systems found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your assigned solar installations will appear here
            </Text>
          </View>
        ) : null}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusOnline: {
    backgroundColor: '#DCFCE7',
  },
  statusOffline: {
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
  },
  dotOffline: {
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  divider: {
    width: 1,
    height: 32,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 12,
  },
  viewButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
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
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
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
  summaryLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  summaryUnit: {
    fontSize: 14,
  },
  chartSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  sitesTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 12,
    marginTop: 8,
  },
});
