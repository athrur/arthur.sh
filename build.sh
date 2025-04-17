#!/bin/bash
echo "Building Zola site..."
zola build

echo "Compiling Typst document..."
typst compile files/cv.typ public/cv.pdf

echo "Build complete."