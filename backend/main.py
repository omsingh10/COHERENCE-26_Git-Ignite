# main.py
from fastapi import FastAPI, Query, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Optional, List
import asyncio
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import json
import os
import secrets

app = FastAPI(title="Indian Budget Intelligence API")

# ============ AUTHENTICATION CONFIGURATION ============
# 🔑 GENERATE YOUR KEY USING: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY = "vQOONJ_H8PA7IRaUJxNS1sdwLdx8vvJIqHu3u_auC_o"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models for auth
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    department: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

# Allow Flutter app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database path
DB_PATH = 'budget_india.db'

# ============ DATABASE FUNCTIONS FOR AUTH ============
def init_auth_db():
    """Initialize users table in SQLite"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            full_name TEXT,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT,
            disabled BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert demo users (password: admin123 for all)
    demo_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
    for uname, email, fname, role, dept in [
        ('admin', 'admin@gov.in', 'Admin User', 'admin', None),
        ('health_dept', 'health@gov.in', 'Health Officer', 'department', 'Health'),
        ('education_dept', 'education@gov.in', 'Education Officer', 'department', 'Education'),
        ('public_user', 'public@citizen.in', 'Public User', 'public', None),
    ]:
        cursor.execute('''
            INSERT INTO users (username, email, full_name, hashed_password, role, department)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET hashed_password=excluded.hashed_password
        ''', (uname, email, fname, demo_hash, role, dept))
    
    conn.commit()
    conn.close()
    print("[OK] Auth database initialized with demo users")

# Password utilities
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def get_user(username: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT username, email, full_name, hashed_password, role, department, disabled FROM users WHERE username = ?", 
        (username,)
    )
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return UserInDB(
            username=user[0],
            email=user[1],
            full_name=user[2],
            hashed_password=user[3],
            role=user[4],
            department=user[5],
            disabled=bool(user[6])
        )
    return None

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
    user = get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Role-based access decorators
def require_role(required_role: str):
    async def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role != required_role and current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {required_role} required"
            )
        return current_user
    return role_checker

def require_department_access(allowed_depts: list = None):
    async def dept_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role == 'admin':
            return current_user
        if current_user.role == 'department':
            if allowed_depts and current_user.department not in allowed_depts:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access to this department data not allowed"
                )
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Department access required"
        )
    return dept_checker

# ============ AUTHENTICATION ENDPOINTS ============

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "dept": user.department}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/register")
async def register_user(username: str, password: str, email: str, full_name: str, role: str = "public"):
    # Check if user exists
    existing = get_user(username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Hash password and create user
    hashed = get_password_hash(password)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, email, full_name, hashed_password, role) VALUES (?, ?, ?, ?, ?)",
            (username, email, full_name, hashed, role)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()
    
    return {"message": "User created successfully", "username": username}

# ============ YOUR EXISTING ENDPOINTS (WITH AUTH ADDED) ============

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
        "auth_required": "Use /token to get access token",
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

# 1. GET OVERALL SUMMARY (Public - no auth required)
@app.get("/api/summary")
async def get_summary():
    """Get overall budget summary - Public access"""
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

# 2. GET ALL STATES (Public)
@app.get("/api/states")
async def get_states():
    """Get list of all states - Public access"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT State FROM budget ORDER BY State", conn)
    conn.close()
    return {"states": df['State'].tolist()}

# 3. GET DISTRICTS BY STATE (Public)
@app.get("/api/districts/{state}")
async def get_districts(state: str):
    """Get districts in a state - Public access"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT District FROM budget WHERE State = ? ORDER BY District", 
                     conn, params=[state])
    conn.close()
    return {"state": state, "districts": df['District'].tolist()}

# 4. GET MINISTRIES (Public)
@app.get("/api/ministries")
async def get_ministries():
    """Get list of ministries - Public access"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT Ministry FROM budget ORDER BY Ministry", conn)
    conn.close()
    return {"ministries": df['Ministry'].tolist()}

# 5. GET DEPARTMENTS (Public)
@app.get("/api/departments")
async def get_departments():
    """Get list of departments - Public access"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT DISTINCT Department FROM budget ORDER BY Department", conn)
    conn.close()
    return {"departments": df['Department'].tolist()}

# 6. DEPARTMENT WISE SUMMARY (Requires authentication)
@app.get("/api/department/{dept}")
async def department_summary(
    dept: str, 
    current_user: User = Depends(get_current_active_user)
):
    """Get summary for specific department - Auth required"""
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

# 7a. ALL ANOMALIES LIST (Auth required) — must be defined BEFORE /{department}
@app.get("/api/anomalies/list")
async def anomalies_list(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
):
    """Get all anomaly-tagged records with risk classification - Auth required"""
    conn = sqlite3.connect(DB_PATH)

    counts_df = pd.read_sql("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN Utilization_Percentage > 150 OR Delay_Days > 90 THEN 1 ELSE 0 END) as high_risk,
            SUM(CASE WHEN (Utilization_Percentage > 120 OR Delay_Days > 45)
                         AND NOT (Utilization_Percentage > 150 OR Delay_Days > 90) THEN 1 ELSE 0 END) as medium_risk
        FROM budget WHERE UPPER(Anomaly_Tag) != 'NORMAL'
    """, conn)

    records_df = pd.read_sql("""
        SELECT Project_ID, Department, State, District, Scheme_Name,
               Allocated_Budget_Cr as allocated, Actual_Spending_Cr as spent,
               Utilization_Percentage as utilization, Anomaly_Tag as anomaly_tag,
               Delay_Days as delay_days
        FROM budget WHERE UPPER(Anomaly_Tag) != 'NORMAL'
        ORDER BY Utilization_Percentage DESC, Delay_Days DESC
        LIMIT ?
    """, conn, params=[limit])
    conn.close()

    def get_risk(row):
        if row['utilization'] > 150 or row['delay_days'] > 90:
            return 'HIGH'
        elif row['utilization'] > 120 or row['delay_days'] > 45:
            return 'MEDIUM'
        return 'LOW'

    if not records_df.empty:
        records_df['risk_level'] = records_df.apply(get_risk, axis=1)

    records = records_df.to_dict('records')
    for r in records:
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
            elif not isinstance(v, str) and pd.isna(v) if hasattr(pd, 'isna') else False:
                r[k] = None

    counts = counts_df.to_dict('records')[0] if not counts_df.empty else {}
    total = int(counts.get('total', 0))
    high = int(counts.get('high_risk', 0))
    medium = int(counts.get('medium_risk', 0))

    return {
        "total_anomalies": total,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": max(0, total - high - medium),
        "records": records
    }

# 7. ANOMALY DETECTION (ML-BASED) - Department users can access their own department
@app.get("/api/anomalies/{department}")
async def detect_anomalies(
    department: str, 
    current_user: User = Depends(require_department_access())
):
    """Detect anomalies using ML - Department access only"""
    # Verify access to this specific department
    if current_user.role != "admin" and current_user.department != department:
        raise HTTPException(
            status_code=403, 
            detail="You do not have access to this department's data"
        )
        
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
    
    # Also include records with Anomaly_Tag from original data
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

# 8. LEAKAGE DETECTION (Admin only)
@app.get("/api/leakage")
async def detect_leakage(
    min_utilization: float = 50,
    current_user: User = Depends(require_role('admin'))
):
    """Find potential leakages - Admin only"""
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

# 9. REALLOCATION SUGGESTIONS (Admin only)
@app.get("/api/reallocate")
async def suggest_reallocation(
    current_user: User = Depends(require_role('admin'))
):
    """Suggest reallocating funds - Admin only"""
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

# 10. HIGH-RISK PROJECTS (Admin only)
@app.get("/api/high-risk")
async def high_risk_projects(
    threshold: float = 30,
    current_user: User = Depends(require_role('admin'))
):
    """Find high-risk projects - Admin only"""
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

