
import sys
import json
import warnings
import os

warnings.filterwarnings("ignore")

try:
    import whisper
    from transformers import pipeline
except ImportError as e:
    print(json.dumps({"error": f"Missing Library: {str(e)}"}))
    sys.exit(1)

# Model ko 'base' rakha hai accuracy ke liye
audio_model = whisper.load_model("base")
tox_model = pipeline("text-classification", model="unitary/toxic-bert")

def process(file_path, text_input, distance, role):
    # FIXED: strip() aur upper() ke aage brackets lagaye hain
    current_role = str(role).strip().upper()
    
    if current_role in ["TEACHER", "ADMIN"]:
        return {
            "transcribedText": text_input if file_path == "none" else "Audio analyzed",
            "toxicityScore": 0.0,
            "roleDetected": current_role,
            "reason": "Authority Exempt (Teacher/Admin)"
        }

    transcribed_text = ""
    if file_path != "none" and os.path.exists(file_path):
        result = audio_model.transcribe(file_path)
        transcribed_text = result['text']
    else:
        transcribed_text = text_input

    tox_results = tox_model(transcribed_text)
    score = next((item['score'] for item in tox_results if item['label'] == 'toxic'), 0.1)

    return {
        "transcribedText": transcribed_text,
        "toxicityScore": round(float(score), 4),
        "roleDetected": current_role,
        "isAggressive": False,
        "reason": "Successfully analyzed"
    }

if __name__ == "__main__":
    try:
        file_arg = sys.argv[1] if len(sys.argv) > 1 else "none"
        text_arg = sys.argv[2] if len(sys.argv) > 2 else "none"
        dist_arg = sys.argv[3] if len(sys.argv) > 3 else "1.0"
        role_arg = sys.argv[4] if len(sys.argv) > 4 else "STUDENT"

        result = process(file_arg, text_arg, dist_arg, role_arg)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"Python Script Error: {str(e)}"}))