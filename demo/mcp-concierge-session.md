# One authoring session over MCP, verbatim

A person says what they mean. A model turns it into a type that is
*completely valid by construction* — not by being careful, but because
every wrong move is refused with the information needed to make the
right one. The type ends up with an identity that is its content.

This file is a real transcript. Every request and reply below was
captured from a live JSON-RPC 2.0 session over stdio against
`bun proto/ts/src/mcp-main.ts`, which was itself talking to a real
`protod` daemon over NATS. Nothing is illustrative and nothing is
reconstructed. Two things are shortened, both marked in place: the
frontier's list of legal fills, which repeats identically at every
step, and the contract reply at step 4, which is ~600 lines of schema.

## Cast

| | |
|---|---|
| **The person** | Knows what they want in domain terms. Never sees JSON. |
| **The model** | An MCP client. Has read no documentation about this server. |
| **The daemon** | Serves three verbs. Refuses everything it cannot certify, and every refusal teaches. |

## The three-verb writ

There are only three things anyone can do: **request** (ask the daemon
to do something and get a fact or a refusal), **publish** (append a
frame claiming a type), and **read** (get entries back and verify them
yourself). Everything below is one of those three.

## What this session produces

```text
Currency  363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a
Order     d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89
```

Both digests were recomputed independently by the client from the
structures alone, and both matched. The journal head the daemon
reported was re-folded locally from the entries and matched:

```json
{
  "claimedHead": "2672f034892e8025bc2b7da9fc47918e97579471f9ed3f9258a621ff0183d64c",
  "locallyFoldedHead": "2672f034892e8025bc2b7da9fc47918e97579471f9ed3f9258a621ff0183d64c",
  "foldOk": true,
  "foldDetail": {
    "ok": true,
    "seq": 0,
    "head": "2672f034892e8025bc2b7da9fc47918e97579471f9ed3f9258a621ff0183d64c"
  },
  "headsAgree": true,
  "orderDigestRecomputedLocally": "d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89",
  "digestAgrees": true,
  "currencyDigestRecomputedLocally": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
  "currencyAgrees": true
}
```

---

# The transcript

## 1. initialize

**Person:** "I need an Order type — an id string, an amount in whole cents, and a currency that can only be USD, EUR or GBP. Then record one order and read it back." The model opens an MCP session. It knows nothing about this server yet.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {
      "name": "dogfood-client",
      "version": "0.0.1"
    }
  }
}
```

**Reply** *(159 ms)*

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "logging": {},
      "completions": {},
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "flb-proto",
      "version": "0.0.1"
    }
  }
}
```

## 2. notifications/initialized

The handshake completes. From here the model has never read a document about this daemon — everything it learns, it learns from replies.

**Request**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

*(a notification — no reply by design)*

## 3. tools/list

**The model asks what it may do.** The six tools are not hand-written: they are DERIVED at startup from the daemon's own `contract.describe`, so the MCP surface cannot drift from the daemon.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Reply** *(2 ms)*

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "type_create",
        "description": "submit an flb.type.v0 structure; the daemon canonicalizes (RFC 8785), derives the digest itself, refuses any asserted digest it cannot re-derive, and converges on same bytes (created:false, never an error) (subject: flb.req.type.create)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "assertedDigest": {
              "type": "string",
              "pattern": "^[0-9a-f]{64}$",
              "x-flb-brand": "flb.digest"
            },
            "structure": {
              "x-flb-brand": "flb.type.v0"
            },
            "submitter": {
              "type": "string"
            }
          },
          "required": [
            "structure"
          ],
          "additionalProperties": false
        },
        "annotations": {
          "readOnlyHint": false,
          "destructiveHint": true,
          "idempotentHint": false,
          "openWorldHint": true
        }
      },
      {
        "name": "type_fill",
        "description": "stateless guided construction: replace the hole at path with subtree, revalidate the whole partial, and return every remaining hole as a truthful frontier; the partial is the entire state and travels in every request and reply (subject: flb.req.type.fill)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "partial": {
              "x-flb-brand": "flb.partial.v0"
            },
            "path": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "subtree": {
              "x-flb-brand": "flb.partial.v0"
            }
          },
          "required": [
            "partial",
            "path",
            "subtree"
          ],
          "additionalProperties": false
        },
        "annotations": {
          "readOnlyHint": false,
          "destructiveHint": true,
          "idempotentHint": false,
          "openWorldHint": true
        }
      },
      {
        "name": "type_unfill",
        "description": "stateless mechanical undo: replace the type node at path with a hole, revalidate the whole partial, and return its truthful frontier; an empty path unfills the root (subject: flb.req.type.unfill)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "partial": {
              "x-flb-brand": "flb.partial.v0"
            },
            "path": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "partial",
            "path"
          ],
          "additionalProperties": false
        },
        "annotations": {
          "readOnlyHint": false,
          "destructiveHint": true,
          "idempotentHint": false,
          "openWorldHint": true
        }
      },
      {
        "name": "journal_read",
        "description": "read a journal (the catalog is just a journal named \"catalog\"); entries come back with a claimed head — recompute it locally (subject: flb.req.journal.read)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "from": {
              "type": "object",
              "properties": {
                "head": {
                  "type": "string"
                },
                "seq": {
                  "type": "integer"
                }
              },
              "required": [
                "seq"
              ],
              "additionalProperties": false
            },
            "journal": {
              "type": "string"
            },
            "max": {
              "type": "integer"
            }
          },
          "required": [
            "journal"
          ],
          "additionalProperties": false
        },
        "annotations": {
          "readOnlyHint": false,
          "destructiveHint": true,
          "idempotentHint": false,
          "openWorldHint": true
        }
      },
      {
        "name": "contract_describe",
        "description": "this request; the body is ignored (subject: flb.req.contract.describe)",
        "inputSchema": {
          "type": "object",
          "properties": {},
          "required": [],
          "additionalProperties": false
        },
        "annotations": {
          "readOnlyHint": false,
          "destructiveHint": true,
          "idempotentHint": false,
          "openWorldHint": true
        }
      },
      {
        "name": "publish",
        "description": "publish a canonical frame claiming a cataloged type; request/reply — the reply admits or refuses; admitted on identity resolution only; payload conformance against the claimed structure was NOT checked (subject: flb.ing.<journal>)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "journal": {
              "type": "string"
            },
            "frame": {
              "type": "object",
              "properties": {
                "payload": {},
                "type": {
                  "type": "string",
                  "pattern": "^[0-9a-f]{64}$",
                  "x-flb-brand": "flb.digest"
                }
              },
              "required": [
                "type"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "journal",
            "frame"
          ],
          "additionalProperties": false
        },
        "annotations": {
          "readOnlyHint": false,
          "destructiveHint": true,
          "idempotentHint": false,
          "openWorldHint": true
        }
      }
    ]
  }
}
```

## 4. tools/call contract_describe

**The model reads the writ itself.** Three verbs (request / publish / read), five request kinds, one identity scheme, and a uniform refusal envelope. Note `structure` is branded `flb.type.v0` with no JSON-Schema body — the grammar is enforced by the daemon, not by the client.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "contract_describe",
    "arguments": {}
  }
}
```

