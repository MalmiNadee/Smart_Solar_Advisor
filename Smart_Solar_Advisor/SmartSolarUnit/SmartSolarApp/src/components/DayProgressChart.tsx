import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CheckCircle2, Clock } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface DayProgressChartProps {
  startDate: Date;
  endDate: Date;
  completedDays: number;
  remainingDays: number;
  totalDays: number;
}

export const DayProgressChart: React.FC<DayProgressChartProps> = ({
  startDate,
  endDate,
  completedDays,
  remainingDays,
  totalDays,
}) => {
  const { colors } = useTheme();

  // Calculate box width for 15 boxes per row - increased size for better date visibility
  const boxWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const containerPadding = 32; // Container padding (16 * 2)
    const sectionPadding = 40; // Section padding (20 * 2)
    const gap = 6;
    const availableWidth = screenWidth - containerPadding - sectionPadding;
    // Increase box size by reducing number of boxes per row or increasing size
    // Keep 15 per row but make boxes slightly larger
    const calculatedWidth = (availableWidth - (gap * 14)) / 15;
    // Ensure minimum size for readability
    return Math.max(calculatedWidth, 50); // Minimum 50px width
  }, []);

  // Format date helper
  const formatDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Generate array of all 30 days
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);
    const isCompleted = dayDate < today;
    const isToday = dayDate.getTime() === today.getTime();
    
    return {
      day: i + 1,
      date: dayDate,
      isCompleted,
      isToday,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Day-by-Day Progress</Text>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning, borderColor: colors.warning, borderWidth: 2, opacity: 0.3 }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Remaining</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.solarOrange, borderColor: colors.solarOrange, borderWidth: 2 }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Today</Text>
        </View>
      </View>

      {/* Day Grid - 2 rows of 15 boxes */}
      <View style={styles.grid}>
        {days.map((day) => (
          <View
            key={day.day}
            style={[
              styles.dayBox,
              { width: boxWidth, height: boxWidth },
              day.isCompleted
                ? { backgroundColor: colors.success }
                : day.isToday
                ? { backgroundColor: colors.solarOrange, borderColor: colors.solarOrange, borderWidth: 2 }
                : { backgroundColor: colors.warning + '30', borderColor: colors.warning + '80', borderWidth: 1 },
            ]}
          >
            {day.isCompleted ? (
              <>
                <CheckCircle2 size={14} color={colors.white || '#fff'} />
                <Text style={[styles.dayText, { color: colors.white || '#fff' }]}>
                  {formatDate(day.date)}
                </Text>
              </>
            ) : day.isToday ? (
              <>
                <Clock size={14} color={colors.white || '#fff'} />
                <Text style={[styles.dayText, { color: colors.white || '#fff' }]}>
                  {formatDate(day.date)}
                </Text>
              </>
            ) : (
              <Text style={[styles.dayText, { color: colors.text }]}>
                {formatDate(day.date)}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={[styles.summary, { borderTopColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <CheckCircle2 size={16} color={colors.success} />
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {completedDays} days completed
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Clock size={16} color={colors.warning} />
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {remainingDays} days remaining
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 4,
  },
  dayBox: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 12,
  },
});

