import Shell

/-- `estore-vectors <vectors-dir>` — emit tables 1 and 2 of the CV-1 conformance bundle. -/
def main (argv : List String) : IO UInt32 := Shell.runVectors argv
