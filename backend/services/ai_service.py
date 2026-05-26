import os
import re
import json
import requests
import random

# Load API Key
def get_api_key():
    return (
        os.getenv("AI_API_KEY") or 
        os.getenv("GEMINI_API_KEY") or 
        os.getenv("VITE_AI_API_KEY")
    )

def call_gemini(prompt, temperature=0.2, max_tokens=1000):
    api_key = get_api_key()
    if not api_key:
        print("WARNING: Gemini API Key is missing!")
        return ""
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens
        }
    }
    
    try:
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            text = data['candidates'][0]['content']['parts'][0]['text'].strip()
            return text
        else:
            print(f"Gemini API Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Gemini calling error: {e}")
    return ""

def extract_json_array(text):
    try:
        # Search for array inside the generated text
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception:
        # Fallback manual parser if output has triple backticks or markdown
        try:
            cleaned = text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except Exception:
            return []

def extract_json_object(text):
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception:
        try:
            cleaned = text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except Exception:
            return {}

def normalize_text(text):
    if not text:
        return ""
    # Convert to lowercase
    text = text.lower().strip()
    # Remove punctuation
    text = re.sub(r'[^\w\s]', '', text)
    # Trim multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def check_uniqueness(normalized_question, current_questions, user_history):
    # Compare with current session questions
    for q in current_questions:
        q_str = q.get("question") or q.get("question_text") or q.get("text") or ""
        if normalize_text(q_str) == normalized_question:
            return False
            
    # Compare with historical questions for this user
    for h in user_history:
        if normalize_text(h) == normalized_question:
            return False
            
    return True

def generate_30_questions(resume_text, detected_skills, target_role, user_history, session_id):
    """
    Generates 30 unique questions. 
    First 3 questions are fixed:
    Q1: Are you ready for the interview?
    Q2: Please introduce yourself.
    Q3: Tell me about your education background.
    Q4 to Q30: dynamic based on resume_text and detected_skills.
    """
    questions = [
        {
            "questionNumber": 1,
            "question": "Are you ready for the interview?",
            "type": "mandatory",
            "skill": "Communication"
        },
        {
            "questionNumber": 2,
            "question": "Please introduce yourself.",
            "type": "mandatory",
            "skill": "Communication"
        },
        {
            "questionNumber": 3,
            "question": "Tell me about your education background.",
            "type": "mandatory",
            "skill": "Education"
        }
    ]
    
    # Generate dynamic questions from Q4 to Q30
    skills_str = ", ".join(detected_skills) if isinstance(detected_skills, list) else detected_skills
    random_seed = random.randint(1000, 9999)
    current_timestamp = random.randint(100000, 999999)
    
    prompt = f"""
    Generate exactly 27 unique technical/project/scenario interview questions for this candidate.
    
    Candidate resume text:
    {resume_text}
    
    Detected skills:
    {skills_str}
    
    Target role:
    {target_role}
    
    Rules:
    - Questions must be based ONLY on the resume skills, projects, experience, education, and target job role.
    - VERY IMPORTANT: Do NOT ask any of the following questions that the user has already been asked in past interviews:
    {json.dumps(user_history) if user_history else '[]'}
    
    - Do not repeat questions.
    - Ensure extreme variety. Select a random subset of the candidate's detected skills and ask deep, nuanced, scenario-based questions about them.
    - Make questions vastly different for every interview attempt.
    - Use randomness with timestamp/sessionId: {session_id} {current_timestamp} {random_seed}
    - Include technical, project-based, scenario-based, problem-solving, communication, and HR questions.
    - Avoid generic project questions like "describe your most challenging project". Make them highly specific to the candidate's actual listed projects and technologies.
    - Return ONLY a valid JSON array.
    - Format must be a list of objects with the exact fields: "questionNumber" (starting from 4 to 30), "question", "type" (set to "dynamic"), and "skill" (the specific skill/topic the question is about).
    
    Format:
    [
      {{
        "questionNumber": 4,
        "question": "How did you implement the REST API in your Python project?",
        "type": "dynamic",
        "skill": "Python"
      }}
    ]
    """
    
    raw = call_gemini(prompt, temperature=0.9, max_tokens=2500)
    parsed = extract_json_array(raw)
    
    # Process dynamic questions and apply uniqueness logic
    dynamic_qs = []
    if isinstance(parsed, list):
        for q in parsed:
            q_text = q.get("question", "").strip()
            if not q_text:
                continue
            
            normalized = normalize_text(q_text)
            
            # Check uniqueness against user history and currently generated questions
            if check_uniqueness(normalized, questions + dynamic_qs, user_history):
                dynamic_qs.append({
                    "questionNumber": len(questions) + len(dynamic_qs) + 1,
                    "question": q_text,
                    "type": "dynamic",
                    "skill": q.get("skill") or "Technical"
                })
                
    # If we got fewer than 27 dynamic questions due to filtering or API limits, regenerate
    attempts = 0
    while len(dynamic_qs) < 27 and attempts < 10:
        attempts += 1
        remaining_count = 27 - len(dynamic_qs)
        print(f"Need {remaining_count} more unique questions. Attempt {attempts}...")
        
        extra_prompt = f"""
        Generate exactly {remaining_count} unique technical interview questions for this candidate.
        They must be completely different from these already generated questions:
        {json.dumps([dq['question'] for dq in dynamic_qs])}
        
        Candidate resume:
        {resume_text[:1000]}
        
        Detected skills:
        {skills_str}
        
        Target role:
        {target_role}
        
        Use randomness: {random.randint(10000, 99999)}
        
        Return ONLY valid JSON format:
        [
          {{
            "questionNumber": 4,
            "question": "question text",
            "type": "dynamic",
            "skill": "skill"
          }}
        ]
        """
        raw_extra = call_gemini(extra_prompt, temperature=0.85, max_tokens=1500)
        parsed_extra = extract_json_array(raw_extra)
        
        if isinstance(parsed_extra, list):
            for q in parsed_extra:
                q_text = q.get("question", "").strip()
                if not q_text:
                    continue
                normalized = normalize_text(q_text)
                if check_uniqueness(normalized, questions + dynamic_qs, user_history):
                    dynamic_qs.append({
                        "questionNumber": len(questions) + len(dynamic_qs) + 1,
                        "question": q_text,
                        "type": "dynamic",
                        "skill": q.get("skill") or "Technical"
                    })
                if len(dynamic_qs) == 27:
                    break

    # If still less than 27, add some solid dynamic placeholders based on skills
    fallback_skills = detected_skills if detected_skills else ["General Programming"]
    while len(dynamic_qs) < 27:
        skill = random.choice(fallback_skills)
        placeholder_questions = [
            f"Explain how you would write a highly optimized method or module using {skill}.",
            f"What is the most significant security vulnerability you have to consider when working with {skill}?",
            f"How do you debug performance bottlenecks or memory leaks in {skill} applications?",
            f"Describe a real-world scenario where you had to integrate {skill} with other back-end services.",
            f"What is your preferred state management or database connection strategy when using {skill}?"
        ]
        chosen = random.choice(placeholder_questions)
        normalized = normalize_text(chosen)
        if check_uniqueness(normalized, questions + dynamic_qs, user_history):
            dynamic_qs.append({
                "questionNumber": len(questions) + len(dynamic_qs) + 1,
                "question": chosen,
                "type": "dynamic",
                "skill": skill
            })
            
    # Combine the mandatory questions (1-3) and the unique dynamic questions (4-30)
    for dq in dynamic_qs[:27]:
        dq["questionNumber"] = len(questions) + 1
        questions.append(dq)
        
    return questions[:30]

