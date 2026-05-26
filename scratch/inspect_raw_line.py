import json

conv = "7cac87be-11cd-4cad-a740-06c422a9c041"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('step_index') == 241:
                print("Type of line:", type(line))
                print("Length of line:", len(line))
                print("Raw Line Start (first 1000 chars):")
                print(line[:1000])
                print("-" * 50)
                print("Raw Line End (last 1000 chars):")
                print(line[-1000:])
        except Exception as e:
            pass
