from db import get_db_connection

def clean():
    conn = get_db_connection()
    if not conn:
        print("No db connection")
        return
    cur = conn.cursor()
    cur.execute("DELETE FROM notifications WHERE title = 'title' OR event_type = 'event_type' OR message = 'message';")
    conn.commit()
    cur.close()
    conn.close()
    print("Cleaned dummy notifications")

if __name__ == '__main__':
    clean()
