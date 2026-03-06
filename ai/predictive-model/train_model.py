import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib
import psycopg2


# # --------- Loading real data -----------
# conn_params = {
#     "dbname": "parking",
#     "user": "postgres",
#     "password": "postgres",
#     "host": "localhost"
# }

# query = """
# SELECT 
#     "timestamp", 
#     "parkingAvenueId", 
#     "hour",
#     "dayOfWeek",
#     "isWeekend",
#     "totalSpots", 
#     "currentSpots", 
#     "occupancyRate" 
# FROM "OccupancyLog"
# """

# try:
#     with psycopg2.connect(**conn_params) as conn:
#         df = pd.read_sql_query(query, conn)
#     df.to_csv('parking_real_data.csv', index=False)
#     print("Data exported to CSV and loaded into 'df' successfully!")
#     print(df.head()) 

# except Exception as e:
#     print(f"Error: {e}")
# # ---------------------------------------


# --------- Loading mock data -----------
print("Loading mock data...")
df = pd.read_csv("parking_mock_data.csv")
# ---------------------------------------


# Convert parking_avenue_id to numbers (Categorical Encoding)
df['lot_code'] = df['parkingAvenueId'].astype('category').cat.codes

features = ['lot_code', 'hour', 'dayOfWeek', 'isWeekend']
target = 'occupancyRate'

X = df[features]
y = df[target]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training Random Forest model...")
model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train)

predictions = model.predict(X_test)
error = mean_absolute_error(y_test, predictions)
print(f"Model Trained! Average prediction error: {error:.2%} occupancy")

joblib.dump(model, 'parking_ai_model.joblib')

lot_mapping = dict(enumerate(df['parkingAvenueId'].astype('category').cat.categories))
joblib.dump(lot_mapping, 'lot_mapping.joblib')
print("Model saved to disk.")