# 11. STATE-WISE SUMMARY (Public - no auth)
@app.get("/api/state/{state}")
async def state_summary(state: str):
    """Get summary for a specific state - Public access"""
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

# 12. HEALTH CHECK (Public)
@app.get("/api/health")
async def health_check():
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

# ============ WEBSOCKET ALERT SYSTEM ============
class AlertManager:
    def __init__(self):
        self.connections: List[WebSocket] = []
        self._running = False

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def generate_alerts(self):
        """Background task that checks for anomalies and broadcasts alerts."""
        if self._running:
            return
        self._running = True
        try:
            while True:
                await asyncio.sleep(30)  # check every 30 seconds
                if not self.connections:
                    continue
                try:
                    conn = sqlite3.connect(DB_PATH)
                    # Find critical underspend (< 30% utilization)
                    df = pd.read_sql_query(
                        "SELECT State, District, Department, allocated, spent FROM budget WHERE utilization < 30 ORDER BY RANDOM() LIMIT 3",
                        conn
                    )
                    conn.close()
                    for _, row in df.iterrows():
                        alert = {
                            "type": "critical_underspend",
                            "severity": "high",
                            "title": f"Critical Underspend: {row['District']}",
                            "message": f"{row['Department']} in {row['District']}, {row['State']} — allocated ₹{row['allocated']:.1f}Cr but spent only ₹{row['spent']:.1f}Cr",
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                        await self.broadcast(alert)
                except Exception:
                    pass
        finally:
            self._running = False

alert_manager = AlertManager()

@app.websocket("/ws/alerts")
async def websocket_alerts(ws: WebSocket):
    await alert_manager.connect(ws)
    # start background alert generator if not already running
    asyncio.ensure_future(alert_manager.generate_alerts())
    try:
        while True:
            # keep connection alive; respond to pings
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        alert_manager.disconnect(ws)

# ============ DASHBOARD ENDPOINTS (serve CSV data to React frontend) ============

@app.get("/api/dashboard/kpis")
async def dashboard_kpis():
    """KPI summary cards for React dashboard"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT
            SUM(Allocated_Budget_Cr) as total_allocated,
            SUM(Actual_Spending_Cr) as total_spent,
            SUM(Remaining_Budget_Cr) as total_remaining,
            AVG(Utilization_Percentage) as avg_utilization,
            COUNT(CASE WHEN Anomaly_Tag != 'Normal' THEN 1 END) as anomaly_count,
            COUNT(CASE WHEN Delay_Days > 90 THEN 1 END) as delayed_projects,
            COUNT(*) as total_projects,
            COUNT(DISTINCT State) as total_states,
            COUNT(DISTINCT Department) as total_departments
        FROM budget
    """, conn)
    conn.close()
    r = df.to_dict('records')[0]
    for k, v in r.items():
        if isinstance(v, (float, np.floating)) and (np.isnan(v) or np.isinf(v)):
            r[k] = 0
        elif isinstance(v, (np.integer, np.floating)):
            r[k] = float(v)
    return JSONResponse(content=r)


@app.get("/api/dashboard/department-allocation")
async def department_allocation(
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    department: Optional[str] = None,
):
    """Department-wise budget allocation for bar/pie charts - supports filters"""
    conn = sqlite3.connect(DB_PATH)
    where = []
    params = []
    if year:
        where.append("Year = ?")
        params.append(year)
    if state and state.lower() not in ("all", "all states", ""):
        where.append("State = ?")
        params.append(state)
    if district and district.lower() not in ("all", "all districts", ""):
        where.append("District = ?")
        params.append(district)
    if department and department.lower() not in ("all", "all departments", ""):
        where.append("Department = ?")
        params.append(department)
    w = ("WHERE " + " AND ".join(where)) if where else ""
    df = pd.read_sql(f"""
        SELECT
            Department,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent,
            AVG(Utilization_Percentage) as utilization,
            COUNT(*) as projects
        FROM budget {w}
        GROUP BY Department
        ORDER BY allocated DESC
        LIMIT 20
    """, conn, params=params)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v) if not np.isnan(float(v)) else 0.0
            elif v is None:
                r[k] = 0.0
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/dashboard/monthly-trend")
async def monthly_trend(
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    department: Optional[str] = None,
):
    """Monthly spending trend for line chart - supports filters"""
    conn = sqlite3.connect(DB_PATH)
    where = []
    params = []
    if year:
        where.append("Year = ?")
        params.append(year)
    if state and state.lower() not in ("all", "all states", ""):
        where.append("State = ?")
        params.append(state)
    if district and district.lower() not in ("all", "all districts", ""):
        where.append("District = ?")
        params.append(district)
    if department and department.lower() not in ("all", "all departments", ""):
        where.append("Department = ?")
        params.append(department)
    w = ("WHERE " + " AND ".join(where)) if where else ""
    df = pd.read_sql(f"""
        SELECT
            Year,
            Month,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent
        FROM budget {w}
        GROUP BY Year, Month
        ORDER BY Year, Month
    """, conn, params=params)
    conn.close()
    result = []
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v) if not np.isnan(float(v)) else 0.0
            elif v is None:
                r[k] = 0.0
        r['month_name'] = months[int(r['Month']) - 1] if 1 <= int(r['Month']) <= 12 else str(r['Month'])
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/dashboard/state-summary")
async def state_summary_dashboard():
    """State-wise summary for map/chart"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT
            State,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent,
            AVG(Utilization_Percentage) as utilization,
            COUNT(CASE WHEN Anomaly_Tag != 'Normal' THEN 1 END) as anomalies,
            AVG(Delay_Days) as avg_delay,
            COUNT(*) as projects
        FROM budget
        GROUP BY State
        ORDER BY allocated DESC
    """, conn)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/dashboard/anomalies-list")
