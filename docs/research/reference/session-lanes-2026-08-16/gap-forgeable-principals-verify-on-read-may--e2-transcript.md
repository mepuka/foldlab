
A and B are two independent credentialed connections; B never names itself to the daemon.

--- ARM single-seat-successor (holeSeats=["author"], revision=successor-round) bindings={"author":"alice"}

### single-seat-successor: B fills FIRST as 'alice'
{
  "state": "filled",
  "value": {
    "note": "FORGED BY B, attributed to alice"
  },
  "candidates": [
    {
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "seat": "author"
    }
  ]
}

### single-seat-successor: A (the 'real' alice) then fills a DIFFERENT value as 'alice'
{
  "kind": "invalid-structure",
  "law": "flb.protocol.session.v0 admits only moves licensed by the current hole state",
  "path": [
    "value"
  ],
  "got": {
    "note": "the real alice's actual value"
  },
  "expected": "no self-revision: a seat opens a new protocol round to revise its own filled value",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "correction is a new round: close this round, then open a successor that cites it",
      "body": {
        "session": "flb_protocol_session_v0_f451fef6e641a48de209d490b0f2c787070d440fb406adb0ea693cdf55ed6fca"
      }
    }
  ],
  "sort": "structural",
  "local": false
}

### single-seat-successor: close
{
  "ok": true,
  "head": "1f13f9e9880b1cbfba068098b1470a5ef14324b33f2b7d8d402da902187b6237",
  "outcome": "completed",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the terminal verified fold and its final state digest",
      "body": {
        "session": "flb_protocol_session_v0_f451fef6e641a48de209d490b0f2c787070d440fb406adb0ea693cdf55ed6fca"
      }
    }
  ]
}

### single-seat-successor: TERMINAL RECORD
{
  "holes": {
    "claim": {
      "state": "filled",
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "candidates": [
        {
          "value": {
            "note": "FORGED BY B, attributed to alice"
          },
          "seat": "author"
        }
      ],
      "sealed": true
    }
  },
  "status": "closed",
  "outcome": "completed",
  "final_state_digest": "1ac708e9c504c1659931b44025681d09bf1b738750667c2722bea7792d0f2148"
}

--- ARM single-seat-absorb (holeSeats=["author"], revision=absorb) bindings={"author":"alice"}

### single-seat-absorb: B fills FIRST as 'alice'
{
  "state": "filled",
  "value": {
    "note": "FORGED BY B, attributed to alice"
  },
  "candidates": [
    {
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "seat": "author"
    }
  ]
}

### single-seat-absorb: A (the 'real' alice) then fills a DIFFERENT value as 'alice'
{
  "state": "disputed",
  "candidates": [
    {
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "seat": "author"
    },
    {
      "value": {
        "note": "the real alice's actual value"
      },
      "seat": "author"
    }
  ]
}

### single-seat-absorb: close
{
  "kind": "unreachable",
  "law": "the request produced no reply before its client deadline — this does not distinguish network failure from remote silence",
  "next": [
    {
      "subject": "flb.req.protocol.session.close",
      "body": {
        "session": "flb_protocol_session_v0_d476a69378bd3c4e07e3958b5cfcb501a9ac676651e83367a32b5bc34674263a",
        "principal": "alice"
      },
      "note": "restore reachability, then explicitly retry this request"
    }
  ],
  "local": true,
  "got": "TimeoutError: timeout",
  "expected": "flb.req.protocol.session.close"
}

### single-seat-absorb: TERMINAL RECORD
{
  "holes": {
    "claim": {
      "state": "disputed",
      "candidates": [
        {
          "value": {
            "note": "FORGED BY B, attributed to alice"
          },
          "seat": "author"
        },
        {
          "value": {
            "note": "the real alice's actual value"
          },
          "seat": "author"
        }
      ]
    }
  },
  "status": "open"
}

--- ARM two-seat-fenced (holeSeats=["author","reviewer"], revision=absorb) bindings={"author":"alice","reviewer":"bob"}

### two-seat-fenced: B fills FIRST as 'alice'
{
  "state": "filled",
  "value": {
    "note": "FORGED BY B, attributed to alice"
  },
  "candidates": [
    {
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "seat": "author"
    }
  ]
}

### two-seat-fenced: A (the 'real' alice) then fills a DIFFERENT value as 'alice'
{
  "state": "disputed",
  "candidates": [
    {
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "seat": "author"
    },
    {
      "value": {
        "note": "the real alice's actual value"
      },
      "seat": "author"
    }
  ]
}

### two-seat-fenced: A fills as the OTHER seat 'bob'
{
  "state": "disputed",
  "candidates": [
    {
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "seat": "author"
    },
    {
      "value": {
        "note": "the real alice's actual value"
      },
      "seat": "author"
    },
    {
      "value": {
        "note": "bob's differing value"
      },
      "seat": "reviewer"
    }
  ]
}

### two-seat-fenced: close
{
  "ok": true,
  "head": "ffcb5c06b06def3d2553e76c5c3891cb5fa25608f299c509e50d50f4b498a6b1",
  "outcome": "completed",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the terminal verified fold and its final state digest",
      "body": {
        "session": "flb_protocol_session_v0_0de4db30e873481b6a750f17b40ea376e991e5c57b3e9d7ed7722c7f5173c19b"
      }
    }
  ]
}

### two-seat-fenced: TERMINAL RECORD
{
  "holes": {
    "claim": {
      "state": "decided",
      "value": {
        "note": "FORGED BY B, attributed to alice"
      },
      "candidates": [
        {
          "value": {
            "note": "FORGED BY B, attributed to alice"
          },
          "seat": "author"
        },
        {
          "value": {
            "note": "the real alice's actual value"
          },
          "seat": "author"
        },
        {
          "value": {
            "note": "bob's differing value"
          },
          "seat": "reviewer"
        }
      ]
    }
  },
  "status": "closed",
  "outcome": "completed",
  "final_state_digest": "96083c0b704aa16b5fd45eedd44b555b42402ea8a336a219577a414d111d001f"
}