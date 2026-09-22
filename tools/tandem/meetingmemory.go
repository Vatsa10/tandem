package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// meetingmemory.go gives the local voice agent the one thing it never had:
// the meeting corpus the hosted product records. It talks to the web app's
// /api/machine/* endpoints, authenticated with a machine API key the user
// creates in the web UI (Settings → API keys).
//
// Both settings are optional. With neither set, these tools simply are not
// offered — the binary keeps working exactly as before for anyone who does
// not run the web product.
//
//	TANDEM_WEB_URL   https://your-deployment (no trailing slash)
//	TANDEM_API_KEY   tdm_… from Settings → API keys

const memoryTimeout = 20 * time.Second

func memoryConfigured() bool {
	return strings.TrimSpace(os.Getenv("TANDEM_WEB_URL")) != "" &&
		strings.TrimSpace(os.Getenv("TANDEM_API_KEY")) != ""
}

// memoryTools are appended to the voice agent's tool set only when the web
// app is configured.
func memoryTools() []map[string]any {
	if !memoryConfigured() {
		return nil
	}
	return []map[string]any{
		{
			"type":        "function",
			"name":        "search_meetings",
			"description": "Search the user's past meeting transcripts for what was actually said, and get back matching quotes with their speaker. Use whenever someone asks what was decided, agreed, or discussed before — this is memory from meetings you were not in.",
			"parameters": map[string]any{
				"type":       "object",
				"properties": map[string]any{"query": map[string]any{"type": "string", "description": "What to look for, phrased as the question being asked."}},
				"required":   []string{"query"},
			},
		},
		{
			"type":        "function",
			"name":        "list_upcoming_meetings",
			"description": "List the user's next few calendar meetings. Use when asked about scheduling, availability, or what is coming up.",
			"parameters": map[string]any{
				"type":       "object",
				"properties": map[string]any{"limit": map[string]any{"type": "number", "description": "How many to return. Defaults to 5."}},
				"required":   []string{},
			},
		},
	}
}

func memoryRequest(ctx context.Context, method, path string, body any) ([]byte, error) {
	base := strings.TrimRight(os.Getenv("TANDEM_WEB_URL"), "/")
	ctx, cancel := context.WithTimeout(ctx, memoryTimeout)
	defer cancel()

	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, base+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(os.Getenv("TANDEM_API_KEY")))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := llmHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	payload, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("TANDEM_API_KEY was rejected — create a new key in Settings → API keys")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%s returned %d: %s", path, resp.StatusCode, strings.TrimSpace(string(payload)))
	}
	return payload, nil
}

// searchMeetings returns matching transcript lines as plain text the voice
// can speak from directly.
func searchMeetings(ctx context.Context, query string) string {
	if strings.TrimSpace(query) == "" {
		return "no query"
	}
	payload, err := memoryRequest(ctx, "POST", "/api/machine/search", map[string]any{"query": query})
	if err != nil {
		return "Couldn't search past meetings: " + err.Error()
	}

	var parsed struct {
		Results []struct {
			Speaker string `json:"speaker"`
			Text    string `json:"text"`
		} `json:"results"`
	}
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return "Couldn't read the search results."
	}
	if len(parsed.Results) == 0 {
		return "Nothing in the past meetings matches that."
	}

	var out strings.Builder
	for i, r := range parsed.Results {
		if i == 5 {
			break
		}
		speaker := r.Speaker
		if speaker == "" {
			speaker = "Someone"
		}
		fmt.Fprintf(&out, "%s: %s\n", speaker, r.Text)
	}
	return strings.TrimSpace(out.String())
}

func listUpcomingMeetings(ctx context.Context, limit int) string {
	if limit <= 0 {
		limit = 5
	}
	payload, err := memoryRequest(ctx, "GET", fmt.Sprintf("/api/machine/upcoming?limit=%d", limit), nil)
	if err != nil {
		return "Couldn't read the calendar: " + err.Error()
	}

	var parsed struct {
		Events []struct {
			Title     string `json:"title"`
			StartTime string `json:"startTime"`
		} `json:"events"`
	}
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return "Couldn't read the calendar results."
	}
	if len(parsed.Events) == 0 {
		return "Nothing upcoming on the calendar."
	}

	var out strings.Builder
	for _, e := range parsed.Events {
		fmt.Fprintf(&out, "%s — %s\n", e.StartTime, e.Title)
	}
	return strings.TrimSpace(out.String())
}