async def anomalies_list(limit: int = 20):
    """Recent anomaly records for anomaly panel"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql(f"""
        SELECT
            Project_ID, State, District, Ministry, Department,
            Scheme_Name, Allocated_Budget_Cr, Actual_Spending_Cr,
            Utilization_Percentage, Delay_Days, Anomaly_Tag, Year
        FROM budget
        WHERE Anomaly_Tag != 'Normal'
           OR Utilization_Percentage < 30
           OR Delay_Days > 90
        ORDER BY Delay_Days DESC, Utilization_Percentage ASC
        LIMIT {int(limit)}
    """, conn)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
            elif v is None or (isinstance(v, float) and np.isnan(v)):
                r[k] = None
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/dashboard/top-districts")
async def top_districts(
    limit: int = 15,
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    department: Optional[str] = None,
):
    """Top districts by allocation with optional filters"""
    conn = sqlite3.connect(DB_PATH)
    where, params = [], []
    if year:
        where.append("Year = ?")
        params.append(year)
    if state and state.lower() not in ("all", "all states", ""):
        where.append("State = ?")
        params.append(state)
    if district and district.lower() not in ("all", "all districts", ""):
        where.append("District = ?")
        params.append(district)
    if department and department.lower() not in ("all", "all departments", ""):
        where.append("Department = ?")
        params.append(department)
    w = ("WHERE " + " AND ".join(where)) if where else ""
    df = pd.read_sql(f"""
        SELECT
            District,
            State,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent,
            AVG(Utilization_Percentage) as utilization,
            COUNT(CASE WHEN Anomaly_Tag != 'Normal' THEN 1 END) as anomalies,
            AVG(Delay_Days) as avg_delay
        FROM budget {w}
        GROUP BY District, State
        ORDER BY allocated DESC
        LIMIT {int(limit)}
    """, conn, params=params)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        avg_delay = float(r.get('avg_delay') or 0)
        utilization = float(r.get('utilization') or 0)
        r['risk_score'] = round(min(100.0, max(0.0, avg_delay / 2.0 + max(0.0, (50.0 - utilization)))))
        for k, v in list(r.items()):
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v) if not np.isnan(float(v)) else 0.0
            elif v is None:
                r[k] = 0.0
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/leakage-map")
async def leakage_map(
    limit: int = 24,
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    department: Optional[str] = None,
):
    """Corruption risk heatmap data for districts — sorted by risk score"""
    conn = sqlite3.connect(DB_PATH)
    where, params = [], []
    if year:
        where.append("Year = ?")
        params.append(year)
    if state and state.lower() not in ("all", "all states", ""):
        where.append("State = ?")
        params.append(state)
    if district and district.lower() not in ("all", "all districts", ""):
        where.append("District = ?")
        params.append(district)
    if department and department.lower() not in ("all", "all departments", ""):
        where.append("Department = ?")
        params.append(department)
    w = ("WHERE " + " AND ".join(where)) if where else ""

    df = pd.read_sql(f"""
        SELECT
            District,
            State,
            ROUND(SUM(Allocated_Budget_Cr), 2)  AS allocated,
            ROUND(SUM(Actual_Spending_Cr), 2)   AS spent,
            ROUND(AVG(Utilization_Percentage), 1) AS utilization,
            COUNT(1) AS total_projects,
            COUNT(CASE WHEN Anomaly_Tag != 'Normal' THEN 1 END) AS anomaly_count,
            ROUND(AVG(Delay_Days), 1)            AS avg_delay
        FROM budget {w}
        GROUP BY District, State
    """, conn, params=params)
    conn.close()

    result = []
    for r in df.to_dict('records'):
        for k, v in list(r.items()):
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v) if not np.isnan(float(v)) else 0.0
            elif v is None:
                r[k] = 0.0

        total = max(r['total_projects'], 1)
        anomaly_rate = r['anomaly_count'] / total * 100.0   # percent, eg 10.6
        avg_delay = r['avg_delay']
        # risk = weighted anomaly prevalence + delay contribution (0-100 scale)
        r['risk_score'] = round(min(100.0, anomaly_rate * 5.0 + min(40.0, avg_delay)))
        result.append(r)

    result.sort(key=lambda x: x['risk_score'], reverse=True)
    return JSONResponse(content=result[:int(limit)])


@app.get("/api/dashboard/schemes")
async def schemes_list(state: str = None, department: str = None, limit: int = 50):
    """Scheme-wise data with optional filters"""
    conn = sqlite3.connect(DB_PATH)
    query = """
        SELECT
            Scheme_Name, Ministry, Department, State, District,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent,
            AVG(Utilization_Percentage) as utilization,
            AVG(Delay_Days) as avg_delay,
            COUNT(*) as record_count
        FROM budget
        WHERE 1=1
    """
    params = []
    if state:
        query += " AND State = ?"
        params.append(state)
    if department:
        query += " AND Department = ?"
        params.append(department)
    query += f" GROUP BY Scheme_Name, Ministry, Department, State, District ORDER BY allocated DESC LIMIT {int(limit)}"
    df = pd.read_sql(query, conn, params=params)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/dashboard/risk-projects")
async def risk_projects(limit: int = 30):
    """High-risk projects for risk intelligence panel"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql(f"""
        SELECT
            Project_ID, State, District, Department, Scheme_Name,
            Allocated_Budget_Cr, Utilization_Percentage,
            Delay_Days, Anomaly_Tag, Economic_Priority_Level,
            District_Development_Index
        FROM budget
        WHERE Utilization_Percentage < 40 OR Delay_Days > 60 OR Anomaly_Tag != 'Normal'
        ORDER BY Delay_Days DESC, Utilization_Percentage ASC
        LIMIT {int(limit)}
    """, conn)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
            elif v is None or (isinstance(v, float) and np.isnan(v)):
                r[k] = None
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/dashboard/spending-category")
async def spending_category():
    """Spending by category (Education, Health, etc.)"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT
            Spending_Category,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent,
            AVG(Utilization_Percentage) as utilization,
            COUNT(*) as projects
        FROM budget
        GROUP BY Spending_Category
        ORDER BY allocated DESC
    """, conn)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/dashboard/year-trend")
async def year_trend():
    """Year-wise allocation and spending trend"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT
            Year,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent,
            AVG(Utilization_Percentage) as utilization,
            COUNT(CASE WHEN Anomaly_Tag != 'Normal' THEN 1 END) as anomalies
        FROM budget
        GROUP BY Year
        ORDER BY Year
    """, conn)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
        result.append(r)
    return JSONResponse(content=result)


# ============ BUDGET FLOW TRACKER ENDPOINTS ============

@app.get("/api/flow/kpis")
async def flow_kpis(state: Optional[str] = None, year: Optional[int] = None):
    """Budget Flow Tracker KPIs"""
    conn = sqlite3.connect(DB_PATH)
    where = []
    params = []
    if state and state.lower() not in ("all", "all states"):
        where.append("State = ?")
        params.append(state)
    if year:
        where.append("Year = ?")
        params.append(year)
    w = ("WHERE " + " AND ".join(where)) if where else ""
    df = pd.read_sql(f"""
        SELECT
            SUM(Allocated_Budget_Cr) as total_disbursed,
            SUM(Actual_Spending_Cr) as total_spent,
            AVG(Utilization_Percentage) as utilization_pct,
            COUNT(DISTINCT Project_ID) as active_projects,
            100.0 * COUNT(CASE WHEN Delay_Days <= 0 THEN 1 END) / COUNT(*) as on_schedule_pct
        FROM budget {w}
    """, conn, params=list(params))
    row = df.to_dict('records')[0] if not df.empty else {}
    yoy = 12.0
    if year and year > 1:
        pw2 = [c for c in where if "Year" not in c]
        pp2 = [p for p, c in zip(params, where) if "Year" not in c]
        pw2.append("Year = ?")
        pp2.append(year - 1)
        prev_df = pd.read_sql(
            f"SELECT SUM(Allocated_Budget_Cr) as v FROM budget WHERE {' AND '.join(pw2)}",
            conn, params=pp2
        )
        prev_v = float(prev_df['v'].iloc[0]) if not prev_df.empty and prev_df['v'].iloc[0] is not None else 0
        curr_v = float(row.get('total_disbursed') or 0)
        if prev_v > 0:
            yoy = (curr_v - prev_v) / prev_v * 100
    conn.close()
    for k, v in list(row.items()):
        if isinstance(v, (np.integer, np.floating)):
            row[k] = float(v) if not np.isnan(float(v)) else 0.0
        elif v is None:
            row[k] = 0.0
    row['yoy_change'] = float(yoy) if not (isinstance(yoy, float) and np.isnan(yoy)) else 0.0
    return JSONResponse(content=row)


@app.get("/api/flow/monthly-efficiency")
async def flow_monthly_efficiency(state: Optional[str] = None, year: Optional[int] = None):
    """Monthly flow efficiency for bar chart (last 12 data points)"""
    conn = sqlite3.connect(DB_PATH)
    where = []
    params = []
    if state and state.lower() not in ("all", "all states"):
        where.append("State = ?")
        params.append(state)
    if year:
        where.append("Year = ?")
        params.append(year)
    w = ("WHERE " + " AND ".join(where)) if where else ""
    df = pd.read_sql(f"""
        SELECT Year, Month,
            AVG(Utilization_Percentage) as efficiency,
            SUM(Allocated_Budget_Cr) as allocated,
            SUM(Actual_Spending_Cr) as spent
        FROM budget {w}
        GROUP BY Year, Month
        ORDER BY Year, Month
        LIMIT 12
    """, conn, params=params)
    conn.close()
    month_names = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
                   7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}
    result = []
    for r in df.to_dict('records'):
        for k, v in list(r.items()):
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v) if not np.isnan(float(v)) else 0.0
        r['month_label'] = f"{month_names.get(int(r.get('Month', 1)), 'Jan')} {str(int(r.get('Year', 2024)))[2:]}"
        result.append(r)
    return JSONResponse(content=result)


@app.get("/api/flow/cascade")
async def flow_cascade(state: Optional[str] = None, district: Optional[str] = None, year: Optional[int] = None):
    """Fund Cascade Flow: Central -> State -> District -> Department"""
    conn = sqlite3.connect(DB_PATH)
    year_where = "WHERE Year = ?" if year else ""
    year_params = [year] if year else []

    central_df = pd.read_sql(
        f"SELECT SUM(Allocated_Budget_Cr) as allocated, SUM(Actual_Spending_Cr) as spent FROM budget {year_where}",
        conn, params=year_params
    )

    state_filter = state if state and state.lower() not in ("all", "all states") else None
    if state_filter:
        s_df = pd.read_sql(
            f"SELECT State, SUM(Allocated_Budget_Cr) as allocated, SUM(Actual_Spending_Cr) as spent FROM budget WHERE State = ?{' AND Year = ?' if year else ''} GROUP BY State",
            conn, params=[state_filter] + ([year] if year else [])
        )
    else:
        s_df = pd.read_sql(
            f"SELECT State, SUM(Allocated_Budget_Cr) as allocated, SUM(Actual_Spending_Cr) as spent FROM budget {year_where} GROUP BY State ORDER BY allocated DESC LIMIT 1",
            conn, params=year_params
        )
    top_state = s_df['State'].iloc[0] if not s_df.empty else "Unknown"

    dist_filter = district if district and district.lower() not in ("all", "all districts") else None
    dist_w = ["State = ?"]
    dist_p = [top_state]
    if year:
        dist_w.append("Year = ?")
        dist_p.append(year)
    if dist_filter:
        dist_w.append("District = ?")
        dist_p.append(dist_filter)
    d_df = pd.read_sql(
        f"SELECT District, SUM(Allocated_Budget_Cr) as allocated, SUM(Actual_Spending_Cr) as spent FROM budget WHERE {' AND '.join(dist_w)} GROUP BY District ORDER BY allocated DESC LIMIT 1",
        conn, params=dist_p
    )
    top_dist = d_df['District'].iloc[0] if not d_df.empty else "Unknown"

    dept_w = ["State = ?", "District = ?"]
    dept_p = [top_state, top_dist]
    if year:
        dept_w.append("Year = ?")
        dept_p.append(year)
    dept_df = pd.read_sql(
        f"SELECT Department, SUM(Allocated_Budget_Cr) as allocated, SUM(Actual_Spending_Cr) as spent FROM budget WHERE {' AND '.join(dept_w)} GROUP BY Department ORDER BY allocated DESC LIMIT 1",
        conn, params=dept_p
    )
    conn.close()

    def row_vals(df):
        if df.empty:
            return 0.0, 0.0
        a = df['allocated'].iloc[0]
        s = df['spent'].iloc[0]
        return (float(a) if a is not None and not (isinstance(a, float) and np.isnan(a)) else 0.0,
                float(s) if s is not None and not (isinstance(s, float) and np.isnan(s)) else 0.0)

    def util(spent, alloc):
        return round(spent / alloc * 100, 1) if alloc > 0 else 0.0

    c_a, c_s = row_vals(central_df)
    s_a, s_s = row_vals(s_df)
    d_a, d_s = row_vals(d_df)
    dept_a, dept_s = row_vals(dept_df)
    dept_name = dept_df['Department'].iloc[0] if not dept_df.empty else "Unknown"

    return JSONResponse(content={
        "central": {"name": "Central Government", "level": "NATIONAL LEVEL", "allocated": c_a, "spent": c_s, "utilization": util(c_s, c_a), "status": "Disbursed"},
        "state":   {"name": top_state, "level": "REGIONAL LEVEL", "allocated": s_a, "spent": s_s, "utilization": util(s_s, s_a), "status": "Disbursed"},
        "district":{"name": top_dist,  "level": "LOCAL LEVEL",     "allocated": d_a, "spent": d_s, "utilization": util(d_s, d_a), "status": "Allocated"},
        "department": {"name": dept_name, "level": "DEPT LEVEL",   "allocated": dept_a, "spent": dept_s, "utilization": util(dept_s, dept_a), "status": "In Progress"},
    })


@app.get("/api/flow/projects")
async def flow_projects(state: Optional[str] = None, district: Optional[str] = None, year: Optional[int] = None, limit: int = 20):
    """Project status for Budget Flow Tracker"""
    conn = sqlite3.connect(DB_PATH)
    where = []
    params = []
    if state and state.lower() not in ("all", "all states"):
        where.append("State = ?")
        params.append(state)
    if district and district.lower() not in ("all", "all districts"):
        where.append("District = ?")
        params.append(district)
    if year:
        where.append("Year = ?")
        params.append(year)
    w = ("WHERE " + " AND ".join(where)) if where else ""
    params.append(limit)
    df = pd.read_sql(f"""
        SELECT
            Scheme_Name as project_name,
            Administrative_Level as level,
            Allocated_Budget_Cr as budget,
            Actual_Spending_Cr as spent,
            Utilization_Percentage as utilization,
            Spending_Phase as phase,
            Delay_Days as delay_days,
            State as state,
            District as district,
            Department as department
        FROM budget {w}
        ORDER BY Allocated_Budget_Cr DESC
        LIMIT ?
    """, conn, params=params)
    conn.close()
    result = []
    for r in df.to_dict('records'):
        for k, v in list(r.items()):
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v) if not np.isnan(float(v)) else 0.0
            elif v is None:
                r[k] = 0 if k in ('budget', 'spent', 'utilization', 'delay_days') else ""
        phase = str(r.get('phase', '') or '')
        util_val = r.get('utilization', 0) or 0
        delay = r.get('delay_days', 0) or 0
        if 'Complet' in phase or util_val >= 95:
            r['status'] = 'Completed'
        elif delay > 60 or util_val < 20:
            r['status'] = 'Pending'
        else:
            r['status'] = 'In Progress'
        result.append(r)
    return JSONResponse(content=result)


# 14. DEPARTMENT-WISE SUMMARY (Public) — for bar chart
@app.get("/api/dept-summary")
async def dept_summary():
    """Get department-wise budget totals - Public access"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT Department,
               SUM(Allocated_Budget_Cr) as allocated,
               SUM(Actual_Spending_Cr) as spent,
               AVG(Utilization_Percentage) as utilization,
               SUM(CASE WHEN UPPER(Anomaly_Tag) != 'NORMAL' THEN 1 ELSE 0 END) as anomaly_count,
               COUNT(*) as record_count
        FROM budget GROUP BY Department ORDER BY allocated DESC LIMIT 8
    """, conn)
    conn.close()
    result = df.to_dict('records')
    for r in result:
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
    return JSONResponse(content=result)

# 15. STATES-WIDE SUMMARY (Public) — for analytics / map view
@app.get("/api/states-summary")
async def states_summary():
    """Get state-wise budget totals - Public access"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT State,
               COUNT(DISTINCT District) as district_count,
               SUM(Allocated_Budget_Cr) as allocated,
               SUM(Actual_Spending_Cr) as spent,
               AVG(Utilization_Percentage) as utilization,
               SUM(CASE WHEN UPPER(Anomaly_Tag) != 'NORMAL' THEN 1 ELSE 0 END) as anomaly_count,
               AVG(Delay_Days) as avg_delay
        FROM budget GROUP BY State ORDER BY allocated DESC
    """, conn)
    conn.close()
    result = df.to_dict('records')
    for r in result:
        for k, v in r.items():
            if isinstance(v, (np.integer, np.floating)):
                r[k] = float(v)
    return JSONResponse(content=result)


# ============ BUDGET AI CHAT (GEMINI) ============
from google import genai
from google.genai import types as genai_types
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
_genai_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

class ChatRequest(BaseModel):
    message: str
    history: list = []

def _budget_system_prompt() -> str:
    try:
        db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "budget_india.db")
        conn = sqlite3.connect(db)
        df = pd.read_sql_query("SELECT Allocated_Budget_Cr, Actual_Spending_Cr, State, Department FROM budget", conn)
        conn.close()
        total_alloc = df["Allocated_Budget_Cr"].sum() / 1e5 if "Allocated_Budget_Cr" in df.columns else 0
        total_spent = df["Actual_Spending_Cr"].sum() / 1e5 if "Actual_Spending_Cr" in df.columns else 0
        utilization = round((total_spent / total_alloc) * 100, 1) if total_alloc > 0 else 0
        states = df["State"].nunique() if "State" in df.columns else 0
        depts = df["Department"].nunique() if "Department" in df.columns else 0
        records = len(df)
    except Exception:
        total_alloc, total_spent, utilization, states, depts, records = 0, 0, 0, 0, 0, 0

    return f"""You are Budget AI, an expert financial analyst for the Indian Government Budget Intelligence System.
