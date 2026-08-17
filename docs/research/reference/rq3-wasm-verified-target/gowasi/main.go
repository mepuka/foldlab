package main

import "fmt"

// Built with:  GOOS=wasip1 GOARCH=wasm go build -o hello.wasm .
// The point is not the program; it is the import surface a stock Go
// wasip1 build demands, and whether two hosts service it identically.
func main() { fmt.Println("hello from wasip1") }
