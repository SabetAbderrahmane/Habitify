from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    analytics,
    auth,
    checkin,
    content,
    export_data,
    habit,
    insights,
    notifications,
    nudges,
    predictions,
    profile,
    recovery,
    reports,
)
from db import init_db, seed_recommended_and_core_data
from config import CORS_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_recommended_and_core_data()
    yield


app = FastAPI(title="Habit API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(habit.router)
app.include_router(checkin.router)
app.include_router(recovery.router)
app.include_router(content.router)
app.include_router(profile.router)
app.include_router(nudges.router)
app.include_router(notifications.router)
app.include_router(export_data.router)
app.include_router(predictions.router)
app.include_router(analytics.router)
app.include_router(insights.router)
app.include_router(reports.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Habit Tracker API!"}
