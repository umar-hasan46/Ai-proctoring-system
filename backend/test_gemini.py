import urllib.request, json, sys
sys.path.insert(0, '.')

env_path = '.env'
api_key = None
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line.startswith('GEMINI_API_KEY='):
            api_key = line.split('=', 1)[1].strip()

print('API key loaded:', bool(api_key))

prompt = "Evaluate this interview answer. Question: What is OOP? Candidate Answer: OOP stands for Object Oriented Programming. It uses classes and objects to model real world entities. Key pillars are encapsulation, inheritance, polymorphism, and abstraction. Return ONLY a JSON object with keys: ai_score, technical_score, communication_score, confidence_score, response_time_score, correctness_status, ai_feedback, suggestion. No markdown, no extra text."

payload = json.dumps({
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 400}
}).encode('utf-8')

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
        text = data['candidates'][0]['content']['parts'][0]['text'].strip()
        print("Gemini SUCCESS:")
        print(text[:500])
except urllib.error.HTTPError as e:
    print("HTTPError", e.code, e.read().decode()[:300])
except Exception as e:
    print("Error:", type(e).__name__, str(e)[:200])
