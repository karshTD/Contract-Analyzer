from flask import Flask, request, jsonify
from celery import Celery
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery = Celery(app.name, broker=BROKER_URL, backend=RESULT_BACKEND)

UPLOAD_FOLDER = "/uploads"




@app.route("/upload", methods=["POST"])
def upload():
    # Check a file was actually sent
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.endswith(".pdf"):
        return jsonify({"error": "Only PDF files accepted"}), 400

    # Save the PDF to the shared uploads folder
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    # Fire the Celery task with the saved filepath
    task = celery.send_task("tasks.process_document", args=[filepath])

    return jsonify({
        "message": "File received. Processing started.",
        "task_id": task.id,
        "filename": file.filename
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
    """Infer processing stage from partial result data."""
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
    """Extract HIGH/MEDIUM/LOW from the risk report text."""
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
        # Normalise clause field names: backend may use contract_chunk, frontend expects clause
        normalised = []
        for c in flagged:
            normalised.append({
                "clause": c.get("contract_chunk", c.get("clause", "")),
                "score": c.get("similarity_score", c.get("score", 0)),
                "matched_complaint": c.get("matched_complaint", ""),
            })
        risk_report = result.get("risk_report", "")
        response = {
            "status": "complete",
            "stage": 6,
            "stage_name": STAGE_NAMES[6],
            "flagged_clauses": normalised,
            "risk_report": risk_report,
            "risk_level": _extract_risk_level(risk_report),
            # Keep original fields for backward compat with CRA frontend
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)