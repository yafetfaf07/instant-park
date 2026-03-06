from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
from datetime import datetime, timedelta

model = joblib.load('parking_ai_model.joblib')
lot_mapping = joblib.load('lot_mapping.joblib')

# Reverse mapping: get code from UUID
reverse_mapping = {v: k for k, v in lot_mapping.items()}

app = FastAPI(title="Park-Request AI Prediction Engine")

class PredictionRequest(BaseModel):
    parking_avenue_id: str
    eta_minutes: int

@app.post("/predict")
async def predict_availability(req: PredictionRequest):
    if req.parking_avenue_id not in reverse_mapping:
        raise HTTPException(status_code=404, detail="Parking Avenue not recognized by AI")
    
    lot_code = reverse_mapping[req.parking_avenue_id]
    
    target_time = datetime.now() + timedelta(minutes=req.eta_minutes)
    hour = target_time.hour
    day_of_week = target_time.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0
    
    input_data = [[lot_code, hour, day_of_week, is_weekend]]
    
    predicted_occupancy_rate = model.predict(input_data)[0]
    
    confidence = max(0.50, 0.98 - (req.eta_minutes * 0.005))
    
    return {
        "parking_avenue_id": req.parking_avenue_id,
        "target_time": target_time.isoformat(),
        "predicted_occupancy_rate": round(predicted_occupancy_rate, 4),
        "confidence_score": round(confidence, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)