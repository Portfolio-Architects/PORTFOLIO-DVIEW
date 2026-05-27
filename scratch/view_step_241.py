import json

conv = "7cac87be-11cd-4cad-a740-06c422a9c041"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('step_index') == 241:
                tcs = data.get('tool_calls', [])
                for tc in tcs:
                    print(f"Tool: {tc.get('name') or tc.get('ToolName')}")
                    args = tc.get('args') or tc.get('arguments') or {}
                    if isinstance(args, str):
                        args = json.loads(args, strict=False)
                    chunks = args.get('ReplacementChunks', [])
                    if isinstance(chunks, str):
                        chunks = json.loads(chunks, strict=False)
                    print(f"Number of chunks: {len(chunks)}")
                    for idx, chunk in enumerate(chunks):
                        print(f"Chunk {idx}: StartLine: {chunk.get('StartLine')}, EndLine: {chunk.get('EndLine')}")
                        print(f"TargetContent:\n{chunk.get('TargetContent')[:200]}")
                        print(f"ReplacementContent:\n{chunk.get('ReplacementContent')[:200]}")
                        print("-" * 50)
                    with open("scratch/step_241_args.json", "w", encoding="utf-8") as out:
                        json.dump(args, out, indent=2, ensure_ascii=False)
                    print("Saved to scratch/step_241_args.json")
        except Exception as e:
            print("Error:", e)
