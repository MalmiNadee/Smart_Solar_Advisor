import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity as ActivityIcon,
  TrendingUp,
  CloudRain,
  Calendar,
  BarChart3,
  AlertCircle,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  useSolarSites,
  useWeatherSeasonal,
  usePredictionMonthlyBreakdown,
  useFullYearForecast,
  useFeatureImportance,
  useDailyAnalysis,
  useTimeSeriesForecast,
  useDaily5MinuteIntervals,
} from '../hooks/useBackendAPI';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';
import { useTheme } from '../contexts/ThemeContext';
import { LineChart, BarChart } from '../components/Charts';
import {
  TimeSeriesForecastChart,
  SeasonalTrendsChart,
  FullYearForecastChartMobile,
} from '../components/AdvancedCharts';

const logoImage = require('../assets/Logo.png');

type AnalysisTab = 'daily' | 'timeseries' | 'seasonal' | 'forecast' | 'importance';

export default function SeasonalPredictionScreen() {
  const { user } = useAuth();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();
  const { colors } = useTheme();
  const { sites, loading: sitesLoading } = useSolarSites(10000);

  const runningSites = useMemo(
    () => sites.filter((s) => s.status === 'running'),
    [sites]
  );

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('daily');

  const selectedSite = useMemo(
    () =>
      sites.find((s) => s.id === selectedSiteId) ||
      runningSites[0] ||
      sites[0] ||
      null,
    [sites, runningSites, selectedSiteId]
  );

  React.useEffect(() => {
    if (!selectedSiteId && selectedSite) {
      setSelectedSiteId(selectedSite.id);
    }
  }, [selectedSite, selectedSiteId]);

  const customerName = selectedSite?.customerName ?? null;
  const siteId = selectedSite?.id ?? null;

  const { data: weatherSeasonal, loading: weatherLoading } = useWeatherSeasonal(
    selectedSite?.latitude ?? null,
    selectedSite?.longitude ?? null
  );

  const {
    data: monthlyBreakdown,
    loading: breakdownLoading,
  } = usePredictionMonthlyBreakdown(customerName, siteId);

  const {
    data: fullYearForecast,
    loading: fullYearLoading,
  } = useFullYearForecast(
    customerName,
    siteId,
    selectedSite?.latitude,
    selectedSite?.longitude
  );

  const {
    data: featureImportance,
    loading: importanceLoading,
  } = useFeatureImportance(customerName, siteId);

  const {
    data: dailyAnalysis,
    loading: dailyAnalysisLoading,
    refetch: refetchDailyAnalysis,
  } = useDailyAnalysis(customerName, siteId, undefined, true);

  // 5‑minute intervals for today's daily chart
  const today = new Date();
  const { intervals: dailyIntervals } = useDaily5MinuteIntervals(
    customerName,
    siteId,
    today,
    60000
  );

  const historyDays = useMemo(() => {
    if (selectedSite?.created_at) {
      const start = new Date(selectedSite.created_at);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(7, diffDays);
    }
    return 90;
  }, [selectedSite?.created_at]);

  const {
    data: timeSeriesForecast,
    loading: timeSeriesLoading,
    refetch: refetchTimeSeries,
  } = useTimeSeriesForecast(customerName, siteId, historyDays, 30, 'prophet');

  const seasonalChartData = useMemo(() => {
    const weatherByMonth = new Map<string, any>(
      (weatherSeasonal?.monthly || []).map((m: any) => [m.yearMonth, m])
    );

    const historyData = timeSeriesForecast?.historyData || timeSeriesForecast?.history || [];
    if (historyData.length > 0) {
      return historyData.map((h: any) => {
        // h.date is like "2024-03-01"
        const monthPrefix = h.date?.substring(0, 7); // e.g. "2024-03"
        const w: any = weatherByMonth.get(monthPrefix);
        return {
          month: monthPrefix,
          label: h.date,
          avgTemp: w?.avgTemperature ?? null,
          solarKwh: Math.round((h.value ?? h.totalKwh ?? 0) * 1000) / 1000,
        };
      });
    }

    return (monthlyBreakdown || []).map((p: any) => {
      const w: any = weatherByMonth.get(p.yearMonthLabel);
      return {
        month: p.yearMonthLabel,
        label: `${p.yearMonthLabel.slice(5)}/${String(p.year).slice(2)}`,
        avgTemp: w?.avgTemperature ?? null,
        solarKwh: Math.round(p.totalKwh * 1000) / 1000,
      };
    });
  }, [weatherSeasonal?.monthly, timeSeriesForecast, monthlyBreakdown]);

  const renderSiteSelector = () => {
    if (sites.length === 0) return null;
    return (
      <View style={styles.siteSelectorContainer}>
        <Text style={[styles.siteSelectorLabel, { color: colors.textSecondary }]}>
          Site:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.siteChipsRow}
        >
          {sites.map((s) => {
            const isActive = selectedSite?.id === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.siteChip,
                  {
                    backgroundColor: isActive ? colors.solarOrange : colors.card,
                    borderColor: isActive ? colors.solarOrange : colors.border,
                  },
                ]}
                onPress={() => setSelectedSiteId(s.id)}
              >
                <Text
                  style={[
                    styles.siteChipText,
                    { color: isActive ? colors.white : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {s.siteName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const dailyCards =
    dailyAnalysis && !dailyAnalysis.error
      ? [
        {
          label: 'Date',
          value: dailyAnalysis.date || 'Today',
        },
        {
          label: 'Total kWh',
          value: dailyAnalysis.totalKwh?.toFixed(4) ?? '0.0000',
        },
        {
          label: 'Readings',
          value: String(dailyAnalysis.readingsCount ?? 0),
        },
        {
          label: 'Latest (5min)',
          value:
            dailyAnalysis.latestPrediction?.predictedKwh?.toFixed(4) ?? 'N/A',
        },
      ]
      : [];

  const timeSeriesVictoryData = useMemo(() => {
    if (!timeSeriesForecast || timeSeriesForecast.error) return [];
    const history = (timeSeriesForecast.historyData ||
      timeSeriesForecast.history ||
      []) as any[];
    const forecast = (timeSeriesForecast.forecast || []) as any[];
    const combined: {
      date: string;
      value: number;
      lower?: number;
      upper?: number;
      type: 'history' | 'forecast';
    }[] = [];
    history.forEach((h: any) => {
      const v = h.value ?? h.totalKwh ?? 0;
      combined.push({
        date: h.date,
        value: v,
        type: 'history',
      });
    });
    forecast.forEach((f: any) => {
      combined.push({
        date: f.date,
        value: f.yhat ?? 0,
        lower: f.yhat_lower,
        upper: f.yhat_upper,
        type: 'forecast',
      });
    });
    return combined;
  }, [timeSeriesForecast]);

  const fullYearVictoryData = useMemo(() => {
    if (!fullYearForecast || !fullYearForecast.forecast) return [];
    return fullYearForecast.forecast.map((item: any) => ({
      label: `${item.monthName} ${item.year?.toString().slice(2) || ''}`,
      temperature: item.avgTemperature,
      solarKwh: Math.round((item.predictedSolarKwh || 0) * 100) / 100,
      confidence: item.confidence,
    }));
  }, [fullYearForecast]);

  const featureItems = (featureImportance?.features || []) as Array<{
    name: string;
    importance: number;
  }>;

  const dailyLineData = useMemo(
    () =>
      (dailyIntervals || []).map((d, idx) => ({
        x: idx,
        y: d.predicted,
        label: d.timestamp,
      })),
    [dailyIntervals]
  );

  const seasonalVictoryData = seasonalChartData;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.logoContainer}>
          <Image
            source={logoImage}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: colors.white }]}>
            Seasonal Prediction
          </Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>
            {user?.customerName || user?.email || 'Customer'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={isOpen ? closeSidebar : openSidebar}
          style={styles.menuButton}
        >
          {isOpen ? (
            <X size={24} color={colors.white} />
          ) : (
            <HamburgerIcon size={24} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {sitesLoading && sites.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.solarOrange} />
          <Text
            style={[styles.loadingText, { color: colors.textSecondary }]}
          >
            Loading sites...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderSiteSelector()}

          {!selectedSite && !sitesLoading && (
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <AlertCircle size={20} color={colors.gray} />
              <Text
                style={[
                  styles.infoText,
                  { color: colors.textSecondary },
                ]}
              >
                No site selected. Add a site to view analysis.
              </Text>
            </View>
          )}

          {selectedSite && (
            <>
              <Text
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Analysis Categories
              </Text>
              <View style={styles.boxGrid}>
                <TouchableOpacity
                  style={[
                    styles.boxItem,
                    {
                      backgroundColor:
                        activeTab === 'daily' ? colors.solarOrange : colors.card,
                    },
                  ]}
                  onPress={() => setActiveTab('daily')}
                >
                  <ActivityIcon size={24} color={colors.solarOrange} />
                  <Text
                    style={[
                      styles.boxTitle,
                      {
                        color: activeTab === 'daily' ? colors.white : colors.text,
                      },
                    ]}
                  >
                    Daily Energy Generation
                  </Text>
                  <Text
                    style={[
                      styles.boxSubtitle,
                      {
                        color:
                          activeTab === 'daily'
                            ? colors.white
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Realtime collected results
                  </Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                  style={[
                    styles.boxItem,
                    {
                      backgroundColor:
                        activeTab === 'timeseries'
                          ? colors.solarOrange
                          : colors.card,
                    },
                  ]}
                  onPress={() => setActiveTab('timeseries')}
                >
                  <TrendingUp size={24} color={colors.success} />
                  <Text
                    style={[
                      styles.boxTitle,
                      {
                        color:
                          activeTab === 'timeseries'
                            ? colors.white
                            : colors.text,
                      },
                    ]}
                  >
                    Time-Series Forecast
                  </Text>
                  <Text
                    style={[
                      styles.boxSubtitle,
                      {
                        color:
                          activeTab === 'timeseries'
                            ? colors.white
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Prophet model
                  </Text>
                </TouchableOpacity> */}

                <TouchableOpacity
                  style={[
                    styles.boxItem,
                    {
                      backgroundColor:
                        activeTab === 'seasonal'
                          ? colors.solarOrange
                          : colors.card,
                    },
                  ]}
                  onPress={() => setActiveTab('seasonal')}
                >
                  <CloudRain size={24} color={colors.solarOrange} />
                  <Text
                    style={[
                      styles.boxTitle,
                      {
                        color:
                          activeTab === 'seasonal'
                            ? colors.white
                            : colors.text,
                      },
                    ]}
                  >
                    Seasonal Trends
                  </Text>
                  <Text
                    style={[
                      styles.boxSubtitle,
                      {
                        color:
                          activeTab === 'seasonal'
                            ? colors.white
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Since creation date
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.boxItem,
                    {
                      backgroundColor:
                        activeTab === 'forecast'
                          ? colors.solarOrange
                          : colors.card,
                    },
                  ]}
                  onPress={() => setActiveTab('forecast')}
                >
                  <Calendar size={24} color={colors.solarOrange} />
                  <Text
                    style={[
                      styles.boxTitle,
                      {
                        color:
                          activeTab === 'forecast'
                            ? colors.white
                            : colors.text,
                      },
                    ]}
                  >
                    Full Year Forecast
                  </Text>
                  <Text
                    style={[
                      styles.boxSubtitle,
                      {
                        color:
                          activeTab === 'forecast'
                            ? colors.white
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    12 months ahead
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.boxItem,
                    {
                      backgroundColor:
                        activeTab === 'importance'
                          ? colors.solarOrange
                          : colors.card,
                    },
                  ]}
                  onPress={() => setActiveTab('importance')}
                >
                  <BarChart3 size={24} color={colors.solarOrange} />
                  <Text
                    style={[
                      styles.boxTitle,
                      {
                        color:
                          activeTab === 'importance'
                            ? colors.white
                            : colors.text,
                      },
                    ]}
                  >
                    Feature Importance
                  </Text>
                  <Text
                    style={[
                      styles.boxSubtitle,
                      {
                        color:
                          activeTab === 'importance'
                            ? colors.white
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Key drivers of predictions
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tabbed content similar to web Analyze page */}
              <View style={styles.tabContentContainer}>
                {activeTab === 'daily' && (
                  <View
                    style={[
                      styles.tabCard,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[styles.tabTitle, { color: colors.text }]}
                    >
                      Daily Energy Generation (Realtime Collected Results)
                    </Text>
                    <Text
                      style={[
                        styles.tabDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Today&apos;s aggregated predictions with AI explanation from
                      your latest sensor data.
                    </Text>
                    <View style={styles.tabHeaderRow}>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        style={[
                          styles.smallButton,
                          { backgroundColor: colors.solarOrange },
                        ]}
                        onPress={refetchDailyAnalysis}
                        disabled={dailyAnalysisLoading}
                      >
                        <Text
                          style={[
                            styles.smallButtonText,
                            { color: colors.white },
                          ]}
                        >
                          Refresh Daily Results
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {dailyAnalysisLoading ? (
                      <View style={styles.centerBlock}>
                        <ActivityIndicator
                          size="large"
                          color={colors.solarOrange}
                        />
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Loading realtime data...
                        </Text>
                      </View>
                    ) : !dailyAnalysis ? (
                      <View style={styles.centerBlock}>
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          No data available.
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.metricsGrid}>
                          {dailyCards.map((c) => (
                            <View
                              key={c.label}
                              style={[
                                styles.metricCard,
                                { backgroundColor: colors.background },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.metricLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {c.label}
                              </Text>
                              <Text
                                style={[
                                  styles.metricValueBig,
                                  { color: colors.text },
                                ]}
                              >
                                {c.value}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {dailyLineData.length > 0 && (
                          <View
                            style={[
                              styles.chartWrapper,
                              { backgroundColor: colors.background },
                            ]}
                          >
                            <LineChart
                              data={dailyLineData}
                              height={220}
                              color={colors.solarOrange}
                              unit=" kWh"
                            />
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'timeseries' && (
                  <View
                    style={[
                      styles.tabCard,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[styles.tabTitle, { color: colors.text }]}
                    >
                      Time-Series Forecast (Prophet)
                    </Text>
                    <Text
                      style={[
                        styles.tabDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Forecast trained on your collected daily energy from{' '}
                      {selectedSite?.created_at || 'the first available day'} up
                      to today.
                    </Text>
                    <View style={styles.tabHeaderRow}>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        style={[
                          styles.smallButton,
                          { backgroundColor: colors.solarOrange },
                        ]}
                        onPress={refetchTimeSeries}
                        disabled={timeSeriesLoading}
                      >
                        <Text
                          style={[
                            styles.smallButtonText,
                            { color: colors.white },
                          ]}
                        >
                          Generate Forecast
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {timeSeriesLoading ? (
                      <View style={styles.centerBlock}>
                        <ActivityIndicator
                          size="large"
                          color={colors.solarOrange}
                        />
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Computing Prophet forecast...
                        </Text>
                      </View>
                    ) : !timeSeriesForecast || timeSeriesForecast.error ? (
                      <View style={styles.centerBlock}>
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {timeSeriesForecast?.message ||
                            'Time-series forecast unavailable. Ensure Python engine is running.'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        {timeSeriesVictoryData.length > 0 && (
                          <View
                            style={[
                              styles.chartWrapper,
                              { backgroundColor: colors.background },
                            ]}
                          >
                            <TimeSeriesForecastChart
                              data={timeSeriesVictoryData}
                            />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.infoTextSmall,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Model: {timeSeriesForecast.model || 'prophet'} ·
                          History: {timeSeriesForecast.history?.length || 0}{' '}
                          days · Forecast:{' '}
                          {timeSeriesForecast.forecast?.length || 0} days
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'seasonal' && (
                  <View
                    style={[
                      styles.tabCard,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[styles.tabTitle, { color: colors.text }]}
                    >
                      Seasonal Trends (Last 12 Months)
                    </Text>
                    <Text
                      style={[
                        styles.tabDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Daily energy results collected by the device and monthly average temperature.
                    </Text>
                    {weatherLoading || timeSeriesLoading ? (
                      <View style={styles.centerBlock}>
                        <ActivityIndicator
                          size="large"
                          color={colors.solarOrange}
                        />
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Loading seasonal data...
                        </Text>
                      </View>
                    ) : seasonalVictoryData.length === 0 ? (
                      <View style={styles.centerBlock}>
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          No data yet.
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.chartWrapper,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <SeasonalTrendsChart data={seasonalVictoryData} />
                      </View>
                    )}
                  </View>
                )}

                {activeTab === 'forecast' && (
                  <View
                    style={[
                      styles.tabCard,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[styles.tabTitle, { color: colors.text }]}
                    >
                      Full Year Forecast (12 Months Ahead)
                    </Text>
                    {fullYearLoading ? (
                      <View style={styles.centerBlock}>
                        <ActivityIndicator
                          size="large"
                          color={colors.solarOrange}
                        />
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Loading full year forecast...
                        </Text>
                      </View>
                    ) : !fullYearForecast ? (
                      <View style={styles.centerBlock}>
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          No forecast available.
                        </Text>
                      </View>
                    ) : (
                      <>
                        {fullYearVictoryData.length > 0 && (
                          <View
                            style={[
                              styles.chartWrapper,
                              { backgroundColor: colors.background },
                            ]}
                          >
                            <FullYearForecastChartMobile
                              data={fullYearVictoryData}
                            />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.infoTextSmall,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Forecasted monthly energy generation for the next 12
                          months based on seasonal weather and your historical
                          data.
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'importance' && (
                  <View
                    style={[
                      styles.tabCard,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[styles.tabTitle, { color: colors.text }]}
                    >
                      Feature Importance
                    </Text>
                    <Text
                      style={[
                        styles.tabDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Key drivers of predictions.
                    </Text>
                    {importanceLoading ? (
                      <View style={styles.centerBlock}>
                        <ActivityIndicator
                          size="large"
                          color={colors.solarOrange}
                        />
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Loading feature importance...
                        </Text>
                      </View>
                    ) : !featureItems || featureItems.length === 0 ? (
                      <View style={styles.centerBlock}>
                        <Text
                          style={[
                            styles.infoText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          No feature importance data available.
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.featuresCard,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <View style={styles.featuresHeaderRow}>
                          <Sparkles
                            size={18}
                            color={colors.solarOrange}
                          />
                          <Text
                            style={[
                              styles.featuresTitle,
                              { color: colors.text },
                            ]}
                          >
                            Top Features
                          </Text>
                        </View>
                        {featureItems.map((f) => {
                          const percentage = Math.min(
                            100,
                            Math.max(0, f.importance * 100)
                          );
                          return (
                            <View
                              key={f.name}
                              style={styles.importanceRow}
                            >
                              <Text
                                style={[
                                  styles.featureKey,
                                  { color: colors.text },
                                ]}
                              >
                                {f.name}
                              </Text>
                              <View style={styles.importanceBarTrack}>
                                <View
                                  style={[
                                    styles.importanceBarFill,
                                    {
                                      width: `${percentage}%` as `${number}%`,
                                      backgroundColor: colors.solarOrange,
                                    },
                                  ]}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.importanceValue,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {percentage.toFixed(1)}%
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  siteSelectorContainer: {
    marginBottom: 16,
  },
  siteSelectorLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  siteChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  siteChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  siteChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  infoCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  infoTextSmall: {
    fontSize: 12,
    marginTop: 8,
  },
  tabContentContainer: {
    marginTop: 16,
    gap: 16,
  },
  tabCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  tabDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  boxItem: {
    flexBasis: '48%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  boxTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 8,
    marginBottom: 4,
  },
  boxSubtitle: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalSection: {
    marginTop: 8,
    gap: 12,
  },
  infoRow: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoRowTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexBasis: '48%',
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValueBig: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  featuresCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  featuresHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureItem: {
    width: '47%',
  },
  featureKey: {
    fontSize: 11,
  },
  featureValue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  chartWrapper: {
    borderRadius: 12,
    padding: 8,
    marginTop: 4,
  },
  seasonalListCard: {
    borderRadius: 12,
    paddingVertical: 8,
  },
  seasonalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  seasonalMonth: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 0.4,
  },
  seasonalValue: {
    fontSize: 11,
    flex: 0.3,
    textAlign: 'right',
  },
  importanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  importanceBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.3)',
    overflow: 'hidden',
  },
  importanceBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  importanceValue: {
    fontSize: 11,
    width: 52,
    textAlign: 'right',
  },
});

