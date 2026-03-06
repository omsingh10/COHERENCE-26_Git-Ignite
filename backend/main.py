# main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import datetime
import json
import os

app = FastAPI(title="Indian Budget Intelligence API")

# Allow Flutter app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database path - UPDATE THIS to point to your backend folder
DB_PATH = 'budget_india.db'  # This will look in current directory

# Helper function to convert dataframe to JSON serializable
def df_to_json(df):
    return json.loads(df.to_json(orient='records', date_format='iso'))

@app.get("/")
def root():
    return {
        "name": "Indian Budget Intelligence Platform",
        "version": "1.0",
        "status": "running",
        "database": os.path.exists(DB_PATH),
        "endpoints": [
            "/api/summary",
            "/api/states",
            "/api/districts/{state}",
            "/api/ministries",
            "/api/departments",
            "/api/anomalies/{department}",
            "/api/leakage",
            "/api/reallocate",
            "/api/high-risk"
        ]
    }

# 1. GET OVERALL SUMMARY
@app.get("/api/summary")
def get_summary():
    """Get overall budget summary"""
    conn = sqlite3.connect(DB_PATH)
    
    query = """
    SELECT 
        COUNT(DISTINCT State) as total_states,
        COUNT(DISTINCT District) as total_districts,
        COUNT(DISTINCT Ministry) as total_ministries,
        COUNT(DISTINCT Department) as total_departments,
        SUM(Allocated_Budget_Cr) as total_allocated_cr,
        SUM(Actual_Spending_Cr) as total_spent_cr,
        AVG(Utilization_Percentage) as avg_utilization,
        SUM(CASE WHEN Utilization_Percentage < 50 THEN 1 ELSE 0 END) as critical_underspend,
        SUM(CASE WHEN Utilization_Percentage > 150 THEN 1 ELSE 0 END) as critical_overspend
    FROM budget
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    
    # Calculate waste
    if not df.empty:
        df['total_waste_cr'] = df['total_allocated_cr'] - df['total_spent_cr']
    
    return JSONResponse(content=df_to_json(df)[0] if not df.empty else {})

# 2. GET ALL STATES
@app.get("/api/states")
def get_states():
    """Get list of all states"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT State FROM budget ORDER BY State", conn)
    conn.close()
    return {"states": df['State'].tolist()}

# 3. GET DISTRICTS BY STATE
@app.get("/api/districts/{state}")
def get_districts(state: str):
    """Get districts in a state"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT District FROM budget WHERE State = ? ORDER BY District", 
                     conn, params=[state])
    conn.close()
    return {"state": state, "districts": df['District'].tolist()}

# 4. GET MINISTRIES
@app.get("/api/ministries")
def get_ministries():
    """Get list of ministries"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT Ministry FROM budget ORDER BY Ministry", conn)
    conn.close()
    return {"ministries": df['Ministry'].tolist()}

