//+ build js,wasm

package gobridge

import (
	"syscall/js"
	"errors"
)

var bridgeRoot js.Value

const (
	bridgeJavaScriptName = "__gobridge__"
)

func registrationWrapper(fn func(this js.Value, args []js.Value) (interface{}, error)) func(this js.Value, args []js.Value) interface{} {
	return func(this js.Value, args []js.Value) interface{} {
		cb := args[len(args)-1]

		ret, err := fn(this, args[:len(args)-1])

		if err != nil {
			cb.Invoke(err.Error(), js.Null())
		} else {
			cb.Invoke(js.Null(), ret)
		}

		return ret
	}
}

type intCallback = func(string) (int64, error)
type stringCallback = func(string) (string, error)
type boolCallback = func(string) (bool, error)
type txCallback = func(string, int64) (string, error)

// RegisterCallback registers a Go function to be a callback used in JavaScript
func RegisterCallback(name string, inputFunc interface{}) {
	mycb := func(_ js.Value, jsInputs []js.Value) (interface{}, error){
		if len(jsInputs)<1{
			return nil, errors.New("Invalid number of parameters. Expected at least 1")
		}
		args := jsInputs[0].String()
		var num int64 = 0
		if len(jsInputs)>=2 && jsInputs[1].Type()==js.TypeNumber{
			num = int64(jsInputs[1].Int())
		}
		switch callback := inputFunc.(type) {
		case intCallback:
			return callback(args)
		case stringCallback:
			return callback(args)
		case boolCallback:
			return callback(args)
		case txCallback:
			return callback(args, num)
		default:
			return "", errors.New("Unexpected error when executing callback")
		}
		
	}
	bridgeRoot.Set(name, js.FuncOf(registrationWrapper(mycb)))
}

// RegisterValue registers a static value output from Go for access in JavaScript
func RegisterValue(name string, value interface{}) {
	bridgeRoot.Set(name, value)
}

func init() {
	global := js.Global()

	bridgeRoot = global.Get(bridgeJavaScriptName)
}
