import requests
import json
import re

import time

OLLAMA_URL = "http://localhost:11434/api/generate"
MODELS = ["llama3", "mistral"]

_OLLAMA_ALIVE_CACHE = {"status": None, "last_check": 0}

def check_ollama_alive():
    global _OLLAMA_ALIVE_CACHE
    now = time.time()
    if now - _OLLAMA_ALIVE_CACHE["last_check"] < 120:  # cache for 2 mins
        if _OLLAMA_ALIVE_CACHE["status"] is not None:
            return _OLLAMA_ALIVE_CACHE["status"]
            
    try:
        resp = requests.get("http://localhost:11434/", timeout=2)
        is_alive = resp.status_code == 200
    except Exception:
        is_alive = False
        
    _OLLAMA_ALIVE_CACHE["status"] = is_alive
    _OLLAMA_ALIVE_CACHE["last_check"] = now
    return is_alive

def generate_with_ollama(prompt, timeout=30):
    if not check_ollama_alive():
        return ""
        
    for model in MODELS:
        try:
            resp = requests.post(
                OLLAMA_URL,
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=timeout
            )
            if resp.status_code == 200:
                data = resp.json()
                text = data.get("response", "").strip()
                if text:
                    return text
        except Exception:
            continue
    return ""


def extract_json_array(text):
    try:
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception:
        return []


def generate_interview_questions_ollama(role, detected_skills_str, resume_text="", required_count=30, existing_questions=None, start_q_no=1):
    skills = detected_skills_str or role or "Software Engineering"
    resume_ctx = (resume_text or "")[:1500]
    existing = existing_questions or []
    
    existing_texts = [q.get('question_text', '') for q in existing]
    previous_questions_str = "\n".join([f"- {t}" for t in existing_texts]) if existing_texts else "None"
        
    prompt = f"""Generate exactly {required_count} unique interview questions.

Fixed first questions:
1. Are you ready for the interview?
2. Please introduce yourself.
3. Ask about the candidate's education based on the resume.

For questions 4 to 30, generate unique technical/project/scenario questions based only on:

Resume:
{resume_ctx}

Detected skills:
{skills}

Role applied:
{role}

Rules:
Return JSON array only.
Exactly {required_count} questions.
No duplicate question_text.
No aptitude/reasoning/math/puzzle questions.
Questions 4 to 30 must be only from resume skills, projects, experience, and role.
Each object must include:
question_no, question_text, skill, difficulty, category, expected_answer."""

    raw = generate_with_ollama(prompt, timeout=60)
    parsed = extract_json_array(raw)
    if isinstance(parsed, list):
        return parsed
    return []


def evaluate_answer_with_ollama(question, answer, skill, section):
    if not answer or answer.strip() in ["Skipped", "", "Not Attempted"]:
        return {
            "score": 0,
            "feedback": "Question was skipped or not attempted.",
            "technical_accuracy": 0,
            "communication_clarity": 0,
            "confidence_score": 0
        }

    prompt = f"""You are an AI interview evaluator. Score this candidate answer strictly.

Question: {question}
Section: {section}
Skill: {skill}
Candidate Answer: {answer}

Evaluate and return ONLY a JSON object (no explanation):
{{
  "score": <integer 0-100>,
  "technical_accuracy": <integer 0-100>,
  "communication_clarity": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "feedback": "<2 sentence professional feedback>",
  "suggestion": "<1 sentence improvement tip>"
}}"""

    raw = generate_with_ollama(prompt, timeout=25)
    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            return {
                "score": int(data.get("score", 50)),
                "technical_accuracy": int(data.get("technical_accuracy", 50)),
                "communication_clarity": int(data.get("communication_clarity", 50)),
                "confidence_score": int(data.get("confidence_score", 50)),
                "feedback": str(data.get("feedback", "Answer evaluated.")),
                "suggestion": str(data.get("suggestion", "Keep practicing."))
            }
    except Exception:
        pass

    length = len(answer.strip())
    score = 75 if length > 100 else (60 if length > 50 else (45 if length > 15 else 25))
    return {
        "score": score,
        "technical_accuracy": score,
        "communication_clarity": score,
        "confidence_score": score,
        "feedback": "Answer received and evaluated.",
        "suggestion": "Provide more detailed explanations."
    }


def generate_final_summary_ollama(candidate_name, role, answered_count, overall_pct, skills):
    qualified = answered_count >= 15
    recommendation = "Shortlisted" if qualified else "Not Shortlisted"

    prompt = f"""You are an AI interview analyst. Write a professional performance summary.

Candidate: {candidate_name}
Role Applied: {role}
Questions Answered: {answered_count} / 30
Overall Score: {overall_pct}%
Skills: {skills}
Qualification: {"Qualified" if qualified else "Not Qualified"}

Return ONLY a JSON object:
{{
  "summary": "<2 sentence professional summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>"],
  "recruiter_notes": "<1 sentence recruiter note>",
  "recommendation": "{recommendation}"
}}"""

    raw = generate_with_ollama(prompt, timeout=30)
    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            data["recommendation"] = recommendation
            return data
    except Exception:
        pass

    return {
        "recommendation": recommendation,
        "strengths": ["Completed the interview", "Attempted multiple questions", "Showed effort"],
        "improvements": ["Improve technical depth", "Practice structured answers"],
        "summary": f"{candidate_name} completed the interview answering {answered_count}/30 questions.",
        "recruiter_notes": f"Candidate is recommended for: {recommendation}."
    }


def rephrase_question_for_voice(question_text, question_no):
    prompt = f"""Rephrase this interview question in a polite, professional spoken manner suitable for voice output.
Keep it concise. Output ONLY the rephrased question text, nothing else.
Question {question_no}: {question_text}"""

    result = generate_with_ollama(prompt, timeout=15)
    return result.strip() if result.strip() else question_text
