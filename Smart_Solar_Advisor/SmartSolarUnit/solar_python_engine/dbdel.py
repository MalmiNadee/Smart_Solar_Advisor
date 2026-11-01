import firebase_admin
from firebase_admin import credentials, db

cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': "https://project11-50079-default-rtdb.firebaseio.com/"
})

db.reference('/').delete()

print("Entire Realtime Database has been wiped.")