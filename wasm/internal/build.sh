#!/usr/bin/env bash
echo "gomobile bind -x -v -target=android"
GOFLAGS=-mod=mod gomobile bind -x -v -target=android
echo "gomobile bind -x -v -target=ios"
GOFLAGS=-mod=mod gomobile bind -x -v -target=ios