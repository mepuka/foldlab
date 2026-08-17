// Command probe runs a pinned real-server JetStream sequencing experiment.
//
// Build nats-server v2.14.4 from go/go.mod, then run this file from go/:
//
//	$probeServer = Join-Path $env:TEMP 'dev712-nats-server.exe'
//	go build -o $probeServer github.com/nats-io/nats-server/v2
//	go run ../docs/research/reference/dev712-partition-position/probe.go -server $probeServer
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	streamName = "DEV712"
	subjectA   = "probe.partition.A"
	subjectB   = "probe.partition.B"
)

type runningServer struct {
	cmd    *exec.Cmd
	stderr strings.Builder
}

type observation struct {
	phase       string
	payload     string
	subject     string
	streamSeq   uint64
	consumerSeq uint64
	deliveries  uint64
	pending     uint64
}

func fail(err error) {
	if err != nil {
		panic(err)
	}
}

func freePort() int {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	fail(err)
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port
}

func startServer(binary, store string, port int) *runningServer {
	r := &runningServer{}
	r.cmd = exec.Command(binary,
		"-js",
		"-sd", store,
		"-a", "127.0.0.1",
		"-p", strconv.Itoa(port),
	)
	r.cmd.Stdout = nil
	r.cmd.Stderr = &r.stderr
	fail(r.cmd.Start())

	url := fmt.Sprintf("nats://127.0.0.1:%d", port)
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		nc, err := nats.Connect(url, nats.Timeout(100*time.Millisecond), nats.NoReconnect())
		if err == nil {
			nc.Close()
			return r
		}
		if r.cmd.ProcessState != nil && r.cmd.ProcessState.Exited() {
			break
		}
		time.Sleep(25 * time.Millisecond)
	}
	panic(fmt.Errorf("nats-server did not become ready: %s", r.stderr.String()))
}

func (r *runningServer) stopAbruptly() {
	if r == nil || r.cmd == nil || r.cmd.Process == nil {
		return
	}
	_ = r.cmd.Process.Kill()
	_ = r.cmd.Wait()
}

func connect(url string) (*nats.Conn, jetstream.JetStream) {
	var nc *nats.Conn
	var err error
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		nc, err = nats.Connect(url, nats.Timeout(250*time.Millisecond), nats.NoReconnect())
		if err == nil {
			js, jsErr := jetstream.New(nc)
			fail(jsErr)
			return nc, js
		}
		time.Sleep(25 * time.Millisecond)
	}
	panic(err)
}

func fetchOne(consumer jetstream.Consumer, phase string) (jetstream.Msg, observation) {
	batch, err := consumer.Fetch(1, jetstream.FetchMaxWait(3*time.Second))
	fail(err)
	for msg := range batch.Messages() {
		metadata, metadataErr := msg.Metadata()
		fail(metadataErr)
		return msg, observation{
			phase:       phase,
			payload:     string(msg.Data()),
			subject:     msg.Subject(),
			streamSeq:   metadata.Sequence.Stream,
			consumerSeq: metadata.Sequence.Consumer,
			deliveries:  metadata.NumDelivered,
			pending:     metadata.NumPending,
		}
	}
	if batch.Error() != nil {
		panic(batch.Error())
	}
	panic(errors.New("fetch returned no message"))
}

func publish(ctx context.Context, js jetstream.JetStream, subject, payload string) uint64 {
	ack, err := js.Publish(ctx, subject, []byte(payload))
	fail(err)
	return ack.Sequence
}

func uniquePositions(observations []observation, subject string) []uint64 {
	set := make(map[uint64]struct{})
	for _, item := range observations {
		if item.subject == subject {
			set[item.streamSeq] = struct{}{}
		}
	}
	positions := make([]uint64, 0, len(set))
	for position := range set {
		positions = append(positions, position)
	}
	sort.Slice(positions, func(i, j int) bool { return positions[i] < positions[j] })
	return positions
}

func premiseResult(floor uint64, positions []uint64) string {
	for _, position := range positions {
		expected := floor + 1
		if position != expected {
			return fmt.Sprintf("BLOCK floor=%d next_seen=%d missing=%d", floor, position, expected)
		}
		floor = position
	}
	return fmt.Sprintf("DRAIN floor=%d", floor)
}

