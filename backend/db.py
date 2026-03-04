import sqlite3

def create_db():
    connection = sqlite3.connect('habit_tracker.db')
    cursor = connection.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS habits
                      (id INTEGER PRIMARY KEY, name TEXT, progress INTEGER, date TEXT)''')
    connection.commit()
    connection.close()

def add_habit_to_db(name: str, progress: int, date: str):
    connection = sqlite3.connect('habit_tracker.db')
    cursor = connection.cursor()
    cursor.execute("INSERT INTO habits (name, progress, date) VALUES (?, ?, ?)", (name, progress, date))
    connection.commit()
    connection.close()
