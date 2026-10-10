#!/usr/bin/env python3
"""Compare staged gesture receipts without time alignment or inferred tolerances."""

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path


def timing_delta(factory, gea, bound_us):
    delta = gea - factory
    return {"factory_us": factory, "gea_us": gea, "gea_minus_factory_us": delta,
            "within_declared_bound": abs(delta) <= bound_us}


def recipe_events(recipe):
    return [{"requested_at_ms": row["atMs"], "state": int(row["type"] != "up"),
             "x": row["x"], "y": row["y"]} for row in recipe["events"]]


def consumed(framework, raw):
    """Keep raw release coordinates and disclose the coordinates handled by UI."""
    result = []
    previous_point = None
    origin = raw["clock_origin_us"]
    for row in raw.get("pointer_reads", []):
        if isinstance(row, dict):
            time, state, x, y = (row[key] for key in ("actual_at_us", "state", "x", "y"))
            phase, handler_x, handler_y = None, x, y
        elif framework == "factory":
            time, state, x, y = row
            phase, handler_x, handler_y = None, x, y
        else:
            if len(row) != 8:
                raise ValueError("Gea consumed traces require eight fields, including handler coordinates")
            time, phase, state, x, y, pointer, handler_x, handler_y = row
            if pointer != 0:
                raise ValueError("Shared recipes require the primary pointer")
        if framework == "factory" and not state:
            # The pinned normal lvgl_read_cb does not assign data->point on REL.
            # LVGL therefore uses its previous pressed point, not HAL up coords.
            if previous_point is not None:
                handler_x, handler_y = previous_point
        if state:
            previous_point = (handler_x, handler_y)
        result.append({"relative_us": time - origin, "state": int(state != 0),
                       "x": x, "y": y, "handler_x": handler_x, "handler_y": handler_y,
                       "phase": phase})
    return result


def changes(rows):
    """Suppress unchanged polls, but retain all polls separately in the report."""
    result = []
    previous = None
    for index, row in enumerate(rows):
        key = (row["state"], row["handler_x"], row["handler_y"])
        if previous is None and not row["state"]:
            continue
        if key != previous:
            result.append({**row, "source_sample_index": index})
            previous = key
    return result


def requested_consumption(recipe, trace):
    expected = []
    point = None
    previous = None
    for index, event in enumerate(recipe_events(recipe)):
        if event["state"]:
            point = (event["x"], event["y"])
        key = (event["state"], *(point or (event["x"], event["y"])))
        if key != previous:
            expected.append({"recipe_event_index": index, "requested_at_ms": event["requested_at_ms"], "key": key})
            previous = key
    result = []
    complete = len(expected) == len(trace["changes"])
    for want, observed in zip(expected, trace["changes"]):
        equal = want["key"] == (observed["state"], observed["handler_x"], observed["handler_y"])
        complete &= equal
        staged = trace["raw"].get("events", [])
        event = staged[want["recipe_event_index"]] if len(staged) > want["recipe_event_index"] else None
        actual_injection = event["actual_at_us"] - trace["raw"]["clock_origin_us"] if event else None
        result.append({"recipe_event_index": want["recipe_event_index"], "requested_at_ms": want["requested_at_ms"],
                       "actual_consumed_us": observed["relative_us"], "same_requested_state": equal,
                       "consume_delay_from_requested_us": observed["relative_us"] - want["requested_at_ms"] * 1000,
                       "consume_delay_from_actual_injection_us": observed["relative_us"] - actual_injection if actual_injection is not None else None})
    return {"state_changes_complete": complete, "expected_state_change_count": len(expected),
            "actual_state_change_count": len(trace["changes"]), "samples": result,
            "pairing": "State changes in declared sequence; no search for a later matching sample. Stationary repeated polls are retained separately."}


