import json
import os

conv = "24ea87ea-e93b-4027-8523-44d96b85336a"
log_path = f"C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\{conv}\\.system_generated\\logs\\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            if data.get('type') == 'PLANNER_RESPONSE':
                tcs = data.get('tool_calls', [])
                for tc in tcs:
                    name = tc.get('name') or tc.get('ToolName')
                    if name in ['replace_file_content', 'multi_replace_file_content']:
                        args = tc.get('args') or tc.get('arguments') or {}
                        if isinstance(args, str):
                            try:
                                args = json.loads(args)
                            except:
                                pass
                        args_str = str(args)
                        if 'MacroDashboardClient.tsx' in args_str:
                            print(f"Step {data.get('step_index')} (Line {i}): {name}")
                            print(f"  StartLine: {args.get('StartLine')}, EndLine: {args.get('EndLine')}")
                            # Target and replacement contents can be truncated slightly for console, but let's print them
                            print(f"  TargetContent:\n{args.get('TargetContent')[:400]}")
                            print("-" * 20)
                            print(f"  ReplacementContent:\n{args.get('ReplacementContent')[:400]}")
                            print("=" * 80)
        except Exception as e:
            pass
