"""Counterexamples run only on disposable owned fixtures, without sudo."""
import contextlib
import errno
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock

SOURCE = Path(__file__).with_name('harden-installed-chrome.py')
SPEC = importlib.util.spec_from_file_location('chrome_permissions', SOURCE)
h = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(h)


class ChromePermissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='midas-chrome-permissions-')
        self.anchor = Path(self.temp.name)
        self.chrome = self.anchor / 'opt/google/chrome'
        for relative in ['opt', 'opt/google', 'opt/google/chrome', 'opt/google/chrome/resources',
                         'opt/hostedtoolcache', 'opt/google/unrelated']:
            path = self.anchor / relative
            path.mkdir()
            path.chmod(0o777)
        for relative, content, mode in [
            ('opt/google/chrome/chrome', b'synthetic executable, never executed', 0o777),
            ('opt/google/chrome/lib.so', b'synthetic library', 0o666),
            ('opt/google/chrome/resources/data.pak', b'synthetic resource', 0o664),
            ('opt/hostedtoolcache/sentinel', b'outside Chrome', 0o666),
            ('opt/google/unrelated/sentinel', b'outside Chrome', 0o666),
        ]:
            path = self.anchor / relative
            path.write_bytes(content)
            path.chmod(mode)
        info = self.anchor.stat()
        self.device = str(os.major(info.st_dev)) + ':' + str(os.minor(info.st_dev))
        self.mounts = '1 0 ' + self.device + ' / / rw - ext4 /dev/fixture rw\n'

    def tearDown(self):
        self.temp.cleanup()

    def state(self):
        return {str(path.relative_to(self.anchor)): (stat.S_IMODE(path.lstat().st_mode),
                path.lstat().st_uid, path.lstat().st_gid,
                hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() and not path.is_symlink() else None)
                for path in self.anchor.rglob('*')}

    def run_hardening(self, reader=None):
        return h.harden(str(self.anchor), os.getuid(), reader or (lambda: self.mounts))

    def refuses_without_mutation(self, code=None, reader=None):
        before = self.state()
        with self.assertRaises(h.Refusal) as caught:
            self.run_hardening(reader)
        if code is not None:
            self.assertEqual(caught.exception.code, code)
        self.assertEqual(caught.exception.receipt['changes'], [])
        self.assertEqual(self.state(), before)
        return caught.exception

    def test_only_write_bits_change_inside_the_exact_scope(self):
        before = self.state()
        report = self.run_hardening()
        self.assertEqual(report['status'], 'PASS')
        after = self.state()
        for relative, values in before.items():
            scoped = relative in ['opt', 'opt/google'] or relative.startswith('opt/google/chrome')
            expected = values[0] & ~0o022 if scoped else values[0]
            self.assertEqual(after[relative], (expected, *values[1:]))
        self.assertEqual(report['files_hashed'], 3)
        self.assertTrue(all(row['sha256_before'] == row['sha256_after'] for row in report['entries']))
        self.assertFalse(report['timestamps_invariant'])

    def test_repeat_is_idempotent_without_more_chmod(self):
        self.run_hardening()
        with mock.patch.object(h.os, 'fchmod', side_effect=AssertionError('No repeated mutation')):
            self.assertEqual(self.run_hardening()['changes'], [])

    def test_fixed_directory_anchors_refuse_files_before_content_read_or_chmod(self):
        for relative in ['opt', 'opt/google', 'opt/google/chrome']:
            with self.subTest(anchor=relative):
                target = self.anchor / relative
                saved = self.anchor / 'saved-anchor'
                target.rename(saved)
                target.write_bytes(b'anchor content must never be read')
                try:
                    with mock.patch.object(h.os, 'pread', side_effect=AssertionError('No anchor content read')), \
                            mock.patch.object(h.os, 'fchmod', side_effect=AssertionError('No mutation')), \
                            self.assertRaises(h.Refusal) as caught:
                        self.run_hardening()
                    self.assertEqual(caught.exception.code, 'fixed_anchor_not_directory')
                    self.assertEqual(caught.exception.receipt['changes'], [])
                    self.assertEqual(caught.exception.receipt['error_path'], str(target))
                finally:
                    target.unlink()
                    saved.rename(target)

    def test_symlink_file_or_directory_is_refused_before_mutation(self):
        for target in [self.anchor / 'opt/hostedtoolcache/sentinel', self.chrome / 'resources']:
            with self.subTest(target=target.name):
                link = self.chrome / 'alias'
                link.symlink_to(target)
                self.refuses_without_mutation('type_not_allowed')
                link.unlink()

    def test_hardlink_to_a_file_outside_chrome_is_refused(self):
        os.link(self.anchor / 'opt/hostedtoolcache/sentinel', self.chrome / 'alias')
        self.refuses_without_mutation('hardlink_not_allowed')

    def test_fifo_is_refused_without_opening_it(self):
        os.mkfifo(self.chrome / 'pipe')
        self.refuses_without_mutation('type_not_allowed')

    @contextlib.contextmanager
    def synthetic_stat(self, basename, changes):
        original_stat, original_fstat = os.stat, os.fstat

        def alter(info):
            fields = {name: getattr(info, name) for name in ['st_dev', 'st_ino', 'st_uid', 'st_gid',
                'st_mode', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']}
            for key, value in changes.items():
                fields[key] = value(fields[key]) if callable(value) else value
            return SimpleNamespace(**fields)

        def wrapped_stat(path, *args, **kwargs):
            info = original_stat(path, *args, **kwargs)
            return alter(info) if os.path.basename(os.fspath(path)) == basename else info

        def wrapped_fstat(descriptor):
            info = original_fstat(descriptor)
            return alter(info) if os.path.basename(os.readlink('/proc/self/fd/' + str(descriptor))) == basename else info

        with mock.patch.object(h.os, 'stat', side_effect=wrapped_stat), mock.patch.object(h.os, 'fstat', side_effect=wrapped_fstat):
            yield

    def test_foreign_owner_or_device_is_refused_without_chown_or_mount(self):
        for changes, code in [({'st_uid': os.getuid() + 1}, 'owner_not_expected'),
                              ({'st_dev': self.anchor.stat().st_dev + 1}, 'filesystem_boundary')]:
            before = self.state()
            with self.synthetic_stat('lib.so', changes), self.assertRaises(h.Refusal) as caught:
                self.run_hardening()
            self.assertEqual(caught.exception.code, code)
            self.assertEqual(caught.exception.receipt['changes'], [])
            self.assertEqual(self.state(), before)

    def test_synthetic_special_bits_never_receive_fchmod(self):
        helper = self.chrome / 'chrome-sandbox'
        helper.write_bytes(b'non-executable fixture contents')
        helper.chmod(0o755)  # No fixture ever receives a real SUID/SGID bit.
        original = os.fchmod
        changed = []

        def track(descriptor, mode):
            changed.append(os.readlink('/proc/self/fd/' + str(descriptor)))
            original(descriptor, mode)

        with self.synthetic_stat('chrome-sandbox', {'st_mode': lambda value: value | stat.S_ISUID}), \
                mock.patch.object(h.os, 'fchmod', side_effect=track):
            report = self.run_hardening()
        self.assertEqual(report['status'], 'PASS')
        self.assertNotIn(str(helper), changed)
        self.assertEqual(stat.S_IMODE(helper.stat().st_mode), 0o755)

    def test_synthetic_special_bits_with_write_access_close_before_mutation(self):
        for bit in [stat.S_ISUID, stat.S_ISGID]:
            before = self.state()
            with self.synthetic_stat('lib.so', {'st_mode': lambda value: value | bit}), self.assertRaises(h.Refusal) as caught:
                self.run_hardening()
            self.assertEqual(caught.exception.code, 'special_bits_require_change')
            self.assertEqual(caught.exception.receipt['changes'], [])
            self.assertEqual(self.state(), before)

    def test_mounts_inside_scope_or_aliases_outside_are_refused(self):
        rows = [
            ('0:999', '/', str(self.anchor / 'opt')),
            ('0:999', '/', str(self.chrome / 'resources')),
            (self.device, str(self.anchor / 'opt'), '/outside'),
            (self.device, str(self.chrome), '/outside'),
            (self.device, str(self.chrome / 'resources'), '/outside'),
            (self.device, '/', '/outside'),
        ]
        for device, root, point in rows:
            with self.subTest(root=root, point=point):
                extra = '2 1 ' + device + ' ' + root + ' ' + point + ' rw - ext4 /dev/fixture rw\n'
                self.refuses_without_mutation(reader=lambda: self.mounts + extra)

    def test_alias_of_unrelated_opt_child_does_not_expand_the_scope(self):
        extra = '2 1 ' + self.device + ' ' + str(self.anchor / 'opt/hostedtoolcache') + ' /outside rw - ext4 /dev/fixture rw\n'
        self.assertEqual(self.run_hardening(lambda: self.mounts + extra)['status'], 'PASS')

    def test_ambiguous_or_unbounded_mount_metadata_is_refused(self):
        for text in ['', self.mounts + self.mounts, self.mounts.replace('1 0', '2 0') + self.mounts,
                     'x' * (h.MAX_MOUNT_BYTES + 1)]:
            with self.subTest(length=len(text)):
                self.refuses_without_mutation(reader=lambda: text)

    def test_inventory_size_path_and_time_bounds_precede_mutation(self):
        for name, value in [('MAX_ENTRIES', 3), ('MAX_FILE_BYTES', 1), ('MAX_TOTAL_BYTES', 1),
                            ('MAX_DEPTH', 2), ('MAX_PATH', 1), ('MAX_SECONDS', -1)]:
            with self.subTest(limit=name), mock.patch.object(h, name, value):
                self.refuses_without_mutation()

    def test_content_change_after_inventory_is_refused_before_chmod(self):
        calls = 0
        original_modes = {key: value[0] for key, value in self.state().items()}

        def reader():
            nonlocal calls
            calls += 1
            if calls == 2:
                (self.chrome / 'lib.so').write_bytes(b'changed fixture')
            return self.mounts

        with self.assertRaises(h.Refusal) as caught:
            self.run_hardening(reader)
        self.assertEqual(caught.exception.receipt['changes'], [])
        self.assertEqual({key: value[0] for key, value in self.state().items()}, original_modes)

    def test_symlink_swap_after_inventory_is_refused_before_chmod(self):
        calls = 0

        def reader():
            nonlocal calls
            calls += 1
            if calls == 2:
                (self.chrome / 'chrome').unlink()
                (self.chrome / 'chrome').symlink_to(self.anchor / 'opt/hostedtoolcache/sentinel')
            return self.mounts

        with self.assertRaises(h.Refusal) as caught:
            self.run_hardening(reader)
        self.assertEqual(caught.exception.receipt['changes'], [])
        self.assertEqual(stat.S_IMODE((self.anchor / 'opt').stat().st_mode), 0o777)

    def test_partial_failure_never_restores_world_write(self):
        original = os.fchmod
        calls = 0

        def fail(descriptor, mode):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise PermissionError(errno.EACCES, 'fixture denial')
            original(descriptor, mode)

        with mock.patch.object(h.os, 'fchmod', side_effect=fail), self.assertRaises(h.Refusal) as caught:
            self.run_hardening()
        self.assertEqual(caught.exception.receipt['status'], 'PARTIAL')
        self.assertEqual(caught.exception.receipt['error_path'], str(self.anchor / 'opt/google'))
        self.assertEqual(stat.S_IMODE((self.anchor / 'opt').stat().st_mode), 0o755)
        self.assertEqual(stat.S_IMODE((self.anchor / 'opt/google').stat().st_mode), 0o777)
        self.assertEqual(stat.S_IMODE((self.anchor / 'opt/hostedtoolcache').stat().st_mode), 0o777)

    def test_post_mutation_content_change_cannot_report_pass(self):
        calls = 0

        def reader():
            nonlocal calls
            calls += 1
            if calls == 3:
                (self.chrome / 'lib.so').write_bytes(b'post-change fixture')
            return self.mounts

        with self.assertRaises(h.Refusal) as caught:
            self.run_hardening(reader)
        self.assertEqual(caught.exception.receipt['status'], 'PARTIAL')

    def test_main_refuses_arguments_and_non_root_before_system_access(self):
        for argv, code in [(['helper', '/arbitrary-target'], 'arguments_not_allowed'),
                           (['helper'], 'root_linux_required')]:
            with mock.patch.object(sys, 'argv', argv), mock.patch.object(h.os, 'getuid', return_value=1001), \
                    mock.patch.object(h.os, 'geteuid', return_value=1001), \
                    mock.patch.object(h, 'harden', side_effect=AssertionError('System scope must not be entered')):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    self.assertEqual(h.main(), 1)
                self.assertEqual(json.loads(output.getvalue())['error'], code)


if __name__ == '__main__':
    unittest.main(verbosity=2)
