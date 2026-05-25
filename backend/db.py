import psycopg2
from psycopg2 import sql
import psycopg2.extras
from config import Config
from werkzeug.security import generate_password_hash
from datetime import datetime
import pytz
import os

class HybridRow(psycopg2.extras.RealDictRow):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)

class RealDictCursor(psycopg2.extras.RealDictCursor):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.row_factory = HybridRow

def get_ist_time():
    return datetime.now(pytz.timezone('Asia/Kolkata'))

def get_db_connection():
    try:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            print("DATABASE_URL not found")
            return None

        conn = psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print("Database connection error:", e)
        return None

def init_db():
    conn = get_db_connection()
    if not conn:
        return

    cur = conn.cursor()
    try:
        tables = [
            ("users", """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255),
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(20),
                password VARCHAR(255),
                password_hash TEXT,
                role VARCHAR(50) DEFAULT 'user',
                status VARCHAR(50) DEFAULT 'active',
                profile_pic TEXT,
                admin_status VARCHAR(50) DEFAULT 'Pending Review',
                admin_hiring_status VARCHAR(50) DEFAULT 'Pending Review',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("admins", """
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255),
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                password_hash TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("interviews", """
            CREATE TABLE IF NOT EXISTS interviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                user_email VARCHAR(255),
                full_name VARCHAR(255),
                phone VARCHAR(20),
                role_applied VARCHAR(255),
                resume_text TEXT,
                detected_skills TEXT,
                status VARCHAR(50),
                start_time TIMESTAMP WITH TIME ZONE,
                end_time TIMESTAMP WITH TIME ZONE,
                warning_count INTEGER DEFAULT 0,
                attended_count INTEGER DEFAULT 0,
                skipped_count INTEGER DEFAULT 0,
                unanswered_count INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 30,
                final_percentage FLOAT DEFAULT 0,
                confidence_level VARCHAR(50) DEFAULT 'Not Analyzed',
                technical_score INTEGER DEFAULT 0,
                communication_score INTEGER DEFAULT 0,
                suspicious_score INTEGER DEFAULT 0,
                result_status VARCHAR(50),
                termination_reason TEXT,
                camera_status VARCHAR(50) DEFAULT 'inactive',
                audio_status VARCHAR(50) DEFAULT 'inactive',
                face_status VARCHAR(50) DEFAULT 'not detected',
                latest_camera_frame TEXT,
                last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("violations", """
            CREATE TABLE IF NOT EXISTS violations (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                user_email VARCHAR(255),
                violation_type VARCHAR(255),
                message TEXT,
                severity VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("notifications", """
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255),
                interview_id INTEGER,
                title VARCHAR(255),
                message TEXT,
                type VARCHAR(50),
                status VARCHAR(50) DEFAULT 'unread',
                event_type VARCHAR(255),
                target_role VARCHAR(50),
                created_at_ist VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("results", """
            CREATE TABLE IF NOT EXISTS results (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER UNIQUE REFERENCES interviews(id),
                user_email VARCHAR(255),
                full_name VARCHAR(255),
                phone VARCHAR(20),
                role_applied VARCHAR(255),
                detected_skills TEXT,
                status VARCHAR(50),
                warning_count INTEGER,
                attended_count INTEGER,
                skipped_count INTEGER,
                unanswered_count INTEGER,
                technical_score INTEGER,
                communication_score INTEGER,
                confidence_level VARCHAR(50),
                suspicious_score INTEGER,
                final_percentage FLOAT,
                performance_summary TEXT,
                suspicious_summary TEXT,
                result_status VARCHAR(50),
                termination_reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("answers", """
            CREATE TABLE IF NOT EXISTS answers (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                user_email VARCHAR(255),
                question_id INTEGER,
                question_no INTEGER,
                question_text TEXT,
                answer_text TEXT,
                expected_answer TEXT,
                status VARCHAR(50),
                ai_score INTEGER DEFAULT 0,
                correctness_status VARCHAR(100),
                technical_accuracy VARCHAR(100),
                confidence_level VARCHAR(50),
                hesitation_score INTEGER,
                communication_score INTEGER,
                feedback TEXT,
                suggestion TEXT,
                response_time_seconds FLOAT DEFAULT 0,
                evaluated_at_ist VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("proctoring_logs", """
            CREATE TABLE IF NOT EXISTS proctoring_logs (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                user_email VARCHAR(255),
                activity_type VARCHAR(255),
                message TEXT,
                warning_number INTEGER,
                status VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("questions", """
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                question_text TEXT,
                expected_keywords TEXT,
                difficulty VARCHAR(50),
                category VARCHAR(50),
                skill VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("ai_observations", """
            CREATE TABLE IF NOT EXISTS ai_observations (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                user_id INTEGER REFERENCES users(id),
                question_number INTEGER,
                session_name VARCHAR(100),
                timestamp_seconds FLOAT,
                observation_type VARCHAR(100),
                comment TEXT,
                confidence_level VARCHAR(50),
                communication_quality VARCHAR(50),
                hesitation_level VARCHAR(50),
                response_time_seconds FLOAT,
                cheating_alert_level VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("interview_recordings", """
            CREATE TABLE IF NOT EXISTS interview_recordings (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                user_id INTEGER REFERENCES users(id),
                recording_url TEXT,
                start_time TIMESTAMP WITH TIME ZONE,
                end_time TIMESTAMP WITH TIME ZONE,
                duration_seconds FLOAT,
                status VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("reports", """
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER UNIQUE REFERENCES interviews(id),
                user_id INTEGER REFERENCES users(id),
                report_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("interview_ai_logs", """
            CREATE TABLE IF NOT EXISTS interview_ai_logs (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                candidate_name VARCHAR(255),
                candidate_email VARCHAR(255),
                timestamp VARCHAR(50),
                event_type VARCHAR(255),
                message TEXT,
                severity VARCHAR(50),
                score INTEGER,
                indian_time VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("candidate_ai_feedback", """
            CREATE TABLE IF NOT EXISTS candidate_ai_feedback (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER UNIQUE REFERENCES interviews(id),
                candidate_name VARCHAR(255),
                role VARCHAR(255),
                overall_score INTEGER,
                confidence_score INTEGER,
                communication_score INTEGER,
                hesitation_score INTEGER,
                response_time_score INTEGER,
                cheating_alert_count INTEGER,
                final_recommendation TEXT,
                strengths JSONB,
                areas_to_improve JSONB,
                personalized_suggestions JSONB,
                indian_time VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("admin_ai_reports", """
            CREATE TABLE IF NOT EXISTS admin_ai_reports (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER UNIQUE REFERENCES interviews(id),
                candidate_name VARCHAR(255),
                candidate_email VARCHAR(255),
                phone VARCHAR(20),
                role VARCHAR(255),
                duration VARCHAR(100),
                status VARCHAR(50),
                overall_score INTEGER,
                confidence_score INTEGER,
                communication_score INTEGER,
                hesitation_score INTEGER,
                response_time_score INTEGER,
                cheating_alert_count INTEGER,
                final_recommendation TEXT,
                admin_summary TEXT,
                recruiter_decision TEXT,
                indian_time VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("chatbot_messages", """
            CREATE TABLE IF NOT EXISTS chatbot_messages (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255),
                user_role VARCHAR(50),
                page_name VARCHAR(255),
                message TEXT,
                response TEXT,
                created_at_ist VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("proctoring_actions", """
            CREATE TABLE IF NOT EXISTS proctoring_actions (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                candidate_email VARCHAR(255),
                candidate_name VARCHAR(255),
                admin_email VARCHAR(255),
                action_type VARCHAR(100),
                message TEXT,
                reason TEXT,
                created_at_ist VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("interview_sessions", """
            CREATE TABLE IF NOT EXISTS interview_sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id INTEGER,
                resume_id INTEGER,
                target_role VARCHAR(255),
                detected_skills TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50)
            );
            """),
            ("interview_questions", """
            CREATE TABLE IF NOT EXISTS interview_questions (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) REFERENCES interview_sessions(id) ON DELETE CASCADE,
                user_id INTEGER,
                question_number INTEGER,
                question_text TEXT,
                question_type VARCHAR(50),
                skill_tag VARCHAR(255),
                asked_status VARCHAR(50) DEFAULT 'unasked',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("interview_answers", """
            CREATE TABLE IF NOT EXISTS interview_answers (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) REFERENCES interview_sessions(id) ON DELETE CASCADE,
                question_id INTEGER REFERENCES interview_questions(id) ON DELETE CASCADE,
                user_id INTEGER,
                answer_text TEXT,
                score INTEGER,
                technical_score INTEGER,
                communication_score INTEGER,
                confidence_score INTEGER,
                feedback TEXT,
                suggested_improvement TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("question_history", """
            CREATE TABLE IF NOT EXISTS question_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                normalized_question_text TEXT,
                skill_tag VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("answer_evaluations", """
            CREATE TABLE IF NOT EXISTS answer_evaluations (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                candidate_email VARCHAR(255),
                question_no INTEGER,
                question_text TEXT,
                candidate_answer TEXT,
                expected_answer TEXT,
                difficulty VARCHAR(50),
                ai_score INTEGER,
                technical_score INTEGER,
                communication_score INTEGER,
                confidence_score INTEGER,
                correctness_status VARCHAR(100),
                question_status VARCHAR(100),
                ai_feedback TEXT,
                suggestion TEXT,
                confidence_reason TEXT,
                evaluated_by VARCHAR(50),
                evaluated_at_ist VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("interview_results", """
            CREATE TABLE IF NOT EXISTS interview_results (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER UNIQUE REFERENCES interviews(id),
                candidate_email VARCHAR(255),
                total_questions INTEGER,
                answered_questions INTEGER,
                skipped_questions INTEGER,
                not_attempted_questions INTEGER,
                completion_percentage FLOAT,
                performance_score FLOAT,
                overall_score FLOAT,
                technical_score INTEGER,
                communication_score INTEGER,
                confidence_score INTEGER,
                confidence_level VARCHAR(50),
                final_recommendation TEXT,
                created_at_ist VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("proctoring_sessions", """
            CREATE TABLE IF NOT EXISTS proctoring_sessions (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                user_email VARCHAR(255),
                start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP WITH TIME ZONE,
                status VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("proctoring_flags", """
            CREATE TABLE IF NOT EXISTS proctoring_flags (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER REFERENCES interviews(id),
                user_email VARCHAR(255),
                flag_type VARCHAR(100),
                message TEXT,
                severity VARCHAR(50),
                flagged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("personality_reports", """
            CREATE TABLE IF NOT EXISTS personality_reports (
                id SERIAL PRIMARY KEY,
                interview_id INTEGER UNIQUE REFERENCES interviews(id),
                candidate_email VARCHAR(255),
                personality_type VARCHAR(100),
                confidence_level VARCHAR(50),
                communication_style VARCHAR(100),
                strengths TEXT,
                areas_to_improve TEXT,
                summary TEXT,
                recruiter_notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """),
            ("resumes", """
            CREATE TABLE IF NOT EXISTS resumes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                interview_id INTEGER UNIQUE,
                user_email VARCHAR(255),
                filename TEXT,
                file_path TEXT,
                raw_text TEXT,
                parsed_skills TEXT DEFAULT '',
                resume_summary TEXT DEFAULT '',
                skills TEXT DEFAULT '',
                strengths TEXT DEFAULT '',
                weaknesses TEXT DEFAULT '',
                education TEXT DEFAULT '',
                experience TEXT DEFAULT '',
                projects TEXT DEFAULT '',
                ats_score INTEGER DEFAULT 0,
                role_match INTEGER DEFAULT 0,
                experience_score INTEGER DEFAULT 0,
                project_weight INTEGER DEFAULT 0,
                skills_weight INTEGER DEFAULT 0,
                education_match INTEGER DEFAULT 0,
                matched_skills TEXT DEFAULT '',
                missing_skills TEXT DEFAULT '',
                recommendation TEXT DEFAULT '',
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)
        ]

        for name, query in tables:
            cur.execute(query)

        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);")
        cur.execute("ALTER TABLE admins ADD COLUMN IF NOT EXISTS password VARCHAR(255);")
        cur.execute("ALTER TABLE interviews ADD COLUMN IF NOT EXISTS parsed_resume JSONB;")


        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN
                    ALTER TABLE users ADD COLUMN name TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
                    ALTER TABLE users ADD COLUMN phone TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
                    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_pic') THEN
                    ALTER TABLE users ADD COLUMN profile_pic TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='admin_status') THEN
                    ALTER TABLE users ADD COLUMN admin_status VARCHAR(50) DEFAULT 'Pending Review';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='admin_hiring_status') THEN
                    ALTER TABLE users ADD COLUMN admin_hiring_status VARCHAR(50) DEFAULT 'Pending Review';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_at') THEN
                    ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='name') THEN
                    ALTER TABLE admins ADD COLUMN name TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='phone') THEN
                    ALTER TABLE admins ADD COLUMN phone TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='role') THEN
                    ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'admin';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='profile_pic') THEN
                    ALTER TABLE admins ADD COLUMN profile_pic TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='target_role') THEN
                    ALTER TABLE notifications ADD COLUMN target_role VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='event_type') THEN
                    ALTER TABLE notifications ADD COLUMN event_type VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='created_at_ist') THEN
                    ALTER TABLE notifications ADD COLUMN created_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='current_question_no') THEN
                    ALTER TABLE interviews ADD COLUMN current_question_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='current_difficulty') THEN
                    ALTER TABLE interviews ADD COLUMN current_difficulty VARCHAR(50) DEFAULT 'Easy';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='answered_questions') THEN
                    ALTER TABLE interviews ADD COLUMN answered_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='skipped_questions') THEN
                    ALTER TABLE interviews ADD COLUMN skipped_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='not_attempted_questions') THEN
                    ALTER TABLE interviews ADD COLUMN not_attempted_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='completion_percentage') THEN
                    ALTER TABLE interviews ADD COLUMN completion_percentage FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='performance_score') THEN
                    ALTER TABLE interviews ADD COLUMN performance_score FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='overall_score') THEN
                    ALTER TABLE interviews ADD COLUMN overall_score FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='confidence_score') THEN
                    ALTER TABLE interviews ADD COLUMN confidence_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ended_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN ended_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='duration') THEN
                    ALTER TABLE interviews ADD COLUMN duration VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='final_recommendation') THEN
                    ALTER TABLE interviews ADD COLUMN final_recommendation TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='interview_id') THEN
                    ALTER TABLE answers ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='user_email') THEN
                    ALTER TABLE answers ADD COLUMN user_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_id') THEN
                    ALTER TABLE answers ADD COLUMN question_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_no') THEN
                    ALTER TABLE answers ADD COLUMN question_no INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_text') THEN
                    ALTER TABLE answers ADD COLUMN question_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='answer_text') THEN
                    ALTER TABLE answers ADD COLUMN answer_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='expected_answer') THEN
                    ALTER TABLE answers ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='status') THEN
                    ALTER TABLE answers ADD COLUMN status VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='ai_score') THEN
                    ALTER TABLE answers ADD COLUMN ai_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='correctness_status') THEN
                    ALTER TABLE answers ADD COLUMN correctness_status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='technical_accuracy') THEN
                    ALTER TABLE answers ADD COLUMN technical_accuracy VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='confidence_level') THEN
                    ALTER TABLE answers ADD COLUMN confidence_level VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='hesitation_score') THEN
                    ALTER TABLE answers ADD COLUMN hesitation_score INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='communication_score') THEN
                    ALTER TABLE answers ADD COLUMN communication_score INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='feedback') THEN
                    ALTER TABLE answers ADD COLUMN feedback TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='suggestion') THEN
                    ALTER TABLE answers ADD COLUMN suggestion TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='response_time_seconds') THEN
                    ALTER TABLE answers ADD COLUMN response_time_seconds FLOAT DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='evaluated_at_ist') THEN
                    ALTER TABLE answers ADD COLUMN evaluated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='created_at') THEN
                    ALTER TABLE answers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_status') THEN
                    ALTER TABLE answers ADD COLUMN question_status TEXT DEFAULT 'Answered';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='submitted_at_ist') THEN
                    ALTER TABLE answers ADD COLUMN submitted_at_ist TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='difficulty') THEN
                    ALTER TABLE answers ADD COLUMN difficulty TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='topic') THEN
                    ALTER TABLE answers ADD COLUMN topic TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='candidate_email') THEN
                    ALTER TABLE answers ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='candidate_answer') THEN
                    ALTER TABLE answers ADD COLUMN candidate_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='answer') THEN
                    ALTER TABLE answers ADD COLUMN answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='topic') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN topic TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='next_difficulty') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN next_difficulty TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='candidate_name') THEN
                    ALTER TABLE interview_results ADD COLUMN candidate_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='phone') THEN
                    ALTER TABLE interview_results ADD COLUMN phone VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='role') THEN
                    ALTER TABLE interview_results ADD COLUMN role VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='status') THEN
                    ALTER TABLE interview_results ADD COLUMN status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='confidence_summary') THEN
                    ALTER TABLE interview_results ADD COLUMN confidence_summary TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='response_time_score') THEN
                    ALTER TABLE interview_results ADD COLUMN response_time_score FLOAT DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='hesitation_score') THEN
                    ALTER TABLE interview_results ADD COLUMN hesitation_score FLOAT DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='cheating_alert_count') THEN
                    ALTER TABLE interview_results ADD COLUMN cheating_alert_count INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='duration') THEN
                    ALTER TABLE interview_results ADD COLUMN duration VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='started_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN started_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ended_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN ended_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='attempt_no') THEN
                    ALTER TABLE interviews ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='detected_skills') THEN
                    ALTER TABLE interviews ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='primary_skill') THEN
                    ALTER TABLE interviews ADD COLUMN primary_skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='current_difficulty') THEN
                    ALTER TABLE interviews ADD COLUMN current_difficulty VARCHAR(50) DEFAULT 'Easy';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_recommendation') THEN
                    ALTER TABLE interviews ADD COLUMN ai_recommendation VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_recommendation_reason') THEN
                    ALTER TABLE interviews ADD COLUMN ai_recommendation_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_hiring_status') THEN
                    ALTER TABLE interviews ADD COLUMN admin_hiring_status VARCHAR(255) DEFAULT 'Pending Review';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_note') THEN
                    ALTER TABLE interviews ADD COLUMN admin_note TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_status_updated_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN admin_status_updated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='total_questions') THEN
                    ALTER TABLE interviews ADD COLUMN total_questions INTEGER DEFAULT 30;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='easy_questions') THEN
                    ALTER TABLE interviews ADD COLUMN easy_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='medium_questions') THEN
                    ALTER TABLE interviews ADD COLUMN medium_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='difficult_questions') THEN
                    ALTER TABLE interviews ADD COLUMN difficult_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='total_duration_seconds') THEN
                    ALTER TABLE interviews ADD COLUMN total_duration_seconds FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='remaining_time_seconds') THEN
                    ALTER TABLE interviews ADD COLUMN remaining_time_seconds INTEGER DEFAULT 1800;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='average_response_time') THEN
                    ALTER TABLE interviews ADD COLUMN average_response_time FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='slow_answers_count') THEN
                    ALTER TABLE interviews ADD COLUMN slow_answers_count INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='fast_answers_count') THEN
                    ALTER TABLE interviews ADD COLUMN fast_answers_count INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='attempt_no') THEN
                    ALTER TABLE interview_questions ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='candidate_email') THEN
                    ALTER TABLE interview_questions ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='skill') THEN
                    ALTER TABLE interview_questions ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='generated_by') THEN
                    ALTER TABLE interview_questions ADD COLUMN generated_by VARCHAR(100) DEFAULT 'Gemini AI';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='attempt_no') THEN
                    ALTER TABLE answers ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='expected_answer') THEN
                    ALTER TABLE answers ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='response_time_label') THEN
                    ALTER TABLE answers ADD COLUMN response_time_label VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='skill') THEN
                    ALTER TABLE answers ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='attempt_no') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='response_time_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN response_time_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='next_difficulty') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN next_difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='skill') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='attempt_no') THEN
                    ALTER TABLE interview_results ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='detected_skills') THEN
                    ALTER TABLE interview_results ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='easy_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN easy_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='medium_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN medium_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='difficult_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN difficult_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='total_duration_seconds') THEN
                    ALTER TABLE interview_results ADD COLUMN total_duration_seconds FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='average_response_time') THEN
                    ALTER TABLE interview_results ADD COLUMN average_response_time FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='slow_answers_count') THEN
                    ALTER TABLE interview_results ADD COLUMN slow_answers_count INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='fast_answers_count') THEN
                    ALTER TABLE interview_results ADD COLUMN fast_answers_count INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ai_recommendation') THEN
                    ALTER TABLE interview_results ADD COLUMN ai_recommendation VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ai_recommendation_reason') THEN
                    ALTER TABLE interview_results ADD COLUMN ai_recommendation_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='admin_hiring_status') THEN
                    ALTER TABLE interview_results ADD COLUMN admin_hiring_status VARCHAR(255) DEFAULT 'Pending Review';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='admin_note') THEN
                    ALTER TABLE interview_results ADD COLUMN admin_note TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='time_left_at_submit') THEN
                    ALTER TABLE interviews ADD COLUMN time_left_at_submit VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='submitted_early') THEN
                    ALTER TABLE interviews ADD COLUMN submitted_early VARCHAR(10) DEFAULT 'No';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_start_time_ist') THEN
                    ALTER TABLE answers ADD COLUMN question_start_time_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_end_time_ist') THEN
                    ALTER TABLE answers ADD COLUMN question_end_time_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='autosaved_answer') THEN
                    ALTER TABLE answers ADD COLUMN autosaved_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='time_left_at_submit') THEN
                    ALTER TABLE interview_results ADD COLUMN time_left_at_submit VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='submitted_early') THEN
                    ALTER TABLE interview_results ADD COLUMN submitted_early VARCHAR(10) DEFAULT 'No';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='time_left_at_submit') THEN
                    ALTER TABLE results ADD COLUMN time_left_at_submit VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='submitted_early') THEN
                    ALTER TABLE results ADD COLUMN submitted_early VARCHAR(10) DEFAULT 'No';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='total_duration_seconds') THEN
                    ALTER TABLE results ADD COLUMN total_duration_seconds FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='average_response_time') THEN
                    ALTER TABLE results ADD COLUMN average_response_time FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='slow_answers_count') THEN
                    ALTER TABLE results ADD COLUMN slow_answers_count INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='fast_answers_count') THEN
                    ALTER TABLE results ADD COLUMN fast_answers_count INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='attempt_no') THEN
                    ALTER TABLE interviews ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='session_name') THEN
                    ALTER TABLE interviews ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='detected_skills') THEN
                    ALTER TABLE interviews ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='primary_skill') THEN
                    ALTER TABLE interviews ADD COLUMN primary_skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='current_difficulty') THEN
                    ALTER TABLE interviews ADD COLUMN current_difficulty VARCHAR(50) DEFAULT Easy;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='result_status') THEN
                    ALTER TABLE interviews ADD COLUMN result_status VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_recommendation') THEN
                    ALTER TABLE interviews ADD COLUMN ai_recommendation VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_recommendation_reason') THEN
                    ALTER TABLE interviews ADD COLUMN ai_recommendation_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_final_status') THEN
                    ALTER TABLE interviews ADD COLUMN admin_final_status VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_note') THEN
                    ALTER TABLE interviews ADD COLUMN admin_note TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_status_updated_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN admin_status_updated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='total_questions') THEN
                    ALTER TABLE interviews ADD COLUMN total_questions INTEGER DEFAULT 30;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='answered_questions') THEN
                    ALTER TABLE interviews ADD COLUMN answered_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='skipped_questions') THEN
                    ALTER TABLE interviews ADD COLUMN skipped_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='not_attempted_questions') THEN
                    ALTER TABLE interviews ADD COLUMN not_attempted_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='self_intro_score') THEN
                    ALTER TABLE interviews ADD COLUMN self_intro_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='aptitude_score') THEN
                    ALTER TABLE interviews ADD COLUMN aptitude_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='technical_score') THEN
                    ALTER TABLE interviews ADD COLUMN technical_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='communication_score') THEN
                    ALTER TABLE interviews ADD COLUMN communication_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='confidence_score') THEN
                    ALTER TABLE interviews ADD COLUMN confidence_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='response_time_score') THEN
                    ALTER TABLE interviews ADD COLUMN response_time_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='completion_percentage') THEN
                    ALTER TABLE interviews ADD COLUMN completion_percentage FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='overall_score') THEN
                    ALTER TABLE interviews ADD COLUMN overall_score FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='total_duration_seconds') THEN
                    ALTER TABLE interviews ADD COLUMN total_duration_seconds FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='remaining_time_seconds') THEN
                    ALTER TABLE interviews ADD COLUMN remaining_time_seconds INTEGER DEFAULT 1800;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='time_left_at_submit') THEN
                    ALTER TABLE interviews ADD COLUMN time_left_at_submit VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='submitted_early') THEN
                    ALTER TABLE interviews ADD COLUMN submitted_early VARCHAR(10) DEFAULT No;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='started_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN started_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ended_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN ended_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='interview_id') THEN
                    ALTER TABLE interview_questions ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='attempt_no') THEN
                    ALTER TABLE interview_questions ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='candidate_email') THEN
                    ALTER TABLE interview_questions ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='question_no') THEN
                    ALTER TABLE interview_questions ADD COLUMN question_no INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='session_name') THEN
                    ALTER TABLE interview_questions ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='question_text') THEN
                    ALTER TABLE interview_questions ADD COLUMN question_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='question_type') THEN
                    ALTER TABLE interview_questions ADD COLUMN question_type VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='topic') THEN
                    ALTER TABLE interview_questions ADD COLUMN topic VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='skill') THEN
                    ALTER TABLE interview_questions ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='difficulty') THEN
                    ALTER TABLE interview_questions ADD COLUMN difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='expected_answer') THEN
                    ALTER TABLE interview_questions ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='reason_for_selection') THEN
                    ALTER TABLE interview_questions ADD COLUMN reason_for_selection TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='generated_by') THEN
                    ALTER TABLE interview_questions ADD COLUMN generated_by VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='generated_at_ist') THEN
                    ALTER TABLE interview_questions ADD COLUMN generated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='interview_id') THEN
                    ALTER TABLE answers ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='attempt_no') THEN
                    ALTER TABLE answers ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='candidate_email') THEN
                    ALTER TABLE answers ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_no') THEN
                    ALTER TABLE answers ADD COLUMN question_no INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='session_name') THEN
                    ALTER TABLE answers ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_text') THEN
                    ALTER TABLE answers ADD COLUMN question_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='candidate_answer') THEN
                    ALTER TABLE answers ADD COLUMN candidate_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='expected_answer') THEN
                    ALTER TABLE answers ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_status') THEN
                    ALTER TABLE answers ADD COLUMN question_status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='response_time_seconds') THEN
                    ALTER TABLE answers ADD COLUMN response_time_seconds FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='response_time_label') THEN
                    ALTER TABLE answers ADD COLUMN response_time_label VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='difficulty') THEN
                    ALTER TABLE answers ADD COLUMN difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='topic') THEN
                    ALTER TABLE answers ADD COLUMN topic VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='skill') THEN
                    ALTER TABLE answers ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='submitted_at_ist') THEN
                    ALTER TABLE answers ADD COLUMN submitted_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='interview_id') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='attempt_no') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='candidate_email') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='question_no') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN question_no INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='session_name') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='question_text') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN question_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='candidate_answer') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN candidate_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='expected_answer') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='question_status') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN question_status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='topic') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN topic VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='skill') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='difficulty') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='ai_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN ai_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='technical_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN technical_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='communication_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN communication_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='confidence_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN confidence_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='response_time_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN response_time_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='correctness_status') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN correctness_status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='ai_feedback') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN ai_feedback TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='suggestion') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN suggestion TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='confidence_reason') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN confidence_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='next_difficulty') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN next_difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='evaluated_by') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN evaluated_by VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='evaluated_at_ist') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN evaluated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='interview_id') THEN
                    ALTER TABLE interview_results ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='attempt_no') THEN
                    ALTER TABLE interview_results ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='candidate_name') THEN
                    ALTER TABLE interview_results ADD COLUMN candidate_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='candidate_email') THEN
                    ALTER TABLE interview_results ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='phone') THEN
                    ALTER TABLE interview_results ADD COLUMN phone VARCHAR(20);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='role') THEN
                    ALTER TABLE interview_results ADD COLUMN role VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='detected_skills') THEN
                    ALTER TABLE interview_results ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='status') THEN
                    ALTER TABLE interview_results ADD COLUMN status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='total_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN total_questions INTEGER DEFAULT 30;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='answered_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN answered_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='skipped_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN skipped_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='not_attempted_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN not_attempted_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='self_intro_score') THEN
                    ALTER TABLE interview_results ADD COLUMN self_intro_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='aptitude_score') THEN
                    ALTER TABLE interview_results ADD COLUMN aptitude_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='technical_score') THEN
                    ALTER TABLE interview_results ADD COLUMN technical_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='communication_score') THEN
                    ALTER TABLE interview_results ADD COLUMN communication_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='confidence_score') THEN
                    ALTER TABLE interview_results ADD COLUMN confidence_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='response_time_score') THEN
                    ALTER TABLE interview_results ADD COLUMN response_time_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='completion_percentage') THEN
                    ALTER TABLE interview_results ADD COLUMN completion_percentage FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='overall_score') THEN
                    ALTER TABLE interview_results ADD COLUMN overall_score FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ai_recommendation') THEN
                    ALTER TABLE interview_results ADD COLUMN ai_recommendation VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ai_recommendation_reason') THEN
                    ALTER TABLE interview_results ADD COLUMN ai_recommendation_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='admin_final_status') THEN
                    ALTER TABLE interview_results ADD COLUMN admin_final_status VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='admin_note') THEN
                    ALTER TABLE interview_results ADD COLUMN admin_note TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='final_recommendation') THEN
                    ALTER TABLE interview_results ADD COLUMN final_recommendation TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='duration') THEN
                    ALTER TABLE interview_results ADD COLUMN duration VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='started_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN started_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ended_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN ended_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='created_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN created_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='attempt_no') THEN
                    ALTER TABLE interviews ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='session_name') THEN
                    ALTER TABLE interviews ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='detected_skills') THEN
                    ALTER TABLE interviews ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='primary_skill') THEN
                    ALTER TABLE interviews ADD COLUMN primary_skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='secondary_skills') THEN
                    ALTER TABLE interviews ADD COLUMN secondary_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='role_detected') THEN
                    ALTER TABLE interviews ADD COLUMN role_detected VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='current_difficulty') THEN
                    ALTER TABLE interviews ADD COLUMN current_difficulty VARCHAR(50) DEFAULT Easy;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='result_status') THEN
                    ALTER TABLE interviews ADD COLUMN result_status VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_recommendation') THEN
                    ALTER TABLE interviews ADD COLUMN ai_recommendation VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_recommendation_reason') THEN
                    ALTER TABLE interviews ADD COLUMN ai_recommendation_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_final_status') THEN
                    ALTER TABLE interviews ADD COLUMN admin_final_status VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_note') THEN
                    ALTER TABLE interviews ADD COLUMN admin_note TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_status_updated_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN admin_status_updated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='total_questions') THEN
                    ALTER TABLE interviews ADD COLUMN total_questions INTEGER DEFAULT 30;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='answered_questions') THEN
                    ALTER TABLE interviews ADD COLUMN answered_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='skipped_questions') THEN
                    ALTER TABLE interviews ADD COLUMN skipped_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='not_attempted_questions') THEN
                    ALTER TABLE interviews ADD COLUMN not_attempted_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='self_intro_score') THEN
                    ALTER TABLE interviews ADD COLUMN self_intro_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='aptitude_score') THEN
                    ALTER TABLE interviews ADD COLUMN aptitude_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='technical_score') THEN
                    ALTER TABLE interviews ADD COLUMN technical_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='communication_score') THEN
                    ALTER TABLE interviews ADD COLUMN communication_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='confidence_score') THEN
                    ALTER TABLE interviews ADD COLUMN confidence_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='response_time_score') THEN
                    ALTER TABLE interviews ADD COLUMN response_time_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='completion_percentage') THEN
                    ALTER TABLE interviews ADD COLUMN completion_percentage FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='overall_score') THEN
                    ALTER TABLE interviews ADD COLUMN overall_score FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='total_duration_seconds') THEN
                    ALTER TABLE interviews ADD COLUMN total_duration_seconds FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='remaining_time_seconds') THEN
                    ALTER TABLE interviews ADD COLUMN remaining_time_seconds INTEGER DEFAULT 1800;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='time_left_at_submit') THEN
                    ALTER TABLE interviews ADD COLUMN time_left_at_submit VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='submitted_early') THEN
                    ALTER TABLE interviews ADD COLUMN submitted_early VARCHAR(10) DEFAULT No;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='started_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN started_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ended_at_ist') THEN
                    ALTER TABLE interviews ADD COLUMN ended_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='interview_id') THEN
                    ALTER TABLE interview_questions ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='attempt_no') THEN
                    ALTER TABLE interview_questions ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='candidate_email') THEN
                    ALTER TABLE interview_questions ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='question_no') THEN
                    ALTER TABLE interview_questions ADD COLUMN question_no INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='session_name') THEN
                    ALTER TABLE interview_questions ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='question_text') THEN
                    ALTER TABLE interview_questions ADD COLUMN question_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='question_type') THEN
                    ALTER TABLE interview_questions ADD COLUMN question_type VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='topic') THEN
                    ALTER TABLE interview_questions ADD COLUMN topic VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='skill') THEN
                    ALTER TABLE interview_questions ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='difficulty') THEN
                    ALTER TABLE interview_questions ADD COLUMN difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='expected_answer') THEN
                    ALTER TABLE interview_questions ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='reason_for_selection') THEN
                    ALTER TABLE interview_questions ADD COLUMN reason_for_selection TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='generated_by') THEN
                    ALTER TABLE interview_questions ADD COLUMN generated_by VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_questions' AND column_name='generated_at_ist') THEN
                    ALTER TABLE interview_questions ADD COLUMN generated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='interview_id') THEN
                    ALTER TABLE answers ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='attempt_no') THEN
                    ALTER TABLE answers ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='candidate_email') THEN
                    ALTER TABLE answers ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_no') THEN
                    ALTER TABLE answers ADD COLUMN question_no INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='session_name') THEN
                    ALTER TABLE answers ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_text') THEN
                    ALTER TABLE answers ADD COLUMN question_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='candidate_answer') THEN
                    ALTER TABLE answers ADD COLUMN candidate_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='expected_answer') THEN
                    ALTER TABLE answers ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='question_status') THEN
                    ALTER TABLE answers ADD COLUMN question_status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='response_time_seconds') THEN
                    ALTER TABLE answers ADD COLUMN response_time_seconds FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='response_time_label') THEN
                    ALTER TABLE answers ADD COLUMN response_time_label VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='difficulty') THEN
                    ALTER TABLE answers ADD COLUMN difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='topic') THEN
                    ALTER TABLE answers ADD COLUMN topic VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='skill') THEN
                    ALTER TABLE answers ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answers' AND column_name='submitted_at_ist') THEN
                    ALTER TABLE answers ADD COLUMN submitted_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='interview_id') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='attempt_no') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='candidate_email') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='question_no') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN question_no INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='session_name') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN session_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='question_text') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN question_text TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='candidate_answer') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN candidate_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='expected_answer') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN expected_answer TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='question_status') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN question_status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='topic') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN topic VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='skill') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN skill VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='difficulty') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='ai_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN ai_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='technical_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN technical_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='communication_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN communication_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='confidence_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN confidence_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='response_time_score') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN response_time_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='correctness_status') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN correctness_status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='ai_feedback') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN ai_feedback TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='suggestion') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN suggestion TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='confidence_reason') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN confidence_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='next_difficulty') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN next_difficulty VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='evaluated_by') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN evaluated_by VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='answer_evaluations' AND column_name='evaluated_at_ist') THEN
                    ALTER TABLE answer_evaluations ADD COLUMN evaluated_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='interview_id') THEN
                    ALTER TABLE interview_results ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='attempt_no') THEN
                    ALTER TABLE interview_results ADD COLUMN attempt_no INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='candidate_name') THEN
                    ALTER TABLE interview_results ADD COLUMN candidate_name VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='candidate_email') THEN
                    ALTER TABLE interview_results ADD COLUMN candidate_email VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='phone') THEN
                    ALTER TABLE interview_results ADD COLUMN phone VARCHAR(20);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='role') THEN
                    ALTER TABLE interview_results ADD COLUMN role VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='detected_skills') THEN
                    ALTER TABLE interview_results ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='status') THEN
                    ALTER TABLE interview_results ADD COLUMN status VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='total_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN total_questions INTEGER DEFAULT 30;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='answered_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN answered_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='skipped_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN skipped_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='not_attempted_questions') THEN
                    ALTER TABLE interview_results ADD COLUMN not_attempted_questions INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='self_intro_score') THEN
                    ALTER TABLE interview_results ADD COLUMN self_intro_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='aptitude_score') THEN
                    ALTER TABLE interview_results ADD COLUMN aptitude_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='technical_score') THEN
                    ALTER TABLE interview_results ADD COLUMN technical_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='communication_score') THEN
                    ALTER TABLE interview_results ADD COLUMN communication_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='confidence_score') THEN
                    ALTER TABLE interview_results ADD COLUMN confidence_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='response_time_score') THEN
                    ALTER TABLE interview_results ADD COLUMN response_time_score INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='completion_percentage') THEN
                    ALTER TABLE interview_results ADD COLUMN completion_percentage FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='overall_score') THEN
                    ALTER TABLE interview_results ADD COLUMN overall_score FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ai_recommendation') THEN
                    ALTER TABLE interview_results ADD COLUMN ai_recommendation VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ai_recommendation_reason') THEN
                    ALTER TABLE interview_results ADD COLUMN ai_recommendation_reason TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='admin_final_status') THEN
                    ALTER TABLE interview_results ADD COLUMN admin_final_status VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='admin_note') THEN
                    ALTER TABLE interview_results ADD COLUMN admin_note TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='final_recommendation') THEN
                    ALTER TABLE interview_results ADD COLUMN final_recommendation TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='duration') THEN
                    ALTER TABLE interview_results ADD COLUMN duration VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='started_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN started_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='ended_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN ended_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_results' AND column_name='created_at_ist') THEN
                    ALTER TABLE interview_results ADD COLUMN created_at_ist VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='detected_skills') THEN
                    ALTER TABLE interviews ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='detected_skills') THEN
                    ALTER TABLE results ADD COLUMN detected_skills TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='ai_recommendation') THEN
                    ALTER TABLE results ADD COLUMN ai_recommendation VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='results' AND column_name='final_status') THEN
                    ALTER TABLE results ADD COLUMN final_status VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_summary') THEN
                    ALTER TABLE interviews ADD COLUMN ai_summary TEXT DEFAULT '';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='ai_suggestions') THEN
                    ALTER TABLE interviews ADD COLUMN ai_suggestions TEXT DEFAULT '';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='admin_status') THEN
                    ALTER TABLE interviews ADD COLUMN admin_status TEXT DEFAULT 'Pending Review';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='timer_seconds') THEN
                    ALTER TABLE interviews ADD COLUMN timer_seconds INTEGER DEFAULT 1800;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='score_overall') THEN
                    ALTER TABLE interviews ADD COLUMN score_overall FLOAT DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='risk_level') THEN
                    ALTER TABLE interviews ADD COLUMN risk_level TEXT DEFAULT 'Low';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='started_at') THEN
                    ALTER TABLE interviews ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interviews' AND column_name='completed_at') THEN
                    ALTER TABLE interviews ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
                    ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
                    ALTER TABLE notifications ADD COLUMN user_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resumes' AND column_name='interview_id') THEN
                    ALTER TABLE resumes ADD COLUMN interview_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resumes' AND column_name='parsed_skills') THEN
                    ALTER TABLE resumes ADD COLUMN parsed_skills TEXT DEFAULT '';
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resumes' AND column_name='interview_id') THEN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name WHERE tc.table_name = 'resumes' AND ccu.column_name = 'interview_id' AND tc.constraint_type = 'UNIQUE') THEN
                        ALTER TABLE resumes ADD CONSTRAINT resumes_interview_id_key UNIQUE (interview_id);
                    END IF;
                END IF;
            END $$;
            ALTER TABLE interviews ALTER COLUMN ai_summary SET DEFAULT '';
            ALTER TABLE interviews ALTER COLUMN ai_suggestions SET DEFAULT '';
            UPDATE interviews SET ai_summary = '' WHERE ai_summary IS NULL;
            UPDATE interviews SET ai_suggestions = '' WHERE ai_suggestions IS NULL;
        """)

        cur.execute("SELECT email FROM admins WHERE email = %s", ('admin@gmail.com',))
        admin_data = cur.fetchone()
        hashed_pw = generate_password_hash('admin123')
        if not admin_data:
            cur.execute("INSERT INTO admins (full_name, name, email, password, password_hash, role) VALUES (%s, %s, %s, %s, %s, %s)",
                        ('Admin', 'Admin', 'admin@gmail.com', 'admin123', hashed_pw, 'admin'))
        else:
            cur.execute("UPDATE admins SET password = %s, password_hash = %s WHERE email = %s",
                        ('admin123', hashed_pw, 'admin@gmail.com'))

        cur.execute("SELECT COUNT(*) FROM questions")
        if cur.fetchone()[0] == 0:
            q_data = [
                ("Please introduce yourself and walk us through your professional journey.", None, "Medium", "Introduction", None),
                ("What are your core strengths and how have they helped you in your previous roles?", None, "Medium", "Introduction", None),
                ("Can you describe a significant professional challenge you faced and how you overcame it?", None, "Hard", "Introduction", None),
                ("What motivates you to perform your best at work every day?", None, "Easy", "Introduction", None),
                ("Where do you see yourself professionally in the next five years?", None, "Medium", "Introduction", None),
                ("Why are you interested in this specific role and our organization?", None, "Medium", "Introduction", None),
                ("How do you handle high-pressure situations or tight deadlines?", None, "Hard", "Introduction", None),
                ("Tell us about a time you had to work effectively in a team with diverse perspectives.", None, "Medium", "Introduction", None),
                ("What is your proudest professional achievement to date?", None, "Medium", "Introduction", None),
                ("Do you have any specific career goals you are currently working towards?", None, "Easy", "Introduction", None),
                ("If a car travels at 60 km/h, how far will it travel in 45 minutes?", "45 km", "Easy", "Aptitude", None),
                ("A sum of money doubles itself in 8 years at simple interest. What is the rate of interest?", "12.5%", "Medium", "Aptitude", None),
                ("What is the next number in the series: 2, 6, 12, 20, 30, ...?", "42", "Easy", "Aptitude", None),
                ("The ratio of two numbers is 3:4. If their sum is 70, find the larger number.", "40", "Easy", "Aptitude", None),
                ("If 5 workers can build a wall in 12 days, how many days will 10 workers take?", "6 days", "Easy", "Aptitude", None),
                ("Find the missing number: 1, 4, 9, 16, ?, 36.", "25", "Easy", "Aptitude", None),
                ("A shopkeeper marks his goods at 20% above cost price and allows a discount of 10%. What is his gain percentage?", "8%", "Medium", "Aptitude", None),
                ("In a certain code, 'APPLE' is written as 'ELPPA'. How is 'MANGO' written?", "OGNAM", "Easy", "Aptitude", None),
                ("What is the average of first five prime numbers?", "5.6", "Medium", "Aptitude", None),
                ("If today is Monday, what day will it be after 61 days?", "Saturday", "Medium", "Aptitude", None),
                ("Explain the difference between '==' and '===' in JavaScript.", "equality, type", "Medium", "Technical", "JavaScript"),
                ("What is a closure in JavaScript and can you provide an example?", "scope, function", "Hard", "Technical", "JavaScript"),
                ("Explain the concept of Virtual DOM in React.", "performance, reconciliation", "Medium", "Technical", "React"),
                ("What are the different data types available in Python?", "list, dict, tuple, set", "Easy", "Technical", "Python"),
                ("How do you handle exceptions in Python using try-except blocks?", "error handling", "Medium", "Technical", "Python"),
                ("Explain the difference between a list and a tuple in Python.", "immutable, mutable", "Easy", "Technical", "Python"),
                ("What is an Abstract Class in Java and how is it different from an Interface?", "inheritance, implementation", "Hard", "Technical", "Java"),
                ("Explain the concept of Primary Key and Foreign Key in SQL.", "relationships, unique", "Easy", "Technical", "SQL"),
                ("What is normalization in databases and why is it important?", "redundancy, integrity", "Medium", "Technical", "SQL"),
                ("Explain the basic structure of a Flask application.", "routing, app", "Medium", "Technical", "Flask"),
                ("How does the 'useEffect' hook work in React?", "side effects, lifecycle", "Medium", "Technical", "React"),
                ("What is the purpose of 'pip' in Python?", "package manager", "Easy", "Technical", "Python"),
                ("What is the difference between GET and POST methods?", "request, parameters", "Easy", "Technical", "General IT")
            ]
            cur.executemany("""
                INSERT INTO questions (question_text, expected_keywords, difficulty, category, skill)
                VALUES (%s, %s, %s, %s, %s)
            """, q_data)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews (user_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_answers_interview_id ON answers (interview_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_violations_interview_id ON violations (interview_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_proctoring_flags_interview_id ON proctoring_flags (interview_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interviews_user_email ON interviews (user_email);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews (status);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews (created_at DESC);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_proctoring_logs_interview_id ON proctoring_logs (interview_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications (user_email);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_answer_evaluations_interview_id ON answer_evaluations (interview_id);")

        conn.commit()
    except Exception as e:
        
        conn.rollback()
    finally:
        cur.close()
        conn.close()


