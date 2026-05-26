import json
import os

conv = "24ea87ea-e93b-4027-8523-44d96b85336a"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            tcs = data.get('tool_calls', [])
            for tc in tcs:
                name = tc.get('name') or tc.get('ToolName')
                if name == 'write_to_file':
                    args = tc.get('args') or tc.get('arguments') or {}
                    if isinstance(args, str):
                        args = json.loads(args)
                    if 'MacroDashboardClient.tsx' in str(args):
                        print(f"write_to_file at step {data.get('step_index')} (Line {i})")
                        print(f"Args: {json.dumps(args, indent=2, ensure_ascii=False)[:1000]}")
                        print("=" * 60)
        except Exception as e:
            pass
