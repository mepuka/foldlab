
### (ii) open with ONE principal bound to ALL THREE seats
{
  "session": "flb_protocol_session_v0_90be5082db395e825f1a40633b5ac6bd2b6f14fdb71620c017ba64920f54b83f"
}

### (ii) 'solo' fills X then Y — which seats do the candidates carry?
{
  "state": "disputed",
  "candidates": [
    {
      "value": {
        "answer": "X"
      },
      "seat": "method_a"
    },
    {
      "value": {
        "answer": "Y"
      },
      "seat": "method_a"
    }
  ]
}

### (i) ONE connection produced a 3-candidate set with a 2-1 'majority'
{
  "state": "disputed",
  "candidates": [
    {
      "value": {
        "answer": "MINORITY-TRUTH"
      },
      "seat": "method_a"
    },
    {
      "value": {
        "answer": "MAJORITY-FORGED"
      },
      "seat": "method_b"
    },
    {
      "value": {
        "answer": "MAJORITY-FORGED"
      },
      "seat": "method_c"
    }
  ]
}

A plurality rule counts these pairs. Every one of them was authored by this single connection.

### (i) close by method_a
{
  "ok": true,
  "head": "0190f188647f8aa7449ae6cb8c73a58fe5a60af0b2252331ffe187d033f1fd75",
  "outcome": "completed",
  "next": [
    {
      "subject": "flb.req.protocol.session.state",
      "note": "read the terminal verified fold and its final state digest",
      "body": {
        "session": "flb_protocol_session_v0_64cc6456e450b4934ad900bbeb5070d8b97eb493ee017a2c7f6eb206dbad22f8"
      }
    }
  ]
}

### (iii) TERMINAL FOLD — search it for the string 'gpt'/'claude'/'gemini' outside bindings
{
  "extraction": {
    "state": "decided",
    "value": {
      "answer": "MINORITY-TRUTH"
    },
    "candidates": [
      {
        "value": {
          "answer": "MINORITY-TRUTH"
        },
        "seat": "method_a"
      },
      {
        "value": {
          "answer": "MAJORITY-FORGED"
        },
        "seat": "method_b"
      },
      {
        "value": {
          "answer": "MAJORITY-FORGED"
        },
        "seat": "method_c"
      }
    ]
  }
}

holes blob contains 'claude': false; contains 'gemini': false; contains 'method_': true

final_state_digest = f758b58f0f5f0a1b163e8cc6fa57f7d670f97ce48e8a9ecb2544b2d4f79295da

seq 0: kind=open retention=irreducible principal=- seat=-

seq 1: kind=fill retention=compactible principal=gpt seat=method_a

seq 2: kind=fill retention=compactible principal=claude seat=method_b

seq 3: kind=fill retention=compactible principal=gemini seat=method_c

seq 4: kind=close retention=never-discardable principal=gpt seat=-