# E2E Test Infra: Recursive Self-Improvement System

## Test Philosophy
- Opaque-box, requirement-driven testing for recursive self-improvement loops.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workloads.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | Baseline Directory & Setup | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Self-Improvement Engine Loop | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | AST Pre-Validation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Safety Guardrails & Limits | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Quantitative Metric Collector | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Performance Degradation Detector | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Multi-Tier Rollback Engine | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 8 | Diff Recording & VCS | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 9 | Audit Log & Trajectory Tracking | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 10 | Automated Markdown Report Generator | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `python -m unittest discover -s recursive_self_improvement -p "test_*.py"`
- Test case format: Python `unittest.TestCase` suites covering engine, evaluator, VCS, runner, simulator, and reporter.
- Directory layout: `recursive_self_improvement/tests/` and `recursive_self_improvement/test_*.py`

## Scenario Coverage (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Self-Improvement Run | F1, F2, F5, F8, F9, F10 | Medium |
| 2 | Performance Degradation Rollback | F2, F5, F6, F7, F8, F9 | High |
| 3 | AST Syntax Error Recovery | F2, F3, F7, F8, F9 | Medium |
| 4 | Resource Budget Cap Termination | F2, F4, F9, F10 | Medium |
| 5 | Report Generation Auditability | F8, F9, F10 | Low |

## Coverage Thresholds
- Tier 1: ≥5 per feature (50 tests total)
- Tier 2: ≥5 boundary/edge cases per feature (50 tests total)
- Tier 3: Pairwise feature interaction tests (10 tests)
- Tier 4: ≥5 realistic application scenarios
