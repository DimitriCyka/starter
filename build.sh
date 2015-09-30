#!/bin/bash

#linux64
mkdir -p nw/linux64
if [ ! -f nw/linux64/nw ];
then
   echo "NW.js for Linux 64bit not found. Please unpack NW.js from http://nwjs.io/ to nw/linux64 and try again"
   exit 1
fi

mkdir -p build/linux64/src/lib
cp -r lib src node_modules index.html package.json build/linux64/
rsync nw/linux64/icudtl.dat build/linux64/icudtl.dat
rsync nw/linux64/nw build/linux64/nw
rsync nw/linux64/nw.pak build/linux64/nw.pak
rsync -r assets/ build/linux64/assets/
echo "Build for linux64 completed"

#win32
mkdir -p nw/win32
if [ ! -f nw/win32/nw.exe ];
then
   echo "NW.js for Windows 32bit not found. Please unpack NW.js from http://nwjs.io/ to nw/win32 and try again"
   exit 1
fi

mkdir -p build/win32/src/lib
cp -r lib src node_modules index.html package.json build/win32/
rsync nw/win32/icudtl.dat build/win32/icudtl.dat
rsync nw/win32/nw.exe build/win32/starter.exe
rsync nw/win32/nw.pak build/win32/nw.pak
rsync -r assets/ build/win32/assets/
echo "Build for win32 completed"