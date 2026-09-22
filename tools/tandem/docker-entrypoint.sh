#!/bin/bash
# Provision the display + audio stack, then hand off to tandem (MCP server on stdio).
# Everything logs to stderr — stdout is the MCP JSON-RPC channel.
set -e
export HOME=/tmp/fakehome
export XDG_RUNTIME_DIR=/tmp/pulse-runtime
mkdir -p "$HOME" "$XDG_RUNTIME_DIR" /run/dbus

log() { echo "[entrypoint] $*" >&2; }

# D-Bus (best-effort; Chrome only warns without it).
dbus-daemon --system --fork >/dev/null 2>&1 || true

# Xvfb virtual display.
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp >/dev/null 2>&1 &
export DISPLAY=:99
for i in $(seq 1 50); do [ -e /tmp/.X11-unix/X99 ] && break; sleep 0.1; done
log "Xvfb ready on :99"

# PulseAudio + virtual devices:
#   tandem_out : null sink, default output — Chrome plays the meeting here.
#   tandem_tts : null sink, monitor remapped to source tandem_mic — the bot's mic (TTS).
pulseaudio --start --exit-idle-time=-1 --disable-shm=true >/dev/null 2>&1 || true
sleep 0.5
pactl load-module module-null-sink sink_name=tandem_out sink_properties=device.description=Tandem_Out >/dev/null 2>&1
pactl set-default-sink tandem_out >/dev/null 2>&1
pactl load-module module-null-sink sink_name=tandem_tts sink_properties=device.description=Tandem_TTS >/dev/null 2>&1
pactl load-module module-remap-source master=tandem_tts.monitor source_name=tandem_mic source_properties=device.description=Tandem_Mic >/dev/null 2>&1
pactl set-default-source tandem_mic >/dev/null 2>&1
export PULSE_SINK=tandem_out
export PULSE_SOURCE=tandem_mic
log "PulseAudio ready (tandem_out / tandem_mic)"

exec /usr/local/bin/tandem "$@"
