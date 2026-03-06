from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth, habit, checkin, recovery, content
from db import init_db, seed_recommended_and_core_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_recommended_and_core_data()
    yield


app = FastAPI(title="Habit API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(habit.router)
app.include_router(checkin.router)
app.include_router(recovery.router)
app.include_router(content.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Habit Tracker API!"}
