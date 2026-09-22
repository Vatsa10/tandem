//go:build !windows

package main

import (
	"os/exec"
	"syscall"
)

// setDetached puts the child in its own session so it survives as PID 1's child
// under the container entrypoint. Linux/macOS only.
func setDetached(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
