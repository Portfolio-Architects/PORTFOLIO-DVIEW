import json

log_path = r"C:\Users\ocs56\.gemini\antigravity\brain\24ea87ea-e93b-4027-8523-44d96b85336a\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            if data.get('step_index') == 313:
                print(f"Keys: {list(data.keys())}")
                tcs = data.get('tool_calls', [])
                for tc in tcs:
                    print(f"Tool: {tc.get('name') or tc.get('ToolName')}")
                    args = tc.get('args') or tc.get('arguments') or {}
                    if isinstance(args, str):
                        args = json.loads(args)
                    # Let's save the chunks to a file to examine them
                    with open("scratch/step_313_args.json", "w", encoding="utf-8") as out:
                        json.dump(args, out, indent=2, ensure_ascii=False)
                    print("Wrote args to scratch/step_313_args.json")
        except Exception as e:
            print("Error:", e)
