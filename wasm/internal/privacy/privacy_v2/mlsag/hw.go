package mlsag

import (
	"fmt"

	"incognito-chain/common"
	"incognito-chain/privacy/coin"
	"incognito-chain/privacy/operation"
)

type MlsagPartialSig struct {
	MlsagSig
	Cpi               *operation.Scalar
	SumCommitmentPriv *operation.Scalar
}

func (ml *MlsagPartialSig) ToBytes() ([]byte, error) {
	b, err := ml.MlsagSig.ToBytes()
	if err != nil {
		return nil, err
	}
	return append(append(b, ml.Cpi.ToBytesS()...), ml.SumCommitmentPriv.ToBytesS()...), nil
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
				r[i][j] = (&operation.Scalar{}).FromUint64(0)
			}
		} else {
			for j := 0; j < m; j += 1 {
				r[i][j] = operation.RandomScalar()
			}
		}
	}
	return
}

func (ml *Mlsag) calcCFromSeed(message [common.HashSize]byte, cseed []byte, r [][]*operation.Scalar) ([]*operation.Scalar, error) {
	n := len(ml.R.keys)
	c := make([]*operation.Scalar, n)

	var i int = (ml.pi + 1) % n
	c[i] = operation.HashToScalar(append(message[:], cseed...))
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

func (ml *Mlsag) PartialSign(message []byte, cseed []byte, sumCommitmentPriv *operation.Scalar) (*MlsagPartialSig, error) {
	if len(message) != common.HashSize {
		return nil, fmt.Errorf("invalid msg length")
	}
	message32byte := [32]byte{}
	copy(message32byte[:], message)

	r := ml.generateMlsagPublicChallenges()
	c, err := ml.calcCFromSeed(message32byte, cseed, r)
	if err != nil {
		return nil, err
	}

	return &MlsagPartialSig{
		MlsagSig{
			c[0], nil, r,
		},
		c[ml.pi],
		sumCommitmentPriv,
	}, nil
}

type MlsagCAPartialSig struct {
	MlsagSig
	Cpi               *operation.Scalar
	SumAssetTagPriv   *operation.Scalar
	SumCommitmentPriv *operation.Scalar
}

func (ml *MlsagCAPartialSig) ToBytes() ([]byte, error) {
	b, err := ml.MlsagSig.ToBytes()
	if err != nil {
		return nil, err
	}
	b = append(b, ml.Cpi.ToBytesS()...)
	b = append(b, ml.SumAssetTagPriv.ToBytesS()...)
	b = append(b, ml.SumCommitmentPriv.ToBytesS()...)
	return b, nil
}

func (ml *Mlsag) calcCCAFromSeed(message [common.HashSize]byte, cseed []byte, r [][]*operation.Scalar) ([]*operation.Scalar, error) {
	n := len(ml.R.keys)
	c := make([]*operation.Scalar, n)

	var i int = (ml.pi + 1) % n
	c[i] = operation.HashToScalar(append(message[:], cseed...))
	for next := (i + 1) % n; i != ml.pi; {
		nextC, err := calculateNextCCA(
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

func (ml *Mlsag) PartialSignConfidentialAsset(message []byte, cseed []byte, sumAssetTagPriv, sumCommitmentPriv *operation.Scalar) (*MlsagCAPartialSig, error) {
	if len(message) != common.HashSize {
		return nil, fmt.Errorf("invalid msg length")
	}
	message32byte := [32]byte{}
	copy(message32byte[:], message)

	r := ml.generateMlsagPublicChallenges()
	c, err := ml.calcCCAFromSeed(message32byte, cseed, r)
	if err != nil {
		return nil, err
	}

	return &MlsagCAPartialSig{
		MlsagSig{
			c[0], nil, r,
		},
		c[ml.pi],
		sumAssetTagPriv,
		sumCommitmentPriv,
	}, nil
}
