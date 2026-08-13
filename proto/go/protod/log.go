package protod

import (
	"fmt"
	"io"
	"regexp"
	"strconv"
	"sync"
)

var droppedRequestsPattern = regexp.MustCompile(`\bdropping ([0-9]+) requests\b`)

// natsLogSink gives the embedded broker one visible logging path. The pinned
// server's JetStream IPQ overflow warning is its only synchronous evidence of
// a drop, so the sink promotes that number into a monotone total on the line.
type natsLogSink struct {
	mu      sync.Mutex
	writer  io.Writer
	dropped uint64
}

func newNATSLogSink(writer io.Writer) *natsLogSink { return &natsLogSink{writer: writer} }

func (l *natsLogSink) Noticef(format string, args ...any) { l.write("notice", format, args...) }
func (l *natsLogSink) Warnf(format string, args ...any)   { l.write("warn", format, args...) }
func (l *natsLogSink) Fatalf(format string, args ...any)  { l.write("fatal", format, args...) }
func (l *natsLogSink) Errorf(format string, args ...any)  { l.write("error", format, args...) }
func (l *natsLogSink) Debugf(format string, args ...any)  { l.write("debug", format, args...) }
func (l *natsLogSink) Tracef(format string, args ...any)  { l.write("trace", format, args...) }

func (l *natsLogSink) write(level, format string, args ...any) {
	message := fmt.Sprintf(format, args...)
	l.mu.Lock()
	defer l.mu.Unlock()
	if match := droppedRequestsPattern.FindStringSubmatch(message); len(match) == 2 {
		if count, err := strconv.ParseUint(match[1], 10, 64); err == nil {
			l.dropped += count
		}
		_, _ = fmt.Fprintf(l.writer, "protod nats level=%s ipq_drops_total=%d message=%q\n", level, l.dropped, message)
		return
	}
	_, _ = fmt.Fprintf(l.writer, "protod nats level=%s message=%q\n", level, message)
}

func (l *natsLogSink) droppedTotal() uint64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.dropped
}