# 5. GET DEPARTMENTS
@app.get("/api/departments")
def get_departments():
    """Get list of departments"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT Department FROM budget ORDER BY Department", conn)
    conn.close()
    return {"departments": df['Department'].tolist()}

# 6. DEPARTMENT WISE SUMMARY
@app.get("/api/department/{dept}")
def department_summary(dept: str):
    """Get summary for specific department"""
    conn = sqlite3.connect(DB_PATH)
    
    query = """
    SELECT 
        State,
        District,
        SUM(Allocated_Budget_Cr) as total_allocated,
        SUM(Actual_Spending_Cr) as total_spent,
        AVG(Utilization_Percentage) as avg_utilization,
        SUM(Remaining_Budget_Cr) as total_remaining,
        AVG(Delay_Days) as avg_delay,
        COUNT(CASE WHEN Anomaly_Tag != 'Normal' THEN 1 END) as anomaly_count
    FROM budget
    WHERE Department = ?
    GROUP BY State, District
    ORDER BY avg_utilization ASC
    """
    
    df = pd.read_sql(query, conn, params=[dept])
    conn.close()
    
    return JSONResponse(content=df_to_json(df))

# 7. ANOMALY DETECTION (ML-BASED)
@app.get("/api/anomalies/{department}")
def detect_anomalies(department: str):
    """Detect anomalies using ML"""
    conn = sqlite3.connect(DB_PATH)
    
    query = "SELECT * FROM budget WHERE Department = ?"
    df = pd.read_sql(query, conn, params=[department])
    conn.close()
    
    if len(df) < 10:
        return {
            "department": department,
            "total_records": len(df),
            "ml_anomalies_found": 0,
            "tagged_anomalies": 0,
            "anomalies": [],
            "message": "Not enough data for ML detection"
        }
    
    # Use Isolation Forest for anomaly detection
    model = IsolationForest(contamination=0.1, random_state=42)
    
    # Features for anomaly detection
    features = df[['Utilization_Percentage', 'Delay_Days']].fillna(0)
    df['ml_anomaly'] = model.fit_predict(features)
    
    # Get ML-detected anomalies (-1 means anomaly)
    ml_anomalies = df[df['ml_anomaly'] == -1].to_dict('records')
    
    # Also include records with Anomaly_Tag from original data (case-insensitive)
    df['Anomaly_Tag'] = df['Anomaly_Tag'].fillna('Normal')
    tagged_anomalies = df[df['Anomaly_Tag'].str.upper() != 'NORMAL'].to_dict('records')
    
    # Combine (limit to 20 for response size)
    all_anomalies = (ml_anomalies + tagged_anomalies)[:20]
    
    # Convert any non-serializable types
    for a in all_anomalies:
        for key, value in a.items():
            if isinstance(value, (np.integer, np.floating)):
                a[key] = float(value)
            elif isinstance(value, np.bool_):
                a[key] = bool(value)
    
    return {
        "department": department,
        "total_records": len(df),
        "ml_anomalies_found": len(ml_anomalies),
        "tagged_anomalies": len(tagged_anomalies),
        "anomalies": all_anomalies
    }

# 8. LEAKAGE DETECTION (UNDERUTILIZATION)
@app.get("/api/leakage")
def detect_leakage(min_utilization: float = 50):
    """Find potential leakages (underutilization)"""
    conn = sqlite3.connect(DB_PATH)
    
    query = """
    SELECT 
        State,
        District,
        Ministry,
        Department,
        Scheme_Name,
        SUM(Allocated_Budget_Cr) as total_allocated,
        SUM(Actual_Spending_Cr) as total_spent,
        AVG(Utilization_Percentage) as avg_utilization,
        SUM(Remaining_Budget_Cr) as unspent_amount,
        AVG(Delay_Days) as avg_delay,
        COUNT(*) as record_count
    FROM budget
    GROUP BY State, District, Ministry, Department, Scheme_Name
    HAVING avg_utilization < ?
    ORDER BY unspent_amount DESC
    LIMIT 50
    """
    
    df = pd.read_sql(query, conn, params=[min_utilization])
    conn.close()
    
    # Convert numpy types
    result = df.to_dict('records')
    for r in result:
        for key, value in r.items():
            if isinstance(value, (np.integer, np.floating)):
                r[key] = float(value)
    
    return JSONResponse(content=result)

# 9. REALLOCATION SUGGESTIONS
@app.get("/api/reallocate")
def suggest_reallocation():
    """Suggest reallocating funds from underutilized to overutilized areas"""
    conn = sqlite3.connect(DB_PATH)
    
    # Find underutilized (Utilization < 40%)
    under = pd.read_sql("""
        SELECT 
            State,
            District,
            Department,
            Scheme_Name,
            SUM(Allocated_Budget_Cr) as allocated,
            AVG(Utilization_Percentage) as utilization,
            SUM(Remaining_Budget_Cr) as surplus
        FROM budget
        GROUP BY State, District, Department, Scheme_Name
        HAVING utilization < 40
        ORDER BY surplus DESC
        LIMIT 10
    """, conn)
    
    # Find overutilized (Utilization > 130%)
    over = pd.read_sql("""
        SELECT 
            State,
            District,
            Department,
            Scheme_Name,
            SUM(Allocated_Budget_Cr) as allocated,
            AVG(Utilization_Percentage) as utilization,
            (SUM(Actual_Spending_Cr) - SUM(Allocated_Budget_Cr)) as deficit
        FROM budget
        GROUP BY State, District, Department, Scheme_Name
        HAVING utilization > 130
        ORDER BY deficit DESC
        LIMIT 10
    """, conn)
    
    conn.close()
    
    suggestions = []
    for i in range(min(len(under), len(over))):
        u = under.iloc[i]
        o = over.iloc[i]
        
        # Only suggest if same department
        if u['Department'] == o['Department']:
            realloc_amount = min(u['surplus'] * 0.7, o['deficit'] * 0.5 if o['deficit'] > 0 else u['surplus'] * 0.3)
            suggestions.append({
                "from_location": f"{u['District']}, {u['State']}",
                "to_location": f"{o['District']}, {o['State']}",
                "department": u['Department'],
                "scheme": u['Scheme_Name'],
                "current_utilization_from": f"{u['utilization']:.1f}%",
                "current_utilization_to": f"{o['utilization']:.1f}%",
                "suggested_amount_cr": round(float(realloc_amount), 2),
                "reason": f"Reallocate from underutilized ({u['utilization']:.1f}%) to overburdened ({o['utilization']:.1f}%) scheme"
            })
    
    return {"suggestions": suggestions}

# 10. HIGH-RISK PROJECTS
@app.get("/api/high-risk")
def high_risk_projects(threshold: float = 30):
    """Find high-risk projects (low utilization, high delays)"""
    conn = sqlite3.connect(DB_PATH)
    
    query = """
    SELECT 
        State,
        District,
        Ministry,
        Department,
        Scheme_Name,
        Project_ID,
        Allocated_Budget_Cr,
        Utilization_Percentage,
        Delay_Days,
        Anomaly_Tag
    FROM budget
    WHERE Utilization_Percentage < ? OR Delay_Days > 90
    ORDER BY Utilization_Percentage ASC, Delay_Days DESC
    LIMIT 50
    """
    
    df = pd.read_sql(query, conn, params=[threshold])
    conn.close()
    
    # Convert numpy types
    result = df.to_dict('records')
    for r in result:
        for key, value in r.items():
            if isinstance(value, (np.integer, np.floating)):
                r[key] = float(value)
            elif pd.isna(value):
                r[key] = None
    
    return JSONResponse(content=result)

# 11. STATE-WISE SUMMARY
@app.get("/api/state/{state}")
def state_summary(state: str):
    """Get summary for a specific state"""
    conn = sqlite3.connect(DB_PATH)
    
    query = """
    SELECT 
        District,
        Department,
        SUM(Allocated_Budget_Cr) as allocated,
        SUM(Actual_Spending_Cr) as spent,
        AVG(Utilization_Percentage) as utilization,
        AVG(Delay_Days) as avg_delay
    FROM budget
    WHERE State = ?
    GROUP BY District, Department
    ORDER BY utilization ASC
    """
    
    df = pd.read_sql(query, conn, params=[state])
    conn.close()
    
    # Convert numpy types
    result = df.to_dict('records')
    for r in result:
        for key, value in r.items():
            if isinstance(value, (np.integer, np.floating)):
                r[key] = float(value)
    
    return JSONResponse(content=result)

# 12. HEALTH CHECK
@app.get("/api/health")
def health_check():
    """Check if API and database are working"""
    try:
        conn = sqlite3.connect(DB_PATH)
        count = conn.execute("SELECT COUNT(*) FROM budget").fetchone()[0]
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "records": count,
            "database_file": os.path.exists(DB_PATH)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Indian Budget Intelligence API...")
    print(f"📊 Database: {DB_PATH}")
    print(f"📝 API docs: http://localhost:8000/docs")
    print(f"📍 Working directory: {os.getcwd()}")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)