**Reply** *(3 ms)*

```json
{
  "contract": {
    "name": "flb.proto",
    "note": "every reply is either the request's fact shape or the uniform refusal {ok:false, refusal}; refusals are data and nothing throws across this seam",
    "scheme": "bytes-sha256-v1",
    "requests": [
      {
        "name": "type_create",
        "subject": "flb.req.type.create",
        "note": "submit an flb.type.v0 structure; the daemon canonicalizes (RFC 8785), derives the digest itself, refuses any asserted digest it cannot re-derive, and converges on same bytes (created:false, never an error)",
        "body": "<flb.type.v0 struct — rendered into the inputSchema shown in step 3>",
        "reply": "<flb.type.v0 struct — NOT rendered into any outputSchema; see findings>"
      },
      {
        "name": "type_fill",
        "subject": "flb.req.type.fill",
        "note": "stateless guided construction: replace the hole at path with subtree, revalidate the whole partial, and return every remaining hole as a truthful frontier; the partial is the entire state and travels in every request and reply",
        "body": "<flb.type.v0 struct — rendered into the inputSchema shown in step 3>",
        "reply": "<flb.type.v0 struct — NOT rendered into any outputSchema; see findings>"
      },
      {
        "name": "type_unfill",
        "subject": "flb.req.type.unfill",
        "note": "stateless mechanical undo: replace the type node at path with a hole, revalidate the whole partial, and return its truthful frontier; an empty path unfills the root",
        "body": "<flb.type.v0 struct — rendered into the inputSchema shown in step 3>",
        "reply": "<flb.type.v0 struct — NOT rendered into any outputSchema; see findings>"
      },
      {
        "name": "journal_read",
        "subject": "flb.req.journal.read",
        "note": "read a journal (the catalog is just a journal named \"catalog\"); entries come back with a claimed head — recompute it locally",
        "body": "<flb.type.v0 struct — rendered into the inputSchema shown in step 3>",
        "reply": "<flb.type.v0 struct — NOT rendered into any outputSchema; see findings>"
      },
      {
        "name": "contract_describe",
        "subject": "flb.req.contract.describe",
        "note": "this request; the body is ignored",
        "body": "<flb.type.v0 struct — rendered into the inputSchema shown in step 3>",
        "reply": "<flb.type.v0 struct — NOT rendered into any outputSchema; see findings>"
      }
    ],
    "ingress": {
      "name": "publish",
      "subjectPattern": "flb.ing.<journal>",
      "note": "publish a canonical frame claiming a cataloged type; request/reply — the reply admits or refuses; admitted on identity resolution only; payload conformance against the claimed structure was NOT checked",
      "frame": "<flb.type.v0 struct>",
      "reply": "<flb.type.v0 struct>"
    },
    "refusal": "<flb.type.v0 struct: kind, law, path?, got?, expected?, example?, next[], local>"
  }
}
```

*The `body`, `reply`, `frame` and `refusal` values above are real
`flb.type.v0` structures in the wire reply — around 600 lines of
JSON — summarised here for reading. They are the whole point: the
daemon describes its own shapes in its own type language, and the
MCP tool schemas in step 3 were machine-derived from them.*