func main() {
	serverPath := flag.String("server", "", "path to the nats-server v2.14.4 binary")
	flag.Parse()
	if *serverPath == "" {
		panic("-server is required")
	}

	versionBytes, err := exec.Command(*serverPath, "-v").CombinedOutput()
	fail(err)
	version := strings.TrimSpace(string(versionBytes))
	if !strings.Contains(version, "v2.14.4") {
		panic(fmt.Errorf("wrong server pin: %q", version))
	}

	temp, err := os.MkdirTemp("", "dev712-partition-position-")
	fail(err)
	defer os.RemoveAll(temp)
	store := filepath.Join(temp, "store")
	port := freePort()
	url := fmt.Sprintf("nats://127.0.0.1:%d", port)

	server := startServer(*serverPath, store, port)
	defer func() { server.stopAbruptly() }()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	nc1, js1 := connect(url)
	stream, err := js1.CreateStream(ctx, jetstream.StreamConfig{
		Name:     streamName,
		Subjects: []string{"probe.partition.*"},
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	fail(err)

	published := []struct {
		payload string
		subject string
		seq     uint64
	}{
		{"A1", subjectA, publish(ctx, js1, subjectA, "A1")},
		{"B1", subjectB, publish(ctx, js1, subjectB, "B1")},
		{"A2", subjectA, publish(ctx, js1, subjectA, "A2")},
		{"B2", subjectB, publish(ctx, js1, subjectB, "B2")},
	}

	consumerA, err := stream.CreateOrUpdateConsumer(ctx, jetstream.ConsumerConfig{
		Durable:       "PARTITION_A",
		AckPolicy:     jetstream.AckExplicitPolicy,
		AckWait:       250 * time.Millisecond,
		FilterSubject: subjectA,
		DeliverPolicy: jetstream.DeliverAllPolicy,
	})
	fail(err)
	consumerB, err := stream.CreateOrUpdateConsumer(ctx, jetstream.ConsumerConfig{
		Durable:       "PARTITION_B",
		AckPolicy:     jetstream.AckExplicitPolicy,
		AckWait:       250 * time.Millisecond,
		FilterSubject: subjectB,
		DeliverPolicy: jetstream.DeliverAllPolicy,
	})
	fail(err)

	observations := make([]observation, 0, 7)
	msgA1, obsA1 := fetchOne(consumerA, "before-client-restart/unacked")
	_ = msgA1 // Deliberately unacked: closing the client manufactures redelivery.
	observations = append(observations, obsA1)
	msgB1, obsB1 := fetchOne(consumerB, "before-client-restart/acked")
	fail(msgB1.DoubleAck(ctx))
	observations = append(observations, obsB1)
	nc1.Close()
	time.Sleep(400 * time.Millisecond)

	nc2, js2 := connect(url)
	consumerA, err = js2.Consumer(ctx, streamName, "PARTITION_A")
	fail(err)
	consumerB, err = js2.Consumer(ctx, streamName, "PARTITION_B")
	fail(err)
	msg, obs := fetchOne(consumerA, "after-client-restart/redelivery")
	fail(msg.DoubleAck(ctx))
	observations = append(observations, obs)
	msg, obs = fetchOne(consumerA, "after-client-restart/next-A")
	fail(msg.DoubleAck(ctx))
	observations = append(observations, obs)
	msg, obs = fetchOne(consumerB, "after-client-restart/next-B")
	fail(msg.DoubleAck(ctx))
	observations = append(observations, obs)
	nc2.Close()

	// Abruptly stop the actual server, then reopen the same file-backed store.
	server.stopAbruptly()
	server = startServer(*serverPath, store, port)

	nc3, js3 := connect(url)
	published = append(published,
		struct {
			payload string
			subject string
			seq     uint64
		}{"A3", subjectA, publish(ctx, js3, subjectA, "A3")},
		struct {
			payload string
			subject string
			seq     uint64
		}{"B3", subjectB, publish(ctx, js3, subjectB, "B3")},
	)
	consumerA, err = js3.Consumer(ctx, streamName, "PARTITION_A")
	fail(err)
	consumerB, err = js3.Consumer(ctx, streamName, "PARTITION_B")
	fail(err)
	for i := 0; i < 10; i++ {
		msg, obs = fetchOne(consumerA, "after-server-restart/A")
		fail(msg.DoubleAck(ctx))
		observations = append(observations, obs)
		if obs.payload == "A3" {
			break
		}
		if i == 9 {
			panic("A3 was not delivered after server restart")
		}
	}
	for i := 0; i < 10; i++ {
		msg, obs = fetchOne(consumerB, "after-server-restart/B")
		fail(msg.DoubleAck(ctx))
		observations = append(observations, obs)
		if obs.payload == "B3" {
			break
		}
		if i == 9 {
			panic("B3 was not delivered after server restart")
		}
	}
	nc3.Close()

	fmt.Printf("server=%s\n", version)
	fmt.Println("stream=DEV712 subjects=[probe.partition.*] storage=file replicas=1")
	for _, item := range published {
		fmt.Printf("PUBLISH payload=%s subject=%s stream_seq=%d\n", item.payload, item.subject, item.seq)
	}
	for _, item := range observations {
		fmt.Printf("DELIVER phase=%s payload=%s subject=%s stream_seq=%d consumer_seq=%d deliveries=%d pending=%d\n",
			item.phase, item.payload, item.subject, item.streamSeq, item.consumerSeq,
			item.deliveries, item.pending)
	}
	positionsA := uniquePositions(observations, subjectA)
	positionsB := uniquePositions(observations, subjectB)
	fmt.Printf("UNIQUE partition=A stream_positions=%v floor_plus_one=%s\n", positionsA, premiseResult(0, positionsA))
	fmt.Printf("UNIQUE partition=B stream_positions=%v floor_plus_one=%s\n", positionsB, premiseResult(0, positionsB))
}
