package protod

// contract.describe: the daemon's own request/reply contract, described
// in flb.type.v0. The MCP server derives its tool schemas from this
// reply at startup, so drift between the daemon and its tools is
// structurally impossible.
//
// v0 has no recursion, so it cannot describe its own grammar; positions
// holding "any well-formed v0 value, not structurally described here"
// use the first-class opaque node. Self-cataloging the contract's own
// types is deferred until ticket 004 lands in full (spec non-goal).

func vKind(k string) map[string]any { return map[string]any{"k": k} }

func vBrand(name string, of map[string]any) map[string]any {
	return map[string]any{"k": "brand", "name": name, "of": of}
}

func vList(of map[string]any) map[string]any {
	return map[string]any{"k": "list", "of": of}
}

func vStruct(fields map[string]any, optional ...string) map[string]any {
	if optional == nil {
		optional = []string{}
	}
	return map[string]any{"k": "struct", "fields": fields, "optional": optional}
}

func vCheck(base map[string]any, name string, args map[string]any) map[string]any {
	return map[string]any{
		"k": "check", "base": base,
		"check": map[string]any{"name": name, "args": args},
	}
}

func vOpaque() map[string]any {
	return vKind("opaque")
}

func vPartial() map[string]any {
	return vBrand("flb.partial.v0", vOpaque())
}

func vDigest() map[string]any {
	return vBrand("flb.digest",
		vCheck(vKind("string"), "pattern", map[string]any{"source": "^[0-9a-f]{64}$"}))
}

func vNextHint() map[string]any {
	return vStruct(map[string]any{
		"subject": vKind("string"),
		"note":    vKind("string"),
		"body":    vOpaque(),
	}, "body")
}

func vRefusal() map[string]any {
	return vStruct(map[string]any{
		"kind":     vKind("string"),
		"sort":     vKind("string"),
		"law":      vKind("string"),
		"path":     vList(vKind("string")),
		"got":      vOpaque(),
		"expected": vOpaque(),
		"example":  vOpaque(),
		"next":     vList(vNextHint()),
		"local":    vKind("bool"),
	}, "example", "expected", "got", "path")
}

func vCursor() map[string]any {
	return vStruct(map[string]any{
		"seq":  vKind("int"),
		"head": vKind("string"),
	}, "head")
}

func vFrontierChoice() map[string]any {
	return vStruct(map[string]any{
		"kind":    vKind("string"),
		"example": vPartial(),
	})
}

func vFrontierEntry() map[string]any {
	return vStruct(map[string]any{
		"path":  vList(vKind("string")),
		"legal": vList(vFrontierChoice()),
		"refs":  vList(vDigest()),
	})
}

func vConciergeReply() map[string]any {
	return vStruct(map[string]any{
		"ok":       vKind("bool"),
		"partial":  vPartial(),
		"frontier": vList(vFrontierEntry()),
		"next":     vList(vNextHint()),
	})
}

func vSessionAnchor() map[string]any {
	return vStruct(map[string]any{
		"key":         vKind("string"),
		"head":        vDigest(),
		"stateDigest": vDigest(),
	})
}

func vSessionStateReply() map[string]any {
	return vStruct(map[string]any{
		"ok":          vKind("bool"),
		"session":     vKind("string"),
		"head":        vDigest(),
		"step":        vKind("int"),
		"principal":   vKind("string"),
		"partial":     vPartial(),
		"stateDigest": vDigest(),
		"stateScheme": vKind("string"),
		"catalogHead": vDigest(),
		"frontier":    vList(vFrontierEntry()),
		"anchor":      vSessionAnchor(),
		"next":        vList(vNextHint()),
	})
}

