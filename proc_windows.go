//go:build windows

package main

import "os/exec"

// setDetached is a no-op on Windows — the native desktop path never runs the
// container launcher, and Windows has no setsid.
func setDetached(cmd *exec.Cmd) {}
