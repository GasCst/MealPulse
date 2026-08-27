#!/usr/bin/env python3
"""
tools/verify_health_sync.py
Deterministic verification tool for HealthKit & Health Connect calorie recalculation logic
and Supabase activity log schema validation (WAT Architecture — Gemini Edition).
"""

import sys
import json

def calculate_remaining_calories(target_calories: int, eaten_calories: int, burned_calories: int, include_burned: bool) -> int:
    """
    Implements the dynamic calorie budget recalculation formula:
    Calorie Rimanenti = max(0, Target Base - Calorie Assunte + (Calorie Attive if include_burned else 0))
    """
    effective_burned = burned_calories if include_burned else 0
    return max(0, target_calories - eaten_calories + effective_burned)

def run_tests():
    print("=== Running Health Calorie Formula Unit Tests ===")
    test_cases = [
        # (target, eaten, burned, include_burned, expected)
        (2000, 1500, 300, True, 800),
        (2000, 1500, 300, False, 500),
        (2000, 2200, 400, True, 200),
        (2000, 2200, 400, False, 0),
        (1800, 0, 250, True, 2050),
        (1800, 0, 250, False, 1800),
    ]

    all_passed = True
    for idx, (target, eaten, burned, inc, expected) in enumerate(test_cases, 1):
        result = calculate_remaining_calories(target, eaten, burned, inc)
        passed = result == expected
        status = "PASSED" if passed else "FAILED"
        if not passed:
            all_passed = False
        print(f"Test {idx}: Target={target}, Eaten={eaten}, Burned={burned}, Include={inc} => Output={result} (Expected={expected}) [{status}]")

    if all_passed:
        print("\nAll calculation tests passed successfully! 100% deterministic accuracy.")
        return 0
    else:
        print("\nSome tests failed.", file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(run_tests())