## 5. tools/call type_fill (open concierge)

**The model starts from nothing.** It fills the root hole with a hole — the no-op that opens the concierge — and the daemon answers with a *frontier*: every remaining hole, and for each one the complete list of legal fills, each with a directly-usable example. `refs` is empty: the catalog has nothing in it yet.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "k": "hole"
      },
      "path": [],
      "subtree": {
        "k": "hole"
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "partial": {
    "k": "hole"
  },
  "frontier": [
    {
      "path": [],
      "legal": [
        {
          "kind": "string",
          "example": {
            "k": "string"
          }
        },
        {
          "kind": "bool",
          "example": {
            "k": "bool"
          }
        },
        {
          "kind": "int",
          "example": {
            "k": "int"
          }
        },
        {
          "kind": "float",
          "example": {
            "k": "float"
          }
        },
        {
          "kind": "null",
          "example": {
            "k": "null"
          }
        },
        {
          "kind": "opaque",
          "example": {
            "k": "opaque"
          }
        },
        {
          "kind": "literal",
          "example": {
            "k": "literal",
            "value": null
          }
        },
        {
          "kind": "list",
          "example": {
            "k": "list",
            "of": {
              "k": "hole"
            }
          }
        },
        {
          "kind": "struct",
          "example": {
            "fields": {},
            "k": "struct",
            "optional": []
          }
        },
        {
          "kind": "union",
          "example": {
            "k": "union",
            "of": [
              {
                "k": "hole"
              }
            ]
          }
        },
        {
          "kind": "brand",
          "example": {
            "k": "brand",
            "name": "Brand",
            "of": {
              "k": "hole"
            }
          }
        },
        {
          "kind": "check",
          "example": {
            "base": {
              "k": "hole"
            },
            "check": {
              "args": {},
              "name": "check"
            },
            "k": "check"
          }
        }
      ],
      "refs": []
    }
  ],
  "next": [
    {
      "subject": "flb.req.type.fill",
      "note": "fill the first remaining hole with any advertised legal example",
      "body": {
        "partial": {
          "k": "hole"
        },
        "path": [],
        "subtree": {
          "k": "string"
        }
      }
    },
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ]
}
```

## 6. tools/call type_fill — MISTAKE 1 (structural)

**MISTAKE 1 — structural.** The person said "record", so the model writes `k: "record"`. No such kind exists.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "k": "hole"
      },
      "path": [],
      "subtree": {
        "k": "record",
        "fields": {
          "id": {
            "k": "hole"
          },
          "amount": {
            "k": "hole"
          },
          "currency": {
            "k": "hole"
          }
        }
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": false,
  "refusal": {
    "kind": "invalid-structure",
    "law": "flb.type.v0: unknown kind refuses — the grammar grows under ticket 004, never by admission on faith",
    "path": [
      "partial",
      "k"
    ],
    "got": "record",
    "expected": [
      "string",
      "bool",
      "int",
      "float",
      "null",
      "opaque",
      "literal",
      "list",
      "struct",
      "union",
      "brand",
      "check",
      "ref",
      "hole"
    ],
    "example": {
      "k": "string"
    },
    "next": [
      {
        "subject": "flb.req.type.fill",
        "note": "repair the field named by the refusal and retry this stateless fill",
        "body": {
          "partial": {
            "k": "hole"
          },
          "path": [],
          "subtree": {
            "fields": {
              "amount": {
                "k": "hole"
              },
              "currency": {
                "k": "hole"
              },
              "id": {
                "k": "hole"
              }
            },
            "k": "record"
          }
        }
      },
      {
        "subject": "flb.req.contract.describe",
        "note": "request the daemon's contract; every subject and body shape is described there",
        "body": {}
      }
    ],
    "local": false
  }
}
```

## 7. tools/call type_fill — self-repair