def initial_nodes(receipt):
    evidence = receipt.get("initial", {}).get("stateEvidence", {})
    if not isinstance(evidence, dict):
        return []
    value = evidence.get("scroll")
    if isinstance(value, dict):
        return value.get("nodes", [])
    if isinstance(value, list):
        for line in value:
            if isinstance(line, str) and "SWSCROLL " in line:
                nodes = json.loads(line.split("SWSCROLL ", 1)[1]).get("nodes", [])
                tree = evidence.get("tree", [])
                parsed = []
                for item in tree:
                    fields = item.split()
                    if len(fields) >= 11 and fields[:2] == ["SWTREE", "NODE"]:
                        parsed.append({"left": int(fields[4]), "top": int(fields[5]),
                                       "width": int(fields[6]) - int(fields[4]) + 1,
                                       "height": int(fields[7]) - int(fields[5]) + 1})
                # Join only the same producer's source-documented depth-first
                # enumeration, never factory IDs to Gea IDs.
                return [{**parsed[node["id"]], **node} if node["id"] < len(parsed) else node for node in nodes]
    return evidence.get("nodes", [])


def bounds(framework, node):
    if framework == "factory":
        if "left" not in node or "top" not in node:
            return None
        return [node["left"], node["top"], node["width"], node["height"]]
    if not all(key in node for key in ("x", "y", "width", "height")):
        return None
    return [node[key] for key in ("x", "y", "width", "height")]


def contains(rectangle, point):
    x, y, width, height = rectangle
    return x <= point[0] < x + width and y <= point[1] < y + height


def visible_launcher_nodes(framework, nodes):
    role = "kind" if framework == "factory" else "class"
    kind = "launcher-icon" if framework == "factory" else "menu-icon"
    result = []
    for node in nodes:
        rectangle = bounds(framework, node)
        if node.get(role) != kind or rectangle is None:
            continue
        x, y, width, height = rectangle
        if width > 0 and height > 0 and x + width > 0 and y + height > 0 and x < 466 and y < 466:
            result.append(node)
    return result


def primary_state(framework, nodes, recipe, scene_nodes=None):
    """Select by documented scene and initial pointer hit, never cross-engine IDs."""
    scene = recipe["scene"]
    point = [recipe["events"][0][key] for key in ("x", "y")]
    roles = nodes if scene_nodes is None else scene_nodes
    if scene == "launcher" and not visible_launcher_nodes(framework, roles):
        return {"available": False, "fields": {}, "corners": None,
                "reason": "Actual visible launcher-icon/menu-icon role absent; launcher may have navigated"}
    if framework == "factory" and scene in ("launcher", "settings-list"):
        # Pinned launcher view.cpp:226-227 and setup view.cpp:14-15 both use
        # a 466px frame. The receipt's source-origin mapping puts it at (0,0).
        # A generic container on a new screen cannot replace this authority.
        frame = [0, 0, 466, 466]
        retained = [node for node in roles if node.get("kind") == "scroll-container"
                    and bounds(framework, node) == frame]
        if len(retained) != 1:
            return {"available": False, "fields": {}, "corners": None,
                    "reason": "Source scene scroll-container frame absent or ambiguous after route change",
                    "candidate_count": len(retained)}
    if framework == "gea" and scene == "launcher":
        titles = [row.get("text", "") for row in nodes if row.get("class") == "menu-title"]
        dots = sorted([row for row in nodes if row.get("class") == "dot"], key=lambda row: row["x"])
        selected = [index for index, row in enumerate(dots) if row.get("selected_class")]
        return {"available": bool(titles), "fields": {"displayed_launcher_title": titles,
                "displayed_dot_index": selected}, "corners": None,
                "evidence": "Actual menu-title text and selected dot classes; no native launcher scroll offset"}
    if framework == "gea":
        kind = "roller" if scene == "roller" else "settings"
        candidates = [node for node in nodes if node.get("class") == kind]
    else:
        candidates = [node for node in nodes
                      if (node.get("selected", -1) >= 0) == (scene == "roller")]
        if scene in ("launcher", "settings-list"):
            candidates = [node for node in candidates if bounds(framework, node) == frame
                          and (scene_nodes is not None or node.get("kind") == "scroll-container")]
    candidates = [node for node in candidates if bounds(framework, node) is not None
                  and contains(bounds(framework, node), point)]
    if scene != "roller" and framework == "factory" and candidates:
        # Scroll telemetry has no CSS classes. Use the largest containing native
        # scroll container; equal-area ambiguity is reported rather than guessed.
        largest = max(bounds(framework, node)[2] * bounds(framework, node)[3] for node in candidates)
        candidates = [node for node in candidates
                      if bounds(framework, node)[2] * bounds(framework, node)[3] == largest]
    if len(candidates) != 1:
        return {"available": False, "fields": {}, "corners": None,
                "reason": "Primary node bounds are missing, absent or ambiguous", "candidate_count": len(candidates)}
    node = candidates[0]
    rectangle = bounds(framework, node)
    fields = {}
    if framework == "factory":
        fields.update(scroll_x=node["x"], scroll_y=node["y"])
        if scene == "roller":
            fields["committed_roller_index"] = node["selected"]
    else:
        fields.update(scroll_x=node.get("scroll_x"), scroll_y=node.get("scroll_y"))
        if scene == "roller":
            center = rectangle[1] + rectangle[3] / 2
            labels = {row.get("text", "") for row in nodes if row.get("class") == "roller-row"
                      and bounds(framework, row) is not None
                      and abs(row["x"] + row["width"] / 2 - (rectangle[0] + rectangle[2] / 2)) == 0
                      and row["y"] + row["height"] / 2 == center}
            fields["exact_centered_roller_labels"] = sorted(labels)
    return {"available": True, "fields": fields, "bounds": rectangle,
            "corners": node.get("corners"), "node_id": node["id"],
            "evidence": "Actual native node fields; factory x/y mean scroll, Gea x/y mean layout. "
                        "Centered labels are displayed state, not a Gea committed-selection getter."}


