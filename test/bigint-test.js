import bn from 'bn.js';
// import bigInt from 'big-integer'

let ECC = require('elliptic');
let Elliptic = ECC.ec;

function modInverse(a, m) {
  let m0 = m; 
  let y = BigInt("0")
  let x = BigInt("1"); 

  if (m == 1) 
    return 0; 

  while (a > 1) 
  { 
      // q is quotient 
      let q = a / m; 
      let t = m; 

      // m is remainder now, process same as 
      // Euclid's algo 
      m = a % m;
      a = t; 
      t = y; 

      // Update y and x 
      y = x - q * y; 
      x = t; 
  } 

  // Make x positive 
  if (x < 0) 
     x = x + m0; 

  return x;
}

let n = bn.red((new Elliptic('p256')).n.clone())
let a = new bn("1")
let b = new bn("2")
console.time("1")
for (let i = 0; i < 1; i++) {
  let c = a.toRed(n).redAdd(b.toRed(n))
  let temp3 = c.redInvm().fromRed()
  console.log(temp3.toString())
}
console.timeEnd("1")

// console.time("2")
// temp1 = BigInt(temp1 + '')
// temp2 = BigInt(temp2 + '')
// console.log((temp1 % temp2))
// console.timeEnd("2")

// console.time("2")
// for (let i = 0; i < 100; i++) {
//   let c = bigInt(a.toString()).plus(bigInt(b.toString()))
//   let temp3 = c.modInv(bigInt((new Elliptic('p256')).n.toString()))
//   // console.log(temp3.toString())
// }
// console.timeEnd("2")

console.time("3")
a = BigInt("1");
b = BigInt("2")
let m= BigInt((new Elliptic('p256')).n.toString());

for (let i = 0; i < 1; i++) {
  let c = a + b
  console.log("modInverse(a, m):", modInverse(c, m));
}
console.timeEnd("3")
