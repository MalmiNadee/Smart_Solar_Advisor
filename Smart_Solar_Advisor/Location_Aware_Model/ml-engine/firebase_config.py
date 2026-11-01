# firebase_config.py

import firebase_admin
from firebase_admin import credentials, db

cred = credentials.Certificate("serviceAccountKey.json")

firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://project12-f6813-default-rtdb.firebaseio.com/'
})

ref = db.reference("predicted_units")