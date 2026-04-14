from flask import Flask, request, jsonify
from celery import Celery
import os
import uuid
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://contract-analyzer-ecru.vercel.app" ], supports_credentials=True)

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-change-in-prod')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # tokens don't expire (adjust if needed)

jwt = JWTManager(app)

BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery = Celery(app.name, broker=BROKER_URL, backend=RESULT_BACKEND)

UPLOAD_FOLDER = "/uploads"

# ---------------------------------------------------------------------------
# In-memory user store  {email -> {id, name, email, password_hash}}
# Resets on server restart — fine for a PBL/demo project
# ---------------------------------------------------------------------------
_users: dict = {}


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if email in _users:
        return jsonify({"error": "Email already registered"}), 409

    user_id = str(uuid.uuid4())
    _users[email] = {
        "id": user_id,
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
    }
    token = create_access_token(identity=user_id, additional_claims={"email": email, "name": name})
    return jsonify({
        "token": token,
        "user": {"id": user_id, "email": email, "name": name},
    }), 201


@app.route("/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = _users.get(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(
        identity=user["id"],
        additional_claims={"email": user["email"], "name": user["name"]},
    )
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
    })


@app.route("/auth/me", methods=["GET"])
@jwt_required()
def auth_me():
    user_id = get_jwt_identity()
    user = next((u for u in _users.values() if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"id": user["id"], "email": user["email"], "name": user["name"]})


# ---------------------------------------------------------------------------
# Contract routes  (protected — require a valid JWT Bearer token)
# ---------------------------------------------------------------------------

@app.route("/upload", methods=["POST"])
@jwt_required()
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.endswith(".pdf"):
        return jsonify({"error": "Only PDF files accepted"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    # Read financial profile fields sent by the frontend form.
    # Safe defaults ensure the task never crashes when fields are absent.
    def _int(key, default):
        try:
            return int(request.form.get(key, default))
        except (ValueError, TypeError):
            return default

    def _float(key, default):
        try:
            return float(request.form.get(key, default))
        except (ValueError, TypeError):
            return default

    financial_profile = {
        "age":             _int("age", 35),
        "income":          _float("income", 50000),
        "loan_amount":     _float("loan_amount", 500000),
        "emi_amount":      _float("emi_amount", 11000),
        "tenure_months":   _int("tenure_months", 60),
        "credit_score":    _int("credit_score", 700),
        "employment_type": request.form.get("employment_type", "Salaried"),
        "loan_type":       request.form.get("loan_type", "Personal Loan"),
    }

    task = celery.send_task(
        "tasks.process_document",
        args=[filepath],
        kwargs={"financial_profile": financial_profile},
    )

    return jsonify({
        "message": "File received. Processing started.",
        "task_id": task.id,
        "filename": file.filename,
    }), 202


STAGE_NAMES = {
    1: "Uploading Document",
    2: "Extracting Text",
    3: "Analyzing Clauses",
    4: "Matching Complaints",
    5: "Generating Risk Report",
    6: "Finalizing Analysis",
}

def _infer_stage(result):
    if not result:
        return 1
    if result.get("risk_report"):
        return 6
    if result.get("stress_analysis"):
        return 5
    if result.get("flagged_clauses"):
        return 4
    if result.get("total_chunks", 0) > 0:
        return 3
    if result.get("total_elements", 0) > 0:
        return 2
    return 1

def _extract_risk_level(report):
    if not report:
        return None
    upper = report.upper()
    if "HIGH" in upper:
        return "HIGH"
    if "MEDIUM" in upper:
        return "MEDIUM"
    if "LOW" in upper:
        return "LOW"
    return None

@app.route("/status/<task_id>", methods=["GET"])
def status(task_id):
    task = celery.AsyncResult(task_id)

    if task.state == "PENDING":
        stage = 1
        response = {
            "status": "pending",
            "stage": stage,
            "stage_name": STAGE_NAMES[stage],
            "flagged_clauses": [],
            "risk_report": "",
            "risk_level": None,
        }
    elif task.state in ("STARTED", "PROGRESS"):
        result = task.info or {}
        stage = _infer_stage(result)
        response = {
            "status": "processing",
            "stage": stage,
            "stage_name": STAGE_NAMES[stage],
            "flagged_clauses": result.get("flagged_clauses", []),
            "risk_report": result.get("risk_report", ""),
            "risk_level": _extract_risk_level(result.get("risk_report", "")),
        }
    elif task.state == "SUCCESS":
        result = task.result or {}
        flagged = result.get("flagged_clauses", [])
        normalised = []
        for c in flagged:
            normalised.append({
                "clause": c.get("contract_chunk", c.get("clause", "")),
                "score": c.get("similarity_score", c.get("score", 0)),
                "matched_complaint": c.get("matched_complaint", ""),
            })
        risk_report = result.get("risk_report", "")
        risk_report_structured = result.get("risk_report_structured")
        if risk_report_structured and risk_report_structured.get("overall_risk_level") not in (None, "UNKNOWN"):
            risk_level = risk_report_structured["overall_risk_level"]
        else:
            risk_level = _extract_risk_level(risk_report)
        response = {
            "status": "complete",
            "stage": 6,
            "stage_name": STAGE_NAMES[6],
            "flagged_clauses": normalised,
            "risk_report": risk_report,
            "risk_report_structured": risk_report_structured,
            "risk_level": risk_level,
            "total_chunks": result.get("total_chunks"),
            "loan_stats": result.get("loan_stats"),
            "stress_analysis": result.get("stress_analysis"),
            "filename": result.get("filename", ""),
        }
    elif task.state == "FAILURE":
        response = {
            "status": "failed",
            "stage": 1,
            "stage_name": STAGE_NAMES[1],
            "flagged_clauses": [],
            "risk_report": "",
            "risk_level": None,
            "message": str(task.info),
        }
    else:
        response = {
            "status": "processing",
            "stage": 1,
            "stage_name": STAGE_NAMES[1],
            "flagged_clauses": [],
            "risk_report": "",
            "risk_level": None,
        }

    return jsonify(response)


# ---------------------------------------------------------------------------
# Loan stats — public endpoint used by dashboard sidebar
# ---------------------------------------------------------------------------

@app.route("/loan_stats", methods=["GET"])
def loan_stats_proxy():
    """Proxy to MCP /loan_stats so the frontend only talks to Flask."""
    import requests as req
    mcp_url = os.environ.get("MCP_SERVER_URL", "http://mcp_server:6000")
    try:
        r = req.get(f"{mcp_url}/loan_stats", timeout=5)
        return jsonify(r.json()), r.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
