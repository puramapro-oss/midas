"""Remove group/other write bits from the fixed installed Chrome scope only.

The production entry point accepts no arguments or configurable target. It must
run before application/dependency code or private credentials in a disposable CI
runner. It writes its receipt to stdout, never to a privileged output path.
"""
import hashlib
import json
import os
import posixpath
import re
import stat
import sys
import time

MAX_ENTRIES = 4096
MAX_DEPTH = 16
MAX_PATH = 1024
MAX_FILE_BYTES = 1024 ** 3
MAX_TOTAL_BYTES = 2 * 1024 ** 3
MAX_MOUNT_BYTES = 1024 ** 2
MAX_SECONDS = 60


class Refusal(Exception):
    def __init__(self, code, path=None):
        super().__init__(code)
        self.code = code
        self.path = path
        self.receipt = None


def require(condition, code, path=None):
    if not condition:
        raise Refusal(code, path)


def within(path, parent):
    return path == parent or path.startswith(parent.rstrip('/') + '/')


def signature(info):
    # atime changes on reads; ctime is compared only until our own fchmod.
    return (info.st_dev, info.st_ino, info.st_uid, info.st_gid, info.st_mode,
            info.st_nlink, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def mount_text():
    try:
        with open('/proc/self/mountinfo', 'rb') as stream:
            data = stream.read(MAX_MOUNT_BYTES + 1)
    except OSError as error:
        raise Refusal('mountinfo_system_error_' + str(error.errno), '/proc/self/mountinfo') from error
    require(len(data) <= MAX_MOUNT_BYTES, 'mountinfo_limit')
    return data.decode('utf-8', errors='strict')


def check_mounts(text, anchor, device):
    require(len(text.encode()) <= MAX_MOUNT_BYTES, 'mountinfo_limit')
    mounts = []
    for line in text.splitlines():
        require(len(line) <= 8192 and len(mounts) < MAX_ENTRIES, 'mount_record_limit')
        fields = line.split()
        require(len(fields) >= 10 and '-' in fields[6:], 'invalid_mountinfo')
        require(fields[0].isdigit() and fields[1].isdigit() and len(fields) >= fields.index('-') + 4,
                'invalid_mountinfo')
        require(re.fullmatch(r'[0-9]+:[0-9]+', fields[2]) is not None, 'invalid_mount_device')
        paths = [re.sub(r'\\([0-7]{3})', lambda match: chr(int(match[1], 8)), value)
                 for value in fields[3:5]]
        require(all(value.startswith('/') and '\x00' not in value and posixpath.normpath(value) == value for value in paths),
                'ambiguous_mount_path')
        mounts.append({'id': fields[0], 'device': fields[2], 'root': paths[0], 'point': paths[1]})
    require(0 < len(mounts) <= MAX_ENTRIES, 'mount_count_limit')
    require(len({item['id'] for item in mounts}) == len(mounts), 'duplicate_mount_identity')
    candidates = [item for item in mounts if within(anchor, item['point'])]
    require(bool(candidates), 'canonical_mount_missing')
    length = max(len(item['point']) for item in candidates)
    owners = [item for item in candidates if len(item['point']) == length]
    require(len(owners) == 1 and owners[0]['device'] == device, 'ambiguous_canonical_mount')
    owner = owners[0]
    parents = [posixpath.join(anchor, 'opt'), posixpath.join(anchor, 'opt/google')]
    chrome = posixpath.join(anchor, 'opt/google/chrome')
    to_filesystem = lambda value: posixpath.normpath(posixpath.join(
        owner['root'], posixpath.relpath(value, owner['point'])))
    parent_roots = [to_filesystem(value) for value in parents]
    chrome_root = to_filesystem(chrome)
    for item in mounts:
        if item['id'] == owner['id']:
            continue
        require(item['point'] not in parents and not within(item['point'], chrome),
                'mount_inside_scope', chrome)
        if item['device'] == owner['device']:
            # Parents are individual nodes; only Chrome is a recursive scope.
            overlap = (any(within(value, item['root']) for value in parent_roots)
                       or within(chrome_root, item['root']) or within(item['root'], chrome_root))
            require(not overlap, 'mount_alias_of_scope', chrome)
    return hashlib.sha256(text.encode()).hexdigest()


def harden(anchor, owner_uid, read_mounts=mount_text):
    """FD-scoped implementation; only main() chooses the production scope.

    Tests use an owned temporary anchor and synthetic mountinfo. They never call
    main() on system paths or mutate a real installation.
    """
    receipt = {'status': 'FAIL', 'phase': 'validation', 'removed_mask': '0022',
               'changes': [], 'entries': [], 'timestamps_invariant': False}
    descriptors = []
    nodes = []
    inodes = set()
    current_path = anchor
    total_bytes = 0
    deadline = time.monotonic() + MAX_SECONDS

    def budget():
        require(time.monotonic() <= deadline, 'time_limit')

    def names_in(descriptor, maximum):
        names = []
        with os.scandir(descriptor) as iterator:
            for entry in iterator:
                budget()
                require(len(names) < maximum, 'entry_count_limit', current_path)
                names.append(entry.name)
        return sorted(names)

    def fd_path(descriptor, expected):
        require(os.readlink('/proc/self/fd/' + str(descriptor)) == expected,
                'descriptor_path_changed', expected)

    def validate_info(info, path, kind, device):
        require(info.st_uid == owner_uid, 'owner_not_expected', path)
        require(info.st_dev == device, 'filesystem_boundary', path)
        require(stat.S_ISDIR(info.st_mode) if kind == 'directory' else stat.S_ISREG(info.st_mode),
                'type_not_allowed', path)
        if kind == 'file':
            require(info.st_nlink == 1, 'hardlink_not_allowed', path)
            require(0 <= info.st_size <= MAX_FILE_BYTES, 'file_size_limit', path)
        mode = stat.S_IMODE(info.st_mode)
        require(not (mode & 0o6000 and mode & 0o022), 'special_bits_require_change', path)

    def open_node(node):
        nonlocal current_path
        current_path = node['path']
        budget()
        fd_path(node['parent'], node['parent_path'])
        flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
        if node['kind'] == 'directory':
            flags |= os.O_DIRECTORY
        descriptor = os.open(node['name'], flags, dir_fd=node['parent'])
        try:
            info = os.fstat(descriptor)
            validate_info(info, node['path'], node['kind'], node['before'].st_dev)
            require(signature(info) == signature(node['expected']), 'entry_changed', node['path'])
            fd_path(descriptor, node['path'])
            linked = os.stat(node['name'], dir_fd=node['parent'], follow_symlinks=False)
            require(signature(linked) == signature(info), 'entry_binding_changed', node['path'])
            return descriptor
        except BaseException:
            os.close(descriptor)
            raise

    def digest(descriptor, node):
        result = hashlib.sha256()
        offset = 0
        while True:
            budget()
            chunk = os.pread(descriptor, 1024 * 1024, offset)
            if not chunk:
                break
            offset += len(chunk)
            require(offset <= node['before'].st_size, 'file_grew', node['path'])
            result.update(chunk)
        require(offset == node['before'].st_size, 'file_size_changed', node['path'])
        require(signature(os.fstat(descriptor)) == signature(node['expected']), 'file_changed_during_hash', node['path'])
        return result.hexdigest()

    def add(parent_fd, parent_path, name, depth, recurse, directory_required=False):
        nonlocal total_bytes, current_path
        budget()
        path = posixpath.join(parent_path, name)
        require(re.fullmatch(r'[A-Za-z0-9_.-]+', name) is not None and name not in ('.', '..'),
                'entry_name_not_allowed')
        require(depth <= MAX_DEPTH and len(path) <= MAX_PATH, 'path_limit')
        require(len(nodes) < MAX_ENTRIES, 'entry_count_limit')
        current_path = path
        info = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        require(not directory_required or stat.S_ISDIR(info.st_mode), 'fixed_anchor_not_directory', path)
        kind = 'directory' if stat.S_ISDIR(info.st_mode) else 'file'
        validate_info(info, path, kind, root_info.st_dev)
        node = {'parent': parent_fd, 'parent_path': parent_path, 'name': name, 'path': path,
                'kind': kind, 'before': info, 'expected': info, 'children': None, 'sha256': None}
        inode = (info.st_dev, info.st_ino)
        require(inode not in inodes, 'duplicate_inode', path)
        inodes.add(inode)
        nodes.append(node)
        descriptor = open_node(node)
        if kind == 'directory':
            descriptors.append(descriptor)
            node['descriptor'] = descriptor
            if recurse:
                names = names_in(descriptor, MAX_ENTRIES - len(nodes))
                node['children'] = names
                for child in names:
                    add(descriptor, path, child, depth + 1, True)
        else:
            try:
                total_bytes += info.st_size
                require(total_bytes <= MAX_TOTAL_BYTES, 'total_size_limit')
                node['sha256'] = digest(descriptor, node)
            finally:
                os.close(descriptor)
        return node

    try:
        require(os.path.isabs(anchor) and os.path.realpath(anchor) == anchor, 'anchor_not_canonical')
        root_fd = os.open(anchor, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)
        descriptors.append(root_fd)
        root_info = os.fstat(root_fd)
        require(root_info.st_uid == owner_uid and stat.S_IMODE(root_info.st_mode) & 0o022 == 0,
                'anchor_not_protected')
        fd_path(root_fd, anchor)
        device = str(os.major(root_info.st_dev)) + ':' + str(os.minor(root_info.st_dev))
        receipt['mountinfo_before_sha256'] = check_mounts(read_mounts(), anchor, device)
        opt = add(root_fd, anchor, 'opt', 1, False, directory_required=True)
        require(opt['kind'] == 'directory', 'opt_not_directory', opt['path'])
        google = add(opt['descriptor'], opt['path'], 'google', 2, False, directory_required=True)
        require(google['kind'] == 'directory', 'google_not_directory', google['path'])
        chrome = add(google['descriptor'], google['path'], 'chrome', 3, True, directory_required=True)
        require(chrome['kind'] == 'directory', 'chrome_not_directory', chrome['path'])
        require(any(node['path'] == chrome['path'] + '/chrome' and node['kind'] == 'file'
                    for node in nodes), 'chrome_binary_missing')
        receipt['mountinfo_preapply_sha256'] = check_mounts(read_mounts(), anchor, device)
        # Finish every validation before the first mutation.
        for node in nodes:
            descriptor = open_node(node)
            try:
                if node['children'] is not None:
                    require(names_in(descriptor, MAX_ENTRIES) == node['children'], 'directory_entries_changed', node['path'])
            finally:
                os.close(descriptor)
        receipt['phase'] = 'permission_reduction'
        # Freeze parent bindings before any file mutation; unrelated /opt trees
        # are neither traversed nor chmodded.
        ordered = [node for node in nodes if node['kind'] == 'directory'] + [node for node in nodes if node['kind'] == 'file']
        for node in ordered:
            descriptor = open_node(node)
            try:
                mode = stat.S_IMODE(node['before'].st_mode)
                target = mode & ~0o022
                if target != mode:
                    require(mode & 0o6000 == 0, 'special_bits_require_change', node['path'])
                    os.fchmod(descriptor, target)
                    receipt['changes'].append({'path': node['path'], 'before': format(mode, '04o'), 'after': format(target, '04o')})
                    observed = os.fstat(descriptor)
                    require((observed.st_dev, observed.st_ino, observed.st_uid, observed.st_gid,
                             observed.st_nlink, observed.st_size, observed.st_mtime_ns) ==
                            (node['before'].st_dev, node['before'].st_ino, node['before'].st_uid, node['before'].st_gid,
                             node['before'].st_nlink, node['before'].st_size, node['before'].st_mtime_ns),
                            'metadata_changed_during_chmod', node['path'])
                    require(stat.S_IMODE(observed.st_mode) == target, 'mode_not_exact', node['path'])
                    node['expected'] = observed
            finally:
                os.close(descriptor)
        receipt['phase'] = 'verification'
        receipt['mountinfo_after_sha256'] = check_mounts(read_mounts(), anchor, device)
        for node in nodes:
            descriptor = open_node(node)
            try:
                if node['children'] is not None:
                    require(names_in(descriptor, MAX_ENTRIES) == node['children'], 'directory_entries_changed', node['path'])
                after_hash = digest(descriptor, node) if node['kind'] == 'file' else None
                require(after_hash == node['sha256'], 'content_changed', node['path'])
                receipt['entries'].append({'path': node['path'], 'type': node['kind'],
                    'uid_before': node['before'].st_uid, 'uid_after': os.fstat(descriptor).st_uid,
                    'gid_before': node['before'].st_gid, 'gid_after': os.fstat(descriptor).st_gid,
                    'mode_before': format(stat.S_IMODE(node['before'].st_mode), '04o'),
                    'mode_after': format(stat.S_IMODE(os.fstat(descriptor).st_mode), '04o'),
                    'sha256_before': node['sha256'], 'sha256_after': after_hash})
            finally:
                os.close(descriptor)
        receipt.update(status='PASS', phase='complete', files_hashed=sum(node['kind'] == 'file' for node in nodes),
                       bytes_hashed_per_pass=total_bytes, unchanged_content_owners_and_other_mode_bits=True,
                       special_bit_objects_not_chmodded=True, mount_aliases_refused=True)
        return receipt
    except (Refusal, OSError, UnicodeError) as error:
        refusal = error if isinstance(error, Refusal) else Refusal('system_error_' + str(getattr(error, 'errno', 'decode')), current_path)
        receipt.update(status='PARTIAL' if receipt['changes'] else 'FAIL', error=refusal.code)
        if refusal.path is not None:
            receipt['error_path'] = refusal.path
        refusal.receipt = receipt
        raise refusal
    finally:
        for descriptor in reversed(descriptors):
            os.close(descriptor)


def main():
    try:
        require(len(sys.argv) == 1, 'arguments_not_allowed')
        require(sys.platform == 'linux' and os.getuid() == 0 and os.geteuid() == 0, 'root_linux_required')
        result = harden('/', 0)
    except Refusal as error:
        result = error.receipt or {'status': 'FAIL', 'error': error.code, 'changes': []}
        print(json.dumps(result, sort_keys=True))
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
