import os
import json

brain_dir = r"C:\Users\ocs56\.gemini\antigravity\brain"
search_str = "maxDateTime"

found = []
for folder in os.listdir(brain_dir):
    folder_path = os.path.join(brain_dir, folder)
    if os.path.isdir(folder_path):
        transcript_path = os.path.join(folder_path, ".system_generated", "logs", "transcript.jsonl")
        if os.path.exists(transcript_path):
            try:
                with open(transcript_path, 'r', encoding='utf-8') as f:
                    for line_idx, line in enumerate(f):
                        if search_str in line:
                            data = json.loads(line)
                            step = data.get('step_index')
                            found.append((folder, step, line_idx))
            except Exception as e:
                pass

print(f"Found {len(found)} occurrences in conversation logs:")
for conv_id, step, line_idx in found:
    print(f"- Conv: {conv_id}, Step: {step}, Line in transcript: {line_idx}")
