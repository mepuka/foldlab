package crashstorm

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/nats-io/nats.go"

	"foldlab/gauntlet"
)

type workerProcess struct {
	owner              string
	index              int
	command            *exec.Cmd
	done               chan error
	notBefore          time.Time
	finished           bool
	killedByController bool
	generation         int
}

type serverProcess struct {
	command *exec.Cmd
	done    chan error
}

type Controller struct {
	executable string
	bundle     string
	seed       string
	salt       string
	url        string
	port       int
	runtimeDir string
	paceFile   string
	server     *serverProcess
	workers    map[string]*workerProcess
}

func Run(ctx context.Context, executable, bundle, seed string) (report gauntlet.Report, runErr error) {
	var zero gauntlet.Report
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
	runtimeDir, err := os.MkdirTemp("", "foldlab-g1-")
	if err != nil {
		return zero, err
	}
	var controller *Controller
	defer func() {
		if controller != nil {
			controller.stopAll()
		}
		if runErr != nil {
			if err := preserveRuntimeLogs(absBundle, runtimeDir); err != nil {
				runErr = errors.Join(runErr, fmt.Errorf("preserve runtime logs: %w", err))
			}
			return
		}
		if err := os.RemoveAll(runtimeDir); err != nil {
			runErr = fmt.Errorf("remove runtime directory: %w", err)
		}
	}()

	port, err := reservePort()
	if err != nil {
		return zero, err
	}
	controller = &Controller{
		executable: executable,
		bundle:     absBundle,
		seed:       seed,
		salt:       SaltForSeed(seed),
		url:        fmt.Sprintf("nats://127.0.0.1:%d", port),
		port:       port,
		runtimeDir: runtimeDir,
		paceFile:   filepath.Join(runtimeDir, "pace-ms"),
		workers:    make(map[string]*workerProcess, Workers),
	}
	if err := os.WriteFile(controller.paceFile, []byte("120"), 0o644); err != nil {
		return zero, err
	}
	if err := controller.startServer(ctx); err != nil {
		return zero, err
	}
	for index := 0; index < Workers; index++ {
		owner := fmt.Sprintf("worker-%02d", index)
		slot := &workerProcess{owner: owner, index: index}
		controller.workers[owner] = slot
		if err := controller.startWorker(slot); err != nil {
			return zero, err
		}
	}

	if err := controller.driveStorm(ctx); err != nil {
		return zero, err
	}
	if err := ExportBundle(ctx, controller.url, controller.bundle, controller.seed, controller.salt); err != nil {
		return zero, err
	}
	report, err = gauntlet.Verify(controller.bundle, gauntlet.G1())
	if err != nil {
		return zero, fmt.Errorf("self-verification refused produced bundle: %w", err)
	}
	return report, nil
}

func preserveRuntimeLogs(bundle, runtimeDir string) error {
	destinationRoot := filepath.Join(bundle, "runtime-logs")
	return filepath.WalkDir(runtimeDir, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || !strings.EqualFold(filepath.Ext(entry.Name()), ".log") {
			return nil
		}
		relative, err := filepath.Rel(runtimeDir, path)
		if err != nil {
			return err
		}
		destination := filepath.Join(destinationRoot, relative)
		if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(destination, data, 0o644)
	})
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
	if err := waitForServer(ctx, controller.url, done); err != nil {
		return err
	}
	return nil
}

func waitForServer(ctx context.Context, url string, serverDone <-chan error) error {
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
		case err := <-serverDone:
			if err == nil {
				err = errors.New("server stopped")
			}
			return fmt.Errorf("server exited before ready: %w", err)
		case <-ctx.Done():
			return fmt.Errorf("wait for server: %w", ctx.Err())
		case <-time.After(20 * time.Millisecond):
		}
	}
}

func (controller *Controller) startWorker(slot *workerProcess) error {
	logPath := filepath.Join(controller.runtimeDir, slot.owner+".log")
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
		"--owner", slot.owner,
		"--index", fmt.Sprintf("%d", slot.index),
		"--pace-file", controller.paceFile,
	)
	command.Stdout = logFile
	command.Stderr = logFile
	if err := command.Start(); err != nil {
		_ = logFile.Close()
		return fmt.Errorf("spawn %s: %w", slot.owner, err)
	}
	_ = logFile.Close()
	done := make(chan error, 1)
	go func() { done <- command.Wait() }()
	slot.command = command
	slot.done = done
	slot.finished = false
	slot.killedByController = false
	slot.generation++
	if err := appendStorm(controller.bundle, "spawn", slot.owner); err != nil {
		_ = command.Process.Kill()
		return err
	}
	return nil
}

