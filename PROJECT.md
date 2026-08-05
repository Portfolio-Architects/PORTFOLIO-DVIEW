# Project: Recursive Self-Improvement System

## Architecture
- Self-Improvement Engine Loop (`engine.py`): Autonomous self-analysis -> self-modification -> re-execution loop.
- Safety Guardrails & Resource Limits (`config.py`): Max iteration limits, token budgets, timeout enforcement, stop signals, stuck state detection.
- Quantitative Evaluation & Rollback (`evaluator.py`, `vcs.py`): Automated metric collector (pass rate %, latency, peak RAM, accuracy score), performance degradation thresholds, dual snapshot VCS versioning, automatic rollback.
- History & Auditability Markdown Reporter (`reporter.py`, `vcs.py`): Unified `.diff` patch generator, `execution_log.json` schema, automated `IMPROVEMENT_REPORT.md` exporter.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Self-Improvement Engine Loop | Autonomous self-analysis, modification, re-execution | M1 | Survey |
| F2 | Config & Limit Management | Max iterations, token budget, time limit | M1 | Survey |
| F3 | Mock LLM Simulator | LLM perturbation simulation & feedback | M1 | Survey |
| F4 | Isolated Subprocess Runner | Python runner with CP949 fix & timeout | M1 | Survey |
| F5 | VCS Snapshot Engine | Dual file snapshots (`target_module.py` & `test_target_module.py`) and rollbacks | M1 | Survey |
| F6 | Stuck State Detector | 3-layer stuck detection (MD5 hash, repetition, rollback counter) | M1 | Survey |
| F7 | Benchmark Metric Collector | Pass rate %, latency (sec), memory (MB), accuracy | M2 | Survey |
| F8 | Degradation Detector | Threshold rejection (latency 15%, RAM 20%, accuracy 1%) & rollback | M2 | Survey |
| F9 | Unified Diff Logger | Git-style `.diff` patch creation per iteration | M3 | Survey |
| F10 | Markdown Report Exporter | Generates `IMPROVEMENT_REPORT.md` with trajectory & audit logs | M3 | Survey |
| F11 | E2E Integration Suite | 115 opaque-box & system test cases | M4 | TEST_INFRA |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Engine & Safety Setup | R1 loop engine, config, vcs, runner, simulator, safety guardrails in `recursive_self_improvement/` | None | DONE |
| M2 | Evaluation & Verification Framework | R2 metric collector (`evaluator.py`), degradation detector, performance rollback | M1 | DONE |
| M3 | History, Auditability & Markdown Reporter | R3 `.diff` patch logger, execution log schema, `reporter.py` (`IMPROVEMENT_REPORT.md`) | M2 | DONE |
| M4 | E2E Integration & Validation | Full baseline vs improved self-loop execution, E2E test pass, forensic audit | M3 | DONE |

## Interface Contracts
### `evaluator.py` ↔ `engine.py`
- `BenchmarkRunner(target_file: str, test_file: str).run_benchmark() -> BenchmarkMetrics`
- Returns: `pass_rate` (float), `passed_tests` (int), `failed_tests` (int), `total_tests` (int), `execution_time_sec` (float), `peak_memory_mb` (float), `accuracy_score` (float), `ast_valid` (bool), `error_message` (str)

### `reporter.py` ↔ `engine.py`
- `ReportGenerator(log_path: str, history_dir: str, output_path: str).generate_markdown_report() -> str`
- Writes `IMPROVEMENT_REPORT.md` containing Executive Summary, Trajectory Table, Diff Snippets, and Safety Audit Log.

## Code Layout
`recursive_self_improvement/`
├── `config.py` (Safety limits, metrics config)
├── `vcs.py` (`CustomVCS`, diff generator, version snapshots)
├── `runner.py` (`TestRunner`, CP949 UTF-8 subprocess runner)
├── `simulator.py` (`MockLLMSimulator`, static code metrics)
├── `evaluator.py` (`BenchmarkRunner`, quantitative metrics)
├── `reporter.py` (`ReportGenerator`, markdown exporter)
├── `engine.py` (`SelfImprovementEngine`, loop controller)
├── `target_module.py` (Target code undergoing self-improvement)
├── `test_target_module.py` (Unit tests for target code)
├── `run.py` (Main CLI entry point)
├── `history/` (Version snapshots, `.diff` files, `execution_log.json`, `IMPROVEMENT_REPORT.md`)
└── `tests/` (Test suites: `test_engine.py`, `test_vcs.py`, `test_runner.py`, `test_simulator.py`, `test_evaluator.py`, `test_reporter.py`, `test_e2e_suite.py`)