def launcher_corners(framework, nodes):
    motifs = []
    for node in visible_launcher_nodes(framework, nodes):
        rectangle = bounds(framework, node)
        if node.get("corners") is None:
            continue
        motifs.append({"node_id": node["id"], "bounds": rectangle, "corners": node["corners"]})
    return sorted(motifs, key=lambda motif: motif["bounds"][0])


def compare_launcher_corners(factory, gea, permitted):
    available = permitted and bool(factory) and bool(gea)
    return {"comparison_available": available, "factory": factory, "gea": gea,
            "visible_count_equal": len(factory) == len(gea),
            "exactly_equal": [row["corners"] for row in factory] == [row["corners"] for row in gea] if available else None,
            "entity_scope": "Viewport-intersecting native launcher image motifs, ordered left-to-right by source layout; logical image/asset identity is not verified",
            "factory_role_authority": "Pinned app_launcher/view/view.cpp:245-275 image descendants of 200x200 icon containers; diagnostic kind=launcher-icon",
            "gea_role_authority": "app_launcher/view/view.tsx menu-icon buttons containing the rendered icon; actual renderer-transformed wrapper corners",
            "reason": None if available else "Actual observed launcher motif corners or comparable input/timing unavailable"}


def state_comparison(factory, gea, permitted):
    common = sorted(set(factory["fields"]) & set(gea["fields"]))
    fields = {key: {"factory": factory["fields"][key], "gea": gea["fields"][key],
                    "exactly_equal": factory["fields"][key] == gea["fields"][key]} for key in common
              if factory["fields"][key] is not None and gea["fields"][key] is not None}
    # A CSS roller is not a native scrolling widget. Its native scroll_y=0 and
    # LVGL's scroll_y are different mechanisms, not comparable motion metrics.
    if "committed_roller_index" in factory["fields"]:
        fields = {}
    available = factory["available"] and gea["available"] and bool(fields)
    return {"factory": factory, "gea": gea, "common_fields": fields,
            "comparison_available": available and permitted,
            "reason": None if available and permitted else
                      "Input/timing gate closed or equivalent native state field unavailable"}


