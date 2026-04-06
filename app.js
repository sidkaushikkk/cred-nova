const APP_CONFIG = {
    // Replace with your actual deployed contract address on Ethereum/Polygon testnet
    contractAddress: "0x71383D463a89a1b822389F661aC9D65305cb9F7E",
    // Smart Contract ABI
    contractABI: [
        "function issueCertificate(string _certificateId, string _ipfsHash)",
        "function verifyCertificate(string _certificateId) view returns (bool isValid, string ipfsHash, uint256 issueDate, address issuer)"
    ],
    // Backend API URL (for local this is usually empty or localhost depending on setup)
    apiUrl: window.location.hostname === 'localhost' ? 'http://localhost:3000' : ''
};

let provider;
let signer;
let contract;

// UI Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletAddressDisplay = document.getElementById('walletAddress');
const walletStatusIndicator = document.getElementById('walletStatusIndicator');

// Connect to MetaMask
async function connectWallet() {

    try {

        if (!window.ethereum) {
            alert("Please install MetaMask");
            return;
        }

        // try switching to Polygon Amoy
        try {

            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x13882" }]
            });

        } catch (switchError) {

            // if network not added, add it
            if (switchError.code === 4902) {

                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: "0x13882",
                        chainName: "Polygon Amoy",
                        nativeCurrency: {
                            name: "POL",
                            symbol: "POL",
                            decimals: 18
                        },
                        rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                        blockExplorerUrls: ["https://amoy.polygonscan.com/"]
                    }]
                });

            } else {

                throw switchError;
            }
        }

        // request wallet access
        await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        provider = new ethers.BrowserProvider(window.ethereum);

        signer = await provider.getSigner();

        const address = await signer.getAddress();

        contract = new ethers.Contract(
            APP_CONFIG.contractAddress,
            APP_CONFIG.contractABI,
            signer
        );

console.log("Wallet connected:", address);

// update UI
if (walletAddressDisplay) {
    walletAddressDisplay.innerText =
        address.substring(0,6) + "..." + address.substring(address.length-4);
}

if (walletStatusIndicator) {
    walletStatusIndicator.classList.add("connected");

    const span = walletStatusIndicator.querySelector("span");

    if (span) span.innerText = "Connected";
}

if (connectWalletBtn) {
    connectWalletBtn.innerText = "Connected";
    connectWalletBtn.disabled = true;
}
    }
    catch (err) {

        console.error(err);

        alert("Wallet connection failed");
    }
}

