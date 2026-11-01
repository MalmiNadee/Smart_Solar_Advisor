import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { TrendingUp, Zap, Calendar, AlertCircle } from 'lucide-react-native';
import { LineChart } from '../components/Charts';
import { useSolarSite, useMonthlyPerformance } from '../hooks/useBackendAPI';

export default function MonthlySummaryScreen() {
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { id, customerName } = route.params || {};
 
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { site } = useSolarSite(id, 10000);
  const effectiveCustomerName = customerName || site?.customerName || null;

  const { dailyData, totalEnergy, loading, error } = useMonthlyPerformance(
    effectiveCustomerName,
    id,
    yearMonth,
    60000 // Poll every minute
  );

  const averageDaily = useMemo(() => {
    return dailyData.length > 0 ? totalEnergy / dailyData.length : 0;
  }, [totalEnergy, dailyData.length]);

  const chartData = dailyData.map(item => ({
    x: item.date,
    y: item.energy,
  }));

  const bestDayEnergy = dailyData.length > 0
    ? Math.max(...dailyData.map(d => d.energy))
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.monthBadge}>
            <Calendar size={20} color={colors.white} />
            <Text style={[styles.monthText, { color: colors.white }]}>{currentMonth}</Text>
          </View>
        </View>
        {loading && dailyData.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.solarOrange} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading monthly summary...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
              <TrendingUp size={32} color={colors.success} />
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Energy This Month</Text>
              <Text style={[styles.totalValue, { color: colors.solarOrange }]}>{totalEnergy.toFixed(2)}</Text>
              <Text style={[styles.totalUnit, { color: colors.textSecondary }]}>kWh</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Zap size={24} color={colors.solarOrange} />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily Average</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{averageDaily.toFixed(2)} kWh</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <TrendingUp size={24} color={colors.success} />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best Day</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {bestDayEnergy.toFixed(2)} kWh
                </Text>
              </View>
            </View>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Performance Trend</Text>
              <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
                <LineChart data={chartData} height={300} color={colors.solarOrange} />
              </View>
            </View>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Insights</Text>
              <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>Consistent Production</Text>
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                  Your solar system is performing well with an average of {averageDaily.toFixed(1)} kWh per day.
                </Text>
              </View>
              <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>Monthly Projection</Text>
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                  Based on current trends, you're on track to generate approximately {totalEnergy.toFixed(0)} kWh this month.
                </Text>
              </View>
            </View>
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
    alignItems: 'center',
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  monthText: {
    fontSize: 18,
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
    marginTop: 12,
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
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
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
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
  insightCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
