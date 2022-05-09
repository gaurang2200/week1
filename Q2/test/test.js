const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { groth16, plonk } = require("snarkjs");

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

describe("HelloWorld", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing

        // Here the fullProve function will generate a witness with the json input(7 and 9) we provided
        // and with the .wasm code snarkjs created when compiling
        // Then it uses the circuit_final.zkey to verify that the proof created is genuine
        const { proof, publicSignals } = await groth16.fullProve({"a":"7","b":"9"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");

        // This returns the proof with the vector values of the 3 variables a, b and c.
        // And all the publicSignals: in this case the output signal is the only public 
        // signal as written in our circuit. So only the output is returned
        console.log('7x9 =',publicSignals[0]);

        // The returned type of the proof and publicSignals is String so we convert it from string to Integer
        // But since they are too big to be stored in an Integer we store them in BigInts
        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
        
        // Converting BigInt Hex Numbers to Strings in argv
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        
        // Assigning different vectors their respective values
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        // Verifing Proof using the verifyProof function written in the contract
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {
    // Declaring all the global variables 
    let Multiplier3, multiplier3;

    beforeEach(async function () {
        //[assignment] insert your script here

        // Getting a new instance of the created Verifier contract
        Multiplier3 = await ethers.getContractFactory('Verifier');
        // Deploying the newly created contract
        multiplier3 = await Multiplier3.deploy();
        // Waiting for it to be deployed
        await multiplier3.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] insert your script here
        
        const { proof, publicSignals } = await groth16.fullProve({"a":"2", "b":"3", "c":"4"}, "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm", "contracts/circuits/Multiplier3/circuit_final.zkey")

        console.log("2x3x4 = ", publicSignals[0]);
        // console.log(proof, publicSignals);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);

        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await multiplier3.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        //[assignment] insert your script here
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await multiplier3.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {
    // Declaring all the global variables 
    let Multiplier3, multiplier3;

    beforeEach(async function () {
        //[assignment] insert your script here

        // Getting a new instance of the created PlonkVerifier contract
        Multiplier3 = await ethers.getContractFactory('PlonkVerifier');
        // Deploying the newly created contract
        multiplier3 = await Multiplier3.deploy();
        // Waiting for it to be deployed
        await multiplier3.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] insert your script here
        const { proof, publicSignals } = await plonk.fullProve({"a":"1", "b":"2", "c":"3"}, "contracts/circuits/_plonkMultiplier3/Multiplier3_js/Multiplier3.wasm", "contracts/circuits/_plonkMultiplier3/circuit.zkey");

        console.log("1x2x3 = ", publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);

        // This will return us the encrypted proof and the publicSignals
        var calldata = await plonk.exportSolidityCallData(editedProof, editedPublicSignals);

        // We made an array out of those 2 values and passed it in the verifyProof function of the PlonkVerifier contract
        const argv = calldata.split(',');
        expect(await multiplier3.verifyProof(argv[0], JSON.parse(argv[1]))).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        //[assignment] insert your script here
        let a = '0x00';
        let b = ['0'];
        expect(await multiplier3.verifyProof(a, b)).to.be.false;
    });
});