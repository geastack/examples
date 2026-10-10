"""Extract badge files from an original stopwatch flash backup without flashing it.

Run with ESP-IDF's Python environment and pass its components/fatfs directory,
the complete flash backup, and the existing report output directory.
"""
import argparse
import hashlib
import struct
import sys
from pathlib import Path
from types import SimpleNamespace

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('fatfs_tools')
parser.add_argument('backup')
parser.add_argument('output')
args = parser.parse_args()
sys.path.insert(0, args.fatfs_tools)
import fatfsparse
from fatfs_utils.boot_sector import BootSector
from fatfs_utils.entry import Entry
from fatfs_utils.fat import FAT
from fatfs_utils.utils import lfn_checksum

backup = Path(args.backup).read_bytes()
storage = None
for at in range(0x8000, 0x8C00, 32):
    magic, kind, subtype, offset, size, label, flags = struct.unpack_from('<HBBII16sI', backup, at)
    if magic != 0x50AA:
        break
    name = label.split(b'\0')[0].decode()
    print(f'partition {name}: offset={offset:#x}, size={size:#x}, type={kind}/{subtype}')
    if name == 'storage' and kind == 1 and subtype == 0x81:
        storage = backup[offset:offset + size]
if storage is None:
    raise RuntimeError('No FAT storage partition found; original device left unchanged')
fs = fatfsparse.remove_wear_levelling_if_exists(storage)
boot = BootSector()
boot.parse_boot_sector(fs)
state = boot.boot_sector_state
fat = FAT(state, init_=False)
fatfsparse.args = SimpleNamespace(long_name_support=True)
output = Path(args.output)
if not output.is_dir():
    raise RuntimeError('Use an existing report directory')

def visit(data, folder=''):
    for i in range(len(data) // 32):
        entry = data[i * 32:(i + 1) * 32]
        if not entry[0] or entry[0] == 0xE5 or entry[11] == 0x0F:
            continue
        obj = Entry.ENTRY_FORMAT_SHORT_NAME.parse(entry)
        name = fatfsparse.get_obj_name(obj, data, i, lfn_checksum(obj['DIR_Name'] + obj['DIR_Name_ext']))
        if name in ('.', '..'):
            continue
        path = folder + '/' + name
        print(f'file {path}: {obj["DIR_FileSize"]} bytes')
        cluster = Entry.get_cluster_id(obj)
        if obj['DIR_Attr'] & 0x10:
            visit(fat.get_chained_content(cluster_id_=cluster), path)
        elif folder.lower() == '/badge':
            content = fat.get_chained_content(cluster_id_=cluster, size=obj['DIR_FileSize']) if obj['DIR_FileSize'] else b''
            target = output / ('original-badge-' + name.lower())
            target.write_bytes(content)
            print(f'saved {target.name}: sha256={hashlib.sha256(content).hexdigest()}')

start = state.root_directory_start
visit(fs[start:start + state.root_dir_sectors_cnt * state.sector_size])
