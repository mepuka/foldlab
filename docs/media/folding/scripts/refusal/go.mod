// A driver module, not part of the repo's Go build: it exists only to print a
// real refusal for the motion-graphics clip. `replace` points at the repo's
// own stream package so the message is the shipped code's, never a copy.
module foldlab/docs/media/folding/scripts/refusal

go 1.26

require foldlab v0.0.0

replace foldlab => ../../../../../go
