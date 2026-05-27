import json

conv = "7cac87be-11cd-4cad-a740-06c422a9c041"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('step_index') == 669:
                print(json.dumps(data, indent=2, ensure_ascii=False))
        except:
            pass