func describeReply() map[string]any {
	return map[string]any{
		"ok": true,
		"contract": map[string]any{
			"name":    "flb.proto",
			"version": "v0",
			"scheme":  activeScheme.Name(),
			"note": "every reply is either the request's fact shape or the uniform refusal " +
				"{ok:false, refusal}; refusals are data and nothing throws across this seam. " +
				"Session compaction refuses until flb.certification.v0 corpus sealing exists: " +
				"structural refusals export, absence refusals die with the trace, and the " +
				"state digest and corpus digest remain as evidence.",
			"requests": []any{
				map[string]any{
					"name":    "type_create",
					"subject": SubjectTypeCreate,
					"note": "submit an flb.type.v0 structure; the daemon canonicalizes (RFC 8785), " +
						"derives the digest itself, refuses any asserted digest it cannot re-derive, " +
						"and converges on same bytes (created:false, never an error)",
					"body": vStruct(map[string]any{
						"structure":      vBrand("flb.type.v0", vOpaque()),
						"assertedDigest": vDigest(),
						"submitter":      vKind("string"),
					}, "assertedDigest", "submitter"),
					"reply": vStruct(map[string]any{
						"ok":          vKind("bool"),
						"created":     vKind("bool"),
						"digest":      vDigest(),
						"scheme":      vKind("string"),
						"catalogSeq":  vKind("int"),
						"catalogHead": vKind("string"),
						"next":        vList(vNextHint()),
					}),
				},
				map[string]any{
					"name":    "type_fill",
					"subject": SubjectTypeFill,
					"note": "stateless guided construction: replace the hole at path with subtree, " +
						"revalidate the whole partial, and return every remaining hole as a truthful frontier; " +
						"the partial is the entire state and travels in every request and reply",
					"body": vStruct(map[string]any{
						"partial": vPartial(),
						"path":    vList(vKind("string")),
						"subtree": vPartial(),
					}),
					"reply": vConciergeReply(),
				},
				map[string]any{
					"name":    "type_unfill",
					"subject": SubjectTypeUnfill,
					"note": "stateless mechanical undo: replace the type node at path with a hole, " +
						"revalidate the whole partial, and return its truthful frontier; an empty path unfills the root",
					"body": vStruct(map[string]any{
						"partial": vPartial(),
						"path":    vList(vKind("string")),
					}),
					"reply": vConciergeReply(),
				},
				map[string]any{
					"name":    "journal_read",
					"subject": SubjectJournalRead,
					"note": "read a journal (the catalog is just a journal named \"catalog\"); " +
						"entries come back with a claimed head — recompute it locally",
					"body": vStruct(map[string]any{
						"journal": vKind("string"),
						"from":    vCursor(),
						"max":     vKind("int"),
					}, "from", "max"),
					"reply": vStruct(map[string]any{
						"ok":      vKind("bool"),
						"journal": vKind("string"),
						"entries": vList(vStruct(map[string]any{
							"seq":     vKind("int"),
							"prev":    vKind("string"),
							"payload": vKind("string"),
						})),
						"seq":  vKind("int"),
						"head": vKind("string"),
						"note": vKind("string"),
						"next": vList(vNextHint()),
					}),
				},
				map[string]any{
					"name":    "contract_describe",
					"subject": SubjectContractDescribe,
					"note":    "this request; the body is ignored",
					"body":    vStruct(map[string]any{}),
					"reply":   vOpaque(),
				},
				map[string]any{
					"name":    "session_open",
					"subject": SubjectSessionOpen,
					"note": "open or converge on one content-addressed flb.session.v0 journal; " +
						"the default seed is a root hole and the grammar digest must match this daemon",
					"body": vStruct(map[string]any{
						"grammar": vDigest(),
						"seed":    vPartial(),
						"author":  vKind("string"),
					}, "seed"),
					"reply": vSessionStateReply(),
				},
				map[string]any{
					"name":    "session_move",
					"subject": SubjectSessionMove,
					"note": "append one fill or unfill under mandatory expectedHead and the session's open.author principal; " +
						"stale heads refuse with the current head and exact move context, and sessions never use the effector",
					"body": vStruct(map[string]any{
						"session":      vKind("string"),
						"expectedHead": vDigest(),
						"principal":    vKind("string"),
						"op":           vKind("string"),
						"path":         vList(vKind("string")),
						"subtree":      vPartial(),
					}, "subtree"),
					"reply": vSessionStateReply(),
				},
				map[string]any{
					"name":    "session_state",
					"subject": SubjectSessionState,
					"note":    "replay the verified session journal and return its exact current anchor and pure frontier",
					"body": vStruct(map[string]any{
						"session": vKind("string"),
					}),
					"reply": vSessionStateReply(),
				},
				map[string]any{
					"name":    "session_commit",
					"subject": SubjectSessionCommit,
					"note": "under the session's open.author principal, replay a zero-hole state then normalize/canonicalize/digest " +
						"and require equality with the daemon-derived type.create result before recording the commit fact",
					"body": vStruct(map[string]any{
						"session":      vKind("string"),
						"expectedHead": vDigest(),
						"principal":    vKind("string"),
						"submitter":    vKind("string"),
					}, "submitter"),
					"reply": vStruct(map[string]any{
						"ok":          vKind("bool"),
						"session":     vKind("string"),
						"head":        vDigest(),
						"step":        vKind("int"),
						"principal":   vKind("string"),
						"stateDigest": vDigest(),
						"digest":      vDigest(),
						"scheme":      vKind("string"),
						"catalogSeq":  vKind("int"),
						"catalogHead": vDigest(),
						"next":        vList(vNextHint()),
					}),
				},
			},
			"ingress": map[string]any{
				"name":           "publish",
				"subjectPattern": ingressPrefix + "<journal>",
				"example":        ingressPrefix + "data",
				"note": "publish a canonical frame claiming a cataloged type; request/reply — " +
					"the reply admits or refuses; " + admitNote,
				"frame": vStruct(map[string]any{
					"type":    vDigest(),
					"payload": vOpaque(),
				}, "payload"),
				"reply": vStruct(map[string]any{
					"ok":       vKind("bool"),
					"admitted": vKind("bool"),
					"journal":  vKind("string"),
					"seq":      vKind("int"),
					"head":     vKind("string"),
					"note":     vKind("string"),
					"next":     vList(vNextHint()),
				}),
			},
			"refusal": vRefusal(),
		},
	}
}