**Self-repair, first try.** The refusal's `expected` enumerated all fourteen legal kinds. `struct` is in that list. The model rewrites the node and resubmits — no documentation consulted. The daemon returns a three-hole frontier in UTF-16 field-name order: `amount`, `currency`, `id`.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "k": "hole"
      },
      "path": [],
      "subtree": {
        "k": "struct",
        "fields": {
          "id": {
            "k": "hole"
          },
          "amount": {
            "k": "hole"
          },
          "currency": {
            "k": "hole"
          }
        },
        "optional": []
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "partial": {
    "fields": {
      "amount": {
        "k": "hole"
      },
      "currency": {
        "k": "hole"
      },
      "id": {
        "k": "hole"
      }
    },
    "k": "struct",
    "optional": []
  },
  "frontier": [
    {
      "path": [
        "fields",
        "amount"
      ],
      "legal": "<12 legal choices — identical to step 5, elided for length>",
      "refs": []
    },
    {
      "path": [
        "fields",
        "currency"
      ],
      "legal": "<12 legal choices — identical to step 5, elided for length>",
      "refs": []
    },
    {
      "path": [
        "fields",
        "id"
      ],
      "legal": "<12 legal choices — identical to step 5, elided for length>",
      "refs": []
    }
  ],
  "next": [
    {
      "subject": "flb.req.type.fill",
      "note": "fill the first remaining hole with any advertised legal example",
      "body": {
        "partial": {
          "fields": {
            "amount": {
              "k": "hole"
            },
            "currency": {
              "k": "hole"
            },
            "id": {
              "k": "hole"
            }
          },
          "k": "struct",
          "optional": []
        },
        "path": [
          "fields",
          "amount"
        ],
        "subtree": {
          "k": "string"
        }
      }
    },
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ]
}
```

## 8. tools/call type_fill (fields/amount)

"Whole cents" is an integer. The model takes the `int` example from the frontier verbatim. Two holes remain.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "fields": {
          "amount": {
            "k": "hole"
          },
          "currency": {
            "k": "hole"
          },
          "id": {
            "k": "hole"
          }
        },
        "k": "struct",
        "optional": []
      },
      "path": [
        "fields",
        "amount"
      ],
      "subtree": {
        "k": "int"
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "partial": {
    "fields": {
      "amount": {
        "k": "int"
      },
      "currency": {
        "k": "hole"
      },
      "id": {
        "k": "hole"
      }
    },
    "k": "struct",
    "optional": []
  },
  "frontier": [
    {
      "path": [
        "fields",
        "currency"
      ],
      "legal": "<12 legal choices — identical to step 5, elided for length>",
      "refs": []
    },
    {
      "path": [
        "fields",
        "id"
      ],
      "legal": "<12 legal choices — identical to step 5, elided for length>",
      "refs": []
    }
  ],
  "next": [
    {
      "subject": "flb.req.type.fill",
      "note": "fill the first remaining hole with any advertised legal example",
      "body": {
        "partial": {
          "fields": {
            "amount": {
              "k": "int"
            },
            "currency": {
              "k": "hole"
            },
            "id": {
              "k": "hole"
            }
          },
          "k": "struct",
          "optional": []
        },
        "path": [
          "fields",
          "currency"
        ],
        "subtree": {
          "k": "string"
        }
      }
    },
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ]
}
```

## 9. tools/call type_fill (fields/id)

`id` takes the `string` example verbatim. One hole remains: `currency`.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "fields": {
          "amount": {
            "k": "int"
          },
          "currency": {
            "k": "hole"
          },
          "id": {
            "k": "hole"
          }
        },
        "k": "struct",
        "optional": []
      },
      "path": [
        "fields",
        "id"
      ],
      "subtree": {
        "k": "string"
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "partial": {
    "fields": {
      "amount": {
        "k": "int"
      },
      "currency": {
        "k": "hole"
      },
      "id": {
        "k": "string"
      }
    },
    "k": "struct",
    "optional": []
  },
  "frontier": [
    {
      "path": [
        "fields",
        "currency"
      ],
      "legal": "<12 legal choices — identical to step 5, elided for length>",
      "refs": []
    }
  ],
  "next": [
    {
      "subject": "flb.req.type.fill",
      "note": "fill the first remaining hole with any advertised legal example",
      "body": {
        "partial": {
          "fields": {
            "amount": {
              "k": "int"
            },
            "currency": {
              "k": "hole"
            },
            "id": {
              "k": "string"
            }
          },
          "k": "struct",
          "optional": []
        },
        "path": [
          "fields",
          "currency"
        ],
        "subtree": {
          "k": "string"
        }
      }
    },
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ]
}
```

## 10. tools/call type_create (Currency)

Currency is a reusable enum, so the model gives it its own identity first — a brand over a union of three literals — and gets back a digest. Note the daemon canonicalizes and derives the digest ITSELF; the client never asserts one.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "type_create",
    "arguments": {
      "structure": {
        "k": "brand",
        "name": "Currency",
        "of": {
          "k": "union",
          "of": [
            {
              "k": "literal",
              "value": "USD"
            },
            {
              "k": "literal",
              "value": "EUR"
            },
            {
              "k": "literal",
              "value": "GBP"
            }
          ]
        }
      },
      "submitter": "dogfood-client"
    }
  }
}
```

**Reply** *(2 ms)*

```json
{
  "ok": true,
  "created": true,
  "digest": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
  "scheme": "bytes-sha256-v1",
  "catalogSeq": 0,
  "catalogHead": "d6313276790f905e394745a5fb996e778f3ea2334dac2637422ea56c83dc6543",
  "next": [
    {
      "subject": "flb.ing.data",
      "note": "publish a canonical frame claiming this type (request/reply; the reply admits or refuses)",
      "body": {
        "payload": "<your event payload>",
        "type": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a"
      }
    },
    {
      "subject": "flb.req.journal.read",
      "note": "read the catalog — it is just a journal; verify the head locally",
      "body": {
        "from": {
          "head": "0000000000000000000000000000000000000000000000000000000000000000",
          "seq": -1
        },
        "journal": "catalog",
        "max": 0
      }
    }
  ]
}
```

## 11. tools/call type_fill — MISTAKE 2 (reference)

