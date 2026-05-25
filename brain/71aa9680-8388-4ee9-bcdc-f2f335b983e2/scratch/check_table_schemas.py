import psycopg2

def run():
    try:
        conn = psycopg2.connect(
            host="127.0.0.1",
            port=5432,
            dbname="ai_detection",
            user="postgres",
            password="umarhasan46"
        )
        cur = conn.cursor()
        
        for table in ["answers", "answer_evaluations", "interviews", "results"]:
            cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'")
            cols = cur.fetchall()
            print(f"\nSchema for table: {table}")
            for col in cols:
                print(f"  {col[0]}: {col[1]}")
                
        cur.close()
        conn.close()
    except Exception as e:
        print("Error connecting or querying:", e)

if __name__ == "__main__":
    run()
