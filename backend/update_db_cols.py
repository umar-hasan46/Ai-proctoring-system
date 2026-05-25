import re

tables = {
    'interviews': [
        'attempt_no', 'session_name', 'detected_skills', 'primary_skill', 'current_difficulty',
        'result_status', 'ai_recommendation', 'ai_recommendation_reason', 'admin_final_status',
        'admin_note', 'admin_status_updated_at_ist', 'total_questions', 'answered_questions',
        'skipped_questions', 'not_attempted_questions', 'self_intro_score', 'aptitude_score',
        'technical_score', 'communication_score', 'confidence_score', 'response_time_score',
        'completion_percentage', 'overall_score', 'total_duration_seconds', 'remaining_time_seconds',
        'time_left_at_submit', 'submitted_early', 'started_at_ist', 'ended_at_ist'
    ],
    'interview_questions': [
        'interview_id', 'attempt_no', 'candidate_email', 'question_no', 'session_name',
        'question_text', 'question_type', 'topic', 'skill', 'difficulty', 'expected_answer',
        'reason_for_selection', 'generated_by', 'generated_at_ist'
    ],
    'answers': [
        'interview_id', 'attempt_no', 'candidate_email', 'question_no', 'session_name',
        'question_text', 'candidate_answer', 'expected_answer', 'question_status',
        'response_time_seconds', 'response_time_label', 'difficulty', 'topic', 'skill',
        'submitted_at_ist'
    ],
    'answer_evaluations': [
        'interview_id', 'attempt_no', 'candidate_email', 'question_no', 'session_name',
        'question_text', 'candidate_answer', 'expected_answer', 'question_status',
        'topic', 'skill', 'difficulty', 'ai_score', 'technical_score', 'communication_score',
        'confidence_score', 'response_time_score', 'correctness_status', 'ai_feedback',
        'suggestion', 'confidence_reason', 'next_difficulty', 'evaluated_by', 'evaluated_at_ist'
    ],
    'interview_results': [
        'interview_id', 'attempt_no', 'candidate_name', 'candidate_email', 'phone', 'role',
        'detected_skills', 'status', 'total_questions', 'answered_questions', 'skipped_questions',
        'not_attempted_questions', 'self_intro_score', 'aptitude_score', 'technical_score',
        'communication_score', 'confidence_score', 'response_time_score', 'completion_percentage',
        'overall_score', 'ai_recommendation', 'ai_recommendation_reason', 'admin_final_status',
        'admin_note', 'final_recommendation', 'duration', 'started_at_ist', 'ended_at_ist',
        'created_at_ist'
    ]
}

types = {
    'attempt_no': 'INTEGER DEFAULT 1',
    'session_name': 'VARCHAR(255)',
    'detected_skills': 'TEXT',
    'primary_skill': 'VARCHAR(255)',
    'current_difficulty': 'VARCHAR(50) DEFAULT ''Easy''',
    'result_status': 'VARCHAR(50)',
    'ai_recommendation': 'VARCHAR(255)',
    'ai_recommendation_reason': 'TEXT',
    'admin_final_status': 'VARCHAR(255)',
    'admin_note': 'TEXT',
    'admin_status_updated_at_ist': 'VARCHAR(100)',
    'total_questions': 'INTEGER DEFAULT 30',
    'answered_questions': 'INTEGER DEFAULT 0',
    'skipped_questions': 'INTEGER DEFAULT 0',
    'not_attempted_questions': 'INTEGER DEFAULT 0',
    'self_intro_score': 'INTEGER DEFAULT 0',
    'aptitude_score': 'INTEGER DEFAULT 0',
    'technical_score': 'INTEGER DEFAULT 0',
    'communication_score': 'INTEGER DEFAULT 0',
    'confidence_score': 'INTEGER DEFAULT 0',
    'response_time_score': 'INTEGER DEFAULT 0',
    'completion_percentage': 'FLOAT DEFAULT 0.0',
    'overall_score': 'FLOAT DEFAULT 0.0',
    'total_duration_seconds': 'FLOAT DEFAULT 0.0',
    'remaining_time_seconds': 'INTEGER DEFAULT 1800',
    'time_left_at_submit': 'VARCHAR(50)',
    'submitted_early': 'VARCHAR(10) DEFAULT ''No''',
    'started_at_ist': 'VARCHAR(100)',
    'ended_at_ist': 'VARCHAR(100)',
    'interview_id': 'INTEGER',
    'candidate_email': 'VARCHAR(255)',
    'question_no': 'INTEGER',
    'question_text': 'TEXT',
    'question_type': 'VARCHAR(100)',
    'topic': 'VARCHAR(255)',
    'skill': 'VARCHAR(255)',
    'difficulty': 'VARCHAR(50)',
    'expected_answer': 'TEXT',
    'reason_for_selection': 'TEXT',
    'generated_by': 'VARCHAR(100)',
    'generated_at_ist': 'VARCHAR(100)',
    'candidate_answer': 'TEXT',
    'question_status': 'VARCHAR(100)',
    'response_time_seconds': 'FLOAT DEFAULT 0.0',
    'response_time_label': 'VARCHAR(50)',
    'submitted_at_ist': 'VARCHAR(100)',
    'ai_score': 'INTEGER DEFAULT 0',
    'correctness_status': 'VARCHAR(100)',
    'ai_feedback': 'TEXT',
    'suggestion': 'TEXT',
    'confidence_reason': 'TEXT',
    'next_difficulty': 'VARCHAR(50)',
    'evaluated_by': 'VARCHAR(100)',
    'evaluated_at_ist': 'VARCHAR(100)',
    'candidate_name': 'VARCHAR(255)',
    'phone': 'VARCHAR(20)',
    'role': 'VARCHAR(255)',
    'status': 'VARCHAR(100)',
    'final_recommendation': 'TEXT',
    'duration': 'VARCHAR(100)',
    'created_at_ist': 'VARCHAR(100)'
}

output = []
for table, columns in tables.items():
    for col in columns:
        col_type = types.get(col, 'TEXT')
        output.append(f'''                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col}') THEN
                    ALTER TABLE {table} ADD COLUMN {col} {col_type};
                END IF;''')

with open('db.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert before END $$;
insert_pos = content.find('            END $$;')
new_content = content[:insert_pos] + '\n'.join(output) + '\n' + content[insert_pos:]

with open('db.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
