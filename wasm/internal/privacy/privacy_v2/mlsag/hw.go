package mlsag

import (
	"fmt"

	"incognito-chain/common"
	"incognito-chain/privacy/coin"
	"incognito-chain/privacy/operation"
)

type MlsagPartialSig struct {
	MlsagSig
	Cpi *operation.Scalar
}

func (ml *MlsagPartialSig) ToBytes() ([]byte, error) {
	b, err := ml.MlsagSig.ToBytes()
	if err != nil {
		return nil, err
	}
	return append(b, ml.Cpi.ToBytesS()...), nil
}

// Get from byte and store to signature
func (ml *MlsagPartialSig) FromBytes(b []byte) (*MlsagPartialSig, error) {
	ml.Cpi = (&operation.Scalar{}).FromBytesS(b[:operation.Ed25519KeySize])
	_, err := ml.MlsagSig.FromBytes(b[operation.Ed25519KeySize:])
	if err != nil {
		return nil, err
	}

	return ml, nil
}

func NewMlsagFromInputCoins(inputs []coin.PlainCoin, R *Ring, pi int) *Mlsag {
	ml := &Mlsag{
		R,
		pi,
		make([]*operation.Point, len(R.keys[0])),
		nil,
	}
	for i, c := range inputs {
		ml.keyImages[i] = c.GetKeyImage()
	}
	return ml
}

func (ml *Mlsag) generateMlsagPublicChallenges() (r [][]*operation.Scalar) {
	m := len(ml.R.keys[0])
	n := len(ml.R.keys)

	r = make([][]*operation.Scalar, n)
	for i := 0; i < n; i += 1 {
		r[i] = make([]*operation.Scalar, m)
		if i == ml.pi {
			for j := 0; j < m; j += 1 {
				r[i][j] = &operation.Scalar{}
			}
		}
		for j := 0; j < m; j += 1 {
			r[i][j] = operation.RandomScalar()
		}
	}
	return
}

func (ml *Mlsag) calcCFromFirst(message [common.HashSize]byte, firstC *operation.Scalar, r [][]*operation.Scalar) ([]*operation.Scalar, error) {
	n := len(ml.R.keys)
	c := make([]*operation.Scalar, n)

	var i int = (ml.pi + 1) % n
	c[i] = firstC
	for next := (i + 1) % n; i != ml.pi; {
		nextC, err := calculateNextC(
			message,
			r[i], c[i],
			(*ml.R).keys[i],
			ml.keyImages,
		)
		if err != nil {
			return nil, err
		}
		c[next] = nextC
		i = next
		next = (next + 1) % n
	}

	return c, nil
}

func (ml *Mlsag) PartialSign(message []byte, firstC *operation.Scalar) (*MlsagPartialSig, error) {
	if len(message) != common.HashSize {
		return nil, fmt.Errorf("invalid msg length")
	}
	message32byte := [32]byte{}
	copy(message32byte[:], message)

	r := ml.generateMlsagPublicChallenges()
	c, err := ml.calcCFromFirst(message32byte, firstC, r)

	if err != nil {
		return nil, err
	}
	return &MlsagPartialSig{
		MlsagSig{
			c[0], nil, r,
		},
		c[ml.pi],
	}, nil
}
