#!/usr/bin/env python3
"""Check offline gesture evidence boundaries without hardware or temp files."""

import copy
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("gestures", Path(__file__).with_name("compare-gestures.py"))
gestures = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gestures)

RECIPE = {"id": "settings-list.fast", "scene": "settings-list", "requiredRoute": "settings",
          "events": [{"atMs": 0, "type": "down", "x": 233, "y": 220},
                     {"atMs": 33, "type": "move", "x": 233, "y": 200},
                     {"atMs": 66, "type": "up", "x": 233, "y": 200}],
          "observeAtMs": [0, 33, 66, 300]}


def receipt(framework, delay=0, corners=False):
    origin = 1000000
    factory = framework == "factory"
    node = {"id": 1, "x": 0, "y": 0, "width": 466, "height": 466}
    if factory:
        node.update(left=0, top=0, selected=-1, kind="scroll-container")
    else:
        node.update(scroll_x=0, scroll_y=0, **{"class": "settings"})
    if corners:
        node["corners"] = [[0, 0], [466, 0], [466, 466], [0, 466]]
    events = [{**event, "actual_at_us": origin + event["requested_at_ms"] * 1000 + delay}
              for event in gestures.recipe_events(RECIPE)]
    if factory:
        pointer = [{"actual_at_us": origin + at * 1000 + delay, "state": state, "x": 233, "y": y}
                   for at, state, y in ((0, 1, 220), (16, 1, 220), (33, 1, 200),
                                         (50, 1, 200), (66, 0, 200), (90, 0, 200))]
    else:
        pointer = [[origin + at * 1000 + delay, phase, state, 233, y, 0, 233, y]
                   for at, phase, state, y in ((0, 1, 1, 220), (33, 2, 1, 200), (66, 3, 0, 200))]
    observations = []
    for at in RECIPE["observeAtMs"]:
        current = copy.deepcopy(node)
        current["y" if factory else "scroll_y"] = 0 if at == 0 else 20
        observations.append({"requested_at_ms": at, "actual_at_us": origin + at * 1000 + delay,
                             "nodes": [current], **({"truncated": False} if factory else {"nodes_dropped": 0})})
    return {"caseId": RECIPE["id"], "recipe": RECIPE, "hardwareMuteVerified": True,
            "normalHalVerified": True, "initial": {"route": "settings", "stateEvidence": {"scroll": {"nodes": [node]}}},
            "observed": {"raw": {"clock_origin_us": origin, "events": events,
                                  "pointer_reads": pointer, "pointer_reads_dropped": 0,
                                  "observations": observations}}}


def launcher_receipt(framework):
    result = receipt(framework, corners=True)
    recipe = {**RECIPE, "id": "launcher.fast", "scene": "launcher", "requiredRoute": "menu"}
    icon = {"id": 35, "width": 200, "height": 200,
            "corners": [[133, 118], [333, 118], [333, 318], [133, 318]]}
    if framework == "factory":
        icon.update(left=133, top=118, x=0, y=0, selected=-1, kind="launcher-icon")
        title = "SWTREE NODE 1 label 167 62 300 91 255 0 -1 " + "AlarmClock".encode().hex()
        evidence = result["initial"]["stateEvidence"]
        evidence.update(verifiedLabel="AlarmClock", tree=[title])
        evidence["scroll"]["nodes"].append(icon)
        for observation in result["observed"]["raw"]["observations"]:
            observation["nodes"].append(copy.deepcopy(icon))
    else:
        icon.update(x=133, y=118, **{"class": "menu-icon"})
        nodes = [icon, {"id": 36, "class": "menu-title", "text": "AlarmClock"},
                 {"id": 37, "class": "dot", "x": 233, "selected_class": True}]
        result["initial"]["stateEvidence"]["scroll"]["nodes"] = copy.deepcopy(nodes)
        for observation in result["observed"]["raw"]["observations"]:
            observation["nodes"] = copy.deepcopy(nodes)
    result.update(caseId=recipe["id"], recipe=recipe)
    result["initial"]["route"] = "menu"
    return result, recipe


