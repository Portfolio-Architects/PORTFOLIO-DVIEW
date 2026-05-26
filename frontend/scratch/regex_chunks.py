log_path = r"C:\Users\ocs56\.gemini\antigravity\brain\24ea87ea-e93b-4027-8523-44d96b85336a\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '"step_index":313' in line or '"step_index": 313' in line:
            print(f"Found step 313 at line {i}")
            print(line[:2000])
            break