**MISTAKE 2 — reference.** The model copies the Currency digest into a `ref` and transposes the first two hex characters (`36…` becomes `63…`). The daemon refuses: a ref must already resolve.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "fields": {
          "amount": {
            "k": "int"
          },
          "currency": {
            "k": "hole"
          },
          "id": {
            "k": "string"
          }
        },
        "k": "struct",
        "optional": []
      },
      "path": [
        "fields",
        "currency"
      ],
      "subtree": {
        "k": "ref",
        "digest": "633e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a"
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": false,
  "refusal": {
    "kind": "unknown-ref",
    "law": "W4/DAG: every ref in a partial must already resolve — no forward refs, no admission on faith",
    "path": [
      "partial",
      "fields",
      "currency",
      "digest"
    ],
    "got": "633e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
    "expected": "a digest already committed to the catalog",
    "next": [
      {
        "subject": "flb.req.type.fill",
        "note": "repair the field named by the refusal and retry this stateless fill",
        "body": {
          "partial": {
            "fields": {
              "amount": {
                "k": "int"
              },
              "currency": {
                "k": "hole"
              },
              "id": {
                "k": "string"
              }
            },
            "k": "struct",
            "optional": []
          },
          "path": [
            "fields",
            "currency"
          ],
          "subtree": {
            "digest": "633e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
            "k": "ref"
          }
        }
      },
      {
        "subject": "flb.req.contract.describe",
        "note": "request the daemon's contract; every subject and body shape is described there",
        "body": {}
      }
    ],
    "local": false
  }
}
```

## 12. tools/call type_fill — replaying the refusal's next[0].body verbatim

**The refusal's `next[0]` hint, followed verbatim.** This is the honest part of the demo: the hint echoes the SAME bad digest back, so replaying it reproduces a byte-identical refusal. Structural refusals self-repair; this one does not. (Verified in-run: `replayIsIdentical: true`.)

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "fields": {
          "amount": {
            "k": "int"
          },
          "currency": {
            "k": "hole"
          },
          "id": {
            "k": "string"
          }
        },
        "k": "struct",
        "optional": []
      },
      "path": [
        "fields",
        "currency"
      ],
      "subtree": {
        "digest": "633e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
        "k": "ref"
      }
    }
  }
}
```

**Reply** *(0 ms)*

```json
{
  "ok": false,
  "refusal": {
    "kind": "unknown-ref",
    "law": "W4/DAG: every ref in a partial must already resolve — no forward refs, no admission on faith",
    "path": [
      "partial",
      "fields",
      "currency",
      "digest"
    ],
    "got": "633e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
    "expected": "a digest already committed to the catalog",
    "next": [
      {
        "subject": "flb.req.type.fill",
        "note": "repair the field named by the refusal and retry this stateless fill",
        "body": {
          "partial": {
            "fields": {
              "amount": {
                "k": "int"
              },
              "currency": {
                "k": "hole"
              },
              "id": {
                "k": "string"
              }
            },
            "k": "struct",
            "optional": []
          },
          "path": [
            "fields",
            "currency"
          ],
          "subtree": {
            "digest": "633e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
            "k": "ref"
          }
        }
      },
      {
        "subject": "flb.req.contract.describe",
        "note": "request the daemon's contract; every subject and body shape is described there",
        "body": {}
      }
    ],
    "local": false
  }
}
```

## 13. tools/call type_fill (probe: put the hole back)

**The recovery that does work.** The model puts the hole back, and the daemon re-advertises the frontier — which now carries `refs`, the digests that actually resolve, and a thirteenth legal choice, `ref`, whose example is a truthful digest. The catalog changed at step 10; the frontier is the only thing that says so.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "fields": {
          "amount": {
            "k": "int"
          },
          "currency": {
            "k": "hole"
          },
          "id": {
            "k": "string"
          }
        },
        "k": "struct",
        "optional": []
      },
      "path": [
        "fields",
        "currency"
      ],
      "subtree": {
        "k": "hole"
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "partial": {
    "fields": {
      "amount": {
        "k": "int"
      },
      "currency": {
        "k": "hole"
      },
      "id": {
        "k": "string"
      }
    },
    "k": "struct",
    "optional": []
  },
  "frontier": [
    {
      "path": [
        "fields",
        "currency"
      ],
      "legal": "<13 legal choices — the 12 from step 5 plus `ref`, shown in full above>",
      "refs": [
        "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a"
      ]
    }
  ],
  "next": [
    {
      "subject": "flb.req.type.fill",
      "note": "fill the first remaining hole with any advertised legal example",
      "body": {
        "partial": {
          "fields": {
            "amount": {
              "k": "int"
            },
            "currency": {
              "k": "hole"
            },
            "id": {
              "k": "string"
            }
          },
          "k": "struct",
          "optional": []
        },
        "path": [
          "fields",
          "currency"
        ],
        "subtree": {
          "k": "string"
        }
      }
    },
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ]
}
```

## 14. tools/call type_fill — self-repair (ref)

**Self-repair, from frontier data alone.** The model fills the hole with the advertised digest. `frontier: []` — zero holes. The daemon's own `next` hint now says: finish with `type.create`.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "type_fill",
    "arguments": {
      "partial": {
        "fields": {
          "amount": {
            "k": "int"
          },
          "currency": {
            "k": "hole"
          },
          "id": {
            "k": "string"
          }
        },
        "k": "struct",
        "optional": []
      },
      "path": [
        "fields",
        "currency"
      ],
      "subtree": {
        "k": "ref",
        "digest": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a"
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "partial": {
    "fields": {
      "amount": {
        "k": "int"
      },
      "currency": {
        "digest": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
        "k": "ref"
      },
      "id": {
        "k": "string"
      }
    },
    "k": "struct",
    "optional": []
  },
  "frontier": [],
  "next": [
    {
      "subject": "flb.req.type.create",
      "note": "frontier is empty; finish by creating this decided type",
      "body": {
        "structure": {
          "fields": {
            "amount": {
              "k": "int"
            },
            "currency": {
              "digest": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
              "k": "ref"
            },
            "id": {
              "k": "string"
            }
          },
          "k": "struct",
          "optional": []
        }
      }
    },
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ]
}
```

