// Probe the exact pinned NATS subject-permission boundary used by DEV-716.
//
// Run from the Go module so the repository's go.mod/go.sum pins are the
// dependency authority:
//
//	cd go
//	go run ../docs/research/reference/dev716-credential-binding/probe.go
package main

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
)

const permissionTimeout = 2 * time.Second

func must(err error) {
	if err != nil {
		panic(err)
	}
}

func expectPermissionViolation(nc *nats.Conn, errs <-chan error, subject string) {
	for {
		select {
		case <-errs:
			continue
		default:
		}
		break
	}
	msg := nats.NewMsg(subject)
	msg.Reply = nats.NewInbox()
	msg.Data = []byte("{}")
	if err := nc.PublishMsg(msg); err != nil && !errors.Is(err, nats.ErrPermissionViolation) {
		panic(err)
	}
	if err := nc.FlushTimeout(time.Second); err != nil && !errors.Is(err, nats.ErrPermissionViolation) {
		panic(err)
	}
	select {
	case err := <-errs:
		if !errors.Is(err, nats.ErrPermissionViolation) {
			panic(fmt.Sprintf("%s: got %v, want permission violation", subject, err))
		}
		fmt.Printf("MANAGEMENT subject=%s result=permission-refused\n", subject)
	case <-time.After(permissionTimeout):
		panic(fmt.Sprintf("%s: no permission refusal", subject))
	}
}

func history(kv nats.KeyValue, key string) []nats.KeyValueEntry {
	entries, err := kv.History(key)
	must(err)
	return entries
}

func main() {
	opts := &server.Options{
		ServerName: "dev716-credential-binding",
		JetStream:  true,
		StoreDir:   mustTempDir(),
		DontListen: true,
		NoLog:      true,
		NoSigs:     true,
		Users: []*server.User{
			{Username: "admin", Password: "admin"},
			{
				Username: "application",
				Password: "application",
				Permissions: &server.Permissions{
					// STREAM.INFO is the read-only management call required to
					// bind a client KV handle to the already provisioned bucket.
					Publish: &server.SubjectPermission{Allow: []string{
						"$KV.BOUNDARY.>",
						"$JS.API.STREAM.INFO.KV_BOUNDARY",
					}},
					Subscribe: &server.SubjectPermission{Allow: []string{"_INBOX.>"}},
				},
			},
		},
	}
	s, err := server.NewServer(opts)
	must(err)
	go s.Start()
	if !s.ReadyForConnections(10 * time.Second) {
		panic("server did not become ready")
	}
	defer func() {
		s.Shutdown()
		s.WaitForShutdown()
		_ = os.RemoveAll(opts.StoreDir)
	}()

	admin, err := nats.Connect("", nats.InProcessServer(s), nats.UserInfo("admin", "admin"))
	must(err)
	defer admin.Close()
	adminJS, err := admin.JetStream()
	must(err)
	adminKV, err := adminJS.CreateKeyValue(&nats.KeyValueConfig{
		Bucket: "BOUNDARY", History: 8, Storage: nats.FileStorage, Replicas: 1,
	})
	must(err)

	permissionErrors := make(chan error, 16)
	application, err := nats.Connect(
		"",
		nats.InProcessServer(s),
		nats.UserInfo("application", "application"),
		nats.ErrorHandler(func(_ *nats.Conn, _ *nats.Subscription, err error) {
			permissionErrors <- err
		}),
	)
	must(err)
	defer application.Close()
	appJS, err := application.JetStream()
	must(err)
	kv, err := appJS.KeyValue("BOUNDARY")
	must(err)

	deleteCreate, err := kv.Create("delete", []byte("v1"))
	must(err)
	deleteUpdate, err := kv.Update("delete", []byte("v2"), deleteCreate)
	must(err)
	must(kv.Delete("delete", nats.LastRevision(deleteUpdate)))
	deleteHistory := history(adminKV, "delete")
	deleteTombstone := deleteHistory[len(deleteHistory)-1].Revision()
	deleteReopen, err := kv.Update("delete", []byte("reopened"), deleteTombstone)
	must(err)
	fmt.Printf(
		"KV key=delete allowed=create@%d,update@%d,revision-checked-delete@%d op=%s history=%d,reopen-update@%d\n",
		deleteCreate,
		deleteUpdate,
		deleteTombstone,
		deleteHistory[len(deleteHistory)-1].Operation(),
		len(deleteHistory),
		deleteReopen,
	)

	purgeCreate, err := kv.Create("purge", []byte("v1"))
	must(err)
	purgeUpdate, err := kv.Update("purge", []byte("v2"), purgeCreate)
	must(err)
	must(kv.Purge("purge", nats.LastRevision(purgeUpdate)))
	purgeHistory := history(adminKV, "purge")
	purgeTombstone := purgeHistory[len(purgeHistory)-1].Revision()
	purgeReopen, err := kv.Update("purge", []byte("reopened"), purgeTombstone)
	must(err)
	fmt.Printf(
		"KV key=purge allowed=create@%d,update@%d,revision-checked-purge@%d op=%s history=%d,reopen-update@%d\n",
		purgeCreate,
		purgeUpdate,
		purgeTombstone,
		purgeHistory[len(purgeHistory)-1].Operation(),
		len(purgeHistory),
		purgeReopen,
	)

	for _, subject := range []string{
		fmt.Sprintf(server.JSApiStreamDeleteT, "KV_BOUNDARY"),
		fmt.Sprintf(server.JSApiStreamPurgeT, "KV_BOUNDARY"),
		fmt.Sprintf(server.JSApiStreamUpdateT, "KV_BOUNDARY"),
		fmt.Sprintf(server.JSApiStreamRestoreT, "KV_BOUNDARY"),
	} {
		expectPermissionViolation(application, permissionErrors, subject)
	}

	fmt.Printf("PINS server=v%s go-client=v%s\n", server.VERSION, nats.Version)
}

func mustTempDir() string {
	dir, err := os.MkdirTemp("", "dev716-credential-binding-")
	must(err)
	return dir
}