def prepared_state(factory, gea, recipe, left, right):
    # Initial legacy SWSCROLL has offsets/bounds but lacks role tags. Require
    # the actual typed scene/frame retained at the staged zero-time observation
    # before those prepared offsets can serve as the source scene authority.
    scene_nodes = left["observations"].get(0, {}).get("nodes", [])
    lf = primary_state("factory", mapped_nodes(initial_nodes(factory), "factory", left["coordinate_mapping"]["rawToLogicalSubtract"]), recipe, scene_nodes)
    rg = primary_state("gea", mapped_nodes(initial_nodes(gea), "gea", right["coordinate_mapping"]["rawToLogicalSubtract"]), recipe)
    comparison = state_comparison(lf, rg, True)
    scene = recipe["scene"]
    if scene == "roller":
        value = lf["fields"].get("committed_roller_index")
        labels = rg["fields"].get("exact_centered_roller_labels")
        available = value is not None and labels is not None and len(labels) == 1
        equal = available and labels == [f"{value:02d}"]
        scope = "Prepared hour picker: native factory selected index versus actual Gea centered hour label; Gea committed state unmeasured"
    elif scene == "launcher":
        evidence = factory.get("initial", {}).get("stateEvidence", {})
        label = evidence.get("verifiedLabel") if isinstance(evidence, dict) else None
        texts = []
        for line in evidence.get("tree", []) if isinstance(evidence, dict) else []:
            fields = line.split()
            if len(fields) == 12 and fields[:2] == ["SWTREE", "NODE"] and fields[3] == "label":
                texts.append(bytes.fromhex(fields[11]).decode())
        titles = rg["fields"].get("displayed_launcher_title")
        available = (lf["available"] and rg["available"] and label is not None and label in texts
                     and titles is not None and len(titles) == 1)
        equal = available and titles == [label]
        scope = "Actual prepared launcher label from factory TREE and Gea menu-title"
    else:
        available = comparison["comparison_available"]
        equal = available and all(value["exactly_equal"] for value in comparison["common_fields"].values())
        scope = "Actual initial native scroll offsets"
    return {**comparison, "compatibility_available": available, "compatible_displayed_start": bool(equal),
            "compatibility_scope": scope}


def coordinate_mapping(receipt):
    mapping = receipt.get("coordinateMapping")
    if mapping is None:
        return [0, 0], "No transform declared; raw coordinates retained"
    offset = mapping.get("rawToLogicalSubtract")
    if (not isinstance(offset, list) or len(offset) != 2
            or not all(isinstance(value, int) for value in offset)
            or not isinstance(mapping.get("evidence"), str) or not mapping["evidence"].strip()):
        raise ValueError("Coordinate mapping needs two integer offsets and source evidence")
    return offset, mapping["evidence"]


def mapped_nodes(nodes, framework, offset):
    result = copy.deepcopy(nodes)
    for node in result:
        for axis, shift in zip(("left", "top") if framework == "factory" else ("x", "y"), offset):
            if axis in node:
                node[axis] -= shift
        if node.get("corners") is not None:
            node["corners"] = [[point[0] - offset[0], point[1] - offset[1]] for point in node["corners"]]
    return result


