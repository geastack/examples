#!/usr/bin/env python3
"""Verify full-flash data preservation without reading credentials or hardware."""

import hashlib
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("restore", Path(__file__).with_name("restore-gea.py"))
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


class RestorationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.backup = b"\xA5" * (16 * 1024 * 1024)
        cls.digest = hashlib.sha256(cls.backup).hexdigest()

    def test_components_replace_only_their_ranges_and_backup_stays_immutable(self):
        with patch.object(restore, "BACKUP_SHA256", self.digest):
            actual = restore.merged_image(self.backup, [(0, b"BOOT"), (0x20000, b"MUTED")])
        self.assertEqual(actual[:4], b"BOOT")
        self.assertEqual(actual[0x20000:0x20005], b"MUTED")
        self.assertEqual(actual[4:0x20000], self.backup[4:0x20000])
        self.assertEqual(actual[0x20005:], self.backup[0x20005:])
        self.assertEqual(hashlib.sha256(self.backup).hexdigest(), self.digest)

    def test_corrupt_or_truncated_backup_fails_closed(self):
        with self.assertRaises(ValueError):
            restore.merged_image(b"short", [])
        with self.assertRaises(ValueError):
            restore.merged_image(self.backup, [])

    def test_overlapping_and_out_of_flash_ranges_fail_closed(self):
        with patch.object(restore, "BACKUP_SHA256", self.digest):
            for components in ([(0, b"BOOT"), (3, b"BAD")], [(-1, b"BAD")],
                               [(len(self.backup), b"BAD")]):
                with self.assertRaises(ValueError):
                    restore.merged_image(self.backup, components)


if __name__ == "__main__":
    unittest.main()
