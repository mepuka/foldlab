package protod

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCertifyReturnsCertificateOrW7Refusal(t *testing.T) {
	daemon, err := Acquire(context.Background(), Options{StoreDir: t.TempDir()})
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	t.Cleanup(daemon.Release)

	certificate, refusal, err := daemon.certify(
		context.Background(),
		[]byte(`{"structure":{"k":"string"},"submitter":"certify-test"}`),
	)
	if err != nil || refusal != nil || certificate == nil {
		t.Fatalf("valid bytes did not certify: certificate=%+v refusal=%+v err=%v", certificate, refusal, err)
	}
	if certificate.Fact.Scheme != flbTypeV1Scheme || certificate.Fact.Digest == "" {
		t.Fatalf("certificate does not carry owned identity: %+v", certificate)
	}

	certificate, refusal, err = daemon.certify(
		context.Background(),
		[]byte(`{"structure":{"k":"strng"}}`),
	)
	if err != nil || certificate != nil || refusal == nil {
		t.Fatalf("invalid bytes did not refuse as data: certificate=%+v refusal=%+v err=%v", certificate, refusal, err)
	}
	if refusal.Kind != KindInvalidStructure || refusal.Law == "" || len(refusal.Next) == 0 {
		t.Fatalf("certify refusal is not W7-shaped: %+v", refusal)
	}
}

func TestCertifyIsTheOnlyCatalogCommitCaller(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatalf("list Go files: %v", err)
	}
	callers := []string{}
	for _, file := range files {
		if strings.HasSuffix(file, "_test.go") {
			continue
		}
		contents, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}
		if strings.Contains(string(contents), ".commitCertified(") {
			callers = append(callers, file)
		}
	}
	if len(callers) != 1 || callers[0] != "certify.go" {
		t.Fatalf("catalog commit callers=%v, want only certify.go", callers)
	}
}
