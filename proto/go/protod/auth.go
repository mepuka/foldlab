package protod

import (
	"crypto/subtle"
	"fmt"
	"sync"

	"github.com/nats-io/nats-server/v2/server"
)

// connectionAuthenticator keeps the daemon in the global account and assigns
// every authenticated application connection a private subject namespace.
// Service imports expose only the public request writ; NATS maps each reply
// back into the importing account, where an _INBOX.> subscription cannot see
// any other connection's replies.
type connectionAuthenticator struct {
	mu                  sync.RWMutex
	server              *server.Server
	internalPassword    string
	applicationPassword string
}

func newConnectionAuthenticator(internalPassword, applicationPassword string) *connectionAuthenticator {
	return &connectionAuthenticator{
		internalPassword:    internalPassword,
		applicationPassword: applicationPassword,
	}
}

func (a *connectionAuthenticator) bind(natsServer *server.Server) error {
	internal := natsServer.GlobalAccount()
	for _, subject := range []string{subjectRequestWildcard, ingressWildcard} {
		if err := internal.AddServiceExport(subject, nil); err != nil {
			return fmt.Errorf("export application service %q: %w", subject, err)
		}
	}
	a.mu.Lock()
	a.server = natsServer
	a.mu.Unlock()
	return nil
}

func (a *connectionAuthenticator) Check(client server.ClientAuthentication) bool {
	opts := client.GetOpts()
	a.mu.RLock()
	natsServer := a.server
	internalPassword := a.internalPassword
	applicationPassword := a.applicationPassword
	a.mu.RUnlock()
	if natsServer == nil {
		return false
	}

	if opts.Username == "protod-internal" {
		if subtle.ConstantTimeCompare([]byte(opts.Password), []byte(internalPassword)) != 1 {
			return false
		}
		client.RegisterUser(&server.User{
			Username: "protod-internal",
			Account:  natsServer.GlobalAccount(),
		})
		return true
	}
	if opts.Username != "application" ||
		subtle.ConstantTimeCompare([]byte(opts.Password), []byte(applicationPassword)) != 1 ||
		opts.Token != "" || opts.Nkey != "" || opts.JWT != "" {
		return false
	}

	account, created := natsServer.LookupOrRegisterAccount(fmt.Sprintf("application-%d", client.GetID()))
	if !created {
		return false
	}
	internal := natsServer.GlobalAccount()
	for _, subject := range []string{subjectRequestWildcard, ingressWildcard} {
		if err := account.AddServiceImport(internal, subject, subject); err != nil {
			// The account is private to this rejected connection and holds no
			// subscriptions; leaving it registered exposes no subject traffic.
			return false
		}
	}
	client.RegisterUser(&server.User{
		Username: "application",
		Account:  account,
		Permissions: &server.Permissions{
			Publish: &server.SubjectPermission{
				Allow: []string{subjectRequestWildcard, ingressWildcard},
			},
			Subscribe: &server.SubjectPermission{Allow: []string{"_INBOX.>"}},
		},
	})
	return true
}
