.PHONY: all build-all build-desktop build-android collect clean help

all: build-all

build-all:
	node scripts/build-tauri-all.mjs

build-desktop:
	node scripts/build-tauri-all.mjs --desktop

build-android:
	node scripts/build-tauri-all.mjs --android

collect:
	node scripts/build-tauri-all.mjs --collect-only

clean:
	node -e "require('node:fs').rmSync('tauri-app-build-output', { recursive: true, force: true })"

help:
	@echo "Tauri build commands:"
	@echo "  make build-all      Build desktop and Android, then collect artifacts"
	@echo "  make build-desktop  Build desktop, then collect desktop artifacts"
	@echo "  make build-android  Build Android, then collect Android artifacts"
	@echo "  make collect        Collect existing build artifacts only"
	@echo "  make clean          Remove tauri-app-build-output"
	@echo "  make help           Show this help"