def normalize(receipt, framework):
    raw = receipt.get("observed", {}).get("raw")
    if not isinstance(raw, dict):
        raise ValueError("Receipt must preserve observed.raw SWGESTURE")
    if not isinstance(raw.get("clock_origin_us"), int):
        raise ValueError("Missing monotonic device clock origin")
    offset, evidence = coordinate_mapping(receipt)
    original_rows = consumed(framework, raw)
    rows = copy.deepcopy(original_rows)
    for row in rows:
        for key, shift in (("x", offset[0]), ("y", offset[1]), ("handler_x", offset[0]), ("handler_y", offset[1])):
            row[key] -= shift
    raw = copy.deepcopy(raw)
    for event in raw.get("events", []):
        event["x"] -= offset[0]
        event["y"] -= offset[1]
    for observation in raw.get("observations", []):
        observation["nodes"] = mapped_nodes(observation["nodes"], framework, offset)
    origin = raw["clock_origin_us"]
    observations = {row["requested_at_ms"]: {**row, "relative_us": row["actual_at_us"] - origin}
                    for row in raw.get("observations", [])}
    if len(observations) != len(raw.get("observations", [])):
        raise ValueError("Duplicate requested observation time")
    chronology = [row["relative_us"] for row in rows]
    issues = []
    if raw.get("pointer_reads_dropped") is None:
        issues.append("Input drop count is missing")
    if not rows:
        issues.append("No actual consumed pointer samples")
    if chronology != sorted(chronology) or any(time < 0 for time in chronology):
        issues.append("Consumed timestamps are nonmonotonic or precede gesture origin")
    if raw.get("pointer_reads_dropped", 0):
        issues.append("Actual input trace dropped samples")
    if any(row.get("truncated") or row.get("nodes_dropped", 0) for row in observations.values()):
        issues.append("Observed native node trace truncated")
    if any(("truncated" not in row if framework == "factory" else "nodes_dropped" not in row)
           for row in observations.values()):
        issues.append("Observation truncation/drop counts are missing")
    if receipt.get("hardwareMuteVerified") is not True:
        issues.append("Hardware mute verification is missing")
    if receipt.get("normalHalVerified") is not True:
        issues.append("Normal input authority is unverified")
    if not receipt.get("initial", {}).get("stateEvidence"):
        issues.append("Initial state evidence is missing")
    return {"raw": raw, "rows": rows, "original_rows": original_rows,
            "coordinate_mapping": {"rawToLogicalSubtract": offset, "evidence": evidence},
            "changes": changes(rows),
            "observations": observations, "issues": issues}


def picker_to_saved_label(factory_trace, gea, recipe):
    outcome = gea.get("committedOutcome", {})
    if recipe["scene"] != "roller" or not factory_trace["observations"]:
        return None
    final = factory_trace["observations"].get(recipe["observeAtMs"][-1])
    nodes = [] if final is None else final["nodes"]
    rollers = sorted([node for node in nodes if node.get("selected", -1) >= 0
                      and bounds("factory", node) is not None], key=lambda node: node["left"])
    source = None
    if len(rollers) == 2 and 0 <= rollers[0]["selected"] <= 23 and 0 <= rollers[1]["selected"] <= 59:
        source = {"hour": rollers[0]["selected"], "minute": rollers[1]["selected"],
                  "value": f"{rollers[0]['selected']:02d}:{rollers[1]['selected']:02d}",
                  "requested_at_ms": final["requested_at_ms"], "nodes": rollers}
    actual = outcome.get("value")
    available = (source is not None and outcome.get("ordinaryUiConfirmed") is True
                 and outcome.get("comparisonAvailable") is not False
                 and outcome.get("kind") == "alarm-hour-minute-label"
                 and isinstance(actual, str) and re.fullmatch(r"[0-2][0-9]:[0-5][0-9]", actual) is not None)
    return {"comparison_available": available, "factory_public_picker": source,
            "gea_saved_alarm_label": actual,
            "exactly_equal": source["value"] == actual if available else None,
            "scope": "Factory actual final LVGL picker getters versus Gea ordinary OK and resulting public alarm label. Factory save/storage was not exercised.",
            "factory_authority": "Pinned app_alarm_clock/view/add_alarm.cpp:121-128 reads these two public selected getters as hour/minute"}


