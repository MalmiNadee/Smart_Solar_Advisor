import admin from 'firebase-admin';

class UserModel {
  get firestore() {
    return admin.firestore();
  }

  get usersCollection() {
    return this.firestore.collection('users');
  }

  async getById(userId) {
    const doc = await this.usersCollection.doc(userId).get();
    
    if (!doc.exists) return null;
    
    return { id: doc.id, ...doc.data() };
  }

  async getByEmail(email) {
    const snapshot = await this.usersCollection
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async getAll() {
    const snapshot = await this.usersCollection.get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getAdmins() {
    const snapshot = await this.usersCollection
      .where('role', '==', 'admin')
      .get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async create(userId, userData) {
    await this.usersCollection.doc(userId).set(userData);
    return { id: userId, ...userData };
  }

  async update(userId, userData) {
    await this.usersCollection.doc(userId).update(userData);
    return this.getById(userId);
  }

  async delete(userId) {
    await this.usersCollection.doc(userId).delete();
    return { id: userId, deleted: true };
  }
}

export default new UserModel();
