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
import { Sparkles, AlertCircle, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSolarSites } from '../hooks/useBackendAPI';
import { explainabilityAPI } from '../services/api';
import { useSidebar } from '../contexts/SidebarContext';
import HamburgerIcon from '../components/HamburgerIcon';
import { useTheme } from '../contexts/ThemeContext';

const logoImage = require('../assets/Logo.png');

export default function XAIInsightsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { openSidebar, closeSidebar, isOpen } = useSidebar();
  const { sites, loading: sitesLoading } = useSolarSites(10000);

  const runningSites = useMemo(
    () => sites.filter((s) => s.status === 'running'),
    [sites]
  );

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<{
    summaryText: string;
    daysAnalyzed: number;
    lowDaysCount: number;
    lowPredictionDays: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSite = useMemo(
    () =>
      sites.find((s) => s.id === selectedSiteId) ||
      runningSites[0] ||
      sites[0] ||
      null,
    [sites, selectedSiteId, runningSites]
  );

  React.useEffect(() => {
    if (!selectedSiteId && selectedSite) {
      setSelectedSiteId(selectedSite.id);
    }
  }, [selectedSite, selectedSiteId]);

  const customerName = selectedSite?.customerName ?? null;
  const siteId = selectedSite?.id ?? null;

  const handleGenerate = async () => {
    if (!customerName || !siteId) return;
    setLoadingSummary(true);
    setError(null);
    try {
      const res = await explainabilityAPI.getGlobalXaiSummary(
        customerName,
        siteId
      );
      setSummary({
        summaryText: res.summaryText,
        daysAnalyzed: res.daysAnalyzed,
        lowDaysCount: res.lowDaysCount,
        lowPredictionDays: res.lowPredictionDays || [],
      });
    } catch (e: any) {
      setError(e.message || 'Failed to generate XAI summary');
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

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
            Explainable AI Summary
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={[styles.introTitle, { color: colors.text }]}>
            Global Explainable AI (XAI) Result
          </Text>
          <Text
            style={[styles.introText, { color: colors.textSecondary }]}
          >
            Generate a text explanation using all collected energy predictions –
            understand why some days had minimal generation (irradiance, rain,
            heat, dust, and more).
          </Text>
        </View>

        {renderSiteSelector()}

        {!selectedSite && !sitesLoading && (
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <AlertCircle size={20} color={colors.gray} />
            <Text
              style={[styles.infoText, { color: colors.textSecondary }]}
            >
              No site selected. Add a site to view XAI insights.
            </Text>
          </View>
        )}

        {selectedSite && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Sparkles size={22} color={colors.solarOrange} />
                <View>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.text },
                    ]}
                  >
                    Global Explainable AI (XAI) Result
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Uses all collected prediction data (since site creation) to
                    explain why some days had low energy generation.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  {
                    backgroundColor: customerName && siteId
                      ? colors.solarOrange
                      : colors.border,
                  },
                ]}
                onPress={handleGenerate}
                disabled={loadingSummary || !customerName || !siteId}
              >
                {loadingSummary ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.generateButtonText,
                      { color: colors.white },
                    ]}
                  >
                    Generate XAI Result
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {error && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: 'rgba(248,113,113,0.12)' },
                ]}
              >
                <Text
                  style={[
                    styles.errorText,
                    { color: colors.danger },
                  ]}
                >
                  {error}
                </Text>
              </View>
            )}

            {loadingSummary && !summary && !error && (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="large" color={colors.solarOrange} />
                <Text
                  style={[
                    styles.infoText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Generating explainable AI summary from Firebase data...
                </Text>
              </View>
            )}

            {!loadingSummary && summary && (
              <View style={styles.summarySection}>
                <Text
                  style={[
                    styles.summaryMeta,
                    { color: colors.textSecondary },
                  ]}
                >
                  Days analyzed: {summary.daysAnalyzed} · Low-generation days:{' '}
                  {summary.lowDaysCount}
                </Text>
                <View
                  style={[
                    styles.summaryTextBox,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryText,
                      { color: colors.text },
                    ]}
                  >
                    {summary.summaryText}
                  </Text>
                </View>

                {summary.lowPredictionDays &&
                  summary.lowPredictionDays.length > 0 && (
                    <View style={styles.lowDaysSection}>
                      <Text
                        style={[
                          styles.lowDaysTitle,
                          { color: colors.text },
                        ]}
                      >
                        Low-generation days (detailed explanation)
                      </Text>
                      {summary.lowPredictionDays.map((day: any) => (
                        <View
                          key={day.date}
                          style={[
                            styles.lowDayCard,
                            { backgroundColor: colors.background },
                          ]}
                        >
                          <View style={styles.lowDayHeader}>
                            <Text
                              style={[
                                styles.lowDayDate,
                                { color: colors.text },
                              ]}
                            >
                              {day.date}
                            </Text>
                            <Text
                              style={[
                                styles.lowDayMeta,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {day.predictedKwh.toFixed(2)} kWh (
                              {day.percentage}% of average)
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.lowDayExplanation,
                              { color: colors.text },
                            ]}
                          >
                            {day.explanationText}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
              </View>
            )}

            {!loadingSummary && !summary && !error && (
              <View style={styles.loadingBlock}>
                <Text
                  style={[
                    styles.infoText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Tap &quot;Generate XAI Result&quot; to produce a natural-language
                  explanation using all collected prediction data.
                </Text>
              </View>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  introSection: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  introText: {
    fontSize: 13,
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
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  generateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  errorBanner: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
  },
  loadingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  summarySection: {
    marginTop: 4,
    gap: 12,
  },
  summaryMeta: {
    fontSize: 12,
  },
  summaryTextBox: {
    borderRadius: 10,
    padding: 10,
  },
  summaryText: {
    fontSize: 13,
  },
  lowDaysSection: {
    marginTop: 8,
    gap: 8,
  },
  lowDaysTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  lowDayCard: {
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  lowDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lowDayDate: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  lowDayMeta: {
    fontSize: 11,
  },
  lowDayExplanation: {
    fontSize: 12,
    marginTop: 2,
  },
});

