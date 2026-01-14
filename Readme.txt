
Project title: Safeguarding the Metaverse
“AI-powered system to detect toxic behavior across text, voice, and gestures in real-time for safe digital interactions.”

Tech Stack:

Frontend: React + Vite, HTML/CSS/JS

Backend: Node.js + Express, Flask (Python AI/ML microservice)

AI/ML: Whisper, Transformers (Toxic BERT), OpenCV (gestures)

Database:Mongo DB

Others: Flask-CORS, Axios/fetch for API calls

Features

Real-time voice/text moderation (partially)

Gesture detection via video frames (experimental)

Frontend dashboard (basic UI)

Backend routes + AI/ML integration


Limitations

Gesture detection not fully functional with backend/frontend

Some toxic words may not be detected

Frontend UI is basic; not fully polished


Setup Instructions

Steps to clone the repo

Install dependencies (npm install for frontend, pip install -r requirements.txt for backend/AI)

Run backend (node index.js)

Run AI service (python ai_engine.py)

Run frontend (npm run dev)

