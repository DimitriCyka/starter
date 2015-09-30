#!/bin/bash
[ -z "$1" ] && echo "Provide version number like 1.0 or 0.22" >&2 && exit 1

cd build/linux64
rm -r mc
zip -r lvlup-starter-$1-linux64.zip *
mv lvlup-starter-$1-linux64.zip ../

cd -

cd build/win32
rm -r mc
zip -r lvlup-starter-$1-win32.zip *
mv lvlup-starter-$1-win32.zip ../

cd -