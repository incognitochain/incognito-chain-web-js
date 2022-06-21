package common

import (
	"crypto/sha256"
	"github.com/ebfe/keccak"
)

// SHA256 calculates SHA256-256 hashing of input b
// and returns the result in bytes array.
func SHA256(b []byte) []byte {
	hash := sha256.Sum256(b)
	return hash[:]
}
// HashB calculates SHA3-256 hashing of input b
// and returns the result in bytes array.
func HashB(b []byte) []byte {
	h := keccak.NewSHA3256()
	h.Write(b)
	r := h.Sum(nil)
	return r
}

// HashB calculates SHA3-256 hashing of input b
// and returns the result in Hash.
func HashH(b []byte) Hash {
	var result Hash
	copy(result[:], HashB(b))
	return result
}