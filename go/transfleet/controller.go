package transfleet

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"time"

	"github.com/nats-io/nats.go"

	"foldlab/canonical"
	"foldlab/gauntlet"
	"foldlab/journal"
)

type workerProcess struct {
	command *exec.Cmd
}

type workerExit struct {
	owner string
	err   error
}

type serverProcess struct {
	command *exec.Cmd
	done    chan error
}

type Controller struct {
	executable string
	bundle     string
	salt       string
	url        string
	port       int
	runtimeDir string
	server     *serverProcess
	workers    map[string]*workerProcess
}

func Run(ctx context.Context, executable, bundle, seed string) (gauntlet.TransReport, error) {
	var zero gauntlet.TransReport
	if seed == "" {
		return zero, errors.New("seed must not be empty")
	}
	absBundle, err := filepath.Abs(bundle)
	if err != nil {
		return zero, err
	}
	if err := os.MkdirAll(filepath.Dir(absBundle), 0o755); err != nil {
		return zero, err
	}
	if err := os.Mkdir(absBundle, 0o755); err != nil {
		return zero, fmt.Errorf("create fresh bundle: %w", err)
	}
	if err := os.Mkdir(filepath.Join(absBundle, "ledger"), 0o755); err != nil {
		return zero, err
	}
	runtimeDir, err := os.MkdirTemp("", "foldlab-rg-a-")
	if err != nil {
		return zero, err
	}
	defer os.RemoveAll(runtimeDir)
	port, err := reservePort()
	if err != nil {
		return zero, err
	}
	controller := &Controller{
		executable: executable,
		bundle:     absBundle,
		salt:       SaltForSeed(seed),
		url:        fmt.Sprintf("nats://127.0.0.1:%d", port),
		port:       port,
		runtimeDir: runtimeDir,
		workers:    make(map[string]*workerProcess, Workers),
	}
	defer controller.stopAll()

	if err := controller.startServer(ctx); err != nil {
		return zero, err
	}
	connection, js, err := connect(ctx, controller.url, "rg-a-controller")
	if err != nil {
		return zero, err
	}
	defer connection.Close()
	monitorJournal, _, err := openPrimitives(ctx, js)
	if err != nil {
		return zero, fmt.Errorf("initialize shared substrate: %w", err)
	}
	exits := make(chan workerExit, Workers)
	for index := 0; index < Workers; index++ {
		if err := controller.startWorker(index, exits); err != nil {
			return zero, err
		}
	}
	if err := controller.waitForFleet(ctx, monitorJournal, exits); err != nil {
		return zero, err
	}
	if err := ExportBundle(ctx, controller.url, controller.bundle, controller.salt); err != nil {
		return zero, err
	}
	report, err := gauntlet.VerifyTransposition(controller.bundle, gauntlet.RGA)
	if err != nil {
		return zero, fmt.Errorf("self-verification refused produced bundle: %w", err)
	}
	return report, nil
}

func reservePort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	port := listener.Addr().(*net.TCPAddr).Port
	if err := listener.Close(); err != nil {
		return 0, err
	}
	return port, nil
}

func (controller *Controller) startServer(ctx context.Context) error {
	logPath := filepath.Join(controller.runtimeDir, "server.log")
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	command := exec.Command(
		controller.executable,
		"server",
		"--port", fmt.Sprintf("%d", controller.port),
		"--store", filepath.Join(controller.runtimeDir, "store"),
	)
	command.Stdout = logFile
	command.Stderr = logFile
	if err := command.Start(); err != nil {
		_ = logFile.Close()
		return fmt.Errorf("start server process: %w", err)
	}
	_ = logFile.Close()
	done := make(chan error, 1)
	go func() { done <- command.Wait() }()
	controller.server = &serverProcess{command: command, done: done}
	if err := waitForServer(ctx, controller.url); err != nil {
		return err
	}
	fmt.Printf("server ready pid=%d url=%s file_store=true\n", command.Process.Pid, controller.url)
	return nil
}