def evaluate_answer(question, answer, skill, target_role):
    if not answer or answer.strip() in ["", "Skipped", "Not Attempted"]:
        return {
            "score": 0,
            "technicalScore": 0,
            "communicationScore": 0,
            "confidenceScore": 0,
            "feedback": "No answer provided.",
            "suggestedImprovement": "Please attempt the question next time.",
            "result": "Poor"
        }
        
    prompt = f"""
    Evaluate the candidate answer.
    
    Question:
    {question}
    
    Candidate Answer:
    {answer}
    
    Expected skill/topic:
    {skill}
    
    Target role:
    {target_role}
    
    Return ONLY valid JSON:
    {{
      "score": 0-10,
      "technicalScore": 0-10,
      "communicationScore": 0-10,
      "confidenceScore": 0-10,
      "feedback": "short clear feedback",
      "suggestedImprovement": "what candidate should improve",
      "result": "Good / Average / Poor"
    }}
    """
    
    raw = call_gemini(prompt, temperature=0.1, max_tokens=500)
    parsed = extract_json_object(raw)
    
    # Standardize values and ensure fallback if JSON parse fails
    return {
        "score": int(parsed.get("score", 5)),
        "technicalScore": int(parsed.get("technicalScore", 5)),
        "communicationScore": int(parsed.get("communicationScore", 5)),
        "confidenceScore": int(parsed.get("confidenceScore", 5)),
        "feedback": str(parsed.get("feedback", "Answer received and evaluated.")),
        "suggestedImprovement": str(parsed.get("suggestedImprovement", "Clarify implementation details.")),
        "result": str(parsed.get("result", "Average"))
    }