def compare_case(factory, gea, recipe, bound_us=0):
    left, right = normalize(factory, "factory"), normalize(gea, "gea")
    expected = recipe_events(recipe)
    stage = []
    recipe_equal = True
    for framework, trace in (("factory", left), ("gea", right)):
        actual = [{key: event.get(key) for key in expected[0]} for event in trace["raw"].get("events", [])]
        if actual != expected:
            trace["issues"].append("Staged events differ from the declared recipe")
            recipe_equal = False
    if recipe_equal:
        for first, second, requested in zip(left["raw"]["events"], right["raw"]["events"], expected):
            lf = first["actual_at_us"] - left["raw"]["clock_origin_us"]
            rg = second["actual_at_us"] - right["raw"]["clock_origin_us"]
            stage.append({"requested_at_ms": requested["requested_at_ms"], **timing_delta(lf, rg, bound_us),
                          "factory_lateness_us": lf - requested["requested_at_ms"] * 1000,
                          "gea_lateness_us": rg - requested["requested_at_ms"] * 1000})
    transitions = []
    histories_equal = len(left["changes"]) == len(right["changes"])
    for index, (first, second) in enumerate(zip(left["changes"], right["changes"])):
        equal = all(first[key] == second[key] for key in ("state", "handler_x", "handler_y"))
        histories_equal &= equal
        transitions.append({"change_index": index, "factory": first, "gea": second,
                            "same_handled_state": equal,
                            **timing_delta(first["relative_us"], second["relative_us"], bound_us)})
    timing_equal = bool(stage) and all(row["within_declared_bound"] for row in stage + transitions)
    initial_route_equal = factory.get("initial", {}).get("route") == gea.get("initial", {}).get("route") == recipe["requiredRoute"]
    requested = {"factory": requested_consumption(recipe, left), "gea": requested_consumption(recipe, right)}
    initial = prepared_state(factory, gea, recipe, left, right)
    input_gate = initial["compatible_displayed_start"] and all(value["state_changes_complete"] for value in requested.values()) and not left["issues"] and not right["issues"] and recipe_equal and histories_equal and timing_equal and initial_route_equal
    samples = []
    for time in recipe["observeAtMs"]:
        first, second = left["observations"].get(time), right["observations"].get(time)
        if first is None or second is None:
            samples.append({"requested_at_ms": time, "comparison_available": False,
                            "reason": "Requested observation missing"})
            continue
        delta = timing_delta(first["relative_us"], second["relative_us"], bound_us)
        allowed = input_gate and delta["within_declared_bound"]
        lf = primary_state("factory", first["nodes"], recipe)
        rg = primary_state("gea", second["nodes"], recipe)
        scene_allowed = allowed and lf["available"] and rg["available"]
        corner_available = scene_allowed and lf["corners"] is not None and rg["corners"] is not None
        corner = {"comparison_available": corner_available,
                  "factory": lf["corners"], "gea": rg["corners"],
                  "exactly_equal": lf["corners"] == rg["corners"] if corner_available else None,
                  "reason": None if corner_available else "Actual transformed corners or comparable input/timing unavailable"}
        samples.append({"requested_at_ms": time, **delta,
                        "factory_lateness_us": first["relative_us"] - time * 1000,
                        "gea_lateness_us": second["relative_us"] - time * 1000,
                        "state": state_comparison(lf, rg, allowed), "corners": corner,
                        "launcher_motif_corners": compare_launcher_corners(
                            launcher_corners("factory", first["nodes"]),
                            launcher_corners("gea", second["nodes"]), scene_allowed)
                            if recipe["scene"] == "launcher" else None})
    outcome = {}
    for framework, receipt in (("factory", factory), ("gea", gea)):
        # Collectors can exercise ordinary OK/Save and then read actual public
        # result labels. Keep this evidence apart from transient row positions.
        value = receipt.get("committedOutcome")
        if (isinstance(value, dict) and value.get("evidence") and value.get("ordinaryUiConfirmed") is True
                and value.get("comparisonAvailable") is not False and value.get("value") is not None):
            outcome[framework] = value
    outcome_available = len(outcome) == 2 and outcome["factory"].get("kind") == outcome["gea"].get("kind")
    committed = {"factory": outcome.get("factory"), "gea": outcome.get("gea"),
                 "comparison_available": outcome_available,
                 "exactly_equal": outcome["factory"].get("value") == outcome["gea"].get("value") if outcome_available else None,
                 "reason": None if outcome_available else "Ordinary UI confirmation and resulting public labels unavailable"}
    return {"case_id": recipe["id"], "scene": recipe["scene"], "declared_timing_bound_us": bound_us,
            "initial_route_equal": initial_route_equal, "initial_state": initial,
            "coordinate_mappings": {"factory": left["coordinate_mapping"], "gea": right["coordinate_mapping"]},
            "staged_recipe_equal": recipe_equal, "staged_event_timing": stage,
            "consumed_history_equal": histories_equal, "consumed_change_timing": transitions, "requested_vs_consumed": requested,
            "input_comparison_available": input_gate,
            "factory_input_issues": left["issues"], "gea_input_issues": right["issues"],
            "factory_consumed_samples": left["rows"], "gea_consumed_samples": right["rows"],
            "factory_original_consumed_samples": left["original_rows"], "gea_original_consumed_samples": right["original_rows"],
            "observations": samples,
            "final_observation": samples[-1] if samples else None, "committed_outcome": committed,
            "picker_to_saved_label": picker_to_saved_label(left, gea, recipe),
            "parity_established": False,
            "interpretation": "Matching recorded fields support only those fields at the paired requested times. "
                              "Identical recipes, final values or sparse samples do not establish motion parity."}