func waitForServer(ctx context.Context, url string) error {
	for {
		connection, err := nats.Connect(url, nats.Timeout(200*time.Millisecond), nats.NoReconnect())
		if err == nil {
			if flushErr := connection.FlushTimeout(500 * time.Millisecond); flushErr == nil {
				connection.Close()
				return nil
			}
			connection.Close()
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("wait for server: %w", ctx.Err())
		case <-time.After(20 * time.Millisecond):
		}
	}
}

func (controller *Controller) startWorker(index int, exits chan<- workerExit) error {
	owner := WorkerName(index)
	logPath := filepath.Join(controller.runtimeDir, owner+".log")
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	command := exec.Command(
		controller.executable,
		"worker",
		"--url", controller.url,
		"--bundle", controller.bundle,
		"--salt", controller.salt,
		"--owner", owner,
		"--index", fmt.Sprintf("%d", index),
	)
	command.Stdout = logFile
	command.Stderr = logFile
	if err := command.Start(); err != nil {
		_ = logFile.Close()
		return fmt.Errorf("spawn %s: %w", owner, err)
	}
	_ = logFile.Close()
	controller.workers[owner] = &workerProcess{command: command}
	go func() { exits <- workerExit{owner: owner, err: command.Wait()} }()
	fmt.Printf("worker spawned owner=%s pid=%d\n", owner, command.Process.Pid)
	return nil
}

func (controller *Controller) waitForFleet(
	ctx context.Context,
	monitorJournal *journal.Journal,
	exits <-chan workerExit,
) error {
	remaining := make(map[string]bool, Workers)
	for owner := range controller.workers {
		remaining[owner] = true
	}
	cursor := journal.Cursor{Seq: -1, Head: canonical.Genesis}
	nextReport := 100
	ticker := time.NewTicker(75 * time.Millisecond)
	defer ticker.Stop()
	for len(remaining) > 0 {
		select {
		case <-ctx.Done():
			return fmt.Errorf("fleet timed out with %d workers running: %w", len(remaining), ctx.Err())
		case exit := <-exits:
			delete(remaining, exit.owner)
			delete(controller.workers, exit.owner)
			if exit.err != nil {
				return fmt.Errorf("%s exited before completion: %w", exit.owner, exit.err)
			}
			fmt.Printf("worker exited owner=%s remaining=%d\n", exit.owner, len(remaining))
		case <-ticker.C:
			opCtx, cancel := operationContext(ctx)
			_, nextCursor, err := monitorJournal.Read(opCtx, cursor, 0)
			cancel()
			if err != nil {
				continue
			}
			cursor = nextCursor
			count := cursor.Seq + 1
			if count >= nextReport || count == TotalStates {
				fmt.Printf("journal frontier=%d/%d active_workers=%d\n", count, TotalStates, len(remaining))
				for nextReport <= count {
					nextReport += 100
				}
			}
		}
	}
	opCtx, cancel := operationContext(ctx)
	_, finalCursor, err := monitorJournal.Read(opCtx, cursor, 0)
	cancel()
	if err != nil {
		return err
	}
	if finalCursor.Seq != TotalStates-1 {
		return fmt.Errorf("workers exited with journal at %d/%d", finalCursor.Seq+1, TotalStates)
	}
	return nil
}

func (controller *Controller) stopAll() {
	owners := make([]string, 0, len(controller.workers))
	for owner := range controller.workers {
		owners = append(owners, owner)
	}
	sort.Strings(owners)
	for _, owner := range owners {
		process := controller.workers[owner]
		if process.command != nil && process.command.Process != nil {
			_ = process.command.Process.Kill()
		}
	}
	if controller.server != nil && controller.server.command != nil && controller.server.command.Process != nil {
		_ = controller.server.command.Process.Kill()
		select {
		case <-controller.server.done:
		case <-time.After(2 * time.Second):
		}
	}
}
