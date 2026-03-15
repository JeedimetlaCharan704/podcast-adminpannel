// Firebase Configuration
let auth;
let db;
let googleProvider;
const ALLOWED_DOMAIN = "aurora.edu.in";

try {
  const firebaseConfig = {
    apiKey: "AIzaSyBjWiZR4jwf7IYKR7y2xir1CUmTI0vzm8Y",
    authDomain: "college-podcast.firebaseapp.com",
    databaseURL: "https://college-podcast-default-rtdb.firebaseio.com",
    projectId: "college-podcast",
    storageBucket: "college-podcast.firebasestorage.app",
    messagingSenderId: "988666865867",
    appId: "1:988666865867:web:dedc4ace9107437ce9134e",
    measurementId: "G-22P0S6BLHJ"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  // Auth instance
  auth = firebase.auth();

  // Realtime Database instance
  db = firebase.database();

  // Google provider with additional scopes
  googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  console.log('Firebase initialized successfully');
} catch(e) {
  console.log('Firebase init error:', e);
}

// Helper: Check if email domain is allowed
function isAllowedDomain(email) {
  if (!email) return false;
  const domain = email.split("@")[1];
  return domain === ALLOWED_DOMAIN;
}

// ============================================
// Firebase Data Service (Realtime Database)
// ============================================
const FirebaseService = {
  // Fetch all data from Realtime Database
  fetchAllData: async function() {
    try {
      const data = {
        episodes: [],
        events: [],
        notifications: []
      };

      // Fetch episodes
      const episodesSnap = await db.ref('episodes').once('value');
      const episodesVal = episodesSnap.val();
      if (episodesVal) {
        data.episodes = Object.keys(episodesVal).map(key => ({ id: key, ...episodesVal[key] }));
        data.episodes.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      // Fetch events
      const eventsSnap = await db.ref('events').once('value');
      const eventsVal = eventsSnap.val();
      if (eventsVal) {
        data.events = Object.keys(eventsVal).map(key => ({ id: key, ...eventsVal[key] }));
        data.events.sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      // Fetch notifications
      const notifSnap = await db.ref('notifications').once('value');
      const notifVal = notifSnap.val();
      if (notifVal) {
        data.notifications = Object.keys(notifVal).map(key => ({ id: key, ...notifVal[key] }));
      }

      // Cache locally
      localStorage.setItem('aurora_firebase_data', JSON.stringify(data));
      localStorage.setItem('aurora_data_timestamp', Date.now().toString());

      return data;
    } catch(e) {
      console.log('Firebase fetch error, using cache:', e);
      const cached = localStorage.getItem('aurora_firebase_data');
      return cached ? JSON.parse(cached) : { episodes: [], events: [], notifications: [] };
    }
  },

  // Get episodes
  getEpisodes: async function() {
    const data = await this.fetchAllData();
    return data.episodes;
  },

  // Get events
  getEvents: async function() {
    const data = await this.fetchAllData();
    return data.events;
  },

  // Get notifications
  getNotifications: async function() {
    const data = await this.fetchAllData();
    return data.notifications;
  },

  // Add episode (admin)
  addEpisode: async function(episode) {
    try {
      await db.ref('episodes').push({
        ...episode,
        createdAt: Date.now()
      });
      return true;
    } catch(e) {
      console.log('Error adding episode:', e);
      return false;
    }
  },

  // Add event (admin)
  addEvent: async function(event) {
    try {
      await db.ref('events').push({
        ...event,
        createdAt: Date.now()
      });
      return true;
    } catch(e) {
      console.log('Error adding event:', e);
      return false;
    }
  },

  // Add notification (admin)
  addNotification: async function(notification) {
    try {
      await db.ref('notifications').push({
        ...notification,
        read: false,
        createdAt: Date.now()
      });
      return true;
    } catch(e) {
      console.log('Error adding notification:', e);
      return false;
    }
  },

  // Delete document
  deleteDocument: async function(collection, id) {
    try {
      await db.ref(collection).child(id).remove();
      return true;
    } catch(e) {
      console.log('Error deleting:', e);
      return false;
    }
  },

  // Check if data needs refresh (5 min cache)
  needsRefresh: function() {
    const timestamp = localStorage.getItem('aurora_data_timestamp');
    if (!timestamp) return true;
    return Date.now() - parseInt(timestamp) > 5 * 60 * 1000;
  }
};
