const admin = require('firebase-admin');
const express = require('express');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('🚀 Server starting...');

db.collection('users').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'modified') {
      const userData = change.doc.data();
      const activity = userData.latestActivity;

      if (activity && activity.timestamp && userData.fcmTokens && userData.fcmTokens.length > 0) {
        if ((userData.mutedUsers || []).includes(activity.fromUid)) return;
        if ((userData.blockedUsers || []).includes(activity.fromUid)) return;

        const message = {
          tokens: userData.fcmTokens,
          notification: {
            title: activity.name || 'TRACE',
            body: activity.message || 'رسالة جديدة'
          },
          data: {
            fromUid: activity.fromUid || '',
            photo: activity.photo || '',
            name: activity.name || ''
          }
        };

        admin.messaging().sendEachForMulticast(message)
          .then(r => console.log(`📤 Sent: ${r.successCount} ok, ${r.failureCount} failed`))
          .catch(e => console.error('❌ Send error:', e));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server on port ${PORT}`));