func (controller *Controller) driveStorm(ctx context.Context) error {
	seenNonces := make(map[string]bool)
	killedDigests := make(map[string]bool)
	kills := 0
	restarts := 0
	restartThresholds := []int{40, 70, 100, 130, 160}
	paceLowered := false

	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := controller.observeWorkerExits(); err != nil {
			return err
		}
		if controller.allWorkersFinished() {
			if kills < RequiredKills || restarts < RequiredStarts {
				return fmt.Errorf(
					"workflow completed before storm floors: kills=%d restarts=%d",
					kills,
					restarts,
				)
			}
			return nil
		}
		if err := controller.respawnReadyWorkers(controller.startWorker); err != nil {
			return err
		}

		events, err := readLedgerEvents(controller.bundle)
		if err != nil {
			return err
		}
		if kills < RequiredKills {
			for _, event := range events {
				if seenNonces[event.Nonce] {
					continue
				}
				seenNonces[event.Nonce] = true
				if killedDigests[event.Digest] {
					continue
				}
				slot := controller.workers[event.Owner]
				if slot == nil || slot.command == nil {
					continue
				}
				if err := controller.hardKillWorker(slot); err != nil {
					continue
				}
				killedDigests[event.Digest] = true
				kills++
				fmt.Printf("storm seed=%s hard-kill=%d/%d target=%s digest=%s\n", controller.seed, kills, RequiredKills, event.Owner, event.Digest[:12])
				break
			}
		}

		if kills == RequiredKills && !paceLowered {
			if err := os.WriteFile(controller.paceFile, []byte("25"), 0o644); err != nil {
				return err
			}
			paceLowered = true
		}
		if kills == RequiredKills && restarts < RequiredStarts && len(events) >= restartThresholds[restarts] {
			if err := controller.restartServer(ctx); err != nil {
				return err
			}
			restarts++
			fmt.Printf("storm seed=%s cold-restart=%d/%d ledger_runs=%d\n", controller.seed, restarts, RequiredStarts, len(events))
			if restarts == RequiredStarts {
				if err := os.WriteFile(controller.paceFile, []byte("0"), 0o644); err != nil {
					return err
				}
			}
		}
		time.Sleep(3 * time.Millisecond)
	}
}

func (controller *Controller) hardKillWorker(slot *workerProcess) error {
	if slot.command == nil || slot.command.Process == nil {
		return errors.New("worker is not running")
	}
	slot.killedByController = true
	if err := slot.command.Process.Kill(); err != nil {
		slot.killedByController = false
		return err
	}
	select {
	case <-slot.done:
	case <-time.After(3 * time.Second):
		return fmt.Errorf("wait for killed %s timed out", slot.owner)
	}
	if err := appendStorm(controller.bundle, "kill", slot.owner); err != nil {
		return err
	}
	slot.command = nil
	slot.done = nil
	slot.notBefore = time.Now().Add(claimLease + 80*time.Millisecond)
	return nil
}

func (controller *Controller) restartServer(ctx context.Context) error {
	if controller.server == nil || controller.server.command == nil {
		return errors.New("server is not running")
	}
	if err := controller.server.command.Process.Kill(); err != nil {
		return fmt.Errorf("hard-kill server: %w", err)
	}
	select {
	case <-controller.server.done:
	case <-time.After(5 * time.Second):
		return errors.New("wait for hard-killed server timed out")
	}
	controller.server = nil
	if err := controller.startServer(ctx); err != nil {
		return fmt.Errorf("cold-start server: %w", err)
	}
	return appendStorm(controller.bundle, "restart-server", "nats-server")
}

func (controller *Controller) observeWorkerExits() error {
	owners := make([]string, 0, len(controller.workers))
	for owner := range controller.workers {
		owners = append(owners, owner)
	}
	sort.Strings(owners)
	for _, owner := range owners {
		slot := controller.workers[owner]
		if slot.command == nil || slot.done == nil {
			continue
		}
		select {
		case err := <-slot.done:
			slot.command = nil
			slot.done = nil
			if err == nil {
				slot.finished = true
				continue
			}
			if !slot.killedByController {
				return fmt.Errorf("worker %s exited unexpectedly: %w", slot.owner, err)
			}
			slot.notBefore = time.Now().Add(20 * time.Millisecond)
		default:
		}
	}
	return nil
}

func (controller *Controller) respawnReadyWorkers(start func(*workerProcess) error) error {
	for _, slot := range controller.workers {
		if slot.command != nil || slot.finished || !slot.killedByController || time.Now().Before(slot.notBefore) {
			continue
		}
		if err := start(slot); err != nil {
			return err
		}
	}
	return nil
}

func (controller *Controller) allWorkersFinished() bool {
	if len(controller.workers) != Workers {
		return false
	}
	for _, slot := range controller.workers {
		if !slot.finished {
			return false
		}
	}
	return true
}

func (controller *Controller) stopAll() {
	for _, slot := range controller.workers {
		if slot.command != nil && slot.command.Process != nil {
			_ = slot.command.Process.Kill()
			if slot.done != nil {
				select {
				case <-slot.done:
				case <-time.After(3 * time.Second):
				}
			}
		}
	}
	if controller.server != nil && controller.server.command != nil && controller.server.command.Process != nil {
		_ = controller.server.command.Process.Kill()
		select {
		case <-controller.server.done:
		case <-time.After(3 * time.Second):
		}
	}
}
