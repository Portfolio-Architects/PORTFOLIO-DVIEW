import json

log_path = r"C:\Users\ocs56\.gemini\antigravity\brain\24ea87ea-e93b-4027-8523-44d96b85336a\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            # We look for PLANNER_RESPONSE that contains tool calls with MacroDashboardClient.tsx
            if data.get('type') == 'PLANNER_RESPONSE':
                tcs = data.get('tool_calls', [])
                for tc in tcs:
                    # In some systems, the args can be stringified JSON or dict
                    args = tc.get('args') or tc.get('arguments') or {}
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    args_str = str(args)
                    if 'MacroDashboardClient.tsx' in args_str or 'MacroDashboardClient.tsx' in str(tc):
                        print(f"Step {data.get('step_index')} (Line {i}): {tc.get('name') or tc.get('ToolName')}")
                        print(f"Arguments: {json.dumps(args, indent=2, ensure_ascii=False)}")
                        print("=" * 80)
        except Exception as e:
            print(f"Error parsing line {i}: {e}")
