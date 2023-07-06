package bulletproofs

import (
	// "math"

	"incognito-chain/privacy/coin"
	"incognito-chain/privacy/operation"
	"incognito-chain/privacy/privacy_util"

	"github.com/pkg/errors"
)

var CACommitmentScheme operation.PedersenCommitment = CopyPedersenCommitmentScheme(operation.PedCom)

func CopyPedersenCommitmentScheme(sch operation.PedersenCommitment) operation.PedersenCommitment {
	var result operation.PedersenCommitment
	var generators []*operation.Point
	for _, gen := range sch.G {
		generators = append(generators, new(operation.Point).Set(gen))
	}
	result.G = generators
	return result
}

func GetFirstAssetTag(coins []*coin.CoinV2) (*operation.Point, error) {
	if coins == nil || len(coins) == 0 {
		return nil, errors.New("Cannot get asset tag from empty input")
	}
	result := coins[0].GetAssetTag()
	if result == nil {
		return nil, errors.New("The coin does not have an asset tag")
	}
	return result, nil
}

func (wit AggregatedRangeWitness) ProveUsingBase(anAssetTag *operation.Point) (*AggregatedRangeProof, error) {
	CACommitmentScheme.G[operation.PedersenValueIndex] = anAssetTag
	proof := new(AggregatedRangeProof)
	proof.Init()
	numValue := len(wit.values)
	if numValue > privacy_util.MaxOutputCoin {
		return nil, errors.New("Must less than MaxOutputCoin")
	}
	numValuePad := roundUpPowTwo(numValue)
	maxExp := privacy_util.MaxExp
	N := maxExp * numValuePad

	aggParam := setAggregateParams(N)

	values := make([]uint64, numValuePad)
	rands := make([]*operation.Scalar, numValuePad)
	for i := range wit.values {
		values[i] = wit.values[i]
		rands[i] = new(operation.Scalar).Set(wit.rands[i])
	}
	for i := numValue; i < numValuePad; i++ {
		values[i] = uint64(0)
		rands[i] = new(operation.Scalar).FromUint64(0)
	}

	proof.cmsValue = make([]*operation.Point, numValue)
	initChal := aggParam.cs.ToBytesS()
	for i := 0; i < numValue; i++ {
		proof.cmsValue[i] = new(operation.Point).AddPedersen(new(operation.Scalar).FromUint64(values[i]), anAssetTag, rands[i], operation.PedCom.G[operation.PedersenRandomnessIndex])
		if proof.version >= 2 {
			initChal = append(initChal, proof.cmsValue[i].ToBytesS()...)
		}
	}

	// Convert values to binary array
	aL := make([]*operation.Scalar, N)
	aR := make([]*operation.Scalar, N)
	sL := make([]*operation.Scalar, N)
	sR := make([]*operation.Scalar, N)

	for i, value := range values {
		tmp := ConvertUint64ToBinary(value, maxExp)
		for j := 0; j < maxExp; j++ {
			aL[i*maxExp+j] = tmp[j]
			aR[i*maxExp+j] = new(operation.Scalar).Sub(tmp[j], new(operation.Scalar).FromUint64(1))
			sL[i*maxExp+j] = operation.RandomScalar()
			sR[i*maxExp+j] = operation.RandomScalar()
		}
	}
	// LINE 40-50
	// Commitment to aL, aR: A = h^alpha * G^aL * H^aR
	// Commitment to sL, sR : S = h^rho * G^sL * H^sR
	var alpha, rho *operation.Scalar
	if A, err := encodeVectors(aL, aR, aggParam.g, aggParam.h); err != nil {
		return nil, err
	} else if S, err := encodeVectors(sL, sR, aggParam.g, aggParam.h); err != nil {
		return nil, err
	} else {
		alpha = operation.RandomScalar()
		rho = operation.RandomScalar()
		A.Add(A, new(operation.Point).ScalarMult(CACommitmentScheme.G[operation.PedersenRandomnessIndex], alpha))
		S.Add(S, new(operation.Point).ScalarMult(CACommitmentScheme.G[operation.PedersenRandomnessIndex], rho))
		proof.a = A
		proof.s = S
	}
	// challenge y, z
	y := generateChallenge(initChal, []*operation.Point{proof.a, proof.s})
	z := generateChallenge(y.ToBytesS(), []*operation.Point{proof.a, proof.s})

	// LINE 51-54
	twoNumber := new(operation.Scalar).FromUint64(2)
	twoVectorN := powerVector(twoNumber, maxExp)

	// HPrime = H^(y^(1-i)
	HPrime := computeHPrime(y, N, aggParam.h)

	// l(X) = (aL -z*1^n) + sL*X; r(X) = y^n hada (aR +z*1^n + sR*X) + z^2 * 2^n
	yVector := powerVector(y, N)
	hadaProduct, err := hadamardProduct(yVector, vectorAddScalar(aR, z))
	if err != nil {
		return nil, err
	}
	vectorSum := make([]*operation.Scalar, N)
	zTmp := new(operation.Scalar).Set(z)
	for j := 0; j < numValuePad; j++ {
		zTmp.Mul(zTmp, z)
		for i := 0; i < maxExp; i++ {
			vectorSum[j*maxExp+i] = new(operation.Scalar).Mul(twoVectorN[i], zTmp)
		}
	}
	zNeg := new(operation.Scalar).Sub(new(operation.Scalar).FromUint64(0), z)
	l0 := vectorAddScalar(aL, zNeg)
	l1 := sL
	var r0, r1 []*operation.Scalar
	if r0, err = vectorAdd(hadaProduct, vectorSum); err != nil {
		return nil, err
	} else {
		if r1, err = hadamardProduct(yVector, sR); err != nil {
			return nil, err
		}
	}

	// t(X) = <l(X), r(X)> = t0 + t1*X + t2*X^2
	// t1 = <l1, ro> + <l0, r1>, t2 = <l1, r1>
	var t1, t2 *operation.Scalar
	if ip3, err := innerProduct(l1, r0); err != nil {
		return nil, err
	} else if ip4, err := innerProduct(l0, r1); err != nil {
		return nil, err
	} else {
		t1 = new(operation.Scalar).Add(ip3, ip4)
		if t2, err = innerProduct(l1, r1); err != nil {
			return nil, err
		}
	}

	// commitment to t1, t2
	tau1 := operation.RandomScalar()
	tau2 := operation.RandomScalar()
	proof.t1 = CACommitmentScheme.CommitAtIndex(t1, tau1, operation.PedersenValueIndex)
	proof.t2 = CACommitmentScheme.CommitAtIndex(t2, tau2, operation.PedersenValueIndex)

	x := generateChallenge(z.ToBytesS(), []*operation.Point{proof.t1, proof.t2})
	xSquare := new(operation.Scalar).Mul(x, x)

	// lVector = aL - z*1^n + sL*x
	// rVector = y^n hada (aR +z*1^n + sR*x) + z^2*2^n
	// tHat = <lVector, rVector>
	lVector, err := vectorAdd(vectorAddScalar(aL, zNeg), vectorMulScalar(sL, x))
	if err != nil {
		return nil, err
	}
	tmpVector, err := vectorAdd(vectorAddScalar(aR, z), vectorMulScalar(sR, x))
	if err != nil {
		return nil, err
	}
	rVector, err := hadamardProduct(yVector, tmpVector)
	if err != nil {
		return nil, err
	}
	rVector, err = vectorAdd(rVector, vectorSum)
	if err != nil {
		return nil, err
	}
	proof.tHat, err = innerProduct(lVector, rVector)
	if err != nil {
		return nil, err
	}

	// blinding value for tHat: tauX = tau2*x^2 + tau1*x + z^2*rand
	proof.tauX = new(operation.Scalar).Mul(tau2, xSquare)
	proof.tauX.Add(proof.tauX, new(operation.Scalar).Mul(tau1, x))
	zTmp = new(operation.Scalar).Set(z)
	tmpBN := new(operation.Scalar)
	for j := 0; j < numValuePad; j++ {
		zTmp.Mul(zTmp, z)
		proof.tauX.Add(proof.tauX, tmpBN.Mul(zTmp, rands[j]))
	}

	// alpha, rho blind A, S
	// mu = alpha + rho*x
	proof.mu = new(operation.Scalar).Add(alpha, new(operation.Scalar).Mul(rho, x))

	// instead of sending left vector and right vector, we use inner sum argument to reduce proof size from 2*n to 2(log2(n)) + 2
	innerProductWit := new(InnerProductWitness)
	innerProductWit.a = lVector
	innerProductWit.b = rVector
	innerProductWit.p, err = encodeVectors(lVector, rVector, aggParam.g, HPrime)
	if err != nil {
		return nil, err
	}
	uPrime := new(operation.Point).ScalarMult(aggParam.u, operation.HashToScalar(x.ToBytesS()))
	innerProductWit.p = innerProductWit.p.Add(innerProductWit.p, new(operation.Point).ScalarMult(uPrime, proof.tHat))

	proof.innerProductProof, err = innerProductWit.Prove(aggParam.g, HPrime, uPrime, x.ToBytesS())
	if err != nil {
		return nil, err
	}

	return proof, nil
}

func TransformWitnessToCAWitness(wit *AggregatedRangeWitness, assetTagBlinders []*operation.Scalar) (*AggregatedRangeWitness, error) {
	if len(assetTagBlinders) != len(wit.values) || len(assetTagBlinders) != len(wit.rands) {
		return nil, errors.New("Cannot transform witness. Parameter lengths mismatch")
	}
	newRands := make([]*operation.Scalar, len(wit.values))

	for i, _ := range wit.values {
		temp := new(operation.Scalar).Sub(assetTagBlinders[i], assetTagBlinders[0])
		temp.Mul(temp, new(operation.Scalar).FromUint64(wit.values[i]))
		temp.Add(temp, wit.rands[i])
		newRands[i] = temp
	}
	result := new(AggregatedRangeWitness)
	result.Set(wit.values, newRands)
	return result, nil
}
