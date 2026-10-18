# Solarbound — C++ platformer

An original, Mario-style 2D platformer built in C++17 with raylib. It is a standalone desktop game project, not JavaScript. Levels 1–999 are procedurally generated with platforms, coins, and enemies. Level 1000 is a dedicated Sun Warrior boss fight.

## Build
Requirements: CMake 3.20+, a C++17 compiler, and internet on the first configure so CMake can fetch raylib 5.5.

```sh
cmake -S . -B build
cmake --build build --config Release
```

Run the generated `solarbound` executable.

## Controls
- A/D or arrow keys: move
- Space, W, or Up: jump
- X: strike the Sun Warrior when nearby (level 1000)
- R: restart

The game uses original simple geometric art; it does not include Nintendo/Mario assets.
