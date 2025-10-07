# app.py
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
import io


app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port and React default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
arte = joblib.load("exoplanet_xgb.joblib")  # contains model + features
model = arte["model"]
FEATURES = arte["features"]

@app.get("/")
def root():
    return {
        "message": "Exoplanet Prediction API",
        "endpoints": {
            "/predict": "POST - Predict probability of a planet",
            "/predict-csv": "POST - Predict from CSV file upload",
            "/features": "GET - Get list of required features",
            "/docs": "GET - Interactive API documentation"
        },
        "usage": "Send POST request to /predict with either 'features' dict or 'kepid' int"
    }

@app.get("/features")
def get_features():
    return {
        "features": FEATURES,
        "count": len(FEATURES),
        "description": "List of all features required for prediction"
    }

class PredictRequest(BaseModel):
    # either provide `features` dict or `kepid` (int) to lookup in server CSV
    features: dict = None
    kepid: int = None

@app.get("/predict")
def predict_info():
    return {
        "error": "Method Not Allowed",
        "message": "This endpoint requires a POST request",
        "usage": {
            "method": "POST",
            "content_type": "application/json",
            "examples": [
                {"kepid": 10854555},
                {"features": {"koi_period": 3.5, "koi_depth": 100, "...": "..."}}
            ]
        },
        "documentation": "Visit /docs for interactive API documentation"
    }

@app.post("/predict")
def predict(req: PredictRequest):
    if req.features is None and req.kepid is None:
        raise HTTPException(status_code=400, detail="Provide features or kepid")

    if req.kepid is not None:
        df = pd.read_csv("cumulative.csv")
        row = df[df['kepid'] == req.kepid]
        if row.empty:
            raise HTTPException(status_code=404, detail="kepid not found")
        x = row[FEATURES].fillna(df[FEATURES].median()).iloc[0].to_numpy().reshape(1, -1)
    else:
        # build row from provided features
        missing = [f for f in FEATURES if f not in req.features]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing features: {missing[:10]} (total {len(missing)})")
        x = np.array([req.features[f] for f in FEATURES], dtype=float).reshape(1, -1)

    dmat = xgb.DMatrix(x, feature_names=FEATURES)
    prob = model.predict(dmat)[0].item()
    return {"probability_of_planet": float(prob)}

@app.post("/predict-csv")
async def predict_csv(file: UploadFile = File(...)):
    """
    Upload a CSV file with feature columns and get predictions for all rows.
    Returns a CSV file with an additional 'probability_of_planet' column.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read the uploaded CSV file
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Check if required features are present
        missing_features = [f for f in FEATURES if f not in df.columns]
        if missing_features:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_features[:10]} (total {len(missing_features)})"
            )
        
        # Extract features and handle missing values
        X = df[FEATURES].fillna(df[FEATURES].median())
        
        # Make predictions
        dmat = xgb.DMatrix(X.values, feature_names=FEATURES)
        predictions = model.predict(dmat)
        
        # Add predictions to dataframe
        df['probability_of_planet'] = predictions
        df['prediction'] = (predictions > 0.5).astype(int)
        df['verdict'] = df['prediction'].apply(lambda x: 'PLANET' if x == 1 else 'NOT_PLANET')
        
        # Convert to CSV
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        # Return as downloadable CSV
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=predictions_{file.filename}"
            }
        )
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

