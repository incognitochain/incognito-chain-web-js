module wasm

go 1.18

require incognito-chain v0.2.0

replace incognito-chain v0.2.0 => ./internal

require gobridge v0.1.0

require (
	github.com/ebfe/keccak v0.0.0-20150115210727-5cc570678d1b // indirect
	github.com/ethereum/go-ethereum v1.10.18 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	golang.org/x/crypto v0.0.0-20210921155107-089bfa567519 // indirect
	golang.org/x/sys v0.0.0-20211117180635-dee7805ff2e1 // indirect
)

replace gobridge v0.1.0 => ./gobridge
