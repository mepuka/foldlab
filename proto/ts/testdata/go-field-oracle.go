package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"reflect"
	"strconv"
	"strings"
)

type observedField struct {
	GoName   string `json:"goName"`
	JSONName string `json:"jsonName"`
}

func main() {
	path := os.Args[len(os.Args)-1]
	file, err := parser.ParseFile(token.NewFileSet(), path, nil, parser.AllErrors)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fields := make([]observedField, 0)
	ast.Inspect(file, func(node ast.Node) bool {
		field, ok := node.(*ast.Field)
		if !ok || field.Tag == nil {
			return true
		}
		tag, err := strconv.Unquote(field.Tag.Value)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		jsonName := strings.Split(reflect.StructTag(tag).Get("json"), ",")[0]
		if len(field.Names) == 0 {
			fields = append(fields, observedField{GoName: "", JSONName: jsonName})
			return true
		}
		for _, name := range field.Names {
			fields = append(fields, observedField{GoName: name.Name, JSONName: jsonName})
		}
		return true
	})
	if err := json.NewEncoder(os.Stdout).Encode(fields); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
