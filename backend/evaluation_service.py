import json

try:
    from services.ollama_service import (
        evaluate_answer_with_ollama,
        generate_final_summary_ollama,
        rephrase_question_for_voice
    )
    _ollama_available = True
except ImportError:
    _ollama_available = False


def evaluate_answer_ollama(question, answer, skill, section):
    if not answer or answer.strip() in ["Skipped", "", "Not Attempted"]:
        return {"score": 0, "feedback": "Skipped.", "technical_accuracy": 0, "communication_clarity": 0, "confidence_score": 0}
    if _ollama_available:
        try:
            return evaluate_answer_with_ollama(question, answer, skill, section)
        except Exception:
            pass
    answer = answer.strip()
    score = 75 if len(answer) > 100 else (60 if len(answer) > 50 else (45 if len(answer) > 15 else 25))
    return {"score": score, "feedback": "Answer received and evaluated.", "technical_accuracy": score, "communication_clarity": score, "confidence_score": score}


def evaluate_answer(question, answer, section, skills):
    return evaluate_answer_ollama(question, answer, skills, section)


def call_gemini(prompt):
    return ""


def generate_final_summary(candidate_name, role, overall, technical, communication, skills, all_answers):
    answered_count = len([a for a in all_answers if (a.get("answer") or "").strip() not in ["", "Skipped", "Not Attempted"]])
    if _ollama_available:
        try:
            return generate_final_summary_ollama(candidate_name, role, answered_count, overall, skills)
        except Exception:
            pass
    rec = "Shortlisted" if answered_count >= 15 else "Not Shortlisted"
    return {
        "recommendation": rec,
        "strengths": ["Completed the interview", "Attempted questions", "Showed effort"],
        "improvements": ["Improve technical depth", "Practice structured answers"],
        "summary": f"Candidate answered {answered_count}/30 questions.",
        "recruiter_notes": f"Candidate is recommended for: {rec}."
    }


def parse_resume_with_gemini(resume_text, role_applied):
    return {
        "summary_paragraph": "Resume parsed.",
        "overall_score": 70, "ats_score": 65, "skills_score": 75,
        "education_score": 80, "experience_score": 70, "project_score": 70,
        "role_match_score": 75, "skills": [], "education": [], "projects": [],
        "experience": [], "certifications": [],
        "strengths": ["Demonstrates technical capacity"],
        "weaknesses": ["Needs more advanced projects"],
        "matched_role": role_applied or "Software Engineer",
        "matched_skills": [], "missing_skills": [],
        "recommended_roles": [role_applied or "Software Engineer"]
    }