def read_receipts(directory):
    result = {}
    if not directory.is_dir():
        raise FileNotFoundError("Gesture receipt directory is missing: " + str(directory))
    for path in sorted(directory.glob("*.json")):
        receipt = json.loads(path.read_text())
        case = receipt.get("caseId")
        if not case:
            continue
        if case in result:
            raise ValueError("Duplicate gesture case: " + case)
        receipt["_source"] = {"path": str(path.resolve()), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        result[case] = receipt
    return result


def analyze(factory, gea, plan, bound_us=0):
    if bound_us < 0:
        raise ValueError("Timing bound must be explicit and nonnegative")
    cases = []
    for recipe in plan["cases"]:
        case = recipe["id"]
        if case not in factory or case not in gea:
            cases.append({"case_id": case, "comparison_available": False,
                          "missing_frameworks": [name for name, rows in (("factory", factory), ("gea", gea)) if case not in rows]})
            continue
        try:
            comparison = compare_case(factory[case], gea[case], recipe, bound_us)
        except (ValueError, KeyError, TypeError) as error:
            comparison = {"case_id": case, "comparison_available": False, "evidence_error": str(error)}
        comparison["sources"] = {"factory": factory[case].get("_source"), "gea": gea[case].get("_source")}
        cases.append(comparison)
    observed_cases = [case for case in cases if "observations" in case]
    sampled = [sample for case in observed_cases for sample in case["observations"]]
    summary = {
        "planned_cases": len(cases),
        "paired_receipts": sum("sources" in case for case in cases),
        "input_comparisons_available": sum(case.get("input_comparison_available", False) for case in cases),
        "state_observations_comparable": sum(sample.get("state", {}).get("comparison_available", False) for sample in sampled),
        "corner_observations_comparable": sum(sample.get("corners", {}).get("comparison_available", False) for sample in sampled),
        "corner_observations_different": sum(sample.get("corners", {}).get("exactly_equal") is False for sample in sampled),
        "launcher_motif_observations_comparable": sum((sample.get("launcher_motif_corners") or {}).get("comparison_available", False) for sample in sampled),
        "launcher_motif_observations_different": sum((sample.get("launcher_motif_corners") or {}).get("exactly_equal") is False for sample in sampled),
        "committed_outcomes_comparable": sum(case.get("committed_outcome", {}).get("comparison_available", False) for case in cases),
        "committed_outcomes_different": sum(case.get("committed_outcome", {}).get("exactly_equal") is False for case in cases),
    }
    return {"schema_version": 1, "factory_commit": plan["factoryCommit"], "summary": summary,
            "policy": {"timing_bound_us": bound_us, "pixel_tolerance": 0, "time_alignment_search": False,
                       "sample_pairing": "Identical requested_at_ms only; no interpolation or nearest-time pairing",
                       "input_sampling": "Factory normal LVGL polls versus Gea consumed dispatch; unchanged polls retained but excluded from state-change pairing",
                       "corner_scope": "Only actual transformed corners from both producers; rectangular bounds are not substituted"},
            "cases": cases, "parity_established": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--factory", type=Path, required=True)
    parser.add_argument("--gea", type=Path, required=True)
    parser.add_argument("--plan", type=Path, default=Path(__file__).with_name("gesture-plan.json"))
    parser.add_argument("--timing-bound-us", type=int, default=0)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = analyze(read_receipts(args.factory), read_receipts(args.gea), json.loads(args.plan.read_text()), args.timing_bound_us)
    text = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
