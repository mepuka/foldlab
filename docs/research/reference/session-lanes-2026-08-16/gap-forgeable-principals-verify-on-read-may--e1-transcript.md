
daemon#1 up at nats://<application:REDACTED>@127.0.0.1:58798

URL carries the shared application credential inline (protod.go:229, authenticatedURL).

### A: open (bindings operator=mepuka, coordinator=fable, builder=codex)
{
  "ok": true,
  "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "head": "5433dc89e087f959eea0828e5a34e67d28020112a3644d1f38b0ea98a1431664",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the verified protocol-session fold",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}

connection B established — a distinct NATS connection in its own private account 'application-<clientID>'. B has never named itself.

### B: fill hole=spec principal='fable' (FORGED — B is not fable)
{
  "ok": true,
  "head": "d6fd26ba52e71c46c1984671c505d1e5edfbd392086a66cbc0ebc34a4162647c",
  "hole_state": {
    "state": "filled",
    "value": {
      "body_digest": "b-authored-attributed-to-fable",
      "title": "FORGED BY CONNECTION B"
    },
    "candidates": [
      {
        "value": {
          "body_digest": "b-authored-attributed-to-fable",
          "title": "FORGED BY CONNECTION B"
        },
        "seat": "coordinator"
      }
    ]
  },
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the verified current protocol-session fold",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}

### B: CONTROL fill principal='mallory' (unbound) — expect seat-unauthorized
{
  "kind": "seat-unauthorized",
  "law": "a protocol fill principal must hold one of the target hole's declared seats",
  "path": [
    "principal"
  ],
  "got": "mallory",
  "expected": [
    "builder"
  ],
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the immutable seat bindings before choosing an authorized principal",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ],
  "sort": "structural",
  "local": false
}

### B: fill hole=build_report principal='codex' (FORGED)
{
  "ok": true,
  "head": "4545f4360daf04aef4e3c2283e7fa3066360241cad402cf5adb3147ec4b1fbf1",
  "hole_state": {
    "state": "filled",
    "value": {
      "commit": "0000000",
      "gates": "FORGED",
      "notes": "authored by connection B, attributed to codex"
    },
    "candidates": [
      {
        "value": {
          "commit": "0000000",
          "gates": "FORGED",
          "notes": "authored by connection B, attributed to codex"
        },
        "seat": "builder"
      }
    ]
  },
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the verified current protocol-session fold",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}

### A: protocol.session.state — WARM replay (same process)
{
  "ok": true,
  "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "protocol": "2543ef8efd038e8f140b5887820d5b376b55920b823b95b9d6382a6e2b3cb4a6",
  "bindings": {
    "builder": "codex",
    "coordinator": "fable",
    "operator": "mepuka"
  },
  "holes": {
    "authorization": {
      "state": "open"
    },
    "build_report": {
      "state": "filled",
      "value": {
        "commit": "0000000",
        "gates": "FORGED",
        "notes": "authored by connection B, attributed to codex"
      },
      "candidates": [
        {
          "value": {
            "commit": "0000000",
            "gates": "FORGED",
            "notes": "authored by connection B, attributed to codex"
          },
          "seat": "builder"
        }
      ]
    },
    "decision": {
      "state": "open"
    },
    "review": {
      "state": "open"
    },
    "spec": {
      "state": "filled",
      "value": {
        "body_digest": "b-authored-attributed-to-fable",
        "title": "FORGED BY CONNECTION B"
      },
      "candidates": [
        {
          "value": {
            "body_digest": "b-authored-attributed-to-fable",
            "title": "FORGED BY CONNECTION B"
          },
          "seat": "coordinator"
        }
      ]
    }
  },
  "status": "open",
  "head": "4545f4360daf04aef4e3c2283e7fa3066360241cad402cf5adb3147ec4b1fbf1",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the verified current protocol-session fold",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}

### A: journal_read of the session journal — STORED BYTES
{
  "journal": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "entries": [
    {
      "seq": 0,
      "prev": "0000000000000000000000000000000000000000000000000000000000000000",
      "payload": "{\"bindings\":{\"builder\":\"codex\",\"coordinator\":\"fable\",\"operator\":\"mepuka\"},\"kind\":\"open\",\"protocol\":\"2543ef8efd038e8f140b5887820d5b376b55920b823b95b9d6382a6e2b3cb4a6\",\"retention\":\"irreducible\",\"version\":\"flb.protocol.session.v0\"}"
    },
    {
      "seq": 1,
      "prev": "5433dc89e087f959eea0828e5a34e67d28020112a3644d1f38b0ea98a1431664",
      "payload": "{\"hole\":\"spec\",\"kind\":\"fill\",\"principal\":\"fable\",\"retention\":\"compactible\",\"seat\":\"coordinator\",\"value\":{\"body_digest\":\"b-authored-attributed-to-fable\",\"title\":\"FORGED BY CONNECTION B\"}}"
    },
    {
      "seq": 2,
      "prev": "d6fd26ba52e71c46c1984671c505d1e5edfbd392086a66cbc0ebc34a4162647c",
      "payload": "{\"hole\":\"build_report\",\"kind\":\"fill\",\"principal\":\"codex\",\"retention\":\"compactible\",\"seat\":\"builder\",\"value\":{\"commit\":\"0000000\",\"gates\":\"FORGED\",\"notes\":\"authored by connection B, attributed to codex\"}}"
    }
  ],
  "claimed": {
    "ok": true,
    "journal": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
    "entries": [
      {
        "seq": 0,
        "prev": "0000000000000000000000000000000000000000000000000000000000000000",
        "payload": "{\"bindings\":{\"builder\":\"codex\",\"coordinator\":\"fable\",\"operator\":\"mepuka\"},\"kind\":\"open\",\"protocol\":\"2543ef8efd038e8f140b5887820d5b376b55920b823b95b9d6382a6e2b3cb4a6\",\"retention\":\"irreducible\",\"version\":\"flb.protocol.session.v0\"}"
      },
      {
        "seq": 1,
        "prev": "5433dc89e087f959eea0828e5a34e67d28020112a3644d1f38b0ea98a1431664",
        "payload": "{\"hole\":\"spec\",\"kind\":\"fill\",\"principal\":\"fable\",\"retention\":\"compactible\",\"seat\":\"coordinator\",\"value\":{\"body_digest\":\"b-authored-attributed-to-fable\",\"title\":\"FORGED BY CONNECTION B\"}}"
      },
      {
        "seq": 2,
        "prev": "d6fd26ba52e71c46c1984671c505d1e5edfbd392086a66cbc0ebc34a4162647c",
        "payload": "{\"hole\":\"build_report\",\"kind\":\"fill\",\"principal\":\"codex\",\"retention\":\"compactible\",\"seat\":\"builder\",\"value\":{\"commit\":\"0000000\",\"gates\":\"FORGED\",\"notes\":\"authored by connection B, attributed to codex\"}}"
      }
    ],
    "seq": 2,
    "head": "4545f4360daf04aef4e3c2283e7fa3066360241cad402cf5adb3147ec4b1fbf1",
    "note": "heads are claims: recompute the chain head from the entries locally",
    "next": [
      {
        "subject": "flb.req.journal.read",
        "note": "continue from the verified cursor",
        "body": {
          "from": {
            "head": "4545f4360daf04aef4e3c2283e7fa3066360241cad402cf5adb3147ec4b1fbf1",
            "seq": 2
          },
          "journal": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
          "max": 0
        }
      }
    ]
  },
  "verified": {
    "seq": 2,
    "head": "4545f4360daf04aef4e3c2283e7fa3066360241cad402cf5adb3147ec4b1fbf1"
  }
}

daemon#1 stopped. In-memory protocolSessions cache and catalog are gone.

daemon#2 up on the SAME store — every fold below is a COLD replay from disk.

### C: protocol.session.state after RESTART — COLD replay verdict on the forged events
{
  "ok": true,
  "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "protocol": "2543ef8efd038e8f140b5887820d5b376b55920b823b95b9d6382a6e2b3cb4a6",
  "bindings": {
    "builder": "codex",
    "coordinator": "fable",
    "operator": "mepuka"
  },
  "holes": {
    "authorization": {
      "state": "open"
    },
    "build_report": {
      "state": "filled",
      "value": {
        "commit": "0000000",
        "gates": "FORGED",
        "notes": "authored by connection B, attributed to codex"
      },
      "candidates": [
        {
          "value": {
            "commit": "0000000",
            "gates": "FORGED",
            "notes": "authored by connection B, attributed to codex"
          },
          "seat": "builder"
        }
      ]
    },
    "decision": {
      "state": "open"
    },
    "review": {
      "state": "open"
    },
    "spec": {
      "state": "filled",
      "value": {
        "body_digest": "b-authored-attributed-to-fable",
        "title": "FORGED BY CONNECTION B"
      },
      "candidates": [
        {
          "value": {
            "body_digest": "b-authored-attributed-to-fable",
            "title": "FORGED BY CONNECTION B"
          },
          "seat": "coordinator"
        }
      ]
    }
  },
  "status": "open",
  "head": "4545f4360daf04aef4e3c2283e7fa3066360241cad402cf5adb3147ec4b1fbf1",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the verified current protocol-session fold",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}

### D (third connection): close principal='mepuka' (FORGED close authority)
{
  "ok": true,
  "head": "7df4c415296171050a337b5e815e66def56ab760122bf23e163543ea7eb34c99",
  "outcome": "abandoned",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the terminal verified fold and its final state digest",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}

### C: terminal state after forged close
{
  "ok": true,
  "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "protocol": "2543ef8efd038e8f140b5887820d5b376b55920b823b95b9d6382a6e2b3cb4a6",
  "bindings": {
    "builder": "codex",
    "coordinator": "fable",
    "operator": "mepuka"
  },
  "holes": {
    "authorization": {
      "state": "unfilled"
    },
    "build_report": {
      "state": "filled",
      "value": {
        "commit": "0000000",
        "gates": "FORGED",
        "notes": "authored by connection B, attributed to codex"
      },
      "candidates": [
        {
          "value": {
            "commit": "0000000",
            "gates": "FORGED",
            "notes": "authored by connection B, attributed to codex"
          },
          "seat": "builder"
        }
      ],
      "sealed": true
    },
    "decision": {
      "state": "unfilled"
    },
    "review": {
      "state": "unfilled"
    },
    "spec": {
      "state": "filled",
      "value": {
        "body_digest": "b-authored-attributed-to-fable",
        "title": "FORGED BY CONNECTION B"
      },
      "candidates": [
        {
          "value": {
            "body_digest": "b-authored-attributed-to-fable",
            "title": "FORGED BY CONNECTION B"
          },
          "seat": "coordinator"
        }
      ],
      "sealed": true
    }
  },
  "status": "closed",
  "outcome": "abandoned",
  "final_state_digest": "5bbae9f22db860ba186cf6b608f220be7ea89499840ce179af5a04dbd0758d5a",
  "head": "7df4c415296171050a337b5e815e66def56ab760122bf23e163543ea7eb34c99",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the verified current protocol-session fold",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}

daemon#3 up on the same store — SECOND cold replay of the now-terminal round.

### E: protocol.session.state — second cold replay of the closed round
{
  "ok": true,
  "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "protocol": "2543ef8efd038e8f140b5887820d5b376b55920b823b95b9d6382a6e2b3cb4a6",
  "bindings": {
    "builder": "codex",
    "coordinator": "fable",
    "operator": "mepuka"
  },
  "holes": {
    "authorization": {
      "state": "unfilled"
    },
    "build_report": {
      "state": "filled",
      "value": {
        "commit": "0000000",
        "gates": "FORGED",
        "notes": "authored by connection B, attributed to codex"
      },
      "candidates": [
        {
          "value": {
            "commit": "0000000",
            "gates": "FORGED",
            "notes": "authored by connection B, attributed to codex"
          },
          "seat": "builder"
        }
      ],
      "sealed": true
    },
    "decision": {
      "state": "unfilled"
    },
    "review": {
      "state": "unfilled"
    },
    "spec": {
      "state": "filled",
      "value": {
        "body_digest": "b-authored-attributed-to-fable",
        "title": "FORGED BY CONNECTION B"
      },
      "candidates": [
        {
          "value": {
            "body_digest": "b-authored-attributed-to-fable",
            "title": "FORGED BY CONNECTION B"
          },
          "seat": "coordinator"
        }
      ],
      "sealed": true
    }
  },
  "status": "closed",
  "outcome": "abandoned",
  "final_state_digest": "5bbae9f22db860ba186cf6b608f220be7ea89499840ce179af5a04dbd0758d5a",
  "head": "7df4c415296171050a337b5e815e66def56ab760122bf23e163543ea7eb34c99",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the verified current protocol-session fold",
      "body": {
        "session": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205"
      }
    }
  ]
}