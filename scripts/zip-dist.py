# scripts/zip-dist.py — Create POSIX-compliant ZIP with forward slashes and explicit 0755/0644 permissions
import os
import sys
import zipfile
import time

def make_zip(source_dir, output_zip):
    source_dir = os.path.abspath(source_dir)
    output_zip = os.path.abspath(output_zip)
    
    if os.path.exists(output_zip):
        os.remove(output_zip)
        
    print(f"Creating POSIX-compliant zip archive from {source_dir}...")
    file_count = 0
    dir_count = 0
    
    now = time.localtime()[:6]
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            # 1. Add directories with explicit POSIX 0755 permissions
            for d in sorted(dirs):
                full_dir = os.path.join(root, d)
                rel_dir = os.path.relpath(full_dir, source_dir).replace('\\', '/') + '/'
                zinfo = zipfile.ZipInfo(rel_dir, date_time=now)
                # Directory bit 0o040000 + permissions 0o755 shifted left 16 bits, plus Windows dir bit 0x10
                zinfo.external_attr = (0o040755 << 16) | 0x10
                zf.writestr(zinfo, '')
                dir_count += 1
                
            # 2. Add files with explicit POSIX 0644 permissions
            for file in sorted(files):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir).replace('\\', '/')
                with open(full_path, 'rb') as fp:
                    data = fp.read()
                zinfo = zipfile.ZipInfo(rel_path, date_time=now)
                # Regular file bit 0o100000 + permissions 0o644 shifted left 16 bits
                zinfo.external_attr = 0o100644 << 16
                zf.writestr(zinfo, data)
                file_count += 1
                
    size_kb = round(os.path.getsize(output_zip) / 1024, 1)
    print(f"Successfully packaged {file_count} files and {dir_count} directories into {output_zip} ({size_kb} KB)")

if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else 'dist-php'
    out = sys.argv[2] if len(sys.argv) > 2 else 'guardianwallet-php.zip'
    make_zip(src, out)
