#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/analysis/mine_transcripts.py
100% Non-sampling traversal and quantitative mining of Antigravity Brain transcripts.
Compliant with HODEP v2.2 and Teamwork Protocol.
"""

import os
import sys
import glob
import json
import csv
import re
from datetime import datetime, timezone
from collections import defaultdict

BRAIN_DIR = r"C:\Users\ocs56\.gemini\antigravity\brain"
PROJECT_ROOT = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW"
ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "docs", "artifacts")

DOMAIN_REGEX = {
    "ASSET": re.compile(r"PORTFOLIO\s*-\s*ASSET|PORTFOLIO[\\/]PORTFOLIO - ASSET", re.IGNORECASE),
    "DVIEW": re.compile(r"PORTFOLIO\s*-\s*DVIEW|PORTFOLIO[\\/]PORTFOLIO - DVIEW", re.IGNORECASE),
    "DAILY": re.compile(r"PORTFOLIO\s*-\s*DAILY|PORTFOLIO[\\/]PORTFOLIO - DAILY", re.IGNORECASE),
    "TRADE": re.compile(r"PORTFOLIO\s*-\s*TRADE|PORTFOLIO[\\/]PORTFOLIO - TRADE", re.IGNORECASE),
}

def mine_all_transcripts():
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    
    if not os.path.isdir(BRAIN_DIR):
        print(f"ERROR: Brain directory not found: {BRAIN_DIR}", file=sys.stderr)
        sys.exit(1)

    all_entries = sorted(os.listdir(BRAIN_DIR))
    session_dirs = [
        d for d in all_entries 
        if os.path.isdir(os.path.join(BRAIN_DIR, d)) and d != "tempmediaStorage"
    ]
    
    print(f"Total session directories detected: {len(session_dirs)}")

    session_records = []
    domain_aggregates = defaultdict(lambda: {
        "sessions": 0,
        "user_inputs": 0,
        "planner_responses": 0,
        "other_messages": 0,
        "total_messages": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read_tokens": 0,
        "dates": set(),
        "planning_artifacts_count": 0,
        "planning_artifacts_list": [],
        "session_ids": [],
        "sample_prompts": []
    })

    total_scanned_files = 0
    empty_sessions = []

    for idx, s_id in enumerate(session_dirs, 1):
        s_path = os.path.join(BRAIN_DIR, s_id)
        t_path = os.path.join(s_path, ".system_generated", "logs", "transcript.jsonl")

        # Scan for planning/reporting markdown files in session root
        md_artifacts = [
            f for f in os.listdir(s_path)
            if f.endswith(".md") and os.path.isfile(os.path.join(s_path, f))
        ]

        if not os.path.isfile(t_path):
            empty_sessions.append(s_id)
            continue

        total_scanned_files += 1

        u_count = 0
        m_count = 0
        o_count = 0
        in_tokens = 0
        out_tokens = 0
        cache_tokens = 0
        first_ts = None
        last_ts = None
        session_dates = set()
        user_prompts = []
        domain = "OTHER"

        with open(t_path, "r", encoding="utf-8", errors="ignore") as f:
            for line_idx, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue

                typ = obj.get("type", "GENERIC")
                created_at = obj.get("created_at")
                in_tok = obj.get("input_tokens") or 0
                out_tok = obj.get("output_tokens") or 0
                cache_tok = obj.get("cache_read_tokens") or 0

                in_tokens += in_tok
                out_tokens += out_tok
                cache_tokens += cache_tok

                if created_at:
                    if first_ts is None or created_at < first_ts:
                        first_ts = created_at
                    if last_ts is None or created_at > last_ts:
                        last_ts = created_at
                    session_dates.add(created_at[:10])

                content_val = obj.get("content", "")
                tool_calls_val = str(obj.get("tool_calls", ""))
                combined_text = str(content_val) + " " + tool_calls_val

                # Domain identification logic
                if domain == "OTHER":
                    if DOMAIN_REGEX["ASSET"].search(combined_text):
                        domain = "ASSET"
                    elif DOMAIN_REGEX["DVIEW"].search(combined_text):
                        domain = "DVIEW"
                    elif DOMAIN_REGEX["DAILY"].search(combined_text):
                        domain = "DAILY"
                    elif DOMAIN_REGEX["TRADE"].search(combined_text):
                        domain = "TRADE"

                if typ == "USER_INPUT":
                    u_count += 1
                    raw_text = str(content_val).strip()
                    # Clean up <USER_REQUEST> wrapper if present
                    clean_prompt = re.sub(r"^<USER_REQUEST>\s*", "", raw_text)
                    clean_prompt = re.sub(r"\s*</USER_REQUEST>$", "", clean_prompt).strip()
                    if clean_prompt and len(user_prompts) < 5:
                        user_prompts.append(clean_prompt[:250])
                elif typ == "PLANNER_RESPONSE":
                    m_count += 1
                else:
                    o_count += 1

        total_msgs = u_count + m_count + o_count

        record = {
            "session_id": s_id,
            "domain": domain,
            "user_inputs": u_count,
            "planner_responses": m_count,
            "other_messages": o_count,
            "total_messages": total_msgs,
            "input_tokens": in_tokens,
            "output_tokens": out_tokens,
            "cache_read_tokens": cache_tokens,
            "first_timestamp": first_ts,
            "last_timestamp": last_ts,
            "active_dates_count": len(session_dates),
            "planning_artifacts_count": len(md_artifacts),
            "planning_artifacts": md_artifacts,
            "representative_prompt": user_prompts[0] if user_prompts else ""
        }
        session_records.append(record)

        # Aggregate by domain
        d_agg = domain_aggregates[domain]
        d_agg["sessions"] += 1
        d_agg["user_inputs"] += u_count
        d_agg["planner_responses"] += m_count
        d_agg["other_messages"] += o_count
        d_agg["total_messages"] += total_msgs
        d_agg["input_tokens"] += in_tokens
        d_agg["output_tokens"] += out_tokens
        d_agg["cache_read_tokens"] += cache_tokens
        d_agg["dates"].update(session_dates)
        d_agg["planning_artifacts_count"] += len(md_artifacts)
        d_agg["planning_artifacts_list"].extend(md_artifacts)
        d_agg["session_ids"].append(s_id)
        if user_prompts and len(d_agg["sample_prompts"]) < 10:
            d_agg["sample_prompts"].append({
                "session_id": s_id,
                "prompt": user_prompts[0][:200]
            })

    # Total aggregates across all valid sessions
    total_valid_sessions = len(session_records)
    total_user_inputs = sum(r["user_inputs"] for r in session_records)
    total_planner_responses = sum(r["planner_responses"] for r in session_records)
    total_tokens_in = sum(r["input_tokens"] for r in session_records)
    total_tokens_out = sum(r["output_tokens"] for r in session_records)
    total_artifacts = sum(r["planning_artifacts_count"] for r in session_records)

    max_active_days = max((len(d["dates"]) for d in domain_aggregates.values()), default=1)
    if max_active_days == 0:
        max_active_days = 1

    # Weights for Passion Score P_k:
    # w_U = 0.30, w_S = 0.20, w_M = 0.20, w_D = 0.15, w_Pi = 0.15
    w_U, w_S, w_M, w_D, w_Pi = 0.30, 0.20, 0.20, 0.15, 0.15

    passion_scores = {}
    for d_name, d_val in domain_aggregates.items():
        u_ratio = d_val["user_inputs"] / total_user_inputs if total_user_inputs > 0 else 0
        s_ratio = d_val["sessions"] / total_valid_sessions if total_valid_sessions > 0 else 0
        m_ratio = d_val["planner_responses"] / total_planner_responses if total_planner_responses > 0 else 0
        d_ratio = len(d_val["dates"]) / max_active_days if max_active_days > 0 else 0
        pi_ratio = d_val["planning_artifacts_count"] / total_artifacts if total_artifacts > 0 else 0

        p_score = 100.0 * (
            w_U * u_ratio +
            w_S * s_ratio +
            w_M * m_ratio +
            w_D * d_ratio +
            w_Pi * pi_ratio
        )
        passion_scores[d_name] = round(p_score, 2)

    # Format output summary JSON
    summary_output = {
        "metadata": {
            "execution_timestamp": datetime.now(timezone.utc).isoformat(),
            "brain_directory": BRAIN_DIR,
            "total_directories": len(session_dirs),
            "empty_sessions_count": len(empty_sessions),
            "empty_sessions": empty_sessions,
            "valid_sessions_count": total_valid_sessions,
            "total_user_inputs": total_user_inputs,
            "total_planner_responses": total_planner_responses,
            "total_input_tokens": total_tokens_in,
            "total_output_tokens": total_tokens_out,
            "total_planning_artifacts": total_artifacts,
            "max_active_dates": max_active_days,
            "passion_score_weights": {
                "w_user_inputs": w_U,
                "w_sessions": w_S,
                "w_planner_responses": w_M,
                "w_active_dates": w_D,
                "w_planning_artifacts": w_Pi
            }
        },
        "domain_statistics": {},
        "passion_scores": passion_scores
    }

    for d_name, d_val in domain_aggregates.items():
        summary_output["domain_statistics"][d_name] = {
            "sessions": d_val["sessions"],
            "session_percentage": round((d_val["sessions"] / total_valid_sessions) * 100, 2),
            "user_inputs": d_val["user_inputs"],
            "user_inputs_percentage": round((d_val["user_inputs"] / total_user_inputs) * 100, 2) if total_user_inputs > 0 else 0,
            "planner_responses": d_val["planner_responses"],
            "planner_responses_percentage": round((d_val["planner_responses"] / total_planner_responses) * 100, 2) if total_planner_responses > 0 else 0,
            "input_tokens": d_val["input_tokens"],
            "output_tokens": d_val["output_tokens"],
            "active_dates_count": len(d_val["dates"]),
            "active_dates": sorted(list(d_val["dates"])),
            "planning_artifacts_count": d_val["planning_artifacts_count"],
            "passion_score": passion_scores.get(d_name, 0.0),
            "sample_prompts": d_val["sample_prompts"]
        }

    # Write summary JSON
    json_path = os.path.join(ARTIFACTS_DIR, "transcript_mining_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary_output, f, indent=2, ensure_ascii=False)
    print(f"Generated: {json_path}")

    # Write CSV
    csv_path = os.path.join(ARTIFACTS_DIR, "session_domain_stats.csv")
    csv_fields = [
        "session_id", "domain", "user_inputs", "planner_responses", "other_messages",
        "total_messages", "input_tokens", "output_tokens", "cache_read_tokens",
        "first_timestamp", "last_timestamp", "active_dates_count",
        "planning_artifacts_count", "representative_prompt"
    ]
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        for r in session_records:
            row = {k: r[k] for k in csv_fields}
            # Clean prompt for CSV
            row["representative_prompt"] = row["representative_prompt"].replace("\n", " ").replace("\r", " ")[:150]
            writer.writerow(row)
    print(f"Generated: {csv_path}")

    print("\n=== Transcript Mining Completed Successfully ===")
    print(f"Valid Sessions: {total_valid_sessions}")
    print(f"Total USER_INPUT: {total_user_inputs}")
    print(f"Total PLANNER_RESPONSE: {total_planner_responses}")
    print("\nDomain Breakdown:")
    for d_name in sorted(domain_aggregates.keys(), key=lambda k: passion_scores.get(k, 0), reverse=True):
        st = summary_output["domain_statistics"][d_name]
        print(f"  [{d_name}] Sessions: {st['sessions']} ({st['session_percentage']}%), User Turns: {st['user_inputs']} ({st['user_inputs_percentage']}%), Model Turns: {st['planner_responses']}, Passion Score: {st['passion_score']}")

if __name__ == "__main__":
    mine_all_transcripts()
