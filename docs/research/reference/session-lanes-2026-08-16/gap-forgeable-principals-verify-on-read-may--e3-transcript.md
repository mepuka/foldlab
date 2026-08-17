
ONE connection. No second connection, no forgery. Everything below is 'alice' acting as alice.

### absorb: alice fills v1
true

### absorb: alice (the SAME, legitimate principal) fills v2
{
  "state": "disputed",
  "candidates": [
    {
      "value": {
        "note": "v1"
      },
      "seat": "author"
    },
    {
      "value": {
        "note": "v2"
      },
      "seat": "author"
    }
  ]
}

### absorb: close by the ONLY seat — elapsed 15009ms
{
  "kind": "unreachable",
  "law": "the request produced no reply before its client deadline — this does not distinguish network failure from remote silence",
  "next": [
    {
      "subject": "flb.req.protocol.session.close",
      "body": {
        "session": "flb_protocol_session_v0_31eb72752fa9644abdd3579cb67648a88756dd2dadf862dd7e615a51a1a59eec",
        "principal": "alice"
      },
      "note": "restore reachability, then explicitly retry this request"
    }
  ],
  "local": true,
  "got": "TimeoutError: timeout",
  "expected": "flb.req.protocol.session.close"
}

close reply kind = unreachable; local = true

=> NO DAEMON REPLY AT ALL (client-local timeout): the daemon went SILENT

retry close: unreachable local=true

### absorb: state after the silent close (daemon is alive)
{
  "status": "open",
  "holes": {
    "claim": {
      "state": "disputed",
      "candidates": [
        {
          "value": {
            "note": "v1"
          },
          "seat": "author"
        },
        {
          "value": {
            "note": "v2"
          },
          "seat": "author"
        }
      ]
    }
  }
}

### successor-round: second differing fill
"no self-revision: a seat opens a new protocol round to revise its own filled value"

### successor-round: close
"completed"