from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import habit  # Import your API logic
from api import auth
app = FastAPI(title="Habit API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable CORS middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (can be restricted for production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Include the habit-related routes
app.include_router(habit.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Habit Tracker API!"}
