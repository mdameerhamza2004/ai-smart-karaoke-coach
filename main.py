from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import tensorflow as tf
from typing import List
import json
import asyncio

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active WebSocket connections
active_connections: List[WebSocket] = []

@app.get("/")
async def root():
    return {"message": "AI Smart Karaoke Coach API"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Process audio data and send feedback
            feedback = process_audio_data(data)
            await websocket.send_json(feedback)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        active_connections.remove(websocket)

def process_audio_data(audio_data: str) -> dict:
    """
    Process audio data and return feedback
    """
    try:
        # Convert audio data to numpy array
        audio_array = np.frombuffer(audio_data.encode(), dtype=np.float32)
        
        # Extract features using librosa
        y = librosa.to_mono(audio_array)
        pitch = librosa.yin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        tempo, beat_frames = librosa.beat.beat_track(y=y)
        
        # Analyze pitch accuracy
        pitch_accuracy = analyze_pitch_accuracy(pitch)
        
        # Analyze rhythm
        rhythm_accuracy = analyze_rhythm_accuracy(beat_frames)
        
        return {
            "pitch_accuracy": pitch_accuracy,
            "rhythm_accuracy": rhythm_accuracy,
            "tempo": float(tempo),
            "feedback": generate_feedback(pitch_accuracy, rhythm_accuracy)
        }
    except Exception as e:
        return {"error": str(e)}

def analyze_pitch_accuracy(pitch: np.ndarray) -> float:
    """
    Analyze pitch accuracy and return a score
    """
    # Implement pitch analysis logic
    return 0.85  # Placeholder

def analyze_rhythm_accuracy(beat_frames: np.ndarray) -> float:
    """
    Analyze rhythm accuracy and return a score
    """
    # Implement rhythm analysis logic
    return 0.90  # Placeholder

def generate_feedback(pitch_accuracy: float, rhythm_accuracy: float) -> str:
    """
    Generate personalized feedback based on analysis
    """
    feedback = []
    if pitch_accuracy < 0.8:
        feedback.append("Try to maintain consistent pitch throughout the song.")
    if rhythm_accuracy < 0.85:
        feedback.append("Work on staying in rhythm with the music.")
    return " ".join(feedback) if feedback else "Great performance! Keep it up!"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 