## 15. tools/call type_create (Order)

**Certified.** The decided structure enters the catalog and receives its content digest. This is the finished Order type.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "type_create",
    "arguments": {
      "structure": {
        "fields": {
          "amount": {
            "k": "int"
          },
          "currency": {
            "digest": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
            "k": "ref"
          },
          "id": {
            "k": "string"
          }
        },
        "k": "struct",
        "optional": []
      },
      "submitter": "dogfood-client"
    }
  }
}
```

**Reply** *(3 ms)*

```json
{
  "ok": true,
  "created": true,
  "digest": "d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89",
  "scheme": "bytes-sha256-v1",
  "catalogSeq": 1,
  "catalogHead": "accbce8942eac8140467d2d964a9b2cf7604eff743f431aff2fa51d7f9bffb93",
  "next": [
    {
      "subject": "flb.ing.data",
      "note": "publish a canonical frame claiming this type (request/reply; the reply admits or refuses)",
      "body": {
        "payload": "<your event payload>",
        "type": "d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89"
      }
    },
    {
      "subject": "flb.req.journal.read",
      "note": "read the catalog — it is just a journal; verify the head locally",
      "body": {
        "from": {
          "head": "0000000000000000000000000000000000000000000000000000000000000000",
          "seq": -1
        },
        "journal": "catalog",
        "max": 0
      }
    }
  ]
}
```

## 16. tools/call type_create (identical resubmit)

**Identity is content, not registration.** The identical structure, submitted again under a different `submitter`: `created: false`, same digest, same catalog position. Not an error — convergence.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "type_create",
    "arguments": {
      "structure": {
        "fields": {
          "amount": {
            "k": "int"
          },
          "currency": {
            "digest": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
            "k": "ref"
          },
          "id": {
            "k": "string"
          }
        },
        "k": "struct",
        "optional": []
      },
      "submitter": "someone-else-entirely"
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "created": false,
  "digest": "d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89",
  "scheme": "bytes-sha256-v1",
  "catalogSeq": 1,
  "catalogHead": "accbce8942eac8140467d2d964a9b2cf7604eff743f431aff2fa51d7f9bffb93",
  "next": [
    {
      "subject": "flb.ing.data",
      "note": "publish a canonical frame claiming this type (request/reply; the reply admits or refuses)",
      "body": {
        "payload": "<your event payload>",
        "type": "d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89"
      }
    },
    {
      "subject": "flb.req.journal.read",
      "note": "read the catalog — it is just a journal; verify the head locally",
      "body": {
        "from": {
          "head": "0000000000000000000000000000000000000000000000000000000000000000",
          "seq": -1
        },
        "journal": "catalog",
        "max": 0
      }
    }
  ]
}
```

## 17. tools/call type_create (Currency, members reordered)

