import admin from 'firebase-admin';

class SensorModel {
  get db() {
    return admin.database();
  }

  get devicesRef() {
    return this.db.ref('devices');
  }

  // Convert ISO timestamp to Firebase-safe key format
  // 2025-10-25T18:37:36+0500 -> 2025-10-25T18-37-36+0500
  encodeTimestamp(isoTimestamp) {
    return isoTimestamp.replace(/\.\d{3}/, '').replace(/:/g, '-');
  }

  // Convert Firebase key back to ISO format
  // 2025-10-25T18-37-36+0500 -> 2025-10-25T18:37:36+0500
  decodeTimestamp(firebaseKey) {
    // Replace dashes in time portion (after T) with colons
    // Pattern: T followed by HH-MM-SS should become T followed by HH:MM:SS
    return firebaseKey.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
  }

  async getDeviceData(deviceId) {
    const snapshot = await this.devicesRef.child(deviceId).once('value');
    return snapshot.val();
  }

  async getLatestReading(deviceId) {
    const snapshot = await this.devicesRef
      .child(deviceId)
      .orderByKey()
      .limitToLast(1)
      .once('value');
    
    const data = snapshot.val();
    
    if (!data) return null;
    
    const timestampKey = Object.keys(data)[0];
    const reading = data[timestampKey];
    return {
      timestamp: reading.timestamp || this.decodeTimestamp(timestampKey), // Use timestamp from data or decode key
      ...reading
    };
  }

  async getReadingsInRange(deviceId, startTime, endTime) {
    // Convert ISO timestamps to Firebase-safe format if needed
    const startKey = startTime.includes(':') ? this.encodeTimestamp(startTime) : startTime;
    const endKey = endTime.includes(':') ? this.encodeTimestamp(endTime) : endTime;
    
    const snapshot = await this.devicesRef
      .child(deviceId)
      .orderByKey()
      .startAt(startKey)
      .endAt(endKey)
      .once('value');
    
    const data = snapshot.val();
    
    if (!data) return [];
    
    return Object.entries(data).map(([timestampKey, reading]) => ({
      timestamp: reading.timestamp || this.decodeTimestamp(timestampKey), // Use timestamp from data or decode key
      ...reading
    }));
  }

  async getRecentReadings(deviceId, limit = 50) {
    const snapshot = await this.devicesRef
      .child(deviceId)
      .orderByKey()
      .limitToLast(limit)
      .once('value');
    
    const data = snapshot.val();
    
    if (!data) return [];
    
    return Object.entries(data).map(([timestampKey, reading]) => ({
      timestamp: reading.timestamp || this.decodeTimestamp(timestampKey), // Use timestamp from data or decode key
      ...reading
    }));
  }

  subscribeToDevice(deviceId, callback) {
    const deviceRef = this.devicesRef.child(deviceId);
    
    deviceRef.on('child_added', (snapshot) => {
      callback({
        timestamp: snapshot.key,
        ...snapshot.val()
      });
    });

    return () => deviceRef.off('child_added');
  }
}

export default new SensorModel();