class GestureEvidence(unittest.TestCase):
    def test_unequal_poll_counts_are_not_unequal_state_histories(self):
        result = gestures.compare_case(receipt("factory"), receipt("gea"), RECIPE)
        self.assertTrue(result["input_comparison_available"])
        self.assertTrue(result["consumed_history_equal"])
        self.assertEqual(len(result["factory_consumed_samples"]), 6)
        self.assertEqual(len(result["gea_consumed_samples"]), 3)
        self.assertTrue(result["final_observation"]["state"]["common_fields"]["scroll_y"]["exactly_equal"])
        self.assertFalse(result["parity_established"])

    def test_timing_bound_is_explicit_and_no_alignment_is_searched(self):
        factory, gea = receipt("factory", 1000), receipt("gea")
        exact = gestures.compare_case(factory, gea, RECIPE)
        bounded = gestures.compare_case(factory, gea, RECIPE, 1000)
        self.assertFalse(exact["input_comparison_available"])
        self.assertTrue(bounded["input_comparison_available"])
        self.assertEqual(bounded["consumed_change_timing"][0]["gea_minus_factory_us"], -1000)
        self.assertEqual(bounded["requested_vs_consumed"]["factory"]["samples"][0]["consume_delay_from_requested_us"], 1000)
        result = gestures.analyze({RECIPE["id"]: factory}, {RECIPE["id"]: gea},
                                  {"factoryCommit": "pinned", "cases": [RECIPE]}, 1000)
        self.assertFalse(result["policy"]["time_alignment_search"])
        self.assertEqual(result["policy"]["timing_bound_us"], 1000)

    def test_missing_move_closes_the_input_gate(self):
        factory = receipt("factory")
        factory["observed"]["raw"]["pointer_reads"] = factory["observed"]["raw"]["pointer_reads"][:2] + factory["observed"]["raw"]["pointer_reads"][4:]
        result = gestures.compare_case(factory, receipt("gea"), RECIPE)
        self.assertFalse(result["consumed_history_equal"])
        self.assertFalse(result["input_comparison_available"])
        self.assertFalse(result["requested_vs_consumed"]["factory"]["state_changes_complete"])

    def test_up_raw_coordinates_do_not_replace_the_handled_point(self):
        factory = receipt("factory")
        factory["observed"]["raw"]["pointer_reads"][4]["y"] = 999
        result = gestures.compare_case(factory, receipt("gea"), RECIPE)
        self.assertTrue(result["input_comparison_available"])
        release = result["factory_consumed_samples"][4]
        self.assertEqual(release["y"], 999)
        self.assertEqual(release["handler_y"], 200)

    def test_bounds_are_never_substituted_for_transformed_corners(self):
        result = gestures.compare_case(receipt("factory"), receipt("gea", corners=True), RECIPE)
        self.assertFalse(result["final_observation"]["corners"]["comparison_available"])
        self.assertIsNone(result["final_observation"]["corners"]["factory"])
        result = gestures.compare_case(receipt("factory", corners=True), receipt("gea", corners=True), RECIPE)
        self.assertTrue(result["final_observation"]["corners"]["exactly_equal"])

    def test_source_coordinate_normalization_does_not_shift_scroll_offsets(self):
        factory, gea = receipt("factory", corners=True), receipt("gea", corners=True)
        factory["coordinateMapping"] = {"rawToLogicalSubtract": [1, 0], "evidence": "Pinned centered466 container starts at raw x1"}
        raw = factory["observed"]["raw"]
        for event in raw["events"]:
            event["x"] += 1
        for point in raw["pointer_reads"]:
            point["x"] += 1
        for sample in raw["observations"]:
            sample["nodes"][0]["left"] += 1
            for corner in sample["nodes"][0]["corners"]:
                corner[0] += 1
        initial = factory["initial"]["stateEvidence"]["scroll"]["nodes"][0]
        initial["left"] += 1
        for corner in initial["corners"]:
            corner[0] += 1
        result = gestures.compare_case(factory, gea, RECIPE)
        self.assertTrue(result["input_comparison_available"])
        self.assertEqual(result["factory_original_consumed_samples"][0]["x"], 234)
        self.assertEqual(result["factory_consumed_samples"][0]["x"], 233)
        self.assertEqual(result["final_observation"]["state"]["factory"]["fields"]["scroll_x"], 0)
        self.assertTrue(result["final_observation"]["corners"]["exactly_equal"])
        factory["coordinateMapping"]["evidence"] = ""
        with self.assertRaises(ValueError):
            gestures.compare_case(factory, gea, RECIPE)

    def test_truncation_initial_state_and_observation_timing_are_gates(self):
        factory = receipt("factory")
        factory["observed"]["raw"]["pointer_reads_dropped"] = 1
        result = gestures.compare_case(factory, receipt("gea"), RECIPE)
        self.assertFalse(result["input_comparison_available"])
        factory = receipt("factory")
        factory["initial"]["stateEvidence"]["scroll"]["nodes"][0]["y"] = 10
        self.assertFalse(gestures.compare_case(factory, receipt("gea"), RECIPE)["input_comparison_available"])
        factory = receipt("factory", corners=True)
        factory["observed"]["raw"]["observations"][-1]["actual_at_us"] += 1
        result = gestures.compare_case(factory, receipt("gea", corners=True), RECIPE)
        self.assertTrue(result["input_comparison_available"])
        self.assertFalse(result["final_observation"]["corners"]["comparison_available"])

    def test_committed_outcome_requires_ordinary_ui_confirmation(self):
        factory, gea = receipt("factory"), receipt("gea")
        self.assertFalse(gestures.compare_case(factory, gea, RECIPE)["committed_outcome"]["comparison_available"])
        for row in (factory, gea):
            row["committedOutcome"] = {"kind": "new alarm time", "value": "08:00", "ordinaryUiConfirmed": True,
                                       "evidence": "Tapped ordinary OK; actual resulting alarm label"}
        self.assertTrue(gestures.compare_case(factory, gea, RECIPE)["committed_outcome"]["exactly_equal"])
        gea["committedOutcome"]["value"] = "09:00"
        self.assertFalse(gestures.compare_case(factory, gea, RECIPE)["committed_outcome"]["exactly_equal"])
        gea["committedOutcome"]["ordinaryUiConfirmed"] = False
        self.assertFalse(gestures.compare_case(factory, gea, RECIPE)["committed_outcome"]["comparison_available"])

    def test_missing_cases_and_malformed_receipts_are_not_reported_as_passes(self):
        bad = receipt("gea")
        del bad["observed"]["raw"]["clock_origin_us"]
        plan = {"factoryCommit": "pinned", "cases": [RECIPE, {**RECIPE, "id": "missing"}]}
        result = gestures.analyze({RECIPE["id"]: receipt("factory")}, {RECIPE["id"]: bad}, plan)
        self.assertEqual(result["summary"]["input_comparisons_available"], 0)
        self.assertIn("origin", result["cases"][0]["evidence_error"])
        self.assertEqual(result["cases"][1]["missing_frameworks"], ["factory", "gea"])
        with self.assertRaises(ValueError):
            gestures.analyze({}, {}, plan, -1)

    def test_launcher_corner_roles_use_declared_source_order_not_matching_ids(self):
        factory = [{"id": 100, "kind": "launcher-icon", "left": 133, "top": 118,
                    "width": 200, "height": 200, "corners": [[133,118],[333,118],[333,318],[133,318]]}]
        gea = [{"id": 5, "class": "menu-icon", "x": 133, "y": 118,
                "width": 200, "height": 200, "corners": factory[0]["corners"]},
               {"id": 6, "class": "menu-icon", "x": -333, "y": 118,
                "width": 200, "height": 200, "corners": [[-333,118],[-133,118],[-133,318],[-333,318]]}]
        left = gestures.launcher_corners("factory", factory)
        right = gestures.launcher_corners("gea", gea)
        self.assertEqual(len(right), 1)
        self.assertTrue(gestures.compare_launcher_corners(left, right, True)["exactly_equal"])
        self.assertFalse(gestures.compare_launcher_corners(left, right, False)["comparison_available"])
        right[0]["corners"] = [[134,118],[334,118],[334,318],[134,318]]
        self.assertFalse(gestures.compare_launcher_corners(left, right, True)["exactly_equal"])

    def test_launcher_route_change_does_not_promote_alarm_container_to_scroll_authority(self):
        factory, recipe = launcher_receipt("factory")
        gea, _ = launcher_receipt("gea")
        # Actual Alarms/Add trace shape: a generic 466px container and Add label
        # scroller, without any diagnostic launcher-icon role.
        factory["observed"]["raw"]["observations"][-1]["nodes"] = [
            {"id": 1, "kind": "scroll-container", "selected": -1, "x": 0, "y": 0,
             "left": 0, "top": 0, "width": 466, "height": 466,
             "corners": [[0, 0], [466, 0], [466, 466], [0, 466]]},
            {"id": 4, "kind": "scroll-container", "selected": -1, "x": 0, "y": 0,
             "left": 86, "top": 132, "width": 294, "height": 30}]
        factory["finalTree"] = ["SWTREE NODE 1 label 0 0 1 1 255 0 -1 " + text.encode().hex()
                                for text in ("Alarms", "Add")]
        result = gestures.compare_case(factory, gea, recipe)
        self.assertTrue(result["input_comparison_available"])
        state = result["final_observation"]["state"]["factory"]
        self.assertFalse(state["available"])
        self.assertIn("launcher-icon", state["reason"])
        self.assertEqual(state["fields"], {})
        self.assertIsNone(state["corners"])
        self.assertFalse(result["final_observation"]["launcher_motif_corners"]["comparison_available"])

    def test_launcher_icons_cannot_make_an_incorrect_route_frame_comparable(self):
        factory, recipe = launcher_receipt("factory")
        gea, _ = launcher_receipt("gea")
        intact = gestures.compare_case(factory, gea, recipe)
        self.assertTrue(intact["final_observation"]["launcher_motif_corners"]["exactly_equal"])
        # After initial x1 normalization, a new raw-x0 screen would start at -1.
        factory["observed"]["raw"]["observations"][-1]["nodes"][0]["left"] = -1
        result = gestures.compare_case(factory, gea, recipe)
        self.assertTrue(result["input_comparison_available"])
        self.assertFalse(result["final_observation"]["state"]["factory"]["available"])
        self.assertFalse(result["final_observation"]["launcher_motif_corners"]["comparison_available"])

    def test_legacy_prepared_offsets_require_actual_zero_time_launcher_roles(self):
        factory, recipe = launcher_receipt("factory")
        gea, _ = launcher_receipt("gea")
        # Original SCROLLSTATE/TREE preparation has offsets and bounds, but no
        # kind tags or actual image corners. Playback telemetry supplies them.
        frame = factory["initial"]["stateEvidence"]["scroll"]["nodes"][0]
        frame.pop("kind")
        factory["initial"]["stateEvidence"]["scroll"]["nodes"] = [frame]
        self.assertTrue(gestures.compare_case(factory, gea, recipe)["input_comparison_available"])
        factory["observed"]["raw"]["observations"][0]["nodes"] = [copy.deepcopy(frame)]
        result = gestures.compare_case(factory, gea, recipe)
        self.assertFalse(result["input_comparison_available"])
        self.assertFalse(result["initial_state"]["factory"]["available"])

    def test_settings_adjustment_modal_has_no_settings_scroll_authority(self):
        factory, gea = receipt("factory", corners=True), receipt("gea", corners=True)
        # Actual numeric worker trace shape has no retained settings scrollers.
        factory["observed"]["raw"]["observations"][-1]["nodes"] = []
        factory["finalTree"] = ["SWTREE NODE 1 label 0 0 1 1 255 0 -1 " + text.encode().hex()
                                for text in ("100", "OK")]
        result = gestures.compare_case(factory, gea, RECIPE)
        self.assertTrue(result["input_comparison_available"])
        self.assertFalse(result["final_observation"]["state"]["factory"]["available"])
        self.assertFalse(result["final_observation"]["state"]["comparison_available"])
        self.assertFalse(result["final_observation"]["corners"]["comparison_available"])

    def test_settings_scroll_requires_the_retained_source_frame(self):
        factory, gea = receipt("factory", corners=True), receipt("gea", corners=True)
        factory["observed"]["raw"]["observations"][-1]["nodes"][0]["height"] = 300
        result = gestures.compare_case(factory, gea, RECIPE)
        self.assertTrue(result["input_comparison_available"])
        self.assertFalse(result["final_observation"]["state"]["factory"]["available"])
        self.assertFalse(result["final_observation"]["corners"]["comparison_available"])

    def test_picker_authority_and_saved_label_have_explicit_different_boundaries(self):
        recipe = {**RECIPE, "scene": "roller"}
        final = {"requested_at_ms": 300, "nodes": [
            {"id": 1, "selected": 7, "left": 63, "top": 128, "width": 160, "height": 164},
            {"id": 2, "selected": 0, "left": 243, "top": 128, "width": 160, "height": 164}]}
        trace = {"observations": {300: final}}
        gea = {"committedOutcome": {"kind": "alarm-hour-minute-label", "value": "07:00",
                                   "ordinaryUiConfirmed": True, "comparisonAvailable": True}}
        result = gestures.picker_to_saved_label(trace, gea, recipe)
        self.assertTrue(result["exactly_equal"])
        self.assertIn("Factory save/storage was not exercised", result["scope"])
        gea["committedOutcome"]["value"] = None
        self.assertFalse(gestures.picker_to_saved_label(trace, gea, recipe)["comparison_available"])


if __name__ == "__main__":
    unittest.main()