**Order is not identity either.** The same three currencies written `GBP, USD, EUR` instead of `USD, EUR, GBP` converge on the digest from step 10. The daemon sorts union members by canonical bytes before digesting.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "type_create",
    "arguments": {
      "structure": {
        "k": "brand",
        "name": "Currency",
        "of": {
          "k": "union",
          "of": [
            {
              "k": "literal",
              "value": "GBP"
            },
            {
              "k": "literal",
              "value": "USD"
            },
            {
              "k": "literal",
              "value": "EUR"
            }
          ]
        }
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "created": false,
  "digest": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a",
  "scheme": "bytes-sha256-v1",
  "catalogSeq": 0,
  "catalogHead": "accbce8942eac8140467d2d964a9b2cf7604eff743f431aff2fa51d7f9bffb93",
  "next": [
    {
      "subject": "flb.ing.data",
      "note": "publish a canonical frame claiming this type (request/reply; the reply admits or refuses)",
      "body": {
        "payload": "<your event payload>",
        "type": "363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a"
      }
    },
    {
      "subject": "flb.req.journal.read",
      "note": "read the catalog — it is just a journal; verify the head locally",
      "body": {
        "from": {
          "head": "0000000000000000000000000000000000000000000000000000000000000000",
          "seq": -1
        },
        "journal": "catalog",
        "max": 0
      }
    }
  ]
}
```

## 18. tools/call publish (orders)

**Verb two: publish.** One real order, claiming the certified type. Admitted — and the reply states plainly what was NOT checked: payload conformance. Admission is identity resolution only.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "publish",
    "arguments": {
      "journal": "orders",
      "frame": {
        "type": "d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89",
        "payload": {
          "id": "ord-1001",
          "amount": 2599,
          "currency": "EUR"
        }
      }
    }
  }
}
```

**Reply** *(2 ms)*

```json
{
  "ok": true,
  "admitted": true,
  "journal": "orders",
  "seq": 0,
  "head": "2672f034892e8025bc2b7da9fc47918e97579471f9ed3f9258a621ff0183d64c",
  "note": "admitted on identity resolution only; payload conformance against the claimed structure was NOT checked",
  "next": [
    {
      "subject": "flb.req.journal.read",
      "note": "read this journal back and verify the head locally — an admit reply means durably appended and readable",
      "body": {
        "from": {
          "head": "0000000000000000000000000000000000000000000000000000000000000000",
          "seq": -1
        },
        "journal": "orders",
        "max": 0
      }
    }
  ]
}
```

## 19. tools/call publish — MISTAKE 3 (unknown identity)

**MISTAKE 3 — a frame claiming a type nobody created.** Refused on W4, with a `next` hint pointing back at `type.create`. Lag is absence, not admission on faith.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 18,
  "method": "tools/call",
  "params": {
    "name": "publish",
    "arguments": {
      "journal": "orders",
      "frame": {
        "type": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "payload": {
          "id": "ord-1001",
          "amount": 2599,
          "currency": "EUR"
        }
      }
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": false,
  "refusal": {
    "kind": "unknown-identity",
    "law": "W4: create before publish — an unknown identity never enters a journal; lag is absence, not admission on faith",
    "path": [
      "type"
    ],
    "got": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "expected": "a digest already committed to the catalog",
    "next": [
      {
        "subject": "flb.req.type.create",
        "note": "create the type first; the daemon derives and returns its digest",
        "body": {
          "structure": {
            "k": "string"
          }
        }
      },
      {
        "subject": "flb.req.journal.read",
        "note": "read the catalog — it is just a journal; verify the head locally",
        "body": {
          "from": {
            "head": "0000000000000000000000000000000000000000000000000000000000000000",
            "seq": -1
          },
          "journal": "catalog",
          "max": 0
        }
      }
    ],
    "local": false
  }
}
```

## 20. tools/call journal_read (orders)

**Verb three: read.** The entry comes back as the CANONICAL bytes of the frame, not the sender's formatting. The reply calls its own head a claim and tells the reader to recompute it.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 19,
  "method": "tools/call",
  "params": {
    "name": "journal_read",
    "arguments": {
      "journal": "orders"
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "journal": "orders",
  "entries": [
    {
      "seq": 0,
      "prev": "0000000000000000000000000000000000000000000000000000000000000000",
      "payload": "{\"payload\":{\"amount\":2599,\"currency\":\"EUR\",\"id\":\"ord-1001\"},\"type\":\"d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89\"}"
    }
  ],
  "seq": 0,
  "head": "2672f034892e8025bc2b7da9fc47918e97579471f9ed3f9258a621ff0183d64c",
  "note": "heads are claims: recompute the chain head from the entries locally",
  "next": [
    {
      "subject": "flb.req.journal.read",
      "note": "continue from the verified cursor",
      "body": {
        "from": {
          "head": "2672f034892e8025bc2b7da9fc47918e97579471f9ed3f9258a621ff0183d64c",
          "seq": 0
        },
        "journal": "orders",
        "max": 0
      }
    }
  ]
}
```

## 21. tools/call journal_read (catalog)

The catalog is just another journal. Both identities are in it — Currency first, then Order referencing it. Note the union members stored in sorted order: `EUR, GBP, USD`.

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": 20,
  "method": "tools/call",
  "params": {
    "name": "journal_read",
    "arguments": {
      "journal": "catalog"
    }
  }
}
```

**Reply** *(1 ms)*

```json
{
  "ok": true,
  "journal": "catalog",
  "entries": [
    {
      "seq": 0,
      "prev": "0000000000000000000000000000000000000000000000000000000000000000",
      "payload": "{\"digest\":\"363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a\",\"scheme\":\"bytes-sha256-v1\",\"structure\":{\"k\":\"brand\",\"name\":\"Currency\",\"of\":{\"k\":\"union\",\"of\":[{\"k\":\"literal\",\"value\":\"EUR\"},{\"k\":\"literal\",\"value\":\"GBP\"},{\"k\":\"literal\",\"value\":\"USD\"}]}},\"submitter\":\"dogfood-client\"}"
    },
    {
      "seq": 1,
      "prev": "d6313276790f905e394745a5fb996e778f3ea2334dac2637422ea56c83dc6543",
      "payload": "{\"digest\":\"d6226d9e02822b54c8f4a50a5de5d3f60d0e3a293dbe908842eaf88900256c89\",\"scheme\":\"bytes-sha256-v1\",\"structure\":{\"fields\":{\"amount\":{\"k\":\"int\"},\"currency\":{\"digest\":\"363e83562297bb1c95034ea2b0bf06e49d25fa657de699fe1757b8539bc87f7a\",\"k\":\"ref\"},\"id\":{\"k\":\"string\"}},\"k\":\"struct\",\"optional\":[]},\"submitter\":\"dogfood-client\"}"
    }
  ],
  "seq": 1,
  "head": "accbce8942eac8140467d2d964a9b2cf7604eff743f431aff2fa51d7f9bffb93",
  "note": "heads are claims: recompute the chain head from the entries locally",
  "next": [
    {
      "subject": "flb.req.journal.read",
      "note": "continue from the verified cursor",
      "body": {
        "from": {
          "head": "accbce8942eac8140467d2d964a9b2cf7604eff743f431aff2fa51d7f9bffb93",
          "seq": 1
        },
        "journal": "catalog",
        "max": 0
      }
    }
  ]
}
```

---

# What the transcript establishes

1. **The tool surface is derived, not authored.** All six tools came
   from the daemon's own `contract.describe` at startup. A daemon that
   grows a request kind grows a tool; drift is structurally impossible.
2. **Refusals are data, never protocol errors.** Every refusal above
   arrived with `isError: false` in the MCP result envelope. A domain
   "no" never masquerades as a transport failure.
3. **A structural mistake repairs in one round-trip.** Step 6's
   refusal carried `expected` — all fourteen legal kinds — and step 7
   used it directly.
4. **A reference mistake does not.** Step 11's refusal named the law
   and the bad value but not a single usable digest, and its `next[]`
   hint replayed the error verbatim (step 12). Recovery took a
   detour through the frontier (step 13).
5. **Identity is content.** The same structure resubmitted converged
   (step 16). The same union written in a different order converged
   (step 17). Neither was an error.
6. **Nothing is trusted on the way back.** The head in step 20 is
   called a claim by the reply itself, and the client re-folded the
   chain from the entries to confirm it.

## Round-trip cost

| From | To | tools/call round-trips |
|---|---|---|
| First semantic intent | Certified `Order` digest | 11 |
| — of which were mistakes or recovery from them | | 4 |
| Certified type | Published and verified record | 3 |

Two of the four wasted round-trips were the deliberate mistakes. The
other two (steps 12 and 13) were the cost of a refusal that could not
be repaired from its own contents.

## Friction found while driving this as a client

Recorded from the client's side only — what a model with no repo
access actually experiences.

| # | Status | Finding |
|---|---|---|
| 1 | CONFIRMED | **No tool declares an `outputSchema`.** All six expose `name`, `description`, `inputSchema`, `annotations` and nothing else (step 3). Yet the contract carries a `reply` shape for every request, and the same renderer that built the `inputSchema`s renders all seven reply shapes successfully — probed in-run, 7/7. The derivation reads `request.body` and drops `request.reply`. A strict MCP client may ignore `structuredContent` when no output schema is declared, leaving only the text blob. |
| 2 | CONFIRMED | **Every tool is annotated `destructiveHint: true, readOnlyHint: false, idempotentHint: false`** — including `journal_read` and `contract_describe`, which are pure reads, and `type_create`, whose convergence is proven at step 16. These are framework defaults, not derived from the contract. Hosts gate confirmation prompts on `destructiveHint`: every read in this demo would prompt. |
| 3 | CONFIRMED | **`unknown-ref` is the one refusal that cannot repair itself.** Its `expected` is prose ("a digest already committed to the catalog"), it carries no `example`, and no resolvable digest appears anywhere in the payload. Its `next[0].body` echoes the bad digest back — replayed verbatim it returned a byte-identical refusal (step 12). Cost: 2 round-trips. Compare `invalid-structure`, which enumerates all fourteen legal kinds and repaired in one. |
| 4 | CONFIRMED | **Repair hints name NATS subjects, not MCP tools.** `next[].subject` says `flb.req.type.fill`; the thing a client can actually call is `type_fill`. The mapping exists only inside the tool `description` string, as `(subject: ...)`. |
| 5 | CONFIRMED | **The type arguments have no schema.** `structure`, `partial` and `subtree` render as `{"x-flb-brand": "flb.type.v0"}` — no constraints at all. No client-side validation is possible; every structural error costs a round-trip. Deliberate (the daemon owns the grammar) and the frontier is the mitigation, but the cost lands on the client. |
| 6 | SUSPECTED | **Refusal `path` is relative to the reconstructed partial, not to the request.** Step 11 refused at `["partial","fields","currency","digest"]` while the offending value was sent as `subtree`. They coincide at the root and diverge everywhere else. |
| 7 | ADVISORY | **Opening a concierge session is an undiscoverable no-op.** Filling the root hole with a hole is the entry move; nothing in the tool surface says so. There is no `type_start`. |
| 8 | ADVISORY | **`type_unfill` was never needed.** The natural undo was `type_fill` with `{"k":"hole"}` (step 13), which does the same thing. Two verbs, one operation. |
| 9 | ADVISORY | **Latency is a non-issue.** Every `tools/call` returned in 1–6 ms after a 136 ms `initialize`. |

## Reproducing this

```sh
cd proto/go && go build -o /tmp/protod ./cmd/protod
/tmp/protod --store "$(mktemp -d)"          # prints {"ready":true,"url":...}
cd proto/ts && bun install
FLB_URL=nats://127.0.0.1:PORT bun src/mcp-main.ts   # speaks MCP on stdio
```

Then drive it with any MCP client: `initialize`, `tools/list`,
`tools/call`. The digests above are content-addressed and will
reproduce exactly.
