#!/usr/bin/env python3
"""Regression controls for source-backed factory state attestation."""

import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "factory_states", Path(__file__).with_name("annotate-factory-captures.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
CAPTURES = module.ROOT / "reports/m5-stopwatch/captures/factory"


class StateTest(unittest.TestCase):
    def test_hidden_parent_suppresses_child_label(self):
        nodes = module.parse_tree(
            [
                "SWTREE NODE 0 object 0 0 467 465 255 0 -1",
                "SWTREE NODE 1 object 0 0 465 465 255 1 -1",
                "SWTREE NODE 2 label 0 0 10 10 255 0 -1 414243",
            ]
        )
        self.assertEqual(nodes[-1]["text"], "ABC")
        self.assertFalse(nodes[-1]["visible"])

    def test_actual_date_selection_and_summary_pass(self):
        receipt = json.loads((CAPTURES / "set-date-day-clamp.json").read_text())
        result = module.annotate(receipt, CAPTURES / "set-date-day-clamp.png")
        self.assertTrue(result["stateVerified"])
        self.assertEqual(
            result["comparisonParameters"], {"year": 2000, "month": 2, "day": 29}
        )

    def test_filename_does_not_override_wrong_selected_value(self):
        receipt = json.loads((CAPTURES / "set-date-day-clamp.json").read_text())
        changed = []
        for row in receipt["tree"]:
            fields = row.split()
            if len(fields) >= 11 and fields[3] == "roller" and fields[9] == "0":
                fields[10] = "27"
                row = " ".join(fields)
            changed.append(row)
        receipt["tree"] = changed
        self.assertFalse(
            module.annotate(receipt, CAPTURES / "set-date-day-clamp.png")[
                "stateVerified"
            ]
        )

    def test_unknown_old_build_keeps_state_unverified(self):
        receipt = json.loads((CAPTURES / "set-date-day-clamp.json").read_text())
        old = copy.deepcopy(receipt)
        old.pop("firmwareBinarySha256")
        result = module.annotate(old, CAPTURES / "set-date-day-clamp.png")
        self.assertFalse(result["stateVerified"])
        self.assertTrue(result["stateEvidence"]["publicStateAssertionsMatch"])
        self.assertFalse(result["stateEvidence"]["snapshotBoundaryVerified"])

    def test_wrong_theme_pixels_fail_even_with_correct_filename(self):
        receipt = json.loads((CAPTURES / "simple-1.json").read_text())
        result = module.annotate(receipt, CAPTURES / "simple-0.png")
        self.assertFalse(result["stateVerified"])


if __name__ == "__main__":
    unittest.main()
