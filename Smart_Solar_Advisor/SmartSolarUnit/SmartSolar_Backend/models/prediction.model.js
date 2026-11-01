import admin from 'firebase-admin';

class PredictionModel {
  get db() {
    return admin.database();
  }

  get predictionsRef() {
    return this.db.ref('predicted_units');
  }

  async getPredictions(customerName, siteId) {
    const snapshot = await this.predictionsRef
      .child(customerName)
      .child(siteId)
      .once('value');

    const data = snapshot.val();

    if (!data) return [];

    return Object.entries(data).map(([timestamp, prediction]) => ({
      timestamp,
      ...prediction
    }));
  }

  async getLatestPrediction(customerName, siteId) {
    const snapshot = await this.predictionsRef
      .child(customerName)
      .child(siteId)
      .orderByKey()
      .limitToLast(1)
      .once('value');

    const data = snapshot.val();

    if (!data) return null;

    const timestamp = Object.keys(data)[0];
    return {
      timestamp,
      ...data[timestamp]
    };
  }

  async getPredictionsInRange(customerName, siteId, startDate, endDate) {
    const snapshot = await this.predictionsRef
      .child(customerName)
      .child(siteId)
      .orderByKey()
      .startAt(startDate)
      .endAt(endDate)
      .once('value');

    const data = snapshot.val();

    if (!data) return [];

    return Object.entries(data).map(([timestamp, prediction]) => ({
      timestamp,
      ...prediction
    }));
  }

  async getDailyTotal(customerName, siteId, date) {
    // Date format: YYYYMMDD
    // Timestamp format: YYYYMMDD_HHMMSS
    const dayStart = date + '_000000';
    const dayEnd = date + '_235959';

    const predictions = await this.getPredictionsInRange(
      customerName,
      siteId,
      dayStart,
      dayEnd
    );

    const totalKwh = predictions.reduce(
      (sum, pred) => sum + (pred.predicted_kwh_5min || 0),
      0
    );

    return {
      date,
      totalKwh,
      readingsCount: predictions.length
    };
  }

  async getMonthlyTotal(customerName, siteId, yearMonth) {
    // yearMonth format: YYYYMM
    // Timestamp format: YYYYMMDD_HHMMSS
    const monthStart = yearMonth + '01_000000';
    const monthEnd = yearMonth + '31_235959';

    const predictions = await this.getPredictionsInRange(
      customerName,
      siteId,
      monthStart,
      monthEnd
    );

    const totalKwh = predictions.reduce(
      (sum, pred) => sum + (pred.predicted_kwh_5min || 0),
      0
    );

    return {
      yearMonth,
      totalKwh,
      readingsCount: predictions.length
    };
  }

  async getLast30DaysTotal(customerName, siteId) {
    // Calculate last 30 days (rolling period, not calendar month)
    const latestPrediction = await this.getLatestPrediction(customerName, siteId);
    let now = new Date();
    if (latestPrediction && latestPrediction.timestamp && latestPrediction.timestamp.length >= 15) {
      const ts = latestPrediction.timestamp;
      now = new Date(ts.substring(0, 4) + '-' + ts.substring(4, 6) + '-' + ts.substring(6, 8) + 'T' + ts.substring(9, 11) + ':' + ts.substring(11, 13) + ':' + ts.substring(13, 15));
    }
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 29); // 30 days including today
    startDate.setHours(0, 0, 0, 0);

    // Format dates as YYYYMMDD_HHMMSS
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    };

    const startTime = formatDate(startDate);
    const endTime = formatDate(endDate);

    const predictions = await this.getPredictionsInRange(
      customerName,
      siteId,
      startTime,
      endTime
    );

    const totalKwh = predictions.reduce(
      (sum, pred) => sum + (pred.predicted_kwh_5min || 0),
      0
    );

    return {
      yearMonth: null, // Not applicable for rolling 30 days
      totalKwh,
      readingsCount: predictions.length
    };
  }

  /**
   * Get daily totals for the last N days (for time-series / Prophet).
   * Returns array of { date (YYYY-MM-DD), dateStr (YYYYMMDD), totalKwh, readingsCount }.
   */
  async getDailyTotalsForRange(customerName, siteId, days = 90) {
    const latestPrediction = await this.getLatestPrediction(customerName, siteId);
    let now = new Date();
    if (latestPrediction && latestPrediction.timestamp && latestPrediction.timestamp.length >= 15) {
      const ts = latestPrediction.timestamp;
      now = new Date(ts.substring(0, 4) + '-' + ts.substring(4, 6) + '-' + ts.substring(6, 8) + 'T' + ts.substring(9, 11) + ':' + ts.substring(11, 13) + ':' + ts.substring(13, 15));
    }
    const results = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}${m}${day}`;
      const dateLabel = `${y}-${m}-${day}`;
      const total = await this.getDailyTotal(customerName, siteId, dateStr);
      results.push({
        date: dateLabel,
        dateStr,
        totalKwh: total.totalKwh,
        readingsCount: total.readingsCount,
      });
    }
    return results.reverse();
  }

  /**
   * Get monthly totals for the last 12 months (for seasonal trends dashboard).
   * Returns array of { yearMonth (YYYYMM), yearMonthLabel (e.g. '2024-01'), totalKwh, readingsCount }.
   */
  async getLast12MonthsBreakdown(customerName, siteId) {
    const latestPrediction = await this.getLatestPrediction(customerName, siteId);
    let now = new Date();
    if (latestPrediction && latestPrediction.timestamp && latestPrediction.timestamp.length >= 15) {
      const ts = latestPrediction.timestamp;
      now = new Date(ts.substring(0, 4) + '-' + ts.substring(4, 6) + '-' + ts.substring(6, 8) + 'T' + ts.substring(9, 11) + ':' + ts.substring(11, 13) + ':' + ts.substring(13, 15));
    }
    const results = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const yearMonth = `${year}${String(month).padStart(2, '0')}`;
      const yearMonthLabel = `${year}-${String(month).padStart(2, '0')}`;
      const total = await this.getMonthlyTotal(customerName, siteId, yearMonth);
      results.push({
        yearMonth,
        yearMonthLabel,
        month: month,
        year,
        totalKwh: total.totalKwh,
        readingsCount: total.readingsCount
      });
    }
    return results.reverse();
  }

  subscribeToPredictions(customerName, siteId, callback) {
    const predRef = this.predictionsRef.child(customerName).child(siteId);

    predRef.on('child_added', (snapshot) => {
      callback({
        timestamp: snapshot.key,
        ...snapshot.val()
      });
    });

    return () => predRef.off('child_added');
  }
}

export default new PredictionModel();