// Check if already connected on load
async function checkConnection() {

    if (!window.ethereum) {

        // create read-only provider
        provider = new ethers.JsonRpcProvider(
            "https://rpc-amoy.polygon.technology/"
        );

        contract = new ethers.Contract(
            APP_CONFIG.contractAddress,
            APP_CONFIG.contractABI,
            provider
        );

        return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.listAccounts();

    if (accounts.length > 0) {

        signer = await provider.getSigner();

        contract = new ethers.Contract(
            APP_CONFIG.contractAddress,
            APP_CONFIG.contractABI,
            signer
        );

        const address = await signer.getAddress();

        // UI update
        if (walletAddressDisplay) {
            walletAddressDisplay.innerText =
                address.slice(0,6) + "..." + address.slice(-4);
        }

        if (walletStatusIndicator) {

            walletStatusIndicator.classList.add("connected");

            const span =
                walletStatusIndicator.querySelector("span");

            if (span) span.innerText = "Connected";
        }

        if (connectWalletBtn) {

            connectWalletBtn.innerText = "Connected";

            connectWalletBtn.disabled = true;
        }

    } else {

        // read-only contract (important for verify page)

        const rpcProvider = new ethers.JsonRpcProvider(
            "https://rpc-amoy.polygon.technology/"
        );

        contract = new ethers.Contract(
            APP_CONFIG.contractAddress,
            APP_CONFIG.contractABI,
            rpcProvider
        );
    }
}
// Issue Certificate Logic
const issueForm = document.getElementById('issueForm');
if (issueForm) {
    issueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!signer) {
            alert("Please connect your wallet first.");
            return;
        }

        const submitBtn = issueForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";

        const certData = {
            studentName: document.getElementById('studentName').value,
            courseName: document.getElementById('courseName').value,
            institutionName: document.getElementById('institutionName').value,
            issueDate: document.getElementById('issueDate').value,
            certificateId: document.getElementById('certificateId').value
        };

        try {
            // 1. Upload metadata to "IPFS" (our backend mock)
            console.log("Uploading to IPFS...");
            const uploadRes = await fetch(`${APP_CONFIG.apiUrl}/api/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(certData)
            });
            const { ipfsHash } = await uploadRes.json();
            console.log("IPFS Hash received:", ipfsHash);

            // 2. Store hash on Blockchain
            console.log("Storing on smart contract context...");
            // Use dummy contract if user hasn't deployed one to prevent crashing in MVP demo
const tx = await contract.issueCertificate(
    certData.certificateId,
    ipfsHash,
    {
        maxFeePerGas: ethers.parseUnits("30", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("30", "gwei")
    }
);

await tx.wait();

alert(`Certificate Issued Successfully!

Transaction Hash:
${tx.hash}

IPFS Hash:
${ipfsHash}`);            issueForm.reset();
        } catch (err) {
            console.error(err);
            alert("Error issuing certificate. See console.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Issue Certificate";
        }
    });
}

// Verify Certificate Logic
const verifyForm = document.getElementById('verifyForm');
if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // STEP 8: Encoding mismatch - trim input to ensure EXACT match
        const certId = document.getElementById('verifyCertId').value.trim();
        const resultBox = document.getElementById('resultBox');
        const submitBtn = verifyForm.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.innerText = "Verifying...";
        resultBox.className = "result-box"; // reset classes
        
        try {

    // ensure contract exists
    let activeProvider = provider || new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology/");
    if (!contract) {
        contract = new ethers.Contract(
            APP_CONFIG.contractAddress,
            APP_CONFIG.contractABI,
            signer || activeProvider
        );
    }

    // STEP 10: ensure contract is not undefined
    if (!contract) {
        console.error("Contract not initialized");
        throw new Error("Contract not initialized");
    }

    // STEP 6: confirm certificate exists with logs
    console.log("checking certId:", certId);
    console.log("contract:", contract);
    console.log("network:", await activeProvider.getNetwork());

    // STEP 7: Network check for Polygon Amoy
    const network = await activeProvider.getNetwork();
    if (network.chainId !== 80002n && Number(network.chainId) !== 80002) {
        throw new Error("Incorrect network. Please switch to Polygon Amoy in MetaMask.");
    }

    console.log("Calling verifyCertificate...");
    // STEP 5: verify call correctly destructured
    // 1. Fetch from Blockchain
    const [isValid, ipfsHash, issueDateTs, issuer] = await contract.verifyCertificate(certId);

    console.log("Result:", { isValid, ipfsHash, issueDateTs: issueDateTs.toString(), issuer });

    if (!isValid) {
        resultBox.classList.add('show', 'error');
        resultBox.innerHTML = `<h3>Verification Failed</h3><p>Certificate ID not found or invalid.</p>`;
        return;
    }

    // 2. Fetch metadata from IPFS
    const ipfsRes = await fetch(`${APP_CONFIG.apiUrl}/ipfs/${ipfsHash}`);
    if (!ipfsRes.ok) throw new Error("Metadata not found on IPFS");
    const metadata = await ipfsRes.json();

    // 3. Display Result
    resultBox.classList.add('show', 'success');
    
    // Format Date from timestamp
    const dateStr = new Date(Number(issueDateTs) * 1000).toLocaleDateString();

    resultBox.innerHTML = `
        <h3 style="color: var(--success-color); margin-bottom: 1rem;">✅ Certificate Authenticated</h3>
        <div class="result-item"><span class="result-label">Student Name:</span> <span class="result-value">${metadata.studentName}</span></div>
        <div class="result-item"><span class="result-label">Course:</span> <span class="result-value">${metadata.courseName}</span></div>
        <div class="result-item"><span class="result-label">Institution:</span> <span class="result-value">${metadata.institutionName}</span></div>
        <div class="result-item"><span class="result-label">Issue Date (Blockchain):</span> <span class="result-value">${dateStr}</span></div>
        <div class="result-item"><span class="result-label">Issuer Address:</span> <span class="result-value">${issuer}</span></div>
        <div class="result-item"><span class="result-label">IPFS Hash:</span> <span class="result-value" style="font-size: 0.8rem;">${ipfsHash}</span></div>
    `;
            
        }catch (err) {

    console.error(err);

    resultBox.classList.add('show', 'error');

    if (err.message.includes("Certificate not found")) {

        resultBox.innerHTML = `
            <h3>❌ Certificate Not Found</h3>

            <p>
            This certificate ID does not exist on blockchain.
            </p>

            <div style="margin-top:10px;font-size:14px;opacity:0.8;">
            Possible reasons:
            <br>• Certificate not issued yet
            <br>• Wrong Certificate ID
            <br>• Different network selected
            </div>
        `;

    }
    else {

        resultBox.innerHTML = `
            <h3>⚠️ Verification Error</h3>

            <p>
            ${err.reason || err.message || "Something went wrong"}
            </p>
        `;
    }
} finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Verify Authenticity";
        }
    });
}

// On load
window.addEventListener('DOMContentLoaded', checkConnection);
