var admin = require("firebase-admin");

var serviceAccount = require("firebase-adminsdk-fbsvc@smart-cabin-safety-system.iam.gserviceaccount.com");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smart-cabin-safety-system-default-rtdb.firebaseio.com"
});