You have access to a dataset of {records:,} budget records across {states} states and {depts} departments.
Key Stats:
- Total Allocated Budget: Rs {total_alloc:.2f} Lakh Crore
- Total Actual Expenditure: Rs {total_spent:.2f} Lakh Crore
- Average Utilization: {utilization}%
- Known anomalies detected: 926 (215 HIGH risk, 359 MEDIUM risk, 352 LOW risk)
Your role: Help users understand budget allocation, spending patterns, anomalies, fund utilization, and fiscal efficiency.
Answer clearly and concisely. Use Rs for currency. Keep responses under 300 words unless detail is requested."""

@app.post("/api/chat")
async def budget_chat(req: ChatRequest):
    if not _genai_client:
        raise HTTPException(status_code=503, detail="Budget AI is not configured (GEMINI_API_KEY missing).")
    try:
        system_prompt = _budget_system_prompt()
        # Build history in google.genai format
        history = []
        for msg in req.history:
            role = msg.get("role", "user")
            text = msg.get("text", "")
            history.append(genai_types.Content(
                role="user" if role == "user" else "model",
                parts=[genai_types.Part.from_text(text=text)]
            ))

        chat = _genai_client.chats.create(
            model="gemini-flash-lite-latest",
            config=genai_types.GenerateContentConfig(
                system_instruction=system_prompt,
            ),
            history=history,
        )
        response = chat.send_message(req.message)
        return {"reply": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ CSV UPLOAD ENDPOINT ============
from fastapi import UploadFile, File
import io
import csv as csv_module

REQUIRED_COLUMNS = [
    "Year", "Quarter", "Month", "State", "District", "Ministry", "Department",
    "Scheme_Name", "Project_ID", "Administrative_Level",
    "Allocated_Budget_Cr", "Revised_Budget_Cr", "Actual_Spending_Cr",
    "Remaining_Budget_Cr", "Utilization_Percentage",
    "Population_Covered", "Beneficiary_Count", "Spending_Category",
    "Payment_Method", "Approval_Date", "Fund_Release_Date",
    "Last_Transaction_Date", "Fiscal_Year", "Spending_Phase",
    "District_Development_Index", "Economic_Priority_Level",
    "Delay_Days", "Anomaly_Tag"
]

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload a CSV file to add/replace budget data in the database."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    try:
        contents = await file.read()
        text = contents.decode("utf-8-sig")
        df = pd.read_csv(io.StringIO(text))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    # Validate columns
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {missing}. Required: {REQUIRED_COLUMNS}"
        )

    # Clean and type-cast
    numeric_cols = [
        "Year", "Month", "Allocated_Budget_Cr", "Revised_Budget_Cr",
        "Actual_Spending_Cr", "Remaining_Budget_Cr", "Utilization_Percentage",
        "Population_Covered", "Beneficiary_Count",
        "District_Development_Index", "Delay_Days"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["Year", "State", "District", "Department", "Allocated_Budget_Cr"])
    rows_before = len(df)

    conn = sqlite3.connect(DB_PATH)
    df[REQUIRED_COLUMNS].to_sql("budget", conn, if_exists="append", index=False)
    conn.close()

    return {
        "status": "success",
        "rows_added": rows_before,
        "columns": list(df.columns),
        "preview": json.loads(df.head(5).to_json(orient="records"))
    }


@app.get("/api/upload/template-columns")
async def get_template_columns():
    """Return the required CSV column names for upload."""
    return {"columns": REQUIRED_COLUMNS}


# ============ ADVANCED ANOMALY DETECTION ============
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest as IsolationForestModel

@app.get("/api/analytics/anomaly-detection")
async def anomaly_detection_api(
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    department: Optional[str] = None,
    sensitivity: float = Query(0.1, ge=0.01, le=0.5, description="Contamination factor for IsolationForest (lower = fewer anomalies)")
):
    """
    Multi-method anomaly detection:
    1. Isolation Forest (ML-based unsupervised)
    2. Z-Score statistical outliers
    3. Rule-based flags (high delay, extreme utilization, etc.)
    
    Returns scored and categorized anomalies with explanations.
    """
    conn = sqlite3.connect(DB_PATH)
    query = "SELECT * FROM budget WHERE 1=1"
    params = []
    if year:
        query += " AND Year = ?"; params.append(year)
    if state:
        query += " AND State = ?"; params.append(state)
    if district:
        query += " AND District = ?"; params.append(district)
    if department:
        query += " AND Department = ?"; params.append(department)
    
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()

    if df.empty:
        return {"anomalies": [], "summary": {}, "distribution": {}}

    # --- Feature Engineering ---
    features = df[["Allocated_Budget_Cr", "Actual_Spending_Cr", "Utilization_Percentage", "Delay_Days"]].copy()
    features["spend_ratio"] = (df["Actual_Spending_Cr"] / df["Allocated_Budget_Cr"].replace(0, np.nan)).fillna(0)
    features["delay_severity"] = df["Delay_Days"] / (df["Delay_Days"].max() or 1)
    features["budget_gap"] = df["Allocated_Budget_Cr"] - df["Actual_Spending_Cr"]
    features = features.fillna(0)

    # --- Method 1: Isolation Forest ---
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)
    iso_model = IsolationForestModel(contamination=sensitivity, random_state=42, n_estimators=100)
    df["iso_anomaly"] = iso_model.fit_predict(X_scaled)
    df["iso_score"] = -iso_model.score_samples(X_scaled)  # Higher = more anomalous

    # --- Method 2: Z-Score ---
    z_scores = np.abs((features - features.mean()) / features.std().replace(0, 1))
    df["z_max"] = z_scores.max(axis=1)
    df["z_anomaly"] = (df["z_max"] > 2.5).astype(int)

    # --- Method 3: Rule-based ---
    df["rule_flags"] = 0
    df["rule_reasons"] = ""
    reasons_list = []
    for idx in df.index:
        reasons = []
        util = df.loc[idx, "Utilization_Percentage"]
        delay = df.loc[idx, "Delay_Days"]
        spend_ratio = features.loc[idx, "spend_ratio"]
        
        if util > 110:
            df.loc[idx, "rule_flags"] += 1
            reasons.append("Overspending (>110% utilization)")
        if util < 30:
            df.loc[idx, "rule_flags"] += 1
            reasons.append("Severe underutilization (<30%)")
        if delay > 60:
            df.loc[idx, "rule_flags"] += 1
            reasons.append(f"Excessive delay ({delay} days)")
        if spend_ratio > 1.2:
            df.loc[idx, "rule_flags"] += 1
            reasons.append("Spending exceeds allocation by >20%")
        if spend_ratio < 0.2 and df.loc[idx, "Allocated_Budget_Cr"] > 100:
            df.loc[idx, "rule_flags"] += 1
            reasons.append("Very low spend on large budget (<20%)")
        reasons_list.append("; ".join(reasons) if reasons else "Normal")
    df["rule_reasons"] = reasons_list

    # --- Composite Score ---
    # Normalize iso_score to 0-100
    iso_min, iso_max = df["iso_score"].min(), df["iso_score"].max()
    df["iso_norm"] = ((df["iso_score"] - iso_min) / ((iso_max - iso_min) or 1)) * 100
    # Normalize z_max to 0-100
    z_min, z_max_val = df["z_max"].min(), df["z_max"].max()
    df["z_norm"] = ((df["z_max"] - z_min) / ((z_max_val - z_min) or 1)) * 100
    # Rule score: each flag = 20 points
    df["rule_norm"] = (df["rule_flags"] * 20).clip(upper=100)

    # Weighted composite: 40% isolation forest, 30% z-score, 30% rules
    df["anomaly_score"] = (0.4 * df["iso_norm"] + 0.3 * df["z_norm"] + 0.3 * df["rule_norm"]).round(1)

    # Severity classification
    df["severity"] = pd.cut(
        df["anomaly_score"],
        bins=[-1, 30, 55, 75, 101],
        labels=["NORMAL", "LOW", "MEDIUM", "HIGH"]
    )

    # Is anomaly: any method flagged it
    df["is_anomaly"] = ((df["iso_anomaly"] == -1) | (df["z_anomaly"] == 1) | (df["rule_flags"] > 0)).astype(int)

    # Sort by anomaly score descending
    anomalies_df = df.sort_values("anomaly_score", ascending=False)

    # Build result rows
    anomaly_records = []
    for _, row in anomalies_df.head(100).iterrows():
        anomaly_records.append({
            "Project_ID": row.get("Project_ID", ""),
            "Year": int(row["Year"]),
            "State": row["State"],
            "District": row["District"],
            "Department": row["Department"],
            "Scheme_Name": row.get("Scheme_Name", ""),
            "Allocated": round(float(row["Allocated_Budget_Cr"]), 2),
            "Spent": round(float(row["Actual_Spending_Cr"]), 2),
            "Utilization": round(float(row["Utilization_Percentage"]), 1),
            "Delay_Days": int(row["Delay_Days"]),
            "anomaly_score": float(row["anomaly_score"]),
            "severity": str(row["severity"]),
            "is_anomaly": int(row["is_anomaly"]),
            "detection_methods": {
                "isolation_forest": bool(row["iso_anomaly"] == -1),
                "z_score": bool(row["z_anomaly"] == 1),
                "rule_based": bool(row["rule_flags"] > 0)
            },
            "reasons": row["rule_reasons"],
            "iso_score": round(float(row["iso_norm"]), 1),
            "z_score": round(float(row["z_norm"]), 1),
            "rule_score": round(float(row["rule_norm"]), 1)
        })

    # Summary stats
    total = len(df)
    n_anomalies = int(df["is_anomaly"].sum())
    severity_counts = df["severity"].value_counts().to_dict()
    severity_counts = {str(k): int(v) for k, v in severity_counts.items()}

    # Distribution by department
    dept_dist = df.groupby("Department").agg(
        total=("is_anomaly", "count"),
        anomalies=("is_anomaly", "sum"),
        avg_score=("anomaly_score", "mean")
    ).reset_index()
    dept_dist["anomaly_rate"] = (dept_dist["anomalies"] / dept_dist["total"] * 100).round(1)
    dept_distribution = dept_dist.sort_values("anomaly_rate", ascending=False).to_dict(orient="records")

    # Distribution by state
    state_dist = df.groupby("State").agg(
        total=("is_anomaly", "count"),
        anomalies=("is_anomaly", "sum"),
        avg_score=("anomaly_score", "mean")
    ).reset_index()
    state_dist["anomaly_rate"] = (state_dist["anomalies"] / state_dist["total"] * 100).round(1)
    state_distribution = state_dist.sort_values("anomaly_rate", ascending=False).to_dict(orient="records")

    # Method comparison
    method_comparison = {
        "isolation_forest": int((df["iso_anomaly"] == -1).sum()),
        "z_score": int(df["z_anomaly"].sum()),
        "rule_based": int((df["rule_flags"] > 0).sum()),
        "all_methods_agree": int(((df["iso_anomaly"] == -1) & (df["z_anomaly"] == 1) & (df["rule_flags"] > 0)).sum())
    }

    # Score histogram 
    hist_bins = [0, 20, 40, 60, 80, 100]
    hist_labels = ["0-20", "20-40", "40-60", "60-80", "80-100"]
    score_histogram = []
    for i in range(len(hist_bins) - 1):
        count = int(((df["anomaly_score"] >= hist_bins[i]) & (df["anomaly_score"] < hist_bins[i+1])).sum())
        score_histogram.append({"range": hist_labels[i], "count": count})

    return {
        "anomalies": anomaly_records,
        "summary": {
            "total_records": total,
            "total_anomalies": n_anomalies,
            "anomaly_rate": round(n_anomalies / total * 100, 1) if total else 0,
            "avg_anomaly_score": round(float(df["anomaly_score"].mean()), 1),
            "severity_distribution": severity_counts,
            "method_comparison": method_comparison
        },
        "by_department": dept_distribution,
        "by_state": state_distribution,
        "score_histogram": score_histogram
    }


# ============ PREDICTIVE MODELING: FUND LAPSE PREDICTION ============
from sklearn.linear_model import LinearRegression

@app.get("/api/analytics/fund-lapse-prediction")
async def fund_lapse_prediction_api(
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    department: Optional[str] = None,
    forecast_months: int = Query(3, ge=1, le=12, description="Months ahead to forecast")
):
    """
    Predictive model for fund lapse risk:
    1. Trend analysis on monthly spending patterns
    2. Linear regression to project year-end utilization
    3. Risk scoring based on current pace vs allocation
    4. Department/district-level lapse probability
    """
    conn = sqlite3.connect(DB_PATH)
    query = "SELECT * FROM budget WHERE 1=1"
    params = []
    if year:
        query += " AND Year = ?"; params.append(year)
    if state:
        query += " AND State = ?"; params.append(state)
    if district:
        query += " AND District = ?"; params.append(district)
    if department:
        query += " AND Department = ?"; params.append(department)
    
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()

    if df.empty:
        return {"predictions": [], "summary": {}, "trends": []}

    # --- Monthly spending trend ---
    monthly = df.groupby("Month").agg(
        total_allocated=("Allocated_Budget_Cr", "sum"),
        total_spent=("Actual_Spending_Cr", "sum"),
        avg_utilization=("Utilization_Percentage", "mean"),
        avg_delay=("Delay_Days", "mean"),
        record_count=("Project_ID", "count")
    ).reset_index()
    monthly = monthly.sort_values("Month")

    # Cumulative spending
    monthly["cumulative_spent"] = monthly["total_spent"].cumsum()
    total_allocation = float(df["Allocated_Budget_Cr"].sum())
    monthly["cumulative_pct"] = (monthly["cumulative_spent"] / total_allocation * 100).round(1)

    # --- Linear Regression for future projection ---
    if len(monthly) >= 3:
        X_months = monthly["Month"].values.reshape(-1, 1)
        y_spending = monthly["total_spent"].values
        
        lr_model = LinearRegression()
        lr_model.fit(X_months, y_spending)
        
        # Forecast future months
        last_month = int(monthly["Month"].max())
        future_months = np.arange(last_month + 1, min(last_month + forecast_months + 1, 13)).reshape(-1, 1)
        
        if len(future_months) > 0:
            forecasted_spending = lr_model.predict(future_months)
            forecasted_spending = np.maximum(forecasted_spending, 0)  # No negative spending
        else:
            forecasted_spending = np.array([])
        
        # R-squared
        r_squared = max(0, lr_model.score(X_months, y_spending))
        
        # Project year-end total spending
        all_12 = np.arange(1, 13).reshape(-1, 1)
        projected_full_year = float(np.sum(np.maximum(lr_model.predict(all_12), 0)))
        projected_utilization = round(projected_full_year / total_allocation * 100, 1) if total_allocation else 0
        projected_lapse = max(0, round(total_allocation - projected_full_year, 2))
        projected_lapse_pct = round(projected_lapse / total_allocation * 100, 1) if total_allocation else 0
    else:
        future_months = np.array([])
        forecasted_spending = np.array([])
        r_squared = 0
        current_util = float(df["Utilization_Percentage"].mean())
        projected_utilization = current_util
        projected_lapse = total_allocation * (1 - current_util / 100)
        projected_lapse_pct = round(100 - current_util, 1)

    # --- District-level lapse predictions ---
    district_predictions = []
    dist_groups = df.groupby(["State", "District"])
    for (st, dist), group in dist_groups:
        alloc = float(group["Allocated_Budget_Cr"].sum())
        spent = float(group["Actual_Spending_Cr"].sum())
        util = round(spent / alloc * 100, 1) if alloc else 0
        avg_delay = float(group["Delay_Days"].mean())
        
        # Monthly trend within district
        d_monthly = group.groupby("Month")["Actual_Spending_Cr"].sum().reset_index()
        d_monthly = d_monthly.sort_values("Month")
        
        if len(d_monthly) >= 3:
            d_lr = LinearRegression()
            d_lr.fit(d_monthly["Month"].values.reshape(-1, 1), d_monthly["Actual_Spending_Cr"].values)
            d_proj = float(np.sum(np.maximum(d_lr.predict(np.arange(1, 13).reshape(-1, 1)), 0)))
            d_proj_util = round(d_proj / alloc * 100, 1) if alloc else 0
            d_lapse = max(0, round(alloc - d_proj, 2))
            trend_slope = float(d_lr.coef_[0])
        else:
            d_proj_util = util
            d_lapse = max(0, round(alloc - spent, 2))
            trend_slope = 0.0

        # Risk scoring
        lapse_pct = round(d_lapse / alloc * 100, 1) if alloc else 0
        risk_score = 0
        risk_factors = []
        
        if d_proj_util < 50:
            risk_score += 40
            risk_factors.append("Very low projected utilization")
        elif d_proj_util < 70:
            risk_score += 25
            risk_factors.append("Below-target utilization")
        elif d_proj_util < 85:
            risk_score += 10
            risk_factors.append("Moderate utilization gap")
        
        if trend_slope < 0:
            risk_score += 25
            risk_factors.append("Declining spending trend")
        elif trend_slope < 5:
            risk_score += 10
            risk_factors.append("Flat spending trend")
        
        if avg_delay > 45:
            risk_score += 20
            risk_factors.append("High project delays")
        elif avg_delay > 25:
            risk_score += 10
            risk_factors.append("Moderate delays")
        
        if alloc > 500 and lapse_pct > 30:
            risk_score += 15
            risk_factors.append("Large budget at high lapse risk")

        risk_score = min(risk_score, 100)
        risk_level = "CRITICAL" if risk_score >= 70 else "HIGH" if risk_score >= 50 else "MEDIUM" if risk_score >= 30 else "LOW"

        district_predictions.append({
            "State": st,
            "District": dist,
            "allocated": round(alloc, 2),
            "spent": round(spent, 2),
            "current_utilization": util,
            "projected_utilization": d_proj_util,
            "projected_lapse_amount": d_lapse,
            "lapse_pct": lapse_pct,
            "avg_delay": round(avg_delay, 1),
            "trend_slope": round(trend_slope, 2),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "monthly_spending": d_monthly.to_dict(orient="records") if len(d_monthly) > 0 else []
        })
    
    district_predictions.sort(key=lambda x: x["risk_score"], reverse=True)

    # --- Department-level lapse predictions ---
    dept_predictions = []
    dept_groups = df.groupby("Department")
    for dept, group in dept_groups:
        alloc = float(group["Allocated_Budget_Cr"].sum())
        spent = float(group["Actual_Spending_Cr"].sum())
        util = round(spent / alloc * 100, 1) if alloc else 0
        
        dep_monthly = group.groupby("Month")["Actual_Spending_Cr"].sum().reset_index().sort_values("Month")
        if len(dep_monthly) >= 3:
            dep_lr = LinearRegression()
            dep_lr.fit(dep_monthly["Month"].values.reshape(-1, 1), dep_monthly["Actual_Spending_Cr"].values)
            dep_proj = float(np.sum(np.maximum(dep_lr.predict(np.arange(1, 13).reshape(-1, 1)), 0)))
            dep_proj_util = round(dep_proj / alloc * 100, 1) if alloc else 0
            dep_lapse = max(0, round(alloc - dep_proj, 2))
        else:
            dep_proj_util = util
            dep_lapse = max(0, round(alloc - spent, 2))

        lapse_pct = round(dep_lapse / alloc * 100, 1) if alloc else 0
        risk_level = "CRITICAL" if lapse_pct > 40 else "HIGH" if lapse_pct > 25 else "MEDIUM" if lapse_pct > 15 else "LOW"

        dept_predictions.append({
            "Department": dept,
            "allocated": round(alloc, 2),
            "spent": round(spent, 2),
            "current_utilization": util,
            "projected_utilization": dep_proj_util,
            "projected_lapse": dep_lapse,
            "lapse_pct": lapse_pct,
            "risk_level": risk_level
        })
    
    dept_predictions.sort(key=lambda x: x["lapse_pct"], reverse=True)

    # --- Build trend data for charts ---
    trend_data = []
    for _, row in monthly.iterrows():
        trend_data.append({
            "month": int(row["Month"]),
            "actual_spent": round(float(row["total_spent"]), 2),
            "cumulative_spent": round(float(row["cumulative_spent"]), 2),
            "cumulative_pct": float(row["cumulative_pct"]),
            "avg_utilization": round(float(row["avg_utilization"]), 1),
            "type": "actual"
        })
    # Add forecasted months
    for i, fm in enumerate(future_months.flatten()):
        cum = float(monthly["cumulative_spent"].iloc[-1]) + float(np.sum(forecasted_spending[:i+1]))
        trend_data.append({
            "month": int(fm),
            "actual_spent": round(float(forecasted_spending[i]), 2),
            "cumulative_spent": round(cum, 2),
            "cumulative_pct": round(cum / total_allocation * 100, 1) if total_allocation else 0,
            "avg_utilization": None,
            "type": "forecast"
        })

    # Overall summary
    summary = {
        "total_allocation": round(total_allocation, 2),
        "total_spent": round(float(df["Actual_Spending_Cr"].sum()), 2),
        "current_utilization": round(float(df["Actual_Spending_Cr"].sum()) / total_allocation * 100, 1) if total_allocation else 0,
        "projected_utilization": projected_utilization,
        "projected_lapse_pct": projected_lapse_pct,
        "model_confidence": round(r_squared * 100, 1),
        "high_risk_districts": len([d for d in district_predictions if d["risk_level"] in ("HIGH", "CRITICAL")]),
        "critical_districts": len([d for d in district_predictions if d["risk_level"] == "CRITICAL"]),
        "total_districts": len(district_predictions),
        "forecast_months": forecast_months
    }

    return {
        "summary": summary,
        "predictions": district_predictions[:50],
        "department_predictions": dept_predictions,
        "spending_trend": trend_data
    }


# =============================================
# SMART REALLOCATION ANALYTICS (public)
# =============================================
@app.get("/api/analytics/smart-reallocation")
async def smart_reallocation(
    year: int = None,
    state: str = None,
    district: str = None,
    department: str = None
):
    """AI-powered fund reallocation recommendations using real DB data"""
    conn = sqlite3.connect(DB_PATH)

    where_clauses = []
    params = []
    if year:
        where_clauses.append("Year = ?")
        params.append(year)
    if state:
        where_clauses.append("State = ?")
        params.append(state)
    if district:
        where_clauses.append("District = ?")
        params.append(district)
    if department:
        where_clauses.append("Department = ?")
        params.append(department)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    # Department-level summary
    dept_df = pd.read_sql(f"""
        SELECT
            Department,
            SUM(Allocated_Budget_Cr) as total_allocated,
            SUM(Actual_Spending_Cr) as total_spent,
            AVG(Utilization_Percentage) as avg_utilization,
            SUM(Remaining_Budget_Cr) as total_remaining,
            COUNT(*) as record_count,
            AVG(Delay_Days) as avg_delay
        FROM budget
        {where_sql}
        GROUP BY Department
        ORDER BY total_allocated DESC
    """, conn, params=params)

    # State-level summary for geographic insights
    state_df = pd.read_sql(f"""
        SELECT
            State,
            SUM(Allocated_Budget_Cr) as total_allocated,
            SUM(Actual_Spending_Cr) as total_spent,
            AVG(Utilization_Percentage) as avg_utilization,
            SUM(Remaining_Budget_Cr) as total_remaining,
            COUNT(*) as record_count
        FROM budget
        {where_sql}
        GROUP BY State
        ORDER BY total_remaining DESC
    """, conn, params=params)

    # District-level for granular reallocation
    district_df = pd.read_sql(f"""
        SELECT
            State,
            District,
            Department,
            SUM(Allocated_Budget_Cr) as total_allocated,
            SUM(Actual_Spending_Cr) as total_spent,
            AVG(Utilization_Percentage) as avg_utilization,
            SUM(Remaining_Budget_Cr) as total_remaining,
            AVG(Delay_Days) as avg_delay
        FROM budget
        {where_sql}
        GROUP BY State, District, Department
        ORDER BY total_remaining DESC
    """, conn, params=params)

    conn.close()

    # Use median-based relative splitting for surplus/deficit
    if len(dept_df) > 1:
        median_util = float(dept_df['avg_utilization'].median())
        median_remaining = float(dept_df['total_remaining'].median())
    else:
        median_util = 77.0
        median_remaining = 0

    # Identify surplus departments (below median utilization, above median remaining)
    surplus_depts = []
    for _, row in dept_df.iterrows():
        if row['avg_utilization'] <= median_util and row['total_remaining'] > 0:
            surplus_depts.append({
                "department": row['Department'],
                "allocated": round(float(row['total_allocated']), 2),
                "spent": round(float(row['total_spent']), 2),
                "remaining": round(float(row['total_remaining']), 2),
                "utilization": round(float(row['avg_utilization']), 1),
                "surplus_available": round(float(row['total_remaining'] * 0.3), 2),
                "records": int(row['record_count']),
                "avg_delay": round(float(row['avg_delay']), 0)
            })
    surplus_depts.sort(key=lambda x: x['remaining'], reverse=True)

    # Identify deficit departments (above median utilization)
    deficit_depts = []
    for _, row in dept_df.iterrows():
        if row['avg_utilization'] > median_util:
            deficit_depts.append({
                "department": row['Department'],
                "allocated": round(float(row['total_allocated']), 2),
                "spent": round(float(row['total_spent']), 2),
                "remaining": round(float(row['total_remaining']), 2),
                "utilization": round(float(row['avg_utilization']), 1),
                "deficit_amount": round(float(row['total_spent'] - row['total_allocated'] + row['total_remaining']), 2),
                "records": int(row['record_count'])
            })
    deficit_depts.sort(key=lambda x: x['utilization'], reverse=True)

    # Generate reallocation recommendations
    recommendations = []
    for i in range(min(len(surplus_depts), len(deficit_depts), 8)):
        src = surplus_depts[i]
        dst = deficit_depts[i]
        transfer = round(min(src['surplus_available'], dst['allocated'] * 0.15), 2)
        if transfer <= 0:
            continue

        projected_src_util = round(
            (src['spent'] / max(src['allocated'] - transfer, 1)) * 100, 1
        )
        projected_dst_util = round(
            (dst['spent'] / max(dst['allocated'] + transfer, 1)) * 100, 1
        )

        priority = "HIGH" if dst['utilization'] > 120 else ("MEDIUM" if dst['utilization'] > 100 else "NORMAL")

        recommendations.append({
            "id": i + 1,
            "from_department": src['department'],
            "to_department": dst['department'],
            "transfer_amount_cr": transfer,
            "from_utilization": src['utilization'],
            "to_utilization": dst['utilization'],
            "projected_from_util": min(projected_src_util, 100),
            "projected_to_util": projected_dst_util,
            "from_remaining": src['remaining'],
            "to_deficit": dst['deficit_amount'],
            "priority": priority,
            "impact_score": round(min(100, (dst['utilization'] - src['utilization']) / 2 + transfer * 5), 1),
            "reason": f"Transfer from {src['department']} (util: {src['utilization']}%) to {dst['department']} (util: {dst['utilization']}%) to balance budget utilization"
        })

    # Department utilization chart data
    dept_chart = []
    for _, row in dept_df.iterrows():
        dept_chart.append({
            "department": row['Department'],
            "allocated": round(float(row['total_allocated']), 2),
            "spent": round(float(row['total_spent']), 2),
            "remaining": round(float(row['total_remaining']), 2),
            "utilization": round(float(row['avg_utilization']), 1),
        })

    # State-wise surplus/deficit
    state_chart = []
    for _, row in state_df.iterrows():
        state_chart.append({
            "state": row['State'],
            "allocated": round(float(row['total_allocated']), 2),
            "spent": round(float(row['total_spent']), 2),
            "remaining": round(float(row['total_remaining']), 2),
            "utilization": round(float(row['avg_utilization']), 1),
            "status": "Surplus" if row['avg_utilization'] < 70 else ("Balanced" if row['avg_utilization'] <= 100 else "Deficit"),
        })

    # Summary metrics
    total_allocated = float(dept_df['total_allocated'].sum())
    total_spent = float(dept_df['total_spent'].sum())
    total_remaining = float(dept_df['total_remaining'].sum())
    total_realloc_potential = sum(r['transfer_amount_cr'] for r in recommendations)
    avg_utilization = float(dept_df['avg_utilization'].mean()) if len(dept_df) > 0 else 0

    return {
        "summary": {
            "total_allocated_cr": round(total_allocated, 2),
            "total_spent_cr": round(total_spent, 2),
            "total_remaining_cr": round(total_remaining, 2),
            "avg_utilization": round(avg_utilization, 1),
            "total_reallocation_potential_cr": round(total_realloc_potential, 2),
            "surplus_departments": len(surplus_depts),
            "deficit_departments": len(deficit_depts),
            "total_recommendations": len(recommendations),
            "estimated_efficiency_gain": round(min(15, total_realloc_potential / max(total_allocated, 1) * 100), 1),
        },
        "recommendations": recommendations,
        "surplus_departments": surplus_depts[:10],
        "deficit_departments": deficit_depts[:10],
        "department_chart": dept_chart,
        "state_chart": state_chart,
    }


# Initialize auth DB on startup
@app.on_event("startup")
async def startup_event():
    init_auth_db()

if __name__ == "__main__":
    import uvicorn
    print("[START] Starting Indian Budget Intelligence API...")
    print("[INFO] Database:", DB_PATH)
    print("[INFO] API docs: http://localhost:8000/docs")
    print("[INFO] Auth endpoint: http://localhost:8000/token")
    print("[INFO] Working directory:", os.getcwd())
    print("\n[INFO] Demo Users (password: admin123 for all):")
    print("   - admin (full access)")
    print("   - health_dept (health department only)")
    print("   - education_dept (education department only)")
    print("   - public_user (read-only access)\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)