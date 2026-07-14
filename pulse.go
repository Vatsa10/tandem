package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
)

// PulseAudio virtual-device setup (joinly / old-tandem style). Everything runs in a
// headless Linux container, so there is no real hardware audio — no echo, and
// capture is a dead-simple read of a null-sink monitor.
//
//	tandem_out  (null sink, default sink)  <- Chrome plays the meeting here
//	                                     -> parec tandem_out.monitor  => Deepgram STT
//	tandem_tts  (null sink) -> tandem_mic (remap-source of tandem_tts.monitor)
//	                                     <- pacat TTS PCM ; Chrome uses tandem_mic as its mic
type PulseCleanup struct {
	moduleIDs []string
}

func pulseEnv() []string {
	return append(os.Environ(),
		"HOME=/tmp/fakehome",
		"XDG_RUNTIME_DIR=/tmp/pulse-runtime",
	)
}

func pactl(args ...string) (string, error) {
	cmd := exec.Command("pactl", args...)
	cmd.Env = pulseEnv()
	out, err := cmd.Output()
	return strings.TrimSpace(string(out)), err
}

func ensurePulseRunning() error {
	if _, err := pactl("info"); err == nil {
		return nil
	}
	log.Println("[pulse] starting daemon...")
	os.MkdirAll("/tmp/pulse-runtime", 0o755)
	os.MkdirAll("/tmp/fakehome", 0o755)
	cmd := exec.Command("pulseaudio", "--start", "--exit-idle-time=-1", "--disable-shm=true")
	cmd.Env = pulseEnv()
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("start pulseaudio: %w: %s", err, string(out))
	}
	return nil
}

// SetupPulse creates the output-capture sink and the TTS virtual mic.
func SetupPulse() (*PulseCleanup, error) {
	if err := ensurePulseRunning(); err != nil {
		return nil, err
	}
	pc := &PulseCleanup{}

	// Chrome output sink — the meeting audio the bot "hears" lands here.
	outID, err := pactl("load-module", "module-null-sink",
		"sink_name=tandem_out",
		`sink_properties=device.description=Tandem_Out`)
	if err != nil {
		return nil, fmt.Errorf("null sink tandem_out: %w", err)
	}
	pc.moduleIDs = append(pc.moduleIDs, outID)

	// Make it the default so Chrome (--alsa-output-device=pulse) plays into it.
	if _, err := pactl("set-default-sink", "tandem_out"); err != nil {
		log.Printf("[pulse] set-default-sink: %v", err)
	}

	// TTS sink + a source remapped from its monitor — the bot's microphone.
	ttsID, err := pactl("load-module", "module-null-sink",
		"sink_name=tandem_tts",
		`sink_properties=device.description=Tandem_TTS`)
	if err != nil {
		pc.Teardown()
		return nil, fmt.Errorf("null sink tandem_tts: %w", err)
	}
	pc.moduleIDs = append(pc.moduleIDs, ttsID)

	micID, err := pactl("load-module", "module-remap-source",
		"master=tandem_tts.monitor",
		"source_name=tandem_mic",
		`source_properties=device.description=Tandem_Mic`)
	if err != nil {
		pc.Teardown()
		return nil, fmt.Errorf("remap source tandem_mic: %w", err)
	}
	pc.moduleIDs = append(pc.moduleIDs, micID)

	if _, err := pactl("set-default-source", "tandem_mic"); err != nil {
		log.Printf("[pulse] set-default-source: %v", err)
	}

	log.Println("[pulse] devices ready: capture tandem_out.monitor, TTS -> tandem_tts -> tandem_mic")
	return pc, nil
}

func (pc *PulseCleanup) Teardown() {
	if pc == nil {
		return
	}
	for i := len(pc.moduleIDs) - 1; i >= 0; i-- {
		if id := pc.moduleIDs[i]; id != "" {
			pactl("unload-module", id)
		}
	}
}

// pulseAvailable reports whether pactl works (i.e. we're in the Linux container).
func pulseAvailable() bool {
	_, err := pactl("info")
	return err == nil
}
