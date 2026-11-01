import admin from 'firebase-admin';

class SiteModel {
  get firestore() {
    return admin.firestore();
  }

  get sitesCollection() {
    return this.firestore.collection('solar_sites');
  }

  async getAll() {
    const snapshot = await this.sitesCollection.get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getById(siteId) {
    const doc = await this.sitesCollection.doc(siteId).get();
    
    if (!doc.exists) return null;
    
    return { id: doc.id, ...doc.data() };
  }

  async getByCustomer(customerName) {
    const snapshot = await this.sitesCollection
      .where('customer_name', '==', customerName)
      .get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getByStatus(status) {
    const snapshot = await this.sitesCollection
      .where('status', '==', status)
      .get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async create(siteId, siteData) {
    const newSite = {
      ...siteData,
      created_at: new Date().toISOString().split('T')[0]
    };
    
    await this.sitesCollection.doc(siteId).set(newSite);
    return { id: siteId, ...newSite };
  }

  async update(siteId, siteData) {
    await this.sitesCollection.doc(siteId).update(siteData);
    return this.getById(siteId);
  }

  async delete(siteId) {
    await this.sitesCollection.doc(siteId).delete();
    return { id: siteId, deleted: true };
  }
}

export default new SiteModel();
