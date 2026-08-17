
### publish a seat-tampered fill straight into the session journal
{
  "kind": "bad-journal",
  "law": "ingress subjects name a data journal; the catalog is written only by the daemon, through type.create",
  "got": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "expected": "a name matching ^[A-Za-z0-9_-]+$ outside daemon-reserved catalog/session names",
  "example": "flb.ing.data",
  "next": [
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ],
  "sort": "structural",
  "local": false
}

### publish a WELL-FORMED forged fill into the session journal
{
  "kind": "bad-journal",
  "law": "ingress subjects name a data journal; the catalog is written only by the daemon, through type.create",
  "got": "flb_protocol_session_v0_52b917255392c49b0d19bfa624a1b4000cc9a4e4c29793d7be013b1918b2b205",
  "expected": "a name matching ^[A-Za-z0-9_-]+$ outside daemon-reserved catalog/session names",
  "example": "flb.ing.data",
  "next": [
    {
      "subject": "flb.req.contract.describe",
      "note": "request the daemon's contract; every subject and body shape is described there",
      "body": {}
    }
  ],
  "sort": "structural",
  "local": false
}